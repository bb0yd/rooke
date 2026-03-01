'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import ChessBoard from './ChessBoard';
import { getPieceSvg } from './ChessPieces';
import { Opening } from '@/data/openings';
import styles from './OpeningTrainer.module.css';

interface Props {
  opening: Opening;
}

function buildGameAtMove(moves: string[], upTo: number): Chess {
  const g = new Chess();
  for (let i = 0; i < upTo && i < moves.length; i++) {
    g.move(moves[i]);
  }
  return g;
}

function describeMove(san: string, isPlayerMove: boolean): string {
  const piece = san.startsWith('N') ? 'knight'
    : san.startsWith('B') ? 'bishop'
    : san.startsWith('R') ? 'rook'
    : san.startsWith('Q') ? 'queen'
    : san.startsWith('K') ? 'king'
    : san.startsWith('O-O-O') ? 'queenside castle'
    : san.startsWith('O-O') ? 'kingside castle'
    : 'pawn';

  if (san.startsWith('O-O')) {
    return isPlayerMove
      ? `Time to castle ${san === 'O-O' ? 'kingside' : 'queenside'}.`
      : `The opponent castles ${san === 'O-O' ? 'kingside' : 'queenside'}.`;
  }

  const isCapture = san.includes('x');
  const target = san.replace(/[+#]$/, '').slice(-2);

  if (isPlayerMove) {
    return isCapture
      ? `Capture with your ${piece} on ${target}.`
      : `Play your ${piece} to ${target}.`;
  }
  return isCapture
    ? `The opponent captures with ${piece} on ${target}.`
    : `The opponent plays ${piece} to ${target}.`;
}

export default function OpeningTrainer({ opening }: Props) {
  const { playerColor, lines } = opening;
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'complete' | null>(null);
  const [completedLines, setCompletedLines] = useState<Set<number>>(() => new Set());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const line = lines[currentLineIndex];
  const isPlayerTurn = (currentMoveIndex % 2 === 0) === (playerColor === 'w');
  const isComplete = feedback === 'complete';
  const isViewing = viewIndex < currentMoveIndex;

  // Build the game state at viewIndex for when user navigates back
  const viewGame = useMemo(() => {
    if (!isViewing) return game;
    return buildGameAtMove(line.moves, viewIndex);
  }, [isViewing, game, line.moves, viewIndex]);

  // Compute lastMove highlight for the viewed position
  const viewLastMove = useMemo(() => {
    if (!isViewing) return lastMove;
    if (viewIndex === 0) return null;
    const g = buildGameAtMove(line.moves, viewIndex);
    const history = g.history({ verbose: true });
    if (history.length > 0) {
      const m = history[history.length - 1];
      return { from: m.from, to: m.to };
    }
    return null;
  }, [isViewing, viewIndex, line.moves, lastMove]);

  // Auto-play opponent's move
  const autoPlayOpponent = useCallback((g: Chess, moveIdx: number, ln: typeof line) => {
    if (moveIdx >= ln.moves.length) return;
    const isOpponentMove = (moveIdx % 2 === 0) !== (playerColor === 'w');
    if (!isOpponentMove) return;

    autoPlayTimer.current = setTimeout(() => {
      const newGame = buildGameAtMove(ln.moves, moveIdx + 1);
      const history = newGame.history({ verbose: true });
      const move = history[history.length - 1];
      if (move) {
        setGame(newGame);
        setLastMove({ from: move.from, to: move.to });
        const nextIdx = moveIdx + 1;
        setCurrentMoveIndex(nextIdx);
        setViewIndex(nextIdx);
        setFeedback(null);

        if (nextIdx >= ln.moves.length) {
          setFeedback('complete');
          setCompletedLines(prev => {
            const next = new Set(prev);
            next.add(currentLineIndex);
            return next;
          });
        } else {
          const nextIsOpponent = ((nextIdx) % 2 === 0) !== (playerColor === 'w');
          if (nextIsOpponent) {
            autoPlayOpponent(newGame, nextIdx, ln);
          }
        }
      }
    }, 500);
  }, [playerColor, currentLineIndex]);

  // Initialize line
  const initLine = useCallback((lineIdx: number) => {
    if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    const newGame = new Chess();
    const ln = lines[lineIdx];
    setGame(newGame);
    setCurrentLineIndex(lineIdx);
    setCurrentMoveIndex(0);
    setViewIndex(0);
    setFeedback(null);
    setLastMove(null);
    setHintText(null);

    if (playerColor === 'b') {
      autoPlayTimer.current = setTimeout(() => {
        const g = buildGameAtMove(ln.moves, 1);
        const history = g.history({ verbose: true });
        const move = history[0];
        if (move) {
          setGame(g);
          setLastMove({ from: move.from, to: move.to });
          setCurrentMoveIndex(1);
          setViewIndex(1);
        }
      }, 400);
    }
  }, [lines, playerColor]);

  useEffect(() => {
    initLine(currentLineIndex);
    return () => {
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMoveRequest = useCallback((from: Square, to: Square, promotion?: PieceSymbol) => {
    if (isComplete || isViewing) return;
    if (!isPlayerTurn) return;

    const testGame = buildGameAtMove(line.moves, currentMoveIndex);
    const move = testGame.move({ from, to, promotion });
    if (!move) return;

    const expectedSan = line.moves[currentMoveIndex];
    if (move.san === expectedSan) {
      const newGame = buildGameAtMove(line.moves, currentMoveIndex + 1);
      setGame(newGame);
      setLastMove({ from: move.from, to: move.to });
      setHintText(null);
      const nextIdx = currentMoveIndex + 1;
      setCurrentMoveIndex(nextIdx);
      setViewIndex(nextIdx);

      if (nextIdx >= line.moves.length) {
        setFeedback('complete');
        setCompletedLines(prev => {
          const next = new Set(prev);
          next.add(currentLineIndex);
          return next;
        });
      } else {
        setFeedback('correct');
        autoPlayOpponent(newGame, nextIdx, line);
      }
    } else {
      setFeedback('incorrect');
    }
  }, [game, currentMoveIndex, line, isComplete, isPlayerTurn, isViewing, autoPlayOpponent, currentLineIndex]);

  function showHint() {
    const san = line.moves[currentMoveIndex];
    const isPlayer = (currentMoveIndex % 2 === 0) === (playerColor === 'w');
    setHintText(describeMove(san, isPlayer));
  }

  function goBack() {
    setViewIndex(v => Math.max(0, v - 1));
  }

  function goForward() {
    setViewIndex(v => Math.min(currentMoveIndex, v + 1));
  }

  function jumpToMove(idx: number) {
    if (idx <= currentMoveIndex) {
      setViewIndex(idx);
    }
  }

  const progressPct = lines.length > 0 ? (completedLines.size / lines.length) * 100 : 0;

  // Coach bubble message
  let coachMessage: string | null = null;
  let bubbleStyle = '';
  if (feedback === 'incorrect') {
    coachMessage = 'Not quite — try again!';
    bubbleStyle = styles.bubbleIncorrect;
  } else if (feedback === 'complete') {
    coachMessage = 'Line complete! Well done.';
    bubbleStyle = styles.bubbleComplete;
  } else if (feedback === 'correct') {
    coachMessage = 'Correct!';
    bubbleStyle = styles.bubbleCorrect;
  } else if (hintText) {
    coachMessage = hintText;
  } else if (isPlayerTurn && !isComplete && !isViewing) {
    coachMessage = 'Your turn — find the right move.';
  } else if (isViewing) {
    const san = line.moves[viewIndex > 0 ? viewIndex - 1 : 0];
    const isPlayer = ((viewIndex > 0 ? viewIndex - 1 : 0) % 2 === 0) === (playerColor === 'w');
    coachMessage = viewIndex === 0
      ? 'Use the arrows to step through moves.'
      : describeMove(san, isPlayer);
  }

  // Build move display
  const moveDisplay: React.ReactNode[] = [];
  for (let i = 0; i < line.moves.length; i++) {
    if (i % 2 === 0) {
      moveDisplay.push(
        <span key={`num-${i}`} className={styles.moveNumber}>
          {Math.floor(i / 2) + 1}.
        </span>
      );
    }
    let cls = styles.move;
    if (i < currentMoveIndex) {
      cls += ` ${styles.movePlayed}`;
      if (i === viewIndex - 1 && isViewing) cls += ` ${styles.moveViewing}`;
    } else if (i === currentMoveIndex) {
      cls += ` ${styles.moveCurrent}`;
    } else {
      cls += ` ${styles.moveFuture}`;
    }

    moveDisplay.push(
      <span
        key={`move-${i}`}
        className={cls}
        onClick={() => i < currentMoveIndex && jumpToMove(i + 1)}
      >
        {i < currentMoveIndex ? line.moves[i] : i === currentMoveIndex ? '???' : '...'}
      </span>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.boardColumn}>
        <ChessBoard
          className={styles.trainerBoard}
          externalGame={viewGame}
          onMoveRequest={handleMoveRequest}
          hideControls
          initialFlipped={playerColor === 'b'}
          externalLastMove={viewLastMove}
          readOnly={!isPlayerTurn || isComplete || isViewing}
        />
        <div className={styles.toolbar}>
          <button
            className={`${styles.toolBtn} ${styles.hintToolBtn}`}
            onClick={showHint}
            disabled={isComplete || isViewing || !isPlayerTurn}
            title="Show hint"
          >
            Hint
          </button>
          <div className={styles.toolSpacer} />
          <button
            className={styles.toolBtn}
            onClick={goBack}
            disabled={viewIndex === 0}
            title="Previous move"
          >
            &#x25C0;
          </button>
          <button
            className={styles.toolBtn}
            onClick={goForward}
            disabled={viewIndex >= currentMoveIndex}
            title="Next move"
          >
            &#x25B6;
          </button>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.openingName}>{opening.name}</span>
          <span className={styles.lineName}>{line.name}</span>
        </div>

        {coachMessage && (
          <div className={styles.coachBubble}>
            <span className={styles.coachIcon}>
              {getPieceSvg(playerColor, 'k')}
            </span>
            <div className={`${styles.bubble} ${bubbleStyle}`}>
              {coachMessage}
            </div>
          </div>
        )}

        <div className={styles.lineSelector}>
          {lines.map((ln, idx) => (
            <button
              key={ln.id}
              className={`${styles.lineBtn} ${idx === currentLineIndex ? styles.lineBtnActive : ''} ${completedLines.has(idx) ? styles.lineBtnComplete : ''}`}
              onClick={() => initLine(idx)}
            >
              {ln.name}
            </button>
          ))}
        </div>

        <div className={styles.moveList}>
          {moveDisplay}
        </div>

        {isComplete && (
          <div className={styles.buttons}>
            <button onClick={() => initLine(currentLineIndex)}>
              Practice again
            </button>
            {currentLineIndex < lines.length - 1 && (
              <button onClick={() => initLine(currentLineIndex + 1)}>
                Next line &rarr;
              </button>
            )}
          </div>
        )}

        <div className={styles.progressSection}>
          <span className={styles.progressLabel}>
            {completedLines.size} / {lines.length} lines completed
          </span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
