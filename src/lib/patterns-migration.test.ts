import { describe, it, expect } from 'vitest';
import { migrateA11ToPatterns, patternsKeyFor } from './patterns-migration';
import { A11_TO_PATTERNS } from '../patterns-a1-migration';
import { VOCAB_PATTERNS_DATA } from '../patterns-a1-data';
import { VOCAB_A11_DATA } from '../vocab-a11-data';
import moved from '../../scripts/data/a11-moved-rows.json';

// Moving rows between courses touches real learner progress, so every rule
// here is pinned: nothing is lost, nothing is downgraded, re-running is a no-op.

const MAP = {
  'ich heiße ...': 'Mein Name ist Tim.',
  'mein name ist ...': 'Mein Name ist Tim.',
  'aha!': 'Aha!',
};

describe('A11_TO_PATTERNS (generated map)', () => {
  it('covers every row cut out of Schritte A1', () => {
    (moved as {de: string}[]).forEach(r => {
      expect(A11_TO_PATTERNS[r.de.toLowerCase().trim()], r.de).toBeTruthy();
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
