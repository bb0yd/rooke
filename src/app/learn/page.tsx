'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import SkillOverview from '@/components/SkillOverview';
import GameAnalyzer from '@/components/GameAnalyzer';
import TacticalTrainer from '@/components/TacticalTrainer';
import EndgameTrainer from '@/components/EndgameTrainer';
import CoachingGame from '@/components/CoachingGame';
import { FocusArea } from '@/lib/learnerFocus';
import { SkillProfile } from '@/lib/skillProfile';
import { TrainingSessionSummary } from '@/lib/trainingSession';
import { Exercise } from '@/lib/trainingPlan';
import styles from './learn.module.css';

type View = 'loading' | 'analyzing' | 'coach' | 'exercise';

export default function LearnPage() {
  const [view, setView] = useState<View>('loading');
  const [skillProfile, setSkillProfile] = useState<SkillProfile | null>(null);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [unanalyzedCount, setUnanalyzedCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const planRes = await fetch('/api/training-plan');

      if (planRes.ok) {
        const data = await planRes.json();
        setExercises(data.exercises || []);
        setFocusAreas(data.focusAreas || []);
        setUnanalyzedCount(data.unanalyzedCount || 0);
        if (data.profile) {
          setSkillProfile(data.profile);
        }

        // Auto-start analysis if there are unanalyzed games
        if (data.unanalyzedCount > 0) {
          setView('analyzing');
          return;
        }
      }

    } catch {}

    setView('coach');
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAnalysisComplete = useCallback(() => {
    // Re-fetch everything after analysis
    fetchData().then(() => setView('coach'));
  }, [fetchData]);

  const handleSkipAnalysis = () => setView('coach');

  const startExercise = (exercise: Exercise) => {
    setCurrentExercise(exercise);
    setView('exercise');
  };

  const handleExerciseComplete = async (exerciseId: string, summary?: TrainingSessionSummary) => {
    const exercise = currentExercise;
    try {
      await fetch('/api/training-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: exercise?.type || 'practice',
          exerciseType: exerciseId,
          difficulty: exercise?.difficulty || 1,
          score: summary?.score ?? 1,
          attempts: summary?.attempts ?? 1,
          successes: summary?.successes ?? ((summary?.score ?? 1) > 0 ? 1 : 0),
          firstTrySuccesses: summary?.firstTrySuccesses ?? 0,
          hintsUsed: summary?.hintsUsed ?? 0,
          elapsedMs: summary?.elapsedMs,
          metadata: {
            themes: exercise?.themes || [],
            drillSource: exercise?.drillSource || 'library',
            analysisTheme: exercise?.analysisTheme || null,
            targetFocusAreas: exercise?.targetFocusAreas || [],
            ...(summary?.metadata || {}),
          },
        }),
      });
      await fetch('/api/skill-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    } catch {}

    setCurrentExercise(null);
    setView('coach');
    await fetchData();
  };

  const handleBackToCoach = () => {
    setCurrentExercise(null);
    setView('coach');
  };

  const nextExercise = exercises[0] || null;
  const openingExerciseHref = currentExercise?.openingTargetId
    ? `/learn/${currentExercise.openingTargetId}${currentExercise.openingMode ? `?mode=${currentExercise.openingMode}` : ''}`
    : '/learn/openings';
  const isTrainerExercise = !!currentExercise && currentExercise.type !== 'openings';
  const showExerciseTopBar = currentExercise?.type === 'openings';

  return (
    <AppShell wide>
      <div className={styles.container}>

        {/* Loading */}
        {view === 'loading' && (
          <div className={styles.centered}>
            <div className={styles.loadingText}>Setting up your lesson...</div>
          </div>
        )}

        {/* Auto-analyzing games */}
        {view === 'analyzing' && (
          <div className={styles.analyzingFlow}>
            <div className={styles.coachBubble}>
              <div className={styles.coachAvatar}>&#9817;</div>
              <div className={styles.coachMessage}>
                I found {unanalyzedCount} game{unanalyzedCount !== 1 ? 's' : ''} to review.
                Let me analyze {unanalyzedCount === 1 ? 'it' : 'them'} so I can see where you need help.
              </div>
            </div>
            <GameAnalyzer
              onComplete={handleAnalysisComplete}
              autoStart
            />
            <button className={styles.skipLink} onClick={handleSkipAnalysis}>
              Skip for now
            </button>
          </div>
        )}

        {/* Coach view */}
        {view === 'coach' && (
          <div className={styles.coachFlow}>
            {/* Top: skills + focus side by side */}
            {(skillProfile || focusAreas.length > 0) && (
              <div className={styles.topBar}>
                {skillProfile && <SkillOverview profile={skillProfile} />}
                {focusAreas.length > 0 && (
                  <div className={styles.focusPanel}>
                    <div className={styles.focusHeader}>
                      <h3 className={styles.focusTitle}>Coach Priorities</h3>
                    </div>
                    <div className={styles.focusList}>
                      {focusAreas.slice(0, 3).map(area => (
                        <div key={area.id} className={styles.focusItem}>
                          <div className={styles.focusItemHeader}>
                            <span className={styles.focusLabel}>{area.label}</span>
                            <span className={styles.focusScore}>{Math.round(area.score)}</span>
                          </div>
                          <div className={styles.focusReason}>{area.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Coach + action */}
            {nextExercise ? (
              <>
                <div className={styles.coachBubble}>
                  <div className={styles.coachAvatar}>&#9817;</div>
                  <div className={styles.coachMessage}>{nextExercise.coachSays}</div>
                </div>

                {(nextExercise.whyNow || nextExercise.successMetric || nextExercise.paceHint) && (
                  <div className={styles.lessonBrief}>
                    {nextExercise.whyNow && (
                      <div>
                        <span className={styles.lessonLabel}>Why this now</span>
                        <div className={styles.lessonText}>{nextExercise.whyNow}</div>
                      </div>
                    )}
                    {nextExercise.successMetric && (
                      <div>
                        <span className={styles.lessonLabel}>Success looks like</span>
                        <div className={styles.lessonText}>{nextExercise.successMetric}</div>
                      </div>
                    )}
                    {nextExercise.paceHint && (
                      <div>
                        <span className={styles.lessonLabel}>Pace</span>
                        <div className={styles.lessonText}>{nextExercise.paceHint}</div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  className={styles.startBtn}
                  onClick={() => startExercise(nextExercise)}
                >
                  {nextExercise.title} &rarr;
                </button>

                {exercises.length > 1 && (
                  <div className={styles.upNext}>
                    <span className={styles.upNextLabel}>Up next:</span>
                    {exercises.slice(1, 4).map(ex => (
                      <button
                        key={ex.id}
                        className={styles.upNextItem}
                        onClick={() => startExercise(ex)}
                      >
                        {ex.title}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.coachBubble}>
                <div className={styles.coachAvatar}>&#9817;</div>
                <div className={styles.coachMessage}>
                  Great work today! You&apos;ve completed all your exercises.
                  Come back tomorrow or go play a game!
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className={styles.quickLinks}>
              <Link href="/puzzles" className={styles.quickLink}>Free Puzzles</Link>
              <Link href="/learn/openings" className={styles.quickLink}>Opening Repertoire</Link>
            </div>
          </div>
        )}

        {/* Exercise view — the actual training */}
        {view === 'exercise' && currentExercise && (
          <div className={`${styles.exerciseView}${isTrainerExercise ? ` ${styles.exerciseViewTrainer}` : ''}`}>
            {showExerciseTopBar && (
              <div className={styles.exerciseTopBar}>
                <button className={styles.backBtn} onClick={handleBackToCoach}>
                  &larr; Back
                </button>

                <div className={styles.exerciseCoach}>
                  <span className={styles.coachAvatarSmall}>&#9817;</span>
                  <div>
                    <div>{currentExercise.coachSays}</div>
                    {currentExercise.successMetric && (
                      <div className={styles.exerciseMetric}>Goal: {currentExercise.successMetric}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className={`${styles.exerciseContent}${isTrainerExercise ? ` ${styles.exerciseContentTrainer}` : ''}`}>
              {currentExercise.type === 'tactics' && (
                <TacticalTrainer
                  themes={currentExercise.themes}
                  drillSource={currentExercise.drillSource}
                  analysisTheme={currentExercise.analysisTheme}
                  difficulty={currentExercise.difficulty}
                  coachingMessage={currentExercise.coachSays}
                  successMetric={currentExercise.successMetric}
                  onBack={handleBackToCoach}
                  onSessionComplete={(summary) => handleExerciseComplete(currentExercise.id, summary)}
                />
              )}

              {currentExercise.type === 'endgame' && (
                <EndgameTrainer
                  difficulty={currentExercise.difficulty}
                  reviewMode={currentExercise.endgameReviewMode}
                  coachingMessage={currentExercise.coachSays}
                  successMetric={currentExercise.successMetric}
                  onBack={handleBackToCoach}
                  onSessionComplete={(summary) => handleExerciseComplete(currentExercise.id, summary)}
                />
              )}

              {currentExercise.type === 'practice' && (
                <CoachingGame
                  difficulty={currentExercise.difficulty}
                  coachingMessage={currentExercise.coachSays}
                  successMetric={currentExercise.successMetric}
                  onBack={handleBackToCoach}
                  onGameOver={(summary) => handleExerciseComplete(currentExercise.id, summary)}
                />
              )}

              {currentExercise.type === 'openings' && (
                <div className={styles.openingsRedirect}>
                  <p>Practice your opening lines to improve your first 10 moves.</p>
                  <Link href={openingExerciseHref} className={styles.startBtn}>
                    Go to Openings &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
