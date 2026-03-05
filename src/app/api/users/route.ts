import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Search users by username (for challenge system)
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get('search') || '';

  if (search.length < 1) {
    // Return all users except self
    const result = await pool.query(
      'SELECT id, username FROM users WHERE id != $1 ORDER BY username LIMIT 50',
      [userId]
    );
    return NextResponse.json(result.rows);
  }

  const result = await pool.query(
    'SELECT id, username FROM users WHERE id != $1 AND username ILIKE $2 ORDER BY username LIMIT 20',
    [userId, `%${search}%`]
  );

  return NextResponse.json(result.rows);
}
