'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import styles from './dashboard.module.css';

interface Game {
  id: number;
  pgn: string;
  result: string;
  moves_count: number;
  created_at: string;
  opponent?: string;
}

interface Stats {
  totalGames: number;
  whiteWins: number;
  blackWins: number;
  draws: number;
  bestStreak?: number;
  avgMoves?: number;
}

interface NotificationCounts {
  challenges: number;
  friendRequests: number;
  yourTurn: number;
}

interface MultiplayerGame {
  id: number;
  white_user_id: number;
  black_user_id: number;
  white_username: string;
  black_username: string;
  fen: string;
  result: string;
  last_move_at: string;
}

function formatResult(result: string): { label: string; className: string } {
  switch (result) {
    case 'white_wins': return { label: 'White Wins', className: styles.resultWin };
    case 'black_wins': return { label: 'Black Wins', className: styles.resultLoss };
    case 'draw': return { label: 'Draw', className: styles.resultDraw };
    default: return { label: 'In Progress', className: styles.resultInProgress };
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [username, setUsername] = useState('');
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [multiplayerGames, setMultiplayerGames] = useState<MultiplayerGame[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationCounts>({ challenges: 0, friendRequests: 0, yourTurn: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [meRes, gamesRes, statsRes, mpRes, notifRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/games?limit=5'),
          fetch('/api/stats'),
          fetch('/api/multiplayer'),
          fetch('/api/notifications'),
        ]);

        const meData = await meRes.json();
        if (meData.username) setUsername(meData.username);
        if (meData.userId) setCurrentUserId(meData.userId);

        const gamesData = await gamesRes.json();
        if (Array.isArray(gamesData)) setRecentGames(gamesData.slice(0, 5));

        const statsData = await statsRes.json();
        if (!statsData.error) setStats(statsData);

        const mpData = await mpRes.json();
        if (Array.isArray(mpData)) setMultiplayerGames(mpData);

        const notifData = await notifRes.json();
        if (notifData.challenges !== undefined) setNotifications(notifData);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const activeMultiplayer = multiplayerGames.filter(g => g.result === 'in_progress');

  function isMyTurn(game: MultiplayerGame): boolean {
    if (!currentUserId) return false;
    // Parse FEN to determine whose turn it is
    const parts = game.fen.split(' ');
    const turn = parts[1]; // 'w' or 'b'
    if (turn === 'w' && game.white_user_id === currentUserId) return true;
    if (turn === 'b' && game.black_user_id === currentUserId) return true;
    return false;
  }

  return (
    <AppShell>
      <div className={styles.page}>
        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : (
          <>
            <div className={styles.greeting}>
              <h1 className={styles.greetingText}>
                Welcome back, <span className={styles.username}>{username}</span>
              </h1>
            </div>

            {/* Notification Alerts */}
            {(notifications.challenges > 0 || notifications.friendRequests > 0 || notifications.yourTurn > 0) && (
              <div className={styles.alerts}>
                {notifications.yourTurn > 0 && (
                  <Link href="/multiplayer" className={styles.alert}>
                    <span className={styles.alertBadge}>{notifications.yourTurn}</span>
                    <span>game{notifications.yourTurn > 1 ? 's' : ''} waiting for your move</span>
                  </Link>
                )}
                {notifications.challenges > 0 && (
                  <Link href="/multiplayer" className={styles.alert}>
                    <span className={styles.alertBadge}>{notifications.challenges}</span>
                    <span>pending challenge{notifications.challenges > 1 ? 's' : ''}</span>
                  </Link>
                )}
                {notifications.friendRequests > 0 && (
                  <Link href="/friends" className={styles.alert}>
                    <span className={styles.alertBadge}>{notifications.friendRequests}</span>
                    <span>friend request{notifications.friendRequests > 1 ? 's' : ''}</span>
                  </Link>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className={styles.actions}>
              <Link href="/play" className={styles.actionCard}>
                <span className={styles.actionIcon}>&#9814;</span>
                <span className={styles.actionLabel}>Play</span>
              </Link>
              <Link href="/puzzles" className={styles.actionCard}>
                <span className={styles.actionIcon}>&#9816;</span>
                <span className={styles.actionLabel}>Puzzles</span>
              </Link>
              <Link href="/learn" className={styles.actionCard}>
                <span className={styles.actionIcon}>&#9812;</span>
                <span className={styles.actionLabel}>Learn</span>
              </Link>
              <Link href="/multiplayer" className={styles.actionCard}>
                <span className={styles.actionIcon}>&#9876;</span>
                <span className={styles.actionLabel}>Multiplayer</span>
              </Link>
            </div>

            {/* Stats Summary */}
            {stats && stats.totalGames > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Your Stats</h2>
                  <Link href="/stats" className={styles.sectionLink}>View all</Link>
                </div>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>{stats.totalGames}</span>
                    <span className={styles.statLabel}>Games</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={`${styles.statValue} ${styles.statWin}`}>
                      {stats.whiteWins + stats.blackWins}
                    </span>
                    <span className={styles.statLabel}>Wins</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={`${styles.statValue} ${styles.statDraw}`}>
                      {stats.draws}
                    </span>
                    <span className={styles.statLabel}>Draws</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={`${styles.statValue} ${styles.statWin}`}>
                      {Math.round(((stats.whiteWins + stats.blackWins) / stats.totalGames) * 100)}%
                    </span>
                    <span className={styles.statLabel}>Win Rate</span>
                  </div>
                </div>
              </div>
            )}

            {/* Active Multiplayer Games */}
            {activeMultiplayer.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Active Games</h2>
                  <Link href="/multiplayer" className={styles.sectionLink}>View all</Link>
                </div>
                <div className={styles.gamesList}>
                  {activeMultiplayer.map(game => {
                    const opponent = game.white_user_id === currentUserId
                      ? game.black_username
                      : game.white_username;
                    const myTurn = isMyTurn(game);
                    return (
                      <Link
                        key={game.id}
                        href={`/multiplayer/${game.id}`}
                        className={styles.gameRow}
                      >
                        <div className={styles.gameInfo}>
                          <span className={styles.gameOpponent}>vs {opponent}</span>
                          <span className={styles.gameDate}>{timeAgo(game.last_move_at)}</span>
                        </div>
                        {myTurn && (
                          <span className={styles.turnBadge}>Your turn</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Games */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Recent Games</h2>
                <Link href="/history" className={styles.sectionLink}>View all</Link>
              </div>
              {recentGames.length === 0 ? (
                <p className={styles.empty}>No games yet. Start playing!</p>
              ) : (
                <div className={styles.gamesList}>
                  {recentGames.map(game => {
                    const { label, className } = formatResult(game.result);
                    return (
                      <div key={game.id} className={styles.gameRow}>
                        <div className={styles.gameInfo}>
                          <span className={className}>{label}</span>
                          <span className={styles.gameMoves}>{game.moves_count} moves</span>
                        </div>
                        <span className={styles.gameDate}>{formatDate(game.created_at)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
