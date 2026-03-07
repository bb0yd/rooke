import { describe, it, expect, vi } from 'vitest';
import { calculateNextReview, performanceToQuality } from '@/lib/spacedRepetition';

describe('calculateNextReview', () => {
  it('should extend interval on quality=5 (easy)', () => {
    const result = calculateNextReview(5, 2.5, 10);
    // With EF 2.5 and quality 5, interval should be 10 * newEF
    expect(result.intervalDays).toBeGreaterThan(10);
    expect(result.easeFactor).toBeGreaterThanOrEqual(2.5);
  });

  it('should reset interval on quality=0 (fail)', () => {
    const result = calculateNextReview(0, 2.5, 10);
    expect(result.intervalDays).toBe(1);
    // EF should not change on failure
    expect(result.easeFactor).toBe(2.5);
  });

  it('should not let ease factor drop below 1.3', () => {
    // quality=3 with already low EF
    const result = calculateNextReview(3, 1.3, 10);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('should set interval to 1 when current interval is 0', () => {
    const result = calculateNextReview(5, 2.5, 0);
    expect(result.intervalDays).toBe(1);
  });

  it('should set interval to 6 when current interval is 1', () => {
    const result = calculateNextReview(4, 2.5, 1);
    expect(result.intervalDays).toBe(6);
  });

  it('should return a future nextReview timestamp', () => {
    const before = Date.now();
    const result = calculateNextReview(4, 2.5, 10);
    expect(result.nextReview).toBeGreaterThan(before);
  });
});

describe('performanceToQuality', () => {
  it('should return 2 when there was a mistake', () => {
    expect(performanceToQuality(true)).toBe(2);
  });

  it('should return 5 for fast correct answer', () => {
    expect(performanceToQuality(false, 3000)).toBe(5);
  });

  it('should return 4 for moderate time correct answer', () => {
    expect(performanceToQuality(false, 10000)).toBe(4);
  });

  it('should return 3 for slow correct answer', () => {
    expect(performanceToQuality(false, 20000)).toBe(3);
  });
});
