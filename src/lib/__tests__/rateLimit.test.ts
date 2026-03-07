import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit } from '../rateLimit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function uniqueKey() {
    return `test-${Math.random().toString(36).slice(2)}`;
  }

  it('allows requests within the limit', () => {
    const key = uniqueKey();
    const result = rateLimit(key, 3, 10_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.retryAfterMs).toBe(0);
  });

  it('decrements remaining count with each request', () => {
    const key = uniqueKey();
    const r1 = rateLimit(key, 3, 10_000);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit(key, 3, 10_000);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit(key, 3, 10_000);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests when the limit is exceeded', () => {
    const key = uniqueKey();
    rateLimit(key, 2, 10_000);
    rateLimit(key, 2, 10_000);
    const result = rateLimit(key, 2, 10_000);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('provides retryAfterMs when blocked', () => {
    const key = uniqueKey();
    const windowMs = 5_000;
    rateLimit(key, 1, windowMs);
    const result = rateLimit(key, 1, windowMs);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(windowMs);
  });

  it('allows requests again after the window expires', () => {
    const key = uniqueKey();
    const windowMs = 100;

    vi.useFakeTimers();
    rateLimit(key, 1, windowMs);

    const blocked = rateLimit(key, 1, windowMs);
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(windowMs + 1);

    const allowed = rateLimit(key, 1, windowMs);
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(0);

    vi.useRealTimers();
  });

  it('uses separate limits for different keys', () => {
    const key1 = uniqueKey();
    const key2 = uniqueKey();

    rateLimit(key1, 1, 10_000);
    const result1 = rateLimit(key1, 1, 10_000);
    expect(result1.allowed).toBe(false);

    const result2 = rateLimit(key2, 1, 10_000);
    expect(result2.allowed).toBe(true);
  });
});
