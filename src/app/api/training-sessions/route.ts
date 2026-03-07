import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const {
    module,
    exerciseType,
    difficulty,
    score,
    attempts,
    successes,
    firstTrySuccesses,
    hintsUsed,
    elapsedMs,
    metadata,
  } = await req.json();

  const result = await pool.query(
    `INSERT INTO training_sessions (
       user_id, module, exercise_type, difficulty, score,
       attempts, successes, first_try_successes, hints_used, elapsed_ms, metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      userId,
      module,
      exerciseType,
      difficulty || 1,
      score || 0,
      Math.max(Number(attempts) || 0, 0),
      Math.max(Number(successes) || 0, 0),
      Math.max(Number(firstTrySuccesses) || 0, 0),
      Math.max(Number(hintsUsed) || 0, 0),
      elapsedMs != null ? Math.max(Number(elapsedMs) || 0, 0) : null,
      metadata && typeof metadata === 'object' ? metadata : {},
    ]
  );

  return NextResponse.json({ id: result.rows[0].id, success: true });
}
