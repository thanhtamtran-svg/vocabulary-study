// Cache key for explain-word results in vocab_explanations. Pure and
// dependency-free so a vitest can pin which requests may reach the AI.
//
// Returns null for a request the server must refuse. B-032 (2026-10-20):
// lang 'vi' translated a client-sent `definition` (free text) and cached
// it under 'vi:' + word for every learner — one caller could poison the
// shared row. The app stopped asking for Vietnamese in April 2026, so the
// branch is retired instead of patched: 'vi' never reaches a prompt or
// the cache again. Old 'vi:' rows stay in the table; nothing reads them.
//
// German keys have no prefix, so a German "word" that itself starts with
// another namespace ("vi:…", "en:…", "pat:…") would land in that slot;
// refuse it (no vocab entry starts like that).
export const RETIRED_LANGS = ["vi"];
const RESERVED_PREFIXES = ["vi:", "en:", "pat:"];

export function explainCacheKey(
  word: string,
  lang: string,
  isPattern: boolean,
): string | null {
  if (RETIRED_LANGS.includes(lang)) return null;
  const wordLower = word.toLowerCase();
  if (isPattern) return "pat:" + wordLower;
  if (lang === "en") return "en:" + wordLower;
  if (RESERVED_PREFIXES.some((p) => wordLower.startsWith(p))) return null;
  return wordLower;
}
