import { describe, it, expect } from 'vitest';
import { calculateNewRating, DEFAULT_RATING } from '@/lib/rating';

describe('calculateNewRating', () => {
  it('should increase rating on a win', () => {
    const result = calculateNewRating(
      { rating: 1500, rd: 200, volatility: 0.06 },
      [{ opponentRating: 1500, opponentRd: 200, score: 1 }]
    );
    expect(result.rating).toBeGreaterThan(1500);
  });

  it('should decrease rating on a loss', () => {
    const result = calculateNewRating(
      { rating: 1500, rd: 200, volatility: 0.06 },
      [{ opponentRating: 1500, opponentRd: 200, score: 0 }]
    );
    expect(result.rating).toBeLessThan(1500);
  });

  it('should adjust rating toward opponent on a draw between equal players', () => {
    const result = calculateNewRating(
      { rating: 1500, rd: 200, volatility: 0.06 },
      [{ opponentRating: 1500, opponentRd: 200, score: 0.5 }]
    );
    // Draw between equal players should keep rating close to 1500
    expect(Math.abs(result.rating - 1500)).toBeLessThan(10);
  });

  it('should produce bigger rating changes with high RD', () => {
    const highRd = calculateNewRating(
      { rating: 1500, rd: 350, volatility: 0.06 },
      [{ opponentRating: 1500, opponentRd: 200, score: 1 }]
    );
    const lowRd = calculateNewRating(
      { rating: 1500, rd: 50, volatility: 0.06 },
      [{ opponentRating: 1500, opponentRd: 200, score: 1 }]
    );
    const highChange = Math.abs(highRd.rating - 1500);
    const lowChange = Math.abs(lowRd.rating - 1500);
    expect(highChange).toBeGreaterThan(lowChange);
  });

  it('should only increase RD when no games are played', () => {
    const result = calculateNewRating(
      { rating: 1500, rd: 200, volatility: 0.06 },
      []
    );
    expect(result.rating).toBe(1500);
    expect(result.rd).toBeGreaterThan(200);
  });

  it('should have correct DEFAULT_RATING values', () => {
    expect(DEFAULT_RATING.rating).toBe(1500);
    expect(DEFAULT_RATING.rd).toBe(350);
    expect(DEFAULT_RATING.volatility).toBe(0.06);
  });
});
