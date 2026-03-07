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
  const includeMultiplayer = searchParams.get('include_multiplayer') === 'true';

  if (!includeMultiplayer) {
    // Original behavior: query only the games table with server-side pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM games WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const offset = (page - 1) * limit;
    const dataResult = await pool.query(
      `SELECT id, pgn, result, moves_count, opening_name, opponent, created_at, completed_at
       FROM games WHERE ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    const games = dataResult.rows.map((g: any) => ({ ...g, source: 'local' }));

    return NextResponse.json({
      games,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  // Multiplayer-inclusive path: fetch both sources, merge, then paginate

  // 1. Fetch all matching local games (no LIMIT/OFFSET yet -- we paginate after merge)
  const localResult = await pool.query(
    `SELECT id, pgn, result, moves_count, opening_name, opponent, created_at, completed_at
     FROM games WHERE ${where} ORDER BY created_at DESC`,
    params
  );
  const localGames = localResult.rows.map((g: any) => ({ ...g, source: 'local' }));

  // 2. Fetch multiplayer games with parallel filter conditions
  const mpConditions = ['(mg.white_user_id = $1 OR mg.black_user_id = $1)'];
  const mpParams: any[] = [userId];
  let mpIdx = 2;

  if (result && result !== 'all') {
    mpConditions.push(`mg.result = $${mpIdx++}`);
    mpParams.push(result);
  }
  if (search) {
    mpConditions.push(`(mg.pgn ILIKE $${mpIdx} OR opp.username ILIKE $${mpIdx})`);
    mpParams.push(`%${search}%`);
    mpIdx++;
  }
  if (from) {
    mpConditions.push(`mg.started_at >= $${mpIdx++}`);
    mpParams.push(from);
  }
  if (to) {
    mpConditions.push(`mg.started_at <= $${mpIdx++}`);
    mpParams.push(to);
  }

  const mpWhere = mpConditions.join(' AND ');

  const mpResult = await pool.query(
    `SELECT mg.id, mg.pgn, mg.result, mg.moves, mg.started_at,
            mg.white_user_id, mg.black_user_id,
            COALESCE(opp.username, 'Unknown') AS opponent_username
     FROM multiplayer_games mg
     LEFT JOIN users opp ON opp.id = CASE
       WHEN mg.white_user_id = $1 THEN mg.black_user_id
       ELSE mg.white_user_id
     END
     WHERE ${mpWhere}
     ORDER BY mg.started_at DESC`,
    mpParams
  );

  const mpGames = mpResult.rows.map((g: any) => {
    const movesStr: string = g.moves || '';
    const movesCount = movesStr ? movesStr.split(',').length : 0;
    return {
      id: g.id,
      pgn: g.pgn || '',
      result: g.result || 'in_progress',
      moves_count: movesCount,
      created_at: g.started_at,
      opening_name: null,
      opponent: g.opponent_username,
      source: 'multiplayer',
    };
  });

  // 3. Merge and sort by created_at DESC, then paginate
  const allGames = [...localGames, ...mpGames].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const total = allGames.length;
  const offset = (page - 1) * limit;
  const paginatedGames = allGames.slice(offset, offset + limit);

  return NextResponse.json({
    games: paginatedGames,
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
