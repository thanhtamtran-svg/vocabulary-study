// Progress key helpers — progress is keyed by lowercase German word string
// This allows sharing progress across course variants (e.g., 1500 German vs Schritte A1.1)
// that have overlapping vocabulary.

// Get the progress key for a word index in a given vocab data set.
// Falls back to the numeric index stringified if word doesn't exist (shouldn't happen).
export function wordKey(vocabData, wi) {
  var word = vocabData && vocabData.words && vocabData.words[wi];
  if (!word) return String(wi);
  return String(word[0]).toLowerCase().trim();
}

// Check if a progress object is in the old (index-keyed) format.
// Heuristic: if any key is purely numeric, treat it as old format.
export function isIndexKeyedProgress(progress) {
  if (!progress || typeof progress !== 'object') return false;
  var keys = Object.keys(progress);
  if (keys.length === 0) return false;
  // If MOST keys are numeric strings, it's old format
  var numericCount = keys.filter(function(k) { return /^\d+$/.test(k); }).length;
  return numericCount > keys.length / 2;
}

// Migrate progress from numeric keys (word indices) to string keys (lowercase German word).
// Returns a new object; doesn't mutate input.
// For words that can't be resolved (index out of range), the entry is dropped.
export function migrateProgressToStringKeys(progress, vocabData) {
  if (!progress || typeof progress !== 'object') return {};
  if (!vocabData || !vocabData.words) return progress;
  var migrated = {};
  Object.keys(progress).forEach(function(k) {
    if (/^\d+$/.test(k)) {
      var wi = parseInt(k, 10);
      var key = wordKey(vocabData, wi);
      if (key && !(/^\d+$/.test(key))) {
        // If key already exists (duplicate after migration), merge reviews
        if (migrated[key]) {
          var a = migrated[key];
          var b = progress[k];
          migrated[key] = {
            learned: a.learned || b.learned,
            confidence: Math.max(a.confidence || 0, b.confidence || 0),
            lastReview: (a.lastReview || '') > (b.lastReview || '') ? a.lastReview : b.lastReview,
            reviews: dedupeReviews([...(a.reviews || []), ...(b.reviews || [])]),
            exerciseCorrect: (a.exerciseCorrect || 0) + (b.exerciseCorrect || 0),
          };
        } else {
          migrated[key] = progress[k];
        }
      }
    } else {
      // Already string-keyed
      migrated[k] = progress[k];
    }
  });
  return migrated;
}

function dedupeReviews(reviews) {
  var seen = new Set();
  var result = [];
  reviews.forEach(function(r) {
    var sig = (r.date || '') + '|' + (r.type || '') + '|' + (r.conf || '');
    if (!seen.has(sig)) {
      seen.add(sig);
      result.push(r);
    }
  });
  return result;
}

// Same migration but for exerciseProgress.
// exerciseProgress is also numeric-keyed currently; migrate to word-keyed.
export function migrateExerciseProgressToStringKeys(exerciseProgress, vocabData) {
  if (!exerciseProgress || typeof exerciseProgress !== 'object') return {};
  if (!vocabData || !vocabData.words) return exerciseProgress;
  var migrated = {};
  Object.keys(exerciseProgress).forEach(function(k) {
    if (/^\d+$/.test(k)) {
      var wi = parseInt(k, 10);
      var key = wordKey(vocabData, wi);
      if (key && !(/^\d+$/.test(key))) {
        if (migrated[key]) {
          var a = migrated[key];
          var b = exerciseProgress[k];
          migrated[key] = {
            attempts: Math.max(a.attempts || 0, b.attempts || 0),
            correct: Math.max(a.correct || 0, b.correct || 0),
            streak: Math.max(a.streak || 0, b.streak || 0),
            lastExercise: (a.lastExercise || '') > (b.lastExercise || '') ? a.lastExercise : b.lastExercise,
            nextReview: (a.nextReview || '') < (b.nextReview || '') ? a.nextReview : b.nextReview,
          };
        } else {
          migrated[key] = exerciseProgress[k];
        }
      }
    } else {
      migrated[k] = exerciseProgress[k];
    }
  });
  return migrated;
}
