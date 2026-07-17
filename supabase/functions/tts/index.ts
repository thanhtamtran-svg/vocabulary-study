import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { validateAuthToken } from "../_shared/auth.ts";

// Text-to-speech with permanent caching (voice upgrade, 2026-07-17).
//
// POST { text, lang: 'de' | 'en' }  ->  { url }
//
// First request for a given (voice, text) synthesizes MP3 audio via
// Google Cloud Text-to-Speech (Neural2 voices — natural, identical on
// every device) and stores it in the public `tts-audio` bucket; every
// later request — from any device, forever — returns the cached file.
// So Google is paid (well, free-tier'd) at most ONCE per word.
//
// Replaces the client's undocumented translate.google.com/translate_tts
// endpoint, which could break at any time, offered no voice choice, and
// sounded flat on the PC where the user does most of their studying.
//
// Requires the GOOGLE_TTS_API_KEY function secret (set in the Supabase
// dashboard). Without it, responds 503 and the client falls back to
// browser speech synthesis — the app never goes silent.

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

// Slightly slower German aids A1 listening comprehension (the old
// browser-TTS path used 0.85 for the same reason).
const VOICES: Record<string, { name: string; languageCode: string; rate: number }> = {
  de: { name: "de-DE-Neural2-F", languageCode: "de-DE", rate: 0.9 },
  en: { name: "en-US-Neural2-F", languageCode: "en-US", rate: 1.0 },
};

// Same character policy as explain-word's validateWord, but sentence
// length: example sentences and umlauts must pass, control chars and
// absurd payloads must not.
function validateText(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const t = text.trim();
  if (t.length === 0 || t.length > 300) return null;
  if (!/^[\p{L}\d\s\-'"\/\.\+\(\),~?!:;„“”…]+$/u.test(t)) return null;
  return t;
}

async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Rate limit per auth tier. Cache hits are cheap (one storage HEAD),
    // synthesis costs quota — the unauth tier mainly serves the public
    // A1.1 course; the durable counter caps a stranger's burn rate.
    const authenticated = await validateAuthToken(req);
    const tier = authenticated ? "auth" : "unauth";
    const max = authenticated ? 60 : 20;
    if (await checkRateLimit("tts:" + tier, max)) {
      return json({ error: "Rate limited" }, 429);
    }

    const body = await req.json();
    const text = validateText(body?.text);
    const lang = body?.lang === "en" ? "en" : "de";
    if (!text) return json({ error: "text required (max 300 chars)" }, 400);

    const voice = VOICES[lang];
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const hash = await sha256Hex(voice.name + ":" + voice.rate + ":" + text.toLowerCase());
    const path = lang + "/" + hash + ".mp3";
    const publicUrl = supabaseUrl + "/storage/v1/object/public/tts-audio/" + path;

    // Cache check: HEAD on the public URL (no key needed, bucket is public)
    const head = await fetch(publicUrl, { method: "HEAD" });
    if (head.ok) return json({ url: publicUrl, cached: true });

    const apiKey = Deno.env.get("GOOGLE_TTS_API_KEY");
    if (!apiKey) {
      // Not configured yet — tell the client to use its fallback voice.
      return json({ error: "TTS not configured" }, 503);
    }

    const ttsRes = await fetch(
      "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: text },
          voice: { languageCode: voice.languageCode, name: voice.name },
          audioConfig: { audioEncoding: "MP3", speakingRate: voice.rate },
        }),
      }
    );
    if (!ttsRes.ok) {
      return json({ error: "Synthesis failed" }, 502);
    }
    const ttsData = await ttsRes.json();
    const b64 = ttsData?.audioContent;
    if (typeof b64 !== "string" || b64.length === 0) {
      return json({ error: "Synthesis failed" }, 502);
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: upErr } = await supabase.storage
      .from("tts-audio")
      .upload(path, bytes, { contentType: "audio/mpeg", upsert: true });
    if (upErr) {
      // Storage full/misconfigured: still return playable audio this once.
      return json({ url: "data:audio/mpeg;base64," + b64, cached: false });
    }
    return json({ url: publicUrl, cached: false });
  } catch (_err) {
    return json({ error: "TTS failed" }, 500);
  }
});
