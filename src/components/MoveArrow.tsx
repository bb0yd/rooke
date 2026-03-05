'use client';

interface Props {
  from: string;  // e.g. "e2"
  to: string;    // e.g. "e4"
  color?: string;
  flipped?: boolean;
  boardSize: number;
}

function squareToPixel(sq: string, boardSize: number, flipped: boolean): [number, number] {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]) - 1;
  const sqSize = boardSize / 8;
  const x = flipped ? (7 - file) * sqSize + sqSize / 2 : file * sqSize + sqSize / 2;
  const y = flipped ? rank * sqSize + sqSize / 2 : (7 - rank) * sqSize + sqSize / 2;
  return [x, y];
}

export default function MoveArrow({ from, to, color = 'rgba(0, 180, 0, 0.6)', flipped = false, boardSize }: Props) {
  const [x1, y1] = squareToPixel(from, boardSize, flipped);
  const [x2, y2] = squareToPixel(to, boardSize, flipped);

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = boardSize / 32;
  const lineWidth = boardSize / 80;

  // Shorten the arrow slightly so it doesn't go past center of target square
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const shortenBy = headLen * 0.8;
  const ratio = (dist - shortenBy) / dist;
  const ex = x1 + dx * ratio;
  const ey = y1 + dy * ratio;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: boardSize,
        height: boardSize,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth={headLen}
          markerHeight={headLen}
          refX={headLen * 0.7}
          refY={headLen / 2}
          orient="auto"
        >
          <polygon
            points={`0 0, ${headLen} ${headLen / 2}, 0 ${headLen}`}
            fill={color}
          />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={ex}
        y2={ey}
        stroke={color}
        strokeWidth={lineWidth}
        strokeLinecap="round"
        markerEnd="url(#arrowhead)"
      />
    </svg>
  );
}
