'use client';

import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import styles from './ChessBoard.module.css';
import { getPieceSvg } from './ChessPieces';
import MoveArrow from './MoveArrow';
import { playMoveSound, playCaptureSound, playCheckSound, playPreMoveSound } from '@/lib/sounds';

interface AnimatingPiece {
  color: Color;
  type: PieceSymbol;
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
}

type BoardSnapshot = ({ color: Color; type: PieceSymbol } | null)[][];

function snapshotBoard(game: Chess): BoardSnapshot {
  return game.board().map(row => row.map(sq => sq ? { color: sq.color, type: sq.type } : null));
}

function squareToCoords(sq: string): [number, number] {
  const file = sq.charCodeAt(0) - 97; // a=0
  const rank = parseInt(sq[1]) - 1;   // 1=0
  return [file, rank];
}

function displayCoords(file: number, rank: number, flipped: boolean): [number, number] {
  const col = flipped ? 7 - file : file;
  const row = flipped ? rank : 7 - rank;
  return [col, row];
}

const THEMES: Record<string, { light: string; dark: string }> = {
  classic: { light: '#eae9d4', dark: '#507297' },
  green:   { light: '#eeeed2', dark: '#769656' },
  brown:   { light: '#f0d9b5', dark: '#b58863' },
  dark:    { light: '#ddd',    dark: '#555' },
};

const PIECE_ORDER: Record<string, number> = { q: 0, r: 1, b: 2, n: 3, p: 4 };

interface LastMove {
  from: string;
  to: string;
}

interface Props {
  readOnly?: boolean;
  initialPgn?: string;
  externalGame?: Chess;
  onMoveRequest?: (from: Square, to: Square, promotion?: PieceSymbol) => void;
  hideControls?: boolean;
  initialFlipped?: boolean;
  externalLastMove?: { from: string; to: string } | null;
  hintSquare?: string | null;
  className?: string;
  theme?: string;
  arrow?: { from: string; to: string; color?: string };
  blindfold?: boolean;
  allowPreMove?: boolean;
  onPreMove?: (from: string, to: string) => void;
}

function coordsToSquare(col: number, row: number): Square {
  return (String.fromCharCode(97 + col) + (row + 1)) as Square;
}

function getCapturedPieces(game: Chess, color: Color): PieceSymbol[] {
  const start: Record<string, number> = { p: 8, r: 2, n: 2, b: 2, q: 1 };
  const onBoard: Record<string, number> = { p: 0, r: 0, n: 0, b: 0, q: 0 };
  const board = game.board();
  for (const row of board) {
    for (const sq of row) {
      if (sq && sq.color === color && sq.type !== 'k') {
        onBoard[sq.type]++;
      }
    }
  }
  const captured: PieceSymbol[] = [];
  for (const [type, max] of Object.entries(start)) {
    const diff = max - (onBoard[type] || 0);
    for (let i = 0; i < diff; i++) {
      captured.push(type as PieceSymbol);
    }
  }
  captured.sort((a, b) => (PIECE_ORDER[a] ?? 99) - (PIECE_ORDER[b] ?? 99));
  return captured;
}

// Clone a Chess instance by copying its PGN (preserves full history)
function cloneGame(game: Chess): Chess {
  const g = new Chess();
  const pgn = game.pgn();
  if (pgn) g.loadPgn(pgn);
  return g;
}

