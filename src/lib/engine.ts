// Stockfish engine wrapper for browser
// Uses the single-threaded lite WASM build served from /stockfish/

type EngineCallback = (bestMove: string) => void;

let engine: Worker | null = null;
let pendingCallback: EngineCallback | null = null;
let isReady = false;
let readyResolve: (() => void) | null = null;

function getEngine(): Worker {
  if (engine) return engine;

  // Load stockfish directly from public directory so it can resolve its .wasm file
  engine = new Worker('/stockfish/stockfish.js');

  engine.onmessage = (e: MessageEvent) => {
    const line = typeof e.data === 'string' ? e.data : e.data?.toString() || '';

    if (line === 'uciok') {
      engine!.postMessage('isready');
    }

    if (line === 'readyok') {
      isReady = true;
      if (readyResolve) {
        readyResolve();
        readyResolve = null;
      }
    }

    // Parse bestmove response
    if (line.startsWith('bestmove') && pendingCallback) {
      const parts = line.split(' ');
      const move = parts[1];
      if (move && move !== '(none)') {
        const cb = pendingCallback;
        pendingCallback = null;
        cb(move);
      }
    }
  };

  engine.postMessage('uci');
  return engine;
}

function waitReady(): Promise<void> {
  if (isReady) return Promise.resolve();
  return new Promise(resolve => {
    readyResolve = resolve;
  });
}

export interface EngineConfig {
  depth: number;      // search depth (1-20)
  skillLevel: number; // 0-20, maps to Stockfish Skill Level
}

// Difficulty presets
export const DIFFICULTY_PRESETS: Record<string, { label: string; depth: number; skillLevel: number; elo: string }> = {
  beginner:     { label: 'Beginner',     depth: 3,  skillLevel: 1,  elo: '~400-800' },
  easy:         { label: 'Easy',         depth: 5,  skillLevel: 5,  elo: '~800-1200' },
  intermediate: { label: 'Intermediate', depth: 8,  skillLevel: 10, elo: '~1200-1600' },
  advanced:     { label: 'Advanced',     depth: 12, skillLevel: 15, elo: '~1600-2000' },
  expert:       { label: 'Expert',       depth: 16, skillLevel: 20, elo: '~2000-2500' },
  maximum:      { label: 'Maximum',      depth: 20, skillLevel: 20, elo: '2800+' },
};

export async function getBestMove(fen: string, config: EngineConfig): Promise<string> {
  const w = getEngine();
  await waitReady();

  return new Promise((resolve) => {
    pendingCallback = resolve;
    w.postMessage(`setoption name Skill Level value ${config.skillLevel}`);
    w.postMessage(`position fen ${fen}`);
    w.postMessage(`go depth ${config.depth}`);
  });
}

export function destroyEngine(): void {
  if (engine) {
    engine.terminate();
    engine = null;
    isReady = false;
    pendingCallback = null;
  }
}

// Convert UCI move string (e.g. "e2e4") to { from, to, promotion? }
export function parseUciMove(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}

// Get the raw worker for advanced use (e.g. analysis)
export function getEngineWorker(): Worker {
  return getEngine();
}

export async function waitEngineReady(): Promise<void> {
  getEngine();
  await waitReady();
}

// Evaluate a position and return score + best move
export interface EvalResult {
  score: number;      // centipawns
  mate: number | null;
  bestMove: string;
  pv: string[];
}

export async function getEvaluation(fen: string, depth: number = 12): Promise<EvalResult> {
  const w = getEngine();
  await waitReady();

  return new Promise((resolve) => {
    let bestEval: EvalResult = { score: 0, mate: null, bestMove: '', pv: [] };

    function onMessage(e: MessageEvent) {
      const line = typeof e.data === 'string' ? e.data : '';

      if (line.includes('info') && line.includes('score') && line.includes(' pv ')) {
        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
        const pvMatch = line.match(/\bpv\s+(.+)$/);

        if (scoreMatch) {
          if (scoreMatch[1] === 'cp') {
            bestEval.score = parseInt(scoreMatch[2]);
            bestEval.mate = null;
          } else {
            bestEval.mate = parseInt(scoreMatch[2]);
            bestEval.score = bestEval.mate > 0 ? 10000 : -10000;
          }
        }
        if (pvMatch) {
          bestEval.pv = pvMatch[1].split(/\s+/);
          bestEval.bestMove = bestEval.pv[0] || '';
        }
      }

      if (line.startsWith('bestmove')) {
        w.removeEventListener('message', onMessage);
        const parts = line.split(' ');
        if (parts[1] && parts[1] !== '(none)') {
          bestEval.bestMove = bestEval.bestMove || parts[1];
        }
        resolve(bestEval);
      }
    }

    w.addEventListener('message', onMessage);
    w.postMessage(`setoption name Skill Level value 20`);
    w.postMessage(`position fen ${fen}`);
    w.postMessage(`go depth ${depth}`);
  });
}
