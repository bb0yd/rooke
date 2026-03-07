'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import ChessBoard from './ChessBoard';
import { getPieceSvg } from './ChessPieces';
import { Opening } from '@/data/openings';
import {
  getLineStats,
  recordAttempt,
  updateSpacedRepetition,
  isMastered,
  isStruggling,
  isDueForReview,
  LineStats,
} from '@/lib/trainerStats';
import { calculateNextReview, performanceToQuality } from '@/lib/spacedRepetition';
import { fireConfetti } from '@/lib/confetti';
import { TrainingSessionSummary } from '@/lib/trainingSession';
import styles from './OpeningTrainer.module.css';

interface Props {
  opening: Opening;
  initialMode?: PracticeMode;
}

export type PracticeMode = 'sequential' | 'random' | 'weakspots' | 'review';

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CORRECT_MESSAGES = [
  'Great move!',
  'Excellent! You got it.',
  'Spot on!',
  'Well played!',
  'Nailed it!',
  'Right on the money!',
  'Sharp play!',
];

const CORRECT_WITH_SAN = [
  (san: string) => `Perfect! ${san} is the mainline.`,
  (san: string) => `Yes! ${san} is exactly right.`,
  (san: string) => `${san} — textbook.`,
];

const INCORRECT_HINTS = [
  'That move loses tempo.',
  'The mainline develops faster.',
  'Try to follow the theoretical move order.',
  'Think about piece activity here.',
  'Consider the center control.',
  'Look for a more active continuation.',
];

function buildLineOrder(
  mode: PracticeMode,
  openingId: string,
  lines: Opening['lines'],
): number[] {
  if (mode === 'sequential') {
    return lines.map((_, i) => i);
  }
  if (mode === 'review') {
    const due = lines
      .map((ln, i) => ({ i, stats: getLineStats(openingId, ln.id) }))
      .filter(({ stats }) => isDueForReview(stats))
      .map(({ i }) => i);
    if (due.length > 0) return shuffle(due);
    // fall back to random-all
  }
  if (mode === 'weakspots') {
    const struggling = lines
      .map((ln, i) => ({ i, stats: getLineStats(openingId, ln.id) }))
      .filter(({ stats }) => isStruggling(stats))
      .map(({ i }) => i);
    if (struggling.length > 0) return shuffle(struggling);
    // fall back to random-all
  }
  return shuffle(lines.map((_, i) => i));
}

function deriveOpeningDifficulty(lines: Opening['lines']): number {
  const averageLength = lines.length > 0
    ? lines.reduce((sum, line) => sum + line.moves.length, 0) / lines.length
    : 0;

  if (averageLength >= 18) return 3;
  if (averageLength >= 10) return 2;
  return 1;
}

