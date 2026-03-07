export interface TrainingSessionSummary {
  score?: number;
  attempts?: number;
  successes?: number;
  firstTrySuccesses?: number;
  hintsUsed?: number;
  elapsedMs?: number;
  metadata?: Record<string, unknown>;
}
