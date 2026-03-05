'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import AppShell from '@/components/AppShell';
import ChessBoard from '@/components/ChessBoard';
import { getPieceSvg } from '@/components/ChessPieces';
import { getSettings, updateSettings } from '@/lib/settings';
import { getBestMove, parseUciMove, destroyEngine, DIFFICULTY_PRESETS, EngineConfig } from '@/lib/engine';
import FenInput from '@/components/FenInput';
import ZenMode from '@/components/ZenMode';
import { copyFenToClipboard, downloadPgn } from '@/lib/gameExport';
import { downloadBoardImage } from '@/lib/boardImage';
import { useSwipe } from '@/lib/useSwipe';
import styles from './play.module.css';

function formatMoveTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = (ms / 1000).toFixed(1);
  return `${s}s`;
}

const PIECE_ORDER: Record<string, number> = { q: 0, r: 1, b: 2, n: 3, p: 4 };

function getCapturedPieces(game: Chess, color: 'w' | 'b'): PieceSymbol[] {
  const start: Record<string, number> = { p: 8, r: 2, n: 2, b: 2, q: 1 };
  const onBoard: Record<string, number> = { p: 0, r: 0, n: 0, b: 0, q: 0 };
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq && sq.color === color && sq.type !== 'k') {
        onBoard[sq.type]++;
      }
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

function cloneGame(game: Chess): Chess {
  const g = new Chess();
  const pgn = game.pgn();
  if (pgn) g.loadPgn(pgn);
  return g;
}

type GameMode = 'local' | 'ai';
type SetupState = { mode: GameMode; playerColor: Color; difficulty: string } | null;

