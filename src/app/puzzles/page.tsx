'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import AppShell from '@/components/AppShell';
import ChessBoard from '@/components/ChessBoard';
import { PUZZLES, Puzzle } from '@/data/puzzles';
import { getSettings } from '@/lib/settings';
import { fireConfetti } from '@/lib/confetti';
import styles from './puzzles.module.css';

type Difficulty = 'all' | 'easy' | 'medium' | 'hard';

interface PuzzleStat {
  attempts: number;
  solves: number;
  best_time_ms: number | null;
}

type PuzzleStatsMap = Record<string, PuzzleStat>;

function filterPuzzles(difficulty: Difficulty): Puzzle[] {
  switch (difficulty) {
    case 'easy': return PUZZLES.filter(p => p.rating < 1000);
    case 'medium': return PUZZLES.filter(p => p.rating >= 1000 && p.rating < 1400);
    case 'hard': return PUZZLES.filter(p => p.rating >= 1400);
    default: return [...PUZZLES];
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PuzzlesPage() {
  const [boardTheme, setBoardTheme] = useState('classic');
  const [difficulty, setDifficulty] = useState<Difficulty>('all');
  const [puzzleQueue, setPuzzleQueue] = useState<Puzzle[]>(() => shuffle(PUZZLES));
  const [queueIndex, setQueueIndex] = useState(0);
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [moveIndex, setMoveIndex] = useState(0); // which move in the solution the player needs to make next
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'complete' | null>(null);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [hadMistake, setHadMistake] = useState(false);
  const [ratedMode, setRatedMode] = useState(false);
  const [puzzleRating, setPuzzleRating] = useState<number | null>(null);
  const [puzzleStats, setPuzzleStats] = useState<PuzzleStatsMap>({});
  const [puzzleStartTime, setPuzzleStartTime] = useState<number>(Date.now());
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const puzzle = puzzleQueue[queueIndex] || PUZZLES[0];
  const currentStat = puzzleStats[puzzle.id] || null;

  useEffect(() => {
    const s = getSettings();
    if (s.boardTheme) setBoardTheme(s.boardTheme);

    // Fetch puzzle stats
    fetch('/api/puzzle-stats')
      .then(r => r.ok ? r.json() : {})
      .then(data => setPuzzleStats(data))
      .catch(() => {});

    // Fetch puzzle rating
    fetch('/api/puzzle-stats/rating')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.rating != null) setPuzzleRating(data.rating); })
      .catch(() => {});
  }, []);

  // Initialize a puzzle
  const initPuzzle = useCallback((p: Puzzle) => {
    if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    const g = new Chess(p.fen);

    // Determine player color: the side that did NOT make the setup move
    // In our simplified format, the FEN shows the position and moves[0] is the first move to find
    // The player is the side to move
    const color = g.turn();
    setPlayerColor(color);
    setGame(g);
    setMoveIndex(0);
    setLastMove(null);
    setFeedback(null);
    setHintSquare(null);
    setHadMistake(false);
    setPuzzleStartTime(Date.now());
  }, []);

  // Init first puzzle on mount and when queue changes
  useEffect(() => {
    if (puzzleQueue.length > 0) {
      initPuzzle(puzzleQueue[queueIndex]);
    }
  }, [queueIndex, puzzleQueue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle difficulty change
  function changeDifficulty(d: Difficulty) {
    setDifficulty(d);
    const filtered = ratedMode && puzzleRating != null
      ? shuffle(PUZZLES.filter(p => Math.abs(p.rating - puzzleRating) <= 200))
      : shuffle(filterPuzzles(d));
    setPuzzleQueue(filtered.length > 0 ? filtered : shuffle(filterPuzzles(d)));
    setQueueIndex(0);
    setStreak(0);
    setCorrectCount(0);
    setWrongCount(0);
  }

  // Handle rated mode toggle
  function toggleRatedMode() {
    const next = !ratedMode;
    setRatedMode(next);
    if (next && puzzleRating != null) {
      const ratedPuzzles = shuffle(PUZZLES.filter(p => Math.abs(p.rating - puzzleRating) <= 200));
      if (ratedPuzzles.length > 0) {
        setPuzzleQueue(ratedPuzzles);
        setQueueIndex(0);
        setStreak(0);
        setCorrectCount(0);
        setWrongCount(0);
        return;
      }
    }
    // Fall back to current difficulty filter
    const filtered = shuffle(filterPuzzles(difficulty));
    setPuzzleQueue(filtered);
    setQueueIndex(0);
    setStreak(0);
    setCorrectCount(0);
    setWrongCount(0);
  }

  // Report puzzle solve stats
  function reportPuzzleSolve(solved: boolean) {
    const timeMs = Date.now() - puzzleStartTime;
    fetch('/api/puzzle-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzleId: puzzle.id, solved, timeMs }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setPuzzleStats(prev => ({ ...prev, [puzzle.id]: data }));
        }
      })
      .catch(() => {});

    if (ratedMode && puzzleRating != null) {
      fetch('/api/puzzle-stats/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzleId: puzzle.id, puzzleRating: puzzle.rating, solved }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.rating != null) setPuzzleRating(data.rating);
        })
        .catch(() => {});
    }
  }

  const handleMove = useCallback((from: Square, to: Square, promotion?: PieceSymbol) => {
    if (feedback === 'complete') return;

    const expectedUci = puzzle.moves[moveIndex];
    if (!expectedUci) return;

    const expectedFrom = expectedUci.slice(0, 2);
    const expectedTo = expectedUci.slice(2, 4);
    const expectedPromo = expectedUci.length > 4 ? expectedUci[4] : undefined;

    // Check if the move matches the expected solution
    if (from === expectedFrom && to === expectedTo && (!expectedPromo || promotion === expectedPromo)) {
      // Correct move
      const newGame = new Chess(game.fen());
      const move = newGame.move({ from, to, promotion: (expectedPromo as PieceSymbol) || promotion });
      if (!move) return;

      setGame(newGame);
      setLastMove({ from: move.from, to: move.to });
      setHintSquare(null);

      const nextIndex = moveIndex + 1;

      if (nextIndex >= puzzle.moves.length) {
        // Puzzle complete!
        setFeedback('complete');
        setMoveIndex(nextIndex);
        if (!hadMistake) {
          setStreak(s => s + 1);
          setCorrectCount(c => c + 1);
        }
        reportPuzzleSolve(!hadMistake);
        fireConfetti();
      } else {
        // There are more moves — auto-play the opponent's response
        setFeedback('correct');
        setMoveIndex(nextIndex);

        autoPlayTimer.current = setTimeout(() => {
          const opponentUci = puzzle.moves[nextIndex];
          if (opponentUci) {
            const g2 = new Chess(newGame.fen());
            const opFrom = opponentUci.slice(0, 2) as Square;
            const opTo = opponentUci.slice(2, 4) as Square;
            const opPromo = opponentUci.length > 4 ? opponentUci[4] as PieceSymbol : undefined;
            const opMove = g2.move({ from: opFrom, to: opTo, promotion: opPromo });
            if (opMove) {
              setGame(g2);
              setLastMove({ from: opMove.from, to: opMove.to });
              setMoveIndex(nextIndex + 1);

              if (nextIndex + 1 >= puzzle.moves.length) {
                setFeedback('complete');
                if (!hadMistake) {
                  setStreak(s => s + 1);
                  setCorrectCount(c => c + 1);
                }
                reportPuzzleSolve(!hadMistake);
                fireConfetti();
              } else {
                setFeedback(null);
              }
            }
          }
        }, 500);
      }
    } else {
      // Wrong move
      setFeedback('incorrect');
      setHadMistake(true);
      if (!hadMistake) {
        setStreak(0);
        setWrongCount(w => w + 1);
      }
    }
  }, [game, moveIndex, puzzle, feedback, hadMistake, reportPuzzleSolve]); // eslint-disable-line react-hooks/exhaustive-deps

  function showHint() {
    const uci = puzzle.moves[moveIndex];
    if (uci) {
      setHintSquare(uci.slice(0, 2));
      setHadMistake(true);
    }
  }

  function nextPuzzle() {
    if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    if (queueIndex + 1 < puzzleQueue.length) {
      setQueueIndex(queueIndex + 1);
    } else {
      // Reshuffle and restart
      setPuzzleQueue(shuffle(filterPuzzles(difficulty)));
      setQueueIndex(0);
    }
  }

  const isComplete = feedback === 'complete';
  const turnLabel = playerColor === 'w' ? 'White' : 'Black';

  return (
    <AppShell>
      <div className={styles.layout}>
        <div className={styles.boardColumn}>
          <ChessBoard
            className={styles.puzzleBoard}
            externalGame={game}
            onMoveRequest={handleMove}
            hideControls
            initialFlipped={playerColor === 'b'}
            externalLastMove={lastMove}
            hintSquare={hintSquare}
            readOnly={isComplete}
            theme={boardTheme}
          />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.puzzleHeader}>
              <span className={styles.puzzleTitle}>Puzzle #{puzzle.id.replace('p', '')}</span>
              <div className={styles.puzzleMeta}>
                <span className={styles.puzzleRating}>Rating: {puzzle.rating}</span>
                <div className={styles.puzzleThemes}>
                  {puzzle.themes.map(t => (
                    <span key={t} className={styles.theme}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Streak */}
            <div className={styles.streakRow}>
              <span className={styles.streakValue}>{streak}</span>
              <span className={styles.streakLabel}>Streak</span>
            </div>

            {/* Prompt / Feedback */}
            {feedback === 'complete' ? (
              <div className={`${styles.feedback} ${styles.feedbackComplete}`}>
                Puzzle solved!
              </div>
            ) : feedback === 'incorrect' ? (
              <div className={`${styles.feedback} ${styles.feedbackIncorrect}`}>
                Not quite — try again!
              </div>
            ) : feedback === 'correct' ? (
              <div className={`${styles.feedback} ${styles.feedbackCorrect}`}>
                Correct! Keep going...
              </div>
            ) : (
              <div className={styles.prompt}>
                <span className={styles.promptTurn}>{turnLabel}</span> to move — find the best move!
              </div>
            )}

            {/* Difficulty filter + Rated toggle */}
            <div className={styles.filterRow}>
              {(['all', 'easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  className={`${styles.filterBtn} ${difficulty === d && !ratedMode ? styles.filterBtnActive : ''}`}
                  onClick={() => { if (ratedMode) setRatedMode(false); changeDifficulty(d); }}
                >
                  {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
              <button
                className={`${styles.ratedToggle} ${ratedMode ? styles.filterBtnActive : ''}`}
                onClick={toggleRatedMode}
              >
                Rated
              </button>
            </div>

            {/* Puzzle rating display */}
            {ratedMode && puzzleRating != null && (
              <div className={styles.ratingDisplay}>
                Your Puzzle Rating: <strong>{Math.round(puzzleRating)}</strong>
              </div>
            )}

            {/* Per-puzzle stats */}
            {currentStat && (
              <div className={styles.puzzleStats}>
                <span>Attempts: {currentStat.attempts}</span>
                {currentStat.best_time_ms != null && (
                  <span>Best: {(currentStat.best_time_ms / 1000).toFixed(1)}s</span>
                )}
              </div>
            )}

            {/* Session progress */}
            <div className={styles.progressRow}>
              <span className={styles.progressCorrect}>Solved: {correctCount}</span>
              <span className={styles.progressWrong}>Failed: {wrongCount}</span>
            </div>
          </div>

          <div className={styles.panelBottom}>
            <div className={styles.toolbar}>
              {isComplete ? (
                <button className={`${styles.toolBtn} ${styles.nextBtn}`} onClick={nextPuzzle}>
                  Next Puzzle &rarr;
                </button>
              ) : (
                <>
                  <button
                    className={`${styles.toolBtn} ${styles.hintBtn}`}
                    onClick={showHint}
                    disabled={isComplete}
                  >
                    Hint
                  </button>
                  <button className={styles.toolBtn} onClick={nextPuzzle}>
                    Skip
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
