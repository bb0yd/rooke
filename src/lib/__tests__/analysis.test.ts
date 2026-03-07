import { describe, it, expect } from 'vitest';
import {
  classifyMove,
  classificationColor,
  isBrilliantMove,
  calculateAccuracy,
  calculateCpLoss,
  parseInfoLine,
  uciToSan,
  detectOpeningName,
} from '../analysis';

describe('classifyMove', () => {
  it('returns "best" for cpLoss <= 20', () => {
    expect(classifyMove(0)).toBe('best');
    expect(classifyMove(10)).toBe('best');
    expect(classifyMove(20)).toBe('best');
  });

  it('returns "good" for cpLoss 21-50', () => {
    expect(classifyMove(21)).toBe('good');
    expect(classifyMove(50)).toBe('good');
  });

  it('returns "inaccuracy" for cpLoss 51-100', () => {
    expect(classifyMove(51)).toBe('inaccuracy');
    expect(classifyMove(100)).toBe('inaccuracy');
  });

  it('returns "mistake" for cpLoss 101-200', () => {
    expect(classifyMove(101)).toBe('mistake');
    expect(classifyMove(200)).toBe('mistake');
  });

  it('returns "blunder" for cpLoss > 200', () => {
    expect(classifyMove(201)).toBe('blunder');
    expect(classifyMove(500)).toBe('blunder');
  });
});

describe('classificationColor', () => {
  it('returns correct color for each classification', () => {
    expect(classificationColor('brilliant')).toBe('#26c6da');
    expect(classificationColor('best')).toBe('#4caf50');
    expect(classificationColor('good')).toBe('#8bc34a');
    expect(classificationColor('inaccuracy')).toBe('#ffc107');
    expect(classificationColor('mistake')).toBe('#ff9800');
    expect(classificationColor('blunder')).toBe('#f44336');
  });
});

describe('isBrilliantMove', () => {
  it('returns true when all conditions are met', () => {
    expect(isBrilliantMove(10, true, ['e2e4', 'g8f6'], 60)).toBe(true);
  });

  it('returns false when cpLoss > 20', () => {
    expect(isBrilliantMove(25, true, ['e2e4', 'g8f6'], 60)).toBe(false);
  });

  it('returns false when not top choice', () => {
    expect(isBrilliantMove(10, false, ['e2e4', 'g8f6'], 60)).toBe(false);
  });

  it('returns false when advantage over second best is insufficient', () => {
    expect(isBrilliantMove(10, true, ['e2e4', 'g8f6'], 40)).toBe(false);
  });

  it('returns false when there is an immediate recapture', () => {
    expect(isBrilliantMove(10, true, ['d5e4', 'f3e4'], 60)).toBe(false);
  });

  it('returns true with short PV (no recapture check possible)', () => {
    expect(isBrilliantMove(5, true, ['e2e4'], 100)).toBe(true);
  });

  it('returns true with empty PV', () => {
    expect(isBrilliantMove(0, true, [], 50)).toBe(true);
  });
});

