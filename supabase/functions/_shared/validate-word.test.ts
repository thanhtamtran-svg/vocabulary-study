import { describe, it, expect } from 'vitest';
import { validateWord } from './validate-word.ts';
import { VOCAB_DATA } from '../../../src/vocab-data';
import { VOCAB_A11_DATA } from '../../../src/vocab-a11-data';
import { ENGLISH_VOCAB_DATA } from '../../../src/english-vocab-data';

// Every word the app can ask explain-word about must pass the server's
// input check — otherwise the learner gets "Could not load explanation".
// Regression: 2026-10-20, 12 A1 phrases with "…" were rejected.
describe('validateWord accepts every vocab entry', () => {
  it('German 1500 course', () => {
    var bad = VOCAB_DATA.words.filter(function (w) { return !validateWord(w[0], 'de'); }).map(function (w) { return w[0]; });
    expect(bad).toEqual([]);
  });
  it('Schritte A1 course', () => {
    var bad = VOCAB_A11_DATA.words.filter(function (w) { return !validateWord(w[0], 'de'); }).map(function (w) { return w[0]; });
    expect(bad).toEqual([]);
  });
  it('English course', () => {
    var bad = ENGLISH_VOCAB_DATA.filter(function (w) { return !validateWord(w[0], 'en'); }).map(function (w) { return w[0]; });
    expect(bad).toEqual([]);
  });
});

describe('validateWord still rejects junk', () => {
  it('rejects non-strings, empty, overlong and markup', () => {
    expect(validateWord(42)).toBeNull();
    expect(validateWord('   ')).toBeNull();
    expect(validateWord('a'.repeat(101))).toBeNull();
    expect(validateWord('<script>alert(1)</script>')).toBeNull();
    expect(validateWord('a b c d e f g h i j k', 'de')).toBeNull();
  });
  it('accepts the ellipsis phrase that broke', () => {
    expect(validateWord('Ich nehme …', 'de')).toBe('Ich nehme …');
  });
});
