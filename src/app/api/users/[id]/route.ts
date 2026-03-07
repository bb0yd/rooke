import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken, hashPassword, verifyPassword } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Get user profile
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await pool.query(
    'SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}

// PATCH: Update user profile
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  if (parseInt(id) !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { displayName, bio, preferences } = await req.json();

  const updates: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (displayName !== undefined) {
    updates.push(`display_name = $${paramIdx++}`);
    values.push(displayName);
  }
  if (bio !== undefined) {
    updates.push(`bio = $${paramIdx++}`);
    values.push(bio);
  }
  if (preferences !== undefined) {
    updates.push(`preferences = $${paramIdx++}`);
    values.push(JSON.stringify(preferences));
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  values.push(userId);
  await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
    values
  );

  return NextResponse.json({ success: true });
}

// DELETE: Delete account
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  if (parseInt(id) !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Delete user data (cascading)
  await pool.query('DELETE FROM game_chat WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM friends WHERE user_id = $1 OR friend_id = $1', [userId]);
  await pool.query('DELETE FROM user_repertoire WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM rating_history WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM user_ratings WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM puzzle_stats WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM trainer_stats WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM quick_play_pool WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM games WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM challenges WHERE from_user_id = $1 OR to_user_id = $1', [userId]);
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);

  const response = NextResponse.json({ success: true });
  response.cookies.set('token', '', { maxAge: 0, path: '/' });
  return response;
}
