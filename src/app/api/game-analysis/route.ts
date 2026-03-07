import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);

  // Return unanalyzed game IDs
  if (searchParams.get('unanalyzed') === 'true') {
    // Get local games not yet analyzed
    const localResult = await pool.query(
      `SELECT g.id, g.pgn, 'local' as source FROM games g
       LEFT JOIN game_analysis ga ON ga.game_id = g.id AND ga.user_id = $1
       WHERE g.user_id = $1 AND g.result != 'in_progress' AND g.pgn IS NOT NULL AND g.pgn != '' AND ga.id IS NULL
       ORDER BY g.created_at DESC LIMIT 20`,
      [userId]
    );

    // Get multiplayer games not yet analyzed
    const mpResult = await pool.query(
      `SELECT mg.id, mg.pgn, 'multiplayer' as source,
              CASE WHEN mg.white_user_id = $1 THEN 'w' ELSE 'b' END as player_color
       FROM multiplayer_games mg
       LEFT JOIN game_analysis ga ON ga.multiplayer_game_id = mg.id AND ga.user_id = $1
       WHERE (mg.white_user_id = $1 OR mg.black_user_id = $1)
         AND mg.result != 'in_progress' AND mg.pgn IS NOT NULL AND mg.pgn != ''
         AND ga.id IS NULL
       ORDER BY mg.started_at DESC LIMIT 20`,
      [userId]
    );

    return NextResponse.json({
      games: [...localResult.rows, ...mpResult.rows],
    });
  }

  // Return all analyses for this user
  const result = await pool.query(
    `SELECT * FROM game_analysis WHERE user_id = $1 ORDER BY analyzed_at DESC LIMIT 50`,
    [userId]
  );

  return NextResponse.json({ analyses: result.rows });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const {
    gameId, multiplayerGameId, accuracy, blunders, mistakes, inaccuracies,
    hungPieces, missedTactics, phaseAccuracy, moves,
  } = body;

  if (!gameId && !multiplayerGameId) {
    return NextResponse.json({ error: 'gameId or multiplayerGameId required' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `INSERT INTO game_analysis (user_id, game_id, multiplayer_game_id, accuracy, blunders, mistakes, inaccuracies, hung_pieces, missed_tactics, phase_accuracy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [userId, gameId || null, multiplayerGameId || null, accuracy, blunders, mistakes, inaccuracies,
       hungPieces, JSON.stringify(missedTactics || []), JSON.stringify(phaseAccuracy || {})]
    );

    const analysisId = result.rows[0].id as number;

    if (Array.isArray(moves) && moves.length > 0) {
      try {
        const values: unknown[] = [];
        const placeholders = moves.map((move: any, index: number) => {
          const base = index * 14;
          values.push(
            analysisId,
            userId,
            move.moveNumber,
            move.plyIndex,
            move.playerColor,
            move.fenBefore || null,
            move.san,
            move.bestMoveUci || null,
            move.bestMove || null,
            move.cpLoss,
            move.classification,
            move.phase,
            Boolean(move.hungPiece),
            move.mistakeTheme || null,
          );

          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14})`;
        });

        await pool.query(
          `INSERT INTO game_analysis_moves
             (analysis_id, user_id, move_number, ply_index, player_color, fen_before, move_san, best_move_uci, best_move_san, cp_loss, classification, phase, is_hung_piece, mistake_theme)
           VALUES ${placeholders.join(', ')}`,
          values,
        );
      } catch (moveError) {
        console.error('Game analysis move save error:', moveError);
      }
    }

    return NextResponse.json({ id: analysisId, success: true });
  } catch (error) {
    console.error('Game analysis save error:', error);
    return NextResponse.json({ error: 'Failed to save game analysis' }, { status: 500 });
  }
}
