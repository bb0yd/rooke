'use client';

import { useState, useCallback } from 'react';
import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import styles from './ChessBoard.module.css';

const THEMES: Record<string, { light: string; dark: string }> = {
  classic: { light: '#f0e4c8', dark: '#b0c4de' },
  green:   { light: '#eeeed2', dark: '#769656' },
  brown:   { light: '#f0d9b5', dark: '#b58863' },
  dark:    { light: '#ddd',    dark: '#555' },
};

const PIECE_UNICODE: Record<string, string> = {
  wK: '\u265A', wQ: '\u265B', wR: '\u265C', wB: '\u265D', wN: '\u265E', wP: '\u265F',
  bK: '\u265A', bQ: '\u265B', bR: '\u265C', bB: '\u265D', bN: '\u265E', bP: '\u265F',
};

const PIECE_ORDER: Record<string, number> = { q: 0, r: 1, b: 2, n: 3, p: 4 };

interface LastMove {
  from: string;
  to: string;
}

interface Props {
  readOnly?: boolean;
  initialPgn?: string;
}

function getPieceKey(color: Color, type: PieceSymbol): string {
  return (color === 'w' ? 'w' : 'b') + type.toUpperCase();
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

export default function ChessBoard({ readOnly = false, initialPgn }: Props) {
  const [game, setGame] = useState<Chess>(() => {
    const g = new Chess();
    if (initialPgn) g.loadPgn(initialPgn);
    return g;
  });
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('classic');
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [savedMsg, setSavedMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Compute legal moves for the selected square on each render
  const legalMoves: Move[] = selectedSquare && !readOnly
    ? game.moves({ square: selectedSquare, verbose: true })
    : [];

  function getStatus(): string {
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      return `Checkmate! ${winner} wins!`;
    }
    if (game.isStalemate()) return 'Stalemate — Draw!';
    if (game.isThreefoldRepetition()) return 'Draw by repetition!';
    if (game.isInsufficientMaterial()) return 'Draw — Insufficient material!';
    if (game.isDraw()) return 'Draw!';
    if (game.isCheck()) return `${turn} is in check!`;
    return `${turn} to move`;
  }

  function getResult(): string {
    if (game.isCheckmate()) {
      return game.turn() === 'w' ? 'black_wins' : 'white_wins';
    }
    if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
      return 'draw';
    }
    return 'in_progress';
  }

  function doMove(from: Square, to: Square, promotion?: PieceSymbol) {
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

  function onSquareClick(sq: Square) {
    if (pendingPromotion || readOnly) return;

    // If there's a selected piece and this square is a legal move target
    if (selectedSquare) {
      const legalTarget = legalMoves.find(m => m.to === sq);
      if (legalTarget) {
        const isPromotion = legalMoves.some(m => m.to === sq && m.flags.includes('p'));
        if (isPromotion) {
          setPendingPromotion({ from: selectedSquare, to: sq });
          return;
        }
        doMove(selectedSquare, sq);
        return;
      }
    }

    // Select a piece
    const piece = game.get(sq);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(sq);
    } else {
      setSelectedSquare(null);
    }
  }

  function handlePromotion(type: PieceSymbol) {
    if (pendingPromotion) {
      doMove(pendingPromotion.from, pendingPromotion.to, type);
      setPendingPromotion(null);
    }
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

  // Render
  const theme = THEMES[currentTheme];
  const board = game.board();
  const kingInCheck = game.isCheck();
  let kingSquare: Square | null = null;
  if (kingInCheck) {
    const turn = game.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn) {
          kingSquare = coordsToSquare(c, 7 - r);
        }
      }
    }
  }

  const blackCaptured = getCapturedPieces(game, 'b');
  const whiteCaptured = getCapturedPieces(game, 'w');
  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = flipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const moveCount = game.history().length;

  return (
    <div className={styles.container}>
      {!readOnly && (
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

      <div className={styles.status}>{getStatus()}</div>
      {savedMsg && <div className={styles.savedMsg}>{savedMsg}</div>}

      <div className={styles.capturedRow}>
        {blackCaptured.map((t, i) => (
          <span key={i} className={styles.blackPiece}>{PIECE_UNICODE['b' + t.toUpperCase()]}</span>
        ))}
      </div>

      <div className={styles.boardWrapper}>
        <div className={styles.rankLabels}>
          {ranks.map(r => (
            <span key={r} className={styles.rankLabel}>{r}</span>
          ))}
        </div>
        <div className={styles.boardAndFiles}>
          <div className={styles.boardContainer}>
            <div className={styles.board}>
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
                if (legalMoves.some(m => m.to === sq)) {
                  if (piece) classes.push(styles.legalCapture);
                  else classes.push(styles.legalMove);
                }
                if (lastMove) {
                  if (sq === lastMove.from) classes.push(styles.lastMoveFrom);
                  if (sq === lastMove.to) classes.push(styles.lastMoveTo);
                }
                if (kingSquare === sq) classes.push(styles.inCheck);

                let pieceClass = '';
                let symbol = '';
                if (piece) {
                  symbol = PIECE_UNICODE[getPieceKey(piece.color, piece.type)] || '';
                  pieceClass = piece.color === 'w' ? styles.whitePiece : styles.blackPiece;
                }

                return (
                  <div
                    key={sq}
                    className={[...classes, pieceClass].filter(Boolean).join(' ')}
                    style={{ background: bgColor }}
                    onClick={() => onSquareClick(sq)}
                  >
                    {symbol}
                  </div>
                );
              })}
            </div>
          </div>
          <div className={styles.fileLabels}>
            {files.map(f => (
              <span key={f} className={styles.fileLabel}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.capturedRow}>
        {whiteCaptured.map((t, i) => (
          <span key={i} className={styles.whitePiece}>{PIECE_UNICODE['w' + t.toUpperCase()]}</span>
        ))}
      </div>

      {pendingPromotion && (
        <div className={styles.promotionOverlay}>
          <div className={styles.promotionDialog}>
            <h3>Promote pawn to:</h3>
            <div className={styles.promotionPieces}>
              {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map(type => {
                const color = game.turn();
                const key = getPieceKey(color, type);
                return (
                  <div
                    key={type}
                    className={`${styles.promotionPiece} ${color === 'w' ? styles.whitePiece : styles.blackPiece}`}
                    onClick={() => handlePromotion(type)}
                  >
                    {PIECE_UNICODE[key]}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