export default function OpeningTrainer({ opening, initialMode = 'sequential' }: Props) {
  const { playerColor, lines } = opening;
  const initialOrder = useMemo(() => buildLineOrder(initialMode, opening.id, lines), [initialMode, opening.id, lines]);
  const [mode, setMode] = useState<PracticeMode>(initialMode);
  const [lineOrder, setLineOrder] = useState<number[]>(() => initialOrder);
  const [orderPosition, setOrderPosition] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(() => initialOrder[0] ?? 0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'complete' | null>(null);
  const [completedLines, setCompletedLines] = useState<Set<number>>(() => new Set());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [hadMistakeThisLine, setHadMistakeThisLine] = useState(false);
  const [sessionClean, setSessionClean] = useState(0);
  const [sessionMistakes, setSessionMistakes] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [lineStatsMap, setLineStatsMap] = useState<Record<string, LineStats>>({});
  const [wrongMoveSan, setWrongMoveSan] = useState<string | null>(null);
  const [lineStartTime, setLineStartTime] = useState(Date.now());
  const [correctStreak, setCorrectStreak] = useState(0);
  const correctMsgIndexRef = useRef(0);
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [speedMode, setSpeedMode] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedAdvanceRef = useRef<() => void>(() => {});
  const sessionStartedAt = useRef(Date.now());
  const sessionLogged = useRef(false);
  const hintUses = useRef(0);
  const dueLineIdsAtSessionStart = useRef<Set<string>>(new Set());

  const line = lines[currentLineIndex];
  const isPlayerTurn = (currentMoveIndex % 2 === 0) === (playerColor === 'w');
  const isComplete = feedback === 'complete';
  const isViewing = viewIndex < currentMoveIndex;

  // Load stats for all lines on mount and after recording
  const refreshStats = useCallback(() => {
    const map: Record<string, LineStats> = {};
    for (const ln of lines) {
      map[ln.id] = getLineStats(opening.id, ln.id);
    }
    setLineStatsMap(map);
  }, [lines, opening.id]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    const dueSet = new Set<string>();
    for (const ln of lines) {
      const stats = getLineStats(opening.id, ln.id);
      if (isDueForReview(stats)) {
        dueSet.add(ln.id);
      }
    }
    dueLineIdsAtSessionStart.current = dueSet;
  }, [lines, opening.id, refreshStats]);

  // Speed mode countdown timer
  useEffect(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (!speedMode || isComplete || isViewing) return;

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Time's up — mark as failed and advance
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          setHadMistakeThisLine(true);
          setFeedback('complete');
          setCompletedLines(s => {
            const next = new Set(s);
            next.add(currentLineIndex);
            return next;
          });
          speedAdvanceRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [speedMode, isComplete, isViewing, currentLineIndex, currentMoveIndex]);
  // Note: intentionally limited deps — we restart on line/move changes and pause/resume on isViewing

  // Reset countdown when a new line starts
  useEffect(() => {
    if (speedMode) setCountdown(30);
  }, [currentLineIndex, speedMode]);

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
          fireConfetti();
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
    setHintSquare(null);
    setHadMistakeThisLine(false);
    setWrongMoveSan(null);
    setLineStartTime(Date.now());
    setCorrectStreak(0);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount-only initialization

  // Record stats and advance when line completes
  const onLineComplete = useCallback((hadMistake: boolean) => {
    recordAttempt(opening.id, line.id, hadMistake);

    // Spaced repetition scheduling
    const stats = getLineStats(opening.id, line.id);
    const timeMs = Date.now() - lineStartTime;
    const quality = performanceToQuality(hadMistake, timeMs);
    const result = calculateNextReview(quality, stats.easeFactor, stats.intervalDays);
    updateSpacedRepetition(opening.id, line.id, result.easeFactor, result.intervalDays, result.nextReview);

    refreshStats();
    if (hadMistake) {
      setSessionMistakes(n => n + 1);
    } else {
      setSessionClean(n => n + 1);
    }
  }, [opening.id, line.id, refreshStats, lineStartTime]);

  // Advance to the next line in lineOrder
  const advanceToNext = useCallback(() => {
    const nextPos = orderPosition + 1;
    if (nextPos >= lineOrder.length) {
      setSessionDone(true);
      return;
    }
    setOrderPosition(nextPos);
    initLine(lineOrder[nextPos]);
  }, [orderPosition, lineOrder, initLine]);

  // Keep ref current for speed mode timeout callback
  speedAdvanceRef.current = () => {
    onLineComplete(true);
    setTimeout(advanceToNext, 1200);
  };

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
      setHintSquare(null);
      const nextIdx = currentMoveIndex + 1;
      setCurrentMoveIndex(nextIdx);
      setViewIndex(nextIdx);

      setCorrectStreak(prev => prev + 1);

      if (nextIdx >= line.moves.length) {
        setFeedback('complete');
        setCompletedLines(prev => {
          const next = new Set(prev);
          next.add(currentLineIndex);
          return next;
        });
        onLineComplete(hadMistakeThisLine);
        fireConfetti();
      } else {
        setFeedback('correct');
        autoPlayOpponent(newGame, nextIdx, line);
      }
    } else {
      setFeedback('incorrect');
      setWrongMoveSan(move.san);
      setHadMistakeThisLine(true);
      setCorrectStreak(0);
    }
  }, [game, currentMoveIndex, line, isComplete, isPlayerTurn, isViewing, autoPlayOpponent, currentLineIndex, hadMistakeThisLine, onLineComplete]);

  function reorderLine(fromIdx: number, toIdx: number) {
    // Reorder lines via API if it's a custom opening (numeric ID)
    if (/^\d+$/.test(opening.id) && lines[fromIdx]?.id && lines[toIdx]?.id) {
      fetch(`/api/openings/${opening.id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId: lines[fromIdx].id, newIndex: toIdx }),
      }).catch(() => {});
    }
    // Swap in local state — the parent passes `lines` as a prop so we
    // swap in lineOrder which controls practice sequence
    const newOrder = [...lineOrder];
    const posA = newOrder.indexOf(fromIdx);
    const posB = newOrder.indexOf(toIdx);
    if (posA !== -1 && posB !== -1) {
      [newOrder[posA], newOrder[posB]] = [newOrder[posB], newOrder[posA]];
      setLineOrder(newOrder);
    }
  }

  function showHint() {
    const san = line.moves[currentMoveIndex];
    const isPlayer = (currentMoveIndex % 2 === 0) === (playerColor === 'w');
    setHintText(describeMove(san, isPlayer));
    setHadMistakeThisLine(true); // using a hint counts as not clean
    hintUses.current += 1;

    // Highlight the source square of the expected move
    const testGame = buildGameAtMove(line.moves, currentMoveIndex);
    const move = testGame.move(san);
    if (move) {
      setHintSquare(move.from);
    }
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

  // Switch practice mode
  function switchMode(newMode: PracticeMode) {
    const order = buildLineOrder(newMode, opening.id, lines);
    setMode(newMode);
    setLineOrder(order);
    setOrderPosition(0);
    setCompletedLines(new Set());
    setSessionClean(0);
    setSessionMistakes(0);
    setSessionDone(false);
    hintUses.current = 0;
    sessionLogged.current = false;
    sessionStartedAt.current = Date.now();
    dueLineIdsAtSessionStart.current = new Set(
      lines.filter(ln => isDueForReview(getLineStats(opening.id, ln.id))).map(ln => ln.id)
    );
    initLine(order[0]);
  }

  // Restart session with same mode
  function restartSession() {
    switchMode(mode);
  }

  const progressPct = lines.length > 0 ? (completedLines.size / lines.length) * 100 : 0;

  // Coach bubble message
  let coachMessage: string | null = null;
  let bubbleStyle = '';
  if (feedback === 'incorrect') {
    const expected = line.moves[currentMoveIndex];
    const hint = INCORRECT_HINTS[Math.floor(Math.random() * INCORRECT_HINTS.length)];
    coachMessage = wrongMoveSan
      ? `You played: ${wrongMoveSan} | Expected: ${expected}. ${hint}`
      : `Not quite — try again! ${hint}`;
    bubbleStyle = styles.bubbleIncorrect;
  } else if (feedback === 'complete') {
    coachMessage = hadMistakeThisLine
      ? 'Line complete. Keep practicing to clean it up.'
      : 'Flawless! You nailed every move.';
    bubbleStyle = styles.bubbleComplete;
  } else if (feedback === 'correct') {
    // Rotate through varied correct messages
    const useSanVariant = correctMsgIndexRef.current % 3 === 0;
    if (useSanVariant && currentMoveIndex > 0) {
      const lastPlayedSan = line.moves[currentMoveIndex - 1];
      const sanFn = CORRECT_WITH_SAN[correctMsgIndexRef.current % CORRECT_WITH_SAN.length];
      coachMessage = sanFn(lastPlayedSan);
    } else {
      coachMessage = CORRECT_MESSAGES[correctMsgIndexRef.current % CORRECT_MESSAGES.length];
    }
    correctMsgIndexRef.current += 1;
    // Append streak indicator for 3+ correct in a row
    if (correctStreak >= 3) {
      coachMessage += ` \uD83D\uDD25 ${correctStreak} in a row!`;
    }
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

  // Build move display as rows: [number, white, black]
  function getMoveClass(i: number): string {
    let cls = styles.move;
    if (i < currentMoveIndex) {
      cls += ` ${styles.movePlayed}`;
      if (i === viewIndex - 1 && isViewing) cls += ` ${styles.moveViewing}`;
    } else if (i === currentMoveIndex) {
      cls += ` ${styles.moveCurrent}`;
    } else {
      cls += ` ${styles.moveFuture}`;
    }
    return cls;
  }

  function getMoveText(i: number): string {
    if (i < currentMoveIndex) return line.moves[i];
    if (i === currentMoveIndex) return '???';
    return '\u2026';
  }

  // Only show rows up through the current move (the "???" prompt), not future moves
  const showUpTo = isComplete ? line.moves.length : currentMoveIndex + 1;
  const moveRows: React.ReactNode[] = [];
  for (let i = 0; i < showUpTo; i += 2) {
    const whiteIdx = i;
    const blackIdx = i + 1;
    moveRows.push(
      <div key={`row-${i}`} className={styles.moveRow}>
        <span className={styles.moveNumber}>{Math.floor(i / 2) + 1}.</span>
        <span
          className={getMoveClass(whiteIdx)}
          onClick={() => whiteIdx < currentMoveIndex && jumpToMove(whiteIdx + 1)}
        >
          {getMoveText(whiteIdx)}
        </span>
        {blackIdx < showUpTo ? (
          <span
            className={getMoveClass(blackIdx)}
            onClick={() => blackIdx < currentMoveIndex && jumpToMove(blackIdx + 1)}
          >
            {getMoveText(blackIdx)}
          </span>
        ) : <span />}
      </div>
    );
  }

  // Determine line status dot for each line
  function getLineDot(lineId: string): 'mastered' | 'struggling' | null {
    const s = lineStatsMap[lineId];
    if (!s || s.attempts === 0) return null;
    if (isMastered(s)) return 'mastered';
    if (isStruggling(s)) return 'struggling';
    return null;
  }

  // Count struggling lines for weak spots button label
  const strugglingCount = lines.filter(ln => {
    const s = lineStatsMap[ln.id];
    return s && isStruggling(s);
  }).length;

  useEffect(() => {
    if (!sessionDone || sessionLogged.current) return;

    sessionLogged.current = true;
    const totalDone = sessionClean + sessionMistakes;
    const completedLineIds = [...completedLines]
      .map(index => lines[index]?.id)
      .filter((lineId): lineId is string => Boolean(lineId));
    const dueLinesReviewed = completedLineIds.filter(lineId => dueLineIdsAtSessionStart.current.has(lineId)).length;
    const summary: TrainingSessionSummary = {
      score: totalDone > 0 ? sessionClean / totalDone : 0,
      attempts: totalDone,
      successes: sessionClean,
      firstTrySuccesses: sessionClean,
      hintsUsed: hintUses.current,
      elapsedMs: Date.now() - sessionStartedAt.current,
      metadata: {
        trainer: 'opening',
        openingId: opening.id,
        mode,
        dueLinesReviewed,
        strugglingLinesInOpening: strugglingCount,
      },
    };

    fetch('/api/training-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'openings',
        exerciseType: `${opening.id}:${mode}`,
        difficulty: deriveOpeningDifficulty(lines),
        score: summary.score,
        attempts: summary.attempts,
        successes: summary.successes,
        firstTrySuccesses: summary.firstTrySuccesses,
        hintsUsed: summary.hintsUsed,
        elapsedMs: summary.elapsedMs,
        metadata: summary.metadata,
      }),
    }).catch(() => {});
  }, [completedLines, lines, mode, opening.id, sessionClean, sessionDone, sessionMistakes, strugglingCount]);

  if (sessionDone) {
    const totalDone = sessionClean + sessionMistakes;
    return (
      <div className={styles.layout}>
        <div className={styles.summaryPanel}>
          <h2 className={styles.summaryTitle}>Session Complete</h2>
          <div className={styles.summaryStats}>
            <div className={styles.summaryStat}>
              <span className={styles.summaryStatNumber}>{totalDone}</span>
              <span className={styles.summaryStatLabel}>Lines completed</span>
            </div>
            <div className={styles.summaryStat}>
              <span className={`${styles.summaryStatNumber} ${styles.summaryClean}`}>{sessionClean}</span>
              <span className={styles.summaryStatLabel}>Clean</span>
            </div>
            <div className={styles.summaryStat}>
              <span className={`${styles.summaryStatNumber} ${styles.summaryMistakes}`}>{sessionMistakes}</span>
              <span className={styles.summaryStatLabel}>Had mistakes</span>
            </div>
          </div>
          <div className={styles.summaryButtons}>
            {strugglingCount > 0 && (
              <button onClick={() => switchMode('weakspots')}>
                Practice weak spots ({strugglingCount})
              </button>
            )}
            <button onClick={restartSession}>
              Restart full set
            </button>
          </div>
        </div>
      </div>
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
          hintSquare={hintSquare}
          readOnly={!isPlayerTurn || isComplete || isViewing}
        />
      </div>

      <div className={styles.panel}>
        <div className={styles.panelTop}>
          <div className={styles.panelHeader}>
            <span className={styles.openingName}>{opening.name}</span>
            <span className={styles.lineName}>{line.name}</span>
          </div>

          <div className={styles.modeSelector}>
            <button
              className={`${styles.modeBtn} ${mode === 'sequential' ? styles.modeBtnActive : ''}`}
              onClick={() => switchMode('sequential')}
            >
              Sequential
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'random' ? styles.modeBtnActive : ''}`}
              onClick={() => switchMode('random')}
            >
              Random
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'weakspots' ? styles.modeBtnActive : ''}`}
              onClick={() => switchMode('weakspots')}
            >
              Weak Spots{strugglingCount > 0 ? ` (${strugglingCount})` : ''}
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'review' ? styles.modeBtnActive : ''}`}
              onClick={() => switchMode('review')}
            >
              Review Due
            </button>
            <button
              className={`${styles.speedModeBtn} ${speedMode ? styles.speedModeBtnActive : ''}`}
              onClick={() => {
                setSpeedMode(s => !s);
                if (!speedMode) setCountdown(30);
              }}
              title="Timed drills — 30 seconds per line"
            >
              Speed Mode
            </button>
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

          {speedMode && (
            <div className={`${styles.timerDisplay} ${
              countdown > 15 ? styles.timerGreen :
              countdown > 5 ? styles.timerYellow :
              styles.timerRed
            }`}>
              {countdown}s
            </div>
          )}

          <div className={styles.lineSelector}>
            {lines.map((ln, idx) => {
              const dot = getLineDot(ln.id);
              return (
                <div key={ln.id} className={styles.lineRow}>
                  <button
                    className={`${styles.lineBtn} ${idx === currentLineIndex ? styles.lineBtnActive : ''} ${completedLines.has(idx) ? styles.lineBtnComplete : ''}`}
                    onClick={() => {
                      const pos = lineOrder.indexOf(idx);
                      if (pos !== -1) setOrderPosition(pos);
                      initLine(idx);
                    }}
                  >
                    {dot && (
                      <span className={`${styles.lineDot} ${dot === 'mastered' ? styles.lineDotMastered : styles.lineDotStruggling}`} />
                    )}
                    {ln.name}
                  </button>
                  <div className={styles.lineReorder}>
                    <button
                      className={styles.reorderBtn}
                      onClick={(e) => { e.stopPropagation(); if (idx > 0) reorderLine(idx, idx - 1); }}
                      disabled={idx === 0}
                      title="Move up"
                    >&#x25B2;</button>
                    <button
                      className={styles.reorderBtn}
                      onClick={(e) => { e.stopPropagation(); if (idx < lines.length - 1) reorderLine(idx, idx + 1); }}
                      disabled={idx === lines.length - 1}
                      title="Move down"
                    >&#x25BC;</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.moveList}>
            {moveRows}
          </div>

          {isComplete && (
            <div className={styles.buttons}>
              <button onClick={() => initLine(currentLineIndex)}>
                Practice again
              </button>
              <button onClick={advanceToNext}>
                Next line &rarr;
              </button>
            </div>
          )}
        </div>

        <div className={styles.panelBottom}>
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

          <div className={styles.progressSection}>
            <span className={styles.progressLabel}>
              {completedLines.size} / {lineOrder.length} lines this session
            </span>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
