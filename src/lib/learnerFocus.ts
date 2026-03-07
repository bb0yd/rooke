import { SkillProfile } from './skillProfile';
import { DEFAULT_TRAINING_SIGNALS, TrainingSignals } from './trainingSignals';

export type FocusAreaId =
  | 'defensive_awareness'
  | 'calculation_discipline'
  | 'mating_vision'
  | 'opening_discipline'
  | 'endgame_conversion';

export interface FocusArea {
  id: FocusAreaId;
  label: string;
  score: number;
  urgency: number;
  reason: string;
}

const TACTICAL_THEMES = new Set([
  'fork',
  'pin',
  'skewer',
  'double-attack',
  'discovered-attack',
  'winning-capture',
  'zwischenzug',
  'deflection',
]);

const MATE_THEMES = new Set([
  'checkmate',
  'back-rank',
  'mate-in-1',
  'mate-in-2',
  'check',
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function canonicalTheme(theme: string | null | undefined): string | null {
  if (!theme) return null;
  return theme
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildReason(id: FocusAreaId, profile: SkillProfile, signals: TrainingSignals, theme: string | null): string {
  switch (id) {
    case 'defensive_awareness':
      if (signals.recentHungPieceCount >= 2) {
        return `Recent analysis found ${signals.recentHungPieceCount} hanging-piece blunders.`;
      }
      return profile.piece_safety < 65
        ? 'Too many moves are leaving pieces loose or undefended.'
        : 'Keep checking loose pieces before committing to a move.';
    case 'calculation_discipline':
      if (theme && TACTICAL_THEMES.has(theme)) {
        return `Recent ${theme.replace(/-/g, ' ')} misses are repeating in your own games.`;
      }
      return profile.tactics < 65
        ? 'Your move selection still misses tactical consequences too often.'
        : 'Go one move deeper before you commit to forcing lines.';
    case 'mating_vision':
      if (theme && MATE_THEMES.has(theme)) {
        return 'Winning mating patterns were available and not converted.';
      }
      return profile.checkmate_patterns < 65
        ? 'You need faster recognition of direct mating ideas.'
        : 'Keep sharpening finishing patterns so wins do not slip.';
    case 'opening_discipline':
      if (signals.weakestPhase === 'opening') {
        return 'The first 10 moves are losing the most value right now.';
      }
      return 'Your early move choices need more structure and consistency.';
    case 'endgame_conversion':
      if (signals.weakestPhase === 'endgame') {
        return 'Recent endgames are converting the worst of any phase.';
      }
      return 'Winning or equal endgames are not being converted cleanly enough.';
  }
}

export function buildLearnerFocuses(
  profile: SkillProfile,
  signals: TrainingSignals = DEFAULT_TRAINING_SIGNALS
): FocusArea[] {
  const normalizedTheme = canonicalTheme(signals.topMistakeTheme);
  const tacticalTheme = normalizedTheme ? TACTICAL_THEMES.has(normalizedTheme) : false;
  const mateTheme = normalizedTheme ? MATE_THEMES.has(normalizedTheme) : false;

  const defensiveScore = clamp(
    profile.piece_safety
      - Math.min(signals.recentHungPieceCount * 12, 36)
      - (normalizedTheme === 'winning-capture' ? 6 : 0),
    0,
    100
  );

  const calculationScore = clamp(
    profile.tactics
      - (tacticalTheme ? Math.min(signals.topMistakeThemeCount * 7, 28) : 0)
      - (signals.weakestPhase === 'middlegame' ? 6 : 0),
    0,
    100
  );

  const matingScore = clamp(
    profile.checkmate_patterns
      - (mateTheme ? Math.min(signals.topMistakeThemeCount * 9, 27) : 0),
    0,
    100
  );

  const openingScore = clamp(
    profile.opening_play - (signals.weakestPhase === 'opening' ? 10 : 0),
    0,
    100
  );

  const endgameScore = clamp(
    profile.endgame_play - (signals.weakestPhase === 'endgame' ? 10 : 0),
    0,
    100
  );

  const areas: Array<{ id: FocusAreaId; label: string; score: number; evidenceBoost: number }> = [
    {
      id: 'defensive_awareness',
      label: 'Defensive Awareness',
      score: defensiveScore,
      evidenceBoost: signals.recentHungPieceCount >= 2 ? 8 : 0,
    },
    {
      id: 'calculation_discipline',
      label: 'Calculation Discipline',
      score: calculationScore,
      evidenceBoost: tacticalTheme ? Math.min(signals.topMistakeThemeCount * 2, 10) : 0,
    },
    {
      id: 'mating_vision',
      label: 'Mating Vision',
      score: matingScore,
      evidenceBoost: mateTheme ? Math.min(signals.topMistakeThemeCount * 3, 12) : 0,
    },
    {
      id: 'opening_discipline',
      label: 'Opening Discipline',
      score: openingScore,
      evidenceBoost: signals.weakestPhase === 'opening' ? 8 : 0,
    },
    {
      id: 'endgame_conversion',
      label: 'Endgame Conversion',
      score: endgameScore,
      evidenceBoost: signals.weakestPhase === 'endgame' ? 8 : 0,
    },
  ];

  return areas
    .map(area => ({
      id: area.id,
      label: area.label,
      score: round1(area.score),
      urgency: round1(clamp((100 - area.score) + area.evidenceBoost, 0, 100)),
      reason: buildReason(area.id, profile, signals, normalizedTheme),
    }))
    .sort((a, b) => b.urgency - a.urgency);
}
