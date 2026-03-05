'use client';

import { memo } from 'react';
import { PieceSymbol } from 'chess.js';
import { getPieceSvg } from './ChessPieces';
import { getSettings } from '@/lib/settings';
import { useEffect, useState } from 'react';
import styles from './MiniBoard.module.css';

const PIECE_MAP: Record<string, { color: 'w' | 'b'; type: PieceSymbol }> = {
  P: { color: 'w', type: 'p' }, N: { color: 'w', type: 'n' }, B: { color: 'w', type: 'b' },
  R: { color: 'w', type: 'r' }, Q: { color: 'w', type: 'q' }, K: { color: 'w', type: 'k' },
  p: { color: 'b', type: 'p' }, n: { color: 'b', type: 'n' }, b: { color: 'b', type: 'b' },
  r: { color: 'b', type: 'r' }, q: { color: 'b', type: 'q' }, k: { color: 'b', type: 'k' },
};

const THEMES: Record<string, { light: string; dark: string }> = {
  classic: { light: '#eae9d4', dark: '#507297' },
  green:   { light: '#eeeed2', dark: '#769656' },
  brown:   { light: '#f0d9b5', dark: '#b58863' },
  dark:    { light: '#ddd',    dark: '#555' },
};

function parseFen(fen: string): (null | { color: 'w' | 'b'; type: PieceSymbol })[] {
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
  return squares;
}

function MiniBoard({ fen }: { fen: string }) {
  const [theme, setTheme] = useState(THEMES.classic);

  useEffect(() => {
    const s = getSettings();
    if (s.boardTheme && THEMES[s.boardTheme]) {
      setTheme(THEMES[s.boardTheme]);
    }
  }, []);

  const squares = parseFen(fen);

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
            style={{ background: isLight ? theme.light : theme.dark }}
          >
            {piece && getPieceSvg(piece.color, piece.type)}
          </div>
        );
      })}
    </div>
  );
}

export default memo(MiniBoard);
