'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import styles from './multiplayer.module.css';

interface User {
  id: number;
  username: string;
}

interface Challenge {
  id: number;
  from_user_id: number;
  to_user_id: number;
  from_username: string;
  to_username: string;
  time_control: string;
  color_preference: string;
  status: string;
  created_at: string;
}

interface MultiplayerGame {
  id: number;
  white_user_id: number;
  black_user_id: number;
  white_username: string;
  black_username: string;
  fen: string;
  result: string;
  time_control: string;
  started_at: string;
  last_move_at: string;
}

export default function MultiplayerPageWrapper() {
  return (
    <Suspense>
      <MultiplayerPage />
    </Suspense>
  );
}

function MultiplayerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [challengeParamHandled, setChallengeParamHandled] = useState(false);
  const [colorPref, setColorPref] = useState<'random' | 'white' | 'black'>('random');
  const [timeControl, setTimeControl] = useState('none');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [games, setGames] = useState<MultiplayerGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Get current user
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.userId) setCurrentUserId(d.userId); })
      .catch(() => {});
  }, []);

  // Load challenges and games
  const loadData = useCallback(() => {
    Promise.all([
      fetch('/api/challenges').then(r => r.json()),
      fetch('/api/multiplayer').then(r => r.json()),
    ]).then(([ch, gm]) => {
      if (Array.isArray(ch)) setChallenges(ch);
      if (Array.isArray(gm)) setGames(gm);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll for updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle ?challenge=username from friends page
  useEffect(() => {
    if (challengeParamHandled) return;
    const challengeUsername = searchParams.get('challenge');
    if (challengeUsername) {
      setSearch(challengeUsername);
      setChallengeParamHandled(true);
      fetch(`/api/users?search=${encodeURIComponent(challengeUsername)}`)
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) {
            const match = d.find((u: User) => u.username === challengeUsername);
            if (match) setSelectedUser(match);
            setUsers(d);
          }
        })
        .catch(() => {});
    }
  }, [searchParams, challengeParamHandled]);

  // Search users
  useEffect(() => {
    fetch(`/api/users?search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setUsers(d); })
      .catch(() => {});
  }, [search]);

  async function sendChallenge() {
    if (!selectedUser) return;
    setMsg(null);
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: selectedUser.id,
          colorPreference: colorPref,
          timeControl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: `Challenge sent to ${selectedUser.username}!`, type: 'success' });
        setSelectedUser(null);
        loadData();
      } else {
        setMsg({ text: data.error || 'Failed to send', type: 'error' });
      }
    } catch {
      setMsg({ text: 'Failed to send challenge', type: 'error' });
    }
  }

  async function acceptChallenge(id: number) {
    try {
      const res = await fetch(`/api/challenges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      const data = await res.json();
      if (res.ok && data.gameId) {
        router.push(`/multiplayer/${data.gameId}`);
      }
      loadData();
    } catch { /* silent */ }
  }

  async function declineChallenge(id: number) {
    try {
      await fetch(`/api/challenges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      });
      loadData();
    } catch { /* silent */ }
  }

  async function cancelChallenge(id: number) {
    try {
      await fetch(`/api/challenges/${id}`, { method: 'DELETE' });
      loadData();
    } catch { /* silent */ }
  }

  const incoming = challenges.filter(c => c.to_user_id === currentUserId);
  const outgoing = challenges.filter(c => c.from_user_id === currentUserId);
  const activeGames = games.filter(g => g.result === 'in_progress');
  const pastGames = games.filter(g => g.result !== 'in_progress');

  return (
    <AppShell>
      <div className={styles.page}>
        <h1 className={styles.title}>Multiplayer</h1>

        {/* Incoming challenges */}
        {incoming.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Incoming Challenges</h2>
            <div className={styles.challengeList}>
              {incoming.map(ch => (
                <div key={ch.id} className={styles.challengeCard}>
                  <div className={styles.challengeInfo}>
                    <span className={styles.challengeUser}>{ch.from_username}</span>
                    <span className={styles.challengeDetail}>
                      Color: {ch.color_preference}
                    </span>
                  </div>
                  <div className={styles.challengeActions}>
                    <button className={styles.acceptBtn} onClick={() => acceptChallenge(ch.id)}>Accept</button>
                    <button className={styles.declineBtn} onClick={() => declineChallenge(ch.id)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active games */}
        {activeGames.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Active Games</h2>
            <div className={styles.gameList}>
              {activeGames.map(g => {
                const isWhite = g.white_user_id === currentUserId;
                const opponent = isWhite ? g.black_username : g.white_username;
                // Determine whose turn from FEN
                const turn = g.fen.split(' ')[1] === 'w' ? 'White' : 'Black';
                const isMyTurn = (turn === 'White' && isWhite) || (turn === 'Black' && !isWhite);
                return (
                  <div key={g.id} className={styles.gameCard} onClick={() => router.push(`/multiplayer/${g.id}`)} style={{ cursor: 'pointer' }}>
                    <div className={styles.gameCardInfo}>
                      <span className={styles.gameCardPlayers}>vs {opponent}</span>
                      <span className={`${styles.gameCardStatus} ${styles.gameCardStatusActive}`}>
                        {isMyTurn ? 'Your turn' : "Opponent's turn"}
                      </span>
                    </div>
                    <button className={styles.playBtn} onClick={(e) => { e.stopPropagation(); router.push(`/multiplayer/${g.id}`); }}>
                      Play
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Send challenge */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Challenge a Player</h2>
          <div className={styles.challengeForm}>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>Player:</span>
              <input
                className={styles.searchInput}
                placeholder="Search by username..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {users.length > 0 && (
              <div className={styles.userList}>
                {users.map(u => (
                  <div
                    key={u.id}
                    className={`${styles.userItem} ${selectedUser?.id === u.id ? styles.userItemSelected : ''}`}
                    onClick={() => setSelectedUser(u)}
                  >
                    {u.username}
                  </div>
                ))}
              </div>
            )}
            <div className={styles.formRow}>
              <span className={styles.formLabel}>Time:</span>
              <select
                className={styles.searchInput}
                value={timeControl}
                onChange={e => setTimeControl(e.target.value)}
                style={{ flex: 'none', width: 'auto' }}
              >
                <option value="none">No time control</option>
                <option value="1+0">1 min</option>
                <option value="3+0">3 min</option>
                <option value="3+2">3 | 2</option>
                <option value="5+0">5 min</option>
                <option value="5+3">5 | 3</option>
                <option value="10+0">10 min</option>
                <option value="10+5">10 | 5</option>
                <option value="15+10">15 | 10</option>
                <option value="30+0">30 min</option>
              </select>
            </div>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>Color:</span>
              <div className={styles.colorOptions}>
                {(['random', 'white', 'black'] as const).map(c => (
                  <button
                    key={c}
                    className={`${styles.colorBtn} ${colorPref === c ? styles.colorBtnActive : ''}`}
                    onClick={() => setColorPref(c)}
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button
              className={styles.sendBtn}
              onClick={sendChallenge}
              disabled={!selectedUser}
            >
              {selectedUser ? `Challenge ${selectedUser.username}` : 'Select a player'}
            </button>
            {msg && <div className={`${styles.msg} ${msg.type === 'success' ? styles.msgSuccess : styles.msgError}`}>{msg.text}</div>}
          </div>
        </div>

        {/* Outgoing challenges */}
        {outgoing.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Sent Challenges</h2>
            <div className={styles.challengeList}>
              {outgoing.map(ch => (
                <div key={ch.id} className={styles.challengeCard}>
                  <div className={styles.challengeInfo}>
                    <span className={styles.challengeUser}>To: {ch.to_username}</span>
                    <span className={styles.challengeDetail}>Waiting for response...</span>
                  </div>
                  <button className={styles.cancelBtn} onClick={() => cancelChallenge(ch.id)}>Cancel</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past games */}
        {pastGames.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Completed Games</h2>
            <div className={styles.gameList}>
              {pastGames.slice(0, 20).map(g => {
                const isWhite = g.white_user_id === currentUserId;
                const opponent = isWhite ? g.black_username : g.white_username;
                let resultText = 'Draw';
                if (g.result === 'white_wins') resultText = isWhite ? 'You won' : 'You lost';
                else if (g.result === 'black_wins') resultText = isWhite ? 'You lost' : 'You won';
                return (
                  <div key={g.id} className={styles.gameCard} onClick={() => router.push(`/multiplayer/${g.id}`)} style={{ cursor: 'pointer' }}>
                    <div className={styles.gameCardInfo}>
                      <span className={styles.gameCardPlayers}>vs {opponent}</span>
                      <span className={`${styles.gameCardStatus} ${styles.gameCardStatusDone}`}>{resultText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
