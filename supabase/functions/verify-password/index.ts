import "@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = [
  "https://thanhtamtran-svg.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Rate limit: max 5 attempts per minute per IP.
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;

// Fast in-memory pre-filter: catches rapid bursts that happen to hit the
// same warm isolate. NOT authoritative — isolates recycle and each keeps
// its own Map, which is exactly why brute force slipped through (B-022).
// The durable DB check below is the real gate.
const rateLimitMap = new Map<string, number[]>();
function isRateLimitedMemory(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

// Durable, cross-isolate limit via the check_rate_limit Postgres function
// (see migrations/20260714_rate_limit.sql). Counted in the DB so it is
// shared by every isolate — the in-memory Map above resets when isolates
// recycle, which is exactly how brute force slipped through (B-022).
//
// GLOBAL bucket, not per-IP: the client IP this function observes in
// x-forwarded-for is not stable across requests on Supabase's edge
// network (verified 2026-07-14 — a per-IP key almost never accumulated),
// so per-IP limiting is unreliable here. A single global counter caps
// total login attempts regardless of source, which is the right model
// for a single-user app: a distributed brute-force is bounded no matter
// how many IPs it uses. GLOBAL_MAX is generous enough that the real user
// mistyping a few times is never affected.
//
// Called with a plain fetch to PostgREST rather than the supabase-js
// client: the client's cold-start (dynamic esm.sh download on a fresh
// isolate) intermittently errored, and because we fail open that let
// extra attempts through. Fails OPEN on any error: a DB hiccup must not
// lock the user out of their own app; the in-memory pre-filter still
// provides some protection then.
const GLOBAL_MAX = 12;
async function isRateLimitedDb(): Promise<boolean> {
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const res = await fetch(
      Deno.env.get("SUPABASE_URL")! + "/rest/v1/rpc/check_rate_limit",
      {
        method: "POST",
        headers: {
          "apikey": serviceKey,
          "Authorization": "Bearer " + serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_bucket: "verify-password:global",
          p_max: GLOBAL_MAX,
          p_window_seconds: 60,
        }),
      }
    );
    if (!res.ok) return false;        // fail open
    const allowed = await res.json(); // RPC returns true=allowed
    return allowed === false;         // so false=limited
  } catch {
    return false; // fail open
  }
}

// Timing-safe string comparison
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  // HMAC both with a fixed key — equal inputs produce equal HMACs
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode("vocab-study-compare"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const [hmacA, hmacB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, aBytes),
    crypto.subtle.sign("HMAC", key, bBytes),
  ]);
  const arrA = new Uint8Array(hmacA);
  const arrB = new Uint8Array(hmacB);
  if (arrA.length !== arrB.length) return false;
  let result = 0;
  for (let i = 0; i < arrA.length; i++) {
    result |= arrA[i] ^ arrB[i];
  }
  return result === 0;
}

// Generate a session token (HMAC-signed, expires in 7 days)
async function generateSessionToken(): Promise<string> {
  const secret = Deno.env.get("SESSION_SECRET") || Deno.env.get("APP_PASSWORD") || "default";
  const encoder = new TextEncoder();
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = `vocab_auth:${expires}`;
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret + "_session_key"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  const sigHex = Array.from(sig).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${payload}:${sigHex}`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimitedMemory(clientIp) || await isRateLimitedDb()) {
      return new Response(
        JSON.stringify({ ok: false, error: "Too many attempts. Please wait a minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { password } = await req.json();
    if (!password || typeof password !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "Password required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const correctPassword = Deno.env.get("APP_PASSWORD");
    if (!correctPassword) {
      return new Response(
        JSON.stringify({ ok: false, error: "Service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isCorrect = await timingSafeEqual(password, correctPassword);

    if (isCorrect) {
      const token = await generateSessionToken();
      return new Response(
        JSON.stringify({ ok: true, token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Something went wrong" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
