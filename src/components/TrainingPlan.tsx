'use client';

import { Exercise } from '@/lib/trainingPlan';
import styles from './TrainingPlan.module.css';

interface Props {
  exercises: Exercise[];
  completedIds: string[];
  onStart: (exercise: Exercise) => void;
}

const TYPE_ICONS: Record<string, string> = {
  tactics: '\u265E',    // knight
  endgame: '\u265C',    // rook
  openings: '\u265D',   // bishop
  practice: '\u265A',   // king
};

export default function TrainingPlan({ exercises, completedIds, onStart }: Props) {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Today's Training</h3>
      <div className={styles.exercises}>
        {exercises.map(ex => {
          const done = completedIds.includes(ex.id);
          return (
            <div key={ex.id} className={`${styles.card} ${done ? styles.completed : ''}`}>
              <div className={styles.icon}>{TYPE_ICONS[ex.type] || '\u2659'}</div>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>
                  {ex.title}
                  {done && <span className={styles.check}> \u2713</span>}
                </div>
                <div className={styles.cardDesc}>{ex.coachSays}</div>
                <div className={styles.cardMeta}>~{ex.estimatedMinutes} min</div>
              </div>
              {!done && (
                <button className={styles.startBtn} onClick={() => onStart(ex)}>
                  Start
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
