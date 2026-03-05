export interface LineStats {
  attempts: number;
  clean: number;
  mistakes: number;
  lastPracticed: number;
  easeFactor: number;
  intervalDays: number;
  nextReview: number;
}

type StatsStore = Record<string, Record<string, LineStats>>;

const STORAGE_KEY = 'trainerStats';

function emptyStats(): LineStats {
  return { attempts: 0, clean: 0, mistakes: 0, lastPracticed: 0, easeFactor: 2.5, intervalDays: 0, nextReview: 0 };
}

function loadAll(): StatsStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(store: StatsStore): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// Sync a single stat to the server (fire-and-forget)
function syncToServer(openingId: string, lineId: string, stats: LineStats): void {
  fetch('/api/trainer-stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      openingId,
      lineId,
      attempts: stats.attempts,
      clean: stats.clean,
      mistakes: stats.mistakes,
      lastPracticed: stats.lastPracticed,
      easeFactor: stats.easeFactor,
      intervalDays: stats.intervalDays,
      nextReview: stats.nextReview,
    }),
  }).catch(() => { /* silent - localStorage is the fallback */ });
}

// Fetch all stats from server and merge with localStorage (server wins if newer)
export async function syncFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/trainer-stats');
    if (!res.ok) return;
    const serverStore: StatsStore = await res.json();
    const localStore = loadAll();

    let merged = false;
    for (const [openingId, lines] of Object.entries(serverStore)) {
      if (!localStore[openingId]) localStore[openingId] = {};
      for (const [lineId, stats] of Object.entries(lines)) {
        const local = localStore[openingId][lineId];
        // Server data wins if it has more attempts, or if local doesn't exist
        if (!local || stats.attempts > local.attempts || stats.lastPracticed > local.lastPracticed) {
          localStore[openingId][lineId] = { ...emptyStats(), ...stats };
          merged = true;
        }
      }
    }

    // Also push any local-only data to server
    for (const [openingId, lines] of Object.entries(localStore)) {
      for (const [lineId, stats] of Object.entries(lines)) {
        const server = serverStore[openingId]?.[lineId];
        if (!server || stats.attempts > server.attempts) {
          syncToServer(openingId, lineId, stats);
        }
      }
    }

    if (merged) saveAll(localStore);
  } catch {
    // Offline - localStorage is still available
  }
}

export function getLineStats(openingId: string, lineId: string): LineStats {
  const store = loadAll();
  return store[openingId]?.[lineId] ?? emptyStats();
}

export function recordAttempt(openingId: string, lineId: string, hadMistake: boolean): void {
  const store = loadAll();
  if (!store[openingId]) store[openingId] = {};
  const prev = store[openingId][lineId] ?? emptyStats();
  const updated: LineStats = {
    attempts: prev.attempts + 1,
    clean: prev.clean + (hadMistake ? 0 : 1),
    mistakes: prev.mistakes + (hadMistake ? 1 : 0),
    lastPracticed: Date.now(),
    easeFactor: prev.easeFactor,
    intervalDays: prev.intervalDays,
    nextReview: prev.nextReview,
  };
  store[openingId][lineId] = updated;
  saveAll(store);
  syncToServer(openingId, lineId, updated);
}

export function updateSpacedRepetition(
  openingId: string,
  lineId: string,
  easeFactor: number,
  intervalDays: number,
  nextReview: number
): void {
  const store = loadAll();
  if (!store[openingId]) store[openingId] = {};
  const prev = store[openingId][lineId] ?? emptyStats();
  const updated: LineStats = { ...prev, easeFactor, intervalDays, nextReview };
  store[openingId][lineId] = updated;
  saveAll(store);
  syncToServer(openingId, lineId, updated);
}

export function isMastered(stats: LineStats): boolean {
  const total = stats.clean + stats.mistakes;
  return total > 0 && stats.clean >= 3 && stats.clean / total >= 0.8;
}

export function isStruggling(stats: LineStats): boolean {
  const total = stats.clean + stats.mistakes;
  return stats.attempts >= 2 && total > 0 && stats.mistakes / total > 0.5;
}

export function isDueForReview(stats: LineStats): boolean {
  return stats.nextReview > 0 && Date.now() >= stats.nextReview;
}

export interface OpeningProgress {
  total: number;
  mastered: number;
  struggling: number;
  untouched: number;
}

export function getOpeningStats(openingId: string, lineIds: string[]): OpeningProgress {
  const store = loadAll();
  const opening = store[openingId] ?? {};
  let mastered = 0;
  let struggling = 0;
  let untouched = 0;

  for (const lineId of lineIds) {
    const s = opening[lineId] ?? emptyStats();
    if (s.attempts === 0) {
      untouched++;
    } else if (isMastered(s)) {
      mastered++;
    } else if (isStruggling(s)) {
      struggling++;
    }
  }

  return { total: lineIds.length, mastered, struggling, untouched };
}

export function resetStats(openingId: string): void {
  const store = loadAll();
  delete store[openingId];
  saveAll(store);
}