export default function ChessBoard({
  readOnly = false,
  initialPgn,
  externalGame,
  onMoveRequest,
  hideControls = false,
  initialFlipped = false,
  externalLastMove,
  hintSquare,
  className,
  theme: externalTheme,
  arrow,
  blindfold = false,
  allowPreMove = false,
  onPreMove,
}: Props) {
  const [game, setGame] = useState<Chess>(() => {
    const g = new Chess();
    if (initialPgn) g.loadPgn(initialPgn);
    return g;
  });
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [flipped, setFlipped] = useState(initialFlipped);
  const [currentTheme, setCurrentTheme] = useState(externalTheme || 'classic');
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [savedMsg, setSavedMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const skipAnimRef = useRef(false);
  const activeGame = externalGame ?? game;
  const displayLastMove = externalLastMove !== undefined ? externalLastMove : lastMove;
  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; sq: Square } | null>(null);
  const prevBoardRef = useRef<BoardSnapshot | null>(null);
  const [animating, setAnimating] = useState<AnimatingPiece[]>([]);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [boardSize, setBoardSize] = useState(0);
  const [preMoveFrom, setPreMoveFrom] = useState<Square | null>(null);
  const [preMoveTo, setPreMoveTo] = useState<Square | null>(null);
  const prevFenRef = useRef<string>(activeGame.fen());

  // Track board pixel size for MoveArrow
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const update = () => setBoardSize(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Check and execute pre-move when the board updates (opponent moved)
  useEffect(() => {
    const currentFen = activeGame.fen();
    if (currentFen === prevFenRef.current) return;
    prevFenRef.current = currentFen;

    if (preMoveFrom && preMoveTo && allowPreMove && onPreMove) {
      // Check if the pre-move is now legal
      try {
        const testGame = new Chess(activeGame.fen());
        const move = testGame.move({ from: preMoveFrom, to: preMoveTo });
        if (move) {
          onPreMove(preMoveFrom, preMoveTo);
        }
      } catch {
        // Pre-move is not legal, just clear it
      }
      setPreMoveFrom(null);
      setPreMoveTo(null);
    }
  }, [activeGame, preMoveFrom, preMoveTo, allowPreMove, onPreMove]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external theme prop
  useEffect(() => {
    if (externalTheme) setCurrentTheme(externalTheme);
  }, [externalTheme]);

  // Reset orientation when a parent-driven board changes sides between exercises.
  useEffect(() => {
    setFlipped(initialFlipped);
  }, [initialFlipped]);

  // Detect board changes and trigger animation (useLayoutEffect to avoid ghost frame)
  useLayoutEffect(() => {
    const currentBoard = snapshotBoard(activeGame);
    const prev = prevBoardRef.current;
    prevBoardRef.current = currentBoard;

    if (!prev) return; // first render, no animation

    // Determine if it was a capture (pieces were removed from one side)
    const isCapture = (() => {
      // Quick check: count pieces per color on old vs new board
      let oldCount = 0, newCount = 0;
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          if (prev[r][f]) oldCount++;
          if (currentBoard[r][f]) newCount++;
        }
      }
      return newCount < oldCount;
    })();

    // Skip animation for drag moves (piece already at destination via ghost)
    if (skipAnimRef.current) {
      skipAnimRef.current = false;
      // Still play sound for drag moves
      if (activeGame.isCheck()) playCheckSound();
      else if (isCapture) playCaptureSound();
      else playMoveSound();
      return;
    }

    // Find what moved: a square that had a piece and now doesn't → "from"
    // A square that now has a piece that wasn't there (or different piece) → "to"
    let fromFile = -1, fromRank = -1;
    let toFile = -1, toRank = -1;
    let movedPiece: { color: Color; type: PieceSymbol } | null = null;

    // Handle castling: detect king move specifically (the rook also moves but we animate the king)
    // General approach: find removed pieces and added pieces
    const removed: { file: number; rank: number; color: Color; type: PieceSymbol }[] = [];
    const added: { file: number; rank: number; color: Color; type: PieceSymbol }[] = [];

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const oldPiece = prev[7 - rank][file];
        const newPiece = currentBoard[7 - rank][file];
        const same = oldPiece && newPiece && oldPiece.color === newPiece.color && oldPiece.type === newPiece.type;
        if (oldPiece && !same) {
          removed.push({ file, rank, color: oldPiece.color, type: oldPiece.type });
        }
        if (newPiece && !same) {
          added.push({ file, rank, color: newPiece.color, type: newPiece.type });
        }
      }
    }

    // Match: find pieces that were removed and added with same color+type
    const animPieces: AnimatingPiece[] = [];
    for (const a of added) {
      const matchIdx = removed.findIndex(r => r.color === a.color && r.type === a.type);
      if (matchIdx !== -1) {
        const r = removed[matchIdx];
        if (r.file !== a.file || r.rank !== a.rank) {
          const [fc, fr] = displayCoords(r.file, r.rank, flipped);
          const [tc, tr] = displayCoords(a.file, a.rank, flipped);
          animPieces.push({
            color: a.color,
            type: a.type,
            fromCol: fc,
            fromRow: fr,
            toCol: tc,
            toRow: tr,
          });
        }
        removed.splice(matchIdx, 1);
      }
    }

    if (animPieces.length > 0) {
      if (activeGame.isCheck()) playCheckSound();
      else if (isCapture) playCaptureSound();
      else playMoveSound();
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      setAnimating(animPieces);
      animTimerRef.current = setTimeout(() => {
        setAnimating([]);
        animTimerRef.current = null;
      }, 150);
    }
  }, [activeGame, flipped]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute legal moves for the selected square (memoized)
  const legalMoves: Move[] = useMemo(() => {
    if (!selectedSquare || readOnly) return [];
    return activeGame.moves({ square: selectedSquare, verbose: true });
  }, [selectedSquare, readOnly, activeGame]);

  function getStatus(): string {
    const turn = activeGame.turn() === 'w' ? 'White' : 'Black';
    if (activeGame.isCheckmate()) {
      const winner = activeGame.turn() === 'w' ? 'Black' : 'White';
      return `Checkmate! ${winner} wins!`;
    }
    if (activeGame.isStalemate()) return 'Stalemate — Draw!';
    if (activeGame.isThreefoldRepetition()) return 'Draw by repetition!';
    if (activeGame.isInsufficientMaterial()) return 'Draw — Insufficient material!';
    if (activeGame.isDraw()) return 'Draw!';
    if (activeGame.isCheck()) return `${turn} is in check!`;
    return `${turn} to move`;
  }

  function getResult(): string {
    if (activeGame.isCheckmate()) {
      return activeGame.turn() === 'w' ? 'black_wins' : 'white_wins';
    }
    if (activeGame.isDraw() || activeGame.isStalemate() || activeGame.isThreefoldRepetition() || activeGame.isInsufficientMaterial()) {
      return 'draw';
    }
    return 'in_progress';
  }

  function doMove(from: Square, to: Square, promotion?: PieceSymbol) {
    if (onMoveRequest) {
      onMoveRequest(from, to, promotion);
      setSelectedSquare(null);
      setDragFrom(null);
      return;
    }
    const newGame = cloneGame(game);
    const move = newGame.move({ from, to, promotion });
    if (move) {
      setLastMove({ from: move.from, to: move.to });
      setGame(newGame);
      // Auto-save on game over
      if (newGame.isGameOver()) {
        doAutoSave(newGame);
      }
    }
    setSelectedSquare(null);
  }

  async function doAutoSave(g: Chess) {
    try {
      const result = g.isCheckmate()
        ? (g.turn() === 'w' ? 'black_wins' : 'white_wins')
        : 'draw';
      await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pgn: g.pgn(),
          result,
          movesCount: g.history().length,
        }),
      });
      setSavedMsg('Game saved automatically!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch {
      // silent fail
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pgn: game.pgn(),
          result: getResult(),
          movesCount: game.history().length,
        }),
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

  function handlePromotion(type: PieceSymbol) {
    if (pendingPromotion) {
      doMove(pendingPromotion.from, pendingPromotion.to, type);
      setPendingPromotion(null);
    }
  }

  const getSquareFromPoint = useCallback((clientX: number, clientY: number): Square | null => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const sqSize = rect.width / 8;
    const col = Math.floor(x / sqSize);
    const row = Math.floor(y / sqSize);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    const actualCol = flipped ? 7 - col : col;
    const actualRow = flipped ? row : 7 - row;
    return coordsToSquare(actualCol, actualRow);
  }, [flipped]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const tag = (e.target as HTMLElement).tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setFlipped(f => !f);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSelectedSquare(null);
      setPendingPromotion(null);
      setPreMoveFrom(null);
      setPreMoveTo(null);
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (pendingPromotion) return;

    // Pre-move handling when readOnly and allowPreMove
    if (readOnly && allowPreMove) {
      const sq = getSquareFromPoint(e.clientX, e.clientY);
      if (!sq) return;

      // If we already selected a pre-move source, this click sets the target
      if (preMoveFrom) {
        const piece = activeGame.get(sq);
        const srcPiece = activeGame.get(preMoveFrom);
        // If clicking the same square or another piece of the same color, re-select
        if (sq === preMoveFrom) {
          setPreMoveFrom(null);
          setPreMoveTo(null);
          return;
        }
        if (piece && srcPiece && piece.color === srcPiece.color) {
          setPreMoveFrom(sq);
          setPreMoveTo(null);
          return;
        }
        // Set target for pre-move
        setPreMoveTo(sq);
        playPreMoveSound();
        return;
      }

      // Select a piece of the player's color for pre-move
      // Determine player color: if flipped, player is black; otherwise white
      const playerColor: Color = flipped ? 'b' : 'w';
      const piece = activeGame.get(sq);
      if (piece && piece.color === playerColor) {
        setPreMoveFrom(sq);
        setPreMoveTo(null);
      } else {
        setPreMoveFrom(null);
        setPreMoveTo(null);
      }
      return;
    }

    if (readOnly) return;
    const sq = getSquareFromPoint(e.clientX, e.clientY);
    if (!sq) return;

    // If there's a selected piece and this square is a legal move target → execute move
    if (selectedSquare) {
      const target = legalMoves.find(m => m.to === sq);
      if (target) {
        const isPromotion = legalMoves.some(m => m.to === sq && m.flags.includes('p'));
        if (isPromotion) {
          setPendingPromotion({ from: selectedSquare, to: sq });
          return;
        }
        doMove(selectedSquare, sq);
        return;
      }
    }

    // Select a piece of the current turn's color
    const piece = activeGame.get(sq);
    if (piece && piece.color === activeGame.turn()) {
      setSelectedSquare(sq);
      dragStartRef.current = { x: e.clientX, y: e.clientY, sq };
      boardRef.current?.setPointerCapture(e.pointerId);
    } else {
      setSelectedSquare(null);
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5 && !dragFrom) {
      setDragFrom(dragStartRef.current.sq);
    }

    if (ghostRef.current && (dragFrom || dist > 5)) {
      const sqSize = boardRef.current ? boardRef.current.getBoundingClientRect().width / 8 : 80;
      ghostRef.current.style.left = `${e.clientX - sqSize / 2}px`;
      ghostRef.current.style.top = `${e.clientY - sqSize / 2}px`;
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    try {
      boardRef.current?.releasePointerCapture(e.pointerId);
    } catch { /* ignore if not captured */ }

    if (dragFrom) {
      const targetSq = getSquareFromPoint(e.clientX, e.clientY);
      if (targetSq && targetSq !== dragFrom) {
        // Compute legal moves for the drag source
        const moves = activeGame.moves({ square: dragFrom, verbose: true });
        const target = moves.find(m => m.to === targetSq);
        if (target) {
          const isPromotion = moves.some(m => m.to === targetSq && m.flags.includes('p'));
          if (isPromotion) {
            setPendingPromotion({ from: dragFrom, to: targetSq });
          } else {
            skipAnimRef.current = true;
            doMove(dragFrom, targetSq);
          }
        }
      }
      setDragFrom(null);
      setSelectedSquare(null);
    }

    dragStartRef.current = null;
  }

  function newGame() {
    setGame(new Chess());
    setSelectedSquare(null);
    setLastMove(null);
    setPendingPromotion(null);
    setSavedMsg('');
  }

  function undoMove() {
    const newGame = cloneGame(game);
    newGame.undo();
    setGame(newGame);
    setSelectedSquare(null);
    const history = newGame.history({ verbose: true });
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setLastMove({ from: prev.from, to: prev.to });
    } else {
      setLastMove(null);
    }
  }

  // Render — memoize expensive computations
  const theme = THEMES[currentTheme];
  const board = useMemo(() => activeGame.board(), [activeGame]);
  const kingSquare = useMemo<Square | null>(() => {
    if (!activeGame.isCheck()) return null;
    const turn = activeGame.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn) {
          return coordsToSquare(c, 7 - r);
        }
      }
    }
    return null;
  }, [activeGame, board]);

  const blackCaptured = useMemo(() => getCapturedPieces(activeGame, 'b'), [activeGame]);
  const whiteCaptured = useMemo(() => getCapturedPieces(activeGame, 'w'), [activeGame]);
  const legalTargets = useMemo(() => new Set(legalMoves.map(m => m.to)), [legalMoves]);
  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = flipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const moveCount = activeGame.history().length;

  return (
    <div className={`${styles.container}${className ? ` ${className}` : ''}`} style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      {!readOnly && !hideControls && (
        <div className={styles.controls}>
          <button onClick={newGame}>New Game</button>
          <button onClick={undoMove}>Undo Move</button>
          <button onClick={() => setFlipped(!flipped)}>Flip Board</button>
          <label>
            Theme:{' '}
            <select value={currentTheme} onChange={e => setCurrentTheme(e.target.value)}>
              <option value="classic">Classic</option>
              <option value="green">Green</option>
              <option value="brown">Brown</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || moveCount === 0}
          >
            {saving ? 'Saving...' : 'Save Game'}
          </button>
        </div>
      )}

      {!hideControls && (
        <>
          <div className={styles.status}>{getStatus()}</div>
          {savedMsg && <div className={styles.savedMsg}>{savedMsg}</div>}

          <div className={styles.capturedRow}>
            {blackCaptured.map((t, i) => (
              <span key={i} className={styles.capturedPiece}>{getPieceSvg('b', t)}</span>
            ))}
          </div>
        </>
      )}

      <div className={styles.boardWrapper}>
        <div className={styles.rankLabels}>
          {ranks.map(r => (
            <span key={r} className={styles.rankLabel}>{r}</span>
          ))}
        </div>
        <div className={styles.boardAndFiles}>
          <div className={styles.boardContainer}>
            <div
              className={styles.board}
              ref={boardRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {Array.from({ length: 64 }).map((_, idx) => {
                const displayRow = Math.floor(idx / 8);
                const displayCol = idx % 8;
                const actualRow = flipped ? displayRow : 7 - displayRow;
                const actualCol = flipped ? 7 - displayCol : displayCol;
                const sq = coordsToSquare(actualCol, actualRow);
                const piece = board[7 - actualRow][actualCol];

                const isLight = (actualCol + actualRow) % 2 === 1;
                const bgColor = isLight ? theme.light : theme.dark;

                const classes = [styles.square];
                if (selectedSquare === sq) classes.push(styles.selected);
                if (legalTargets.has(sq)) {
                  if (piece) classes.push(styles.legalCapture);
                  else classes.push(styles.legalMove);
                }
                if (displayLastMove) {
                  if (sq === displayLastMove.from) classes.push(styles.lastMoveFrom);
                  if (sq === displayLastMove.to) classes.push(styles.lastMoveTo);
                }
                if (kingSquare === sq) classes.push(styles.checkFlash);
                if (hintSquare === sq) classes.push(styles.hintSquare);
                if (preMoveFrom === sq || preMoveTo === sq) classes.push(styles.preMove);

                // Hide piece at destination during animation (it's being shown as the flying piece)
                const isAnimDest = animating.length > 0 && piece && animating.some(a =>
                  displayCol === a.toCol && displayRow === a.toRow &&
                  piece.color === a.color && piece.type === a.type
                );

                return (
                  <div
                    key={sq}
                    className={classes.join(' ')}
                    style={{ background: bgColor }}
                  >
                    {piece && (
                      <div className={`${styles.piece} ${dragFrom === sq ? styles.dragging : ''} ${isAnimDest ? styles.pieceHidden : ''} ${blindfold ? styles.blindfolded : ''}`}>
                        {getPieceSvg(piece.color, piece.type)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {animating.map((anim, i) => (
              <div
                key={i}
                className={styles.animPiece}
                style={{
                  '--anim-from-col': anim.fromCol,
                  '--anim-from-row': anim.fromRow,
                  '--anim-to-col': anim.toCol,
                  '--anim-to-row': anim.toRow,
                } as React.CSSProperties}
              >
                {getPieceSvg(anim.color, anim.type)}
              </div>
            ))}
            {arrow && boardSize > 0 && (
              <MoveArrow
                from={arrow.from}
                to={arrow.to}
                color={arrow.color}
                flipped={flipped}
                boardSize={boardSize}
              />
            )}
          </div>
          <div className={styles.fileLabels}>
            {files.map(f => (
              <span key={f} className={styles.fileLabel}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {!hideControls && (
        <div className={styles.capturedRow}>
          {whiteCaptured.map((t, i) => (
            <span key={i} className={styles.capturedPiece}>{getPieceSvg('w', t)}</span>
          ))}
        </div>
      )}

      {pendingPromotion && (
        <div className={styles.promotionOverlay}>
          <div className={styles.promotionDialog}>
            <h3>Promote pawn to:</h3>
            <div className={styles.promotionPieces}>
              {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map(type => (
                <div
                  key={type}
                  className={styles.promotionPiece}
                  onClick={() => handlePromotion(type)}
                >
                  {getPieceSvg(activeGame.turn(), type)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        ref={ghostRef}
        className={styles.dragGhost}
        style={{ display: dragFrom ? 'flex' : 'none' }}
      >
        {dragFrom && activeGame.get(dragFrom) &&
          getPieceSvg(activeGame.get(dragFrom)!.color, activeGame.get(dragFrom)!.type)}
      </div>
    </div>
  );
}
