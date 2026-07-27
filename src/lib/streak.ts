import { dateKey, parseDate } from './dates';

// Pure streak / schedule calculations, extracted from App.tsx and
// EnglishApp.tsx (B-005). The two apps carried identical copies inside
// useMemo blocks where they couldn't be unit-tested — and the 2026-05-29
// streak incident showed this exact logic is where silent regressions
// hurt the most. Keep these pure (no Date.now(), no localStorage): the
// caller passes `today` so tests can pin any date.

// Streak rules (re-tightened 2026-07-28 per PM decision — tolerate 3).
// History: 6 originally → 3 (2026-07-20) → 5 (2026-07-27, "too strict")
// → 3 again after the PM saw the real numbers side by side and chose the
// stricter standard deliberately. Don't "fix" the threshold without asking.
// - Sunday is a rest day: never counts as missed, doesn't need studying.
// - Up to 3 consecutive non-Sunday missed days "freeze" the streak
//   (count kept, shown as frozen); 4+ missed = streak broken.
// - status: none | active (0-1 missed — silent grace) | warning
//   (2 missed) | danger (3 missed — last chance) | lost (4+ missed)
//   | rest (Sunday, not studied yet today).
// - realMissed is returned so the UI can show concrete numbers
//   ("2 days missed") instead of vague nudges.
export function computeDailyStreak(studyDates, today) {
  if (!studyDates || !studyDates.length) {
    return { count: 0, status: 'none', frozenDays: 0, studiedToday: false, realMissed: 0 };
  }
  var checkDate = new Date(today);
  checkDate.setHours(0, 0, 0, 0);

  var sorted = studyDates.slice().sort().reverse(); // most recent first
  var todayStr = dateKey(checkDate);
  var studiedToday = sorted[0] === todayStr;
  var isRestDay = checkDate.getDay() === 0; // Sunday = rest day

  var lastStudy = parseDate(sorted[0]);
  var dateSet = new Set(sorted);

  // Count actual missed days (excluding Sundays) between last study and today
  var realMissed = 0;
  if (!studiedToday) {
    var d = new Date(checkDate);
    d.setDate(d.getDate() - 1); // start from yesterday
    while (d >= lastStudy) {
      var dk = dateKey(d);
      if (!dateSet.has(dk) && d.getDay() !== 0) { // not studied and not Sunday
        realMissed++;
      }
      if (dateSet.has(dk)) break; // found last study day
      d.setDate(d.getDate() - 1);
    }
  }

  // Build streak counting backwards
  var count = 0;
  var frozenDays = 0;
  var consecutiveMissed = 0;
  var d2 = new Date(checkDate);
  if (!studiedToday) d2.setDate(d2.getDate() - 1);

  while (true) {
    var dk2 = dateKey(d2);
    var isSunday = d2.getDay() === 0;
    if (dateSet.has(dk2)) {
      count++;
      consecutiveMissed = 0;
      d2.setDate(d2.getDate() - 1);
    } else if (isSunday) {
      // Sundays don't count as missed — just skip
      d2.setDate(d2.getDate() - 1);
    } else {
      consecutiveMissed++;
      if (consecutiveMissed > 3) break; // 4+ non-rest missed = streak broken
      frozenDays++;
      d2.setDate(d2.getDate() - 1);
    }
    if (count > 365) break;
  }

  var status = 'active';
  if (!studiedToday && !isRestDay) {
    if (realMissed >= 4) { status = 'lost'; count = 0; frozenDays = 0; }
    else if (realMissed === 3) status = 'danger';
    else if (realMissed === 2) status = 'warning';
  }
  // On rest day, don't warn — streak is safe
  if (isRestDay && !studiedToday) status = 'rest';

  return { count: count, status: status, frozenDays: frozenDays, studiedToday: studiedToday, realMissed: realMissed };
}

// Count fully-learned batches ANYWHERE in the course (deliberately no
// `break` on the first incomplete batch — the old `else break` version
// caused the "10 batches behind" panic of 2026-05-29 when one new word
// landed in an early batch). `keyFor` maps a word index to its progress
// key: German uses lowercase-word keys, English uses the index itself.
export function countCompletedBatches(batches, progress, keyFor) {
  var count = 0;
  for (var i = 0; i < batches.length; i++) {
    if (batches[i].every(function (wi) { return progress[keyFor(wi)]?.learned; })) count++;
  }
  return count;
}

// First batch (1-indexed) that still has unlearned words; null when done.
export function findNextBatch(batches, progress, keyFor) {
  for (var i = 0; i < batches.length; i++) {
    var allLearned = batches[i].every(function (wi) { return progress[keyFor(wi)]?.learned; });
    if (!allLearned) return i + 1;
  }
  return null;
}
