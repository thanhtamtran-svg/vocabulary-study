import { describe, it, expect } from 'vitest';
import { migrateA11ToPatterns, patternsKeyFor, applyPatternRenames } from './patterns-migration';
import { A11_TO_PATTERNS, PATTERN_RENAMES, DROPPED_A11_KEYS } from '../patterns-a1-migration';
import { VOCAB_PATTERNS_DATA } from '../patterns-a1-data';
import { VOCAB_A11_DATA } from '../vocab-a11-data';
import { A11_RENAMES } from '../a11-renames';
import moved from '../../scripts/data/a11-moved-rows.json';

// Moving rows between courses touches real learner progress, so every rule
// here is pinned: nothing is lost, nothing is downgraded, re-running is a no-op.

const MAP = {
  'ich heiße ...': 'Mein Name ist Tim.',
  'mein name ist ...': 'Mein Name ist Tim.',
  'aha!': 'Aha!',
};

describe('A11_TO_PATTERNS (generated map)', () => {
  it('covers every row cut out of Schritte A1 (except rows dropped on purpose)', () => {
    (moved as {de: string}[]).forEach(r => {
      const k = r.de.toLowerCase().trim();
      if (DROPPED_A11_KEYS.includes(k)) return;
      expect(A11_TO_PATTERNS[k], r.de).toBeTruthy();
    });
  });
  it('points only at rows that exist in the patterns course', () => {
    const keys = new Set(VOCAB_PATTERNS_DATA.words.map(w => w[0]));
    Object.values(A11_TO_PATTERNS).forEach(g => expect(keys.has(g), g).toBe(true));
  });
  it('left no moved row behind in Schritte A1', () => {
    const left = new Set(VOCAB_A11_DATA.words.map(w => String(w[0]).toLowerCase().trim()));
    (moved as {de: string}[]).forEach(r => expect(left.has(r.de.toLowerCase().trim()), r.de).toBe(false));
  });
});

describe('PATTERN_RENAMES (2026-10-21 review)', () => {
  const current = new Set(VOCAB_PATTERNS_DATA.words.map(w => w[0]));
  it('every target is a current row, every old key is gone', () => {
    Object.entries(PATTERN_RENAMES).forEach(([oldKey, target]) => {
      expect(current.has(target), target).toBe(true);
      expect([...current].some(g => g.toLowerCase() === oldKey), oldKey).toBe(false);
    });
  });
  it('moves progress of "Was sprechen Sie?" onto "Welche Sprachen sprechen Sie?" without downgrading', () => {
    const p = {
      'was sprechen sie?': { learned: true, confidence: 4, lastReview: '2026-10-20', reviews: [{ date: '2026-10-20', type: 'review', conf: 4 }] },
      'welche sprachen sprechen sie?': { learned: true, confidence: 2, lastReview: '2026-10-18', reviews: [{ date: '2026-10-18', type: 'learn', conf: 2 }] },
    };
    const r = applyPatternRenames(p, {});
    const t = r.progress['welche sprachen sprechen sie?'];
    expect(t.confidence).toBe(4);
    expect(t.lastReview).toBe('2026-10-20');
    expect(t.reviews).toHaveLength(2);
    expect(applyPatternRenames(r.progress, r.exerciseProgress).changed).toBe(false);
  });
  it('chains: a Schritte row that maps to a reworded pattern lands on the new wording', () => {
    expect(A11_TO_PATTERNS['buchstabieren sie, bitte.']).toBe('Können Sie das bitte buchstabieren?');
    expect(A11_TO_PATTERNS['was sprechen sie?']).toBe('Welche Sprachen sprechen Sie?');
  });
});

