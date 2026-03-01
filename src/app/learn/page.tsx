'use client';

import Link from 'next/link';
import AppShell from '@/components/AppShell';
import MiniBoard from '@/components/MiniBoard';
import { OPENINGS } from '@/data/openings';
import styles from './learn.module.css';

export default function LearnPage() {
  return (
    <AppShell>
      <div className={styles.container}>
        <h1 className={styles.title}>Learn Openings</h1>
        <p className={styles.subtitle}>
          Master key opening lines with interactive training
        </p>

        <div className={styles.cardList}>
          {OPENINGS.map(opening => (
            <div key={opening.id} className={styles.card}>
              <MiniBoard fen={opening.thumbnailFen} />
              <div className={styles.cardBody}>
                <div className={styles.cardName}>{opening.name}</div>
                <div className={styles.cardDescription}>{opening.description}</div>
                <div className={styles.cardMeta}>
                  {opening.lines.length} lines &middot; Play as {opening.playerColor === 'w' ? 'White' : 'Black'}
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '0%' }} />
                </div>
                <Link href={`/learn/${opening.id}`} className={styles.startLink}>
                  Start learning &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
