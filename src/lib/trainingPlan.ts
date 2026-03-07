// Generate a short ranked queue of exercises based on current learner evidence.
// The coach should prescribe the highest-value lesson, not dump a long menu.

import { buildLearnerFocuses, FocusArea, FocusAreaId } from './learnerFocus';
import { DEFAULT_RETENTION_SIGNALS, RetentionSignals } from './retentionSignals';
import { DEFAULT_REVIEW_SIGNALS, ReviewSignals } from './reviewSignals';
import { DEFAULT_SKILL_PROFILE, SkillProfile } from './skillProfile';
import { DEFAULT_TRAINING_SIGNALS, TrainingSignals } from './trainingSignals';
import { DEFAULT_TRAINING_PACE, recommendedDifficultyForType, TrainingPace } from './trainingPace';
import { DEFAULT_TRANSFER_SIGNALS, TransferSignals } from './transferSignals';

export interface Exercise {
  id: string;
  type: 'tactics' | 'endgame' | 'openings' | 'practice';
  title: string;
  coachSays: string;
  themes?: string[];
  drillSource?: 'library' | 'analysis' | 'review';
  analysisTheme?: string;
  endgameReviewMode?: boolean;
  openingTargetId?: string;
  openingMode?: 'sequential' | 'random' | 'weakspots' | 'review';
  difficulty: number;
  estimatedMinutes: number;
  whyNow?: string;
  successMetric?: string;
  paceHint?: string;
  targetFocusAreas?: FocusAreaId[];
  priority?: number;
}

interface ExerciseCandidate extends Exercise {
  baseGain: number;
  condition?: (
    profile: SkillProfile,
    signals: TrainingSignals,
    focuses: FocusArea[],
    retention: RetentionSignals,
    review: ReviewSignals,
    transfer: TransferSignals
  ) => boolean;
  evidenceBonus?: (
    profile: SkillProfile,
    signals: TrainingSignals,
    focuses: FocusArea[],
    retention: RetentionSignals,
    review: ReviewSignals,
    transfer: TransferSignals
  ) => number;
}

