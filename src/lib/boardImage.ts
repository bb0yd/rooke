// Export chess board position as PNG image using canvas

import { Chess, PieceSymbol, Color } from 'chess.js';

const PIECE_CHARS: Record<string, string> = {
  'wk': '\u2654', 'wq': '\u2655', 'wr': '\u2656', 'wb': '\u2657', 'wn': '\u2658', 'wp': '\u2659',
  'bk': '\u265A', 'bq': '\u265B', 'br': '\u265C', 'bb': '\u265D', 'bn': '\u265E', 'bp': '\u265F',
};

export function exportBoardAsImage(
  fen: string,
  options?: { size?: number; lightColor?: string; darkColor?: string; flipped?: boolean }
): string {
  const size = options?.size || 640;
  const lightColor = options?.lightColor || '#eae9d4';
  const darkColor = options?.darkColor || '#507297';
  const flipped = options?.flipped || false;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const sq = size / 8;

  const game = new Chess(fen);
  const board = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const actualRow = flipped ? 7 - row : row;
      const actualCol = flipped ? 7 - col : col;
      const isLight = (actualCol + (7 - actualRow)) % 2 === 1;

      ctx.fillStyle = isLight ? lightColor : darkColor;
      ctx.fillRect(col * sq, row * sq, sq, sq);

      const piece = board[actualRow][actualCol];
      if (piece) {
        const key = piece.color + piece.type;
        const char = PIECE_CHARS[key];
        if (char) {
          ctx.fillStyle = piece.color === 'w' ? '#fff' : '#000';
          ctx.font = `${sq * 0.75}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(char, col * sq + sq / 2, row * sq + sq / 2);
        }
      }
    }
  }

  // Coordinate labels
  ctx.fillStyle = '#666';
  ctx.font = `${sq * 0.15}px monospace`;
  const files = flipped ? 'hgfedcba' : 'abcdefgh';
  const ranks = flipped ? '12345678' : '87654321';
  for (let i = 0; i < 8; i++) {
    ctx.textAlign = 'center';
    ctx.fillText(files[i], i * sq + sq / 2, size - 3);
    ctx.textAlign = 'left';
    ctx.fillText(ranks[i], 3, i * sq + sq * 0.15);
  }

  return canvas.toDataURL('image/png');
}

export function downloadBoardImage(fen: string, filename?: string): void {
  const dataUrl = exportBoardAsImage(fen);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename || 'chess-position.png';
  a.click();
}
