import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { generateTrainingPlan } from '@/lib/trainingPlan';
import { buildLearnerFocuses } from '@/lib/learnerFocus';
import {
  computeLiveSkillProfile,
  computeReviewSignals,
  computeRetentionSignals,
  computeTrainingPace,
  computeTrainingSignals,
  computeTransferSignals,
} from '@/lib/learnerState';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const [profile, signals, pace, retention, review, transfer] = await Promise.all([
    computeLiveSkillProfile(userId),
    computeTrainingSignals(userId),
    computeTrainingPace(userId),
    computeRetentionSignals(userId),
    computeReviewSignals(userId),
    computeTransferSignals(userId),
  ]);

  // Get today's completed sessions
  const sessionsResult = await pool.query(
    `SELECT exercise_type FROM training_sessions
     WHERE user_id = $1 AND completed_at >= CURRENT_DATE`,
    [userId]
  );
  const completedToday = sessionsResult.rows.map(r => r.exercise_type);

  const plan = generateTrainingPlan(profile, completedToday, signals, pace, retention, review, transfer);
  const focusAreas = buildLearnerFocuses(profile, signals);

  // Check for unanalyzed games
  const unanalyzedResult = await pool.query(
    `SELECT COUNT(*) as count FROM (
       SELECT g.id FROM games g
       LEFT JOIN game_analysis ga ON ga.game_id = g.id AND ga.user_id = $1
       WHERE g.user_id = $1 AND g.result != 'in_progress' AND g.pgn IS NOT NULL AND g.pgn != '' AND ga.id IS NULL
       UNION ALL
       SELECT mg.id FROM multiplayer_games mg
       LEFT JOIN game_analysis ga ON ga.multiplayer_game_id = mg.id AND ga.user_id = $1
       WHERE (mg.white_user_id = $1 OR mg.black_user_id = $1)
         AND mg.result != 'in_progress' AND mg.pgn IS NOT NULL AND mg.pgn != '' AND ga.id IS NULL
     ) unanalyzed`,
    [userId]
  );
  const unanalyzedCount = parseInt(unanalyzedResult.rows[0].count);

  return NextResponse.json({ exercises: plan, completedToday, profile, signals, focusAreas, pace, retention, review, transfer, unanalyzedCount });
}
