import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: Get a multiplayer game for spectating (no participant check)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await pool.query(
    `SELECT mg.id, mg.fen, mg.pgn, mg.moves, mg.result, mg.time_control,
            mg.white_time_remaining_ms, mg.black_time_remaining_ms,
            mg.last_move_timestamp, mg.started_at, mg.last_move_at,
            w.username as white_username, b.username as black_username
     FROM multiplayer_games mg
     JOIN users w ON mg.white_user_id = w.id
     JOIN users b ON mg.black_user_id = b.id
     WHERE mg.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}
