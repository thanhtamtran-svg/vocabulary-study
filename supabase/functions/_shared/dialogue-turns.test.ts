import { describe, it, expect } from 'vitest';
import { dialogueTurnsOk } from './dialogue-turns.ts';

const ok = '## Mini dialogues\n### 1\n- A: **Siehst du oft fern?** – x\n- B: **Ja.** – y\n### 2\n- A: **Wie oft?** – x\n- B: **Oft.** – y\n- A: **Und was?** – x\n- B: **Krimis.** – y\n## Watch out\n- tip';

describe('dialogueTurnsOk', () => {
  it('accepts alternating A/B dialogues', () => {
    expect(dialogueTurnsOk(ok)).toBe(true);
  });
  it('rejects two turns by the same speaker in a row', () => {
    expect(dialogueTurnsOk(ok.replace('- B: **Krimis.**', '- A: **Krimis.**'))).toBe(false);
  });
  it('rejects a dialogue that starts with B or has one turn', () => {
    expect(dialogueTurnsOk('### 1\n- B: **Ja.** – y\n- A: **Hm?** – x')).toBe(false);
    expect(dialogueTurnsOk('### 1\n- A: **Hallo?** – x')).toBe(false);
  });
  it('rejects text with no dialogues (e.g. the old list format)', () => {
    expect(dialogueTurnsOk('## Other ways to ask\n- **Was?** – x')).toBe(false);
  });
});
