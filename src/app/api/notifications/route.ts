import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Get pending notification counts
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const [challengeResult, friendResult, turnResult] = await Promise.all([
    pool.query(
      'SELECT COUNT(*)::int as count FROM challenges WHERE to_user_id = $1 AND status = $2',
      [userId, 'pending']
    ),
    pool.query(
      'SELECT COUNT(*)::int as count FROM friends WHERE friend_id = $1 AND status = $2',
      [userId, 'pending']
    ),
    pool.query(
      `SELECT COUNT(*)::int as count FROM multiplayer_games
       WHERE result = 'in_progress'
       AND (
         (white_user_id = $1 AND SPLIT_PART(fen, ' ', 2) = 'w')
         OR (black_user_id = $1 AND SPLIT_PART(fen, ' ', 2) = 'b')
       )`,
      [userId]
    ),
  ]);

  return NextResponse.json({
    challenges: challengeResult.rows[0].count,
    friendRequests: friendResult.rows[0].count,
    yourTurn: turnResult.rows[0].count,
  });
}
