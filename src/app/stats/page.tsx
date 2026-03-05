'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import RatingChart from '@/components/RatingChart';
import SquareHeatmap from '@/components/SquareHeatmap';
import styles from './stats.module.css';

interface Stats {
  totalGames: number;
  completedGames: number;
  whiteWins: number;
  blackWins: number;
  draws: number;
  avgMoves: number;
  shortestGame: number;
  longestGame: number;
  longestStreak: number;
  gamesOverTime: { date: string; count: string }[];
}

interface OpeningStat {
  opening_name: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingStats, setOpeningStats] = useState<OpeningStat[]>([]);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [ratingHistory, setRatingHistory] = useState<{ rating: number; recorded_at: string }[]>([]);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => { if (!data.error) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/stats/openings')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setOpeningStats(data); })
      .catch(() => {});

    fetch('/api/stats/heatmap')
      .then(res => res.json())
      .then(data => { if (data.heatmap) setHeatmapData(data.heatmap); })
      .catch(() => {});

    fetch('/api/ratings/history?type=game&limit=50')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setRatingHistory(data); })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className={styles.page}>
          <h1 className={styles.title}>Stats</h1>
          <p className={styles.loading}>Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (!stats || stats.totalGames === 0) {
    return (
      <AppShell>
        <div className={styles.page}>
          <h1 className={styles.title}>Stats</h1>
          <p className={styles.empty}>No games yet. Play some games to see your stats!</p>
        </div>
      </AppShell>
    );
  }

  const totalDecided = stats.whiteWins + stats.blackWins + stats.draws;
  const winPct = totalDecided > 0 ? ((stats.whiteWins + stats.blackWins) / totalDecided * 100).toFixed(0) : '0';
  const wPct = totalDecided > 0 ? (stats.whiteWins / totalDecided * 100) : 0;
  const bPct = totalDecided > 0 ? (stats.blackWins / totalDecided * 100) : 0;
  const dPct = totalDecided > 0 ? (stats.draws / totalDecided * 100) : 0;

  // Build activity chart for last 30 days
  const activityMap = new Map<string, number>();
  for (const row of stats.gamesOverTime) {
    activityMap.set(row.date.split('T')[0], parseInt(row.count));
  }
  const today = new Date();
  const days: { date: string; count: number; label: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push({ date: key, count: activityMap.get(key) || 0, label });
  }
  const maxActivity = Math.max(...days.map(d => d.count), 1);

  return (
    <AppShell>
      <div className={styles.page}>
        <h1 className={styles.title}>Stats</h1>

        <div className={styles.grid}>
          <div className={styles.card}>
            <span className={`${styles.cardValue} ${styles.cardAccent}`}>{stats.totalGames}</span>
            <span className={styles.cardLabel}>Total Games</span>
          </div>
          <div className={styles.card}>
            <span className={`${styles.cardValue} ${styles.cardWin}`}>{stats.whiteWins + stats.blackWins}</span>
            <span className={styles.cardLabel}>Wins ({winPct}%)</span>
          </div>
          <div className={styles.card}>
            <span className={`${styles.cardValue} ${styles.cardDraw}`}>{stats.draws}</span>
            <span className={styles.cardLabel}>Draws</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardValue}>{stats.avgMoves}</span>
            <span className={styles.cardLabel}>Avg Moves</span>
          </div>
          <div className={styles.card}>
            <span className={`${styles.cardValue} ${styles.cardAccent}`}>{stats.longestStreak}</span>
            <span className={styles.cardLabel}>Best Streak</span>
          </div>
        </div>

        {totalDecided > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Results</h2>
            <div className={styles.resultBar}>
              {wPct > 0 && (
                <div className={`${styles.resultSegment} ${styles.resultSegmentWin}`} style={{ width: `${wPct}%` }}>
                  {stats.whiteWins}
                </div>
              )}
              {bPct > 0 && (
                <div className={`${styles.resultSegment} ${styles.resultSegmentLoss}`} style={{ width: `${bPct}%` }}>
                  {stats.blackWins}
                </div>
              )}
              {dPct > 0 && (
                <div className={`${styles.resultSegment} ${styles.resultSegmentDraw}`} style={{ width: `${dPct}%` }}>
                  {stats.draws}
                </div>
              )}
            </div>
            <div className={styles.resultLegend}>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendWin}`} />
                White Wins ({stats.whiteWins})
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendLoss}`} />
                Black Wins ({stats.blackWins})
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDraw}`} />
                Draws ({stats.draws})
              </span>
            </div>
          </div>
        )}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Activity (Last 30 Days)</h2>
          {days.some(d => d.count > 0) ? (
            <div className={styles.activityChart}>
              {days.map(day => (
                <div
                  key={day.date}
                  className={styles.activityBar}
                  style={{ height: day.count > 0 ? `${Math.max((day.count / maxActivity) * 100, 8)}%` : '2px' }}
                  data-tooltip={`${day.label}: ${day.count} game${day.count !== 1 ? 's' : ''}`}
                />
              ))}
            </div>
          ) : (
            <p className={styles.noActivity}>No games in the last 30 days</p>
          )}
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Game Length</h2>
          <div className={styles.grid}>
            <div className={styles.card}>
              <span className={styles.cardValue}>{stats.shortestGame}</span>
              <span className={styles.cardLabel}>Shortest Game</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardValue}>{stats.longestGame}</span>
              <span className={styles.cardLabel}>Longest Game</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardValue}>{stats.avgMoves}</span>
              <span className={styles.cardLabel}>Average</span>
            </div>
          </div>
        </div>

        {/* Rating Progress */}
        {ratingHistory.length > 1 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Rating Progress</h2>
            <RatingChart
              data={ratingHistory}
            />
          </div>
        )}

        {/* Opening Stats */}
        {openingStats.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Opening Stats</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #444' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#aaa' }}>Opening</th>
                  <th style={{ textAlign: 'center', padding: '8px 4px', color: '#aaa' }}>Games</th>
                  <th style={{ textAlign: 'center', padding: '8px 4px', color: '#aaa' }}>Win %</th>
                </tr>
              </thead>
              <tbody>
                {openingStats.slice(0, 15).map(os => {
                  const winPct = os.games > 0 ? ((os.wins / os.games) * 100).toFixed(0) : '0';
                  return (
                    <tr key={os.opening_name} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: '6px 4px' }}>{os.opening_name}</td>
                      <td style={{ textAlign: 'center', padding: '6px 4px', color: '#aaa' }}>{os.games}</td>
                      <td style={{ textAlign: 'center', padding: '6px 4px', color: 'var(--accent)' }}>{winPct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Square Heatmap */}
        {heatmapData.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Square Activity</h2>
            <SquareHeatmap data={heatmapData} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
