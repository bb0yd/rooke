import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Chess } from 'chess.js';

function parseTimeControl(tc: string): { baseMs: number; incrementMs: number } | null {
  if (!tc || tc === 'none') return null;
  const match = tc.match(/^(\d+)\+(\d+)$/);
  if (!match) return null;
  return {
    baseMs: parseInt(match[1]) * 60 * 1000,
    incrementMs: parseInt(match[2]) * 1000,
  };
}

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Get a single multiplayer game
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  const result = await pool.query(
    `SELECT mg.*, w.username as white_username, b.username as black_username
     FROM multiplayer_games mg
     JOIN users w ON mg.white_user_id = w.id
     JOIN users b ON mg.black_user_id = b.id
     WHERE mg.id = $1 AND (mg.white_user_id = $2 OR mg.black_user_id = $2)`,
    [id, userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}

// POST: Make a move in a multiplayer game
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { from, to, promotion } = body;

  // Validate move input
  const squareRegex = /^[a-h][1-8]$/;
  if (!from || !to || !squareRegex.test(from) || !squareRegex.test(to)) {
    return NextResponse.json({ error: 'Invalid move: from and to must be valid squares (e.g. e2, e4)' }, { status: 400 });
  }
  if (promotion !== undefined && !/^[qrbn]$/.test(promotion)) {
    return NextResponse.json({ error: 'Invalid promotion piece' }, { status: 400 });
  }

  // Fetch the game
  const gameResult = await pool.query(
    `SELECT * FROM multiplayer_games WHERE id = $1 AND (white_user_id = $2 OR black_user_id = $2)`,
    [id, userId]
  );

  if (gameResult.rows.length === 0) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const gameRow = gameResult.rows[0];

  if (gameRow.result !== 'in_progress') {
    return NextResponse.json({ error: 'Game is already over' }, { status: 400 });
  }

  // Load the game state
  const chess = new Chess(gameRow.fen);

  // Verify it's this player's turn
  const isWhite = gameRow.white_user_id === userId;
  const isBlack = gameRow.black_user_id === userId;
  const currentTurn = chess.turn(); // 'w' or 'b'

  if ((currentTurn === 'w' && !isWhite) || (currentTurn === 'b' && !isBlack)) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
  }

  // Time control enforcement
  const tc = parseTimeControl(gameRow.time_control);
  let whiteTimeMs: number | null = gameRow.white_time_remaining_ms;
  let blackTimeMs: number | null = gameRow.black_time_remaining_ms;
  const now = Date.now();

  if (tc) {
    const lastTimestamp: number | null = gameRow.last_move_timestamp
      ? Number(gameRow.last_move_timestamp)
      : null;

    if (lastTimestamp !== null) {
      const elapsed = now - lastTimestamp;

      if (currentTurn === 'w') {
        whiteTimeMs = (whiteTimeMs ?? tc.baseMs) - elapsed;
        if (whiteTimeMs <= 0) {
          await pool.query(
            `UPDATE multiplayer_games
             SET result = 'black_wins', completed_at = NOW(),
                 white_time_remaining_ms = 0, last_move_timestamp = $1
             WHERE id = $2`,
            [now, id]
          );
          return NextResponse.json({
            success: false,
            result: 'black_wins',
            reason: 'timeout',
            white_time_remaining_ms: 0,
            black_time_remaining_ms: blackTimeMs,
          });
        }
      } else {
        blackTimeMs = (blackTimeMs ?? tc.baseMs) - elapsed;
        if (blackTimeMs <= 0) {
          await pool.query(
            `UPDATE multiplayer_games
             SET result = 'white_wins', completed_at = NOW(),
                 black_time_remaining_ms = 0, last_move_timestamp = $1
             WHERE id = $2`,
            [now, id]
          );
          return NextResponse.json({
            success: false,
            result: 'white_wins',
            reason: 'timeout',
            white_time_remaining_ms: whiteTimeMs,
            black_time_remaining_ms: 0,
          });
        }
      }
    }
  }

  // Try the move
  const move = chess.move({ from, to, promotion });
  if (!move) {
    return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
  }

  // Apply increment to the player who just moved
  if (tc) {
    if (currentTurn === 'w') {
      whiteTimeMs = (whiteTimeMs ?? tc.baseMs) + tc.incrementMs;
    } else {
      blackTimeMs = (blackTimeMs ?? tc.baseMs) + tc.incrementMs;
    }
  }

  // Update game state
  const newFen = chess.fen();
  const pgn = chess.pgn();
  const movesList = gameRow.moves ? gameRow.moves + ',' + move.san : move.san;

  let result = 'in_progress';
  let completedAt = null;
  if (chess.isCheckmate()) {
    result = currentTurn === 'w' ? 'white_wins' : 'black_wins';
    completedAt = new Date();
  } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    result = 'draw';
    completedAt = new Date();
  }

  await pool.query(
    `UPDATE multiplayer_games
     SET fen = $1, pgn = $2, moves = $3, result = $4, completed_at = $5,
         last_move_at = NOW(), white_time_remaining_ms = $6,
         black_time_remaining_ms = $7, last_move_timestamp = $8
     WHERE id = $9`,
    [newFen, pgn, movesList, result, completedAt, whiteTimeMs, blackTimeMs, now, id]
  );

  return NextResponse.json({
    success: true,
    fen: newFen,
    pgn,
    move: { from: move.from, to: move.to, san: move.san },
    result,
    white_time_remaining_ms: whiteTimeMs,
    black_time_remaining_ms: blackTimeMs,
  });
}

// PATCH: Resign or offer/accept draw
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

  const validActions = ['resign', 'offer_draw', 'accept_draw', 'decline_draw'];
  if (!action || !validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const gameResult = await pool.query(
    `SELECT * FROM multiplayer_games WHERE id = $1 AND (white_user_id = $2 OR black_user_id = $2)`,
    [id, userId]
  );

  if (gameResult.rows.length === 0) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const gameRow = gameResult.rows[0];

  if (gameRow.result !== 'in_progress') {
    return NextResponse.json({ error: 'Game is already over' }, { status: 400 });
  }

  if (action === 'resign') {
    const isWhite = gameRow.white_user_id === userId;
    const result = isWhite ? 'black_wins' : 'white_wins';
    await pool.query(
      'UPDATE multiplayer_games SET result = $1, completed_at = NOW() WHERE id = $2',
      [result, id]
    );
    return NextResponse.json({ success: true, result });
  }

  if (action === 'offer_draw') {
    await pool.query(
      'UPDATE multiplayer_games SET draw_offered_by = $1 WHERE id = $2',
      [userId, id]
    );
    return NextResponse.json({ success: true, drawOffered: true });
  }

  if (action === 'accept_draw') {
    if (gameRow.draw_offered_by && gameRow.draw_offered_by !== userId) {
      await pool.query(
        'UPDATE multiplayer_games SET result = $1, completed_at = NOW(), draw_offered_by = NULL WHERE id = $2',
        ['draw', id]
      );
      return NextResponse.json({ success: true, result: 'draw' });
    }
    return NextResponse.json({ error: 'No draw offer to accept' }, { status: 400 });
  }

  if (action === 'decline_draw') {
    await pool.query(
      'UPDATE multiplayer_games SET draw_offered_by = NULL WHERE id = $1',
      [id]
    );
    return NextResponse.json({ success: true, drawDeclined: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
