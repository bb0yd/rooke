'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { href: '/play', icon: '♟', label: 'Play' },
  { href: '/puzzles', icon: '⚡', label: 'Puzzles' },
  { href: '/learn', icon: '📖', label: 'Learn' },
  { href: '/stats', icon: '📊', label: 'Stats' },
  { href: '/history', icon: '📋', label: 'Game History' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.username) setUsername(data.username);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/me', { method: 'DELETE' });
    router.push('/login');
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>Chess Trainer</div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => (
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
          </Link>
        ))}
      </nav>
      <div className={styles.userSection}>
        <span className={styles.username}>{username}</span>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}
