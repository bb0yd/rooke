'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import styles from './friends.module.css';

interface Friend {
  id: number;
  status: string;
  friend_user_id: number;
  friend_username: string;
  created_at: string;
  direction: 'incoming' | 'outgoing';
}

interface User {
  id: number;
  username: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.userId) setCurrentUserId(d.userId); })
      .catch(() => {});
  }, []);

  const loadFriends = useCallback(() => {
    fetch('/api/friends')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setFriends(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(loadFriends, 10000);
    return () => clearInterval(interval);
  }, [loadFriends]);

  // Search users
  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([]);
      return;
    }
    fetch(`/api/users?search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          // Filter out current user and existing friends
          const friendIds = new Set(friends.map(f => f.friend_user_id));
          setSearchResults(d.filter(u => u.id !== currentUserId && !friendIds.has(u.id)));
        }
      })
      .catch(() => {});
  }, [search, currentUserId, friends]);

  function showMsg(text: string, type: 'success' | 'error') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  }

  async function sendFriendRequest(userId: number, username: string) {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: userId }),
      });
      if (res.ok) {
        showMsg(`Friend request sent to ${username}!`, 'success');
        setSearch('');
        setSearchResults([]);
        loadFriends();
      } else {
        const data = await res.json();
        showMsg(data.error || 'Failed to send request', 'error');
      }
    } catch {
      showMsg('Failed to send request', 'error');
    }
  }

  async function acceptRequest(id: number) {
    try {
      await fetch(`/api/friends/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      loadFriends();
    } catch { /* silent */ }
  }

  async function declineRequest(id: number) {
    try {
      await fetch(`/api/friends/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      });
      loadFriends();
    } catch { /* silent */ }
  }

  async function removeFriend(id: number) {
    try {
      await fetch(`/api/friends/${id}`, { method: 'DELETE' });
      loadFriends();
    } catch { /* silent */ }
  }

  function challengeFriend(username: string) {
    router.push(`/multiplayer?challenge=${encodeURIComponent(username)}`);
  }

  const accepted = friends.filter(f => f.status === 'accepted');
  const incoming = friends.filter(f => f.status === 'pending' && f.direction === 'incoming');
  const outgoing = friends.filter(f => f.status === 'pending' && f.direction === 'outgoing');

  if (loading) {
    return (
      <AppShell>
        <div className={styles.page}>
          <p className={styles.loading}>Loading...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <h1 className={styles.title}>Friends</h1>

        {/* Add Friend */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Add Friend</h2>
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              placeholder="Search by username..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map(u => (
                <div key={u.id} className={styles.searchItem}>
                  <span className={styles.searchUsername}>{u.username}</span>
                  <button
                    className={styles.addBtn}
                    onClick={() => sendFriendRequest(u.id, u.username)}
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
          {msg && (
            <span className={`${styles.msg} ${msg.type === 'success' ? styles.msgSuccess : styles.msgError}`}>
              {msg.text}
            </span>
          )}
        </div>

        {/* Incoming Requests */}
        {incoming.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Friend Requests</h2>
            <div className={styles.list}>
              {incoming.map(f => (
                <div key={f.id} className={styles.card}>
                  <div className={styles.cardInfo}>
                    <div className={styles.avatar}>
                      {f.friend_username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={styles.friendName}>{f.friend_username}</div>
                      <span className={styles.pendingLabel}>Wants to be friends</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.acceptBtn} onClick={() => acceptRequest(f.id)}>Accept</button>
                    <button className={styles.declineBtn} onClick={() => declineRequest(f.id)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accepted Friends */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Friends {accepted.length > 0 && `(${accepted.length})`}
          </h2>
          {accepted.length === 0 ? (
            <p className={styles.empty}>No friends yet. Search for players above to add them!</p>
          ) : (
            <div className={styles.list}>
              {accepted.map(f => (
                <div key={f.id} className={styles.card}>
                  <div className={styles.cardInfo}>
                    <div className={styles.avatar}>
                      {f.friend_username.charAt(0).toUpperCase()}
                    </div>
                    <span className={styles.friendName}>{f.friend_username}</span>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.challengeBtn} onClick={() => challengeFriend(f.friend_username)}>
                      Challenge
                    </button>
                    <button className={styles.removeBtn} onClick={() => removeFriend(f.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outgoing pending requests */}
        {outgoing.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Sent Requests</h2>
            <div className={styles.list}>
              {outgoing.map(f => (
                <div key={f.id} className={styles.card}>
                  <div className={styles.cardInfo}>
                    <div className={styles.avatar}>
                      {f.friend_username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={styles.friendName}>{f.friend_username}</div>
                      <span className={styles.sentLabel}>Request pending</span>
                    </div>
                  </div>
                  <button className={styles.declineBtn} onClick={() => removeFriend(f.id)}>Cancel</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
