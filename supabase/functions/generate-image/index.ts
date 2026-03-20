import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { word, english, type } = await req.json();
    if (!word || !english) {
      return new Response(JSON.stringify({ error: "word and english required" }), {
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

    // Generate image with Gemini
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;

    let prompt: string;
    if (type === "definition") {
      // Generate image illustrating a German definition sentence
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
      const errText = await geminiResponse.text();
      return new Response(JSON.stringify({ error: "Gemini API error", details: errText.slice(0, 200) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Cache in database (store as data URL for direct use)
    await supabase.from("vocab_images").upsert({
      word: key,
      image_base64: dataUrl,
    }, { onConflict: "word" });

    return new Response(JSON.stringify({ image: dataUrl, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err).slice(0, 300) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
