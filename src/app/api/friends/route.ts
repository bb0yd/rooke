import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: List friends and pending requests
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const result = await pool.query(
    `SELECT f.id, f.status, f.created_at,
            CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END as friend_user_id,
            u.username as friend_username,
            CASE WHEN f.user_id = $1 THEN 'outgoing' ELSE 'incoming' END as direction
     FROM friends f
     JOIN users u ON u.id = CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END
     WHERE f.user_id = $1 OR f.friend_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );

  return NextResponse.json(result.rows);
}

// POST: Send friend request
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { friendId } = await req.json();

  if (!friendId || friendId === userId) {
    return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
  }

  // Check if already friends
  const existing = await pool.query(
    'SELECT id FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
    [userId, friendId]
  );

  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Friend request already exists' }, { status: 409 });
  }

  await pool.query(
    'INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, $3)',
    [userId, friendId, 'pending']
  );

  return NextResponse.json({ success: true });
}
