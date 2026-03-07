import pool from './db';
import { PUZZLES } from '@/data/puzzles';
import {
  computeSkillProfile,
  DEFAULT_SKILL_PROFILE,
  GameAnalysisRow,
  PuzzleStatsRow,
  SkillProfile,
} from './skillProfile';
import { DEFAULT_RETENTION_SIGNALS, RetentionSignals } from './retentionSignals';
import { DEFAULT_REVIEW_SIGNALS, ReviewSignals } from './reviewSignals';
import { DEFAULT_TRAINING_SIGNALS, TrainingSignals } from './trainingSignals';
import { DEFAULT_TRAINING_PACE, summarizeTrainingPace, TrainingPace } from './trainingPace';
import { DEFAULT_TRANSFER_SIGNALS, TransferSignals } from './transferSignals';

const LOCAL_PUZZLE_THEMES = new Map(PUZZLES.map(puzzle => [puzzle.id, puzzle.themes]));
const SKILL_KEYS = ['piece_safety', 'tactics', 'checkmate_patterns', 'opening_play', 'endgame_play'] as const;
function toAnalysisRows(rows: any[]): GameAnalysisRow[] {
  return rows.map(row => ({
    accuracy: row.accuracy,
    blunders: row.blunders,
    mistakes: row.mistakes,
    hung_pieces: row.hung_pieces,
    missed_tactics: row.missed_tactics || [],
    phase_accuracy: row.phase_accuracy || { opening: 50, middlegame: 50, endgame: 50 },
  }));
}

function mergePuzzleStats(puzzleRows: any[], trainingRows: any[]): PuzzleStatsRow[] {
  const statsByExercise = new Map<string, { attempts: number; solves: number; themes: string[] }>();

  for (const row of puzzleRows) {
    const exerciseId = row.puzzle_id as string;
    const themes = Array.isArray(row.themes) && row.themes.length > 0
      ? row.themes
      : (LOCAL_PUZZLE_THEMES.get(exerciseId) || []);

    statsByExercise.set(exerciseId, {
      attempts: Number(row.attempts) || 0,
      solves: Number(row.solves) || 0,
      themes,
    });
  }

  for (const row of trainingRows) {
    const exerciseId = row.exercise_type as string | null;
    const metadataThemes = Array.isArray(row.metadata?.themes)
      ? row.metadata.themes.filter((theme: unknown): theme is string => typeof theme === 'string')
      : [];
    const themes = metadataThemes.length > 0
      ? metadataThemes
      : (exerciseId ? LOCAL_PUZZLE_THEMES.get(exerciseId) : undefined);
    if (!themes) continue;

    const statsKey = exerciseId || `session:${themes.join('|')}`;
    const existing = statsByExercise.get(statsKey);
    statsByExercise.set(statsKey, {
      attempts: (existing?.attempts || 0) + Math.max(Number(row.attempts) || 0, 1),
      solves: (existing?.solves || 0) + Math.max(
        Number(row.successes) || 0,
        row.score != null && Number(row.score) > 0 ? 1 : 0
      ),
      themes: existing?.themes?.length ? existing.themes : themes,
    });
  }

  return [...statsByExercise.values()];
}

export async function computeLiveSkillProfile(userId: number): Promise<SkillProfile> {
  const [analysisResult, puzzleResult, trainingResult] = await Promise.all([
    pool.query(
      `SELECT accuracy, blunders, mistakes, hung_pieces, missed_tactics, phase_accuracy
       FROM game_analysis WHERE user_id = $1 ORDER BY analyzed_at DESC LIMIT 20`,
      [userId]
    ),
    pool.query(
      `SELECT ps.puzzle_id, ps.attempts, ps.solves, COALESCE(p.themes, '{}') as themes
       FROM puzzle_stats ps
       LEFT JOIN puzzles p ON p.id = ps.puzzle_id
       WHERE ps.user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT exercise_type, attempts, successes, score, metadata
       FROM training_sessions
       WHERE user_id = $1 AND module = 'tactics'
       ORDER BY completed_at DESC
       LIMIT 100`,
      [userId]
    ),
  ]);

  const analyses = toAnalysisRows(analysisResult.rows);
  const puzzleStats = mergePuzzleStats(puzzleResult.rows, trainingResult.rows);

  return computeSkillProfile(analyses, puzzleStats);
}

interface RecentMoveEvidenceRow {
  classification: string;
  phase: string | null;
  is_hung_piece: boolean;
  mistake_theme: string | null;
  cp_loss: number;
}

interface TrainerRetentionRow {
  opening_id: string;
  attempts: number;
  clean: number;
  mistakes: number;
  next_review: number;
}

interface ReviewRow {
  module: string;
  theme: string | null;
  next_review: number;
}

interface TransferRow {
  module: 'tactics' | 'endgame' | 'openings';
  completed_at: string;
  metadata: Record<string, any> | null;
}

