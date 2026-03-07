'use client';

import styles from './MoveTree.module.css';

interface MoveData {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  openings?: string[];
}

interface Props {
  moves: MoveData[];
  totalLines?: number;
  onSelectMove: (uci: string) => void;
}

export default function MoveTree({ moves, totalLines, onSelectMove }: Props) {
  if (moves.length === 0) {
    return <div className={styles.empty}>No moves in database for this position</div>;
  }

  const maxLines = Math.max(...moves.map(m => m.white + m.draws + m.black));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerMove}>Move</span>
        <span className={styles.headerGames}>Lines</span>
        <span className={styles.headerBar}>Openings</span>
      </div>
      {moves.map(move => {
        const total = move.white + move.draws + move.black;
        const pct = maxLines > 0 ? (total / maxLines) * 100 : 0;

        return (
          <div
            key={move.uci}
            className={styles.moveRow}
            onClick={() => onSelectMove(move.uci)}
          >
            <span className={styles.moveSan}>{move.san}</span>
            <span className={styles.moveGames}>{total.toLocaleString()}</span>
            <div className={styles.bar}>
              {total > 0 && (move.white > 0 || move.draws > 0 || move.black > 0) && (move.white + move.draws + move.black) > 1 ? (
                <>
                  <div className={styles.barW} style={{ width: `${(move.white / total) * 100}%` }} />
                  <div className={styles.barD} style={{ width: `${(move.draws / total) * 100}%` }} />
                  <div className={styles.barB} style={{ width: `${(move.black / total) * 100}%` }} />
                </>
              ) : (
                <div className={styles.barWhite} style={{ width: `${pct}%` }}>
                  {move.openings && move.openings.length > 0 && (
                    <span className={styles.barLabel}>
                      {move.openings.length <= 2
                        ? move.openings.join(', ')
                        : `${move.openings[0]} +${move.openings.length - 1}`}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
