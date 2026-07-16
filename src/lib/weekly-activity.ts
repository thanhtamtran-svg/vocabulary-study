import { dateKey } from './dates';

// B-007: "actual vs planned" weekly activity for the Progress view.
// Counts review/learn entries per calendar day over the last 7 days
// (ending `today`). Pure — caller passes `today` so tests can pin dates.
//
// A day's count = number of review records dated that day across all
// words. That's the same signal studyDates is derived from, but with
// volume (how MANY words), which is what a pace chart needs.
export function computeWeeklyActivity(progress, today) {
  var counts = new Map();
  Object.keys(progress || {}).forEach(function (k) {
    var reviews = progress[k] && progress[k].reviews;
    if (!reviews) return;
    reviews.forEach(function (r) {
      if (r && r.date) counts.set(r.date, (counts.get(r.date) || 0) + 1);
    });
  });

  var labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var days = [];
  var d = new Date(today);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 6);
  for (var i = 0; i < 7; i++) {
    var k2 = dateKey(d);
    days.push({
      date: k2,
      label: labels[d.getDay()],
      count: counts.get(k2) || 0,
      isSunday: d.getDay() === 0,
      isToday: i === 6,
    });
    d.setDate(d.getDate() + 1);
  }
  return days;
}
