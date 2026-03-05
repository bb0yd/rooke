import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Get chat messages for a game
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  // Verify user is a participant
  const gameResult = await pool.query(
    'SELECT id FROM multiplayer_games WHERE id = $1 AND (white_user_id = $2 OR black_user_id = $2)',
    [id, userId]
  );

  if (gameResult.rows.length === 0) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const result = await pool.query(
    `SELECT gc.id, gc.message, gc.created_at, u.username
     FROM game_chat gc
     JOIN users u ON gc.user_id = u.id
     WHERE gc.game_id = $1
     ORDER BY gc.created_at ASC
     LIMIT 200`,
    [id]
  );

  return NextResponse.json(result.rows);
}

// POST: Send a chat message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const { message } = await req.json();

  if (!message || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  // Verify user is a participant
  const gameResult = await pool.query(
    'SELECT id FROM multiplayer_games WHERE id = $1 AND (white_user_id = $2 OR black_user_id = $2)',
    [id, userId]
  );

  if (gameResult.rows.length === 0) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // Limit message length
  const trimmed = message.trim().slice(0, 500);

  await pool.query(
    'INSERT INTO game_chat (game_id, user_id, message) VALUES ($1, $2, $3)',
    [id, userId, trimmed]
  );

  return NextResponse.json({ success: true });
}