export function summarizeTrainingSignals(rows: RecentMoveEvidenceRow[]): TrainingSignals {
  const severeRows = rows.filter(row => ['inaccuracy', 'mistake', 'blunder'].includes(row.classification));
  if (severeRows.length === 0) return { ...DEFAULT_TRAINING_SIGNALS };

  const themeCounts = new Map<string, number>();
  const phaseLoss = new Map<'opening' | 'middlegame' | 'endgame', { total: number; count: number }>();
  let recentHungPieceCount = 0;

  for (const row of severeRows) {
    if (row.is_hung_piece) {
      recentHungPieceCount++;
    }

    if (row.mistake_theme) {
      themeCounts.set(row.mistake_theme, (themeCounts.get(row.mistake_theme) || 0) + 1);
    }

    if (row.phase === 'opening' || row.phase === 'middlegame' || row.phase === 'endgame') {
      const current = phaseLoss.get(row.phase) || { total: 0, count: 0 };
      current.total += Number(row.cp_loss) || 0;
      current.count += 1;
      phaseLoss.set(row.phase, current);
    }
  }

  const topThemeEntry = [...themeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const weakestPhaseEntry = [...phaseLoss.entries()]
    .map(([phase, data]) => [phase, data.count > 0 ? data.total / data.count : 0] as const)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    recentHungPieceCount,
    topMistakeTheme: topThemeEntry?.[0] || null,
    topMistakeThemeCount: topThemeEntry?.[1] || 0,
    weakestPhase: weakestPhaseEntry && weakestPhaseEntry[1] > 0 ? weakestPhaseEntry[0] : null,
  };
}

export async function computeTrainingSignals(userId: number): Promise<TrainingSignals> {
  try {
    const result = await pool.query(
      `SELECT classification, phase, is_hung_piece, mistake_theme, cp_loss
       FROM game_analysis_moves
       WHERE user_id = $1
       ORDER BY analyzed_at DESC, ply_index DESC
       LIMIT 80`,
      [userId]
    );

    return summarizeTrainingSignals(result.rows);
  } catch (error) {
    console.error('Training signal query error:', error);
    return { ...DEFAULT_TRAINING_SIGNALS };
  }
}

export async function computeTrainingPace(userId: number): Promise<TrainingPace> {
  try {
    const result = await pool.query(
      `SELECT module, difficulty, score, attempts, successes, first_try_successes, hints_used, elapsed_ms
       FROM training_sessions
       WHERE user_id = $1
       ORDER BY completed_at DESC
       LIMIT 60`,
      [userId]
    );

    return summarizeTrainingPace(result.rows);
  } catch (error) {
    console.error('Training pace query error:', error);
    return { ...DEFAULT_TRAINING_PACE };
  }
}

export function summarizeReviewSignals(rows: ReviewRow[], now: number = Date.now()): ReviewSignals {
  if (rows.length === 0) return { ...DEFAULT_REVIEW_SIGNALS };

  let dueTacticsCount = 0;
  let dueEndgameCount = 0;
  let overdueTacticsCount = 0;
  let overdueEndgameCount = 0;
  const themeCounts = new Map<string, number>();

  for (const row of rows) {
    const nextReview = Number(row.next_review) || 0;
    if (nextReview <= 0 || now < nextReview) continue;

    const overdue = now - nextReview > 3 * 24 * 60 * 60 * 1000;
    if (row.module === 'tactics') {
      dueTacticsCount++;
      if (overdue) overdueTacticsCount++;
      if (row.theme) {
        themeCounts.set(row.theme, (themeCounts.get(row.theme) || 0) + 1);
      }
    } else if (row.module === 'endgame') {
      dueEndgameCount++;
      if (overdue) overdueEndgameCount++;
    }
  }

  const topTheme = [...themeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    dueTacticsCount,
    dueEndgameCount,
    overdueTacticsCount,
    overdueEndgameCount,
    topDueTacticTheme: topTheme?.[0] || null,
    topDueTacticThemeCount: topTheme?.[1] || 0,
  };
}

export async function computeReviewSignals(userId: number): Promise<ReviewSignals> {
  try {
    const result = await pool.query(
      `SELECT module, theme, next_review
       FROM training_item_reviews
       WHERE user_id = $1 AND module IN ('tactics', 'endgame')`,
      [userId]
    );

    return summarizeReviewSignals(result.rows);
  } catch (error) {
    console.error('Review signal query error:', error);
    return { ...DEFAULT_REVIEW_SIGNALS };
  }
}

export function summarizeRetentionSignals(rows: TrainerRetentionRow[], now: number = Date.now()): RetentionSignals {
  if (rows.length === 0) return { ...DEFAULT_RETENTION_SIGNALS };

  const dueCounts = new Map<string, number>();
  let dueReviewCount = 0;
  let overdueReviewCount = 0;
  let strugglingLineCount = 0;

  for (const row of rows) {
    const attempts = Number(row.attempts) || 0;
    const clean = Number(row.clean) || 0;
    const mistakes = Number(row.mistakes) || 0;
    const nextReview = Number(row.next_review) || 0;

    if (attempts >= 2 && attempts > 0 && mistakes / attempts > 0.5) {
      strugglingLineCount++;
    }

    if (nextReview > 0 && now >= nextReview) {
      dueReviewCount++;
      dueCounts.set(row.opening_id, (dueCounts.get(row.opening_id) || 0) + 1);
      if (now - nextReview > 3 * 24 * 60 * 60 * 1000) {
        overdueReviewCount++;
      }
      continue;
    }

    if (attempts >= 3 && clean < Math.ceil(attempts * 0.6)) {
      dueCounts.set(row.opening_id, (dueCounts.get(row.opening_id) || 0) + 1);
    }
  }

  const topOpening = [...dueCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    dueReviewCount,
    overdueReviewCount,
    strugglingLineCount,
    focusOpeningId: topOpening?.[0] || null,
    focusOpeningDueCount: topOpening?.[1] || 0,
  };
}

