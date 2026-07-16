import "@supabase/functions-js/edge-runtime.d.ts";
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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth gate: uploads overwrite shared vocabulary images (upsert by
    // word), so only authenticated callers (the owner's upload scripts)
    // may write. Without this, anyone could replace every image.
    const authenticated = await validateAuthToken(req);
    if (!authenticated) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 20 uploads per minute, counted globally in the DB
    // (see _shared/rate-limit.ts). Only authenticated callers reach this
    // point, so the counter tracks the owner's own upload scripts.
    if (await checkRateLimit("upload-image", 20)) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