function GameSetup({ onStart }: { onStart: (mode: GameMode, playerColor: Color, difficulty: string) => void }) {
  const [mode, setMode] = useState<GameMode>('ai');
  const [color, setColor] = useState<'w' | 'b' | 'random'>('w');
  const [difficulty, setDifficulty] = useState('intermediate');

  function handleStart() {
    const playerColor = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    onStart(mode, playerColor, difficulty);
  }

  return (
    <div className={styles.setupOverlay}>
      <div className={styles.setupCard}>
        <h2 className={styles.setupTitle}>New Game</h2>

        <div className={styles.setupSection}>
          <label className={styles.setupLabel}>Game Mode</label>
          <div className={styles.setupOptions}>
            <button
              className={`${styles.setupOption} ${mode === 'ai' ? styles.setupOptionActive : ''}`}
              onClick={() => setMode('ai')}
            >
              <span className={styles.setupOptionIcon}>&#x1F916;</span>
              <span>vs Computer</span>
            </button>
            <button
              className={`${styles.setupOption} ${mode === 'local' ? styles.setupOptionActive : ''}`}
              onClick={() => setMode('local')}
            >
              <span className={styles.setupOptionIcon}>&#x1F465;</span>
              <span>Local 2-Player</span>
            </button>
          </div>
        </div>

        {mode === 'ai' && (
          <>
            <div className={styles.setupSection}>
              <label className={styles.setupLabel}>Play as</label>
              <div className={styles.setupOptions}>
                <button
                  className={`${styles.setupOption} ${color === 'w' ? styles.setupOptionActive : ''}`}
                  onClick={() => setColor('w')}
                >
                  <span className={styles.setupPiece}>{getPieceSvg('w', 'k')}</span>
                  <span>White</span>
                </button>
                <button
                  className={`${styles.setupOption} ${color === 'random' ? styles.setupOptionActive : ''}`}
                  onClick={() => setColor('random')}
                >
                  <span className={styles.setupOptionIcon}>&#x1F3B2;</span>
                  <span>Random</span>
                </button>
                <button
                  className={`${styles.setupOption} ${color === 'b' ? styles.setupOptionActive : ''}`}
                  onClick={() => setColor('b')}
                >
                  <span className={styles.setupPiece}>{getPieceSvg('b', 'k')}</span>
                  <span>Black</span>
                </button>
              </div>
            </div>

            <div className={styles.setupSection}>
              <label className={styles.setupLabel}>Difficulty</label>
              <div className={styles.difficultyGrid}>
                {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    className={`${styles.difficultyBtn} ${difficulty === key ? styles.difficultyBtnActive : ''}`}
                    onClick={() => setDifficulty(key)}
                  >
                    <span className={styles.difficultyName}>{preset.label}</span>
                    <span className={styles.difficultyElo}>{preset.elo}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <button className={styles.startBtn} onClick={handleStart}>
          Play
        </button>
      </div>
    </div>
  );
}

export default function PlayPage() {
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [savedMsg, setSavedMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('classic');
  const [viewIndex, setViewIndex] = useState(0);
  const [showSetup, setShowSetup] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [engineConfig, setEngineConfig] = useState<EngineConfig>({ depth: 8, skillLevel: 10 });
  const [engineThinking, setEngineThinking] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [showFenInput, setShowFenInput] = useState(false);
  const [lastSetup, setLastSetup] = useState<{ mode: GameMode; color: Color; difficulty: string } | null>(null);
  const [moveTimestamps, setMoveTimestamps] = useState<number[]>([]);
  const lastMoveTime = useRef(Date.now());
  const moveListRef = useRef<HTMLDivElement>(null);
  const engineMoveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const history = game.history({ verbose: true });
  const totalMoves = history.length;

  // Load saved theme
  useEffect(() => {
    const s = getSettings();
    if (s.boardTheme) setCurrentTheme(s.boardTheme);
  }, []);

  // Cleanup engine on unmount
  useEffect(() => {
    return () => {
      destroyEngine();
      if (engineMoveTimer.current) clearTimeout(engineMoveTimer.current);
    };
  }, []);

  // Build view game for replay navigation
  const viewGame = (() => {
    if (viewIndex === totalMoves) return game;
    const g = new Chess();
    for (let i = 0; i < viewIndex; i++) {
      g.move(history[i].san);
    }
    return g;
  })();

  const viewLastMove = (() => {
    if (viewIndex === 0) return null;
    if (viewIndex === totalMoves) return lastMove;
    const m = history[viewIndex - 1];
    return { from: m.from, to: m.to };
  })();

  const isViewingHistory = viewIndex < totalMoves;
  const isGameOver = game.isGameOver();
  const isPlayerTurn = gameMode === 'local' || game.turn() === playerColor;

  // Auto-scroll move list
  useEffect(() => {
    if (moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
    }
  }, [totalMoves]);

  // Engine move
  const makeEngineMove = useCallback(async (currentGame: Chess) => {
    if (currentGame.isGameOver()) return;
    if (gameMode !== 'ai') return;
    if (currentGame.turn() === playerColor) return;

    setEngineThinking(true);

    // Small delay so the board visually updates before engine starts
    engineMoveTimer.current = setTimeout(async () => {
      try {
        const uci = await getBestMove(currentGame.fen(), engineConfig);
        const parsed = parseUciMove(uci);
        const newGame = cloneGame(currentGame);
        const move = newGame.move({
          from: parsed.from as Square,
          to: parsed.to as Square,
          promotion: parsed.promotion as PieceSymbol | undefined,
        });
        if (move) {
          setLastMove({ from: move.from, to: move.to });
          setGame(newGame);
          setViewIndex(newGame.history().length);
          if (newGame.isGameOver()) doAutoSave(newGame);
        }
      } catch (err) {
        console.error('Engine error:', err);
      } finally {
        setEngineThinking(false);
      }
    }, 300);
  }, [gameMode, playerColor, engineConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  function getStatus(): string {
    const g = isViewingHistory ? viewGame : game;
    const turn = g.turn() === 'w' ? 'White' : 'Black';
    if (g.isCheckmate()) {
      const winner = g.turn() === 'w' ? 'Black' : 'White';
      return `Checkmate! ${winner} wins!`;
    }
    if (g.isStalemate()) return 'Stalemate — Draw!';
    if (g.isThreefoldRepetition()) return 'Draw by repetition!';
    if (g.isInsufficientMaterial()) return 'Draw — Insufficient material!';
    if (g.isDraw()) return 'Draw!';
    if (g.isCheck()) return `${turn} is in check!`;
    if (isViewingHistory) return `Move ${viewIndex} of ${totalMoves}`;
    if (engineThinking) return 'Engine is thinking...';
    return `${turn} to move`;
  }

  function getResult(): string {
    if (game.isCheckmate()) return game.turn() === 'w' ? 'black_wins' : 'white_wins';
    if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) return 'draw';
    return 'in_progress';
  }

  const handleMove = useCallback((from: Square, to: Square, promotion?: PieceSymbol) => {
    if (isViewingHistory) return;
    if (gameMode === 'ai' && game.turn() !== playerColor) return;

    const newGame = cloneGame(game);
    const move = newGame.move({ from, to, promotion });
    if (move) {
      const now = Date.now();
      const elapsed = now - lastMoveTime.current;
      setMoveTimestamps(prev => [...prev, elapsed]);
      lastMoveTime.current = now;
      setLastMove({ from: move.from, to: move.to });
      setGame(newGame);
      setViewIndex(newGame.history().length);
      if (newGame.isGameOver()) {
        doAutoSave(newGame);
      } else if (gameMode === 'ai') {
        makeEngineMove(newGame);
      }
    }
  }, [game, isViewingHistory, gameMode, playerColor, makeEngineMove]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doAutoSave(g: Chess) {
    try {
      const result = g.isCheckmate()
        ? (g.turn() === 'w' ? 'black_wins' : 'white_wins')
        : 'draw';
      const opponentLabel = gameMode === 'ai'
        ? `Stockfish (${DIFFICULTY_PRESETS[Object.entries(DIFFICULTY_PRESETS).find(([, p]) => p.depth === engineConfig.depth && p.skillLevel === engineConfig.skillLevel)?.[0] || 'custom']?.label || 'Custom'})`
        : 'Local';
      await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn: g.pgn(), result, movesCount: g.history().length, opponent: opponentLabel }),
      });
      setSavedMsg('Game saved automatically!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch { /* silent */ }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn: game.pgn(), result: getResult(), movesCount: totalMoves }),
      });
      if (res.ok) {
        setSavedMsg('Game saved!');
        setTimeout(() => setSavedMsg(''), 3000);
      }
    } catch {
      setSavedMsg('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function handleNewGame() {
    destroyEngine();
    if (engineMoveTimer.current) clearTimeout(engineMoveTimer.current);
    setEngineThinking(false);
    setGame(new Chess());
    setLastMove(null);
    setSavedMsg('');
    setViewIndex(0);
    setMoveTimestamps([]);
    lastMoveTime.current = Date.now();
    setShowSetup(true);
  }

  function handleStartGame(mode: GameMode, color: Color, difficulty: string) {
    const preset = DIFFICULTY_PRESETS[difficulty];
    setGameMode(mode);
    setPlayerColor(color);
    setFlipped(color === 'b');
    setLastSetup({ mode, color, difficulty });
    if (preset) {
      setEngineConfig({ depth: preset.depth, skillLevel: preset.skillLevel });
    }
    setGame(new Chess());
    setLastMove(null);
    setViewIndex(0);
    setMoveTimestamps([]);
    lastMoveTime.current = Date.now();
    setShowSetup(false);

    // If AI plays first (player is black), trigger engine move
    if (mode === 'ai' && color === 'b') {
      const newGame = new Chess();
      setTimeout(() => makeEngineMove(newGame), 500);
    }
  }

  function handlePlayAgain() {
    if (lastSetup) {
      handleStartGame(lastSetup.mode, lastSetup.color, lastSetup.difficulty);
    } else {
      handleNewGame();
    }
  }

  function handleRetryFromPosition() {
    if (viewIndex <= 0) return;
    const newGame = new Chess();
    for (let i = 0; i < viewIndex; i++) {
      newGame.move(history[i].san);
    }
    setGame(newGame);
    setViewIndex(newGame.history().length);
    const h = newGame.history({ verbose: true });
    if (h.length > 0) {
      setLastMove({ from: h[h.length - 1].from, to: h[h.length - 1].to });
    }
  }

  function handleLoadFen(fen: string) {
    const newGame = new Chess(fen);
    setGame(newGame);
    setLastMove(null);
    setViewIndex(0);
    setShowFenInput(false);
    setShowSetup(false);
  }

  function undoMove() {
    const newG = cloneGame(game);
    // In AI mode, undo both the engine move and the player move
    if (gameMode === 'ai' && totalMoves >= 2) {
      newG.undo();
      newG.undo();
    } else {
      newG.undo();
    }
    setGame(newG);
    const h = newG.history({ verbose: true });
    setViewIndex(h.length);
    if (h.length > 0) {
      const prev = h[h.length - 1];
      setLastMove({ from: prev.from, to: prev.to });
    } else {
      setLastMove(null);
    }
  }

  function handleThemeChange(theme: string) {
    setCurrentTheme(theme);
    updateSettings({ boardTheme: theme });
  }

  // Move navigation
  function goFirst() { setViewIndex(0); }
  function goPrev() { setViewIndex(v => Math.max(0, v - 1)); }
  function goNext() { setViewIndex(v => Math.min(totalMoves, v + 1)); }
  function goLast() { setViewIndex(totalMoves); }

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (showSetup) return;
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); goPrev(); break;
        case 'ArrowRight': e.preventDefault(); goNext(); break;
        case 'Home': e.preventDefault(); goFirst(); break;
        case 'End': e.preventDefault(); goLast(); break;
        case 'f': if (!e.ctrlKey && !e.metaKey) setFlipped(f => !f); break;
        case 'z': if (!e.ctrlKey && !e.metaKey) setZenMode(z => !z); break;
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [totalMoves, showSetup]); // eslint-disable-line react-hooks/exhaustive-deps

  // Captured pieces
  const blackCaptured = getCapturedPieces(viewGame, 'b');
  const whiteCaptured = getCapturedPieces(viewGame, 'w');

  // Build move rows
  const moveRows: React.ReactNode[] = [];
  for (let i = 0; i < totalMoves; i += 2) {
    const whiteIdx = i;
    const blackIdx = i + 1;
    moveRows.push(
      <div key={`row-${i}`} className={styles.moveRow}>
        <span className={styles.moveNumber}>{Math.floor(i / 2) + 1}.</span>
        <span
          className={`${styles.move} ${viewIndex === whiteIdx + 1 ? styles.moveActive : ''}`}
          onClick={() => setViewIndex(whiteIdx + 1)}
        >
          {history[whiteIdx].san}
          {moveTimestamps[whiteIdx] !== undefined && (
            <span className={styles.moveTime}>{formatMoveTime(moveTimestamps[whiteIdx])}</span>
          )}
        </span>
        {blackIdx < totalMoves ? (
          <span
            className={`${styles.move} ${viewIndex === blackIdx + 1 ? styles.moveActive : ''}`}
            onClick={() => setViewIndex(blackIdx + 1)}
          >
            {history[blackIdx].san}
            {moveTimestamps[blackIdx] !== undefined && (
              <span className={styles.moveTime}>{formatMoveTime(moveTimestamps[blackIdx])}</span>
            )}
          </span>
        ) : <span />}
      </div>
    );
  }

  const swipeHandlers = useSwipe(goNext, goPrev);

  const statusText = getStatus();
  const isCheck = !isViewingHistory && game.isCheck();

  if (showSetup) {
    return (
      <AppShell>
        <GameSetup onStart={handleStartGame} />
      </AppShell>
    );
  }

  const content = (
    <AppShell>
      {showFenInput && (
        <div className={styles.fenOverlay}>
          <FenInput onSubmit={handleLoadFen} onCancel={() => setShowFenInput(false)} />
        </div>
      )}
      <div className={styles.layout}>
        <div className={styles.boardColumn} {...swipeHandlers}>
          <ChessBoard
            className={styles.playBoard}
            externalGame={viewGame}
            onMoveRequest={handleMove}
            hideControls
            initialFlipped={flipped}
            externalLastMove={viewLastMove}
            readOnly={isViewingHistory || isGameOver || !isPlayerTurn || engineThinking}
            theme={currentTheme}
          />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.statusBar}>
              <div className={`${styles.statusText} ${isCheck ? styles.check : ''} ${isGameOver ? styles.gameOver : ''}`}>
                {engineThinking && <span className={styles.thinkingDot}>&#x25CF; </span>}
                {statusText}
              </div>
              {savedMsg && <div className={styles.savedMsg}>{savedMsg}</div>}
              {gameMode === 'ai' && !isGameOver && (
                <div className={styles.opponentInfo}>
                  vs Stockfish ({DIFFICULTY_PRESETS[Object.entries(DIFFICULTY_PRESETS).find(([, p]) => p.depth === engineConfig.depth && p.skillLevel === engineConfig.skillLevel)?.[0] || 'custom']?.label || 'Custom'})
                </div>
              )}
            </div>

            <div className={styles.capturedRow}>
              {(flipped ? whiteCaptured : blackCaptured).map((t, i) => (
                <span key={i} className={styles.capturedPiece}>{getPieceSvg(flipped ? 'w' : 'b', t)}</span>
              ))}
            </div>

            <div className={styles.moveListContainer} ref={moveListRef}>
              <div className={styles.moveList}>
                {moveRows}
              </div>
            </div>

            <div className={styles.capturedRow}>
              {(flipped ? blackCaptured : whiteCaptured).map((t, i) => (
                <span key={i} className={styles.capturedPiece}>{getPieceSvg(flipped ? 'b' : 'w', t)}</span>
              ))}
            </div>
          </div>

          <div className={styles.panelBottom}>
            {/* Move navigation */}
            <div className={styles.toolbar}>
              <button className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={goFirst} disabled={viewIndex === 0} title="First move">&#x23EE;</button>
              <button className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={goPrev} disabled={viewIndex === 0} title="Previous move">&#x25C0;</button>
              <button className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={goNext} disabled={viewIndex === totalMoves} title="Next move">&#x25B6;</button>
              <button className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={goLast} disabled={viewIndex === totalMoves} title="Last move">&#x23ED;</button>
              <div className={styles.toolSpacer} />
              <button className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={() => setFlipped(f => !f)} title="Flip board (F)">&#x21C5;</button>
            </div>

            {/* Game controls */}
            <div className={styles.toolbar}>
              <button className={styles.toolBtn} onClick={handleNewGame}>New Game</button>
              {isGameOver && (
                <button className={styles.toolBtn} onClick={handlePlayAgain}>Play Again</button>
              )}
              {isViewingHistory && !isGameOver && (
                <button className={styles.toolBtn} onClick={handleRetryFromPosition}>Retry Here</button>
              )}
              <button className={styles.toolBtn} onClick={undoMove} disabled={totalMoves === 0 || engineThinking}>Undo</button>
              <button
                className={`${styles.toolBtn} ${styles.saveBtn}`}
                onClick={handleSave}
                disabled={saving || totalMoves === 0}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Extra controls */}
            <div className={styles.toolbar}>
              <button className={styles.toolBtn} onClick={() => setShowFenInput(true)} title="Load position from FEN">Load FEN</button>
              <button className={`${styles.toolBtn} ${zenMode ? styles.toolBtnActive : ''}`} onClick={() => setZenMode(z => !z)} title="Zen mode (Z)">Zen</button>
              <div className={styles.toolSpacer} />
              <button
                className={styles.toolBtn}
                onClick={() => copyFenToClipboard(viewGame.fen()).then(() => { setSavedMsg('FEN copied!'); setTimeout(() => setSavedMsg(''), 2000); })}
                title="Copy FEN to clipboard"
              >
                Copy FEN
              </button>
              <button
                className={styles.toolBtn}
                onClick={() => downloadPgn(game.history(), { result: isGameOver ? (game.isCheckmate() ? (game.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2') : '*' })}
                disabled={totalMoves === 0}
                title="Download game as PGN"
              >
                PGN
              </button>
              <button
                className={styles.toolBtn}
                onClick={() => downloadBoardImage(viewGame.fen())}
                title="Download board as PNG image"
              >
                &#x1F4F7; PNG
              </button>
            </div>

            {/* Theme */}
            <div className={styles.themeRow}>
              <span className={styles.themeLabel}>Theme:</span>
              <select className={styles.themeSelect} value={currentTheme} onChange={e => handleThemeChange(e.target.value)}>
                <option value="classic">Classic</option>
                <option value="green">Green</option>
                <option value="brown">Brown</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );

  return (
    <ZenMode enabled={zenMode} onToggle={() => setZenMode(z => !z)}>
      {content}
    </ZenMode>
  );
}
