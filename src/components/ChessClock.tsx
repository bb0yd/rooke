'use client';

import { useState, useEffect, useRef } from 'react';
import { formatTime, formatTimeWithTenths } from '@/lib/timeControl';
import styles from './ChessClock.module.css';

interface Props {
  whiteTimeMs: number;
  blackTimeMs: number;
  activeColor: 'w' | 'b' | null;  // null = paused
  onTimeout?: (color: 'w' | 'b') => void;
}

export default function ChessClock({ whiteTimeMs, blackTimeMs, activeColor, onTimeout }: Props) {
  const [whiteTime, setWhiteTime] = useState(whiteTimeMs);
  const [blackTime, setBlackTime] = useState(blackTimeMs);
  const lastTickRef = useRef(Date.now());
  const rafRef = useRef<number | null>(null);

  // Sync from props when they change
  useEffect(() => {
    setWhiteTime(whiteTimeMs);
    setBlackTime(blackTimeMs);
  }, [whiteTimeMs, blackTimeMs]);

  // Countdown with requestAnimationFrame
  useEffect(() => {
    if (!activeColor) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastTickRef.current = Date.now();

    function tick() {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (activeColor === 'w') {
        setWhiteTime(prev => {
          const next = Math.max(0, prev - delta);
          if (next === 0 && onTimeout) onTimeout('w');
          return next;
        });
      } else {
        setBlackTime(prev => {
          const next = Math.max(0, prev - delta);
          if (next === 0 && onTimeout) onTimeout('b');
          return next;
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeColor, onTimeout]);

  const whiteUrgent = whiteTime > 0 && whiteTime < 30000;
  const blackUrgent = blackTime > 0 && blackTime < 30000;

  const formatFn = (ms: number) => ms < 60000 ? formatTimeWithTenths(ms) : formatTime(ms);

  return (
    <div className={styles.clockContainer}>
      <div className={`${styles.clock} ${activeColor === 'b' ? styles.clockActive : ''} ${blackUrgent ? styles.clockUrgent : ''}`}>
        <span className={styles.playerLabel}>Black</span>
        <span className={styles.time}>{formatFn(blackTime)}</span>
      </div>
      <div className={`${styles.clock} ${activeColor === 'w' ? styles.clockActive : ''} ${whiteUrgent ? styles.clockUrgent : ''}`}>
        <span className={styles.playerLabel}>White</span>
        <span className={styles.time}>{formatFn(whiteTime)}</span>
      </div>
    </div>
  );
}
