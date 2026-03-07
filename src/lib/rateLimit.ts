const requestLog = new Map<string, number[]>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, timestamps] of requestLog) {
    const filtered = timestamps.filter(t => t > cutoff);
    if (filtered.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, filtered);
    }
  }
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  cleanup(windowMs);

  const cutoff = now - windowMs;
  const timestamps = (requestLog.get(key) || []).filter(t => t > cutoff);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    const retryAfterMs = oldest + windowMs - now;
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
  return { allowed: true, remaining: maxRequests - timestamps.length, retryAfterMs: 0 };
}
