import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  // Fetch user profile
  const userResult = await pool.query(
    'SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE username = $1',
    [username]
  );

  if (userResult.rows.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const user = userResult.rows[0];

  // Fetch ratings
  const ratingsResult = await pool.query(
    'SELECT rating_type, rating, rd, volatility FROM user_ratings WHERE user_id = $1',
    [user.id]
  );

  // Fetch last 10 games
  const gamesResult = await pool.query(
    `SELECT id, pgn, result, moves_count, created_at, opening_name
     FROM games WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 10`,
    [user.id]
  );

  // Compute win/draw/loss counts from both single-player and multiplayer games
  const wdlResult = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE result = 'white_wins' OR result = 'black_wins') AS wins,
       COUNT(*) FILTER (WHERE result = 'draw') AS draws
     FROM games WHERE user_id = $1`,
    [user.id]
  );
  const mpWdlResult = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE (white_user_id = $1 AND result = 'white_wins') OR (black_user_id = $1 AND result = 'black_wins')) AS wins,
       COUNT(*) FILTER (WHERE result = 'draw') AS draws,
       COUNT(*) FILTER (WHERE (white_user_id = $1 AND result = 'black_wins') OR (black_user_id = $1 AND result = 'white_wins')) AS losses
     FROM multiplayer_games WHERE white_user_id = $1 OR black_user_id = $1`,
    [user.id]
  );

  const spWdl = wdlResult.rows[0];
  const mpWdl = mpWdlResult.rows[0];
  const wdl = {
    wins: (parseInt(spWdl.wins) || 0) + (parseInt(mpWdl.wins) || 0),
    draws: (parseInt(spWdl.draws) || 0) + (parseInt(mpWdl.draws) || 0),
    losses: parseInt(mpWdl.losses) || 0,
  };

  // Fetch opening statistics
  const openingsResult = await pool.query(
    `SELECT opening_name, COUNT(*) as games,
            SUM(CASE WHEN result = 'white_wins' THEN 1 ELSE 0 END) as white_wins,
            SUM(CASE WHEN result = 'black_wins' THEN 1 ELSE 0 END) as black_wins,
            SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws
     FROM games
     WHERE user_id = $1 AND opening_name IS NOT NULL AND opening_name != ''
     GROUP BY opening_name
     ORDER BY COUNT(*) DESC
     LIMIT 10`,
    [user.id]
  );

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    },
    ratings: ratingsResult.rows,
    recentGames: gamesResult.rows,
    record: {
      wins: wdl.wins,
      draws: wdl.draws,
      losses: wdl.losses,
    },
    openings: openingsResult.rows,
  });
}
