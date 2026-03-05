import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Chess } from 'chess.js';

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
    'SELECT pgn FROM games WHERE user_id = $1 AND pgn IS NOT NULL AND pgn != \'\' ORDER BY created_at DESC LIMIT 50',
    [userId]
  );

  // Count square usage from all games
  const squareCounts: number[][] = Array.from({ length: 8 }, () => Array(8).fill(0));

  for (const row of result.rows) {
    try {
      const game = new Chess();
      game.loadPgn(row.pgn);
      const history = game.history({ verbose: true });
      for (const move of history) {
        // Count destination squares
        const file = move.to.charCodeAt(0) - 97;
        const rank = parseInt(move.to[1]) - 1;
        squareCounts[7 - rank][file]++;
      }
    } catch {
      // Skip invalid PGNs
    }
  }

  return NextResponse.json({ heatmap: squareCounts, gamesAnalyzed: result.rows.length });
}
