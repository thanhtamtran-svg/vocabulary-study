import "@supabase/functions-js/edge-runtime.d.ts";
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

const rateLimitMap = new Map<string, number[]>();

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limit: max 20 uploads per minute per IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const timestamps = rateLimitMap.get(clientIp) || [];
    const recent = timestamps.filter((t: number) => now - t < 60000);
    if (recent.length >= 20) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    recent.push(now);
    rateLimitMap.set(clientIp, recent);

    const body = await req.json();
    const word = typeof body?.word === "string" ? body.word.trim().toLowerCase() : "";
    const imageBase64 = typeof body?.image === "string" ? body.image : "";

    if (!word || !imageBase64) {
      return new Response(JSON.stringify({ error: "word and image required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Decode base64 to binary
    const binaryStr = atob(imageBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Use index-based filename to avoid umlaut issues
    const safeFilename = word.replace(/[^a-z0-9]/g, '_') + '.png';
    const { error: uploadErr } = await supabase.storage
      .from("vocab-images")
      .upload(safeFilename, bytes, { contentType: "image/png", upsert: true });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    let imageUrl: string;

    if (uploadErr) {
      imageUrl = `data:image/png;base64,${imageBase64}`;
    } else {
      imageUrl = `${supabaseUrl}/storage/v1/object/public/vocab-images/${encodeURIComponent(safeFilename)}`;
    }

    // Save in DB
    await supabase.from("vocab_images").upsert(
      { word: word, image_base64: imageUrl },
      { onConflict: "word" }
    );

    return new Response(JSON.stringify({ ok: true, url: imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
