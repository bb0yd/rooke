import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { detectOpeningName } from '@/lib/analysis';

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

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const result = searchParams.get('result');
  const search = searchParams.get('search');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const conditions = ['user_id = $1'];
  const params: any[] = [userId];
  let paramIdx = 2;

  if (result && result !== 'all') {
    conditions.push(`result = $${paramIdx++}`);
    params.push(result);
  }
  if (search) {
    conditions.push(`(pgn ILIKE $${paramIdx} OR opening_name ILIKE $${paramIdx} OR opponent ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }
  if (from) {
    conditions.push(`created_at >= $${paramIdx++}`);
    params.push(from);
  }
  if (to) {
    conditions.push(`created_at <= $${paramIdx++}`);
    params.push(to);
  }

  const where = conditions.join(' AND ');

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM games WHERE ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Get paginated results
  const offset = (page - 1) * limit;
  const dataResult = await pool.query(
    `SELECT id, pgn, result, moves_count, opening_name, opponent, created_at, completed_at
     FROM games WHERE ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return NextResponse.json({
    games: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { pgn, result, movesCount, openingName, opponent } = await req.json();

  if (!pgn) {
    return NextResponse.json({ error: 'PGN is required' }, { status: 400 });
  }

  // Auto-detect opening name if not provided
  const detectedOpening = openingName || detectOpeningName(pgn);

  const completedAt = result !== 'in_progress' ? new Date() : null;

  const dbResult = await pool.query(
    'INSERT INTO games (user_id, pgn, result, moves_count, opening_name, opponent, completed_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [userId, pgn, result || 'in_progress', movesCount || 0, detectedOpening, opponent || null, completedAt]
  );

  return NextResponse.json({ id: dbResult.rows[0].id, success: true });
}
