'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import { ENDGAMES, EndgamePosition } from '@/data/endgames';
import { getBestMove, parseUciMove, EngineConfig } from '@/lib/engine';
import { TrainingSessionSummary } from '@/lib/trainingSession';
import styles from './EndgameTrainer.module.css';

interface Props {
  difficulty?: number;
  reviewMode?: boolean;
  coachingMessage?: string;
  successMetric?: string;
  onBack?: () => void;
  onSessionComplete?: (summary: TrainingSessionSummary) => void;
}

const WINS_TO_COMPLETE = 3;

export default function EndgameTrainer({
  difficulty: initialDifficulty = 1,
  reviewMode = false,
  coachingMessage,
  successMetric,
  onBack,
  onSessionComplete,
}: Props = {}) {
  const [difficulty, setDifficulty] = useState(() => Math.max(1, Math.min(initialDifficulty, 3)));
  const [posIndex, setPosIndex] = useState(0);
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost' | 'draw'>('playing');
  const [engineThinking, setEngineThinking] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [wins, setWins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [positionsAttempted, setPositionsAttempted] = useState(0);
  const [firstTryWins, setFirstTryWins] = useState(0);
  const [reviewPositionIds, setReviewPositionIds] = useState<string[]>([]);
  const mounted = useRef(true);
  const sessionStartedAt = useRef(Date.now());
  const currentPositionAttempt = useRef(0);
  const positionStartedAt = useRef(Date.now());
  const reviewedPositionKey = useRef<string | null>(null);

  const positions = useMemo(
    () => (reviewMode && reviewPositionIds.length > 0
      ? ENDGAMES.filter(e => reviewPositionIds.includes(e.id))
      : ENDGAMES.filter(e => e.difficulty <= difficulty)
    ).sort((a, b) => a.difficulty - b.difficulty),
    [difficulty, reviewMode, reviewPositionIds]
  );
  const position = positions[posIndex % positions.length];

  const engineConfig: EngineConfig = useMemo(() => ({
    depth: Math.min(3 + difficulty, 8),
    skillLevel: Math.min(1 + difficulty * 2, 10),
  }), [difficulty]);

  const setupPosition = useCallback((pos: EndgamePosition) => {
    const g = new Chess(pos.fen);
    setGame(g);
    setLastMove(null);
    setStatus('playing');
    setMoveCount(0);
    currentPositionAttempt.current += 1;
    setPositionsAttempted(count => count + 1);
    positionStartedAt.current = Date.now();
    reviewedPositionKey.current = null;

    // If it's engine's turn first, make engine move
    if (g.turn() !== pos.playerColor) {
      setEngineThinking(true);
      getBestMove(g.fen(), engineConfig).then(uci => {
        if (!mounted.current) return;
        const { from, to, promotion } = parseUciMove(uci);
        const g2 = new Chess(g.fen());
        g2.move({ from: from as Square, to: to as Square, promotion: promotion as PieceSymbol | undefined });
        setGame(g2);
        setLastMove({ from, to });
        setEngineThinking(false);
      });
    }
  }, [engineConfig]);

  useEffect(() => {
    if (!reviewMode) return;

    fetch('/api/training-review?module=endgame&limit=3')
      .then(res => res.ok ? res.json() : { items: [] })
      .then((data: { items?: Array<{ itemId: string }> }) => {
        const ids = (data.items || []).map(item => item.itemId).filter(Boolean);
        setReviewPositionIds(ids);
      })
      .catch(() => setReviewPositionIds([]));
  }, [reviewMode]);

  useEffect(() => {
    mounted.current = true;
    if (position) setupPosition(position);
    return () => { mounted.current = false; };
  }, [position, setupPosition]);

  const checkGameEnd = useCallback((g: Chess) => {
    const recordReview = (score: number) => {
      if (!position || reviewedPositionKey.current === position.id) return;
      reviewedPositionKey.current = position.id;
      fetch('/api/training-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'endgame',
          itemId: position.id,
          theme: position.type,
          score,
          elapsedMs: Date.now() - positionStartedAt.current,
          hintsUsed: 0,
          metadata: {
            id: position.id,
            fen: position.fen,
            type: position.type,
            title: position.title,
            goal: position.goal,
            playerColor: position.playerColor,
            difficulty: position.difficulty,
          },
        }),
      }).catch(() => {});
    };

    if (g.isCheckmate()) {
      // Whoever just moved won
      const winner = g.turn() === position.playerColor ? 'lost' : 'won';
      setStatus(winner);
      if (winner === 'won') {
        const nextWins = wins + 1;
        const nextStreak = streak + 1;
        setWins(nextWins);
        setStreak(nextStreak);
        if (currentPositionAttempt.current === 1) {
          setFirstTryWins(count => count + 1);
        }
        // Auto-increase difficulty after 2 consecutive wins
        if (nextStreak >= 2) {
          setDifficulty(d => Math.min(d + 1, 3));
          setStreak(0);
        }
        recordReview(1);
      } else {
        setStreak(0);
        if (streak <= -1) setDifficulty(d => Math.max(d - 1, 1));
        recordReview(0);
      }
      return true;
    }
    if (g.isDraw() || g.isStalemate()) {
      setStatus('draw');
      setStreak(0);
      recordReview(0.25);
      return true;
    }
    return false;
  }, [position, streak, wins]);

  const handleMove = useCallback((from: Square, to: Square, promotion?: PieceSymbol) => {
    if (status !== 'playing' || engineThinking) return;

    const g = new Chess(game.fen());
    const move = g.move({ from, to, promotion });
    if (!move) return;

    setGame(g);
    setLastMove({ from, to });
    setMoveCount(c => c + 1);

    if (checkGameEnd(g)) return;

    // Engine responds
    setEngineThinking(true);
    getBestMove(g.fen(), engineConfig).then(uci => {
      if (!mounted.current) return;
      const parsed = parseUciMove(uci);
      const g2 = new Chess(g.fen());
      const engineMove = g2.move({
        from: parsed.from as Square,
        to: parsed.to as Square,
        promotion: parsed.promotion as PieceSymbol | undefined,
      });
      if (engineMove) {
        setGame(g2);
        setLastMove({ from: parsed.from, to: parsed.to });
        checkGameEnd(g2);
      }
      setEngineThinking(false);
    });
  }, [game, status, engineThinking, engineConfig, checkGameEnd]);

  const nextPosition = () => {
    currentPositionAttempt.current = 0;
    setPosIndex(i => i + 1);
  };

  const retryPosition = () => {
    if (position) {
      setupPosition(position);
    }
  };

  const buildSummary = (): TrainingSessionSummary => ({
    score: wins / Math.max(positionsAttempted, 1),
    attempts: Math.max(positionsAttempted, wins),
    successes: wins,
    firstTrySuccesses: firstTryWins,
    hintsUsed: 0,
    elapsedMs: Date.now() - sessionStartedAt.current,
    metadata: {
      trainer: 'endgame',
      reviewMode,
      currentDifficulty: difficulty,
      wins,
      positionsAttempted,
    },
  });

  return (
    <div className={styles.container}>
      <div className={styles.board}>
        <ChessBoard
          className={styles.boardSize}
          externalGame={game}
          onMoveRequest={handleMove}
          initialFlipped={position?.playerColor === 'b'}
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
            <h3 className={styles.title}>{position?.title}</h3>
            <div className={styles.meta}>
              <span>Difficulty: {'*'.repeat(difficulty)}</span>
              <span>Wins: {wins}</span>
            </div>
          </div>

          {(coachingMessage || successMetric) && (
            <div className={styles.coaching}>
              {coachingMessage && <div>{coachingMessage}</div>}
              {successMetric && <div className={styles.goalText}>Goal: {successMetric}</div>}
            </div>
          )}

          <div className={styles.goal}>{position?.goal}</div>

          <div className={styles.statusArea}>
            {engineThinking && <div className={styles.thinking}>Engine thinking...</div>}
            {status === 'won' && (
              <div className={styles.won}>
                Checkmate! You won in {moveCount} moves!
                {wins >= WINS_TO_COMPLETE && onSessionComplete ? (
                  <button className={styles.nextBtn} onClick={() => onSessionComplete(buildSummary())}>Done ({wins} wins)</button>
                ) : (
                  <button className={styles.nextBtn} onClick={nextPosition}>Next Position</button>
                )}
              </div>
            )}
            {status === 'lost' && (
              <div className={styles.lost}>
                You got checkmated!
                <button className={styles.nextBtn} onClick={retryPosition}>Try Again</button>
                <button className={styles.skipBtn} onClick={nextPosition}>Skip</button>
              </div>
            )}
            {status === 'draw' && (
              <div className={styles.draw}>
                Draw — try to checkmate instead of stalemating!
                <button className={styles.nextBtn} onClick={retryPosition}>Try Again</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
