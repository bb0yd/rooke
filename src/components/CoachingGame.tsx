'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import { getBestMove, parseUciMove, EngineConfig, DIFFICULTY_PRESETS } from '@/lib/engine';
import { getEvaluation, EvalResult } from '@/lib/engine';
import { calculateCpLoss, classifyMove, MoveClassification } from '@/lib/analysis';
import { TrainingSessionSummary } from '@/lib/trainingSession';
import styles from './CoachingGame.module.css';

interface MoveRecord {
  san: string;
  classification: MoveClassification | null;
  cpLoss: number;
}

interface Props {
  difficulty?: number;
  coachingMessage?: string;
  successMetric?: string;
  onBack?: () => void;
  onGameOver?: (summary: TrainingSessionSummary) => void;
}

export default function CoachingGame({
  difficulty = 1,
  coachingMessage,
  successMetric,
  onBack,
  onGameOver,
}: Props = {}) {
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [playerColor] = useState<'w' | 'b'>(() => Math.random() < 0.5 ? 'w' : 'b');
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [engineThinking, setEngineThinking] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'blunder' | 'good' | 'info'; message: string } | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [lastEval, setLastEval] = useState<EvalResult | null>(null);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [undoFen, setUndoFen] = useState<string | null>(null);
  const mounted = useRef(true);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const takebacksUsed = useRef(0);
  const sessionStartedAt = useRef(Date.now());

  const engineConfig: EngineConfig = useMemo(() => {
    if (difficulty >= 3) return DIFFICULTY_PRESETS.intermediate;
    if (difficulty === 2) return DIFFICULTY_PRESETS.easy;
    return DIFFICULTY_PRESETS.beginner;
  }, [difficulty]);
  const gameSaved = useRef(false);

  // Save the completed game to the database
  const saveGame = useCallback(async (g: Chess) => {
    if (gameSaved.current) return;
    gameSaved.current = true;
    try {
      const pgn = g.pgn();
      let result = 'draw';
      if (g.isCheckmate()) {
        const winner = g.turn() === 'w' ? 'b' : 'w';
        result = winner === 'w' ? 'white_wins' : 'black_wins';
      }
      await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pgn,
          result,
          movesCount: g.history().length,
          opponent: `Engine (${engineConfig.depth}/${engineConfig.skillLevel})`,
        }),
      });
    } catch {}
  }, [playerColor, engineConfig]);

  useEffect(() => {
    mounted.current = true;
    // If engine plays first
    if (playerColor === 'b') {
      makeEngineMove(game);
    }
    return () => { mounted.current = false; };
  }, []);

  const makeEngineMove = useCallback(async (g: Chess) => {
    setEngineThinking(true);
    try {
      const uci = await getBestMove(g.fen(), engineConfig);
      if (!mounted.current) return;
      const parsed = parseUciMove(uci);
      const g2 = new Chess(g.fen());
      const move = g2.move({
        from: parsed.from as Square,
        to: parsed.to as Square,
        promotion: parsed.promotion as PieceSymbol | undefined,
      });
      if (move) {
        setGame(g2);
        setLastMove({ from: parsed.from, to: parsed.to });
        setMoveHistory(h => [...h, { san: move.san, classification: null, cpLoss: 0 }]);
        if (g2.isGameOver()) { setGameOver(true); saveGame(g2); }
      }
    } finally {
      if (mounted.current) setEngineThinking(false);
    }
  }, [engineConfig]);

  const showFeedback = (type: 'blunder' | 'good' | 'info', message: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ type, message });
    if (type === 'good') {
      feedbackTimer.current = setTimeout(() => {
        if (mounted.current) setFeedback(null);
      }, 1500);
    }
  };

  const handleMove = useCallback(async (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (gameOver || engineThinking) return;

    const fenBefore = game.fen();

    // Evaluate position before move
    let evalBefore: EvalResult;
    try {
      evalBefore = await getEvaluation(fenBefore, 10);
    } catch {
      evalBefore = { score: 0, mate: null, bestMove: '', pv: [] };
    }

    const g = new Chess(fenBefore);
    const move = g.move({ from, to, promotion });
    if (!move) return;

    // Evaluate position after player's move
    let evalAfter: EvalResult;
    try {
      evalAfter = await getEvaluation(g.fen(), 10);
    } catch {
      evalAfter = { score: 0, mate: null, bestMove: '', pv: [] };
    }

    const cpLoss = calculateCpLoss(evalBefore.score, evalAfter.score);

    const classification = classifyMove(cpLoss);

    setGame(g);
    setLastMove({ from, to });
    setLastEval(evalAfter);
    setMoveHistory(h => [...h, { san: move.san, classification, cpLoss }]);

    if (classification === 'blunder') {
      // Detect what was hung
      let piece = move.piece.toUpperCase();
      if (piece === 'P') piece = 'pawn';
      else if (piece === 'N') piece = 'knight';
      else if (piece === 'B') piece = 'bishop';
      else if (piece === 'R') piece = 'rook';
      else if (piece === 'Q') piece = 'queen';
      else if (piece === 'K') piece = 'king';

      showFeedback('blunder', `That was a blunder! You may have left your ${piece} in danger. Take back?`);
      setUndoAvailable(true);
      setUndoFen(fenBefore);
      return; // Don't let engine respond yet
    } else if (classification === 'mistake') {
      showFeedback('info', 'Not the best move — there was something better.');
    } else if (classification === 'best' || classification === 'brilliant') {
      showFeedback('good', 'Nice move!');
    } else {
      setFeedback(null);
    }

    setUndoAvailable(false);
    setUndoFen(null);

    if (g.isGameOver()) {
      setGameOver(true);
      saveGame(g);
      return;
    }

    // Engine responds
    await makeEngineMove(g);
  }, [game, gameOver, engineThinking, playerColor, makeEngineMove, saveGame]);

  const handleUndo = () => {
    if (undoFen) {
      takebacksUsed.current += 1;
      const g = new Chess(undoFen);
      setGame(g);
      setMoveHistory(h => h.slice(0, -1));
      setFeedback({ type: 'info', message: 'Move taken back. Try a different move.' });
      setUndoAvailable(false);
      setUndoFen(null);
    }
  };

  const handleContinue = () => {
    setUndoAvailable(false);
    setUndoFen(null);
    setFeedback(null);
    if (!game.isGameOver()) {
      makeEngineMove(game);
    }
  };

  const newGame = () => {
    const g = new Chess();
    setGame(g);
    setLastMove(null);
    setMoveHistory([]);
    setGameOver(false);
    setFeedback(null);
    setUndoAvailable(false);
    setUndoFen(null);
    setLastEval(null);
    takebacksUsed.current = 0;
    sessionStartedAt.current = Date.now();
    gameSaved.current = false;
    if (playerColor === 'b') {
      makeEngineMove(g);
    }
  };

  // Post-game summary
  const playerMoves = moveHistory.filter((_, i) => playerColor === 'w' ? i % 2 === 0 : i % 2 === 1);
  const blunderCount = playerMoves.filter(m => m.classification === 'blunder').length;
  const mistakeCount = playerMoves.filter(m => m.classification === 'mistake').length;
  const goodMoves = playerMoves.filter(m => m.classification === 'best' || m.classification === 'good' || m.classification === 'brilliant').length;
  const summary: TrainingSessionSummary = {
    score: playerMoves.length > 0 ? Math.max((goodMoves - blunderCount * 1.5 - mistakeCount * 0.5) / playerMoves.length, 0) : 0,
    attempts: playerMoves.length,
    successes: goodMoves,
    firstTrySuccesses: Math.max(goodMoves - takebacksUsed.current, 0),
    hintsUsed: takebacksUsed.current,
    elapsedMs: Date.now() - sessionStartedAt.current,
    metadata: {
      trainer: 'coaching-game',
      blunders: blunderCount,
      mistakes: mistakeCount,
      goodMoves,
      playerColor,
      result: game.isCheckmate() ? (game.turn() !== playerColor ? 'win' : 'loss') : 'draw',
    },
  };

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

          {(coachingMessage || successMetric) && (
            <div className={styles.coaching}>
              {coachingMessage && <div>{coachingMessage}</div>}
              {successMetric && <div className={styles.goalText}>Goal: {successMetric}</div>}
            </div>
          )}

          <div className={styles.playerInfo}>
            Playing as {playerColor === 'w' ? 'White' : 'Black'} with coaching
          </div>

          {feedback && (
            <div className={`${styles.feedback} ${styles[feedback.type]}`}>
              {feedback.message}
              {undoAvailable && (
                <div className={styles.undoActions}>
                  <button className={styles.undoBtn} onClick={handleUndo}>Take Back</button>
                  <button className={styles.continueBtn} onClick={handleContinue}>Keep Move</button>
                </div>
              )}
            </div>
          )}

          {engineThinking && <div className={styles.thinking}>Engine thinking...</div>}

          {gameOver && (
            <div className={styles.gameOverPanel}>
              <h3>Game Over</h3>
              <div className={styles.summary}>
                {game.isCheckmate() && (
                  <div className={styles.result}>
                    {game.turn() !== playerColor ? 'You won!' : 'You lost.'}
                  </div>
                )}
                {game.isDraw() && <div className={styles.result}>Draw</div>}
                <div className={styles.summaryStats}>
                  <span>Good moves: {goodMoves}</span>
                  <span>Mistakes: {mistakeCount}</span>
                  <span>Blunders: {blunderCount}</span>
                </div>
                {blunderCount > 0 && (
                  <div className={styles.tip}>Tip: Focus on checking if your pieces are safe before moving.</div>
                )}
              </div>
              <div className={styles.gameOverActions}>
                <button className={styles.newGameBtn} onClick={newGame}>Play Again</button>
                {onGameOver && (
                  <button className={styles.doneBtn} onClick={() => onGameOver(summary)}>Done</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
