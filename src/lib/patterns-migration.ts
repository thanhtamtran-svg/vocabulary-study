// Carry Schritte A1 progress over to the Hören & Sprechen A1 patterns course
// for the sentence rows that moved there on 2026-10-20 (A11_TO_PATTERNS).
//
// Idempotent and monotonic: it only merges (learned OR, max confidence, later
// date, union of reviews — the same rules as a cloud sync), so it is safe to
// run on every patterns load and again whenever Schritte state arrives from
// the cloud. That covers a device that has the old progress only in the cloud.
import { mergeProgress, mergeExerciseProgress } from './sync';
import { A11_TO_PATTERNS, PATTERN_RENAMES } from '../patterns-a1-migration';

type Rec = {[k: string]: any};

export function patternsKeyFor(a11Key: string, map: Rec = A11_TO_PATTERNS): string | null {
  var german = map[String(a11Key).toLowerCase().trim()];
  return german ? String(german).toLowerCase().trim() : null;
}

// Returns merged patterns progress/exerciseProgress, plus `changed` so the
// caller can skip a state update (and a cloud push) when nothing moved.
export function migrateA11ToPatterns(
  a11Progress: Rec | null | undefined, a11Exercise: Rec | null | undefined,
  patProgress: Rec | null | undefined, patExercise: Rec | null | undefined,
  map: Rec = A11_TO_PATTERNS
) {
  var movedP: Rec = {}, movedE: Rec = {};
  Object.keys(a11Progress || {}).forEach(function(k) {
    var nk = patternsKeyFor(k, map);
    if (nk) movedP = mergeProgress(movedP, {[nk]: a11Progress![k]});
  });
  Object.keys(a11Exercise || {}).forEach(function(k) {
    var nk = patternsKeyFor(k, map);
    if (nk) movedE = mergeExerciseProgress(movedE, {[nk]: a11Exercise![k]});
  });
  var progress = mergeProgress(patProgress || {}, movedP);
  var exerciseProgress = mergeExerciseProgress(patExercise || {}, movedE);
  // Merges rebuild records with their own field order, so compare order-free.
  var changed = stable(progress) !== stable(patProgress || {}) ||
    stable(exerciseProgress) !== stable(patExercise || {});
  return { progress, exerciseProgress, changed };
}

function stable(v: any): string {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).filter(function(k) { return v[k] !== undefined; }).sort()
      .map(function(k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
  }
  return JSON.stringify(v);
}

// Patterns reworded or merged after release (PATTERN_RENAMES): fold the old
// key's progress into the current wording. Same merge rules, so it is just as
// safe to repeat — run it on load and after every cloud pull, because a cloud
// copy written by an older app version still carries the old keys. Old keys
// are left in place (they match no row, so the app ignores them).
export function applyPatternRenames(progress: Rec | null | undefined, exercise: Rec | null | undefined, renames: Rec = PATTERN_RENAMES) {
  return migrateA11ToPatterns(progress, exercise, progress, exercise, renames);
}
