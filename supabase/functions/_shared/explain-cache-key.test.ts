import { describe, it, expect } from 'vitest';
import { explainCacheKey } from './explain-cache-key.ts';
import { VOCAB_DATA } from '../../../src/vocab-data';
import { VOCAB_A11_DATA } from '../../../src/vocab-a11-data';
import { ENGLISH_VOCAB_DATA } from '../../../src/english-vocab-data';
import { VOCAB_PATTERNS_DATA, PATTERN_EXAM } from '../../../src/patterns-a1-data';

describe('explainCacheKey', () => {
  // B-032 regression: the retired Vietnamese branch must never produce a
  // cache key, so no request can write (or clear) a shared 'vi:' row.
  it('refuses lang vi, with or without pattern kind', () => {
    expect(explainCacheKey('facilitate something', 'vi', '')).toBeNull();
    expect(explainCacheKey('facilitate something', 'vi', 'pattern')).toBeNull();
  });
  it('keeps the existing namespaces', () => {
    expect(explainCacheKey('Das Haus', 'de', '')).toBe('das haus');
    expect(explainCacheKey('Facilitate', 'en', '')).toBe('en:facilitate');
    expect(explainCacheKey('Ich nehme …', 'de', 'pattern')).toBe('pat:ich nehme …');
    expect(explainCacheKey('Hast du Kinder? — Ja.', 'de', 'exam2')).toBe('exam2:hast du kinder? — ja.');
  });
  it('can never emit a vi: key', () => {
    for (const lang of ['de', 'en', 'xx', '', 'vi']) {
      for (const p of ['', 'pattern', 'exam2', 'exam3']) {
        expect(explainCacheKey('vi:x', lang, p)?.startsWith('vi:')).not.toBe(true);
      }
    }
  });
  it('refuses a German word that would land in another namespace', () => {
    expect(explainCacheKey('vi:on the outskirts', 'de', '')).toBeNull();
    expect(explainCacheKey('EN:facilitate', 'de', '')).toBeNull();
    expect(explainCacheKey('pat:Ich nehme …', 'de', '')).toBeNull();
    expect(explainCacheKey('exam:Hast du …', 'de', '')).toBeNull();
  });
  it('gives every real vocab entry a key (no course loses its explanations)', () => {
    var bad = [];
    VOCAB_DATA.words.concat(VOCAB_A11_DATA.words).forEach(function (w) { if (!explainCacheKey(w[0], 'de', '')) bad.push(w[0]); });
    ENGLISH_VOCAB_DATA.forEach(function (w) { if (!explainCacheKey(w[0], 'en', '')) bad.push(w[0]); });
    VOCAB_PATTERNS_DATA.words.forEach(function (w) { if (!explainCacheKey(w[0], 'de', 'pattern')) bad.push(w[0]); });
    PATTERN_EXAM.rows.forEach(function (w) { if (!explainCacheKey(w[0], 'de', 'exam' + w[4].exam.teil)) bad.push(w[0]); });
    expect(bad).toEqual([]);
  });
});
