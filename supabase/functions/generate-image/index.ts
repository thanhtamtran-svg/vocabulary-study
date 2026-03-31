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

// Rate limiter: stricter for unauthenticated requests
const rateLimitMap = new Map<string, number[]>();
function isRateLimited(ip: string, authenticated: boolean): boolean {
  const now = Date.now();
  const max = authenticated ? 5 : 2;
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < 60_000);
  if (recent.length >= max) return true;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

// Validate session token from Authorization header
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
    const secret = Deno.env.get("APP_PASSWORD") || "default";
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

// Validate word input
function validateWord(word: unknown): string | null {
  if (typeof word !== "string") return null;
  const trimmed = word.trim();
  if (trimmed.length === 0 || trimmed.length > 50) return null;
  if (!/^[\p{L}\s\-]+$/u.test(trimmed)) return null;
  if (trimmed.split(/\s+/).length > 4) return null;
  return trimmed;
}

function validateShortString(val: unknown, maxLen = 100): string | null {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (trimmed.length === 0 || trimmed.length > maxLen) return null;
  return trimmed;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth token validation + rate limiting
    const authenticated = await validateAuthToken(req);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIp, authenticated)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const word = validateWord(body?.word);
    const english = validateShortString(body?.english, 150);
    const type = validateShortString(body?.type, 30) || "";

    if (!word || !english) {
      return new Response(JSON.stringify({ error: "Valid word and english required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache first
    const key = word.toLowerCase();
    const { data: cached } = await supabase
      .from("vocab_images")
      .select("image_base64")
      .eq("word", key)
      .single();

    if (cached?.image_base64) {
      // Return cached value — works for both legacy base64 data URLs and new storage URLs
      return new Response(JSON.stringify({ image: cached.image_base64, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let prompt: string;
    if (type === "definition") {
      prompt = `Generate a simple cartoon illustration that visually depicts this German sentence: "${english}"

Style requirements:
- Simple cartoon scene on a clean white background
- Colorful comic style, like an educational flashcard for children
- The illustration should clearly show the action or situation described in the sentence
- A viewer should be able to understand what the sentence means just by looking at the image
- Funny, exaggerated, and memorable
- ABSOLUTELY NO TEXT, no labels, no letters, no words anywhere in the image`;
    } else {
      prompt = `Generate a simple cartoon illustration for the German word "${word}" (meaning: ${english}).

Style requirements:
- Single cartoon character or object, centered on a clean white background
- Colorful comic style similar to educational German vocabulary flashcard illustrations
- Exaggerated, funny, and memorable features that clearly hint at the word's meaning
- Simple and clean — no clutter, no background scene
- The illustration should help a language learner guess what the word means
- ABSOLUTELY NO TEXT, no labels, no letters, no words anywhere in the image
${type === "Verb" ? "- Show a character performing the action" : ""}
${type === "Adjective" ? "- Show a character or object clearly demonstrating the quality" : ""}
${type === "Expression" ? "- Show a character using body language/facial expression to convey the meaning" : ""}`;
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      }
    );

    if (!geminiResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to generate image. Please try again." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiResponse.json();
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData);

    if (!imagePart) {
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base64 = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType || "image/png";

    // Decode base64 to binary for Storage upload
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const filePath = `${key}.png`;
    const { error: uploadError } = await supabase.storage
      .from("vocab-images")
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    let imageValue: string;

    if (uploadError) {
      // Fallback to base64 data URL if upload fails
      console.error("Storage upload failed, falling back to base64:", uploadError.message);
      imageValue = `data:${mimeType};base64,${base64}`;
    } else {
      // Use the public URL from Storage
      imageValue = `${supabaseUrl}/storage/v1/object/public/vocab-images/${encodeURIComponent(filePath)}`;
    }

    // Cache in database (stores URL for new images, or base64 as fallback)
    await supabase.from("vocab_images").upsert({
      word: key,
      image_base64: imageValue,
    }, { onConflict: "word" });

    return new Response(JSON.stringify({ image: imageValue, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
