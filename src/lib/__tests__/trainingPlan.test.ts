import { describe, expect, it } from 'vitest';
import { DEFAULT_SKILL_PROFILE } from '../skillProfile';
import { generateTrainingPlan } from '../trainingPlan';
import { summarizeTrainingPace } from '../trainingPace';

describe('generateTrainingPlan', () => {
  it('uses the starter plan when there is no learner evidence', () => {
    const plan = generateTrainingPlan(DEFAULT_SKILL_PROFILE, []);

    expect(plan[0]?.id).toBe('starter-mate-1');
  });

  it('uses adaptive planning for puzzle-only learners', () => {
    const plan = generateTrainingPlan(
      {
        ...DEFAULT_SKILL_PROFILE,
        tactics: 78,
        checkmate_patterns: 82,
      },
      []
    );

    expect(plan.some(exercise => exercise.id.startsWith('starter-'))).toBe(false);
    expect(plan.some(exercise => exercise.id === 'coaching-game')).toBe(true);
  });

  it('prioritizes recurring hanging-piece evidence ahead of the generic queue', () => {
    const plan = generateTrainingPlan(
      {
        ...DEFAULT_SKILL_PROFILE,
        games_analyzed: 6,
        piece_safety: 62,
        tactics: 61,
      },
      [],
      {
        recentHungPieceCount: 3,
        topMistakeTheme: null,
        topMistakeThemeCount: 0,
        weakestPhase: 'middlegame',
      }
    );

    expect(plan[0]?.id).toBe('fix-hanging');
  });

  it('turns recurring fork mistakes into a direct tactical prescription', () => {
    const plan = generateTrainingPlan(
      {
        ...DEFAULT_SKILL_PROFILE,
        games_analyzed: 10,
        tactics: 72,
        checkmate_patterns: 70,
      },
      [],
      {
        recentHungPieceCount: 0,
        topMistakeTheme: 'fork',
        topMistakeThemeCount: 4,
        weakestPhase: 'middlegame',
      }
    );

    expect(plan[0]?.id).toBe('repair-forks');
    expect(plan[0]?.drillSource).toBe('analysis');
    expect(plan[0]?.whyNow).toBeTruthy();
    expect(plan[0]?.successMetric).toBeTruthy();
  });

  it('prioritizes the weakest measured phase instead of following a fixed sequence', () => {
    const plan = generateTrainingPlan(
      {
        ...DEFAULT_SKILL_PROFILE,
        games_analyzed: 12,
        piece_safety: 82,
        tactics: 78,
        checkmate_patterns: 76,
        opening_play: 38,
        endgame_play: 74,
      },
      [],
      {
        recentHungPieceCount: 0,
        topMistakeTheme: null,
        topMistakeThemeCount: 0,
        weakestPhase: 'opening',
      }
    );

    expect(plan[0]?.id).toBe('opening-review');
  });

  it('raises lesson difficulty for users whose recent session pace is strong', () => {
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
        elapsed_ms: 130000,
      },
    ]);

    const plan = generateTrainingPlan(
      {
        ...DEFAULT_SKILL_PROFILE,
        games_analyzed: 10,
        tactics: 72,
        checkmate_patterns: 65,
      },
      [],
      {
        recentHungPieceCount: 0,
        topMistakeTheme: 'fork',
        topMistakeThemeCount: 3,
        weakestPhase: 'middlegame',
      },
      pace
    );

    expect(plan[0]?.id).toBe('repair-forks');
    expect(plan[0]?.difficulty).toBe(3);
    expect(plan[0]?.paceHint).toContain('move faster');
  });

  it('prioritizes due opening reviews when retention evidence says recall is at risk', () => {
    const plan = generateTrainingPlan(
      {
        ...DEFAULT_SKILL_PROFILE,
        games_analyzed: 8,
        piece_safety: 74,
        tactics: 76,
        checkmate_patterns: 72,
        opening_play: 82,
      },
      [],
      {
        recentHungPieceCount: 0,
        topMistakeTheme: null,
        topMistakeThemeCount: 0,
        weakestPhase: null,
      },
      undefined,
      {
        dueReviewCount: 4,
        overdueReviewCount: 2,
        strugglingLineCount: 1,
        focusOpeningId: 'sicilian-defense',
        focusOpeningDueCount: 3,
      }
    );

    expect(plan[0]?.id).toBe('opening-review-due');
    expect(plan[0]?.openingTargetId).toBe('sicilian-defense');
    expect(plan[0]?.openingMode).toBe('review');
  });

  it('prioritizes due tactical reviews over generic new tactics', () => {
    const plan = generateTrainingPlan(
      {
        ...DEFAULT_SKILL_PROFILE,
        games_analyzed: 8,
        tactics: 68,
        checkmate_patterns: 70,
      },
      [],
      {
        recentHungPieceCount: 0,
        topMistakeTheme: null,
        topMistakeThemeCount: 0,
        weakestPhase: null,
      },
      undefined,
      undefined,
      {
        dueTacticsCount: 3,
        dueEndgameCount: 0,
        overdueTacticsCount: 1,
        overdueEndgameCount: 0,
        topDueTacticTheme: 'fork',
        topDueTacticThemeCount: 2,
      }
    );

    expect(plan[0]?.id).toBe('tactics-review-due');
    expect(plan[0]?.drillSource).toBe('review');
  });

  it('schedules a transfer check game after recent study that has not been tested in play', () => {
    const plan = generateTrainingPlan(
      {
        ...DEFAULT_SKILL_PROFILE,
        games_analyzed: 8,
        piece_safety: 85,
        tactics: 84,
        checkmate_patterns: 80,
        opening_play: 83,
        endgame_play: 81,
      },
      [],
      {
        recentHungPieceCount: 0,
        topMistakeTheme: null,
        topMistakeThemeCount: 0,
        weakestPhase: null,
      },
      undefined,
      undefined,
      undefined,
      {
        pendingTransferCheck: true,
        focusModule: 'tactics',
        focusTheme: 'fork',
        focusOpeningId: null,
      }
    );

    expect(plan.some(exercise => exercise.id === 'transfer-check-game')).toBe(true);
  });
});
