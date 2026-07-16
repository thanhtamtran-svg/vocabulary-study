import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

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

// Rate limit: max 30 requests/min, counted globally in the DB so it
// holds across isolates (see _shared/rate-limit.ts). Protects against
// bulk scraping or write-spam. Real users sync at most ~6 times/min in
// practice (push debounce 5s + occasional pull on focus), so 30/min has
// plenty of headroom even with a phone and PC both syncing.

// Validate session token from Authorization header (same scheme as
// explain-word: HMAC-signed "vocab_auth:<expires>:<sig>" issued by
// verify-password on login).
async function validateAuthToken(req: Request): Promise<boolean> {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return false;
    const token = authHeader.slice(7);
    const parts = token.split(":");
    if (parts.length < 3 || parts[0] !== "vocab_auth") return false;
    const expires = parseInt(parts[1], 10);
    if (isNaN(expires) || Date.now() > expires) return false;
    const payload = parts[0] + ":" + parts[1];
    const sigHex = parts.slice(2).join(":");
    const secret = Deno.env.get("SESSION_SECRET") || Deno.env.get("APP_PASSWORD") || "default";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret + "_session_key"),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const expectedSig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
    const expectedHex = Array.from(expectedSig).map(b => b.toString(16).padStart(2, "0")).join("");
    return sigHex === expectedHex;
  } catch {
    return false;
  }
}

// Validate email shape — rejects empty / non-string / absurdly long /
// no-@-sign inputs. Not strict RFC 5322; just enough to block obvious
// junk from creating rows in vocab_progress.
function validEmail(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (t.length === 0 || t.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return false;
  return true;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (await checkRateLimit("sync-progress", 30)) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, email, lang, data } = body;

    if (!validEmail(email)) {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth gate: the A1.1 course (lang "german_a11") is deliberately
    // public — no password exists for it, so its sync stays open.
    // Every other namespace (German full, English, legacy no-lang keys)
    // requires a valid session token, otherwise anyone who knows an
    // email could read or overwrite that user's progress.
    if (lang !== "german_a11") {
      const authenticated = await validateAuthToken(req);
      if (!authenticated) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const key = lang ? email + ":" + lang : email;

    if (action === "pull") {
      const res = await supabase
        .from("vocab_progress")
        .select("data")
        .eq("user_email", key)
        .single();

      if (res.error || !res.data) {
        return new Response(JSON.stringify({ data: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ data: res.data.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "push") {
      if (!data || typeof data !== "object") {
        return new Response(JSON.stringify({ error: "data required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Server-side guard: never let a push move startDate LATER.
      // A fresh device (empty localStorage, e.g. incognito) initializes
      // startDate = today and old cached clients push that, wiping the
      // real start date months earlier. The earlier date always wins.
      // Doing this on the server makes the guard immune to stale
      // client bundles cached by service workers.
      const existing = await supabase
        .from("vocab_progress")
        .select("data")
        .eq("user_email", key)
        .maybeSingle();
      const existingStart = existing.data?.data?.startDate;
      const incomingStart = data.startDate;
      if (
        typeof existingStart === "string" && existingStart &&
        (typeof incomingStart !== "string" || !incomingStart || existingStart < incomingStart)
      ) {
        data.startDate = existingStart;
      }

      const res = await supabase.from("vocab_progress").upsert(
        {
          user_email: key,
          data: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_email" }
      );

      if (res.error) {
        return new Response(JSON.stringify({ error: res.error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action must be 'pull' or 'push'" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: "Sync failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
