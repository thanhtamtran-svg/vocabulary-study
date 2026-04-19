import { SUPABASE_URL } from './supabase';
import { isIndexKeyedProgress, migrateProgressToStringKeys, migrateExerciseProgressToStringKeys } from './progress';

var SYNC_URL = SUPABASE_URL + '/functions/v1/sync-progress';

// mergeFullState accepts optional vocabData to migrate index-keyed remote data
// during the transition period (old devices may still push old format)
export function mergeFullState(local, remote, todayDateStr, vocabData) {
  var remoteProgress = remote.progress || {};
  var remoteExerciseProgress = remote.exerciseProgress || {};

  // If remote is still in old format, migrate before merging
  if (vocabData && isIndexKeyedProgress(remoteProgress)) {
    remoteProgress = migrateProgressToStringKeys(remoteProgress, vocabData);
  }
  if (vocabData && isIndexKeyedProgress(remoteExerciseProgress)) {
    remoteExerciseProgress = migrateExerciseProgressToStringKeys(remoteExerciseProgress, vocabData);
  }

  var mp = mergeProgress(local.progress || {}, remoteProgress);

  var mex = {...(local.exerciseProgress || {})};
  Object.keys(remoteExerciseProgress).forEach(function(k) {
    if (!mex[k]) { mex[k] = remoteExerciseProgress[k]; return; }
    var l = mex[k], r = remoteExerciseProgress[k];
    mex[k] = {
      attempts: Math.max(l.attempts || 0, r.attempts || 0),
      correct: Math.max(l.correct || 0, r.correct || 0),
      streak: Math.max(l.streak || 0, r.streak || 0),
      lastExercise: (l.lastExercise || '') > (r.lastExercise || '') ? l.lastExercise : r.lastExercise,
      nextReview: (l.nextReview || '') < (r.nextReview || '') ? l.nextReview : r.nextReview
    };
  });

  var mtc = local.todayCompleted || {};
  if (remote.todayCompleted && remote.completedDate === todayDateStr) {
    var rLC = remote.todayCompleted.learnCount || (remote.todayCompleted.learn ? 1 : 0);
    var lLC = (local.todayCompleted && local.todayCompleted.learnCount) || 0;
    mtc = {
      learnCount: Math.max(lLC, rLC),
      learnedBatches: [...new Set([
        ...((local.todayCompleted && local.todayCompleted.learnedBatches) || []),
        ...(remote.todayCompleted.learnedBatches || [])
      ])],
      reviews: {
        ...(remote.todayCompleted.reviews || {}),
        ...((local.todayCompleted && local.todayCompleted.reviews) || {})
      }
    };
  }

  return {
    progress: mp,
    exerciseProgress: mex,
    todayCompleted: mtc,
    startDate: local.startDate || remote.startDate,
    started: local.started || remote.started,
  };
}

export function mergeProgress(local, remote) {
  var merged = {...local};
  Object.keys(remote).forEach(function(k) {
    if (!merged[k]) { merged[k] = remote[k]; return; }
    var lReviews = merged[k].reviews || [];
    var rReviews = remote[k].reviews || [];
    var allReviews = lReviews.slice();
    rReviews.forEach(function(rr) {
      var dup = allReviews.some(function(lr) { return lr.date === rr.date && lr.type === rr.type; });
      if (!dup) allReviews.push(rr);
    });
    merged[k] = {
      learned: merged[k].learned || remote[k].learned,
      confidence: Math.max(merged[k].confidence || 0, remote[k].confidence || 0),
      lastReview: merged[k].lastReview > remote[k].lastReview ? merged[k].lastReview : remote[k].lastReview,
      reviews: allReviews
    };
  });
  return merged;
}

export async function cloudPull(email, lang) {
  if (!email) return null;
  try {
    var res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pull', email: email, lang: lang })
    });
    if (!res.ok) return null;
    var json = await res.json();
    return json.data || null;
  } catch (e) {
    return null;
  }
}

export async function cloudPush(email, state, lang) {
  if (!email) return false;
  try {
    var res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'push', email: email, lang: lang, data: state })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
