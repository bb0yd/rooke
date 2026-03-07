// Client-side game analysis using Stockfish WASM
// Analyzes a PGN game move-by-move and produces accuracy, blunder counts,
// hung piece detection, missed tactics, and phase-based accuracy.

import { Chess, Square, PieceSymbol } from 'chess.js';
import {
  analyzePositionWithWorker,
  classifyMove,
  calculateAccuracy,
  calculateCpLoss,
  MoveClassification,
  uciToSan,
} from './analysis';

export interface MissedTactic {
  theme: string;
  fen: string;
  bestMove: string;
  cpLoss: number;
}

export interface PhaseAccuracy {
  opening: number;
  middlegame: number;
  endgame: number;
}

export interface AnalyzedGameMove {
  moveNumber: number;
  plyIndex: number;
  playerColor: 'w' | 'b';
  san: string;
  bestMoveUci: string | null;
  bestMove: string | null;
  cpLoss: number;
  classification: MoveClassification;
  phase: 'opening' | 'middlegame' | 'endgame';
  hungPiece: boolean;
  mistakeTheme: string | null;
  fenBefore: string;
}

export interface GameAnalysisResult {
  accuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  hungPieces: number;
  missedTactics: MissedTactic[];
  phaseAccuracy: PhaseAccuracy;
  moves: AnalyzedGameMove[];
}

function getPhase(moveNumber: number): 'opening' | 'middlegame' | 'endgame' {
  if (moveNumber <= 10) return 'opening';
  if (moveNumber <= 25) return 'middlegame';
  return 'endgame';
}

// Detect if a piece is left en prise (undefended and attacked).
function isHungPiece(fen: string, moveSan: string): boolean {
  try {
    const game = new Chess(fen);
    const move = game.move(moveSan);
    if (!move) return false;

    const to = move.to as Square;
    const movedColor = move.color;
    const opponentColor = movedColor === 'w' ? 'b' : 'w';

    if (!game.isAttacked(to, opponentColor)) return false;

    const piece = game.get(to);
    if (!piece) return false;

    // Pawns aren't considered "hung pieces" for beginner coaching
    if (piece.type === 'p') return false;

    return !game.isAttacked(to, movedColor);
  } catch {
    return false;
  }
}

// Simple tactical theme detection from the best move
function detectTacticalTheme(fen: string, bestMoveUci: string): string | null {
  try {
    const game = new Chess(fen);
    const from = bestMoveUci.slice(0, 2) as Square;
    const to = bestMoveUci.slice(2, 4) as Square;
    const promotion = bestMoveUci.length > 4 ? (bestMoveUci[4] as PieceSymbol) : undefined;

    const move = game.move({ from, to, promotion });
    if (!move) return null;

    // Check for checkmate
    if (game.isCheckmate()) return 'checkmate';

    // Check for check (could be part of a tactic)
    if (game.inCheck()) {
      // Fork detection: piece gives check and attacks another piece
      const attackerSquare = to;
      const opponentColor = move.color === 'w' ? 'b' : 'w';
      const attacked = game.moves({ verbose: true }).filter(m => m.from === attackerSquare);
      // If the piece attacks multiple opponent pieces while giving check, it's a fork
      if (attacked.length > 0) return 'fork';
      return 'check';
    }

    // Capture of higher-value piece
    if (move.captured) {
      const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
      const capturedVal = values[move.captured] || 0;
      const movedVal = values[move.piece] || 0;
      if (capturedVal > movedVal + 1) return 'winning-capture';
    }

    return null;
  } catch {
    return null;
  }
}

export type ProgressCallback = (current: number, total: number) => void;

export async function analyzeGame(
  pgn: string,
  playerColor: 'w' | 'b',
  onProgress?: ProgressCallback
): Promise<GameAnalysisResult> {
  const game = new Chess();
  game.loadPgn(pgn);
  const moves = game.history({ verbose: true });

  if (moves.length === 0) {
    return {
      accuracy: 100, blunders: 0, mistakes: 0, inaccuracies: 0,
      hungPieces: 0, missedTactics: [], phaseAccuracy: { opening: 100, middlegame: 100, endgame: 100 }, moves: [],
    };
  }

  // Create a worker for analysis
  const worker = new Worker('/stockfish/stockfish.js');
  await new Promise<void>(resolve => {
    const handler = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : '';
      if (line === 'uciok') worker.postMessage('isready');
      if (line === 'readyok') { worker.removeEventListener('message', handler); resolve(); }
    };
    worker.addEventListener('message', handler);
    worker.postMessage('uci');
  });

  const depth = 12;
  let blunders = 0, mistakes = 0, inaccuracies = 0, hungPieces = 0;
  const missedTactics: MissedTactic[] = [];
  const analyzedMoves: AnalyzedGameMove[] = [];
  const cpLosses: number[] = [];
  const phaseLosses: Record<string, number[]> = { opening: [], middlegame: [], endgame: [] };

  // Replay game and evaluate each position
  const replay = new Chess();
  const totalMoves = moves.filter(m => m.color === playerColor).length;
  let playerMoveCount = 0;

  for (let i = 0; i < moves.length; i++) {
    const fenBefore = replay.fen();
    const move = moves[i];
    replay.move(move.san);

    // Only analyze player's moves
    if (move.color !== playerColor) continue;

    playerMoveCount++;
    onProgress?.(playerMoveCount, totalMoves);

    // Evaluate position before the move
    const evalBefore = await analyzePositionWithWorker(worker, fenBefore, depth);

    // Evaluate position after the move
    const fenAfter = replay.fen();
    const evalAfter = await analyzePositionWithWorker(worker, fenAfter, depth);

    const cpLoss = calculateCpLoss(evalBefore.score, evalAfter.score);

    cpLosses.push(cpLoss);

    const moveNum = Math.ceil((i + 1) / 2);
    const phase = getPhase(moveNum);
    phaseLosses[phase].push(cpLoss);

    const classification = classifyMove(cpLoss);
    const bestMoveUci = evalBefore.bestMove || null;
    const bestMove = evalBefore.bestMove ? uciToSan(fenBefore, evalBefore.bestMove) : null;
    const hungPiece = classification === 'blunder' && isHungPiece(fenBefore, move.san);
    const mistakeTheme = cpLoss > 100 && evalBefore.bestMove
      ? detectTacticalTheme(fenBefore, evalBefore.bestMove)
      : null;

    if (classification === 'blunder') {
      blunders++;
      if (hungPiece) {
        hungPieces++;
      }
    }
    if (classification === 'mistake') mistakes++;
    if (classification === 'inaccuracy') inaccuracies++;

    analyzedMoves.push({
      moveNumber: moveNum,
      plyIndex: i + 1,
      playerColor,
      san: move.san,
      bestMoveUci,
      bestMove,
      cpLoss,
      classification,
      phase,
      hungPiece,
      mistakeTheme,
      fenBefore,
    });

    if (mistakeTheme && bestMove) {
        missedTactics.push({
          theme: mistakeTheme,
          fen: fenBefore,
          bestMove,
          cpLoss,
        });
    }
  }

  worker.terminate();

  const accuracy = calculateAccuracy(cpLosses);

  const phaseAccuracy: PhaseAccuracy = {
    opening: calculateAccuracy(phaseLosses.opening),
    middlegame: calculateAccuracy(phaseLosses.middlegame),
    endgame: calculateAccuracy(phaseLosses.endgame),
  };

  return {
    accuracy, blunders, mistakes, inaccuracies,
    hungPieces, missedTactics, phaseAccuracy, moves: analyzedMoves,
  };
}
