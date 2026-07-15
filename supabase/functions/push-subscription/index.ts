import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Per-IP rate limit: max 30 requests/min. Push subscription is a
// user-facing feature (anyone using the app can enable reminders), so
// it does NOT require a session token — same stance as sync-progress
// for german_a11. Protection is CORS origin allowlist + this rate limit,
// which stops write-spam without locking out normal users who never
// logged in with the admin password.
const rateLimitMap = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < 60_000);
  if (recent.length >= 30) return true;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIp)) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, endpoint, email, keys, reminderHour, timezone } = body;

    if (!endpoint || typeof endpoint !== "string") {
      return new Response(JSON.stringify({ error: "endpoint required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save") {
      if (!keys || !keys.p256dh || !keys.auth) {
        return new Response(JSON.stringify({ error: "keys required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await supabase.from("push_subscriptions").upsert(
        {
          user_email: email || null,
          endpoint,
          keys_p256dh: keys.p256dh,
          keys_auth: keys.auth,
          reminder_hour: reminderHour ?? 8,
          timezone: timezone || "Asia/Ho_Chi_Minh",
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
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

    if (action === "update-hour") {
      if (typeof reminderHour !== "number") {
        return new Response(JSON.stringify({ error: "reminderHour required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await supabase.from("push_subscriptions")
        .update({ reminder_hour: reminderHour, updated_at: new Date().toISOString() })
        .eq("endpoint", endpoint);
      if (res.error) {
        return new Response(JSON.stringify({ error: res.error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "deactivate") {
      const res = await supabase.from("push_subscriptions")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("endpoint", endpoint);
      if (res.error) {
        return new Response(JSON.stringify({ error: res.error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-hour") {
      const res = await supabase.from("push_subscriptions")
        .select("reminder_hour")
        .eq("endpoint", endpoint)
        .eq("active", true)
        .maybeSingle();
      if (res.error) {
        return new Response(JSON.stringify({ error: res.error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ reminderHour: res.data?.reminder_hour ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Request failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
