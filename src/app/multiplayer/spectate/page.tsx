'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import MiniBoard from '@/components/MiniBoard';
import styles from './spectate.module.css';

interface ActiveGame {
  id: number;
  white_username: string;
  black_username: string;
  fen: string;
  result: string;
  started_at: string;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SpectatePage() {
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [loading, setLoading] = useState(true);

  function fetchGames() {
    fetch('/api/multiplayer/active')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGames(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppShell>
      <div className={styles.page}>
        <h1 className={styles.title}>Spectate Games</h1>

        {loading ? (
          <p className={styles.loading}>Loading active games...</p>
        ) : games.length === 0 ? (
          <p className={styles.empty}>No active games right now. Check back later!</p>
        ) : (
          <>
            <div className={styles.grid}>
              {games.map(game => (
                <Link
                  key={game.id}
                  href={`/multiplayer/spectate/${game.id}`}
                  className={styles.card}
                >
                  <div className={styles.boardWrapper}>
                    <MiniBoard fen={game.fen} />
                  </div>
                  <div className={styles.cardInfo}>
                    <div className={styles.players}>
                      <span>{game.white_username}</span>
                      <span className={styles.vs}>vs</span>
                      <span>{game.black_username}</span>
                    </div>
                    <div className={styles.meta}>
                      <span>Started {formatTime(game.started_at)}</span>
                      <span className={styles.liveBadge}>Live</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <p className={styles.refreshNote}>Auto-refreshes every 5 seconds</p>
          </>
        )}
      </div>
    </AppShell>
  );
}