export async function computeRetentionSignals(userId: number): Promise<RetentionSignals> {
  try {
    const result = await pool.query(
      `SELECT opening_id, attempts, clean, mistakes, next_review
       FROM trainer_stats
       WHERE user_id = $1`,
      [userId]
    );

    return summarizeRetentionSignals(result.rows);
  } catch (error) {
    console.error('Retention signal query error:', error);
    return { ...DEFAULT_RETENTION_SIGNALS };
  }
}

export function summarizeTransferSignals(
  trainingRows: TransferRow[],
  lastAnalyzedAt: string | null | undefined
): TransferSignals {
  const latestTraining = trainingRows[0];
  if (!latestTraining) return { ...DEFAULT_TRANSFER_SIGNALS };

  const lastTrainingAt = new Date(latestTraining.completed_at).getTime();
  const lastAnalysisTime = lastAnalyzedAt ? new Date(lastAnalyzedAt).getTime() : 0;
  const pendingTransferCheck = !lastAnalysisTime || lastAnalysisTime < lastTrainingAt;
  const metadata = latestTraining.metadata || {};

  return {
    pendingTransferCheck,
    focusModule: latestTraining.module,
    focusTheme: Array.isArray(metadata.themes) && typeof metadata.themes[0] === 'string'
      ? metadata.themes[0]
      : (typeof metadata.analysisTheme === 'string' ? metadata.analysisTheme : null),
    focusOpeningId: typeof metadata.openingId === 'string' ? metadata.openingId : null,
  };
}

export async function computeTransferSignals(userId: number): Promise<TransferSignals> {
  try {
    const [trainingResult, analysisResult] = await Promise.all([
      pool.query(
        `SELECT module, completed_at, metadata
         FROM training_sessions
         WHERE user_id = $1 AND module IN ('tactics', 'endgame', 'openings')
         ORDER BY completed_at DESC
         LIMIT 5`,
        [userId]
      ),
      pool.query(
        `SELECT MAX(analyzed_at) as last_analyzed_at
         FROM game_analysis
         WHERE user_id = $1`,
        [userId]
      ),
    ]);

    return summarizeTransferSignals(
      trainingResult.rows,
      analysisResult.rows[0]?.last_analyzed_at || null
    );
  } catch (error) {
    console.error('Transfer signal query error:', error);
    return { ...DEFAULT_TRANSFER_SIGNALS };
  }
}

function profileChanged(existing: any | undefined, nextProfile: SkillProfile): boolean {
  if (!existing) return true;

  return SKILL_KEYS.some(key => Number(existing[key]) !== nextProfile[key]) ||
    Number(existing.games_analyzed) !== nextProfile.games_analyzed ||
    existing.weakest_area !== nextProfile.weakest_area;
}

export async function persistSkillProfile(userId: number, profile?: SkillProfile): Promise<SkillProfile> {
  const nextProfile = profile || await computeLiveSkillProfile(userId);
  const existingResult = await pool.query(
    `SELECT piece_safety, tactics, checkmate_patterns, opening_play, endgame_play, games_analyzed, weakest_area
     FROM skill_profile WHERE user_id = $1`,
    [userId]
  );
  const existing = existingResult.rows[0];

  await pool.query(
    `INSERT INTO skill_profile (user_id, piece_safety, tactics, checkmate_patterns, opening_play, endgame_play, games_analyzed, weakest_area, last_updated)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       piece_safety = $2, tactics = $3, checkmate_patterns = $4,
       opening_play = $5, endgame_play = $6, games_analyzed = $7,
       weakest_area = $8, last_updated = NOW()`,
    [
      userId,
      nextProfile.piece_safety,
      nextProfile.tactics,
      nextProfile.checkmate_patterns,
      nextProfile.opening_play,
      nextProfile.endgame_play,
      nextProfile.games_analyzed,
      nextProfile.weakest_area,
    ]
  );

  if (profileChanged(existing, nextProfile)) {
    await Promise.all(
      SKILL_KEYS.map(skill =>
        pool.query(
          `INSERT INTO skill_history (user_id, skill_area, score) VALUES ($1, $2, $3)`,
          [userId, skill, nextProfile[skill]]
        )
      )
    );
  }

  return nextProfile;
}

export function defaultSkillProfile(): SkillProfile {
  return { ...DEFAULT_SKILL_PROFILE };
}
