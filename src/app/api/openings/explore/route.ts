import { NextRequest, NextResponse } from 'next/server';
import { Chess } from 'chess.js';
import { OPENINGS } from '@/data/openings';

// Build a move tree from our opening database
// At each position (keyed by FEN prefix), we track which moves lead where
interface TreeNode {
  moves: Map<string, { san: string; uci: string; lines: number; openings: Set<string> }>;
  openingName?: string;
}

let treeCache: Map<string, TreeNode> | null = null;

function fenKey(fen: string): string {
  // Use just the board position + turn + castling (drop move counters for matching)
  return fen.split(' ').slice(0, 4).join(' ');
}

function buildTree(): Map<string, TreeNode> {
  if (treeCache) return treeCache;

  const tree = new Map<string, TreeNode>();

  for (const opening of OPENINGS) {
    for (const line of opening.lines) {
      const game = new Chess();

      for (let i = 0; i < line.moves.length; i++) {
        const key = fenKey(game.fen());

        if (!tree.has(key)) {
          tree.set(key, { moves: new Map() });
        }
        const node = tree.get(key)!;

        const san = line.moves[i];
        const move = game.move(san);
        if (!move) break;

        const uci = move.from + move.to + (move.promotion || '');
        const existing = node.moves.get(uci);
        if (existing) {
          existing.lines++;
          existing.openings.add(opening.name);
        } else {
          node.moves.set(uci, {
            san: move.san,
            uci,
            lines: 1,
            openings: new Set([opening.name]),
          });
        }

        // After making the move, tag the resulting position with the opening name
        // (use the deepest reached position as the opening name)
        const nextKey = fenKey(game.fen());
        if (!tree.has(nextKey)) {
          tree.set(nextKey, { moves: new Map() });
        }
        if (i >= 2) {
          // Only set opening name from move 3+ (after both sides have played at least once)
          tree.get(nextKey)!.openingName = `${opening.name}: ${line.name}`;
        }
      }
    }
  }

  treeCache = tree;
  return tree;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fen = searchParams.get('fen');

  if (!fen) {
    return NextResponse.json({ error: 'FEN required' }, { status: 400 });
  }

  const tree = buildTree();
  const key = fenKey(fen);
  const node = tree.get(key);

  if (!node) {
    return NextResponse.json({
      white: 0,
      draws: 0,
      black: 0,
      moves: [],
      opening: null,
    });
  }

  // Convert moves to the format the frontend expects
  const moves = Array.from(node.moves.values())
    .map(m => ({
      uci: m.uci,
      san: m.san,
      white: m.lines,
      draws: 0,
      black: 0,
      openings: Array.from(m.openings),
    }))
    .sort((a, b) => b.white - a.white);

  const totalLines = moves.reduce((sum, m) => sum + m.white, 0);

  return NextResponse.json({
    white: totalLines,
    draws: 0,
    black: 0,
    moves,
    opening: node.openingName ? { name: node.openingName } : null,
  });
}
