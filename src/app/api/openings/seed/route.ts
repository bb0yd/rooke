import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { OPENINGS } from '@/data/openings';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// POST: Seed database with openings from data file
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let seeded = 0;
  for (const opening of OPENINGS) {
    // Check if already seeded
    const existing = await pool.query(
      "SELECT id FROM openings WHERE name = $1 AND is_custom = false",
      [opening.name]
    );

    if (existing.rows.length > 0) continue;

    const openingResult = await pool.query(
      `INSERT INTO openings (name, description, player_color, thumbnail_fen, is_custom)
       VALUES ($1, $2, $3, $4, false) RETURNING id`,
      [opening.name, opening.description, opening.playerColor, opening.thumbnailFen]
    );

    const openingId = openingResult.rows[0].id;

    for (const line of opening.lines) {
      await pool.query(
        'INSERT INTO opening_lines (opening_id, name, moves) VALUES ($1, $2, $3)',
        [openingId, line.name, JSON.stringify(line.moves)]
      );
    }
    seeded++;
  }

  return NextResponse.json({ success: true, seeded });
}
