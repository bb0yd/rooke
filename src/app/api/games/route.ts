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
    'SELECT id, pgn, result, moves_count, created_at, completed_at FROM games WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { pgn, result, movesCount } = await req.json();

  if (!pgn) {
    return NextResponse.json({ error: 'PGN is required' }, { status: 400 });
  }

  const completedAt = result !== 'in_progress' ? new Date() : null;

  const dbResult = await pool.query(
    'INSERT INTO games (user_id, pgn, result, moves_count, completed_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [userId, pgn, result || 'in_progress', movesCount || 0, completedAt]
  );

  return NextResponse.json({ id: dbResult.rows[0].id, success: true });
}
