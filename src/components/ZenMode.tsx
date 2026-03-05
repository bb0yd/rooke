'use client';

import { useEffect, useState } from 'react';
import styles from './ZenMode.module.css';

interface Props {
  children: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
}

export default function ZenMode({ children, enabled, onToggle }: Props) {
  useEffect(() => {
    if (enabled) {
      document.body.classList.add('zen-mode');
    } else {
      document.body.classList.remove('zen-mode');
    }
    return () => document.body.classList.remove('zen-mode');
  }, [enabled]);

  if (!enabled) return <>{children}</>;

  return (
    <div className={styles.zenContainer}>
      <button className={styles.exitBtn} onClick={onToggle} title="Exit Zen Mode (Z)">
        Exit Zen Mode
      </button>
      {children}
    </div>
  );
}
