import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: List all openings (built-in + user custom)
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const result = await pool.query(
    `SELECT o.*,
            COALESCE(json_agg(json_build_object('id', ol.id, 'name', ol.name, 'moves', ol.moves) ORDER BY ol.id)
                     FILTER (WHERE ol.id IS NOT NULL), '[]') as lines
     FROM openings o
     LEFT JOIN opening_lines ol ON ol.opening_id = o.id
     WHERE o.is_custom = false OR o.user_id = $1
     GROUP BY o.id
     ORDER BY o.is_custom ASC, o.name ASC`,
    [userId]
  );

  return NextResponse.json(result.rows);
}

// POST: Create custom opening
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { name, description, playerColor, thumbnailFen, lines } = await req.json();

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const openingResult = await pool.query(
    `INSERT INTO openings (name, description, player_color, thumbnail_fen, is_custom, user_id)
     VALUES ($1, $2, $3, $4, true, $5) RETURNING id`,
    [name, description || '', playerColor || 'w', thumbnailFen || '', userId]
  );

  const openingId = openingResult.rows[0].id;

  // Insert lines if provided
  if (Array.isArray(lines)) {
    for (const line of lines) {
      await pool.query(
        'INSERT INTO opening_lines (opening_id, name, moves) VALUES ($1, $2, $3)',
        [openingId, line.name, JSON.stringify(line.moves)]
      );
    }
  }

  return NextResponse.json({ id: openingId, success: true });
}
