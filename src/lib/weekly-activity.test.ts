import { describe, it, expect } from 'vitest';
import { computeWeeklyActivity } from './weekly-activity';

function d(s: string) { return new Date(s + 'T00:00:00'); }

describe('computeWeeklyActivity', () => {
  it('returns 7 days ending today with zero counts for empty progress', () => {
    const days = computeWeeklyActivity({}, d('2026-07-13')); // Monday
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2026-07-07'); // Tuesday a week back
    expect(days[6].date).toBe('2026-07-13');
    expect(days[6].isToday).toBe(true);
    expect(days.every(x => x.count === 0)).toBe(true);
    // Sunday 2026-07-12 flagged as rest day
    expect(days[5].isSunday).toBe(true);
  });

  it('counts review records per day across words', () => {
    const progress = {
      apple: { learned: true, reviews: [
        { date: '2026-07-13', type: 'learn' },
        { date: '2026-07-11', type: 'review' },
      ]},
      kind: { learned: true, reviews: [
        { date: '2026-07-13', type: 'learn' },
      ]},
      old: { learned: true, reviews: [
        { date: '2026-06-01', type: 'learn' }, // outside window — ignored
      ]},
    };
    const days = computeWeeklyActivity(progress, d('2026-07-13'));
    expect(days[6].count).toBe(2); // today: apple + kind
    expect(days[4].count).toBe(1); // Saturday: apple review
    expect(days[0].count).toBe(0);
  });

  it('tolerates words without a reviews array', () => {
    const days = computeWeeklyActivity({ x: { learned: true } }, d('2026-07-13'));
    expect(days.every(x => x.count === 0)).toBe(true);
  });
});
