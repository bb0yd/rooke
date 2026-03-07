'use client';

import { COACHING_MESSAGES, DEFAULT_SKILL_PROFILE, SKILL_LABELS, SkillProfile } from '@/lib/skillProfile';
import styles from './SkillOverview.module.css';

interface Props {
  profile: SkillProfile;
}

function getColor(score: number): string {
  if (score < 35) return 'var(--danger)';
  if (score < 65) return 'var(--warning)';
  return 'var(--accent)';
}

export default function SkillOverview({ profile }: Props) {
  const hasMeasuredSkills = profile.games_analyzed > 0 ||
    profile.tactics !== DEFAULT_SKILL_PROFILE.tactics ||
    profile.checkmate_patterns !== DEFAULT_SKILL_PROFILE.checkmate_patterns;

  const skills = [
    { key: 'piece_safety', score: profile.piece_safety },
    { key: 'tactics', score: profile.tactics },
    { key: 'checkmate_patterns', score: profile.checkmate_patterns },
    { key: 'opening_play', score: profile.opening_play },
    { key: 'endgame_play', score: profile.endgame_play },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Your Skills</h3>
        <span className={styles.gamesCount}>{profile.games_analyzed} games analyzed</span>
      </div>

      <div className={styles.skills}>
        {skills.map(({ key, score }) => (
          <div key={key} className={`${styles.skillRow} ${key === profile.weakest_area ? styles.weakest : ''}`}>
            <div className={styles.skillLabel}>
              {SKILL_LABELS[key]}
              <span className={styles.skillScore}>{Math.round(score)}</span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${score}%`, background: getColor(score) }}
              />
            </div>
          </div>
        ))}
      </div>

      {profile.weakest_area && hasMeasuredSkills && (
        <div className={styles.coaching}>
          <span className={styles.coachingLabel}>Focus area:</span>{' '}
          {COACHING_MESSAGES[profile.weakest_area]}
        </div>
      )}
    </div>
  );
}
