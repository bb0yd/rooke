import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// POST: Add a line to a custom opening
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const openingId = parseInt(id);

  // Verify ownership
  const opening = await pool.query(
    'SELECT id FROM openings WHERE id = $1 AND user_id = $2 AND is_custom = true',
    [openingId, userId]
  );

  if (opening.rows.length === 0) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
  }

  const { name, moves } = await req.json();

  if (!name || !Array.isArray(moves) || moves.length === 0) {
    return NextResponse.json({ error: 'Name and moves are required' }, { status: 400 });
  }

  const result = await pool.query(
    'INSERT INTO opening_lines (opening_id, name, moves) VALUES ($1, $2, $3) RETURNING id',
    [openingId, name, JSON.stringify(moves)]
  );

  return NextResponse.json({ id: result.rows[0].id, success: true });
}

// DELETE: Remove a line from a custom opening
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const openingId = parseInt(id);
  const { searchParams } = new URL(req.url);
  const lineId = searchParams.get('lineId');

  if (!lineId) {
    return NextResponse.json({ error: 'lineId required' }, { status: 400 });
  }

  // Verify ownership
  const opening = await pool.query(
    'SELECT id FROM openings WHERE id = $1 AND user_id = $2 AND is_custom = true',
    [openingId, userId]
  );

  if (opening.rows.length === 0) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
  }

  await pool.query(
    'DELETE FROM opening_lines WHERE id = $1 AND opening_id = $2',
    [parseInt(lineId), openingId]
  );

  return NextResponse.json({ success: true });
}
