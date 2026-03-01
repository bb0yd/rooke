import { PieceSymbol } from 'chess.js';
import { getPieceSvg } from './ChessPieces';
import styles from './MiniBoard.module.css';

const PIECE_MAP: Record<string, { color: 'w' | 'b'; type: PieceSymbol }> = {
  P: { color: 'w', type: 'p' }, N: { color: 'w', type: 'n' }, B: { color: 'w', type: 'b' },
  R: { color: 'w', type: 'r' }, Q: { color: 'w', type: 'q' }, K: { color: 'w', type: 'k' },
  p: { color: 'b', type: 'p' }, n: { color: 'b', type: 'n' }, b: { color: 'b', type: 'b' },
  r: { color: 'b', type: 'r' }, q: { color: 'b', type: 'q' }, k: { color: 'b', type: 'k' },
};

interface Props {
  fen: string;
}

export default function MiniBoard({ fen }: Props) {
  const placement = fen.split(' ')[0];
  const rows = placement.split('/');

  const squares: (null | { color: 'w' | 'b'; type: PieceSymbol })[] = [];
  for (const row of rows) {
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < parseInt(ch); i++) squares.push(null);
      } else {
        squares.push(PIECE_MAP[ch] ?? null);
      }
    }
  }

  return (
    <div className={styles.miniBoard}>
      {squares.map((piece, idx) => {
        const row = Math.floor(idx / 8);
        const col = idx % 8;
        const isLight = (row + col) % 2 === 0;
        return (
          <div
            key={idx}
            className={styles.square}
            style={{ background: isLight ? '#eae9d4' : '#507297' }}
          >
            {piece && getPieceSvg(piece.color, piece.type)}
          </div>
        );
      })}
    </div>
  );
}
