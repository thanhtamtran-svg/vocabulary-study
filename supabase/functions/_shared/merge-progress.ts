// Server-side merge for sync-progress pushes (B-028).
//
// Before this, a push REPLACED the cloud row wholesale. A device holding a
// stale copy (e.g. a PC tab left open for days, never reloaded) would push
// its old state on tab-hide and silently erase whatever another device had
// synced in between. Incident 2026-10-13: Monday's A1.1 session (studied on
// another device) vanished from the cloud, breaking the streak.
//
// Now the push is merged INTO the existing row, so progress only ever grows:
// - progress: reviews unioned (dedup by date+type), learned = OR,
//   confidence = max, lastReview = later date
// - exerciseProgress: counters = max, lastExercise = later, nextReview = earlier
// - studyDates: union
// - startDate: earlier; started: OR
// - todayCompleted: merged when both sides are for the same day, otherwise
//   the side with the later completedDate wins
// - any other field: incoming wins
//
// Mirrors mergeFullState / mergeProgress in src/lib/sync.ts (client side).
// Pure, dependency-free TS so both Deno (edge function) and vitest can load it.

type Obj = Record<string, any>;

function pickLater(a?: string, b?: string) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function pickEarlier(a?: string, b?: string) {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

// Same heuristic as isIndexKeyedProgress in src/lib/progress.ts: legacy
// devices keyed progress by word index instead of the word itself.
function isIndexKeyed(p: Obj) {
  var keys = Object.keys(p || {});
  if (keys.length === 0) return false;
  var numeric = keys.filter(function (k) { return /^\d+$/.test(k); }).length;
  return numeric > keys.length / 2;
}

function mergeWords(incoming: Obj, existing: Obj) {
  var merged: Obj = { ...incoming };
  Object.keys(existing).forEach(function (k) {
    var e = existing[k];
    if (!e) return;
    var i = merged[k];
    if (!i) { merged[k] = e; return; }
    var reviews = (i.reviews || []).slice();
    (e.reviews || []).forEach(function (er: Obj) {
      var dup = reviews.some(function (ir: Obj) { return ir.date === er.date && ir.type === er.type; });
      if (!dup) reviews.push(er);
    });
    merged[k] = {
      ...e,
      ...i,
      learned: !!(i.learned || e.learned),
      confidence: Math.max(i.confidence || 0, e.confidence || 0),
      lastReview: pickLater(i.lastReview, e.lastReview),
      reviews: reviews,
    };
  });
  return merged;
}

function mergeExercises(incoming: Obj, existing: Obj) {
  var merged: Obj = { ...incoming };
  Object.keys(existing).forEach(function (k) {
    var e = existing[k];
    if (!e) return;
    var i = merged[k];
    if (!i) { merged[k] = e; return; }
    merged[k] = {
      ...e,
      ...i,
      attempts: Math.max(i.attempts || 0, e.attempts || 0),
      correct: Math.max(i.correct || 0, e.correct || 0),
      streak: Math.max(i.streak || 0, e.streak || 0),
      lastExercise: pickLater(i.lastExercise, e.lastExercise),
      nextReview: pickEarlier(i.nextReview, e.nextReview),
    };
  });
  return merged;
}

function mergeToday(incoming: Obj, existing: Obj) {
  var iDate = incoming.completedDate || '';
  var eDate = existing.completedDate || '';
  if (iDate !== eDate) {
    return iDate > eDate
      ? { todayCompleted: incoming.todayCompleted, completedDate: incoming.completedDate }
      : { todayCompleted: existing.todayCompleted, completedDate: existing.completedDate };
  }
  var i = incoming.todayCompleted || {};
  var e = existing.todayCompleted || {};
  return {
    completedDate: incoming.completedDate,
    todayCompleted: {
      ...e,
      ...i,
      learnCount: Math.max(i.learnCount || 0, e.learnCount || 0),
      learnedBatches: [...new Set([...(e.learnedBatches || []), ...(i.learnedBatches || [])])],
      reviews: { ...(e.reviews || {}), ...(i.reviews || {}) },
    },
  };
}

export function mergeSyncPush(existing: Obj | null | undefined, incoming: Obj): Obj {
  if (!existing || typeof existing !== 'object') return incoming;

  var ip = incoming.progress || {};
  var ep = existing.progress || {};
  // Mixed key formats can't be merged word-by-word — keep the old
  // replace behaviour for progress in that (legacy, rare) case.
  var progress = isIndexKeyed(ip) !== isIndexKeyed(ep) && Object.keys(ip).length > 0
    ? ip
    : mergeWords(ip, ep);

  var ix = incoming.exerciseProgress || {};
  var ex = existing.exerciseProgress || {};
  var exerciseProgress = isIndexKeyed(ix) !== isIndexKeyed(ex) && Object.keys(ix).length > 0
    ? ix
    : mergeExercises(ix, ex);

  var studyDates = [...new Set([...(existing.studyDates || []), ...(incoming.studyDates || [])])].sort();

  var result: Obj = {
    ...existing,
    ...incoming,
    progress: progress,
    exerciseProgress: exerciseProgress,
    studyDates: studyDates,
    startDate: pickEarlier(incoming.startDate, existing.startDate),
    started: !!(incoming.started || existing.started),
    ...mergeToday(incoming, existing),
  };
  return result;
}
