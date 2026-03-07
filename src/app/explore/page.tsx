'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import AppShell from '@/components/AppShell';
import ChessBoard from '@/components/ChessBoard';
import MoveTree from '@/components/MoveTree';
import { getSettings } from '@/lib/settings';
import styles from './explore.module.css';

interface MoveData {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
}

interface ExploreData {
  white: number;
  draws: number;
  black: number;
  moves: MoveData[];
  opening?: { name: string };
}

function cloneGame(game: Chess): Chess {
  const g = new Chess();
  const pgn = game.pgn();
  if (pgn) g.loadPgn(pgn);
  return g;
}

export default function ExplorePage() {
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('classic');

  const [exploreData, setExploreData] = useState<ExploreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [repertoireStatus, setRepertoireStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const repertoireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dbSource, setDbSource] = useState<'local' | 'lichess'>('local');

  // Move history for breadcrumbs
  const history = game.history({ verbose: true });
  const sanHistory = game.history();

  // Load saved theme
  useEffect(() => {
    const s = getSettings();
    if (s.boardTheme) setCurrentTheme(s.boardTheme);
  }, []);

  // Fetch explore data whenever position or source changes
  const fetchExploreData = useCallback(async (fen: string, source: 'local' | 'lichess') => {
    setLoading(true);
    setError(null);
    try {
      if (source === 'lichess') {
        const res = await fetch(
          `https://explorer.lichess.ovh/lichess?fen=${encodeURIComponent(fen)}&ratings=1600,1800,2000,2200,2500&speeds=blitz,rapid,classical`
        );
        if (!res.ok) throw new Error('Failed to fetch Lichess data');
        const data = await res.json();
        const moves: MoveData[] = (data.moves || []).map((m: any) => ({
          uci: m.uci,
          san: m.san,
          white: m.white || 0,
          draws: m.draws || 0,
          black: m.black || 0,
        }));
        setExploreData({
          white: data.white || 0,
          draws: data.draws || 0,
          black: data.black || 0,
          moves,
          opening: data.opening ? { name: data.opening.name } : undefined,
        });
      } else {
        const res = await fetch(`/api/openings/explore?fen=${encodeURIComponent(fen)}`);
        if (!res.ok) throw new Error('Failed to fetch opening data');
        const data: ExploreData = await res.json();
        setExploreData(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setExploreData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExploreData(game.fen(), dbSource);
  }, [game, dbSource, fetchExploreData]);

  // Handle move made on the board
  const handleMove = useCallback((from: Square, to: Square, promotion?: PieceSymbol) => {
    const newGame = cloneGame(game);
    const move = newGame.move({ from, to, promotion });
    if (move) {
      setLastMove({ from: move.from, to: move.to });
      setGame(newGame);
    }
  }, [game]);

  // Handle selecting a move from the MoveTree
  const handleSelectMove = useCallback((uci: string) => {
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    const promotion = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;

    const newGame = cloneGame(game);
    const move = newGame.move({ from, to, promotion });
    if (move) {
      setLastMove({ from: move.from, to: move.to });
      setGame(newGame);
    }
  }, [game]);

  // Navigate to a specific point in the move history
  function goToMove(index: number) {
    const newGame = new Chess();
    for (let i = 0; i < index; i++) {
      newGame.move(history[i].san);
    }
    if (index > 0) {
      const m = history[index - 1];
      setLastMove({ from: m.from, to: m.to });
    } else {
      setLastMove(null);
    }
    setGame(newGame);
  }

  // Reset to starting position
  function handleReset() {
    setGame(new Chess());
    setLastMove(null);
  }

  // Undo last move
  function handleUndo() {
    if (history.length === 0) return;
    const newGame = cloneGame(game);
    newGame.undo();
    const h = newGame.history({ verbose: true });
    if (h.length > 0) {
      const prev = h[h.length - 1];
      setLastMove({ from: prev.from, to: prev.to });
    } else {
      setLastMove(null);
    }
    setGame(newGame);
  }

  // Position stats
  const totalGames = exploreData
    ? exploreData.white + exploreData.draws + exploreData.black
    : 0;

  const turn = game.turn() === 'w' ? 'White' : 'Black';

  async function handleAddToRepertoire() {
    if (history.length === 0) return;
    setRepertoireStatus('saving');
    try {
      const openingName = exploreData?.opening?.name || `Custom Line: ${sanHistory.slice(0, 4).join(' ')}`;
      const playerColor = history[0].color; // color of the first move
      const moves = sanHistory;
      const res = await fetch('/api/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: openingName,
          description: `Added from explorer: ${sanHistory.join(' ')}`,
          playerColor,
          thumbnailFen: game.fen(),
          lines: [{ name: 'Main Line', moves }],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      setRepertoireStatus('saved');
    } catch {
      setRepertoireStatus('error');
    }
    if (repertoireTimerRef.current) clearTimeout(repertoireTimerRef.current);
    repertoireTimerRef.current = setTimeout(() => setRepertoireStatus('idle'), 3000);
  }

  return (
    <AppShell>
      <div className={styles.layout}>
        <div className={styles.boardColumn}>
          <ChessBoard
            className={styles.exploreBoard}
            externalGame={game}
            onMoveRequest={handleMove}
            hideControls
            initialFlipped={flipped}
            externalLastMove={lastMove}
            theme={currentTheme}
          />
        </div>

        <div className={styles.panel}>
          {/* Header with title and breadcrumbs */}
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>Opening Explorer</div>

            <div className={styles.breadcrumbs}>
              <span
                className={styles.breadcrumbStart}
                onClick={handleReset}
              >
                Start
              </span>
              {sanHistory.map((san, i) => (
                <span key={i} style={{ display: 'contents' }}>
                  <span className={styles.breadcrumbSep}>&rsaquo;</span>
                  <span
                    className={`${styles.breadcrumbMove} ${
                      i === sanHistory.length - 1 ? styles.breadcrumbCurrent : ''
                    }`}
                    onClick={() => goToMove(i + 1)}
                  >
                    {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{san}
                  </span>
                </span>
              ))}
            </div>

            {exploreData?.opening?.name && (
              <div className={styles.openingName}>{exploreData.opening.name}</div>
            )}
          </div>

          {/* Database source toggle */}
          <div className={styles.dbToggle}>
            <button
              className={`${styles.dbToggleBtn} ${dbSource === 'local' ? styles.dbToggleBtnActive : ''}`}
              onClick={() => setDbSource('local')}
            >
              Local
            </button>
            <button
              className={`${styles.dbToggleBtn} ${dbSource === 'lichess' ? styles.dbToggleBtnActive : ''}`}
              onClick={() => setDbSource('lichess')}
            >
              Lichess
            </button>
          </div>

          {/* Position stats summary */}
          {exploreData && totalGames > 0 && (
            <div className={styles.positionStats}>
              <span className={styles.statTotal}>
                {totalGames.toLocaleString()} {dbSource === 'lichess' ? 'games' : (totalGames === 1 ? 'line' : 'lines')}
              </span>
              {dbSource === 'lichess' && totalGames > 0 && (
                <div className={styles.wdlBar}>
                  <div className={styles.wdlW} style={{ width: `${(exploreData.white / totalGames) * 100}%` }}>
                    {Math.round((exploreData.white / totalGames) * 100)}%
                  </div>
                  <div className={styles.wdlD} style={{ width: `${(exploreData.draws / totalGames) * 100}%` }}>
                    {Math.round((exploreData.draws / totalGames) * 100)}%
                  </div>
                  <div className={styles.wdlB} style={{ width: `${(exploreData.black / totalGames) * 100}%` }}>
                    {Math.round((exploreData.black / totalGames) * 100)}%
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Move tree */}
          <div className={styles.moveTreeArea}>
            {loading ? (
              <div className={styles.loading}>
                <span className={styles.loadingDot}>&#x25CF;</span>
                Loading moves...
              </div>
            ) : error ? (
              <div className={styles.error}>{error}</div>
            ) : exploreData ? (
              <MoveTree
                moves={exploreData.moves}
                onSelectMove={handleSelectMove}
              />
            ) : null}
          </div>

          {/* Turn indicator */}
          <div className={styles.turnIndicator}>{turn} to move</div>

          {/* Bottom controls */}
          <div className={styles.panelBottom}>
            <div className={styles.toolbar}>
              <button
                className={`${styles.toolBtn} ${styles.toolBtnIcon}`}
                onClick={handleUndo}
                disabled={history.length === 0}
                title="Undo last move"
              >
                &#x25C0;
              </button>
              <button
                className={styles.toolBtn}
                onClick={handleReset}
                disabled={history.length === 0}
              >
                Reset
              </button>
              <button
                className={`${styles.toolBtn} ${styles.toolBtnIcon}`}
                onClick={() => setFlipped(f => !f)}
                title="Flip board"
              >
                &#x21C5;
              </button>
              <div className={styles.toolSpacer} />
              <button
                className={`${styles.toolBtn} ${styles.repertoireBtn}`}
                disabled={history.length === 0 || repertoireStatus === 'saving'}
                title="Add current line to your repertoire"
                onClick={handleAddToRepertoire}
              >
                {repertoireStatus === 'saving' ? 'Saving...' :
                 repertoireStatus === 'saved' ? 'Saved!' :
                 repertoireStatus === 'error' ? 'Failed' :
                 '+ Repertoire'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
