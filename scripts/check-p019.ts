import { Chess } from 'chess.js';

const fen = 'rnb1kbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq - 0 2';
const g = new Chess(fen);
console.log('Turn:', g.turn());
console.log('Legal moves:', g.moves({ verbose: true }).map(m => m.from + m.to).join(', '));

const from = 'd8';
const to = 'h4';
console.log('Piece at d8:', g.get(from as any));

try {
  const m = g.move({ from, to });
  console.log('Move result:', m);
} catch (e: any) {
  console.log('Error:', e.message);
}
