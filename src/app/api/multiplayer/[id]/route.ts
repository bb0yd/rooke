import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Chess } from 'chess.js';

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
  const { from, to, promotion } = await req.json();

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

  // Try the move
  const move = chess.move({ from, to, promotion });
  if (!move) {
    return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
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
     SET fen = $1, pgn = $2, moves = $3, result = $4, completed_at = $5, last_move_at = NOW()
     WHERE id = $6`,
    [newFen, pgn, movesList, result, completedAt, id]
  );

  return NextResponse.json({
    success: true,
    fen: newFen,
    pgn,
    move: { from: move.from, to: move.to, san: move.san },
    result,
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
  const { action } = await req.json(); // 'resign' or 'draw'

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
