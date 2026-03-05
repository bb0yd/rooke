import { Chess } from 'chess.js';

export function copyFenToClipboard(fen: string): Promise<void> {
  return navigator.clipboard.writeText(fen);
}

export function downloadPgn(moves: string[], options?: {
  white?: string;
  black?: string;
  result?: string;
  event?: string;
  date?: string;
}): void {
  const game = new Chess();
  for (const san of moves) {
    game.move(san);
  }

  const headers: string[] = [];
  headers.push(`[Event "${options?.event || 'Rooke Game'}"]`);
  headers.push(`[Site "Rooke"]`);
  headers.push(`[Date "${options?.date || new Date().toISOString().split('T')[0]}"]`);
  headers.push(`[White "${options?.white || '?'}"]`);
  headers.push(`[Black "${options?.black || '?'}"]`);
  headers.push(`[Result "${options?.result || '*'}"]`);

  const pgn = headers.join('\n') + '\n\n' + game.pgn() + ' ' + (options?.result || '*');

  const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'game.pgn';
  a.click();
  URL.revokeObjectURL(url);
}
