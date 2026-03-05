'use client';

import { useState, useCallback } from 'react';
import styles from './BoardOverlay.module.css';

interface Arrow {
  from: string;
  to: string;
  color: string;
}

interface Highlight {
  square: string;
  color: string;
}

interface Props {
  boardSize: number;
  flipped: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}

function squareToPixel(sq: string, boardSize: number, flipped: boolean): [number, number] {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]) - 1;
  const sqSize = boardSize / 8;
  const x = flipped ? (7 - file) * sqSize : file * sqSize;
  const y = flipped ? rank * sqSize : (7 - rank) * sqSize;
  return [x, y];
}

function pixelToSquare(px: number, py: number, boardSize: number, flipped: boolean): string {
  const sqSize = boardSize / 8;
  const col = Math.floor(px / sqSize);
  const row = Math.floor(py / sqSize);
  const file = flipped ? 7 - col : col;
  const rank = flipped ? row : 7 - row;
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return '';
  return String.fromCharCode(97 + file) + (rank + 1);
}

const ARROW_COLORS = ['rgba(0, 128, 0, 0.7)', 'rgba(0, 100, 200, 0.7)', 'rgba(200, 0, 0, 0.7)', 'rgba(200, 200, 0, 0.7)'];
const HIGHLIGHT_COLORS = ['rgba(0, 128, 0, 0.4)', 'rgba(0, 100, 200, 0.4)', 'rgba(200, 0, 0, 0.4)', 'rgba(200, 200, 0, 0.4)'];

export default function BoardOverlay({ boardSize, flipped }: Props) {
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [drawStart, setDrawStart] = useState<string | null>(null);
  const [colorIdx, setColorIdx] = useState(0);

  const sqSize = boardSize / 8;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const sq = pixelToSquare(x, y, boardSize, flipped);
    if (sq) setDrawStart(sq);
  }, [boardSize, flipped]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button !== 2 || !drawStart) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const sq = pixelToSquare(x, y, boardSize, flipped);

    if (sq === drawStart) {
      // Toggle highlight
      const existing = highlights.findIndex(h => h.square === sq);
      if (existing >= 0) {
        setHighlights(h => h.filter((_, i) => i !== existing));
      } else {
        setHighlights(h => [...h, { square: sq, color: HIGHLIGHT_COLORS[colorIdx] }]);
      }
    } else if (sq) {
      // Add arrow
      const existing = arrows.findIndex(a => a.from === drawStart && a.to === sq);
      if (existing >= 0) {
        setArrows(a => a.filter((_, i) => i !== existing));
      } else {
        setArrows(a => [...a, { from: drawStart!, to: sq, color: ARROW_COLORS[colorIdx] }]);
      }
    }
    setDrawStart(null);
  }, [drawStart, boardSize, flipped, colorIdx, arrows, highlights]);

  const handleClick = useCallback(() => {
    // Clear all drawings on left click
    if (arrows.length > 0 || highlights.length > 0) {
      setArrows([]);
      setHighlights([]);
    }
  }, [arrows, highlights]);

  return (
    <div
      className={styles.overlay}
      style={{ width: boardSize, height: boardSize }}
      onContextMenu={handleContextMenu}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      <svg className={styles.svg} width={boardSize} height={boardSize}>
        {/* Highlights */}
        {highlights.map((h, i) => {
          const [x, y] = squareToPixel(h.square, boardSize, flipped);
          return (
            <rect key={`h-${i}`} x={x} y={y} width={sqSize} height={sqSize} fill={h.color} />
          );
        })}

        {/* Arrows */}
        {arrows.map((a, i) => {
          const [x1, y1] = squareToPixel(a.from, boardSize, flipped);
          const [x2, y2] = squareToPixel(a.to, boardSize, flipped);
          const cx1 = x1 + sqSize / 2;
          const cy1 = y1 + sqSize / 2;
          const cx2 = x2 + sqSize / 2;
          const cy2 = y2 + sqSize / 2;
          const lineWidth = boardSize / 80;
          const headLen = boardSize / 28;

          const angle = Math.atan2(cy2 - cy1, cx2 - cx1);
          const endX = cx2 - Math.cos(angle) * headLen;
          const endY = cy2 - Math.sin(angle) * headLen;

          return (
            <g key={`a-${i}`}>
              <line x1={cx1} y1={cy1} x2={endX} y2={endY} stroke={a.color} strokeWidth={lineWidth} strokeLinecap="round" />
              <polygon
                points={`${cx2},${cy2} ${cx2 - headLen * Math.cos(angle - 0.4)},${cy2 - headLen * Math.sin(angle - 0.4)} ${cx2 - headLen * Math.cos(angle + 0.4)},${cy2 - headLen * Math.sin(angle + 0.4)}`}
                fill={a.color}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
