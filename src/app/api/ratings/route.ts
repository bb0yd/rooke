import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { DEFAULT_RATING } from '@/lib/rating';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Get user ratings for all types
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const result = await pool.query(
    'SELECT rating_type, rating, rd, volatility, games_count FROM user_ratings WHERE user_id = $1',
    [userId]
  );

  const ratings: Record<string, { rating: number; rd: number; volatility: number; gamesCount: number }> = {};
  for (const row of result.rows) {
    ratings[row.rating_type] = {
      rating: row.rating,
      rd: row.rd,
      volatility: row.volatility,
      gamesCount: row.games_count,
    };
  }

  // Provide defaults for missing types
  for (const type of ['puzzle', 'game', 'multiplayer']) {
    if (!ratings[type]) {
      ratings[type] = {
        rating: DEFAULT_RATING.rating,
        rd: DEFAULT_RATING.rd,
        volatility: DEFAULT_RATING.volatility,
        gamesCount: 0,
      };
    }
  }

  return NextResponse.json(ratings);
}

// POST: Update a rating (called after game/puzzle completion)
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { ratingType, rating, rd, volatility } = await req.json();

  if (!ratingType || rating === undefined) {
    return NextResponse.json({ error: 'ratingType and rating required' }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO user_ratings (user_id, rating_type, rating, rd, volatility, games_count)
     VALUES ($1, $2, $3, $4, $5, 1)
     ON CONFLICT (user_id, rating_type)
     DO UPDATE SET rating = $3, rd = $4, volatility = $5, games_count = user_ratings.games_count + 1`,
    [userId, ratingType, rating, rd || DEFAULT_RATING.rd, volatility || DEFAULT_RATING.volatility]
  );

  // Record history
  await pool.query(
    'INSERT INTO rating_history (user_id, rating_type, rating) VALUES ($1, $2, $3)',
    [userId, ratingType, rating]
  );

  return NextResponse.json({ success: true });
}
