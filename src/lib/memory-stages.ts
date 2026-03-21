// Compute a word's memory stage (1-5) based on confidence + review history
export function getMemoryStage(wordProgress) {
  if (!wordProgress || !wordProgress.learned) return 0; // not learned
  var conf = wordProgress.confidence || 0;
  var reviews = wordProgress.reviews || [];
  var reviewSessions = reviews.filter(function(r) { return r.type === 'review'; });
  var reviewCount = reviewSessions.length;

  // Stage 5: Mastered — confidence 4 AND completed all 4 review intervals
  if (conf >= 4 && reviewCount >= 4) return 5;

  // Stage 4: Strong — confidence 3-4 AND completed 3+ review intervals
  if (conf >= 3 && reviewCount >= 3) return 4;

  // Stage 3: Practicing — confidence 3+ OR completed 2+ reviews
  if (conf >= 3 || reviewCount >= 2) return 3;

  // Stage 2: Familiar — confidence 2+ OR completed at least 1 review
  if (conf >= 2 || reviewCount >= 1) return 2;

  // Stage 1: New — just learned, low confidence, no reviews yet
  return 1;
}
