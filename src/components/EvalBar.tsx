'use client';

import styles from './EvalBar.module.css';

interface Props {
  score: number;      // centipawns (positive = white advantage)
  mate: number | null; // mate in N (positive = white mates)
  flipped?: boolean;
}

export default function EvalBar({ score, mate, flipped = false }: Props) {
  // Convert score to percentage (0-100, 50 = even)
  let whitePercent: number;
  let displayText: string;

  if (mate !== null) {
    whitePercent = mate > 0 ? 100 : 0;
    displayText = `M${Math.abs(mate)}`;
  } else {
    // Sigmoid-like mapping: ±1000cp maps to ~95%/5%
    const clamped = Math.max(-1000, Math.min(1000, score));
    whitePercent = 50 + (clamped / 1000) * 45;
    const absScore = Math.abs(score);
    if (absScore < 10) {
      displayText = '0.0';
    } else {
      displayText = (absScore / 100).toFixed(1);
    }
  }

  const isWhiteAdvantage = mate !== null ? mate > 0 : score >= 0;

  return (
    <div className={styles.evalBar} style={{ flexDirection: flipped ? 'column-reverse' : 'column' }}>
      <div
        className={styles.blackSide}
        style={{ height: `${100 - whitePercent}%` }}
      >
        {!isWhiteAdvantage && <span className={styles.evalText}>{displayText}</span>}
      </div>
      <div
        className={styles.whiteSide}
        style={{ height: `${whitePercent}%` }}
      >
        {isWhiteAdvantage && <span className={styles.evalText}>{displayText}</span>}
      </div>
    </div>
  );
}
