'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { href: '/', icon: '\u2302', label: 'Home', badge: null },
  { href: '/play', icon: '\u265F', label: 'Play', badge: null },
  { href: '/puzzles', icon: '\u26A1', label: 'Puzzles', badge: null },
  { href: '/learn', icon: '\uD83D\uDCD6', label: 'Learn', badge: null },
  { href: '/explore', icon: '\uD83D\uDD0D', label: 'Explore', badge: null },
  { href: '/stats', icon: '\uD83D\uDCCA', label: 'Stats', badge: null },
  { href: '/multiplayer', icon: '\u2694', label: 'Multiplayer', badge: 'multiplayer' as const },
  { href: '/friends', icon: '\uD83D\uDC65', label: 'Friends', badge: 'friends' as const },
  { href: '/history', icon: '\uD83D\uDCCB', label: 'Game History', badge: null },
];

interface NotificationCounts {
  challenges: number;
  friendRequests: number;
  yourTurn: number;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState<NotificationCounts>({ challenges: 0, friendRequests: 0, yourTurn: 0 });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.username) setUsername(data.username);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function fetchCounts() {
      // Skip polling when tab is not visible
      if (document.hidden) return;
      fetch('/api/notifications')
        .then(r => r.json())
        .then(d => { if (d.challenges !== undefined) setCounts(d); })
        .catch(() => {});
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    // Re-fetch immediately when tab becomes visible
    function onVisibilityChange() {
      if (!document.hidden) fetchCounts();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth/me', { method: 'DELETE' });
    router.push('/login');
  }

  return (
    <>
      {/* Hamburger button for mobile */}
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Menu"
      >
        {mobileOpen ? '\u2715' : '\u2630'}
      </button>

      {/* Overlay backdrop */}
      <div
        className={`${styles.overlay} ${mobileOpen ? styles.overlayVisible : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <div className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <img src="/logo.svg" alt="Rooke" className={styles.logoIcon} />
          <span className={styles.logoText}>Rooke</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => {
            let badgeCount = 0;
            if (item.badge === 'multiplayer') badgeCount = counts.challenges + counts.yourTurn;
            if (item.badge === 'friends') badgeCount = counts.friendRequests;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? styles.navItemActive
                    : styles.navItem
                }
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.label}
                {badgeCount > 0 && <span className={styles.badge}>{badgeCount}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={styles.userSection}>
          <span className={styles.username}>{username}</span>
          <button
            className={styles.gearBtn}
            title="Notifications"
            onClick={() => router.push('/multiplayer')}
            style={{ position: 'relative' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {(counts.challenges + counts.friendRequests + counts.yourTurn) > 0 && (
              <span className={styles.bellBadge}>
                {counts.challenges + counts.friendRequests + counts.yourTurn}
              </span>
            )}
          </button>
          <Link href="/settings" className={styles.gearBtn} title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
    </>
  );
}
