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

  const result = await pool.query(
    `SELECT opening_name, COUNT(*) as games,
            SUM(CASE WHEN result = 'white_wins' THEN 1 ELSE 0 END) as white_wins,
            SUM(CASE WHEN result = 'black_wins' THEN 1 ELSE 0 END) as black_wins,
            SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws,
            ROUND(AVG(moves_count)) as avg_moves
     FROM games
     WHERE user_id = $1 AND opening_name IS NOT NULL AND opening_name != ''
     GROUP BY opening_name
     ORDER BY COUNT(*) DESC
     LIMIT 20`,
    [userId]
  );

  return NextResponse.json(result.rows);
}
