import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// PATCH: Accept or decline a challenge
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const { action } = await req.json(); // 'accept' or 'decline'

  if (!['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Fetch the challenge
  const challenge = await pool.query(
    'SELECT * FROM challenges WHERE id = $1 AND status = $2',
    [id, 'pending']
  );

  if (challenge.rows.length === 0) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  const ch = challenge.rows[0];

  // Only the recipient can accept/decline
  if (ch.to_user_id !== userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  if (action === 'decline') {
    await pool.query('UPDATE challenges SET status = $1 WHERE id = $2', ['declined', id]);
    return NextResponse.json({ success: true });
  }

  // Accept: create a multiplayer game
  let whiteId: number, blackId: number;
  if (ch.color_preference === 'white') {
    whiteId = ch.from_user_id;
    blackId = ch.to_user_id;
  } else if (ch.color_preference === 'black') {
    whiteId = ch.to_user_id;
    blackId = ch.from_user_id;
  } else {
    // random
    if (Math.random() < 0.5) {
      whiteId = ch.from_user_id;
      blackId = ch.to_user_id;
    } else {
      whiteId = ch.to_user_id;
      blackId = ch.from_user_id;
    }
  }

  const gameResult = await pool.query(
    `INSERT INTO multiplayer_games (white_user_id, black_user_id, time_control)
     VALUES ($1, $2, $3) RETURNING id`,
    [whiteId, blackId, ch.time_control || 'none']
  );

  await pool.query('UPDATE challenges SET status = $1 WHERE id = $2', ['accepted', id]);

  return NextResponse.json({ success: true, gameId: gameResult.rows[0].id });
}

// DELETE: Cancel a challenge (only by sender)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  const result = await pool.query(
    'DELETE FROM challenges WHERE id = $1 AND from_user_id = $2 AND status = $3 RETURNING id',
    [id, userId, 'pending']
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
