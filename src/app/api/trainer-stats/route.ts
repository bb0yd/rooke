import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Fetch all trainer stats for the user
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      'SELECT opening_id, line_id, attempts, clean, mistakes, last_practiced, ease_factor, interval_days, next_review FROM trainer_stats WHERE user_id = $1',
      [userId]
    );

    // Convert to the same nested format as localStorage: { openingId: { lineId: stats } }
    const store: Record<string, Record<string, {
      attempts: number; clean: number; mistakes: number; lastPracticed: number;
      easeFactor: number; intervalDays: number; nextReview: number;
    }>> = {};
    for (const row of result.rows) {
      if (!store[row.opening_id]) store[row.opening_id] = {};
      store[row.opening_id][row.line_id] = {
        attempts: row.attempts,
        clean: row.clean,
        mistakes: row.mistakes,
        lastPracticed: Number(row.last_practiced),
        easeFactor: row.ease_factor ?? 2.5,
        intervalDays: row.interval_days ?? 0,
        nextReview: Number(row.next_review ?? 0),
      };
    }

    return NextResponse.json(store);
  } catch {
    return NextResponse.json({});
  }
}

// POST: Upsert a single line stat
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { openingId, lineId, attempts, clean, mistakes, lastPracticed, easeFactor, intervalDays, nextReview } = await req.json();

  if (!openingId || !lineId) {
    return NextResponse.json({ error: 'openingId and lineId are required' }, { status: 400 });
  }

  try {
    await pool.query(
      `INSERT INTO trainer_stats (user_id, opening_id, line_id, attempts, clean, mistakes, last_practiced, ease_factor, interval_days, next_review)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, opening_id, line_id)
       DO UPDATE SET attempts = $4, clean = $5, mistakes = $6, last_practiced = $7, ease_factor = $8, interval_days = $9, next_review = $10`,
      [userId, openingId, lineId, attempts || 0, clean || 0, mistakes || 0, lastPracticed || 0,
       easeFactor ?? 2.5, intervalDays ?? 0, nextReview ?? 0]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 });
  }
}
