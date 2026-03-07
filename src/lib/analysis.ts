// Game analysis utilities using Stockfish engine
// Provides move classification, accuracy calculation, and game analysis

import { Chess, Square, PieceSymbol } from 'chess.js';

export interface PositionEval {
  score: number;       // centipawns (positive = advantage for the side to move)
  mate: number | null;  // mate in N moves (positive = mate for the side to move)
  bestMove: string;    // UCI format
  pv: string[];        // principal variation
}

export type MoveClassification = 'brilliant' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface AnalyzedMove {
  move: string;          // SAN notation
  moveUci: string;       // UCI notation
  fen: string;           // position after move
  evalBefore: PositionEval;
  evalAfter: PositionEval;
  classification: MoveClassification;
  cpLoss: number;        // centipawn loss (0 = best move)
  bestMove: string;      // best move in SAN
}

export interface GameAnalysis {
  moves: AnalyzedMove[];
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteMoveBreakdown: Record<MoveClassification, number>;
  blackMoveBreakdown: Record<MoveClassification, number>;
}

// Centipawn loss thresholds for move classification
export function classifyMove(cpLoss: number): MoveClassification {
  if (cpLoss <= 20) return 'best';
  if (cpLoss <= 50) return 'good';
  if (cpLoss <= 100) return 'inaccuracy';
  if (cpLoss <= 200) return 'mistake';
  return 'blunder';
}

export function classificationColor(classification: MoveClassification): string {
  switch (classification) {
    case 'brilliant': return '#26c6da';
    case 'best': return '#4caf50';
    case 'good': return '#8bc34a';
    case 'inaccuracy': return '#ffc107';
    case 'mistake': return '#ff9800';
    case 'blunder': return '#f44336';
  }
}

// Check if a move is brilliant: top engine choice, sacrifices material (no immediate recapture in PV),
// and significantly better than the second-best move
export function isBrilliantMove(
  cpLoss: number,
  isTopChoice: boolean,
  pv: string[],
  evalAdvantageOverSecond: number
): boolean {
  if (cpLoss > 20) return false;       // must be close to best
  if (!isTopChoice) return false;       // must be engine's top choice
  if (evalAdvantageOverSecond < 50) return false; // must be >=50cp better than 2nd best
  // Check that the piece is not immediately recaptured (no recapture in first 2 PV moves)
  if (pv.length >= 2) {
    const moveTo = pv[0]?.slice(2, 4);
    const nextTo = pv[1]?.slice(2, 4);
    if (moveTo && nextTo && moveTo === nextTo) return false; // immediate recapture
  }
  return true;
}

// Convert centipawn score to win probability (for accuracy calculation)
function winProbability(cp: number): number {
  return 1 / (1 + Math.pow(10, -cp / 400));
}

// Calculate accuracy percentage from centipawn loss values
export function calculateAccuracy(cpLosses: number[]): number {
  if (cpLosses.length === 0) return 100;
  // Use the "win probability" method similar to chess.com
  let totalAccuracy = 0;
  for (const loss of cpLosses) {
    const accuracy = Math.max(0, 103.1668 * Math.exp(-0.04354 * Math.abs(loss)) - 3.1668);
    totalAccuracy += accuracy;
  }
  return Math.round((totalAccuracy / cpLosses.length) * 10) / 10;
}

// Stockfish scores are reported from the side-to-move perspective.
// Over a single move transition, the mover is to move before the move and the
// opponent is to move after the move, so the mover-relative cp loss is the
// drop from `evalBefore.score` to `-evalAfter.score`.
export function calculateCpLoss(evalBeforeScore: number, evalAfterScore: number): number {
  return Math.max(0, evalBeforeScore + evalAfterScore);
}

