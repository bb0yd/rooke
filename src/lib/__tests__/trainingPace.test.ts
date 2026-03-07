import { describe, expect, it } from 'vitest';
import { summarizeTrainingPace } from '../trainingPace';

describe('summarizeTrainingPace', () => {
  it('accelerates tactics difficulty for users who solve quickly and cleanly', () => {
    const pace = summarizeTrainingPace([
      {
        module: 'tactics',
        difficulty: 2,
        score: 1,
        attempts: 5,
        successes: 5,
        first_try_successes: 4,
        hints_used: 0,
        elapsed_ms: 120000,
      },
      {
        module: 'tactics',
        difficulty: 2,
        score: 1,
        attempts: 5,
        successes: 5,
        first_try_successes: 5,
        hints_used: 0,
        elapsed_ms: 135000,
      },
    ]);

    expect(pace.tactics.recommendedDifficulty).toBe(3);
    expect(pace.tactics.reason).toContain('move faster');
  });

  it('downshifts endgame difficulty when recent results are unstable', () => {
    const pace = summarizeTrainingPace([
      {
        module: 'endgame',
        difficulty: 3,
        score: 0,
        attempts: 4,
        successes: 1,
        first_try_successes: 0,
        hints_used: 2,
        elapsed_ms: 900000,
      },
      {
        module: 'endgame',
        difficulty: 3,
        score: 0.25,
        attempts: 4,
        successes: 1,
        first_try_successes: 0,
        hints_used: 1,
        elapsed_ms: 780000,
      },
    ]);

    expect(pace.endgame.recommendedDifficulty).toBe(2);
    expect(pace.endgame.reason).toContain('Slow down');
  });
});
