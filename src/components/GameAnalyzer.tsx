'use client';

import { useState, useCallback, useEffect } from 'react';
import { analyzeGame, GameAnalysisResult } from '@/lib/gameAnalyzer';
import styles from './GameAnalyzer.module.css';

interface UnanalyzedGame {
  id: number;
  pgn: string;
  source: 'local' | 'multiplayer';
  player_color?: string;
}

interface Props {
  onComplete?: () => void;
  autoStart?: boolean;
}

export default function GameAnalyzer({ onComplete, autoStart }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [didAutoStart, setDidAutoStart] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, game: 0, totalGames: 0 });
  const [results, setResults] = useState<(GameAnalysisResult & { gameId: number })[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch('/api/game-analysis?unanalyzed=true');
      if (!res.ok) throw new Error('Failed to fetch games');
      const { games } = await res.json() as { games: UnanalyzedGame[] };

      if (games.length === 0) {
        setError('No unanalyzed games found. Play some games first!');
        setAnalyzing(false);
        return;
      }

      const newResults: (GameAnalysisResult & { gameId: number })[] = [];

      for (let i = 0; i < games.length; i++) {
        const game = games[i];
        if (!game.pgn || game.pgn.trim() === '') continue;

        setProgress({ current: 0, total: 0, game: i + 1, totalGames: games.length });

        const playerColor = game.player_color === 'b' ? 'b' : 'w';

        const result = await analyzeGame(game.pgn, playerColor as 'w' | 'b', (current, total) => {
          setProgress({ current, total, game: i + 1, totalGames: games.length });
        });

        // Save to server
        await fetch('/api/game-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: game.source === 'local' ? game.id : null,
            multiplayerGameId: game.source === 'multiplayer' ? game.id : null,
            accuracy: result.accuracy,
            blunders: result.blunders,
            mistakes: result.mistakes,
            inaccuracies: result.inaccuracies,
            hungPieces: result.hungPieces,
            missedTactics: result.missedTactics,
            phaseAccuracy: result.phaseAccuracy,
            moves: result.moves,
          }),
        });

        newResults.push({ ...result, gameId: game.id });
        setResults([...newResults]);
      }

      // Recompute and persist skill profile after analysis
      await fetch('/api/skill-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [onComplete]);

  // Auto-start analysis if prop is set
  useEffect(() => {
    if (autoStart && !didAutoStart && !analyzing) {
      setDidAutoStart(true);
      startAnalysis();
    }
  }, [autoStart, didAutoStart, analyzing, startAnalysis]);

  return (
    <div className={styles.container}>
      {!analyzing && results.length === 0 && (
        <button className={styles.analyzeBtn} onClick={startAnalysis}>
          Analyze My Games
        </button>
      )}

      {analyzing && (
        <div className={styles.progress}>
          <div className={styles.progressTitle}>
            Analyzing game {progress.game} of {progress.totalGames}...
          </div>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
            />
          </div>
          <div className={styles.progressDetail}>
            Move {progress.current} / {progress.total}
          </div>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {results.length > 0 && !analyzing && (
        <div className={styles.results}>
          <div className={styles.resultsSummary}>
            Analyzed {results.length} game{results.length !== 1 ? 's' : ''}
          </div>
          <div className={styles.resultStats}>
            <div>Avg Accuracy: {Math.round(results.reduce((s, r) => s + r.accuracy, 0) / results.length)}%</div>
            <div>Total Blunders: {results.reduce((s, r) => s + r.blunders, 0)}</div>
            <div>Hung Pieces: {results.reduce((s, r) => s + r.hungPieces, 0)}</div>
          </div>
          <button className={styles.analyzeBtn} onClick={startAnalysis}>
            Analyze More
          </button>
        </div>
      )}
    </div>
  );
}