// Parse Stockfish UCI info lines
export function parseInfoLine(line: string): Partial<PositionEval> {
  const result: Partial<PositionEval> = {};

  // Parse score
  const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
  if (scoreMatch) {
    if (scoreMatch[1] === 'cp') {
      result.score = parseInt(scoreMatch[2]);
      result.mate = null;
    } else {
      result.mate = parseInt(scoreMatch[2]);
      result.score = result.mate > 0 ? 10000 : -10000;
    }
  }

  // Parse best move from PV
  const pvMatch = line.match(/\bpv\s+(.+)$/);
  if (pvMatch) {
    result.pv = pvMatch[1].split(/\s+/);
    if (result.pv.length > 0) {
      result.bestMove = result.pv[0];
    }
  }

  return result;
}

// Analyze a single position using the engine worker
export function analyzePositionWithWorker(
  worker: Worker,
  fen: string,
  depth: number
): Promise<PositionEval> {
  return new Promise((resolve) => {
    let bestEval: PositionEval = { score: 0, mate: null, bestMove: '', pv: [] };

    function onMessage(e: MessageEvent) {
      const line = typeof e.data === 'string' ? e.data : '';

      if (line.includes('info') && line.includes('score') && line.includes(' pv ')) {
        // Only parse lines with the target depth or highest depth seen
        const depthMatch = line.match(/\bdepth\s+(\d+)/);
        if (depthMatch) {
          const parsed = parseInfoLine(line);
          if (parsed.score !== undefined) {
            bestEval = {
              score: parsed.score ?? 0,
              mate: parsed.mate ?? null,
              bestMove: parsed.bestMove ?? '',
              pv: parsed.pv ?? [],
            };
          }
        }
      }

      if (line.startsWith('bestmove')) {
        worker.removeEventListener('message', onMessage);
        const parts = line.split(' ');
        if (parts[1] && parts[1] !== '(none)') {
          bestEval.bestMove = bestEval.bestMove || parts[1];
        }
        resolve(bestEval);
      }
    }

    worker.addEventListener('message', onMessage);
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);
  });
}

// Convert UCI move to SAN given a FEN position
export function uciToSan(fen: string, uci: string): string {
  try {
    const game = new Chess(fen);
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    const promotion = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;
    const move = game.move({ from, to, promotion });
    return move ? move.san : uci;
  } catch {
    return uci;
  }
}

// Detect opening name from first moves
export function detectOpeningName(pgn: string): string | null {
  const COMMON_OPENINGS: [string[], string][] = [
    [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], 'Italian Game'],
    [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], 'Ruy Lopez'],
    [['e4', 'e5', 'Nf3', 'Nc6', 'd4'], 'Scotch Game'],
    [['e4', 'c5'], 'Sicilian Defense'],
    [['e4', 'e6'], 'French Defense'],
    [['e4', 'c6'], 'Caro-Kann Defense'],
    [['e4', 'e5', 'Nc3'], 'Vienna Game'],
    [['e4', 'e5', 'Nf3', 'Nf6'], 'Petrov Defense'],
    [['d4', 'd5', 'c4'], "Queen's Gambit"],
    [['d4', 'Nf6', 'c4', 'g6'], "King's Indian Defense"],
    [['d4', 'd5', 'Bf4'], 'London System'],
    [['d4', 'Nf6', 'c4', 'e6'], 'Nimzo/Queen\'s Indian'],
    [['d4', 'f5'], 'Dutch Defense'],
    [['c4'], 'English Opening'],
    [['Nf3'], 'Reti Opening'],
    [['e4', 'e5'], "King's Pawn Game"],
    [['d4', 'd5'], "Queen's Pawn Game"],
  ];

  try {
    const game = new Chess();
    game.loadPgn(pgn);
    const moves = game.history();

    // Find the longest matching opening
    let bestMatch = '';
    let bestLen = 0;
    for (const [seq, name] of COMMON_OPENINGS) {
      if (seq.length > bestLen && seq.length <= moves.length) {
        let match = true;
        for (let i = 0; i < seq.length; i++) {
          if (moves[i] !== seq[i]) { match = false; break; }
        }
        if (match) {
          bestMatch = name;
          bestLen = seq.length;
        }
      }
    }
    return bestMatch || null;
  } catch {
    return null;
  }
}
