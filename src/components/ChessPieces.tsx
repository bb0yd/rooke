import { PieceSymbol } from 'chess.js';
import type { PieceSet } from '@/lib/settings';

type PieceColor = 'w' | 'b';

const PIECE_SETS_MAP: Record<string, Record<string, React.ReactNode>> = {};

function getPieceSetMap(set: string): Record<string, React.ReactNode> {
  if (!PIECE_SETS_MAP[set]) {
    // Lazy-init reference — the const objects are already static, this just avoids switch on every call
    switch (set) {
      case 'modern': PIECE_SETS_MAP[set] = MODERN_PIECES; break;
      case 'classic': PIECE_SETS_MAP[set] = CLASSIC_PIECES; break;
      case 'pixel': PIECE_SETS_MAP[set] = PIXEL_PIECES; break;
      default: PIECE_SETS_MAP[set] = STANDARD_PIECES; break;
    }
  }
  return PIECE_SETS_MAP[set];
}

// Cache for piece lookups — avoids string concatenation + map lookup on every render
const pieceCache = new Map<string, React.ReactNode>();

export function getPieceSvg(color: PieceColor, type: PieceSymbol, pieceSet?: PieceSet): React.ReactNode {
  const set = pieceSet ?? 'standard';
  const key = `${set}_${color}${type}`;
  let cached = pieceCache.get(key);
  if (cached !== undefined) return cached;
  const map = getPieceSetMap(set);
  cached = map[`${color}${type}`] ?? null;
  pieceCache.set(key, cached);
  return cached;
}

