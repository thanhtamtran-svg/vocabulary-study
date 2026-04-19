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

// Verify a session token minted by verify-password.
// Format: vocab_auth:{expires}:{hex-hmac}
async function verifySessionToken(token: string): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(":");
  if (parts.length !== 3 || parts[0] !== "vocab_auth") return false;
  const expires = parseInt(parts[1], 10);
  if (isNaN(expires) || Date.now() > expires) return false;

  const secret = Deno.env.get("APP_PASSWORD") || "default";
  const encoder = new TextEncoder();
  const payload = `vocab_auth:${expires}`;
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret + "_session_key"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const expectedSig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  );
  const expectedHex = Array.from(expectedSig)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time compare
  if (expectedHex.length !== parts[2].length) return false;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ parts[2].charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const ok = await verifySessionToken(token);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
