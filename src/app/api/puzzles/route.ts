import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { PUZZLES } from '@/data/puzzles';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const ratingMin = searchParams.get('rating_min');
  const ratingMax = searchParams.get('rating_max');
  const theme = searchParams.get('theme');
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  try {
    // Build query with optional filters
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (ratingMin) {
      const min = parseInt(ratingMin, 10);
      if (!isNaN(min)) {
        conditions.push(`rating >= $${paramIdx++}`);
        params.push(min);
      }
    }

    if (ratingMax) {
      const max = parseInt(ratingMax, 10);
      if (!isNaN(max)) {
        conditions.push(`rating <= $${paramIdx++}`);
        params.push(max);
      }
    }

    if (theme) {
      conditions.push(`$${paramIdx++} = ANY(themes)`);
      params.push(theme);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // First check if the table has any data
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM puzzles ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].total, 10);

    if (total === 0) {
      // Fall back to hardcoded PUZZLES data
      let filtered = [...PUZZLES];

      if (ratingMin) {
        const min = parseInt(ratingMin, 10);
        if (!isNaN(min)) filtered = filtered.filter((p) => p.rating >= min);
      }
      if (ratingMax) {
        const max = parseInt(ratingMax, 10);
        if (!isNaN(max)) filtered = filtered.filter((p) => p.rating <= max);
      }
      if (theme) {
        filtered = filtered.filter((p) => p.themes.includes(theme));
      }

      const sliced = filtered.slice(offset, offset + limit);

      return NextResponse.json({
        puzzles: sliced.map((p) => ({
          id: p.id,
          fen: p.fen,
          moves: p.moves.join(' '),
          rating: p.rating,
          rating_deviation: 75,
          popularity: 0,
          themes: p.themes,
          game_url: null,
          opening_tags: [],
        })),
        total: filtered.length,
        limit,
        offset,
        source: 'hardcoded',
      });
    }

    // Query the database
    const dataResult = await pool.query(
      `SELECT id, fen, moves, rating, rating_deviation, popularity, themes, game_url, opening_tags
       FROM puzzles ${where}
       ORDER BY rating ASC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset],
    );

    return NextResponse.json({
      puzzles: dataResult.rows,
      total,
      limit,
      offset,
      source: 'database',
    });
  } catch (error) {
    console.error('Puzzles API error:', error);

    // If DB is unavailable, fall back to hardcoded data
    let filtered = [...PUZZLES];

    if (ratingMin) {
      const min = parseInt(ratingMin, 10);
      if (!isNaN(min)) filtered = filtered.filter((p) => p.rating >= min);
    }
    if (ratingMax) {
      const max = parseInt(ratingMax, 10);
      if (!isNaN(max)) filtered = filtered.filter((p) => p.rating <= max);
    }
    if (theme) {
      filtered = filtered.filter((p) => p.themes.includes(theme));
    }

    const sliced = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      puzzles: sliced.map((p) => ({
        id: p.id,
        fen: p.fen,
        moves: p.moves.join(' '),
        rating: p.rating,
        rating_deviation: 75,
        popularity: 0,
        themes: p.themes,
        game_url: null,
        opening_tags: [],
      })),
      total: filtered.length,
      limit,
      offset,
      source: 'hardcoded',
    });
  }
}
