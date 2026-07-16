// Durable, cross-isolate rate limiting shared by all edge functions.
//
// Why this exists: each function used to count requests in an in-memory
// Map. Every Deno isolate has its own Map and isolates recycle between
// requests, so the counter reset constantly and a burst spread across
// fresh isolates never tripped the limit (B-022, verified 2026-07-14:
// 15 rapid calls, zero 429s). The count now lives in Postgres via the
// check_rate_limit RPC (migrations/20260714_rate_limit.sql), shared by
// every isolate.
//
// Buckets are GLOBAL, not per-IP: the client IP this layer observes in
// x-forwarded-for is not stable across requests on Supabase's edge
// network, so a per-IP key almost never accumulated. A global counter
// per (function, auth-tier) is the right model for a single-user app —
// a distributed flood is bounded regardless of source IP. Callers pass
// a bucket like "explain-word:unauth" so tiers and functions don't
// share a counter.
//
// Fails OPEN on any error: a DB hiccup must never lock the user out of
// their own app. The platform (CORS allowlist, auth checks) still
// applies; this is a cost/abuse cap, not the primary access control.

export async function checkRateLimit(
  bucket: string,
  max: number,
  windowSeconds = 60,
): Promise<boolean> {
  // Returns true when the request should be BLOCKED (limit exceeded).
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
          p_bucket: bucket,
          p_max: max,
          p_window_seconds: windowSeconds,
        }),
      },
    );
    if (!res.ok) return false;        // fail open
    const allowed = await res.json(); // RPC returns true = allowed
    return allowed === false;         // so false = limited
  } catch {
    return false; // fail open
  }
}
