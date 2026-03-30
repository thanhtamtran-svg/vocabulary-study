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

// Simple rate limiter: max 5 attempts per minute per IP
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Rate limit
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many attempts. Please wait a minute." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Authentication: require CRON_SECRET or valid session token
  const authHeader = req.headers.get("authorization") || "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  const appPassword = Deno.env.get("APP_PASSWORD");

  let authenticated = false;

  // Check CRON_SECRET via Bearer token
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    authenticated = true;
  }

  // Check valid session token via Bearer token
  if (!authenticated && appPassword && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const parts = token.split(":");
    if (parts.length === 3 && parts[0] === "vocab_auth") {
      const expires = parseInt(parts[1], 10);
      if (Date.now() < expires) {
        const payload = `${parts[0]}:${parts[1]}`;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw", encoder.encode(appPassword + "_session_key"),
          { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
        );
        const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
        const sigHex = Array.from(sig).map(b => b.toString(16).padStart(2, '0')).join('');
        if (sigHex === parts[2]) {
          authenticated = true;
        }
      }
    }
  }

  if (!authenticated) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all base64 images (not yet migrated)
    const { data: rows, error } = await supabase
      .from("vocab_images")
      .select("word, image_base64")
      .not("image_base64", "like", "https://%")
      .limit(5); // Process 5 at a time (images are ~1.5MB each)

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ message: "No base64 images to migrate", migrated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let migrated = 0;
    let failed = 0;
    const results: string[] = [];

    for (const row of rows) {
      try {
        const b64 = row.image_base64.replace(/^data:image\/\w+;base64,/, "");
        const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const filename = row.word.toLowerCase()
          .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
          .replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") + ".png";

        const { error: uploadError } = await supabase.storage
          .from("vocab-images")
          .upload(filename, binary, { contentType: "image/png", upsert: true });

        if (uploadError) {
          results.push(`FAIL upload ${row.word}: ${uploadError.message}`);
          failed++;
          continue;
        }

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/vocab-images/${filename}`;

        const { error: updateError } = await supabase
          .from("vocab_images")
          .update({ image_base64: publicUrl })
          .eq("word", row.word);

        if (updateError) {
          results.push(`FAIL update ${row.word}: ${updateError.message}`);
          failed++;
        } else {
          results.push(`OK ${row.word}`);
          migrated++;
        }
      } catch (e) {
        results.push(`ERROR ${row.word}: ${e.message}`);
        failed++;
      }
    }

    return new Response(JSON.stringify({ migrated, failed, total: rows.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
