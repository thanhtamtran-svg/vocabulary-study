import { describe, it, expect } from 'vitest';
import { validateWord } from './validate-word.ts';
import { VOCAB_DATA } from '../../../src/vocab-data';
import { VOCAB_A11_DATA } from '../../../src/vocab-a11-data';
import { ENGLISH_VOCAB_DATA } from '../../../src/english-vocab-data';
import { VOCAB_PATTERNS_DATA } from '../../../src/patterns-a1-data';

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
  it('Hören & Sprechen A1 patterns (same limits explain-word uses: 25 words / 160 chars)', () => {
    var bad = VOCAB_PATTERNS_DATA.words.filter(function (w) { return !validateWord(w[0], 'de', 25, 160); }).map(function (w) { return w[0]; });
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

describe('validateWord for sentence patterns (25 words / 160 chars)', () => {
  var pattern = 'Ich möchte … — Haben Sie …?';
  it('accepts an em-dash pattern', () => {
    expect(validateWord(pattern, 'de', 25, 160)).toBe(pattern);
  });
  it('accepts longer patterns only with the overrides', () => {
    var long = 'Wie komme ich zum Bahnhof und wo finde ich die nächste Haltestelle von hier aus bitte? '.trim();
    var padded = long + ' ' + 'Danke schön'.repeat(1) + ' ' + 'x'.repeat(30);
    expect(padded.length).toBeGreaterThan(100);
    expect(validateWord(padded, 'de')).toBeNull();
    expect(validateWord(padded, 'de', 25, 160)).toBe(padded);
  });
  it('still rejects brackets and overlong input', () => {
    expect(validateWord('Ich möchte [etwas]', 'de', 25, 160)).toBeNull();
    expect(validateWord('a'.repeat(161), 'de', 25, 160)).toBeNull();
    expect(validateWord(Array(26).fill('ab').join(' '), 'de', 25, 160)).toBeNull();
  });
  it('keeps the default caps and rejects em dash is not special-cased', () => {
    expect(validateWord('a'.repeat(101), 'de')).toBeNull();
    expect(validateWord('a b c d e f g h i j k', 'de')).toBeNull();
    expect(validateWord('a b c d e f g h i j', 'de')).toBe('a b c d e f g h i j');
    expect(validateWord('Hallo — Welt', 'de')).toBe('Hallo — Welt');
  });
});
