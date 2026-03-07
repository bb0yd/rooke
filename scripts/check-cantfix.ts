import { PUZZLES } from '../src/data/puzzles';
import { Chess } from 'chess.js';

const ids = ['p019', 'p042', 'p070', 'p084', 'p089', 'p095'];
for (const p of PUZZLES) {
  if (!ids.includes(p.id)) continue;
  console.log(`\n=== ${p.id} ===`);
  console.log('FEN:', p.fen);
  console.log('Moves:', p.moves);
  const g = new Chess(p.fen);
  console.log('Turn:', g.turn());
  console.log('Legal moves:', g.moves({ verbose: true }).map(m => m.from + m.to).join(', '));

  // Check piece at from square
  const from = p.moves[0].slice(0, 2);
  const piece = g.get(from as any);
  console.log(`Piece at ${from}:`, piece);
}
