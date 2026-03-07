'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Chess, PieceSymbol } from 'chess.js';
import AppShell from '@/components/AppShell';
import ChessBoard from '@/components/ChessBoard';
import { getPieceSvg } from '@/components/ChessPieces';
import GameChat from '@/components/GameChat';
import { getSettings } from '@/lib/settings';
import styles from './spectate-game.module.css';

const PIECE_ORDER: Record<string, number> = { q: 0, r: 1, b: 2, n: 3, p: 4 };

function getCapturedPieces(game: Chess, color: 'w' | 'b'): PieceSymbol[] {
  const start: Record<string, number> = { p: 8, r: 2, n: 2, b: 2, q: 1 };
  const onBoard: Record<string, number> = { p: 0, r: 0, n: 0, b: 0, q: 0 };
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq && sq.color === color && sq.type !== 'k') onBoard[sq.type]++;
    }
  }
  const captured: PieceSymbol[] = [];
  for (const [type, max] of Object.entries(start)) {
    const diff = max - (onBoard[type] || 0);
    for (let i = 0; i < diff; i++) captured.push(type as PieceSymbol);
  }
  captured.sort((a, b) => (PIECE_ORDER[a] ?? 99) - (PIECE_ORDER[b] ?? 99));
  return captured;
}

interface SpectateData {
  id: number;
  white_username: string;
  black_username: string;
  fen: string;
  pgn: string;
  moves: string;
  result: string;
  time_control: string;
}

export default function SpectateGamePage() {
  const params = useParams();
  const gameId = params.id as string;

  const [gameData, setGameData] = useState<SpectateData | null>(null);
  const [boardTheme, setBoardTheme] = useState('classic');
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevFenRef = useRef<string>('');

  useEffect(() => {
    const s = getSettings();
    if (s.boardTheme) setBoardTheme(s.boardTheme);
  }, []);

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/multiplayer/${gameId}/spectate`);
      if (!res.ok) {
        setError('Game not found');
        return;
      }
      const data = await res.json();
      setGameData(data);

      if (data.fen !== prevFenRef.current && data.pgn) {
        const g = new Chess();
        try { g.loadPgn(data.pgn); } catch { /* */ }
        const h = g.history({ verbose: true });
        if (h.length > 0) {
          const last = h[h.length - 1];
          setLastMove({ from: last.from, to: last.to });
        }
        prevFenRef.current = data.fen;
      }
    } catch {
      if (!gameData) setError('Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchGame(); }, [fetchGame]);

  useEffect(() => {
    const interval = setInterval(fetchGame, 2000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  if (loading) {
    return (
      <AppShell>
        <div className={styles.page}>
          <p className={styles.loading}>Loading game...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !gameData) {
    return (
      <AppShell>
        <div className={styles.page}>
          <p className={styles.error}>{error || 'Game not found'}</p>
        </div>
      </AppShell>
    );
  }

  const game = new Chess();
  if (gameData.pgn) {
    try { game.loadPgn(gameData.pgn); } catch { /* */ }
  }

  const history = game.history();
  const blackCaptured = getCapturedPieces(game, 'b');
  const whiteCaptured = getCapturedPieces(game, 'w');
  const turn = game.turn() === 'w' ? 'White' : 'Black';
  const isOver = gameData.result !== 'in_progress';

  const resultLabel = (() => {
    switch (gameData.result) {
      case 'white_wins': return 'White Wins';
      case 'black_wins': return 'Black Wins';
      case 'draw': return 'Draw';
      default: return `${turn} to move`;
    }
  })();

  // Build move rows
  const moveRows: React.ReactNode[] = [];
  for (let i = 0; i < history.length; i += 2) {
    moveRows.push(
      <div key={i} className={styles.moveRow}>
        <span className={styles.moveNum}>{Math.floor(i / 2) + 1}.</span>
        <span className={styles.move}>{history[i]}</span>
        {i + 1 < history.length && <span className={styles.move}>{history[i + 1]}</span>}
      </div>
    );
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {gameData.white_username} vs {gameData.black_username}
          </h1>
          <span className={styles.liveBadge}>{isOver ? resultLabel : 'Live'}</span>
          <button className={styles.flipBtn} onClick={() => setFlipped(f => !f)} title="Flip board">
            &#x21C5;
          </button>
        </div>

        <div className={styles.layout}>
          <div className={styles.boardColumn}>
            <div className={styles.playerBar}>
              <span className={styles.playerName}>
                {flipped ? gameData.white_username : gameData.black_username}
              </span>
              <div className={styles.capturedRow}>
                {(flipped ? whiteCaptured : blackCaptured).map((t, i) => (
                  <span key={i} className={styles.capturedPiece}>{getPieceSvg(flipped ? 'w' : 'b', t)}</span>
                ))}
              </div>
            </div>

            <ChessBoard
              className={styles.spectateBoard}
              externalGame={game}
              readOnly
              hideControls
              initialFlipped={flipped}
              externalLastMove={lastMove}
              theme={boardTheme}
            />

            <div className={styles.playerBar}>
              <span className={styles.playerName}>
                {flipped ? gameData.black_username : gameData.white_username}
              </span>
              <div className={styles.capturedRow}>
                {(flipped ? blackCaptured : whiteCaptured).map((t, i) => (
                  <span key={i} className={styles.capturedPiece}>{getPieceSvg(flipped ? 'b' : 'w', t)}</span>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.status}>
              {isOver ? resultLabel : `${turn} to move`}
            </div>
            {gameData.time_control && gameData.time_control !== 'none' && (
              <div className={styles.timeControl}>Time control: {gameData.time_control}</div>
            )}
            <div className={styles.moveList}>
              {moveRows.length === 0 ? (
                <p className={styles.noMoves}>Waiting for first move...</p>
              ) : moveRows}
            </div>
            <GameChat gameId={gameId} currentUsername="" readOnly />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
