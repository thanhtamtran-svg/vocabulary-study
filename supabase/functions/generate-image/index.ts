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

// Rate limiter: max 5 requests per minute per IP (images are expensive)
const rateLimitMap = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < 60_000);
  if (recent.length >= 5) return true;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
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
    // Rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIp)) {
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
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
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Cache in database
    await supabase.from("vocab_images").upsert({
      word: key,
      image_base64: dataUrl,
    }, { onConflict: "word" });

    return new Response(JSON.stringify({ image: dataUrl, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
