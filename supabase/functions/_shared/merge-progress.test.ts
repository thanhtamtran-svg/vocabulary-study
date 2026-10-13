import { describe, it, expect } from 'vitest';
import { mergeSyncPush } from './merge-progress.ts';

// B-028 regression: a stale device's push must not erase study another
// device synced in between (incident 2026-10-13: Monday's session lost).
describe('mergeSyncPush', () => {
  var cloud = {
    startDate: '2026-04-19',
    started: true,
    studyDates: ['2026-10-09', '2026-10-12'],
    completedDate: '2026-10-12',
    todayCompleted: { learnCount: 1, learnedBatches: [60], reviews: {} },
    progress: {
      haus: { learned: true, confidence: 3, lastReview: '2026-10-12', reviews: [{ date: '2026-10-09', type: 'learn' }, { date: '2026-10-12', type: 'review' }] },
      tisch: { learned: true, confidence: 1, lastReview: '2026-10-12', reviews: [{ date: '2026-10-12', type: 'learn' }] },
    },
    exerciseProgress: { haus: { attempts: 4, correct: 3, streak: 2, lastExercise: '2026-10-12', nextReview: '2026-10-15' } },
  };
  // A PC tab last refreshed on Friday, pushing on tab-hide today.
  var stale = {
    startDate: '2026-04-19',
    started: true,
    studyDates: ['2026-10-09'],
    completedDate: '2026-10-13',
    todayCompleted: { learnCount: 0, learnedBatches: [], reviews: {} },
    progress: {
      haus: { learned: true, confidence: 2, lastReview: '2026-10-09', reviews: [{ date: '2026-10-09', type: 'learn' }] },
    },
    exerciseProgress: { haus: { attempts: 2, correct: 2, streak: 1, lastExercise: '2026-10-09', nextReview: '2026-10-12' } },
  };

  it('keeps the other device\'s study day and words when a stale copy is pushed', () => {
    var m = mergeSyncPush(cloud, stale);
    expect(m.studyDates).toEqual(['2026-10-09', '2026-10-12']);
    expect(m.progress.tisch.learned).toBe(true);
    expect(m.progress.haus.lastReview).toBe('2026-10-12');
    expect(m.progress.haus.confidence).toBe(3);
    expect(m.progress.haus.reviews).toHaveLength(2);
  });

  it('merges exercise counters (max) and dates (later last, earlier next)', () => {
    var e = mergeSyncPush(cloud, stale).exerciseProgress.haus;
    expect(e).toMatchObject({ attempts: 4, correct: 3, streak: 2, lastExercise: '2026-10-12', nextReview: '2026-10-12' });
  });

  it('adds genuinely new progress from the incoming push', () => {
    var fresh = { ...stale, studyDates: ['2026-10-13'], progress: { stuhl: { learned: true, lastReview: '2026-10-13', reviews: [{ date: '2026-10-13', type: 'learn' }] } } };
    var m = mergeSyncPush(cloud, fresh);
    expect(m.studyDates).toEqual(['2026-10-09', '2026-10-12', '2026-10-13']);
    expect(Object.keys(m.progress).sort()).toEqual(['haus', 'stuhl', 'tisch']);
  });

  it('never moves startDate later (B-017 guard preserved)', () => {
    expect(mergeSyncPush(cloud, { ...stale, startDate: '2026-10-13' }).startDate).toBe('2026-04-19');
    expect(mergeSyncPush(cloud, { ...stale, startDate: undefined }).startDate).toBe('2026-04-19');
    expect(mergeSyncPush({ ...cloud, startDate: '2026-05-01' }, stale).startDate).toBe('2026-04-19');
  });

  it('todayCompleted: later day wins; same day is unioned', () => {
    var later = mergeSyncPush(cloud, stale);
    expect(later.completedDate).toBe('2026-10-13');
    expect(later.todayCompleted.learnCount).toBe(0);

    var older = mergeSyncPush({ ...cloud, completedDate: '2026-10-13' }, { ...stale, completedDate: '2026-10-12' });
    expect(older.completedDate).toBe('2026-10-13');

    var same = mergeSyncPush(cloud, { ...stale, completedDate: '2026-10-12', todayCompleted: { learnCount: 2, learnedBatches: [61], reviews: {} } });
    expect(same.todayCompleted.learnCount).toBe(2);
    expect(same.todayCompleted.learnedBatches.sort()).toEqual([60, 61]);
  });

  it('first push (no cloud row) is stored as-is', () => {
    expect(mergeSyncPush(null, stale)).toBe(stale);
  });

  it('does not word-merge across legacy index-keyed and word-keyed formats', () => {
    var legacy = { ...cloud, progress: { '0': { learned: true }, '1': { learned: true } } };
    var m = mergeSyncPush(legacy, stale);
    expect(Object.keys(m.progress)).toEqual(['haus']);
  });
});