// ═══════════════════════════════════════════════════════════════════
// STANDARD SET — cburnett chess pieces (CC BY-SA 3.0, Colin M.L. Burnett)
// Source: https://github.com/lichess-org/lila
// ═══════════════════════════════════════════════════════════════════
const STANDARD_PIECES: Record<string, React.ReactNode> = {
  // ── White Pieces ──────────────────────────────────────────────
  wp: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path fill="#fff" stroke="#000" strokeLinecap="round" strokeWidth="1.5" d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/>
    </svg>
  ),
  wn: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path fill="#fff" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/>
        <path fill="#fff" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/>
        <path fill="#000" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"/>
      </g>
    </svg>
  ),
  wb: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <g fill="#fff" strokeLinecap="butt">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.94 3-2 3-2z"/>
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
        </g>
        <path strokeLinejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/>
      </g>
    </svg>
  ),
  wr: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#fff" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path strokeLinecap="butt" d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm-1-22V9h4v2h5V9h5v2h5V9h4v5"/>
        <path d="m34 14-3 3H14l-3-3"/>
        <path strokeLinecap="butt" strokeLinejoin="miter" d="M31 17v12.5H14V17"/>
        <path d="m31 29.5 1.5 2.5h-20l1.5-2.5"/>
        <path fill="none" strokeLinejoin="miter" d="M11 14h23"/>
      </g>
    </svg>
  ),
  wq: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#fff" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/>
        <path strokeLinecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z"/>
        <path strokeLinecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/>
        <path fill="none" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/>
      </g>
    </svg>
  ),
  wk: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path strokeLinejoin="miter" d="M22.5 11.63V6M20 8h5"/>
        <path fill="#fff" strokeLinecap="butt" strokeLinejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/>
        <path fill="#fff" d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"/>
        <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/>
      </g>
    </svg>
  ),

  // ── Black Pieces ──────────────────────────────────────────────
  bp: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path stroke="#000" strokeLinecap="round" strokeWidth="1.5" d="M22.5 9a4 4 0 0 0-3.22 6.38 6.48 6.48 0 0 0-.87 10.65c-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47a6.46 6.46 0 0 0-.87-10.65A4.01 4.01 0 0 0 22.5 9z"/>
    </svg>
  ),
  bn: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path fill="#000" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/>
        <path fill="#000" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-1-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-2 2.5-3c1 0 1 3 1 3"/>
        <path fill="#ececec" stroke="#ececec" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.43-9.75a.5 1.5 30 1 1-.86-.5.5 1.5 30 1 1 .86.5z"/>
        <path fill="#ececec" stroke="none" d="m24.55 10.4-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z"/>
      </g>
    </svg>
  ),
  bb: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <g fill="#000" strokeLinecap="butt">
          <path d="M9 36c3.4-1 10.1.4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.6.5 3 2-.7 1-1.6 1-3 .5-3.4-1-10.1.5-13.5-1-3.4 1.5-10.1 0-13.5 1-1.4.5-2.3.5-3-.5 1.4-2 3-2 3-2z"/>
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
        </g>
        <path stroke="#ececec" strokeLinejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/>
      </g>
    </svg>
  ),
  br: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path strokeLinecap="butt" d="M9 39h27v-3H9v3zm3.5-7 1.5-2.5h17l1.5 2.5h-20zm-.5 4v-4h21v4H12z"/>
        <path strokeLinecap="butt" strokeLinejoin="miter" d="M14 29.5v-13h17v13H14z"/>
        <path strokeLinecap="butt" d="M14 16.5 11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"/>
        <path fill="none" stroke="#ececec" strokeLinejoin="miter" strokeWidth="1" d="M12 35.5h21m-20-4h19m-18-2h17m-17-13h17M11 14h23"/>
      </g>
    </svg>
  ),
  bq: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <g stroke="none">
          <circle cx="6" cy="12" r="2.75"/>
          <circle cx="14" cy="9" r="2.75"/>
          <circle cx="22.5" cy="8" r="2.75"/>
          <circle cx="31" cy="9" r="2.75"/>
          <circle cx="39" cy="12" r="2.75"/>
        </g>
        <path strokeLinecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/>
        <path strokeLinecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/>
        <path fill="none" strokeLinecap="butt" d="M11 38.5a35 35 1 0 0 23 0"/>
        <path fill="none" stroke="#ececec" d="M11 29a35 35 1 0 1 23 0m-21.5 2.5h20m-21 3a35 35 1 0 0 22 0m-23 3a35 35 1 0 0 24 0"/>
      </g>
    </svg>
  ),
  bk: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path strokeLinejoin="miter" d="M22.5 11.6V6"/>
        <path fill="#000" strokeLinecap="butt" strokeLinejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/>
        <path fill="#000" d="M11.5 37a22.3 22.3 0 0 0 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"/>
        <path strokeLinejoin="miter" d="M20 8h5"/>
        <path stroke="#ececec" d="M32 29.5s8.5-4 6-9.7C34.1 14 25 18 22.5 24.6v2.1-2.1C20 18 9.9 14 7 19.9c-2.5 5.6 4.8 9 4.8 9"/>
        <path stroke="#ececec" d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/>
      </g>
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════
// MODERN SET — Minimal, flat designs with solid fills, no internal details
// ═══════════════════════════════════════════════════════════════════
const MODERN_PIECES: Record<string, React.ReactNode> = {
  // ── White Pieces ──────────────────────────────────────────────
  wp: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <circle cx="22.5" cy="12" r="4" fill="#f0f0f0" stroke="#333" strokeWidth="1.5"/>
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" d="M15 39h15c0-7-3-10-5-12a6 6 0 0 0 0-10 6 6 0 0 0 0 10c-2 2-5 5-5 12h-5z"/>
      <ellipse cx="22.5" cy="21" rx="5.5" ry="5" fill="#f0f0f0" stroke="#333" strokeWidth="1.5"/>
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M14 39h17l-2-6H16z"/>
    </svg>
  ),
  wn: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M12 39h22c.5-12-2-22-12-28l-3 2-3 5-5 3c-1 2 0 4 2 4l3-1c-1 5 1 11-4 15z"/>
      <circle cx="13" cy="22" r="1" fill="#333"/>
    </svg>
  ),
  wb: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <circle cx="22.5" cy="8" r="2.5" fill="#f0f0f0" stroke="#333" strokeWidth="1.5"/>
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M15 32c0-3-2-5 0-8 2.5-4 5-10 5-14h5c0 4 2.5 10 5 14 2 3 0 5 0 8z"/>
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M12 39h21l-1.5-4H13.5z"/>
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" d="M13.5 35c2-1 7-1 9-.5 2-.5 7-.5 9 .5"/>
    </svg>
  ),
  wr: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M11 9h4v3h5V9h5v3h5V9h4v6H11zM13 15h19v15H13z"/>
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M11 30h23v3H11zM9 33h27v3H9zM9 36h27v3H9z"/>
    </svg>
  ),
  wq: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <circle cx="6.5" cy="12" r="2" fill="#f0f0f0" stroke="#333" strokeWidth="1.2"/>
      <circle cx="14" cy="8.5" r="2" fill="#f0f0f0" stroke="#333" strokeWidth="1.2"/>
      <circle cx="22.5" cy="7" r="2" fill="#f0f0f0" stroke="#333" strokeWidth="1.2"/>
      <circle cx="31" cy="8.5" r="2" fill="#f0f0f0" stroke="#333" strokeWidth="1.2"/>
      <circle cx="38.5" cy="12" r="2" fill="#f0f0f0" stroke="#333" strokeWidth="1.2"/>
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M6.5 14 9 26c8.5-1.5 18.5-1.5 27 0l2.5-12-7 10V11l-5.5 13-3-14-3 14L15.5 11v13l-7-10z"/>
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M9 26c-1 5 0 8 2 10h23c2-2 3-5 2-10-8.5-1.5-18.5-1.5-27 0z"/>
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M9 36h27v3H9z"/>
    </svg>
  ),
  wk: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path fill="#333" d="M22.5 6v6M20 9h5" stroke="#333" strokeWidth="1.5"/>
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M22.5 25c-1.5-3-3-10.5-3-10.5S18.5 12 22.5 12s3 2.5 3 2.5-1.5 7.5-3 10.5z"/>
      <path fill="#f0f0f0" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7c3-1.5 6-5 5-10-3-6-12-5-14 2v1c-2-7-11-8-14-2-1 5 2 8.5 5 10v6z"/>
    </svg>
  ),

  // ── Black Pieces ──────────────────────────────────────────────
  bp: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <circle cx="22.5" cy="12" r="4" fill="#1a1a1a" stroke="#333" strokeWidth="1.5"/>
      <ellipse cx="22.5" cy="21" rx="5.5" ry="5" fill="#1a1a1a" stroke="#333" strokeWidth="1.5"/>
      <path fill="#1a1a1a" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M14 39h17l-2-6H16z"/>
    </svg>
  ),
  bn: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path fill="#1a1a1a" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M12 39h22c.5-12-2-22-12-28l-3 2-3 5-5 3c-1 2 0 4 2 4l3-1c-1 5 1 11-4 15z"/>
      <circle cx="13" cy="22" r="1" fill="#ddd"/>
    </svg>
  ),
  bb: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <circle cx="22.5" cy="8" r="2.5" fill="#1a1a1a" stroke="#333" strokeWidth="1.5"/>
      <path fill="#1a1a1a" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M15 32c0-3-2-5 0-8 2.5-4 5-10 5-14h5c0 4 2.5 10 5 14 2 3 0 5 0 8z"/>
      <path fill="#1a1a1a" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M12 39h21l-1.5-4H13.5z"/>
      <path fill="none" stroke="#ddd" strokeWidth="1" d="M17.5 26h10M15 30h15"/>
    </svg>
  ),
  br: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path fill="#1a1a1a" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M11 9h4v3h5V9h5v3h5V9h4v6H11zM13 15h19v15H13z"/>
      <path fill="#1a1a1a" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M11 30h23v3H11zM9 33h27v3H9zM9 36h27v3H9z"/>
      <path fill="none" stroke="#ddd" strokeWidth="1" d="M13 17h19M11 32h23M9 38h27"/>
    </svg>
  ),
  bq: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <circle cx="6.5" cy="12" r="2" fill="#1a1a1a" stroke="#333" strokeWidth="1.2"/>
      <circle cx="14" cy="8.5" r="2" fill="#1a1a1a" stroke="#333" strokeWidth="1.2"/>
      <circle cx="22.5" cy="7" r="2" fill="#1a1a1a" stroke="#333" strokeWidth="1.2"/>
      <circle cx="31" cy="8.5" r="2" fill="#1a1a1a" stroke="#333" strokeWidth="1.2"/>
      <circle cx="38.5" cy="12" r="2" fill="#1a1a1a" stroke="#333" strokeWidth="1.2"/>
      <path fill="#1a1a1a" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M6.5 14 9 26c8.5-1.5 18.5-1.5 27 0l2.5-12-7 10V11l-5.5 13-3-14-3 14L15.5 11v13l-7-10z"/>
      <path fill="#1a1a1a" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M9 26c-1 5 0 8 2 10h23c2-2 3-5 2-10-8.5-1.5-18.5-1.5-27 0z"/>
      <path fill="#1a1a1a" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M9 36h27v3H9z"/>
      <path fill="none" stroke="#ddd" strokeWidth="1" d="M11 29c6-1.5 17-1.5 23 0M11.5 32h22M11 35c6-1 17-1 23 0"/>
    </svg>
  ),
  bk: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path fill="#333" d="M22.5 6v6M20 9h5" stroke="#333" strokeWidth="1.5"/>
      <path fill="#1a1a1a" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M22.5 25c-1.5-3-3-10.5-3-10.5S18.5 12 22.5 12s3 2.5 3 2.5-1.5 7.5-3 10.5z"/>
      <path fill="#1a1a1a" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7c3-1.5 6-5 5-10-3-6-12-5-14 2v1c-2-7-11-8-14-2-1 5 2 8.5 5 10v6z"/>
      <path fill="none" stroke="#ddd" strokeWidth="1" d="M32 29.5s8.5-4 6-9.7C34.1 14 25 18 22.5 24.6v2.1-2.1C20 18 9.9 14 7 19.9c-2.5 5.6 4.8 9 4.8 9"/>
      <path fill="none" stroke="#ddd" strokeWidth="1" d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/>
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════
// CLASSIC SET — Staunton-inspired with warmer tones
// Uses the same shapes as standard but with warmer fill colors
// ═══════════════════════════════════════════════════════════════════
const CLASSIC_PIECES: Record<string, React.ReactNode> = {
  // ── White Pieces (warm ivory #fdf6e3, outlined in #5c4a32) ──
  wp: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path fill="#fdf6e3" stroke="#5c4a32" strokeLinecap="round" strokeWidth="1.5" d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/>
    </svg>
  ),
  wn: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#5c4a32" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path fill="#fdf6e3" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/>
        <path fill="#fdf6e3" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/>
        <path fill="#5c4a32" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"/>
      </g>
    </svg>
  ),
  wb: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#5c4a32" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <g fill="#fdf6e3" strokeLinecap="butt">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.94 3-2 3-2z"/>
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
        </g>
        <path stroke="#5c4a32" strokeLinejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/>
      </g>
    </svg>
  ),
  wr: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#fdf6e3" fillRule="evenodd" stroke="#5c4a32" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path strokeLinecap="butt" d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm-1-22V9h4v2h5V9h5v2h5V9h4v5"/>
        <path d="m34 14-3 3H14l-3-3"/>
        <path strokeLinecap="butt" strokeLinejoin="miter" d="M31 17v12.5H14V17"/>
        <path d="m31 29.5 1.5 2.5h-20l1.5-2.5"/>
        <path fill="none" strokeLinejoin="miter" d="M11 14h23"/>
      </g>
    </svg>
  ),
  wq: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#fdf6e3" fillRule="evenodd" stroke="#5c4a32" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/>
        <path strokeLinecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z"/>
        <path strokeLinecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/>
        <path fill="none" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/>
      </g>
    </svg>
  ),
  wk: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#5c4a32" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path strokeLinejoin="miter" d="M22.5 11.63V6M20 8h5"/>
        <path fill="#fdf6e3" strokeLinecap="butt" strokeLinejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/>
        <path fill="#fdf6e3" d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"/>
        <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/>
      </g>
    </svg>
  ),

  // ── Black Pieces (dark walnut #3c2415, outlined in #2a1a0e) ──
  bp: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path fill="#3c2415" stroke="#2a1a0e" strokeLinecap="round" strokeWidth="1.5" d="M22.5 9a4 4 0 0 0-3.22 6.38 6.48 6.48 0 0 0-.87 10.65c-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47a6.46 6.46 0 0 0-.87-10.65A4.01 4.01 0 0 0 22.5 9z"/>
    </svg>
  ),
  bn: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#2a1a0e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path fill="#3c2415" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/>
        <path fill="#3c2415" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-1-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-2 2.5-3c1 0 1 3 1 3"/>
        <path fill="#d4c4a8" stroke="#d4c4a8" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.43-9.75a.5 1.5 30 1 1-.86-.5.5 1.5 30 1 1 .86.5z"/>
        <path fill="#d4c4a8" stroke="none" d="m24.55 10.4-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z"/>
      </g>
    </svg>
  ),
  bb: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#2a1a0e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <g fill="#3c2415" strokeLinecap="butt">
          <path d="M9 36c3.4-1 10.1.4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.6.5 3 2-.7 1-1.6 1-3 .5-3.4-1-10.1.5-13.5-1-3.4 1.5-10.1 0-13.5 1-1.4.5-2.3.5-3-.5 1.4-2 3-2 3-2z"/>
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
        </g>
        <path stroke="#d4c4a8" strokeLinejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/>
      </g>
    </svg>
  ),
  br: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#3c2415" fillRule="evenodd" stroke="#2a1a0e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path strokeLinecap="butt" d="M9 39h27v-3H9v3zm3.5-7 1.5-2.5h17l1.5 2.5h-20zm-.5 4v-4h21v4H12z"/>
        <path strokeLinecap="butt" strokeLinejoin="miter" d="M14 29.5v-13h17v13H14z"/>
        <path strokeLinecap="butt" d="M14 16.5 11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"/>
        <path fill="none" stroke="#d4c4a8" strokeLinejoin="miter" strokeWidth="1" d="M12 35.5h21m-20-4h19m-18-2h17m-17-13h17M11 14h23"/>
      </g>
    </svg>
  ),
  bq: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#3c2415" fillRule="evenodd" stroke="#2a1a0e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <g stroke="none">
          <circle cx="6" cy="12" r="2.75"/>
          <circle cx="14" cy="9" r="2.75"/>
          <circle cx="22.5" cy="8" r="2.75"/>
          <circle cx="31" cy="9" r="2.75"/>
          <circle cx="39" cy="12" r="2.75"/>
        </g>
        <path strokeLinecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/>
        <path strokeLinecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/>
        <path fill="none" strokeLinecap="butt" d="M11 38.5a35 35 1 0 0 23 0"/>
        <path fill="none" stroke="#d4c4a8" d="M11 29a35 35 1 0 1 23 0m-21.5 2.5h20m-21 3a35 35 1 0 0 22 0m-23 3a35 35 1 0 0 24 0"/>
      </g>
    </svg>
  ),
  bk: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#2a1a0e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path strokeLinejoin="miter" d="M22.5 11.6V6"/>
        <path fill="#3c2415" strokeLinecap="butt" strokeLinejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/>
        <path fill="#3c2415" d="M11.5 37a22.3 22.3 0 0 0 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"/>
        <path strokeLinejoin="miter" d="M20 8h5"/>
        <path stroke="#d4c4a8" d="M32 29.5s8.5-4 6-9.7C34.1 14 25 18 22.5 24.6v2.1-2.1C20 18 9.9 14 7 19.9c-2.5 5.6 4.8 9 4.8 9"/>
        <path stroke="#d4c4a8" d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/>
      </g>
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════
// PIXEL SET — Pixel-art style using basic geometric shapes
// ═══════════════════════════════════════════════════════════════════
const PIXEL_PIECES: Record<string, React.ReactNode> = {
  // ── White Pieces ──────────────────────────────────────────────
  wp: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <rect x="19" y="9" width="7" height="7" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="17" y="16" width="11" height="7" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="14" y="23" width="17" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="12" y="27" width="21" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="10" y="31" width="25" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="8" y="35" width="29" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
    </svg>
  ),
  wn: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <rect x="10" y="8" width="5" height="5" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="12" y="13" width="8" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="15" y="11" width="10" height="6" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="20" y="8" width="7" height="5" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="22" y="13" width="7" height="5" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="20" y="18" width="9" height="5" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="17" y="23" width="13" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="14" y="27" width="17" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="11" y="31" width="23" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="9" y="35" width="27" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="10" y="10" width="2" height="2" fill="#000"/>
    </svg>
  ),
  wb: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <rect x="20" y="5" width="5" height="5" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="18" y="10" width="9" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="16" y="14" width="13" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="18" y="18" width="9" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="16" y="22" width="13" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="14" y="26" width="17" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="12" y="30" width="21" height="3" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="10" y="33" width="25" height="3" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="8" y="36" width="29" height="3" fill="#fff" stroke="#000" strokeWidth="1"/>
      <line x1="22.5" y1="14" x2="22.5" y2="22" stroke="#000" strokeWidth="1.5"/>
      <line x1="18" y1="18" x2="27" y2="18" stroke="#000" strokeWidth="1.5"/>
    </svg>
  ),
  wr: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <rect x="11" y="8" width="5" height="5" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="20" y="8" width="5" height="5" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="29" y="8" width="5" height="5" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="11" y="13" width="23" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="14" y="17" width="17" height="12" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="12" y="29" width="21" height="3" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="10" y="32" width="25" height="3" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="9" y="35" width="27" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
    </svg>
  ),
  wq: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <rect x="5" y="9" width="4" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="12" y="6" width="4" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="20.5" y="4" width="4" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="29" y="6" width="4" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="36" y="9" width="4" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <polygon points="7,13 14,10 22.5,8 31,10 38,13 35,26 30,15 25.5,26 22.5,12 19.5,26 15,15 10,26" fill="#fff" stroke="#000" strokeWidth="1" strokeLinejoin="round"/>
      <rect x="10" y="26" width="25" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="10" y="30" width="25" height="3" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="9" y="33" width="27" height="3" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="8" y="36" width="29" height="3" fill="#fff" stroke="#000" strokeWidth="1"/>
    </svg>
  ),
  wk: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <rect x="21" y="4" width="3" height="7" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="18" y="7" width="9" height="3" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="18" y="12" width="9" height="5" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="16" y="17" width="13" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="7" y="21" width="13" height="6" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="25" y="21" width="13" height="6" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="12" y="27" width="21" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="10" y="31" width="25" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="9" y="35" width="27" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
    </svg>
  ),

  // ── Black Pieces ──────────────────────────────────────────────
  bp: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <rect x="19" y="9" width="7" height="7" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="17" y="16" width="11" height="7" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="14" y="23" width="17" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="12" y="27" width="21" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="10" y="31" width="25" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="8" y="35" width="29" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
    </svg>
  ),
  bn: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <rect x="10" y="8" width="5" height="5" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="12" y="13" width="8" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="15" y="11" width="10" height="6" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="20" y="8" width="7" height="5" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="22" y="13" width="7" height="5" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="20" y="18" width="9" height="5" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="17" y="23" width="13" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="14" y="27" width="17" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="11" y="31" width="23" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="9" y="35" width="27" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="10" y="10" width="2" height="2" fill="#ddd"/>
    </svg>
  ),
  bb: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <rect x="20" y="5" width="5" height="5" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="18" y="10" width="9" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="16" y="14" width="13" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="18" y="18" width="9" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="16" y="22" width="13" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="14" y="26" width="17" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="12" y="30" width="21" height="3" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="10" y="33" width="25" height="3" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="8" y="36" width="29" height="3" fill="#222" stroke="#000" strokeWidth="1"/>
      <line x1="22.5" y1="14" x2="22.5" y2="22" stroke="#ddd" strokeWidth="1.5"/>
      <line x1="18" y1="18" x2="27" y2="18" stroke="#ddd" strokeWidth="1.5"/>
    </svg>
  ),
  br: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <rect x="11" y="8" width="5" height="5" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="20" y="8" width="5" height="5" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="29" y="8" width="5" height="5" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="11" y="13" width="23" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="14" y="17" width="17" height="12" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="12" y="29" width="21" height="3" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="10" y="32" width="25" height="3" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="9" y="35" width="27" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <line x1="14" y1="15" x2="34" y2="15" stroke="#ddd" strokeWidth="1"/>
      <line x1="12" y1="31" x2="33" y2="31" stroke="#ddd" strokeWidth="1"/>
    </svg>
  ),
  bq: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <rect x="5" y="9" width="4" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="12" y="6" width="4" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="20.5" y="4" width="4" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="29" y="6" width="4" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="36" y="9" width="4" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <polygon points="7,13 14,10 22.5,8 31,10 38,13 35,26 30,15 25.5,26 22.5,12 19.5,26 15,15 10,26" fill="#222" stroke="#000" strokeWidth="1" strokeLinejoin="round"/>
      <rect x="10" y="26" width="25" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="10" y="30" width="25" height="3" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="9" y="33" width="27" height="3" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="8" y="36" width="29" height="3" fill="#222" stroke="#000" strokeWidth="1"/>
      <line x1="11" y1="28" x2="34" y2="28" stroke="#ddd" strokeWidth="1"/>
      <line x1="11" y1="32" x2="34" y2="32" stroke="#ddd" strokeWidth="1"/>
    </svg>
  ),
  bk: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <rect x="21" y="4" width="3" height="7" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="18" y="7" width="9" height="3" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="18" y="12" width="9" height="5" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="16" y="17" width="13" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="7" y="21" width="13" height="6" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="25" y="21" width="13" height="6" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="12" y="27" width="21" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="10" y="31" width="25" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <rect x="9" y="35" width="27" height="4" fill="#222" stroke="#000" strokeWidth="1"/>
      <line x1="12" y1="29" x2="33" y2="29" stroke="#ddd" strokeWidth="1"/>
      <line x1="10" y1="33" x2="35" y2="33" stroke="#ddd" strokeWidth="1"/>
    </svg>
  ),
};
