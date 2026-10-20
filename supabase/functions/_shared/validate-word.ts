// Input check for explain-word. Lives in _shared (pure, dependency-free)
// so a vitest can run every vocab entry through it — 2026-10-20 the
// typographic ellipsis "…" (12 A1 phrases like "Ich nehme …") was
// rejected with 400 and the learner saw "Could not load explanation".

// Letters, digits, spaces and the punctuation real vocab entries use:
// hyphen, apostrophes (' ’), slash, period, ellipsis (…), plus, parens,
// comma, tilde, ?!:;, equals (English synonym pairs "a = b") and
// German quotes („ “ ”) / en dash (–) / em dash (—, sentence patterns).
var ALLOWED = /^[\p{L}\d\s\-'’\/\.…\+\(\),~?!:;=„“”–—]+$/u;

export function validateWord(
  word: unknown,
  lang?: string,
  maxWordsOverride?: number,
  maxCharsOverride?: number,
): string | null {
  if (typeof word !== "string") return null;
  const trimmed = word.trim();
  if (trimmed.length === 0 || trimmed.length > (maxCharsOverride || 100)) return null;
  if (!ALLOWED.test(trimmed)) return null;
  // Max 12 words for English phrases, 10 for German (A1 vocab includes
  // full sentence-length entries like "Wie viel kostet ein Kilo ...?")
  const maxWords = maxWordsOverride || ((lang === 'en' || lang === 'vi') ? 12 : 10);
  if (trimmed.split(/\s+/).length > maxWords) return null;
  return trimmed;
}
