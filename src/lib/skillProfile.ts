// Compute and update skill scores from game analysis data

export interface SkillProfile {
  piece_safety: number;
  tactics: number;
  checkmate_patterns: number;
  opening_play: number;
  endgame_play: number;
  games_analyzed: number;
  weakest_area: string;
}

export interface GameAnalysisRow {
  accuracy: number;
  blunders: number;
  mistakes: number;
  hung_pieces: number;
  missed_tactics: { theme: string; cpLoss: number }[];
  phase_accuracy: { opening: number; middlegame: number; endgame: number };
}

export interface PuzzleStatsRow {
  attempts: number;
  solves: number;
  themes: string[];
}

export const DEFAULT_SKILL_PROFILE: SkillProfile = {
  piece_safety: 50,
  tactics: 50,
  checkmate_patterns: 50,
  opening_play: 50,
  endgame_play: 50,
  games_analyzed: 0,
  weakest_area: 'piece_safety',
};

const TACTICAL_THEMES = new Set([
  'fork',
  'pin',
  'skewer',
  'discovered-attack',
  'double-attack',
  'double-check',
  'deflection',
  'zwischenzug',
  'sacrifice',
  'trapped-piece',
]);

const CHECKMATE_THEMES = new Set([
  'mate-in-1',
  'mate-in-2',
  'checkmate',
  'back-rank',
]);

function canonicalTheme(theme: string): string {
  return theme
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-z])(\d)/gi, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function hasAnyTheme(themes: string[], acceptedThemes: Set<string>): boolean {
  return themes.some(theme => acceptedThemes.has(canonicalTheme(theme)));
}

export function computeSkillProfile(
  analyses: GameAnalysisRow[],
  puzzleStats: PuzzleStatsRow[]
): SkillProfile {
  const gamesAnalyzed = analyses.length;
  const hasPuzzleEvidence = puzzleStats.length > 0;

  if (gamesAnalyzed === 0 && !hasPuzzleEvidence) {
    return { ...DEFAULT_SKILL_PROFILE };
  }

  // Piece safety: 100 - (avg hung pieces per game * 15)
  const avgHungPieces = gamesAnalyzed > 0
    ? analyses.reduce((s, a) => s + a.hung_pieces, 0) / gamesAnalyzed
    : 0;
  const pieceSafety = gamesAnalyzed > 0
    ? clamp(100 - avgHungPieces * 15, 0, 100)
    : DEFAULT_SKILL_PROFILE.piece_safety;

  // Tactics: combination of puzzle solve rate + missed tactics rate in games
  const totalMissedTactics = analyses.reduce((s, a) => s + (a.missed_tactics?.length || 0), 0);
  const avgMissedPerGame = gamesAnalyzed > 0 ? totalMissedTactics / gamesAnalyzed : 0;
  let tacticsFromGames = gamesAnalyzed > 0
    ? clamp(100 - avgMissedPerGame * 20, 0, 100)
    : DEFAULT_SKILL_PROFILE.tactics;

  // Factor in puzzle performance
  const tacticalPuzzles = puzzleStats.filter(p =>
    hasAnyTheme(p.themes, TACTICAL_THEMES)
  );
  if (tacticalPuzzles.length > 0) {
    const totalAttempts = tacticalPuzzles.reduce((s, p) => s + p.attempts, 0);
    const totalSolves = tacticalPuzzles.reduce((s, p) => s + p.solves, 0);
    const puzzleSolveRate = totalAttempts > 0 ? (totalSolves / totalAttempts) * 100 : 50;
    tacticsFromGames = tacticsFromGames * 0.6 + puzzleSolveRate * 0.4;
  }
  const tactics = clamp(tacticsFromGames, 0, 100);

  // Checkmate patterns: from puzzle performance on mate themes
  const matePuzzles = puzzleStats.filter(p =>
    hasAnyTheme(p.themes, CHECKMATE_THEMES)
  );
  let checkmatePatterns = DEFAULT_SKILL_PROFILE.checkmate_patterns;
  if (matePuzzles.length > 0) {
    const totalAttempts = matePuzzles.reduce((s, p) => s + p.attempts, 0);
    const totalSolves = matePuzzles.reduce((s, p) => s + p.solves, 0);
    checkmatePatterns = totalAttempts > 0
      ? clamp((totalSolves / totalAttempts) * 100, 0, 100)
      : DEFAULT_SKILL_PROFILE.checkmate_patterns;
  }

  // Opening play: average opening phase accuracy
  const openingAccuracies = analyses
    .filter(a => a.phase_accuracy?.opening != null)
    .map(a => a.phase_accuracy.opening);
  const openingPlay = openingAccuracies.length > 0
    ? clamp(openingAccuracies.reduce((s, v) => s + v, 0) / openingAccuracies.length, 0, 100)
    : DEFAULT_SKILL_PROFILE.opening_play;

  // Endgame play: average endgame phase accuracy
  const endgameAccuracies = analyses
    .filter(a => a.phase_accuracy?.endgame != null)
    .map(a => a.phase_accuracy.endgame);
  const endgamePlay = endgameAccuracies.length > 0
    ? clamp(endgameAccuracies.reduce((s, v) => s + v, 0) / endgameAccuracies.length, 0, 100)
    : DEFAULT_SKILL_PROFILE.endgame_play;

  // Find weakest area
  const skills: Record<string, number> = {
    piece_safety: pieceSafety,
    tactics,
    checkmate_patterns: checkmatePatterns,
    opening_play: openingPlay,
    endgame_play: endgamePlay,
  };

  const weakestArea = Object.entries(skills).reduce(
    (min, [key, val]) => val < min[1] ? [key, val] : min,
    ['piece_safety', Infinity] as [string, number]
  )[0];

  return {
    piece_safety: Math.round(pieceSafety * 10) / 10,
    tactics: Math.round(tactics * 10) / 10,
    checkmate_patterns: Math.round(checkmatePatterns * 10) / 10,
    opening_play: Math.round(openingPlay * 10) / 10,
    endgame_play: Math.round(endgamePlay * 10) / 10,
    games_analyzed: gamesAnalyzed,
    weakest_area: weakestArea,
  };
}

export const SKILL_LABELS: Record<string, string> = {
  piece_safety: 'Piece Safety',
  tactics: 'Tactics',
  checkmate_patterns: 'Checkmate Patterns',
  opening_play: 'Opening Play',
  endgame_play: 'Endgame Play',
};

export const COACHING_MESSAGES: Record<string, string> = {
  piece_safety: "You're leaving pieces undefended — let's fix that!",
  tactics: "You're missing forks and pins — time to practice tactics!",
  checkmate_patterns: "Let's learn some checkmate patterns so you can finish games!",
  opening_play: "Your openings need work — practice your opening lines!",
  endgame_play: "Endgames are tricky — let's practice converting advantages!",
};
