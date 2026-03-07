#!/usr/bin/env npx tsx
/**
 * Seed the puzzles table from a Lichess puzzle CSV file.
 *
 * Usage:
 *   npx tsx scripts/seed-puzzles.ts <path-to-csv> [--limit N]
 *
 * The CSV is expected to follow the Lichess puzzle database format:
 *   PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
 *
 * Download the CSV (warning: 4GB+ compressed) from:
 *   https://database.lichess.org/lichess_db_puzzle.csv.zst
 *
 * Environment variables for DB connection (defaults match docker-compose.yml):
 *   DB_HOST  (default: localhost)
 *   DB_PORT  (default: 5433)
 *   DB_NAME  (default: rooke)
 *   DB_USER  (default: rooke)
 *   DB_PASSWORD (default: rookechess)
 */

import { Pool } from 'pg';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { stat } from 'fs/promises';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500;

function parseArgs(): { filePath: string; limit: number } {
  const args = process.argv.slice(2);
  let filePath = '';
  let limit = 10000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      if (isNaN(limit) || limit <= 0) {
        console.error('Error: --limit must be a positive integer');
        process.exit(1);
      }
      i++; // skip next arg
    } else if (!args[i].startsWith('--')) {
      filePath = args[i];
    }
  }

  if (!filePath) {
    console.error(
      'Usage: npx tsx scripts/seed-puzzles.ts <path-to-csv> [--limit N]\n' +
        '\n' +
        'Download the Lichess puzzle CSV from:\n' +
        '  https://database.lichess.org/lichess_db_puzzle.csv.zst\n' +
        'Then decompress and pass the .csv file path as the first argument.',
    );
    process.exit(1);
  }

  return { filePath, limit };
}

// ---------------------------------------------------------------------------
// CSV parsing helpers
// ---------------------------------------------------------------------------

interface PuzzleRow {
  id: string;
  fen: string;
  moves: string; // space-separated UCI moves
  rating: number;
  ratingDeviation: number;
  popularity: number;
  themes: string[];
  gameUrl: string;
  openingTags: string[];
}

function parseLine(line: string): PuzzleRow | null {
  // CSV fields: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
  // FEN contains commas? No -- FEN uses spaces, not commas. Simple split is safe.
  const parts = line.split(',');
  if (parts.length < 10) return null;

  const id = parts[0].trim();
  const fen = parts[1].trim();
  const moves = parts[2].trim(); // space-separated UCI
  const rating = parseInt(parts[3], 10);
  const ratingDeviation = parseInt(parts[4], 10);
  const popularity = parseInt(parts[5], 10);
  // parts[6] = NbPlays (we skip it)
  const themes = parts[7]
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const gameUrl = parts[8].trim();
  const openingTags = parts[9]
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (!id || !fen || !moves || isNaN(rating)) return null;

  return {
    id,
    fen,
    moves,
    rating,
    ratingDeviation: isNaN(ratingDeviation) ? 75 : ratingDeviation,
    popularity: isNaN(popularity) ? 0 : popularity,
    themes,
    gameUrl,
    openingTags,
  };
}

// ---------------------------------------------------------------------------
// DB insertion
// ---------------------------------------------------------------------------

async function insertBatch(pool: Pool, batch: PuzzleRow[]): Promise<number> {
  if (batch.length === 0) return 0;

  // Build a multi-row INSERT with parameterized values
  const values: unknown[] = [];
  const rows: string[] = [];

  for (let i = 0; i < batch.length; i++) {
    const p = batch[i];
    const offset = i * 9;
    rows.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`,
    );
    values.push(
      p.id,
      p.fen,
      p.moves,
      p.rating,
      p.ratingDeviation,
      p.popularity,
      p.themes,
      p.gameUrl || null,
      p.openingTags,
    );
  }

  const sql = `
    INSERT INTO puzzles (id, fen, moves, rating, rating_deviation, popularity, themes, game_url, opening_tags)
    VALUES ${rows.join(', ')}
    ON CONFLICT (id) DO NOTHING
  `;

  const result = await pool.query(sql, values);
  return result.rowCount ?? 0;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { filePath, limit } = parseArgs();

  // Verify file exists
  try {
    await stat(filePath);
  } catch {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    database: process.env.DB_NAME || 'rooke',
    user: process.env.DB_USER || 'rooke',
    password: process.env.DB_PASSWORD || 'rookechess',
    max: 5,
  });

  console.log(`Seeding puzzles from: ${filePath}`);
  console.log(`Limit: ${limit} puzzles`);
  console.log(
    `Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}/${process.env.DB_NAME || 'rooke'}`,
  );

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  let parsed = 0;
  let inserted = 0;
  let skipped = 0;
  let batch: PuzzleRow[] = [];
  let isFirstLine = true;

  for await (const line of rl) {
    // Skip header line if present
    if (isFirstLine) {
      isFirstLine = false;
      if (line.startsWith('PuzzleId') || line.startsWith('puzzleid')) {
        continue;
      }
    }

    lineNum++;

    const puzzle = parseLine(line);
    if (!puzzle) {
      skipped++;
      continue;
    }

    batch.push(puzzle);
    parsed++;

    if (batch.length >= BATCH_SIZE) {
      const count = await insertBatch(pool, batch);
      inserted += count;
      batch = [];

      if (parsed % 5000 === 0) {
        console.log(`  Processed ${parsed} puzzles (${inserted} inserted)...`);
      }
    }

    if (parsed >= limit) break;
  }

  // Insert remaining batch
  if (batch.length > 0) {
    const count = await insertBatch(pool, batch);
    inserted += count;
  }

  console.log(`\nDone!`);
  console.log(`  Lines read: ${lineNum}`);
  console.log(`  Parsed:     ${parsed}`);
  console.log(`  Inserted:   ${inserted}`);
  console.log(`  Skipped:    ${skipped}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
