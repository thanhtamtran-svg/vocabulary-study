import { describe, it, expect } from 'vitest';
import { explainCacheKey } from './explain-cache-key.ts';
import { VOCAB_DATA } from '../../../src/vocab-data';
import { VOCAB_A11_DATA } from '../../../src/vocab-a11-data';
import { ENGLISH_VOCAB_DATA } from '../../../src/english-vocab-data';
import { VOCAB_PATTERNS_DATA } from '../../../src/patterns-a1-data';

describe('explainCacheKey', () => {
  // B-032 regression: the retired Vietnamese branch must never produce a
  // cache key, so no request can write (or clear) a shared 'vi:' row.
  it('refuses lang vi, with or without pattern kind', () => {
    expect(explainCacheKey('facilitate something', 'vi', false)).toBeNull();
    expect(explainCacheKey('facilitate something', 'vi', true)).toBeNull();
  });
  it('keeps the existing namespaces', () => {
    expect(explainCacheKey('Das Haus', 'de', false)).toBe('das haus');
    expect(explainCacheKey('Facilitate', 'en', false)).toBe('en:facilitate');
    expect(explainCacheKey('Ich nehme …', 'de', true)).toBe('pat:ich nehme …');
  });
  it('can never emit a vi: key', () => {
    for (const lang of ['de', 'en', 'xx', '', 'vi']) {
      for (const p of [false, true]) {
        expect(explainCacheKey('vi:x', lang, p)?.startsWith('vi:')).not.toBe(true);
      }
    }
  });
  it('refuses a German word that would land in another namespace', () => {
    expect(explainCacheKey('vi:on the outskirts', 'de', false)).toBeNull();
    expect(explainCacheKey('EN:facilitate', 'de', false)).toBeNull();
    expect(explainCacheKey('pat:Ich nehme …', 'de', false)).toBeNull();
  });
  it('gives every real vocab entry a key (no course loses its explanations)', () => {
    var bad = [];
    VOCAB_DATA.words.concat(VOCAB_A11_DATA.words).forEach(function (w) { if (!explainCacheKey(w[0], 'de', false)) bad.push(w[0]); });
    ENGLISH_VOCAB_DATA.forEach(function (w) { if (!explainCacheKey(w[0], 'en', false)) bad.push(w[0]); });
    VOCAB_PATTERNS_DATA.words.forEach(function (w) { if (!explainCacheKey(w[0], 'de', true)) bad.push(w[0]); });
    expect(bad).toEqual([]);
  });
});
