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
    const { word, english } = await req.json();
    if (!word) {
      return new Response(JSON.stringify({ error: "word required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const key = word.toLowerCase().trim();

    // Check both caches
    const [ipaCache, defCache] = await Promise.all([
      supabase.from("vocab_ipa").select("ipa").eq("word", key).single(),
      supabase.from("vocab_definitions").select("definition").eq("word", key).single(),
    ]);

    let ipa = ipaCache.data?.ipa || null;
    let definition = defCache.data?.definition || null;

    // Generate missing data
    const tasks: string[] = [];
    if (!ipa) tasks.push("IPA");
    if (!definition && english) tasks.push("DEF");

    if (tasks.length > 0) {
      let prompt = "";
      if (tasks.includes("IPA") && tasks.includes("DEF")) {
        prompt = `For the German word "${word}" (English: ${english}):
1. Give the IPA transcription in square brackets like [ˈhaloː]
2. Write a very simple definition in German (A1 level), ONE short sentence a child can understand. Do NOT use the word itself.

Reply in this exact format:
IPA: [transcription]
DEF: definition sentence`;
      } else if (tasks.includes("IPA")) {
        prompt = `Give me ONLY the IPA transcription for the German word "${word}". Return ONLY the IPA in square brackets like [ˈhaloː]. No explanation.`;
      } else {
        prompt = `Write a very simple definition in German (A1 level) for "${word}" (English: ${english}). ONE short sentence a child can understand. Do NOT use the word itself. Return ONLY the sentence.`;
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (tasks.includes("IPA") && tasks.includes("DEF")) {
          const ipaMatch = text.match(/IPA:\s*[\[\/]?(.*?)[\]\/]?\s*\n/);
          const defMatch = text.match(/DEF:\s*(.+)/);
          if (ipaMatch) ipa = ipaMatch[1].trim();
          if (defMatch) definition = defMatch[1].trim().replace(/^["']|["']$/g, "");
        } else if (tasks.includes("IPA")) {
          const match = text.match(/[\[\/](.*?)[\]\/]/);
          ipa = match ? match[1] : text.trim().replace(/[\[\]\/]/g, "");
        } else {
          definition = text.trim().replace(/^["']|["']$/g, "");
        }

        // Cache results
        if (ipa && !ipaCache.data?.ipa) {
          await supabase.from("vocab_ipa").upsert({ word: key, ipa }, { onConflict: "word" });
        }
        if (definition && !defCache.data?.definition && definition.length <= 150) {
          await supabase.from("vocab_definitions").upsert({ word: key, definition }, { onConflict: "word" });
        }
      }
    }

    return new Response(JSON.stringify({ ipa: ipa || null, definition: definition || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err).slice(0, 200) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
