import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { nextTrainingReview } from '@/lib/trainingReview';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const module = searchParams.get('module');
  const limit = Math.max(parseInt(searchParams.get('limit') || '5', 10), 1);
  const dueOnly = searchParams.get('due_only') !== '0';

  if (!module) {
    return NextResponse.json({ error: 'module is required' }, { status: 400 });
  }

  try {
    const params: Array<string | number> = [userId, module];
    let whereClause = 'WHERE user_id = $1 AND module = $2';
    if (dueOnly) {
      params.push(Date.now());
      whereClause += ` AND next_review > 0 AND next_review <= $${params.length}`;
    }
    params.push(limit);

    const result = await pool.query(
      `SELECT item_id, theme, metadata, next_review, last_score
       FROM training_item_reviews
       ${whereClause}
       ORDER BY next_review ASC NULLS LAST, last_practiced DESC
       LIMIT $${params.length}`,
      params
    );

    return NextResponse.json({
      items: result.rows.map(row => ({
        itemId: row.item_id,
        theme: row.theme,
        metadata: row.metadata || {},
        nextReview: Number(row.next_review || 0),
        lastScore: Number(row.last_score || 0),
      })),
    });
  } catch (error) {
    console.error('Training review GET error:', error);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { module, itemId, theme, score, elapsedMs, hintsUsed, metadata } = await req.json();
  if (!module || !itemId) {
    return NextResponse.json({ error: 'module and itemId are required' }, { status: 400 });
  }

  const existingResult = await pool.query(
    `SELECT ease_factor, interval_days, attempts, successes
     FROM training_item_reviews
     WHERE user_id = $1 AND module = $2 AND item_id = $3`,
    [userId, module, itemId]
  );
  const existing = existingResult.rows[0];
  const scoreValue = Math.max(0, Math.min(Number(score) || 0, 1));
  const next = nextTrainingReview(
    existing ? {
      easeFactor: Number(existing.ease_factor) || 2.5,
      intervalDays: Number(existing.interval_days) || 0,
    } : null,
    {
      score: scoreValue,
      elapsedMs: elapsedMs != null ? Math.max(Number(elapsedMs) || 0, 0) : undefined,
      hintsUsed: Math.max(Number(hintsUsed) || 0, 0),
    }
  );

  await pool.query(
    `INSERT INTO training_item_reviews (
       user_id, module, item_id, theme, ease_factor, interval_days, next_review,
       attempts, successes, last_score, last_practiced, metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10, $11)
     ON CONFLICT (user_id, module, item_id)
     DO UPDATE SET
       theme = EXCLUDED.theme,
       ease_factor = EXCLUDED.ease_factor,
       interval_days = EXCLUDED.interval_days,
       next_review = EXCLUDED.next_review,
       attempts = training_item_reviews.attempts + 1,
       successes = training_item_reviews.successes + EXCLUDED.successes,
       last_score = EXCLUDED.last_score,
       last_practiced = EXCLUDED.last_practiced,
       metadata = EXCLUDED.metadata`,
    [
      userId,
      module,
      itemId,
      theme || null,
      next.easeFactor,
      next.intervalDays,
      next.nextReview,
      scoreValue >= 0.7 ? 1 : 0,
      scoreValue,
      Date.now(),
      metadata && typeof metadata === 'object' ? metadata : {},
    ]
  );

  return NextResponse.json({ success: true, nextReview: next.nextReview });
}
