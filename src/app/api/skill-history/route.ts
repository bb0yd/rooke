import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const result = await pool.query(
    `SELECT skill_area, score, recorded_at FROM skill_history
     WHERE user_id = $1 ORDER BY recorded_at ASC LIMIT 500`,
    [userId]
  );

  return NextResponse.json({ history: result.rows });
}