describe('calculateAccuracy', () => {
  it('returns 100 for empty array', () => {
    expect(calculateAccuracy([])).toBe(100);
  });

  it('returns 100 for all-zero cpLoss', () => {
    expect(calculateAccuracy([0, 0, 0])).toBe(100);
  });

  it('returns a lower value for high cpLoss', () => {
    const result = calculateAccuracy([200, 300, 400]);
    expect(result).toBeLessThan(50);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('returns a value between 0 and 100 for moderate losses', () => {
    const result = calculateAccuracy([10, 20, 50, 100]);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('produces higher accuracy for smaller losses', () => {
    const highAccuracy = calculateAccuracy([5, 10, 15]);
    const lowAccuracy = calculateAccuracy([100, 200, 300]);
    expect(highAccuracy).toBeGreaterThan(lowAccuracy);
  });
});

describe('calculateCpLoss', () => {
  it('returns the mover-relative cp loss across a move transition', () => {
    expect(calculateCpLoss(50, -20)).toBe(30);
  });

  it('returns zero when the move improves the position', () => {
    expect(calculateCpLoss(20, -60)).toBe(0);
  });

  it('works for black moves without a color-specific branch', () => {
    expect(calculateCpLoss(-40, 10)).toBe(0);
    expect(calculateCpLoss(-10, 80)).toBe(70);
  });
});

describe('parseInfoLine', () => {
  it('parses centipawn score', () => {
    const result = parseInfoLine('info depth 20 score cp 35 nodes 100000 pv e2e4 e7e5');
    expect(result.score).toBe(35);
    expect(result.mate).toBeNull();
  });

  it('parses negative centipawn score', () => {
    const result = parseInfoLine('info depth 20 score cp -120 nodes 50000 pv d7d5');
    expect(result.score).toBe(-120);
    expect(result.mate).toBeNull();
  });

  it('parses mate score (positive)', () => {
    const result = parseInfoLine('info depth 30 score mate 3 pv e1g1 f8c5');
    expect(result.mate).toBe(3);
    expect(result.score).toBe(10000);
  });

  it('parses mate score (negative)', () => {
    const result = parseInfoLine('info depth 30 score mate -2 pv e8g8');
    expect(result.mate).toBe(-2);
    expect(result.score).toBe(-10000);
  });

  it('parses PV moves', () => {
    const result = parseInfoLine('info depth 20 score cp 50 pv e2e4 e7e5 g1f3');
    expect(result.pv).toEqual(['e2e4', 'e7e5', 'g1f3']);
    expect(result.bestMove).toBe('e2e4');
  });

  it('returns empty object for non-matching line', () => {
    const result = parseInfoLine('bestmove e2e4 ponder e7e5');
    expect(result.score).toBeUndefined();
    expect(result.pv).toBeUndefined();
  });
});

describe('uciToSan', () => {
  const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('converts e2e4 to e4 from starting position', () => {
    expect(uciToSan(startingFen, 'e2e4')).toBe('e4');
  });

  it('converts g1f3 to Nf3 from starting position', () => {
    expect(uciToSan(startingFen, 'g1f3')).toBe('Nf3');
  });

  it('returns the UCI string for an invalid move', () => {
    expect(uciToSan(startingFen, 'a1a8')).toBe('a1a8');
  });

  it('handles promotion moves', () => {
    const promoFen = '8/P7/8/8/8/8/8/4K2k w - - 0 1';
    const result = uciToSan(promoFen, 'a7a8q');
    expect(result).toBe('a8=Q+');
  });
});

describe('detectOpeningName', () => {
  it('detects the Sicilian Defense', () => {
    expect(detectOpeningName('1. e4 c5')).toBe('Sicilian Defense');
  });

  it('detects the Italian Game', () => {
    expect(detectOpeningName('1. e4 e5 2. Nf3 Nc6 3. Bc4')).toBe('Italian Game');
  });

  it('detects the Ruy Lopez', () => {
    expect(detectOpeningName('1. e4 e5 2. Nf3 Nc6 3. Bb5')).toBe('Ruy Lopez');
  });

  it("detects the Queen's Gambit", () => {
    expect(detectOpeningName('1. d4 d5 2. c4')).toBe("Queen's Gambit");
  });

  it('prefers the longest matching opening', () => {
    expect(detectOpeningName('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5')).toBe('Italian Game');
  });

  it('returns null for unknown openings', () => {
    expect(detectOpeningName('1. a3 a6 2. b3')).toBeNull();
  });

  it('returns null for invalid PGN', () => {
    expect(detectOpeningName('not valid pgn moves xyz')).toBeNull();
  });

  it('detects the English Opening', () => {
    expect(detectOpeningName('1. c4')).toBe('English Opening');
  });

  it('detects the French Defense', () => {
    expect(detectOpeningName('1. e4 e6')).toBe('French Defense');
  });
});
