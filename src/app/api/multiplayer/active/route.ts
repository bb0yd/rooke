import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: Get all active multiplayer games (public - no auth required for viewing)
export async function GET(req: NextRequest) {
  const result = await pool.query(
    `SELECT mg.id, mg.fen, mg.result, mg.time_control, mg.started_at, mg.last_move_at,
            w.username as white_username, b.username as black_username,
            (SELECT COUNT(*) FROM (SELECT DISTINCT unnest(string_to_array(mg.moves, ',')) AS m) sub) as move_count
     FROM multiplayer_games mg
     JOIN users w ON mg.white_user_id = w.id
     JOIN users b ON mg.black_user_id = b.id
     WHERE mg.result = 'in_progress'
     ORDER BY mg.last_move_at DESC
     LIMIT 20`
  );

  return NextResponse.json(result.rows);
}
