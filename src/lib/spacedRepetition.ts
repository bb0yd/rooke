// SM-2 Spaced Repetition Algorithm
// Based on SuperMemo SM-2 by Piotr Wozniak

export interface ReviewResult {
  easeFactor: number;
  intervalDays: number;
  nextReview: number; // timestamp ms
}

/**
 * Calculate next review based on SM-2 algorithm
 * @param quality 0-5 rating (0-2 = fail, 3 = hard, 4 = good, 5 = easy)
 * @param easeFactor current ease factor (minimum 1.3)
 * @param intervalDays current interval in days
 * @returns new ease factor, interval, and next review timestamp
 */
export function calculateNextReview(
  quality: number,
  easeFactor: number,
  intervalDays: number
): ReviewResult {
  // Clamp quality to 0-5
  const q = Math.max(0, Math.min(5, quality));

  let newEf = easeFactor;
  let newInterval: number;

  if (q < 3) {
    // Failed — reset interval
    newInterval = 1;
    // Don't decrease EF on failure
  } else {
    // Successful recall
    newEf = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    newEf = Math.max(1.3, newEf);

    if (intervalDays === 0) {
      newInterval = 1;
    } else if (intervalDays === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intervalDays * newEf);
    }
  }

  const nextReview = Date.now() + newInterval * 24 * 60 * 60 * 1000;

  return {
    easeFactor: Math.round(newEf * 100) / 100,
    intervalDays: newInterval,
    nextReview,
  };
}

/**
 * Convert trainer performance to SM-2 quality rating
 * @param hadMistake whether the line was completed with mistakes
 * @param timeMs time taken in milliseconds (optional)
 * @returns quality rating 0-5
 */
export function performanceToQuality(hadMistake: boolean, timeMs?: number): number {
  if (hadMistake) return 2; // fail
  if (timeMs && timeMs < 5000) return 5; // very fast = easy
  if (timeMs && timeMs < 15000) return 4; // moderate = good
  return 3; // slow but correct = hard
}
