import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Get all puzzle stats for user, keyed by puzzle_id
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const result = await pool.query(
    'SELECT puzzle_id, attempts, solves, best_time_ms FROM puzzle_stats WHERE user_id = $1',
    [userId]
  );

  // Return as a map keyed by puzzle_id (what the UI expects)
  const statsMap: Record<string, { attempts: number; solves: number; best_time_ms: number | null }> = {};
  for (const row of result.rows) {
    statsMap[row.puzzle_id] = {
      attempts: row.attempts,
      solves: row.solves,
      best_time_ms: row.best_time_ms,
    };
  }

  return NextResponse.json(statsMap);
}

// POST: Record a puzzle attempt, return updated stats for that puzzle
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { puzzleId, solved, timeMs } = await req.json();

  if (!puzzleId) {
    return NextResponse.json({ error: 'puzzleId required' }, { status: 400 });
  }

  if (solved) {
    await pool.query(
      `INSERT INTO puzzle_stats (user_id, puzzle_id, attempts, solves, best_time_ms)
       VALUES ($1, $2, 1, 1, $3)
       ON CONFLICT (user_id, puzzle_id)
       DO UPDATE SET attempts = puzzle_stats.attempts + 1, solves = puzzle_stats.solves + 1,
         best_time_ms = CASE WHEN $3 IS NOT NULL AND ($3 < puzzle_stats.best_time_ms OR puzzle_stats.best_time_ms IS NULL) THEN $3 ELSE puzzle_stats.best_time_ms END`,
      [userId, puzzleId, timeMs || null]
    );
  } else {
    await pool.query(
      `INSERT INTO puzzle_stats (user_id, puzzle_id, attempts, solves)
       VALUES ($1, $2, 1, 0)
       ON CONFLICT (user_id, puzzle_id)
       DO UPDATE SET attempts = puzzle_stats.attempts + 1`,
      [userId, puzzleId]
    );
  }

  // Return the updated stats for this puzzle (what the UI expects)
  const result = await pool.query(
    'SELECT attempts, solves, best_time_ms FROM puzzle_stats WHERE user_id = $1 AND puzzle_id = $2',
    [userId, puzzleId]
  );

  return NextResponse.json(result.rows[0] || { attempts: 0, solves: 0, best_time_ms: null });
}
