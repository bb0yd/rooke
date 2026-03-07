'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import styles from './profile.module.css';

interface ProfileUser {
  id: number;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Rating {
  rating_type: string;
  rating: number;
  rd: number;
  volatility: number;
}

interface Game {
  id: number;
  pgn: string;
  result: string;
  moves_count: number;
  created_at: string;
  opening_name: string | null;
}

interface OpeningStat {
  opening_name: string;
  games: string;
  white_wins: string;
  black_wins: string;
  draws: string;
}

interface ProfileData {
  user: ProfileUser;
  ratings: Rating[];
  recentGames: Game[];
  record: { wins: number; draws: number; losses: number };
  openings: OpeningStat[];
}

const RATING_TYPE_ORDER = ['bullet', 'blitz', 'rapid', 'classical', 'puzzle'];

const RATING_STYLE_MAP: Record<string, string> = {
  bullet: styles.ratingBullet,
  blitz: styles.ratingBlitz,
  rapid: styles.ratingRapid,
  classical: styles.ratingClassical,
  puzzle: styles.ratingPuzzle,
};

function resultClass(result: string): string {
  if (result === 'white_wins' || result === 'black_wins') return styles.resultWin;
  if (result === 'draw') return styles.resultDraw;
  return '';
}

function resultLabel(result: string): string {
  if (result === 'white_wins') return 'White Wins';
  if (result === 'black_wins') return 'Black Wins';
  if (result === 'draw') return 'Draw';
  if (result === 'in_progress') return 'In Progress';
  return result;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [addingFriend, setAddingFriend] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.userId) setCurrentUserId(d.userId); })
      .catch(() => {});
  }, []);

  const loadProfile = useCallback(() => {
    if (!username) return;
    setLoading(true);
    fetch(`/api/users/profile/${encodeURIComponent(username)}`)
      .then(r => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then(data => { if (data) setProfile(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  function showMsg(text: string, type: 'success' | 'error') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  }

  async function handleAddFriend() {
    if (!profile) return;
    setAddingFriend(true);
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: profile.user.id }),
      });
      if (res.ok) {
        showMsg('Friend request sent!', 'success');
      } else {
        const data = await res.json();
        showMsg(data.error || 'Failed to send request', 'error');
      }
    } catch {
      showMsg('Failed to send request', 'error');
    } finally {
      setAddingFriend(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className={styles.page}>
          <p className={styles.loading}>Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (notFound || !profile) {
    return (
      <AppShell>
        <div className={styles.page}>
          <p className={styles.notFound}>User not found.</p>
        </div>
      </AppShell>
    );
  }

  const { user, ratings, recentGames, record } = profile;
  const isOwnProfile = currentUserId !== null && currentUserId === user.id;
  const isLoggedIn = currentUserId !== null;

  // Sort ratings by the defined order, then any extras
  const sortedRatings = [...ratings].sort((a, b) => {
    const ai = RATING_TYPE_ORDER.indexOf(a.rating_type);
    const bi = RATING_TYPE_ORDER.indexOf(b.rating_type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <AppShell>
      <div className={styles.page}>
        {msg && (
          <span className={`${styles.msg} ${msg.type === 'success' ? styles.msgSuccess : styles.msgError}`}>
            {msg.text}
          </span>
        )}

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.avatar}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} />
            ) : (
              <span className={styles.avatarPlaceholder}>&#9823;</span>
            )}
          </div>
          <div className={styles.headerInfo}>
            <h1 className={styles.displayName}>{user.display_name || user.username}</h1>
            {user.display_name && (
              <div className={styles.username}>@{user.username}</div>
            )}
            {user.bio && <p className={styles.bio}>{user.bio}</p>}
            <div className={styles.memberSince}>
              Member since {formatDate(user.created_at)}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {isLoggedIn && !isOwnProfile && (
          <div className={styles.actions}>
            <button
              className={styles.challengeBtn}
              onClick={() => router.push(`/multiplayer?challenge=${encodeURIComponent(user.username)}`)}
            >
              Challenge
            </button>
            <button
              className={styles.addFriendBtn}
              onClick={handleAddFriend}
              disabled={addingFriend}
            >
              {addingFriend ? 'Sending...' : 'Add Friend'}
            </button>
          </div>
        )}

        {/* Ratings */}
        {sortedRatings.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Ratings</h2>
            <div className={styles.ratings}>
              {sortedRatings.map(r => (
                <div
                  key={r.rating_type}
                  className={`${styles.ratingBadge} ${RATING_STYLE_MAP[r.rating_type] || ''}`}
                >
                  <span className={styles.ratingValue}>{Math.round(r.rating)}</span>
                  <span className={styles.ratingType}>{r.rating_type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Win / Draw / Loss */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Record</h2>
          <div className={styles.record}>
            <div className={`${styles.recordItem} ${styles.recordWin}`}>
              <span className={styles.recordCount}>{record.wins}</span>
              <span className={styles.recordLabel}>Wins</span>
            </div>
            <div className={`${styles.recordItem} ${styles.recordDraw}`}>
              <span className={styles.recordCount}>{record.draws}</span>
              <span className={styles.recordLabel}>Draws</span>
            </div>
            <div className={`${styles.recordItem} ${styles.recordLoss}`}>
              <span className={styles.recordCount}>{record.losses}</span>
              <span className={styles.recordLabel}>Losses</span>
            </div>
          </div>
        </div>

        {/* Opening Stats */}
        {profile.openings && profile.openings.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Top Openings</h2>
            <table className={styles.gamesTable}>
              <thead>
                <tr>
                  <th>Opening</th>
                  <th>Games</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                </tr>
              </thead>
              <tbody>
                {profile.openings.map(o => {
                  const total = parseInt(o.games);
                  const w = parseInt(o.white_wins);
                  const d = parseInt(o.draws);
                  const l = parseInt(o.black_wins);
                  return (
                    <tr key={o.opening_name}>
                      <td>{o.opening_name}</td>
                      <td>{total}</td>
                      <td style={{ color: '#4caf50' }}>{w}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{d}</td>
                      <td style={{ color: '#f44336' }}>{l}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Games */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Games</h2>
          {recentGames.length === 0 ? (
            <p className={styles.noGames}>No games played yet.</p>
          ) : (
            <table className={styles.gamesTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opening</th>
                  <th>Result</th>
                  <th>Moves</th>
                </tr>
              </thead>
              <tbody>
                {recentGames.map(game => (
                  <tr key={game.id}>
                    <td>{formatDate(game.created_at)}</td>
                    <td>{game.opening_name || '-'}</td>
                    <td className={resultClass(game.result)}>{resultLabel(game.result)}</td>
                    <td>{game.moves_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