describe('migrateA11ToPatterns', () => {
  it('maps old keys to the lowercased pattern key', () => {
    expect(patternsKeyFor('Ich heiße ...', MAP)).toBe('mein name ist tim.');
    expect(patternsKeyFor('Hallo Welt', MAP)).toBeNull();
  });

  it('copies learned state and merges duplicates that point at one pattern', () => {
    const a11 = {
      'ich heiße ...': { learned: true, confidence: 2, lastReview: '2026-10-01', reviews: [{ date: '2026-10-01', type: 'learn', conf: 2 }] },
      'mein name ist ...': { learned: true, confidence: 4, lastReview: '2026-10-05', reviews: [{ date: '2026-10-05', type: 'review', conf: 4 }] },
      'der apfel': { learned: true, confidence: 4, reviews: [] },
    };
    const r = migrateA11ToPatterns(a11, {}, {}, {}, MAP);
    expect(Object.keys(r.progress)).toEqual(['mein name ist tim.']);
    const p = r.progress['mein name ist tim.'];
    expect(p.learned).toBe(true);
    expect(p.confidence).toBe(4);
    expect(p.lastReview).toBe('2026-10-05');
    expect(p.reviews).toHaveLength(2);
    expect(r.changed).toBe(true);
  });

  it('never downgrades progress already made in the patterns course', () => {
    const a11 = { 'aha!': { learned: false, confidence: 1, lastReview: '2026-09-01', reviews: [] } };
    const pat = { 'aha!': { learned: true, confidence: 4, lastReview: '2026-10-19', reviews: [{ date: '2026-10-19', type: 'review', conf: 4 }] } };
    const r = migrateA11ToPatterns(a11, {}, pat, {}, MAP);
    expect(r.progress['aha!'].learned).toBe(true);
    expect(r.progress['aha!'].confidence).toBe(4);
    expect(r.progress['aha!'].lastReview).toBe('2026-10-19');
  });

  it('is a no-op the second time (safe to run on every load)', () => {
    const a11 = { 'aha!': { learned: true, confidence: 3, lastReview: '2026-10-02', reviews: [{ date: '2026-10-02', type: 'learn', conf: 3 }] } };
    const ex = { 'aha!': { attempts: 3, correct: 2, streak: 1, recent: [1, 0, 1], lastExercise: '2026-10-03', nextReview: '2026-10-06' } };
    const first = migrateA11ToPatterns(a11, ex, {}, {}, MAP);
    const second = migrateA11ToPatterns(a11, ex, first.progress, first.exerciseProgress, MAP);
    expect(second.changed).toBe(false);
    expect(second.progress).toEqual(first.progress);
    expect(second.exerciseProgress).toEqual(first.exerciseProgress);
  });

  it('moves exercise records too', () => {
    const ex = { 'ich heiße ...': { attempts: 4, correct: 3, streak: 2, recent: [1, 1], lastExercise: '2026-10-03', nextReview: '2026-10-07' } };
    const r = migrateA11ToPatterns({}, ex, {}, {}, MAP);
    expect(r.exerciseProgress['mein name ist tim.'].attempts).toBe(4);
  });

  it('tolerates missing stores', () => {
    const r = migrateA11ToPatterns(null, undefined, null, undefined, MAP);
    expect(r.progress).toEqual({});
    expect(r.changed).toBe(false);
  });
});

describe('2026-11-05: all Expressions moved, Schritte A1 keeps base noun forms', () => {
  it('no Expression row is left in Schritte A1', () => {
    const exprType = VOCAB_A11_DATA.types.indexOf('Expression');
    expect(VOCAB_A11_DATA.words.filter(w => w[3] === exprType).map(w => w[0])).toEqual([]);
  });
  it('A11_RENAMES: every target is a current row, every old key is gone', () => {
    const keys = new Set(VOCAB_A11_DATA.words.map(w => String(w[0]).toLowerCase().trim()));
    Object.entries(A11_RENAMES).forEach(([from, to]) => {
      expect(keys.has(to), to).toBe(true);
      expect(keys.has(from), from).toBe(false);
    });
  });
  it('kept plural on purpose: no-singular nouns, other-meaning plurals, -schmerzen compounds', () => {
    const keys = new Set(VOCAB_A11_DATA.words.map(w => String(w[0])));
    ['die Leute', 'die Ferien', 'die Nebenkosten', 'die Spaghetti', 'die Kleider', 'die Papiere',
      'die Kopfschmerzen', 'die Halsschmerzen', 'die Rückenschmerzen'].forEach(k => expect(keys.has(k), k).toBe(true));
  });
  it('a learned plural card carries over to the singular without downgrading it', () => {
    const p = {
      'die getränke': { learned: true, confidence: 4, lastReview: '2026-11-01', reviews: [{ date: '2026-11-01', type: 'review', conf: 4 }] },
      'das getränk': { learned: true, confidence: 2, lastReview: '2026-10-10', reviews: [{ date: '2026-10-10', type: 'learn', conf: 2 }] },
      'die nudeln': { learned: true, confidence: 3, lastReview: '2026-10-12', reviews: [{ date: '2026-10-12', type: 'learn', conf: 3 }] },
    };
    const r = applyPatternRenames(p, { 'die nudeln': { recent: [1, 1], attempts: 2, correct: 2, streak: 2, lastExercise: '2026-10-12', nextReview: '2026-10-20' } }, A11_RENAMES);
    expect(r.progress['das getränk'].confidence).toBe(4);
    expect(r.progress['das getränk'].reviews).toHaveLength(2);
    expect(r.progress['die nudel'].learned).toBe(true);
    expect(r.exerciseProgress['die nudel'].correct).toBe(2);
    expect(applyPatternRenames(r.progress, r.exerciseProgress, A11_RENAMES).changed).toBe(false);
  });
  it('a learned Schritte phrase is learned in the patterns course', () => {
    const r = migrateA11ToPatterns({ 'mit dem bus': { learned: true, confidence: 3, lastReview: '2026-10-01', reviews: [] } }, {}, {}, {});
    expect(r.progress['mit dem bus'].learned).toBe(true);
    const r2 = migrateA11ToPatterns({ 'danke': { learned: true, confidence: 3, lastReview: '2026-10-01', reviews: [] } }, {}, {}, {});
    expect(r2.progress['danke.'].learned).toBe(true);
  });
});
