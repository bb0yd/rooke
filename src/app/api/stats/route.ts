import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get all games
  const gamesResult = await pool.query(
    'SELECT result, moves_count, created_at, pgn FROM games WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );

  const games = gamesResult.rows;
  const totalGames = games.length;
  const completedGames = games.filter((g: { result: string }) => g.result !== 'in_progress');

  // Win/loss/draw counts
  const whiteWins = games.filter((g: { result: string }) => g.result === 'white_wins').length;
  const blackWins = games.filter((g: { result: string }) => g.result === 'black_wins').length;
  const draws = games.filter((g: { result: string }) => g.result === 'draw').length;

  // Average moves
  const avgMoves = completedGames.length > 0
    ? Math.round(completedGames.reduce((sum: number, g: { moves_count: number }) => sum + g.moves_count, 0) / completedGames.length)
    : 0;

  // Games over time (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentResult = await pool.query(
    `SELECT DATE(created_at) as date, COUNT(*) as count
     FROM games WHERE user_id = $1 AND created_at >= $2
     GROUP BY DATE(created_at) ORDER BY date`,
    [userId, thirtyDaysAgo.toISOString()]
  );

  // Longest winning streak
  let currentStreak = 0;
  let longestStreak = 0;
  for (const g of [...games].reverse()) {
    if (g.result === 'white_wins' || g.result === 'black_wins') {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  // Shortest and longest game
  const moveCounts = completedGames.map((g: { moves_count: number }) => g.moves_count).filter((n: number) => n > 0);
  const shortestGame = moveCounts.length > 0 ? Math.min(...moveCounts) : 0;
  const longestGame = moveCounts.length > 0 ? Math.max(...moveCounts) : 0;

  return NextResponse.json({
    totalGames,
    completedGames: completedGames.length,
    whiteWins,
    blackWins,
    draws,
    avgMoves,
    shortestGame,
    longestGame,
    longestStreak,
    gamesOverTime: recentResult.rows,
  });
}
