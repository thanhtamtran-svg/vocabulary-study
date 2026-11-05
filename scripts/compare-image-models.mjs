// One-off: draw the same words with several OpenRouter image models so the PM
// can compare look + real cost side by side. Reads OPENROUTER_API_KEY from .env.
// Usage: node scripts/compare-image-models.mjs <outDir>
import fs from "node:fs";
import path from "node:path";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const KEY = env.OPENROUTER_API_KEY;
if (!KEY) { console.error("OPENROUTER_API_KEY missing in .env"); process.exit(1); }

const outDir = process.argv[2] || "image-compare";
fs.mkdirSync(outDir, { recursive: true });

const MODELS = [
  "black-forest-labs/flux-3-image-klein",
  "recraft/recraft-v4.1-flash",
  "black-forest-labs/flux.2-klein-4b",
];
const WORDS = [
  { word: "die Getränke", english: "drinks (pl.)", type: "Noun" },
  { word: "schwimmen", english: "to swim", type: "Verb" },
  { word: "müde", english: "tired", type: "Adjective" },
];

// Same prompt the app uses (supabase/functions/generate-image), non-definition branch.
function prompt({ word, english, type }) {
  return `Generate a simple cartoon illustration for the phrase "${word}" (meaning: ${english}).

Style requirements:
- Simple cartoon scene on a clean white background
- Colorful comic style, like an educational vocabulary flashcard
- Exaggerated, funny, and memorable — the image should clearly convey the meaning of "${english}"
- The illustration should help a language learner understand and remember the phrase
- ABSOLUTELY NO TEXT, no labels, no letters, no words anywhere in the image
${type === "Verb" ? "- Show a character performing the action" : ""}
${type === "Adjective" ? "- Show a character or object clearly demonstrating the quality" : ""}
${type === "Noun" ? "- Show the thing or concept being described" : ""}`;
}

const results = [];
for (const model of MODELS) {
  for (const w of WORDS) {
    const t0 = Date.now();
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        modalities: ["image"],
        messages: [{ role: "user", content: prompt(w) }],
        usage: { include: true },
      }),
    });
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const data = await res.json().catch(() => ({}));
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || "";
    const m = url.match(/^data:([^;]+);base64,(.+)$/);
    const row = { model, word: w.word, secs, cost: data.usage?.cost ?? null, file: null, error: null };
    if (!res.ok || !m) {
      row.error = `HTTP ${res.status}: ${JSON.stringify(data.error || data).slice(0, 300)}`;
    } else {
      const ext = m[1].split("/")[1] || "png";
      row.file = `${model.split("/")[1]}__${w.word.replace(/\s+/g, "_")}.${ext}`;
      fs.writeFileSync(path.join(outDir, row.file), Buffer.from(m[2], "base64"));
    }
    console.log(JSON.stringify(row));
    results.push(row);
  }
}
fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
