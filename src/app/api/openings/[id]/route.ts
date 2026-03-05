import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// DELETE: Remove a custom opening
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const openingId = parseInt(id);

  // Only allow deleting own custom openings
  const result = await pool.query(
    'DELETE FROM openings WHERE id = $1 AND user_id = $2 AND is_custom = true RETURNING id',
    [openingId, userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
