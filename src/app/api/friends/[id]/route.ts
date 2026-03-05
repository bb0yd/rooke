import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// PATCH: Accept or decline friend request
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const { action } = await req.json();

  if (action === 'accept') {
    await pool.query(
      'UPDATE friends SET status = $1 WHERE id = $2 AND friend_id = $3',
      ['accepted', id, userId]
    );
    return NextResponse.json({ success: true });
  }

  if (action === 'decline') {
    await pool.query(
      'DELETE FROM friends WHERE id = $1 AND friend_id = $2',
      [id, userId]
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE: Remove friend
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  await pool.query(
    'DELETE FROM friends WHERE id = $1 AND (user_id = $2 OR friend_id = $2)',
    [id, userId]
  );

  return NextResponse.json({ success: true });
}
