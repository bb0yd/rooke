export type TrainingModule = 'tactics' | 'endgame' | 'practice' | 'openings';

export interface TrainingSessionEvidenceRow {
  module: string;
  difficulty: number | null;
  score: number | null;
  attempts: number | null;
  successes: number | null;
  first_try_successes: number | null;
  hints_used: number | null;
  elapsed_ms: number | null;
}

export interface ModulePacing {
  module: TrainingModule;
  currentDifficulty: number;
  recommendedDifficulty: number;
  mastery: number;
  sampleSize: number;
  reason: string;
}

export interface TrainingPace {
  tactics: ModulePacing;
  endgame: ModulePacing;
  practice: ModulePacing;
  openings: ModulePacing;
}

const MODULES: TrainingModule[] = ['tactics', 'endgame', 'practice', 'openings'];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function defaultReason(module: TrainingModule): string {
  switch (module) {
    case 'tactics':
      return 'Not enough tactic session data yet. Stay at the current pace until the coach sees more reps.';
    case 'endgame':
      return 'Not enough endgame data yet. Keep the current pace until the coach sees more results.';
    case 'practice':
      return 'Not enough coached-game data yet. Keep the current practice pace for now.';
    case 'openings':
      return 'Opening pace will adjust after more opening-specific practice is recorded.';
  }
}

function defaultModulePacing(module: TrainingModule): ModulePacing {
  return {
    module,
    currentDifficulty: 1,
    recommendedDifficulty: 1,
    mastery: 50,
    sampleSize: 0,
    reason: defaultReason(module),
  };
}

export const DEFAULT_TRAINING_PACE: TrainingPace = {
  tactics: defaultModulePacing('tactics'),
  endgame: defaultModulePacing('endgame'),
  practice: defaultModulePacing('practice'),
  openings: defaultModulePacing('openings'),
};

function normalizeDifficulty(difficulty: number | null | undefined): number {
  const value = Number(difficulty) || 1;
  if (value <= 3) {
    return clamp(Math.round(value), 1, 3);
  }
  if (value < 1000) return 1;
  if (value < 1500) return 2;
  return 3;
}

function moduleTargetMs(module: TrainingModule): number {
  switch (module) {
    case 'tactics':
      return 45000;
    case 'endgame':
      return 180000;
    case 'practice':
      return 120000;
    case 'openings':
      return 90000;
  }
}

function buildReason(
  module: TrainingModule,
  mastery: number,
  currentDifficulty: number,
  recommendedDifficulty: number,
  successRate: number,
  firstTryRate: number
): string {
  const moduleLabel = module === 'practice' ? 'coaching games' : module;

  if (recommendedDifficulty > currentDifficulty) {
    return `Recent ${moduleLabel} sessions are landing cleanly enough to move faster. Success rate is ${Math.round(successRate * 100)}% with ${Math.round(firstTryRate * 100)}% first-try conversion.`;
  }

  if (recommendedDifficulty < currentDifficulty) {
    return `Recent ${moduleLabel} sessions are too shaky for this pace. Slow down until accuracy and first-try conversion stabilize.`;
  }

  if (mastery >= 70) {
    return `Current ${moduleLabel} pace fits. Keep this level and prove it over a few more sessions before accelerating.`;
  }

  return `Current ${moduleLabel} pace fits, but the coach still wants cleaner execution before increasing difficulty.`;
}

function summarizeModule(module: TrainingModule, rows: TrainingSessionEvidenceRow[]): ModulePacing {
  if (rows.length === 0) {
    return defaultModulePacing(module);
  }

  const sessionCount = rows.length;
  const totalAttempts = rows.reduce((sum, row) => sum + Math.max(Number(row.attempts) || 0, 1), 0);
  const totalSuccesses = rows.reduce((sum, row) => {
    if (row.successes != null) return sum + (Number(row.successes) || 0);
    if (row.score != null) return sum + ((Number(row.score) || 0) > 0 ? 1 : 0);
    return sum;
  }, 0);
  const totalFirstTry = rows.reduce((sum, row) => sum + (Number(row.first_try_successes) || 0), 0);
  const totalHints = rows.reduce((sum, row) => sum + (Number(row.hints_used) || 0), 0);
  const totalElapsed = rows.reduce((sum, row) => sum + Math.max(Number(row.elapsed_ms) || 0, 0), 0);

  const currentDifficulty = clamp(
    Math.round(rows.reduce((sum, row) => sum + normalizeDifficulty(row.difficulty), 0) / sessionCount),
    1,
    3
  );

  const successRate = totalSuccesses / Math.max(totalAttempts, 1);
  const firstTryRate = totalFirstTry / Math.max(totalSuccesses, 1);
  const hintRate = totalHints / Math.max(totalAttempts, 1);
  const elapsedPerAttempt = totalElapsed > 0 ? totalElapsed / Math.max(totalAttempts, 1) : moduleTargetMs(module);
  const speedScore = clamp(moduleTargetMs(module) / Math.max(elapsedPerAttempt, 1), 0.4, 1.2);
  const normalizedSpeed = (speedScore - 0.4) / 0.8;

  const masteryRaw = (
    successRate * 0.5 +
    firstTryRate * 0.25 +
    (1 - Math.min(hintRate, 1)) * 0.15 +
    normalizedSpeed * 0.1
  );

  const mastery = round1(clamp(masteryRaw * 100, 0, 100));
  let recommendedDifficulty = currentDifficulty;

  if (sessionCount >= 2) {
    if (masteryRaw >= 0.78 && firstTryRate >= 0.55 && hintRate <= 0.2) {
      recommendedDifficulty = Math.min(currentDifficulty + 1, 3);
    } else if (masteryRaw <= 0.45 || successRate < 0.5) {
      recommendedDifficulty = Math.max(currentDifficulty - 1, 1);
    }
  }

  return {
    module,
    currentDifficulty,
    recommendedDifficulty,
    mastery,
    sampleSize: sessionCount,
    reason: buildReason(module, mastery, currentDifficulty, recommendedDifficulty, successRate, firstTryRate),
  };
}

export function summarizeTrainingPace(rows: TrainingSessionEvidenceRow[]): TrainingPace {
  const byModule = new Map<TrainingModule, TrainingSessionEvidenceRow[]>();
  for (const module of MODULES) {
    byModule.set(module, []);
  }

  for (const row of rows) {
    if (row.module === 'tactics' || row.module === 'endgame' || row.module === 'practice' || row.module === 'openings') {
      byModule.get(row.module)?.push(row);
    }
  }

  return {
    tactics: summarizeModule('tactics', byModule.get('tactics') || []),
    endgame: summarizeModule('endgame', byModule.get('endgame') || []),
    practice: summarizeModule('practice', byModule.get('practice') || []),
    openings: summarizeModule('openings', byModule.get('openings') || []),
  };
}

export function recommendedDifficultyForType(
  type: 'tactics' | 'endgame' | 'openings' | 'practice',
  pace: TrainingPace = DEFAULT_TRAINING_PACE
): number {
  return pace[type]?.recommendedDifficulty || 1;
}
