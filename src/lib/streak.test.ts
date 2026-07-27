import { describe, it, expect } from 'vitest';
import { computeDailyStreak, countCompletedBatches, findNextBatch } from './streak';

// Regression tests for the streak/schedule logic extracted in B-005.
// This logic caused the 2026-05-29 incident (phone showed streak 0,
// "10 batches behind" panic) — every rule here mirrors a real behavior
// the user depends on seeing correctly.
//
// Date facts used below: 2026-07-13 is a Monday, 2026-07-12 a Sunday.

function d(s: string) { return new Date(s + 'T00:00:00'); }

describe('computeDailyStreak', () => {
  it('returns none for no study dates', () => {
    expect(computeDailyStreak([], d('2026-07-13')).status).toBe('none');
    expect(computeDailyStreak(undefined, d('2026-07-13')).count).toBe(0);
  });

  it('counts a simple run ending today', () => {
    const r = computeDailyStreak(['2026-07-11', '2026-07-13'], d('2026-07-13'));
    // Sat + Mon studied, Sunday in between is a rest day → streak 2
    expect(r.count).toBe(2);
    expect(r.status).toBe('active');
    expect(r.studiedToday).toBe(true);
  });

  it('skips Sunday as a rest day (not missed, not required)', () => {
    // Studied Fri + Sat, today is Monday and not studied yet:
    // Sunday must not count as a missed day → still active (only 0 real missed)
    const r = computeDailyStreak(['2026-07-10', '2026-07-11'], d('2026-07-13'));
    expect(r.count).toBe(2);
    expect(r.status).toBe('active');
    expect(r.studiedToday).toBe(false);
  });

  it('shows rest status on a Sunday not yet studied', () => {
    const r = computeDailyStreak(['2026-07-11'], d('2026-07-12')); // Sunday
    expect(r.status).toBe('rest');
    expect(r.count).toBe(1);
  });

  // Thresholds (PM decision, re-confirmed 2026-07-28 after seeing the
  // real streak under each variant): 0-1 missed silent, 2 = warning,
  // 3 = danger (last chance), 4+ = lost. History: 6 → 3 → 5 → 3.
  it('stays silent at 1 missed weekday (grace)', () => {
    // Last studied Thu 2026-07-09; today Sat 2026-07-11 → missed Fri = 1
    const r = computeDailyStreak(['2026-07-09'], d('2026-07-11'));
    expect(r.status).toBe('active');
    expect(r.realMissed).toBe(1);
    expect(r.count).toBe(1);
  });

  it('warns at exactly 2 missed weekdays', () => {
    // Last studied Wed 2026-07-08; today Sat 2026-07-11 → missed Thu+Fri = 2
    const warn = computeDailyStreak(['2026-07-08'], d('2026-07-11'));
    expect(warn.status).toBe('warning');
    expect(warn.realMissed).toBe(2);
    expect(warn.count).toBe(1); // frozen, not lost
  });

  it('goes danger at exactly 3 missed weekdays', () => {
    // Last studied Tue 2026-07-07; today Sat 2026-07-11 →
    // missed Wed+Thu+Fri = 3 → last chance, still frozen
    const danger = computeDailyStreak(['2026-07-07'], d('2026-07-11'));
    expect(danger.status).toBe('danger');
    expect(danger.realMissed).toBe(3);
    expect(danger.count).toBe(1);
  });

  it('loses the streak at 4 missed weekdays', () => {
    // Last studied Mon 2026-07-06; today Sat 2026-07-11 →
    // missed Tue+Wed+Thu+Fri = 4 → gone
    const r = computeDailyStreak(['2026-07-06'], d('2026-07-11'));
    expect(r.status).toBe('lost');
    expect(r.realMissed).toBe(4);
    expect(r.count).toBe(0);
  });

  it('loses the streak after a long gap (Sundays still skipped)', () => {
    // Last studied 2026-07-01 (Wed); today 2026-07-13 (Mon) →
    // missed Jul 2,3,4,6,7,8,9,10,11 (9 weekdays, Sundays 5 & 12 skipped)
    const r = computeDailyStreak(['2026-07-01'], d('2026-07-13'));
    expect(r.status).toBe('lost');
    expect(r.count).toBe(0);
  });

  it('freezes (keeps count) across a short gap', () => {
    // Studied Mon-Wed, missed Thu, studied Fri+Sat, today Sat
    const r = computeDailyStreak(
      ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-10', '2026-07-11'],
      d('2026-07-11')
    );
    expect(r.count).toBe(5);
    // frozenDays counts every missed weekday walked past until the
    // 6-miss cutoff (the internal Thu gap + earlier days before the
    // streak start). Backdrop info only; documented, not asserted tightly.
    expect(r.status).toBe('active');
    expect(r.frozenDays).toBeGreaterThan(0);
  });
});

describe('countCompletedBatches / findNextBatch', () => {
  const batches = [[0, 1], [2, 3], [4, 5]];
  const keyId = (wi: number) => wi;

  it('counts non-contiguous completed batches (no else-break regression)', () => {
    // Batch 0 incomplete, batches 1 & 2 complete — the pre-2026-05-29 bug
    // would have returned 0 here.
    const progress = {
      1: { learned: true },
      2: { learned: true }, 3: { learned: true },
      4: { learned: true }, 5: { learned: true },
    };
    expect(countCompletedBatches(batches, progress, keyId)).toBe(2);
    expect(findNextBatch(batches, progress, keyId)).toBe(1);
  });

  it('handles empty progress and full completion', () => {
    expect(countCompletedBatches(batches, {}, keyId)).toBe(0);
    expect(findNextBatch(batches, {}, keyId)).toBe(1);
    const all = { 0: { learned: true }, 1: { learned: true }, 2: { learned: true },
      3: { learned: true }, 4: { learned: true }, 5: { learned: true } };
    expect(countCompletedBatches(batches, all, keyId)).toBe(3);
    expect(findNextBatch(batches, all, keyId)).toBe(null);
  });

  it('works with word-string keys via keyFor (German style)', () => {
    const words = ['der apfel', 'das kind'];
    const progress = { 'der apfel': { learned: true }, 'das kind': { learned: true } };
    const keyFor = (wi: number) => words[wi];
    expect(countCompletedBatches([[0, 1]], progress, keyFor)).toBe(1);
  });
});
