import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: List challenges (sent and received)
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const result = await pool.query(
    `SELECT c.id, c.from_user_id, c.to_user_id, c.time_control, c.color_preference, c.status, c.created_at,
            f.username as from_username, t.username as to_username
     FROM challenges c
     JOIN users f ON c.from_user_id = f.id
     JOIN users t ON c.to_user_id = t.id
     WHERE (c.from_user_id = $1 OR c.to_user_id = $1)
       AND c.status = 'pending'
     ORDER BY c.created_at DESC`,
    [userId]
  );

  return NextResponse.json(result.rows);
}

// POST: Send a challenge
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { toUserId, timeControl, colorPreference } = await req.json();

  if (!toUserId) {
    return NextResponse.json({ error: 'toUserId is required' }, { status: 400 });
  }

  if (toUserId === userId) {
    return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 });
  }

  // Check if there's already a pending challenge between these users
  const existing = await pool.query(
    `SELECT id FROM challenges
     WHERE status = 'pending'
       AND ((from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1))`,
    [userId, toUserId]
  );

  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Challenge already pending' }, { status: 409 });
  }

  const result = await pool.query(
    `INSERT INTO challenges (from_user_id, to_user_id, time_control, color_preference)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, toUserId, timeControl || 'none', colorPreference || 'random']
  );

  return NextResponse.json({ id: result.rows[0].id, success: true });
}
