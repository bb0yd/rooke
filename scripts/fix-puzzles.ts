import { PUZZLES } from '../src/data/puzzles';
import { Chess } from 'chess.js';

for (const p of PUZZLES) {
  if (p.moves.length >= 2) {
    try {
      const g = new Chess(p.fen);
      const from = p.moves[0].slice(0, 2);
      const to = p.moves[0].slice(2, 4);
      const promo = p.moves[0].length > 4 ? p.moves[0][4] : undefined;
      const m = g.move({ from, to, promotion: promo });
      if (m === null) {
        throw new Error('null move');
      }
    } catch {
      const parts = p.fen.split(' ');
      parts[1] = parts[1] === 'w' ? 'b' : 'w';
      const flippedFen = parts.join(' ');
      try {
        const g2 = new Chess(flippedFen);
        const from = p.moves[0].slice(0, 2);
        const to = p.moves[0].slice(2, 4);
        const promo = p.moves[0].length > 4 ? p.moves[0][4] : undefined;
        const m2 = g2.move({ from, to, promotion: promo });
        if (m2) {
          console.log(p.id + '|' + p.fen + '|' + flippedFen);
        } else {
          console.log('CANT_FIX: ' + p.id);
        }
      } catch {
        console.log('CANT_FIX: ' + p.id);
      }
    }
  }
}
