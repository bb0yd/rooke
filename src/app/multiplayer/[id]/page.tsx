'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Chess, Square, PieceSymbol } from 'chess.js';
import AppShell from '@/components/AppShell';
import ChessBoard from '@/components/ChessBoard';
import ChessClock from '@/components/ChessClock';
import GameChat from '@/components/GameChat';
import { getPieceSvg } from '@/components/ChessPieces';
import { getSettings } from '@/lib/settings';
import styles from './multiplayer-game.module.css';

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

interface GameData {
  id: number;
  white_user_id: number;
  black_user_id: number;
  white_username: string;
  black_username: string;
  fen: string;
  pgn: string;
  result: string;
  moves: string;
  time_control: string;
  draw_offered_by: number | null;
}

export default function MultiplayerGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [boardTheme, setBoardTheme] = useState('classic');
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'green' | 'yellow' | 'red'>('green');
  const [whiteTime, setWhiteTime] = useState<number>(0);
  const [blackTime, setBlackTime] = useState<number>(0);
  const [chatOpen, setChatOpen] = useState(false);
  const prevFenRef = useRef<string>('');
  const lastPollRef = useRef<number>(Date.now());
  const failCountRef = useRef(0);
  const clockInitRef = useRef(false);

  useEffect(() => {
    const s = getSettings();
    if (s.boardTheme) setBoardTheme(s.boardTheme);
  }, []);

  // Initialize clock times from time_control when game data first loads
  useEffect(() => {
    if (!gameData || clockInitRef.current) return;
    const tc = gameData.time_control;
    if (!tc || tc === 'none') return;
    const match = tc.match(/^(\d+)\+(\d+)$/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const initialMs = minutes * 60 * 1000;
      setWhiteTime(initialMs);
      setBlackTime(initialMs);
      clockInitRef.current = true;
    }
  }, [gameData]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.userId) setCurrentUserId(d.userId); })
      .catch(() => {});
  }, []);

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/multiplayer/${gameId}`);
      if (!res.ok) {
        setError('Game not found');
        return;
      }
      const data = await res.json();
      setGameData(data);
      failCountRef.current = 0;
      lastPollRef.current = Date.now();
      setConnectionStatus('green');

      if (data.fen !== prevFenRef.current && data.moves) {
        const g = new Chess();
        if (data.pgn) {
          try { g.loadPgn(data.pgn); } catch { /* */ }
        }
        const h = g.history({ verbose: true });
        if (h.length > 0) {
          const last = h[h.length - 1];
          setLastMove({ from: last.from, to: last.to });
        }
        prevFenRef.current = data.fen;
      }
    } catch {
      failCountRef.current++;
      if (failCountRef.current >= 3) setConnectionStatus('red');
      else setConnectionStatus('yellow');
      if (!gameData) setError('Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchGame(); }, [fetchGame]);

  // Poll every 1 second
  useEffect(() => {
    const interval = setInterval(fetchGame, 1000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  const handleMove = useCallback(async (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (!gameData || gameData.result !== 'in_progress') return;
    try {
      const res = await fetch(`/api/multiplayer/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, promotion }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastMove({ from: data.move.from, to: data.move.to });
        fetchGame();
      }
    } catch { /* silent */ }
  }, [gameData, gameId, fetchGame]);

  async function handleResign() {
    if (!confirm('Are you sure you want to resign?')) return;
    try {
      await fetch(`/api/multiplayer/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resign' }),
      });
      fetchGame();
    } catch { /* silent */ }
  }

  async function handleOfferDraw() {
    try {
      await fetch(`/api/multiplayer/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'offer_draw' }),
      });
      fetchGame();
    } catch { /* silent */ }
  }

  async function handleAcceptDraw() {
    try {
      await fetch(`/api/multiplayer/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept_draw' }),
      });
      fetchGame();
    } catch { /* silent */ }
  }

  async function handleDeclineDraw() {
    try {
      await fetch(`/api/multiplayer/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline_draw' }),
      });
      fetchGame();
    } catch { /* silent */ }
  }

  if (loading) {
    return <AppShell><div className={styles.loadingMsg}>Loading game...</div></AppShell>;
  }

  if (error || !gameData) {
    return <AppShell><div className={styles.errorMsg}>{error || 'Game not found'}</div></AppShell>;
  }

  const game = new Chess(gameData.fen);
  const isWhite = gameData.white_user_id === currentUserId;
  const isParticipant = gameData.white_user_id === currentUserId || gameData.black_user_id === currentUserId;
  const playerColor = isWhite ? 'w' : 'b';
  const opponentName = isWhite ? gameData.black_username : gameData.white_username;
  const currentTurn = game.turn();
  const isMyTurn = isParticipant && currentTurn === playerColor;
  const isGameOver = gameData.result !== 'in_progress';

  const hasClock = gameData.time_control && gameData.time_control !== 'none';
  const clockActiveColor: 'w' | 'b' | null = isGameOver ? null : currentTurn;

  const handleTimeout = useCallback((color: 'w' | 'b') => {
    if (color === 'w') setWhiteTime(0);
    else setBlackTime(0);
  }, []);

  const hasDrawOffer = gameData.draw_offered_by !== null;
  const isDrawOfferForMe = hasDrawOffer && gameData.draw_offered_by !== currentUserId;
  const iSentDrawOffer = hasDrawOffer && gameData.draw_offered_by === currentUserId;

  let statusText = '';
  let statusClass = styles.statusWaiting;
  if (!isParticipant) {
    statusText = 'Spectating';
  } else if (isGameOver) {
    if (gameData.result === 'white_wins') statusText = isWhite ? 'You won!' : `${gameData.white_username} wins!`;
    else if (gameData.result === 'black_wins') statusText = !isWhite ? 'You won!' : `${gameData.black_username} wins!`;
    else statusText = 'Draw!';
    statusClass = styles.statusGameOver;
  } else if (game.isCheck()) {
    statusText = isMyTurn ? 'You are in check!' : `${opponentName} is in check!`;
    statusClass = isMyTurn ? styles.statusMyTurn : styles.statusWaiting;
  } else {
    statusText = isMyTurn ? 'Your turn' : `Waiting for ${opponentName}...`;
    statusClass = isMyTurn ? styles.statusMyTurn : styles.statusWaiting;
  }

  const history = (() => {
    const g = new Chess();
    if (gameData.pgn) { try { g.loadPgn(gameData.pgn); } catch { /* */ } }
    return g.history({ verbose: true });
  })();
  const totalMoves = history.length;

  const blackCaptured = getCapturedPieces(game, 'b');
  const whiteCaptured = getCapturedPieces(game, 'w');

  const moveRows: React.ReactNode[] = [];
  for (let i = 0; i < totalMoves; i += 2) {
    moveRows.push(
      <div key={i} className={styles.moveRow}>
        <span className={styles.moveNumber}>{Math.floor(i / 2) + 1}.</span>
        <span className={styles.moveSan}>{history[i].san}</span>
        {i + 1 < totalMoves ? (
          <span className={styles.moveSan}>{history[i + 1].san}</span>
        ) : <span />}
      </div>
    );
  }

  return (
    <AppShell>
      <div className={styles.layout}>
        <div className={styles.boardColumn}>
          {hasClock && (
            <div className={styles.clockContainer}>
              <ChessClock
                whiteTimeMs={whiteTime}
                blackTimeMs={blackTime}
                activeColor={clockActiveColor}
                onTimeout={handleTimeout}
              />
            </div>
          )}
          <ChessBoard
            className={styles.mpBoard}
            externalGame={game}
            onMoveRequest={handleMove}
            hideControls
            initialFlipped={isParticipant ? !isWhite : false}
            externalLastMove={lastMove}
            readOnly={!isParticipant || !isMyTurn || isGameOver}
            theme={boardTheme}
          />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.opponentInfo}>
              <div className={styles.opponentLabel}>
                vs
                <span className={`${styles.connectionDot} ${styles[`connection${connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}`]}`} />
              </div>
              <div className={styles.opponentName}>{opponentName}</div>
              {isParticipant && (
                <div className={styles.playerInfo}>
                  You play as {isWhite ? 'White' : 'Black'}
                </div>
              )}
              {!isParticipant && (
                <div className={styles.playerInfo}>
                  {gameData.white_username} vs {gameData.black_username}
                </div>
              )}
            </div>

            <div className={`${styles.statusBox} ${statusClass}`}>
              {statusText}
            </div>

            {isDrawOfferForMe && !isGameOver && (
              <div className={styles.drawBanner}>
                <span className={styles.drawBannerText}>Your opponent offers a draw</span>
                <div className={styles.drawBannerActions}>
                  <button className={styles.drawAcceptBtn} onClick={handleAcceptDraw}>Accept</button>
                  <button className={styles.drawDeclineBtn} onClick={handleDeclineDraw}>Decline</button>
                </div>
              </div>
            )}

            {iSentDrawOffer && !isGameOver && (
              <div className={styles.drawBanner}>
                <span className={styles.drawBannerText}>Draw offer sent — waiting for response...</span>
              </div>
            )}

            <div className={styles.capturedRow}>
              {(isWhite ? blackCaptured : whiteCaptured).map((t, i) => (
                <span key={i} className={styles.capturedPiece}>
                  {getPieceSvg(isWhite ? 'b' : 'w', t)}
                </span>
              ))}
            </div>

            <div className={styles.moveList}>
              {moveRows}
            </div>

            <div className={styles.capturedRow}>
              {(isWhite ? whiteCaptured : blackCaptured).map((t, i) => (
                <span key={i} className={styles.capturedPiece}>
                  {getPieceSvg(isWhite ? 'w' : 'b', t)}
                </span>
              ))}
            </div>

            {isParticipant && (
              <div className={styles.chatSection}>
                <button
                  className={styles.chatToggle}
                  onClick={() => setChatOpen(o => !o)}
                >
                  {chatOpen ? 'Hide Chat ▾' : 'Show Chat ▸'}
                </button>
                {chatOpen && (
                  <GameChat gameId={gameId} currentUsername={isWhite ? gameData.white_username : gameData.black_username} />
                )}
              </div>
            )}
          </div>

          <div className={styles.panelBottom}>
            {isParticipant && !isGameOver && (
              <>
                <button className={styles.drawOfferBtn} onClick={handleOfferDraw} disabled={hasDrawOffer}>
                  {iSentDrawOffer ? 'Draw Offered' : 'Offer Draw'}
                </button>
                <button className={styles.resignBtn} onClick={handleResign}>
                  Resign
                </button>
              </>
            )}
            <button className={styles.btn} onClick={() => router.push('/multiplayer')}>
              &larr; Back to Lobby
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
