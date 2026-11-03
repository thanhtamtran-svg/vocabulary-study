// Shape check for the Goethe exam tutor's mini dialogues ("### n" blocks of
// "- A:" / "- B:" turns). Pure so a vitest can pin it. 2026-11-03 the model
// put "Und du?" and its answer both under A; such a result is not cached.
export function dialogueTurnsOk(text: string): boolean {
  const blocks = text.split(/^###\s.*$/m).slice(1);
  if (blocks.length === 0) return false;
  return blocks.every((block) => {
    const turns = block.split("\n")
      .map((l) => l.match(/^\s*[-•]\s*([AB]):/))
      .filter(Boolean)
      .map((m) => (m as RegExpMatchArray)[1]);
    if (turns.length < 2) return false;
    return turns.every((t, i) => t === (i % 2 === 0 ? "A" : "B"));
  });
}
