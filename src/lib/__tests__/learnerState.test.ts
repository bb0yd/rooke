import { describe, expect, it } from 'vitest';
import {
  summarizeRetentionSignals,
  summarizeReviewSignals,
  summarizeTrainingSignals,
  summarizeTransferSignals,
} from '../learnerState';

describe('summarizeTrainingSignals', () => {
  it('returns defaults when there are no recent severe moves', () => {
    expect(summarizeTrainingSignals([])).toEqual({
      recentHungPieceCount: 0,
      topMistakeTheme: null,
      topMistakeThemeCount: 0,
      weakestPhase: null,
    });
  });

  it('summarizes recent hanging pieces, themes, and weakest phase', () => {
    const signals = summarizeTrainingSignals([
      { classification: 'blunder', phase: 'opening', is_hung_piece: true, mistake_theme: 'fork', cp_loss: 180 },
      { classification: 'mistake', phase: 'opening', is_hung_piece: true, mistake_theme: 'fork', cp_loss: 120 },
      { classification: 'inaccuracy', phase: 'endgame', is_hung_piece: false, mistake_theme: 'checkmate', cp_loss: 40 },
      { classification: 'best', phase: 'middlegame', is_hung_piece: false, mistake_theme: null, cp_loss: 0 },
    ]);

    expect(signals.recentHungPieceCount).toBe(2);
    expect(signals.topMistakeTheme).toBe('fork');
    expect(signals.topMistakeThemeCount).toBe(2);
    expect(signals.weakestPhase).toBe('opening');
  });
});

describe('summarizeRetentionSignals', () => {
  it('summarizes due and overdue opening reviews', () => {
    const now = new Date('2026-03-07T12:00:00Z').getTime();
    const retention = summarizeRetentionSignals([
      {
        opening_id: 'sicilian-defense',
        attempts: 4,
        clean: 3,
        mistakes: 1,
        next_review: now - 60_000,
      },
      {
        opening_id: 'sicilian-defense',
        attempts: 3,
        clean: 1,
        mistakes: 2,
        next_review: now - 4 * 24 * 60 * 60 * 1000,
      },
      {
        opening_id: 'italian-game',
        attempts: 2,
        clean: 1,
        mistakes: 1,
        next_review: now + 60_000,
      },
    ], now);

    expect(retention.dueReviewCount).toBe(2);
    expect(retention.overdueReviewCount).toBe(1);
    expect(retention.focusOpeningId).toBe('sicilian-defense');
    expect(retention.focusOpeningDueCount).toBe(2);
  });
});

describe('summarizeReviewSignals', () => {
  it('summarizes due tactic and endgame reviews', () => {
    const now = new Date('2026-03-07T12:00:00Z').getTime();
    const review = summarizeReviewSignals([
      { module: 'tactics', theme: 'fork', next_review: now - 60_000 },
      { module: 'tactics', theme: 'fork', next_review: now - 4 * 24 * 60 * 60 * 1000 },
      { module: 'endgame', theme: 'rook-vs-king', next_review: now - 120_000 },
      { module: 'endgame', theme: 'queen-vs-king', next_review: now + 120_000 },
    ], now);

    expect(review.dueTacticsCount).toBe(2);
    expect(review.overdueTacticsCount).toBe(1);
    expect(review.dueEndgameCount).toBe(1);
    expect(review.topDueTacticTheme).toBe('fork');
    expect(review.topDueTacticThemeCount).toBe(2);
  });
});

describe('summarizeTransferSignals', () => {
  it('marks transfer as pending when study happened after the last analyzed game', () => {
    const transfer = summarizeTransferSignals(
      [
        {
          module: 'tactics',
          completed_at: '2026-03-07T12:00:00Z',
          metadata: {
            themes: ['fork'],
          },
        },
      ],
      '2026-03-06T12:00:00Z'
    );

    expect(transfer.pendingTransferCheck).toBe(true);
    expect(transfer.focusModule).toBe('tactics');
    expect(transfer.focusTheme).toBe('fork');
  });
});
