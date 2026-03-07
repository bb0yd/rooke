import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

function normalizeTheme(theme: string): string {
  return theme
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawTheme = searchParams.get('theme');
  const theme = rawTheme ? normalizeTheme(rawTheme) : null;
  const limit = Math.min(10, Math.max(1, parseInt(searchParams.get('limit') || '5', 10)));

  try {
    const params: unknown[] = [userId];
    let where = `WHERE user_id = $1
      AND fen_before IS NOT NULL
      AND best_move_uci IS NOT NULL
      AND classification IN ('inaccuracy', 'mistake', 'blunder')`;

    if (theme) {
      params.push(theme);
      where += ` AND mistake_theme = $2`;
    }

    const result = await pool.query(
      `SELECT id, fen_before, best_move_uci, best_move_san, mistake_theme, cp_loss
       FROM game_analysis_moves
       ${where}
       ORDER BY analyzed_at DESC, cp_loss DESC
       LIMIT ${limit}`,
      params,
    );

    const drills = result.rows.map((row: any) => ({
      id: `analysis-${row.id}`,
      fen: row.fen_before,
      bestMoveUci: row.best_move_uci,
      bestMoveSan: row.best_move_san,
      theme: row.mistake_theme,
      cpLoss: row.cp_loss,
    }));

    return NextResponse.json({ drills });
  } catch (error) {
    console.error('Training drills query error:', error);
    return NextResponse.json({ drills: [] });
  }
}
