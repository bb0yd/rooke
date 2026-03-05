import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Get all puzzle stats for user
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const result = await pool.query(
    'SELECT puzzle_id, attempts, solves, best_time_ms FROM puzzle_stats WHERE user_id = $1',
    [userId]
  );

  return NextResponse.json(result.rows);
}

// POST: Record a puzzle attempt
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

  return NextResponse.json({ success: true });
}
