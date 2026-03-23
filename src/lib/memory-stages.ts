// Compute a word's memory stage (1-5) based on review history + exercise performance
// Based on Leitner System + Ebbinghaus Forgetting Curve research
//
// Stage movement rules:
// - "No idea" (1) or "Partial" (2) on review → drop to Stage 1
// - "Slow" (3) on review → stay or move up 1 if enough reviews
// - "Instant" (4) on review → move up 1 stage
// - Exercise correct → counts as 0.5 review credit
// - Exercise wrong → no penalty (exercises are low-stakes practice)
//
// Stage thresholds (cumulative successful reviews needed):
// Stage 1 → 2: 1 successful review (conf >= 3)
// Stage 2 → 3: 2 successful reviews
// Stage 3 → 4: 4 successful reviews
// Stage 4 → 5: 6 successful reviews + most recent conf = 4

export function getMemoryStage(wordProgress: any): number {
  if (!wordProgress || !wordProgress.learned) return 0;

  var reviews = wordProgress.reviews || [];
  if (reviews.length === 0) return 1;

  // Check if the most recent review was a failure (conf 1-2)
  var recentReviews = reviews.slice().reverse();
  var lastReview = recentReviews[0];

  // If last review was "No idea" or "Partial", drop to stage 1
  if (lastReview && lastReview.conf <= 2 && (lastReview.type === 'review' || lastReview.type === 'learn')) {
    return 1;
  }

  // Count successful reviews (conf >= 3) from flashcard sessions
  var successfulReviews = 0;
  reviews.forEach(function(r: any) {
    if ((r.type === 'review' || r.type === 'learn') && r.conf >= 3) {
      successfulReviews++;
    }
  });

  // Count exercise credits (each correct exercise = 0.5 review credit)
  var exerciseCorrect = wordProgress.exerciseCorrect || 0;
  var exerciseCredit = Math.floor(exerciseCorrect / 2); // 2 correct exercises = 1 review credit
  var totalCredits = successfulReviews + exerciseCredit;

  // Most recent confidence from any review
  var lastConf = lastReview ? lastReview.conf : 0;

  // Stage 5: Mastered — 6+ credits AND last confidence = 4 (Instant)
  if (totalCredits >= 6 && lastConf >= 4) return 5;

  // Stage 4: Strong — 4+ credits AND last confidence >= 3
  if (totalCredits >= 4 && lastConf >= 3) return 4;

  // Stage 3: Practicing — 2+ credits
  if (totalCredits >= 2) return 3;

  // Stage 2: Familiar — 1+ credits
  if (totalCredits >= 1) return 2;

  // Stage 1: New
  return 1;
}

// Get the review interval in days for a given stage
export function getReviewInterval(stage: number): number {
  var intervals = [0, 1, 3, 7, 14, 30]; // stage 0-5
  return intervals[stage] || 1;
}

// Check if a word is due for review based on its stage and last review date
export function isWordDueForReview(wordProgress: any, today: string): boolean {
  if (!wordProgress || !wordProgress.learned) return false;
  if (!wordProgress.lastReview) return true; // never reviewed = due

  var stage = getMemoryStage(wordProgress);
  if (stage === 0) return false;

  var interval = getReviewInterval(stage);
  var lastDate = new Date(wordProgress.lastReview);
  var todayDate = new Date(today);
  var daysSince = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);

  return daysSince >= interval;
}
