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
    const { words } = await req.json();
    // words: [{german, english, type, category}] — up to 6 words per request

    if (!words || !Array.isArray(words) || words.length === 0 || words.length > 8) {
      return new Response(JSON.stringify({ error: "Provide 1-8 words" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claudeKey = Deno.env.get("ANTHROPIC_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check which words already have sentences cached
    const wordKeys = words.map((w: any) => w.german.toLowerCase());
    const { data: existing } = await supabase
      .from("vocab_sentences")
      .select("word, sentences, passage")
      .in("word", wordKeys);

    const cached: Record<string, any> = {};
    if (existing) {
      existing.forEach((row: any) => { cached[row.word] = row; });
    }

    const uncached = words.filter((w: any) => !cached[w.german.toLowerCase()]);

    if (uncached.length === 0) {
      // All cached — return them
      const result: Record<string, any> = {};
      words.forEach((w: any) => {
        const c = cached[w.german.toLowerCase()];
        result[w.german.toLowerCase()] = c ? { sentences: c.sentences, passage: c.passage } : null;
      });
      return new Response(JSON.stringify({ data: result, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt for uncached words
    const wordList = uncached.map((w: any) =>
      `- "${w.german}" (${w.english}) [${w.type}] — category: ${w.category}`
    ).join("\n");

    const allWordList = words.map((w: any) => `"${w.german}" (${w.english})`).join(", ");

    const prompt = `You are a German A1 language teacher. Generate practice content for these German words:

${wordList}

For EACH word above, create exactly 3 simple A1-level sentences in German that use the word naturally. Each sentence should:
- Be 5-10 words long
- Use only A1 vocabulary
- Show the word in different everyday contexts (daily life, school, travel, shopping, family)
- Include the English translation in parentheses after each sentence

Also create ONE short reading passage (4-6 sentences, A1 level) that naturally uses ALL of these words: ${allWordList}. The passage should be about a relatable everyday topic. Add an English translation of the full passage at the end.

Respond in this exact JSON format:
{
  "sentences": {
    "word1_lowercase": [
      {"de": "German sentence with word.", "en": "English translation."},
      {"de": "...", "en": "..."},
      {"de": "...", "en": "..."}
    ],
    "word2_lowercase": [...]
  },
  "passage": {
    "title": "Short title in German",
    "text": "The full passage text in German...",
    "translation": "English translation of the passage...",
    "words_used": ["word1", "word2", ...]
  }
}

Only output valid JSON. No markdown, no explanation.`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      return new Response(JSON.stringify({ error: "Claude API error", details: errText.slice(0, 200) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeData = await claudeResponse.json();
    const text = claudeData.content?.[0]?.text || "";

    // Parse JSON from response
    let parsed: any;
    try {
      // Try to extract JSON from possible markdown wrapping
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: text.slice(0, 300) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize AI response keys to lowercase
    const normalizedSentences: Record<string, any> = {};
    if (parsed.sentences) {
      for (const [k, v] of Object.entries(parsed.sentences)) {
        normalizedSentences[k.toLowerCase()] = v;
      }
    }

    // Save sentences to DB
    const passageText = parsed.passage ? JSON.stringify(parsed.passage) : null;

    for (const w of uncached) {
      const key = w.german.toLowerCase();
      const sentences = normalizedSentences[key] || [];
      if (sentences.length > 0) {
        await supabase.from("vocab_sentences").upsert({
          word: key,
          sentences: sentences,
          passage: passageText,
        }, { onConflict: "word" });
      }
    }

    // Build result combining cached + new
    const result: Record<string, any> = {};
    words.forEach((w: any) => {
      const key = w.german.toLowerCase();
      if (cached[key]) {
        result[key] = { sentences: cached[key].sentences, passage: cached[key].passage };
      } else {
        result[key] = {
          sentences: normalizedSentences[key] || [],
          passage: passageText,
        };
      }
    });

    return new Response(JSON.stringify({ data: result, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err).slice(0, 300) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
