import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// POST: Join the quick play pool
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { timeControl = '10+0', colorPreference = 'random' } = await req.json();

  // Check for existing match in pool
  const matchResult = await pool.query(
    'SELECT qp.*, u.username FROM quick_play_pool qp JOIN users u ON qp.user_id = u.id WHERE qp.user_id != $1 AND qp.time_control = $2 ORDER BY qp.created_at ASC LIMIT 1',
    [userId, timeControl]
  );

  if (matchResult.rows.length > 0) {
    const opponent = matchResult.rows[0];

    // Determine colors
    let whiteId: number, blackId: number;
    if (colorPreference === 'white' && opponent.color_preference !== 'white') {
      whiteId = userId; blackId = opponent.user_id;
    } else if (colorPreference === 'black' && opponent.color_preference !== 'black') {
      whiteId = opponent.user_id; blackId = userId;
    } else {
      if (Math.random() < 0.5) {
        whiteId = userId; blackId = opponent.user_id;
      } else {
        whiteId = opponent.user_id; blackId = userId;
      }
    }

    // Parse time control for initial times
    const parts = timeControl.match(/^(\d+)\+(\d+)$/);
    const initialMs = parts ? parseInt(parts[1]) * 60000 : null;

    // Create game
    const gameResult = await pool.query(
      `INSERT INTO multiplayer_games (white_user_id, black_user_id, time_control, white_time_remaining_ms, black_time_remaining_ms, last_move_timestamp)
       VALUES ($1, $2, $3, $4, $4, $5) RETURNING id`,
      [whiteId, blackId, timeControl, initialMs, Date.now()]
    );

    // Remove both from pool
    await pool.query('DELETE FROM quick_play_pool WHERE user_id IN ($1, $2)', [userId, opponent.user_id]);

    return NextResponse.json({ matched: true, gameId: gameResult.rows[0].id });
  }

  // No match found — join pool
  await pool.query(
    `INSERT INTO quick_play_pool (user_id, time_control, color_preference)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET time_control = $2, color_preference = $3, created_at = NOW()`,
    [userId, timeControl, colorPreference]
  );

  return NextResponse.json({ matched: false, waiting: true });
}

// GET: Check if matched
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check if still in pool
  const poolResult = await pool.query(
    'SELECT id FROM quick_play_pool WHERE user_id = $1',
    [userId]
  );

  if (poolResult.rows.length === 0) {
    // Not in pool — check for recent game
    const gameResult = await pool.query(
      `SELECT id FROM multiplayer_games
       WHERE (white_user_id = $1 OR black_user_id = $1) AND result = 'in_progress'
       ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );

    if (gameResult.rows.length > 0) {
      return NextResponse.json({ matched: true, gameId: gameResult.rows[0].id });
    }
  }

  return NextResponse.json({ matched: false, waiting: poolResult.rows.length > 0 });
}

// DELETE: Leave the pool
export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await pool.query('DELETE FROM quick_play_pool WHERE user_id = $1', [userId]);
  return NextResponse.json({ success: true });
}
