'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import { PUZZLES } from '@/data/puzzles';
import { TrainingSessionSummary } from '@/lib/trainingSession';
import styles from './TacticalTrainer.module.css';

interface Props {
  themes?: string[];
  drillSource?: 'library' | 'analysis' | 'review';
  analysisTheme?: string;
  difficulty?: number;
  coachingMessage?: string;
  successMetric?: string;
  onBack?: () => void;
  onSessionComplete?: (summary: TrainingSessionSummary) => void;
}

type TrainerPuzzleKind = 'setup-sequence' | 'best-move';

interface TrainerPuzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  kind: TrainerPuzzleKind;
  source: 'library' | 'analysis';
}

function filterByThemes<T extends { themes: string[] }>(puzzles: T[], themes: string[]): T[] {
  if (!themes || themes.length === 0) return puzzles;
  return puzzles.filter(p => p.themes.some(t => themes.includes(t)));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PUZZLES_PER_SESSION = 5;

function classifyPuzzle(puzzle: { fen: string; moves: string[] }): { kind: TrainerPuzzleKind; moves: string[] } {
  if (puzzle.moves.length < 2) {
    return { kind: 'best-move', moves: puzzle.moves };
  }
  // Validate setup-sequence: setup move must be legal and alternate turns
  try {
    const g = new Chess(puzzle.fen);
    const uci = puzzle.moves[0];
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    const promo = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;
    const m = g.move({ from, to, promotion: promo });
    if (m) {
      // Verify the answer move is also legal after setup
      const uci2 = puzzle.moves[1];
      const from2 = uci2.slice(0, 2) as Square;
      const to2 = uci2.slice(2, 4) as Square;
      const promo2 = uci2.length > 4 ? (uci2[4] as PieceSymbol) : undefined;
      const m2 = g.move({ from: from2, to: to2, promotion: promo2 });
      if (m2) {
        return { kind: 'setup-sequence', moves: puzzle.moves };
      }
    }
  } catch {}
  // Setup invalid or answer invalid after setup — present as best-move from original FEN
  // The answer is typically moves[1] (the tactic the player should find)
  return { kind: 'best-move', moves: [puzzle.moves[puzzle.moves.length > 1 ? 1 : 0]] };
}

function buildLibraryQueue(themes: string[] = [], difficulty?: number): TrainerPuzzle[] {
  let filtered = filterByThemes(PUZZLES, themes).map(puzzle => {
    const { kind, moves } = classifyPuzzle(puzzle);
    return {
      id: puzzle.id,
      fen: puzzle.fen,
      moves,
      rating: puzzle.rating,
      themes: puzzle.themes,
      kind,
      source: 'library' as const,
    };
  });

  if (difficulty && difficulty <= 1) filtered = filtered.filter(p => p.rating < 1000);
  else if (difficulty === 2) filtered = filtered.filter(p => p.rating >= 900 && p.rating < 1500);
  else if (difficulty && difficulty >= 3) filtered = filtered.filter(p => p.rating >= 1200);
  if (filtered.length === 0) {
    filtered = PUZZLES.map(puzzle => {
      const { kind, moves } = classifyPuzzle(puzzle);
      return {
        id: puzzle.id,
        fen: puzzle.fen,
        moves,
        rating: puzzle.rating,
        themes: puzzle.themes,
        kind,
        source: 'library' as const,
      };
    });
  }

  return shuffle(filtered);
}

function formatPuzzleTitle(puzzle: TrainerPuzzle): string {
  if (puzzle.source === 'analysis') {
    const id = puzzle.id.replace(/^analysis-/, '');
    return `Personal Drill #${id}`;
  }

  const numericId = puzzle.id.match(/\d+/)?.[0];
  return numericId ? `Puzzle #${parseInt(numericId, 10)}` : `Puzzle ${puzzle.id}`;
}

function getPuzzleSourceLabel(drillSource: Props['drillSource'], puzzle: TrainerPuzzle): string {
  if (drillSource === 'review') return 'Review';
  if (puzzle.source === 'analysis') return 'From your games';
  return 'Library';
}

export default function TacticalTrainer({
  themes,
  drillSource = 'library',
  analysisTheme,
  difficulty,
  coachingMessage,
  successMetric,
  onBack,
  onSessionComplete,
}: Props) {
  const [queue, setQueue] = useState<TrainerPuzzle[]>([]);
  const [index, setIndex] = useState(0);
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [moveIndex, setMoveIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'complete' | null>(null);
  const [solved, setSolved] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [firstTrySolved, setFirstTrySolved] = useState(0);
  const [currentPuzzleMisses, setCurrentPuzzleMisses] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartedAt = useRef<number>(Date.now());
  const puzzleStartedAt = useRef<number>(Date.now());

  const puzzle = queue.length > 0 ? queue[index % queue.length] : null;
  const sessionTarget = onSessionComplete ? Math.min(PUZZLES_PER_SESSION, Math.max(queue.length, 1)) : PUZZLES_PER_SESSION;

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    setQueueError(null);
    setSolved(0);
    setAttempted(0);
    setFirstTrySolved(0);
    setCurrentPuzzleMisses(0);
    setFeedback(null);
    setIndex(0);
    sessionStartedAt.current = Date.now();

    const libraryQueue = buildLibraryQueue(themes || [], difficulty);

    if (drillSource === 'library') {
      setQueue(libraryQueue);
      setLoadingQueue(false);
      return;
    }

    try {
      if (drillSource === 'review') {
        const reviewRes = await fetch(`/api/training-review?module=tactics&limit=${PUZZLES_PER_SESSION}`);
        if (!reviewRes.ok) throw new Error('Failed to load due tactic reviews');
        const reviewData = await reviewRes.json() as {
          items?: Array<{
            itemId: string;
            theme: string | null;
            metadata?: {
              fen?: string;
              moves?: string[];
              rating?: number;
              themes?: string[];
              kind?: TrainerPuzzleKind;
              source?: 'library' | 'analysis';
            };
          }>;
        };

        const reviewQueue: TrainerPuzzle[] = (reviewData.items || [])
          .filter(item => item.metadata?.fen && Array.isArray(item.metadata.moves) && item.metadata.moves.length > 0)
          .map(item => ({
            id: item.itemId,
            fen: item.metadata?.fen || '',
            moves: item.metadata?.moves || [],
            rating: Number(item.metadata?.rating) || 1200,
            themes: item.metadata?.themes || (item.theme ? [item.theme] : (themes || [])),
            kind: item.metadata?.kind === 'best-move' ? 'best-move' : 'setup-sequence',
            source: item.metadata?.source === 'analysis' ? 'analysis' : 'library',
          }));

        if (reviewQueue.length > 0) {
          setQueue(reviewQueue);
        } else {
          setQueue(libraryQueue);
          setQueueError('No tactic reviews are due right now. Using fresh tactics instead.');
        }
        setLoadingQueue(false);
        return;
      }

      const params = new URLSearchParams({
        limit: String(PUZZLES_PER_SESSION),
      });
      if (analysisTheme) {
        params.set('theme', analysisTheme);
      }

      const res = await fetch(`/api/training-drills?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load personalized drills');
      const data = await res.json() as {
        drills?: Array<{ id: string; fen: string; bestMoveUci: string; theme: string | null; cpLoss: number }>;
      };

      const analysisQueue: TrainerPuzzle[] = (data.drills || [])
        .filter(drill => {
          if (!drill.fen || !drill.bestMoveUci) return false;
          // Validate the move is legal in the given position
          try {
            const g = new Chess(drill.fen);
            const from = drill.bestMoveUci.slice(0, 2) as Square;
            const to = drill.bestMoveUci.slice(2, 4) as Square;
            const promo = drill.bestMoveUci.length > 4 ? (drill.bestMoveUci[4] as PieceSymbol) : undefined;
            return g.move({ from, to, promotion: promo }) !== null;
          } catch {
            return false;
          }
        })
        .map(drill => ({
          id: drill.id,
          fen: drill.fen,
          moves: [drill.bestMoveUci],
          rating: Math.max(800, Math.min(2200, 800 + Math.round(Number(drill.cpLoss) || 0))),
          themes: drill.theme ? [drill.theme] : (themes || []),
          kind: 'best-move' as const,
          source: 'analysis' as const,
        }));

      const mergedQueue = [
        ...shuffle(analysisQueue),
        ...libraryQueue.filter(candidate => !analysisQueue.some(drill => drill.id === candidate.id)),
      ].slice(0, Math.max(PUZZLES_PER_SESSION, analysisQueue.length));

      setQueue(mergedQueue.length > 0 ? mergedQueue : libraryQueue);
      if (analysisQueue.length === 0) {
        setQueueError('No recent personalized drills found yet. Using themed tactics instead.');
      }
    } catch {
      setQueue(libraryQueue);
      setQueueError(
        drillSource === 'review'
          ? 'Falling back to themed tactics because scheduled reviews were unavailable.'
          : 'Falling back to themed tactics because personalized drills were unavailable.'
      );
    } finally {
      setLoadingQueue(false);
    }
  }, [analysisTheme, difficulty, drillSource, themes]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const setupPuzzle = useCallback((p: TrainerPuzzle) => {
    try {
      const g = new Chess(p.fen);

      if (p.kind === 'setup-sequence') {
        const setupUci = p.moves[0];
        const from = setupUci.slice(0, 2) as Square;
        const to = setupUci.slice(2, 4) as Square;
        const promotion = setupUci.length > 4 ? (setupUci[4] as PieceSymbol) : undefined;
        const move = g.move({ from, to, promotion });
        if (!move) {
          setIndex(i => i + 1);
          return;
        }
        setMoveIndex(1);
        setLastMove({ from, to });
      } else {
        setMoveIndex(0);
        setLastMove(null);
      }

      setGame(g);
      setPlayerColor(g.turn());
      setFeedback(null);
      setCurrentPuzzleMisses(0);
      puzzleStartedAt.current = Date.now();
    } catch {
      // Invalid FEN or move — skip to next puzzle
      setIndex(i => i + 1);
    }
  }, []);

  useEffect(() => {
    if (puzzle) setupPuzzle(puzzle);
  }, [puzzle, setupPuzzle]);

  const handleMove = useCallback((from: Square, to: Square, promotion?: PieceSymbol) => {
    if (!puzzle || feedback === 'complete') return;

    const expectedUci = puzzle.moves[moveIndex];
    if (!expectedUci) return;

    const expFrom = expectedUci.slice(0, 2);
    const expTo = expectedUci.slice(2, 4);
    const expPromo = expectedUci.length > 4 ? expectedUci[4] : '';

    if (from === expFrom && to === expTo && (promotion || '') === expPromo) {
      // Correct move
      const g = new Chess(game.fen());
      g.move({ from, to, promotion });
      setGame(g);
      setLastMove({ from, to });

      const nextMoveIdx = moveIndex + 1;

      if (nextMoveIdx >= puzzle.moves.length) {
        setFeedback('complete');
        setSolved(s => s + 1);
        setAttempted(a => a + 1);
        if (currentPuzzleMisses === 0) {
          setFirstTrySolved(count => count + 1);
        }
        fetch('/api/training-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            module: 'tactics',
            itemId: puzzle.id,
            theme: puzzle.themes[0] || null,
            score: currentPuzzleMisses === 0 ? 1 : 0.6,
            elapsedMs: Date.now() - puzzleStartedAt.current,
            hintsUsed: 0,
            metadata: {
              fen: puzzle.fen,
              moves: puzzle.moves,
              rating: puzzle.rating,
              themes: puzzle.themes,
              kind: puzzle.kind,
              source: puzzle.source,
            },
          }),
        }).catch(() => {});
        return;
      }

      // Make opponent's response
      const responseUci = puzzle.moves[nextMoveIdx];
      if (responseUci) {
        autoPlayTimer.current = setTimeout(() => {
          const g2 = new Chess(g.fen());
          const rFrom = responseUci.slice(0, 2) as Square;
          const rTo = responseUci.slice(2, 4) as Square;
          const rPromo = responseUci.length > 4 ? (responseUci[4] as PieceSymbol) : undefined;
          g2.move({ from: rFrom, to: rTo, promotion: rPromo });
          setGame(g2);
          setLastMove({ from: rFrom, to: rTo });
          setMoveIndex(nextMoveIdx + 1);
        }, 400);
      } else {
        setMoveIndex(nextMoveIdx);
      }
    } else {
      setFeedback('incorrect');
      setAttempted(a => a + 1);
      setCurrentPuzzleMisses(count => count + 1);
      setTimeout(() => setFeedback(null), 1200);
    }
  }, [puzzle, moveIndex, game, feedback, currentPuzzleMisses]);

  const buildSummary = useCallback((): TrainingSessionSummary => {
    const completed = Math.min(solved, sessionTarget);
    return {
      score: completed / Math.max(sessionTarget, 1),
      attempts: Math.max(attempted, completed),
      successes: completed,
      firstTrySuccesses: Math.min(firstTrySolved, completed),
      hintsUsed: 0,
      elapsedMs: Date.now() - sessionStartedAt.current,
      metadata: {
        trainer: 'tactical',
        queueSize: queue.length,
        solved,
        themes: analysisTheme ? [analysisTheme] : (themes || []),
        drillSource,
      },
    };
  }, [analysisTheme, attempted, drillSource, firstTrySolved, queue.length, sessionTarget, solved, themes]);

  const nextPuzzle = () => {
    setIndex(i => i + 1);
  };

  useEffect(() => {
    return () => { if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current); };
  }, []);

  if (loadingQueue) {
    return <div className={styles.container}>Loading tactics...</div>;
  }

  if (!puzzle) {
    return <div className={styles.container}>No tactics available for this lesson yet.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.board}>
        <ChessBoard
          className={styles.boardSize}
          externalGame={game}
          onMoveRequest={handleMove}
          initialFlipped={playerColor === 'b'}
          externalLastMove={lastMove}
          hideControls
        />
      </div>

      <div className={styles.panel}>
        <div className={styles.panelTop}>
          {onBack && (
            <button className={styles.backBtn} onClick={onBack}>
              &larr; Back to Coach
            </button>
          )}

          <div className={styles.header}>
            <div className={styles.titleRow}>
              <h3 className={styles.title}>{formatPuzzleTitle(puzzle)}</h3>
              <span className={styles.sourceBadge}>{getPuzzleSourceLabel(drillSource, puzzle)}</span>
            </div>
            <div className={styles.meta}>
              <span>Ref: <code className={styles.reference}>{puzzle.id}</code></span>
              <span>Rating: {puzzle.rating}</span>
            </div>
            <div className={styles.themes}>
              {puzzle.themes.map(theme => (
                <span key={theme} className={styles.theme}>{theme}</span>
              ))}
            </div>
          </div>

          {coachingMessage && (
            <div className={styles.coaching}>
              <div>{coachingMessage}</div>
              {successMetric && <div className={styles.goal}>Goal: {successMetric}</div>}
            </div>
          )}

          {queueError && (
            <div className={styles.coaching}>{queueError}</div>
          )}

          <div className={styles.streakRow}>
            <span className={styles.streakValue}>{solved}</span>
            <span className={styles.streakLabel}>Solved{onSessionComplete ? ` / ${sessionTarget}` : ''}</span>
          </div>

          {feedback === 'complete' ? (
            <div className={`${styles.feedback} ${styles.feedbackComplete}`}>
              {solved >= sessionTarget && onSessionComplete ? `Session complete! ${solved} puzzles solved.` : 'Puzzle solved!'}
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
              <span className={styles.promptTurn}>{playerColor === 'w' ? 'White' : 'Black'}</span> to move — find the best move!
            </div>
          )}

          <div className={styles.progressRow}>
            <span className={styles.progressCorrect}>Solved: {solved}</span>
            <span className={styles.progressWrong}>Misses: {attempted - solved}</span>
          </div>

          {(analysisTheme || (themes && themes.length > 0)) && (
            <div className={styles.puzzleStats}>
              <span>Focus: {analysisTheme || themes?.join(', ')}</span>
              <span>Attempts: {attempted}</span>
            </div>
          )}
        </div>

        <div className={styles.panelBottom}>
          <div className={styles.toolbar}>
            {feedback === 'complete' ? (
              solved >= sessionTarget && onSessionComplete ? (
                <button className={`${styles.toolBtn} ${styles.nextBtn}`} onClick={() => onSessionComplete(buildSummary())}>
                  Done
                </button>
              ) : (
                <button className={`${styles.toolBtn} ${styles.nextBtn}`} onClick={nextPuzzle}>
                  Next Puzzle &rarr;
                </button>
              )
            ) : (
              <>
                {onBack && (
                  <button className={styles.toolBtn} onClick={onBack}>
                    Back
                  </button>
                )}
                <button className={styles.toolBtn} onClick={nextPuzzle}>
                  Skip
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
