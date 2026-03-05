import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { calculateNewRating, DEFAULT_RATING } from '@/lib/rating';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Get puzzle rating and history
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ratingResult = await pool.query(
    'SELECT rating, rd, volatility, games_count FROM user_ratings WHERE user_id = $1 AND rating_type = $2',
    [userId, 'puzzle']
  );

  const rating = ratingResult.rows[0] || {
    rating: DEFAULT_RATING.rating,
    rd: DEFAULT_RATING.rd,
    volatility: DEFAULT_RATING.volatility,
    games_count: 0,
  };

  const historyResult = await pool.query(
    'SELECT rating, recorded_at FROM rating_history WHERE user_id = $1 AND rating_type = $2 ORDER BY recorded_at DESC LIMIT 50',
    [userId, 'puzzle']
  );

  return NextResponse.json({
    rating: rating.rating,
    rd: rating.rd,
    volatility: rating.volatility,
    gamesCount: rating.games_count,
    history: historyResult.rows.reverse(),
  });
}

// POST: Update puzzle rating after solving
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { puzzleRating, solved } = await req.json();

  // Get current rating
  const currentResult = await pool.query(
    'SELECT rating, rd, volatility FROM user_ratings WHERE user_id = $1 AND rating_type = $2',
    [userId, 'puzzle']
  );

  const current = currentResult.rows[0] || DEFAULT_RATING;

  const newRating = calculateNewRating(
    { rating: current.rating, rd: current.rd, volatility: current.volatility },
    [{ opponentRating: puzzleRating, opponentRd: 50, score: solved ? 1 : 0 }]
  );

  await pool.query(
    `INSERT INTO user_ratings (user_id, rating_type, rating, rd, volatility, games_count)
     VALUES ($1, 'puzzle', $2, $3, $4, 1)
     ON CONFLICT (user_id, rating_type)
     DO UPDATE SET rating = $2, rd = $3, volatility = $4, games_count = user_ratings.games_count + 1`,
    [userId, newRating.rating, newRating.rd, newRating.volatility]
  );

  await pool.query(
    "INSERT INTO rating_history (user_id, rating_type, rating) VALUES ($1, 'puzzle', $2)",
    [userId, newRating.rating]
  );

  return NextResponse.json({ rating: newRating.rating, rd: newRating.rd });
}
