import { calculateNextReview } from './spacedRepetition';

export interface TrainingReviewState {
  easeFactor: number;
  intervalDays: number;
  nextReview: number;
  attempts: number;
  successes: number;
}

export interface TrainingReviewUpdateInput {
  score: number;
  elapsedMs?: number;
  hintsUsed?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function trainingReviewQuality({ score, elapsedMs, hintsUsed }: TrainingReviewUpdateInput): number {
  const normalizedScore = clamp(score, 0, 1);
  const safeHints = Math.max(hintsUsed || 0, 0);

  if (normalizedScore < 0.45) return 2;
  if (normalizedScore < 0.7) return 3;
  if (safeHints > 0) return 3;
  if (elapsedMs && elapsedMs < 30000) return 5;
  if (elapsedMs && elapsedMs < 90000) return 4;
  return 4;
}

export function nextTrainingReview(
  current: Pick<TrainingReviewState, 'easeFactor' | 'intervalDays'> | null,
  input: TrainingReviewUpdateInput
) {
  const quality = trainingReviewQuality(input);
  return calculateNextReview(
    quality,
    current?.easeFactor ?? 2.5,
    current?.intervalDays ?? 0
  );
}
