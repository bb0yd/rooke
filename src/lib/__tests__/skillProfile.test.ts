import { describe, expect, it } from 'vitest';
import { computeSkillProfile, DEFAULT_SKILL_PROFILE } from '../skillProfile';

describe('computeSkillProfile', () => {
  it('returns defaults when there is no learner evidence yet', () => {
    expect(computeSkillProfile([], [])).toEqual(DEFAULT_SKILL_PROFILE);
  });

  it('uses puzzle-only evidence for new learners without analyzed games', () => {
    const profile = computeSkillProfile([], [
      { attempts: 10, solves: 8, themes: ['fork', 'double-attack'] },
      { attempts: 4, solves: 3, themes: ['mate-in-1'] },
    ]);

    expect(profile.games_analyzed).toBe(0);
    expect(profile.tactics).toBeGreaterThan(DEFAULT_SKILL_PROFILE.tactics);
    expect(profile.checkmate_patterns).toBeGreaterThan(DEFAULT_SKILL_PROFILE.checkmate_patterns);
  });

  it('normalizes theme aliases from different puzzle sources', () => {
    const profile = computeSkillProfile([], [
      { attempts: 6, solves: 5, themes: ['discoveredAttack', 'doubleCheck'] },
      { attempts: 5, solves: 4, themes: ['mateIn2', 'back-rank'] },
    ]);

    expect(profile.tactics).toBeGreaterThan(DEFAULT_SKILL_PROFILE.tactics);
    expect(profile.checkmate_patterns).toBeGreaterThan(DEFAULT_SKILL_PROFILE.checkmate_patterns);
  });
});
