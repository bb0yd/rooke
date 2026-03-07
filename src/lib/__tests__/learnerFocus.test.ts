import { describe, expect, it } from 'vitest';
import { buildLearnerFocuses } from '../learnerFocus';
import { DEFAULT_SKILL_PROFILE } from '../skillProfile';

describe('buildLearnerFocuses', () => {
  it('ranks defensive awareness first when hanging-piece evidence is recurring', () => {
    const focuses = buildLearnerFocuses(
      {
        ...DEFAULT_SKILL_PROFILE,
        games_analyzed: 8,
        piece_safety: 58,
        tactics: 74,
      },
      {
        recentHungPieceCount: 3,
        topMistakeTheme: 'fork',
        topMistakeThemeCount: 2,
        weakestPhase: 'middlegame',
      }
    );

    expect(focuses[0]?.id).toBe('defensive_awareness');
    expect(focuses[0]?.reason).toContain('hanging-piece');
  });

  it('ranks mating vision first when mating chances are repeatedly missed', () => {
    const focuses = buildLearnerFocuses(
      {
        ...DEFAULT_SKILL_PROFILE,
        games_analyzed: 10,
        checkmate_patterns: 42,
        opening_play: 80,
        endgame_play: 78,
      },
      {
        recentHungPieceCount: 0,
        topMistakeTheme: 'back-rank',
        topMistakeThemeCount: 3,
        weakestPhase: 'middlegame',
      }
    );

    expect(focuses[0]?.id).toBe('mating_vision');
    expect(focuses[0]?.reason).toContain('mating');
  });
});
