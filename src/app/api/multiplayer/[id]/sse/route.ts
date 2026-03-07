import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;

  // Verify the user is a participant or allow spectators
  const check = await pool.query(
    'SELECT id FROM multiplayer_games WHERE id = $1',
    [id]
  );
  if (check.rows.length === 0) {
    return new Response('Not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(eventType: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream already closed
        }
      }

      function sendHeartbeat() {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Stream already closed
        }
      }

      // Send initial game state
      const initial = await pool.query(
        `SELECT mg.*, w.username as white_username, b.username as black_username
         FROM multiplayer_games mg
         JOIN users w ON mg.white_user_id = w.id
         JOIN users b ON mg.black_user_id = b.id
         WHERE mg.id = $1`,
        [id]
      );

      if (initial.rows.length === 0) {
        controller.close();
        return;
      }

      const initialRow = initial.rows[0];
      send('game_state', initialRow);

      let lastFen = initialRow.fen || '';
      let lastResult = initialRow.result || '';
      let lastDrawOfferedBy = initialRow.draw_offered_by;
      let lastMoves = initialRow.moves || '';
      let heartbeatCounter = 0;

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        try {
          const result = await pool.query(
            `SELECT mg.*, w.username as white_username, b.username as black_username
             FROM multiplayer_games mg
             JOIN users w ON mg.white_user_id = w.id
             JOIN users b ON mg.black_user_id = b.id
             WHERE mg.id = $1`,
            [id]
          );

          if (result.rows.length === 0) {
            clearInterval(interval);
            if (!closed) {
              closed = true;
              controller.close();
            }
            return;
          }

          const row = result.rows[0];
          const fenChanged = row.fen !== lastFen;
          const resultChanged = row.result !== lastResult;
          const drawChanged = row.draw_offered_by !== lastDrawOfferedBy;
          const movesChanged = row.moves !== lastMoves;

          if (fenChanged || resultChanged || drawChanged || movesChanged) {
            // Send full game state on any change
            send('game_state', row);

            // Send specific events for targeted handling
            if (fenChanged || movesChanged) {
              send('move', {
                fen: row.fen,
                pgn: row.pgn,
                moves: row.moves,
                white_time_remaining_ms: row.white_time_remaining_ms,
                black_time_remaining_ms: row.black_time_remaining_ms,
                last_move_timestamp: row.last_move_timestamp,
              });
            }

            if (resultChanged && row.result !== 'in_progress') {
              send('game_over', {
                result: row.result,
                fen: row.fen,
                pgn: row.pgn,
              });
            }

            if (drawChanged) {
              send('draw_update', {
                draw_offered_by: row.draw_offered_by,
              });
            }

            lastFen = row.fen;
            lastResult = row.result;
            lastDrawOfferedBy = row.draw_offered_by;
            lastMoves = row.moves;
          }

          // Send heartbeat every ~15 seconds to keep connection alive
          heartbeatCounter++;
          if (heartbeatCounter >= 10) {
            sendHeartbeat();
            heartbeatCounter = 0;
          }

          // Close stream if game is over (give client time to process the game_over event)
          if (row.result !== 'in_progress') {
            // Send one final heartbeat, then close after a short delay
            setTimeout(() => {
              clearInterval(interval);
              if (!closed) {
                closed = true;
                try { controller.close(); } catch { /* already closed */ }
              }
            }, 3000);
          }
        } catch {
          clearInterval(interval);
          if (!closed) {
            closed = true;
            try { controller.close(); } catch { /* already closed */ }
          }
        }
      }, 1500);

      // Handle client disconnect via AbortSignal
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
