import { describe, it, expect } from 'vitest';
import { VOCAB_PATTERNS_DATA, PATTERN_LISTEN_ONLY_CAT, PATTERN_LEARN_ORDER, patternPartner } from './patterns-a1-data';

const { words, cats, types, batches } = VOCAB_PATTERNS_DATA;

describe('patterns-a1-data', () => {
  it('has unique progress keys (lowercased german)', () => {
    const seen = new Map<string, string>();
    words.forEach(w => {
      const k = w[0].toLowerCase().trim();
      expect(seen.has(k), 'duplicate: ' + w[0]).toBe(false);
      seen.set(k, w[0]);
    });
  });

  it('every row has valid cat/type and a cue', () => {
    words.forEach(w => {
      expect(cats[w[2]], w[0]).toBeTruthy();
      expect(types[w[3]], w[0]).toBeTruthy();
      expect(w[4].cue.length, w[0]).toBeGreaterThan(0);
      expect(w[1].length, w[0]).toBeGreaterThan(0);
    });
  });

  it('speakable german has no slot brackets', () => {
    words.forEach(w => expect(/[[\]]/.test(w[0]), w[0]).toBe(false));
  });

  it('slots match the brackets in meta.pattern', () => {
    words.forEach(w => {
      const n = (w[4].pattern.match(/\[[^\]]*\]/g) || []).length;
      expect((w[4].slots || []).length, w[0]).toBe(n);
    });
  });

  it('du/Sie partners resolve both ways', () => {
    words.forEach((w, i) => {
      if (!w[4].partner) return;
      const p = patternPartner(i);
      expect(p, w[0]).toBeGreaterThanOrEqual(0);
      expect(patternPartner(p), w[0]).toBe(i);
    });
  });

  it('doc rows carry track numbers; listen-only rows sit in their own cat', () => {
    words.forEach(w => {
      if (w[4].source === 'audio') expect(w[4].tracks.length, w[0]).toBeGreaterThan(0);
      expect(!!w[4].listenOnly, w[0]).toBe(w[2] === PATTERN_LISTEN_ONLY_CAT);
    });
  });

  it('batches cover every row exactly once, 3–9 rows each, one situation per batch', () => {
    const seen = new Set<number>();
    batches.forEach(b => {
      expect(b.length).toBeGreaterThanOrEqual(3);
      expect(b.length).toBeLessThanOrEqual(9);
      expect(new Set(b.map(i => words[i][2])).size).toBe(1);
      b.forEach(i => { expect(seen.has(i)).toBe(false); seen.add(i); });
    });
    expect(seen.size).toBe(words.length);
  });

  it('never splits a du/Sie pair across batches', () => {
    const batchOf = new Map<number, number>();
    batches.forEach((b, bi) => b.forEach(i => batchOf.set(i, bi)));
    words.forEach((w, i) => {
      const p = patternPartner(i);
      if (p >= 0) expect(batchOf.get(p), w[0]).toBe(batchOf.get(i));
    });
  });

  it('learn order lists every cat once, listen-only last', () => {
    expect([...PATTERN_LEARN_ORDER].sort((a, b) => a - b)).toEqual(cats.map((_, i) => i));
    expect(PATTERN_LEARN_ORDER[PATTERN_LEARN_ORDER.length - 1]).toBe(PATTERN_LISTEN_ONLY_CAT);
  });
});
