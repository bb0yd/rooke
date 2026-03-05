import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: List active multiplayer games for the user
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const result = await pool.query(
    `SELECT mg.id, mg.white_user_id, mg.black_user_id, mg.fen, mg.result,
            mg.time_control, mg.started_at, mg.last_move_at, mg.moves,
            w.username as white_username, b.username as black_username
     FROM multiplayer_games mg
     JOIN users w ON mg.white_user_id = w.id
     JOIN users b ON mg.black_user_id = b.id
     WHERE (mg.white_user_id = $1 OR mg.black_user_id = $1)
     ORDER BY mg.last_move_at DESC
     LIMIT 50`,
    [userId]
  );

  return NextResponse.json(result.rows);
}
