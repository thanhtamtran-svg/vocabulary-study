import { describe, it, expect } from 'vitest';
import { mergeProgress, mergeFullState } from './sync';
import { migrateProgressToStringKeys, isIndexKeyedProgress } from './progress';

// Regression tests for the data-merge logic that runs on every cloud sync.
// These functions touch user data: a regression here can silently corrupt
// progress on someone's PC or phone. The streak/sync bugs of 2026-05-29
// taught us this lesson — adding tests here so the next regression is
// caught before it ships.

describe('mergeProgress', () => {
  it('keeps a word learned if either side has it learned', () => {
    const local = { apple: { learned: true, confidence: 4, reviews: [] } };
    const remote = { apple: { learned: false, confidence: 1, reviews: [] } };
    const merged = mergeProgress(local, remote);
    expect(merged.apple.learned).toBe(true);
  });

  it('takes the higher confidence value when both sides have the word', () => {
    const local = { apple: { learned: true, confidence: 2, reviews: [] } };
    const remote = { apple: { learned: true, confidence: 4, reviews: [] } };
    const merged = mergeProgress(local, remote);
    expect(merged.apple.confidence).toBe(4);
  });

  it('deduplicates reviews by date and type', () => {
    const local = {
      apple: {
        learned: true, confidence: 3,
        reviews: [{ date: '2026-05-15', type: 'learn', conf: 3 }],
      },
    };
    const remote = {
      apple: {
        learned: true, confidence: 3,
        reviews: [
          { date: '2026-05-15', type: 'learn', conf: 3 },
          { date: '2026-05-20', type: 'review', conf: 4 },
        ],
      },
    };
    const merged = mergeProgress(local, remote);
    expect(merged.apple.reviews).toHaveLength(2);
  });

  it('preserves a word that exists only remotely', () => {
    const local = {};
    const remote = { apple: { learned: true, confidence: 3, reviews: [] } };
    const merged = mergeProgress(local, remote);
    expect(merged.apple.learned).toBe(true);
  });
});

describe('isIndexKeyedProgress', () => {
  it('detects old-format progress with numeric keys', () => {
    const old = { '0': { learned: true }, '1': { learned: false }, '2': { learned: true } };
    expect(isIndexKeyedProgress(old)).toBe(true);
  });

  it('rejects new-format progress with word-string keys', () => {
    const next = { apple: { learned: true }, banana: { learned: false } };
    expect(isIndexKeyedProgress(next)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isIndexKeyedProgress({})).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isIndexKeyedProgress(null)).toBe(false);
    expect(isIndexKeyedProgress(undefined)).toBe(false);
  });
});

describe('mergeFullState.startDate', () => {
  // Regression for the 2026-06-12 incognito bug: a fresh device with
  // local.startDate = today must not overwrite the user's real cloud
  // startDate from months ago. Earlier date must win.
  const baseLocal = {
    progress: {}, exerciseProgress: {},
    todayCompleted: { learnCount: 0, learnedBatches: [], reviews: {} },
    completedDate: '2026-06-12', started: false,
  };
  const baseRemote = {
    progress: {}, exerciseProgress: {},
    todayCompleted: { learnCount: 0, learnedBatches: [], reviews: {} },
    completedDate: '2026-05-15', started: true,
  };

  it('picks earlier startDate when remote is older (the incognito bug)', () => {
    const merged = mergeFullState(
      { ...baseLocal, startDate: '2026-06-12' },
      { ...baseRemote, startDate: '2026-04-19' },
      '2026-06-12', undefined
    );
    expect(merged.startDate).toBe('2026-04-19');
  });

  it('picks earlier startDate when local is older', () => {
    const merged = mergeFullState(
      { ...baseLocal, startDate: '2026-03-01' },
      { ...baseRemote, startDate: '2026-04-19' },
      '2026-06-12', undefined
    );
    expect(merged.startDate).toBe('2026-03-01');
  });

  it('falls back to remote when local has no startDate', () => {
    const merged = mergeFullState(
      { ...baseLocal, startDate: null },
      { ...baseRemote, startDate: '2026-04-19' },
      '2026-06-12', undefined
    );
    expect(merged.startDate).toBe('2026-04-19');
  });

  it('falls back to local when remote has no startDate', () => {
    const merged = mergeFullState(
      { ...baseLocal, startDate: '2026-04-19' },
      { ...baseRemote, startDate: null },
      '2026-06-12', undefined
    );
    expect(merged.startDate).toBe('2026-04-19');
  });
});

describe('migrateProgressToStringKeys', () => {
  const vocabData = {
    words: [
      ['der Apfel', 'apple', 3, 0],
      ['das Kind', 'child', 1, 0],
    ],
  };

  it('migrates numeric keys to lowercase word strings', () => {
    const old = { '0': { learned: true, confidence: 3, reviews: [] } };
    const migrated = migrateProgressToStringKeys(old, vocabData);
    expect(migrated['der apfel']).toBeDefined();
    expect(migrated['der apfel'].learned).toBe(true);
    expect(migrated['0']).toBeUndefined();
  });

  it('passes through already-string-keyed entries unchanged', () => {
    const mixed = {
      '0': { learned: true, confidence: 3, reviews: [] },
      'das kind': { learned: true, confidence: 4, reviews: [] },
    };
    const migrated = migrateProgressToStringKeys(mixed, vocabData);
    expect(migrated['der apfel']).toBeDefined();
    expect(migrated['das kind']).toBeDefined();
    expect(migrated['das kind'].confidence).toBe(4);
  });

  it('drops entries whose index is out of range', () => {
    const old = { '99': { learned: true, confidence: 3, reviews: [] } };
    const migrated = migrateProgressToStringKeys(old, vocabData);
    expect(Object.keys(migrated)).toHaveLength(0);
  });
});
