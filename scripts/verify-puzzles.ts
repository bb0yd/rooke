import { PUZZLES } from '../src/data/puzzles';
import { Chess, Square, PieceSymbol } from 'chess.js';

let errors = 0;
for (const p of PUZZLES) {
  const g = new Chess(p.fen);
  for (let i = 0; i < p.moves.length; i++) {
    const uci = p.moves[i];
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    const promotion = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;
    try {
      const m = g.move({ from, to, promotion });
      if (m === null) {
        console.log(`INVALID: ${p.id} move[${i}] ${uci}`);
        errors++;
        break;
      }
    } catch (e: any) {
      console.log(`ERROR: ${p.id} move[${i}] ${uci}: ${e.message}`);
      errors++;
      break;
    }
  }
}
console.log(`\nChecked ${PUZZLES.length} puzzles, ${errors} errors.`);