function canonicalTheme(theme: string | null | undefined): string | null {
  if (!theme) return null;
  return theme
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function focusReason(focuses: FocusArea[], ids: FocusAreaId[] = []): string | undefined {
  const ranked = focuses
    .filter(focus => ids.includes(focus.id))
    .sort((a, b) => b.urgency - a.urgency);

  return ranked[0]?.reason;
}

function scoreExercise(
  candidate: ExerciseCandidate,
  profile: SkillProfile,
  signals: TrainingSignals,
  focuses: FocusArea[],
  retention: RetentionSignals,
  review: ReviewSignals,
  transfer: TransferSignals
): number {
  const targetUrgencies = focuses
    .filter(focus => candidate.targetFocusAreas?.includes(focus.id))
    .map(focus => focus.urgency);

  const averageUrgency = targetUrgencies.length > 0
    ? targetUrgencies.reduce((sum, value) => sum + value, 0) / targetUrgencies.length
    : 0;

  const expectedGain = candidate.baseGain +
    averageUrgency +
    (candidate.evidenceBonus?.(profile, signals, focuses, retention, review, transfer) || 0);

  return Math.round((expectedGain / Math.max(candidate.estimatedMinutes, 1)) * 10) / 10;
}

function finalizeExercise(
  candidate: ExerciseCandidate,
  priority: number,
  focuses: FocusArea[],
  pace: TrainingPace
): Exercise {
  const modulePacing = pace[candidate.type];
  return {
    ...candidate,
    difficulty: recommendedDifficultyForType(candidate.type, pace),
    whyNow: candidate.whyNow || focusReason(focuses, candidate.targetFocusAreas) || candidate.coachSays,
    paceHint: modulePacing.sampleSize > 0 ? modulePacing.reason : undefined,
    priority,
  };
}

function exerciseForMistakeTheme(
  theme: string | null,
  count: number
): ExerciseCandidate | null {
  const normalizedTheme = canonicalTheme(theme);
  if (!normalizedTheme || count <= 0) return null;

  const common = {
    type: 'tactics' as const,
    drillSource: 'analysis' as const,
    analysisTheme: normalizedTheme,
    difficulty: 1,
    estimatedMinutes: 5,
    targetFocusAreas: ['calculation_discipline'] as FocusAreaId[],
  };

  switch (normalizedTheme) {
    case 'fork':
      return {
        id: 'repair-forks',
        title: 'Repair Recent Forks',
        coachSays: "Forks keep appearing in your own games. Let's repair those exact positions first.",
        themes: ['fork'],
        whyNow: 'Recent games keep repeating the same fork pattern.',
        successMetric: 'Solve your recent fork positions cleanly without guessing.',
        baseGain: 48,
        evidenceBonus: () => count * 12,
        ...common,
      };
    case 'pin':
      return {
        id: 'repair-pins',
        title: 'Repair Recent Pins',
        coachSays: "Pins are costing you in your own games. Let's go back to those exact positions.",
        themes: ['pin'],
        whyNow: 'Pinned-piece mistakes are repeating in real games, so the fastest fix is direct repair.',
        successMetric: 'Find the best move in your recent pin positions before moving on.',
        baseGain: 48,
        evidenceBonus: () => count * 12,
        ...common,
      };
    case 'skewer':
      return {
        id: 'repair-skewers',
        title: 'Repair Recent Skewers',
        coachSays: "Skewer opportunities and defenses are slipping by in your own games. Let's drill those exact moments.",
        themes: ['skewer'],
        whyNow: 'These are not abstract puzzles. They are positions you already misplayed.',
        successMetric: 'Convert the recent skewer positions in one try.',
        baseGain: 46,
        evidenceBonus: () => count * 11,
        ...common,
      };
    case 'double-attack':
      return {
        id: 'repair-double-attacks',
        title: 'Repair Double Attacks',
        coachSays: "Double attacks are showing up in your analyzed games. Let's revisit those exact positions.",
        themes: ['double-attack', 'fork'],
        whyNow: 'Recent double-attack misses are leaking material immediately.',
        successMetric: 'Spot the forcing double attacks from your own games.',
        baseGain: 46,
        evidenceBonus: () => count * 11,
        ...common,
      };
    case 'discovered-attack':
      return {
        id: 'repair-discovered-attacks',
        title: 'Repair Discovered Attacks',
        coachSays: "Discovered attacks are a recurring blind spot in your own games. Let's fix that on the real positions.",
        themes: ['discovered-attack'],
        whyNow: 'The same discovered-attack pattern is repeating often enough to deserve direct repair.',
        successMetric: 'Find the discovered attack in each recent missed position.',
        baseGain: 46,
        evidenceBonus: () => count * 11,
        ...common,
      };
    case 'winning-capture':
      return {
        id: 'repair-winning-captures',
        title: 'Repair Winning Captures',
        coachSays: "You missed clean winning captures in your own games. Let's revisit those exact tactical moments.",
        themes: ['fork', 'pin', 'skewer'],
        whyNow: 'Free material was available and not taken. That is one of the cheapest gains to recover.',
        successMetric: 'Convert each recent winning capture without a second try.',
        baseGain: 44,
        evidenceBonus: () => count * 10,
        ...common,
      };
    case 'checkmate':
    case 'back-rank':
    case 'check':
      return {
        id: 'repair-mates',
        title: 'Repair Mating Patterns',
        coachSays: "Your recent games show missed mating ideas. Let's go back to the exact finishing positions you missed.",
        themes: ['mate-in-1', 'back-rank'],
        whyNow: 'Recent games had direct mating patterns available and they were missed.',
        successMetric: 'Finish the mating positions from your own games in one move.',
        baseGain: 50,
        evidenceBonus: () => count * 12,
        targetFocusAreas: ['mating_vision'],
        type: 'tactics',
        drillSource: 'analysis',
        analysisTheme: normalizedTheme,
        difficulty: 1,
        estimatedMinutes: 5,
      };
    default:
      return null;
  }
}

const STARTER_PLAN: Exercise[] = [
  {
    id: 'starter-mate-1',
    type: 'tactics',
    title: 'Mate in 1',
    coachSays: "Let's start with the basics. Can you spot checkmate in one move?",
    themes: ['mate-in-1'],
    difficulty: 1,
    estimatedMinutes: 5,
    whyNow: 'You do not have enough game or puzzle evidence yet, so the coach starts with the core patterns.',
    successMetric: 'Solve five mate-in-one positions without hints.',
    targetFocusAreas: ['mating_vision'],
  },
  {
    id: 'starter-endgame',
    type: 'endgame',
    title: 'Queen vs King',
    coachSays: "Now learn how to checkmate with a queen. This is a must-know pattern.",
    difficulty: 1,
    estimatedMinutes: 10,
    whyNow: 'Basic conversion patterns unlock a lot of early wins.',
    successMetric: 'Finish three queen-vs-king checkmates.',
    targetFocusAreas: ['mating_vision', 'endgame_conversion'],
  },
  {
    id: 'starter-practice',
    type: 'practice',
    title: 'Coaching Game',
    coachSays: "Time to play a real game. I'll watch and tell you if you're about to make a big mistake.",
    difficulty: 1,
    estimatedMinutes: 15,
    whyNow: 'The coach needs real game evidence before it can personalize harder.',
    successMetric: 'Complete one full coaching game.',
    targetFocusAreas: ['defensive_awareness', 'calculation_discipline'],
  },
  {
    id: 'starter-forks',
    type: 'tactics',
    title: 'Find the Fork',
    coachSays: "A fork attacks two pieces at once. Let's practice finding them.",
    themes: ['fork'],
    difficulty: 1,
    estimatedMinutes: 5,
    whyNow: 'Forks are one of the fastest tactical wins to learn early.',
    successMetric: 'Solve five fork puzzles with no more than one miss.',
    targetFocusAreas: ['calculation_discipline'],
  },
  {
    id: 'starter-rook-mate',
    type: 'endgame',
    title: 'Two Rooks vs King',
    coachSays: "The ladder mate is a classic pattern to learn.",
    difficulty: 1,
    estimatedMinutes: 10,
    whyNow: 'This teaches technique and control, not just pattern recall.',
    successMetric: 'Complete three ladder mates.',
    targetFocusAreas: ['mating_vision', 'endgame_conversion'],
  },
];

function adaptiveCandidates(
  profile: SkillProfile,
  signals: TrainingSignals,
  focuses: FocusArea[],
  retention: RetentionSignals,
  review: ReviewSignals,
  transfer: TransferSignals
): ExerciseCandidate[] {
  const candidates: ExerciseCandidate[] = [];

  if (retention.dueReviewCount > 0) {
    candidates.push({
      id: 'opening-review-due',
      type: 'openings',
      title: 'Review Due Opening Lines',
      coachSays: `${retention.dueReviewCount} opening line${retention.dueReviewCount === 1 ? ' is' : 's are'} due for review. Re-test them before they decay.`,
      openingTargetId: retention.focusOpeningId || undefined,
      openingMode: 'review',
      difficulty: 1,
      estimatedMinutes: 10,
      whyNow: retention.overdueReviewCount > 0
        ? `${retention.overdueReviewCount} opening line${retention.overdueReviewCount === 1 ? ' is' : 's are'} overdue, so recall needs to be checked now.`
        : 'These lines are scheduled for spaced review now, which is how recall turns into retention.',
      successMetric: 'Complete the due opening review set with minimal mistakes.',
      targetFocusAreas: ['opening_discipline'],
      baseGain: 44,
      condition: () => true,
      evidenceBonus: () => retention.dueReviewCount * 8 + retention.overdueReviewCount * 12,
    });
  }

  if (review.dueTacticsCount > 0) {
    candidates.push({
      id: 'tactics-review-due',
      type: 'tactics',
      title: 'Review Due Tactical Patterns',
      coachSays: `${review.dueTacticsCount} tactic${review.dueTacticsCount === 1 ? ' is' : 's are'} due for review. Re-test them before the pattern fades.`,
      drillSource: 'review',
      themes: review.topDueTacticTheme ? [review.topDueTacticTheme] : undefined,
      difficulty: 1,
      estimatedMinutes: 8,
      whyNow: review.overdueTacticsCount > 0
        ? `${review.overdueTacticsCount} tactic review${review.overdueTacticsCount === 1 ? ' is' : 's are'} overdue.`
        : 'These tactical patterns are due for spaced review now.',
      successMetric: 'Solve the due tactical review set with strong first-try conversion.',
      targetFocusAreas: ['calculation_discipline'],
      baseGain: 42,
      condition: () => true,
      evidenceBonus: () => review.dueTacticsCount * 7 + review.overdueTacticsCount * 10,
    });
  }

  if (review.dueEndgameCount > 0) {
    candidates.push({
      id: 'endgame-review-due',
      type: 'endgame',
      title: 'Review Due Endgames',
      coachSays: `${review.dueEndgameCount} endgame position${review.dueEndgameCount === 1 ? ' is' : 's are'} due for review. Re-convert them now.`,
      endgameReviewMode: true,
      difficulty: 1,
      estimatedMinutes: 10,
      whyNow: review.overdueEndgameCount > 0
        ? `${review.overdueEndgameCount} endgame review${review.overdueEndgameCount === 1 ? ' is' : 's are'} overdue.`
        : 'Scheduled endgame reviews are due now, which is how technique sticks.',
      successMetric: 'Convert the due endgames without repeated retries.',
      targetFocusAreas: ['endgame_conversion'],
      baseGain: 40,
      condition: () => true,
      evidenceBonus: () => review.dueEndgameCount * 7 + review.overdueEndgameCount * 10,
    });
  }

  if (transfer.pendingTransferCheck) {
    candidates.push({
      id: 'transfer-check-game',
      type: 'practice',
      title: 'Transfer Check Game',
      coachSays: 'You studied recently. Now prove it in play before the coach moves on.',
      difficulty: 1,
      estimatedMinutes: 15,
      whyNow: transfer.focusModule === 'openings'
        ? 'Your last studied opening work has not been tested in a real analyzed game yet.'
        : 'Recent training has not been checked in game play yet, so transfer is still unproven.',
      successMetric: 'Complete one coaching game after the recent study block and avoid repeating that pattern.',
      targetFocusAreas: ['defensive_awareness', 'calculation_discipline', 'opening_discipline', 'endgame_conversion'],
      baseGain: 38,
      condition: () => true,
      evidenceBonus: () => 18,
    });
  }

  const baseCandidates: ExerciseCandidate[] = [
    {
      id: 'fix-hanging',
      type: 'practice',
      title: 'Stop Hanging Pieces',
      coachSays: "Your recent analyzed games include hanging-piece blunders. Let's stop that leak first.",
      difficulty: 1,
      estimatedMinutes: 10,
      whyNow: 'Free piece losses are the most urgent leak to close because they make every other skill matter less.',
      successMetric: 'Finish a coaching game without hanging a piece.',
      targetFocusAreas: ['defensive_awareness'],
      baseGain: 36,
      condition: (currentProfile: SkillProfile) => currentProfile.piece_safety < 72 || signals.recentHungPieceCount > 0,
      evidenceBonus: () => signals.recentHungPieceCount * 18,
    },
    {
      id: 'learn-mates',
      type: 'tactics',
      title: 'Checkmate Patterns',
      coachSays: "You need to recognize checkmate when it's there. Let's drill mate-in-one puzzles.",
      themes: ['mate-in-1'],
      difficulty: 1,
      estimatedMinutes: 5,
      successMetric: 'Solve five mate-in-one puzzles cleanly.',
      targetFocusAreas: ['mating_vision'],
      baseGain: 34,
      condition: (currentProfile: SkillProfile) => currentProfile.checkmate_patterns < 60,
      evidenceBonus: () => canonicalTheme(signals.topMistakeTheme) === 'checkmate' ? 16 : 0,
    },
    {
      id: 'endgame-mates',
      type: 'endgame',
      title: 'Basic Checkmates',
      coachSays: "Can you checkmate with just a queen? Let's make sure. This comes up in real games.",
      difficulty: 1,
      estimatedMinutes: 10,
      successMetric: 'Convert three basic checkmating endgames.',
      targetFocusAreas: ['mating_vision', 'endgame_conversion'],
      baseGain: 30,
      condition: (currentProfile: SkillProfile) => currentProfile.checkmate_patterns < 50 || currentProfile.endgame_play < 55,
      evidenceBonus: () => signals.weakestPhase === 'endgame' ? 8 : 0,
    },
    {
      id: 'tactics-forks',
      type: 'tactics',
      title: 'Forks',
      coachSays: "You're still missing basic forks. Let's sharpen that pattern first.",
      themes: ['fork'],
      difficulty: 1,
      estimatedMinutes: 5,
      successMetric: 'Solve five fork positions without rushing.',
      targetFocusAreas: ['calculation_discipline'],
      baseGain: 32,
      condition: (currentProfile: SkillProfile) => currentProfile.tactics < 50,
      evidenceBonus: () => canonicalTheme(signals.topMistakeTheme) === 'fork' ? 12 : 0,
    },
    {
      id: 'tactics-pins',
      type: 'tactics',
      title: 'Pins',
      coachSays: "Pins are still slipping through. Let's work that pattern directly.",
      themes: ['pin'],
      difficulty: 1,
      estimatedMinutes: 5,
      successMetric: 'Solve five pin positions without missing the tactic.',
      targetFocusAreas: ['calculation_discipline'],
      baseGain: 32,
      condition: (currentProfile: SkillProfile) => currentProfile.tactics < 50,
      evidenceBonus: () => canonicalTheme(signals.topMistakeTheme) === 'pin' ? 12 : 0,
    },
    {
      id: 'tactics-mixed',
      type: 'tactics',
      title: 'Tactical Puzzles',
      coachSays: "Your tactical eye needs steady reps. Let's train a mixed tactical set.",
      themes: ['fork', 'pin', 'skewer', 'back-rank'],
      difficulty: 2,
      estimatedMinutes: 10,
      successMetric: 'Solve a mixed set with at least 4 correct out of 5.',
      targetFocusAreas: ['calculation_discipline'],
      baseGain: 28,
      condition: (currentProfile: SkillProfile) => currentProfile.tactics < 80 || focuses[0]?.id === 'calculation_discipline',
      evidenceBonus: () => {
        const theme = canonicalTheme(signals.topMistakeTheme);
        return theme && ['fork', 'pin', 'skewer', 'double-attack', 'discovered-attack'].includes(theme)
          ? signals.topMistakeThemeCount * 5
          : 0;
      },
    },
    {
      id: 'mate-in-2',
      type: 'tactics',
      title: 'Mate in 2',
      coachSays: "You can spot simple mates. Now think one move deeper.",
      themes: ['mate-in-2'],
      difficulty: 2,
      estimatedMinutes: 10,
      successMetric: 'Complete a mate-in-two set with deliberate calculation.',
      targetFocusAreas: ['mating_vision', 'calculation_discipline'],
      baseGain: 28,
      condition: (currentProfile: SkillProfile) => currentProfile.checkmate_patterns >= 40 && currentProfile.checkmate_patterns < 80,
      evidenceBonus: () => {
        const theme = canonicalTheme(signals.topMistakeTheme);
        return theme && ['checkmate', 'back-rank', 'check'].includes(theme) ? 10 : 0;
      },
    },
    {
      id: 'endgame-training',
      type: 'endgame',
      title: 'Endgame Practice',
      coachSays: "Your endgames are leaking value. Let's practice converting winning positions.",
      difficulty: 1,
      estimatedMinutes: 10,
      successMetric: 'Convert three endgames against the engine.',
      targetFocusAreas: ['endgame_conversion'],
      baseGain: 32,
      condition: (currentProfile: SkillProfile) => currentProfile.endgame_play < 80 || signals.weakestPhase === 'endgame',
      evidenceBonus: () => signals.weakestPhase === 'endgame' ? 12 : 0,
    },
    {
      id: 'opening-review',
      type: 'openings',
      title: 'Opening Review',
      coachSays: "Your first 10 moves are costing you too much. Let's clean up the opening phase.",
      difficulty: 1,
      estimatedMinutes: 10,
      successMetric: 'Review a focused opening block and then play it in your next game.',
      targetFocusAreas: ['opening_discipline'],
      baseGain: 30,
      openingTargetId: retention.focusOpeningId || undefined,
      openingMode: retention.dueReviewCount > 0 ? 'review' : 'sequential',
      condition: (
        currentProfile: SkillProfile,
        currentSignals: TrainingSignals,
        _focuses: FocusArea[],
        currentRetention: RetentionSignals
      ) =>
        currentProfile.opening_play < 80 ||
        currentSignals.weakestPhase === 'opening' ||
        currentRetention.dueReviewCount > 0,
      evidenceBonus: (
        _profile: SkillProfile,
        currentSignals: TrainingSignals,
        _focuses: FocusArea[],
        currentRetention: RetentionSignals
      ) =>
        (currentSignals.weakestPhase === 'opening' ? 12 : 0) +
        currentRetention.dueReviewCount * 4 +
        currentRetention.overdueReviewCount * 6,
    },
    {
      id: 'coaching-game',
      type: 'practice',
      title: 'Coaching Game',
      coachSays: "Now test the current lesson in a real game with live coaching turned on.",
      difficulty: 1,
      estimatedMinutes: 15,
      whyNow: 'Transfer matters. You should prove the drilled pattern shows up in play, not only in exercises.',
      successMetric: 'Complete one coaching game and avoid repeating the current focus mistake.',
      targetFocusAreas: ['defensive_awareness', 'calculation_discipline', 'opening_discipline', 'endgame_conversion'],
      baseGain: 22,
      condition: () => true,
      evidenceBonus: () => 4,
    },
  ];

  candidates.push(...baseCandidates);

  const repairExercise = exerciseForMistakeTheme(signals.topMistakeTheme, signals.topMistakeThemeCount);
  if (repairExercise) {
    candidates.unshift(repairExercise);
  }

  return candidates.filter(candidate => candidate.condition?.(profile, signals, focuses, retention, review, transfer) ?? true);
}

export function generateTrainingPlan(
  profile: SkillProfile,
  completedToday: string[],
  signals: TrainingSignals = DEFAULT_TRAINING_SIGNALS,
  pace: TrainingPace = DEFAULT_TRAINING_PACE,
  retention: RetentionSignals = DEFAULT_RETENTION_SIGNALS,
  review: ReviewSignals = DEFAULT_REVIEW_SIGNALS,
  transfer: TransferSignals = DEFAULT_TRANSFER_SIGNALS
): Exercise[] {
  const hasAdaptiveSignal = profile.games_analyzed > 0 ||
    profile.tactics !== DEFAULT_SKILL_PROFILE.tactics ||
    profile.checkmate_patterns !== DEFAULT_SKILL_PROFILE.checkmate_patterns;

  if (!hasAdaptiveSignal) {
    return STARTER_PLAN.filter(exercise => !completedToday.includes(exercise.id));
  }

  const focuses = buildLearnerFocuses(profile, signals);
  const ranked = adaptiveCandidates(profile, signals, focuses, retention, review, transfer)
    .filter(candidate => !completedToday.includes(candidate.id))
    .map(candidate => {
      const priority = scoreExercise(candidate, profile, signals, focuses, retention, review, transfer);
      return finalizeExercise(candidate, priority, focuses, pace);
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const unique = ranked.filter(
    (exercise, index, list) => list.findIndex(other => other.id === exercise.id) === index
  );

  const topExercises = unique.slice(0, 5);
  const coachingGame = unique.find(exercise => exercise.id === 'coaching-game');

  if (coachingGame && !topExercises.some(exercise => exercise.id === coachingGame.id)) {
    if (topExercises.length >= 5) {
      topExercises[topExercises.length - 1] = coachingGame;
    } else {
      topExercises.push(coachingGame);
    }
  }

  return topExercises;
}
