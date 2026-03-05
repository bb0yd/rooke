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
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'puzzle';
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

  const result = await pool.query(
    'SELECT rating, recorded_at FROM rating_history WHERE user_id = $1 AND rating_type = $2 ORDER BY recorded_at DESC LIMIT $3',
    [userId, type, limit]
  );

  return NextResponse.json(result.rows.reverse());
}
