// Word type sent by the client for explain-word. B-034 (2026-10-20): it
// used to go into the German/English prompts as free text, and the result
// is cached for every learner — a caller could steer the shared row of a
// word that has no cached explanation yet. Only the fixed type names of
// the courses pass; anything else becomes "" (the prompt still works).
// Keep in sync with `types` in src/vocab-data.ts / src/vocab-a11-data.ts
// and ENGLISH_TYPES in src/english-vocab-data.ts (word-type.test.ts checks).
export const GERMAN_TYPES = ["Noun", "Verb", "Adjective", "Grammar", "Expression", "Foundational"];
export const ENGLISH_TYPES = [
  "Noun", "Verb", "Adjective", "Noun Phrase", "Verb Phrase", "Adjective Phrase",
  "Adverb", "Idiom", "Prepositional Phrase", "Phrasal Verb",
];

export function allowedWordType(type: unknown, lang: string): string {
  if (typeof type !== "string") return "";
  const t = type.trim().toLowerCase();
  const list = lang === "en" ? ENGLISH_TYPES : GERMAN_TYPES;
  return list.find((x) => x.toLowerCase() === t) || "";
}
