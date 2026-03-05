import { Color } from 'chess.js';

export interface OpeningLine {
  id: string;
  name: string;
  moves: string[];   // SAN notation matching chess.js output
}

export interface Opening {
  id: string;
  name: string;
  description: string;
  playerColor: Color;
  thumbnailFen: string;
  lines: OpeningLine[];
}

export const OPENINGS: Opening[] = [
  {
    id: 'italian-game',
    name: 'Italian Game',
    description: 'A classical opening arising after 1.e4 e5 2.Nf3 Nc6 3.Bc4, targeting f7 and aiming for rapid development.',
    playerColor: 'w',
    thumbnailFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    lines: [
      {
        id: 'rook-gambit',
        name: 'Rook Gambit',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Nc3','Nxe4','O-O','Nxc3','bxc3','Bxc3','Ba3','Bxa1','Re1+','Ne7','Bxe7','Qxe7','Rxe7+','Kxe7','Qxa1'],
      },
      {
        id: 'queens-assault',
        name: "Queen's Assault",
        moves: ['e4','e5','Nf3','Nc6','Bc4','Nf6','d4','Nxe4','dxe5','Bc5','Qd5','Bxf2+','Kf1','O-O','Qxe4'],
      },
      {
        id: 'pawn-phalanx',
        name: 'Pawn Phalanx',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb6','e5','Ng4','h3','Nh6','d5','Na5','Bg5','f6','exf6'],
      },
      {
        id: 'pinning-pressure',
        name: 'Pinning Pressure',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Nc3','Nxe4','O-O','Nxc3','bxc3','Bxc3','Ba3','d6','Rc1','Ba5','Qa4','O-O','d5','Ne5','Nxe5','dxe5','Qxa5'],
      },
      {
        id: 'queen-skewer',
        name: 'Queen Skewer',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Nc3','Nxe4','O-O','Nxc3','bxc3','Bxc3','Ba3','d6','Rc1','Bb4','Bxb4','Nxb4','Qe1+','Qe7','Qxb4'],
      },
      {
        id: 'checkmate-chase',
        name: 'Checkmate Chase',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Nc3','Nxe4','O-O','Bxc3','d5','Ne5','bxc3','Nxc4','Qd4','Ncd6','Qxg7','Qf6','Qxf6','Nxf6','Re1+','Kf8','Bh6+','Kg8','Re5','Nde4','Nd2','d6','Nxe4','Nxe4','Re8#'],
      },
      {
        id: 'solid-setup',
        name: 'Solid Setup',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','h6','d4','exd4','cxd4','Bb4+','Nc3','d6','O-O'],
      },
      {
        id: 'blunder-bounty',
        name: 'Blunder Bounty',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Nf6','d4','exd4','O-O','Nxe4','Re1','d5','Bxd5','Qxd5','Nc3','Qd8','Rxe4+','Be7','Nxd4','O-O','Nxc6','bxc6','Rxe7'],
      },
      {
        id: 'sacrificial-storm',
        name: 'Sacrificial Storm',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Nc3','Nxe4','O-O','Bxc3','d5','Bf6','Re1','Ne7','Rxe4','d6','Bg5','Bxg5','Nxg5','h6','Bb5+','c6','Nxf7','Kxf7','Qf3+','Kg8','Rae1','cxb5','Rxe7'],
      },
      {
        id: 'rook-rampage',
        name: 'Rook Rampage',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Nc3','Nxe4','O-O','Bxc3','d5','Ne5','bxc3','Nxc4','Qd4','Ncd6','Qxg7','Qf6','Qxf6','Nxf6','Re1+','Kf8','Bh6+','Kg8','Re5','Nfe4','Rae1','f6','R5e7','Nf5','Re8+','Kf7','Rxh8','Nxh6','Rxe4'],
      },
      {
        id: 'suffocation-mate',
        name: 'Suffocation Mate',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Nc3','Nxe4','O-O','Bxc3','d5','Bf6','Re1','Ne7','Rxe4','d6','Bg5','Bxg5','Nxg5','h6','Bb5+','Kf8','Qh5','g6','Qf3','hxg5','Qf6','Rh4','Rxh4','gxh4','Re1','Bd7','Rxe7','Qxe7','Qh8#'],
      },
      {
        id: 'tempo-taker',
        name: 'Tempo Taker',
        moves: ['e4','e5','Nf3','d6','d4','Nc6','Bb5','Bd7','Nc3','exd4','Nxd4','Nxd4','Bxd7+','Qxd7','Qxd4','Nf6','Bg5','Be7','O-O-O'],
      },
      {
        id: 'queens-siege',
        name: "Queen's Siege",
        moves: ['e4','e5','Nf3','d6','d4','exd4','Nxd4','Nf6','Nc3','Be7','Bf4','O-O','Qd2','a6','O-O-O'],
      },
      {
        id: 'central-lock',
        name: 'Central Lock',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Nf6','d4','d6','d5'],
      },
      {
        id: 'royal-pin',
        name: 'Royal Pin',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Nf6','d4','exd4','O-O','Nxe4','Re1','d5','Bxd5','Qxd5','Nc3','Qa5','Nxe4','Be6','Neg5','O-O-O','Nxe6','fxe6','Rxe6','Bd6','Bg5','Rde8','Qe2'],
      },
      {
        id: 'pawn-crunch',
        name: 'Pawn Crunch',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Nf6','d4','exd4','O-O','Nxe4','Re1','d5','Bxd5','Qxd5','Nc3','Qd8','Rxe4+','Be7','Nxd4','O-O','Nxc6','bxc6','Qxd8','Bxd8','Rc4'],
      },
      {
        id: 'pinpoint-attack',
        name: 'Pinpoint Attack',
        moves: ['e4','e5','Nf3','d6','d4','Nc6','Bb5','exd4','Qxd4','Bd7','Bxc6','Bxc6','Nc3','Nf6','Bg5','Be7','O-O-O'],
      },
      {
        id: 'rook-bazooka',
        name: 'Rook Bazooka',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Nc3','Nxe4','O-O','Bxc3','d5','Bf6','Re1','Ne7','Rxe4','d6','Bg5','Bxg5','Nxg5','h6','Bb5+','Bd7','Qe2','hxg5','Re1','O-O','Rxe7','Bxb5','Qxb5'],
      },
      {
        id: 'central-clamp',
        name: 'Central Clamp',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Nf6','d4','exd4','O-O','Nxe4','Re1','d5','Bxd5','Qxd5','Nc3','Qh5','Nxe4','Be6','Bg5','Bd6','Nxd6+','cxd6','Bf4','Qd5','c3'],
      },
      {
        id: 'king-hunt',
        name: 'King Hunt',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Nc3','Nxe4','O-O','Bxc3','d5','Bf6','Re1','Ne7','Rxe4','d6','Bg5','Bxg5','Nxg5','O-O','Nxh7','Kxh7','Qh5+','Kg8','Rh4'],
      },
      {
        id: 'tempo-fork',
        name: 'Tempo Fork',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Nc3','Nxe4','O-O','Bxc3','d5','Ne5','bxc3','Nxc4','Qd4','O-O','Qxc4','Nd6','Qb3'],
      },
      {
        id: 'overload-assault',
        name: 'Overload Assault',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','h6','d4','exd4','cxd4','Bb4+','Nc3','Nf6','e5','Ne4','O-O','Nxc3','bxc3','Bxc3','Qb3','Bxa1','Bxf7+','Kf8','Ba3+','d6','exd6','cxd6','Bg6','Qf6','Bxd6+','Ne7','Re1'],
      },
    ],
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann Defense',
    description: 'A solid reply to 1.e4 with 1...c6, preparing to challenge the center with d5 while keeping a sound pawn structure.',
    playerColor: 'b',
    thumbnailFen: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    lines: [
      {
        id: 'resilient-core',
        name: 'Resilient Core',
        moves: ['e4','c6','d4','d5','e5','c5','dxc5','Nc6','a3','e6','b4','a5','b5','Nxe5','Bb2','f6','Bxe5','fxe5','Qh5+','g6','Qxe5','Nf6'],
      },
      {
        id: 'king-hunt-ck',
        name: 'King Hunt',
        moves: ['e4','c6','d4','d5','e5','c5','dxc5','Nc6','f4','Nh6','c3','e6','b4','a5','Bb5','Bd7','Bxc6','Bxc6'],
      },
      {
        id: 'd4-heist',
        name: 'd4 Heist',
        moves: ['e4','c6','d4','d5','e5','c5','c3','Nc6','Nf3','cxd4','cxd4','Bg4','h3','Bxf3','Qxf3','Nxd4','Qd3','Nc6'],
      },
      {
        id: 'structure-break',
        name: 'Structure Break',
        moves: ['e4','c6','d4','d5','e5','c5','c3','Nc6','Nf3','cxd4','cxd4','Bg4','h3','Bxf3','gxf3','Qb6'],
      },
      {
        id: 'pawn-wedge',
        name: 'Pawn Wedge',
        moves: ['e4','c6','d4','d5','e5','c5','c3','Nc6','f4','cxd4','cxd4','h5','Nf3','Bg4','Be2','e6','O-O','Qb6'],
      },
      {
        id: 'exchange-sac',
        name: 'Exchange Sac',
        moves: ['e4','c6','d4','d5','e5','c5','dxc5','Nc6','a3','e6','b4','a5','Bb2','axb4','axb4','Rxa1','Bxa1','Nxb4'],
      },
      {
        id: 'queens-fork',
        name: "Queen's Fork",
        moves: ['e4','c6','d4','d5','exd5','cxd5','c4','Nf6','Nc3','g6','Nf3','Bg7','cxd5','Nxd5','Bc4','Nxc3','bxc3','Qc7'],
      },
      {
        id: 'pawn-snatcher',
        name: 'Pawn Snatcher',
        moves: ['e4','c6','d4','d5','e5','c5','c3','Nc6','Nf3','cxd4','cxd4','Bg4','Be2','e6','h3','Bxf3','Bxf3','Qb6','Be3','Qxb2','Nd2','Bb4'],
      },
      {
        id: 'pin-counter',
        name: 'Pin Counter',
        moves: ['e4','c6','d4','d5','e5','c5','c3','Nc6','Bb5','Qa5','Bxc6+','bxc6','Bd2','Qb6'],
      },
      {
        id: 'kingside-focus',
        name: 'Kingside Focus',
        moves: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nf6','Ng3','h5','h4','Bg4','Be2','e6','Nf3','Bd6'],
      },
      {
        id: 'd4-pressure',
        name: 'd4 Pressure',
        moves: ['e4','c6','d4','d5','e5','c5','c3','Nc6','Nf3','cxd4','cxd4','Bg4','Be2','e6','O-O','Nge7','Nc3','Nf5','Be3','Be7','a3','O-O'],
      },
      {
        id: 'h-pawn-rush',
        name: 'h-Pawn Rush',
        moves: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nf6','Ng3','h5','Nf3','h4','Ne2','Bg4'],
      },
      {
        id: 'open-gamble',
        name: 'Open Gamble',
        moves: ['e4','c6','d4','d5','e5','c5','c3','Nc6','Be3','Nh6','Bxh6','gxh6','Nf3','Qb6'],
      },
      {
        id: 'center-strike',
        name: 'Center Strike',
        moves: ['e4','c6','d4','d5','exd5','cxd5','Bd3','Nc6','c3','Nf6','h3','e5','dxe5','Nxe5'],
      },
      {
        id: 'solid-panov',
        name: 'Solid Panov',
        moves: ['e4','c6','d4','d5','exd5','cxd5','c4','Nf6','cxd5','Nxd5','Nc3','Nc6','Nf3','Bf5','Bc4','e6'],
      },
      {
        id: 'mainline-caro',
        name: 'Mainline Caro',
        moves: ['e4','c6','d4','d5','exd5','cxd5','Bd3','Nc6','c3','Nf6','Bf4','Bg4','Qb3','Qd7','Nd2','e6','Ngf3','Bd6','Bxd6','Qxd6','O-O','O-O'],
      },
      {
        id: 'file-opener',
        name: 'File Opener',
        moves: ['e4','c6','d4','d5','e5','c5','dxc5','Nc6','Bb5','e6','b4','a5','c3','axb4','cxb4','Bd7','Bxc6','Bxc6'],
      },
      {
        id: 'knight-anchor',
        name: 'Knight Anchor',
        moves: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nf6','Nxf6+','exf6','c3','Bd6','Bd3','O-O','Qc2','Re8+','Ne2','h5','Be3','Nd7','O-O-O','Nf8'],
      },
      {
        id: 'pin-battery',
        name: 'Pin & Battery',
        moves: ['e4','c6','d4','d5','exd5','cxd5','Nf3','Nf6','Bd3','Bg4','O-O','Nc6','c3','e6','h3','Bh5','Bg5','Bd6','Nbd2','h6','Bh4','Qc7'],
      },
      {
        id: 'chaos-gambit',
        name: 'Chaos Gambit',
        moves: ['e4','c6','d4','d5','e5','c5','dxc5','Nc6','f4','Nh6','Nf3','Bg4','Be3','Nf5','Bf2','g5','fxg5','e6'],
      },
      {
        id: 'active-check',
        name: 'Active Check',
        moves: ['e4','c6','d4','d5','e5','c5','dxc5','Nc6','Nf3','Bg4','Bb5','Qa5+','Nc3','e6'],
      },
      {
        id: 'future-file',
        name: 'Future File',
        moves: ['e4','c6','d4','d5','exd5','cxd5','Nf3','Nf6','Bd3','Bg4','O-O','Nc6','c3','e6','Bg5','Be7','Nbd2','O-O','Qc2','h6','Bh4','Rc8'],
      },
      {
        id: 'd4-siege',
        name: 'd4 Siege',
        moves: ['e4','c6','d4','d5','e5','c5','c3','Nc6','Nf3','cxd4','cxd4','Bg4','Be2','e6','O-O','Nge7','Nc3','Nf5','Be3','Be7','h3','Bxf3','Bxf3','O-O','Rc1','f6','exf6','Bxf6'],
      },
      {
        id: 'queen-rampage',
        name: 'Queen Rampage',
        moves: ['e4','c6','d4','d5','e5','c5','dxc5','Nc6','Bb5','e6','Bxc6+','bxc6','b4','a5','c3','axb4','cxb4','Qh4','Bd2','Qe4+','Qe2','Qxg2','Qf3','Qg6'],
      },
      {
        id: 'bishop-target',
        name: 'Bishop Target',
        moves: ['e4','c6','d4','d5','e5','c5','dxc5','Nc6','f4','Nh6','Nf3','Bg4','Be2','e6','Be3','Nf5'],
      },
      {
        id: 'knight-journey',
        name: 'Knight Journey',
        moves: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nf6','Nxf6+','exf6','Nf3','Bd6','Bd3','O-O','O-O','Re8','h3','Nd7','c3','Nf8'],
      },
      {
        id: 'kingside-march',
        name: 'Kingside March',
        moves: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nf6','Nxf6+','exf6','c3','Bd6','Bd3','O-O','Qc2','Re8+','Ne2','h5','O-O','h4','h3','Nd7','Be3','Nf8'],
      },
      {
        id: 'knight-hop',
        name: 'Knight Hop',
        moves: ['e4','c6','d4','d5','e5','c5','dxc5','Nc6','Bb5','e6','Be3','Ne7','c3','Nf5','Bd4','Bd7'],
      },
    ],
  },
];

// ---- Additional Openings ----

export const ADDITIONAL_OPENINGS: Opening[] = [
  {
    id: 'london-system',
    name: 'London System',
    description: 'A solid, easy-to-learn system for White. Develop Bf4, e3, Nf3, Bd3, and castle early. Works against almost anything Black plays.',
    playerColor: 'w',
    thumbnailFen: 'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R b KQkq - 3 3',
    lines: [
      {
        id: 'london-classical',
        name: 'Classical Setup',
        moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'Bd6', 'Bg3', 'O-O', 'Bd3', 'c5', 'c3', 'Nc6', 'Nbd2'],
      },
      {
        id: 'london-vs-kingsindian',
        name: "vs King's Indian",
        moves: ['d4', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'Nf3', 'O-O', 'Be2', 'd6', 'h3', 'Nbd7', 'O-O'],
      },
      {
        id: 'london-vs-c5',
        name: 'vs Early c5',
        moves: ['d4', 'd5', 'Bf4', 'c5', 'e3', 'Nc6', 'c3', 'Nf6', 'Nf3', 'e6', 'Nbd2', 'Bd6', 'Bg3', 'O-O', 'Bd3'],
      },
      {
        id: 'london-queenside',
        name: 'Queenside Attack',
        moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bg3', 'O-O', 'Bd3', 'Qe7', 'Ne5'],
      },
      {
        id: 'london-aggressive',
        name: 'Aggressive h4',
        moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'Bd6', 'Bg3', 'O-O', 'Bd3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Re8', 'Qe2', 'e5', 'dxe5', 'Nxe5', 'Nxe5', 'Bxe5', 'Bxe5', 'Rxe5', 'h4'],
      },
    ],
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    description: "White offers a pawn with c4 to gain central control after 1.d4 d5. One of the most classical openings in chess.",
    playerColor: 'w',
    thumbnailFen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
    lines: [
      {
        id: 'qg-accepted',
        name: 'QGA Classical',
        moves: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'a6', 'Nc3'],
      },
      {
        id: 'qg-declined-orthodox',
        name: 'QGD Orthodox',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6', 'Bd3'],
      },
      {
        id: 'qg-exchange',
        name: 'Exchange Variation',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3', 'Nbd7', 'Nf3', 'Re8', 'Qc2'],
      },
      {
        id: 'qg-slav-mainline',
        name: 'vs Slav Defense',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6', 'Bxc4', 'Bb4', 'O-O'],
      },
      {
        id: 'qg-albin-counter',
        name: 'vs Albin Counter',
        moves: ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'Nf3', 'Nc6', 'Nbd2', 'Nge7', 'g3', 'Ng6', 'Bg2'],
      },
    ],
  },
  {
    id: 'sicilian-defense',
    name: 'Sicilian Defense',
    description: "Black's most popular reply to 1.e4. The move 1...c5 fights for the center asymmetrically, leading to sharp, complex positions.",
    playerColor: 'b',
    thumbnailFen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    lines: [
      {
        id: 'sicilian-najdorf',
        name: 'Najdorf',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5', 'Nb3', 'Be7', 'O-O', 'O-O', 'Be3', 'Be6'],
      },
      {
        id: 'sicilian-dragon',
        name: 'Dragon',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7'],
      },
      {
        id: 'sicilian-classical',
        name: 'Classical',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'Nc6', 'Be2', 'e5', 'Nb3', 'Be7', 'O-O', 'O-O', 'Be3', 'Be6'],
      },
      {
        id: 'sicilian-vs-alapin',
        name: 'vs Alapin (2.c3)',
        moves: ['e4', 'c5', 'c3', 'd5', 'exd5', 'Qxd5', 'd4', 'Nf6', 'Nf3', 'e6', 'Be2', 'Be7', 'O-O', 'O-O', 'c4', 'Qd8'],
      },
      {
        id: 'sicilian-vs-smith-morra',
        name: 'vs Smith-Morra',
        moves: ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'Nc6', 'Nf3', 'd6', 'Bc4', 'e6', 'O-O', 'Nf6', 'Qe2', 'Be7'],
      },
      {
        id: 'sicilian-scheveningen',
        name: 'Scheveningen',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e6', 'Be2', 'Be7', 'O-O', 'O-O', 'Be3', 'Nc6', 'f4', 'a6'],
      },
    ],
  },
  {
    id: 'french-defense',
    name: 'French Defense',
    description: "A reliable defense for Black after 1.e4 e6. Black locks the center and counterattacks White's pawn chain.",
    playerColor: 'b',
    thumbnailFen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    lines: [
      {
        id: 'french-advance',
        name: 'vs Advance (3.e5)',
        moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'a3', 'Bd7', 'b4', 'cxd4', 'cxd4', 'Rc8'],
      },
      {
        id: 'french-winawer',
        name: 'Winawer Variation',
        moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3', 'Ne7', 'Qg4', 'Qc7', 'Nf3', 'cxd4', 'cxd4', 'Nbc6'],
      },
      {
        id: 'french-classical',
        name: 'Classical System',
        moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e5', 'Nfd7', 'Bxe7', 'Qxe7', 'f4', 'O-O', 'Nf3', 'c5', 'Bd3'],
      },
      {
        id: 'french-exchange',
        name: 'vs Exchange',
        moves: ['e4', 'e6', 'd4', 'd5', 'exd5', 'exd5', 'Nf3', 'Nf6', 'Bd3', 'Bd6', 'O-O', 'O-O', 'Bg5', 'Bg4', 'Nbd2', 'Nbd7'],
      },
      {
        id: 'french-tarrasch',
        name: 'vs Tarrasch (3.Nd2)',
        moves: ['e4', 'e6', 'd4', 'd5', 'Nd2', 'Nf6', 'e5', 'Nfd7', 'Bd3', 'c5', 'c3', 'Nc6', 'Ne2', 'cxd4', 'cxd4', 'f6', 'exf6', 'Nxf6'],
      },
    ],
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    description: "The Spanish Opening. After 1.e4 e5 2.Nf3 Nc6 3.Bb5, White puts pressure on Black's e5 pawn indirectly through the knight on c6.",
    playerColor: 'w',
    thumbnailFen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    lines: [
      {
        id: 'ruy-morphy',
        name: 'Morphy Defense',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3'],
      },
      {
        id: 'ruy-berlin',
        name: 'Berlin Defense',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6', 'Bxc6', 'dxc6', 'dxe5', 'Nf5', 'Qxd8+', 'Kxd8'],
      },
      {
        id: 'ruy-exchange',
        name: 'Exchange Variation',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'O-O', 'Bg4', 'h3', 'Bh5', 'd3', 'Nf6', 'Nbd2'],
      },
      {
        id: 'ruy-marshall',
        name: 'Marshall Attack',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'O-O', 'c3', 'd5', 'exd5', 'Nxd5', 'd4'],
      },
      {
        id: 'ruy-closed',
        name: 'Closed Defense',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Na5', 'Bc2', 'c5', 'd4'],
      },
    ],
  },
  {
    id: 'kings-indian',
    name: "King's Indian Defense",
    description: "A hypermodern defense where Black lets White build a big center, then strikes back with e5 or c5. Leads to dynamic, sharp play.",
    playerColor: 'b',
    thumbnailFen: 'rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
    lines: [
      {
        id: 'kid-classical',
        name: 'Classical System',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7'],
      },
      {
        id: 'kid-samisch',
        name: "vs S\u00E4misch",
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O', 'Be3', 'e5', 'd5', 'Nh5', 'Qd2', 'f5'],
      },
      {
        id: 'kid-fianchetto',
        name: 'vs Fianchetto',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'g3', 'O-O', 'Bg2', 'd6', 'Nf3', 'Nbd7', 'O-O', 'e5', 'e4', 'c6'],
      },
      {
        id: 'kid-four-pawns',
        name: 'vs Four Pawns Attack',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f4', 'O-O', 'Nf3', 'c5', 'd5', 'e6', 'Be2', 'exd5', 'cxd5'],
      },
    ],
  },
  {
    id: 'scotch-game',
    name: 'Scotch Game',
    description: 'An aggressive alternative to the Ruy Lopez. After 1.e4 e5 2.Nf3 Nc6 3.d4, White immediately opens the center.',
    playerColor: 'w',
    thumbnailFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3',
    lines: [
      {
        id: 'scotch-classical',
        name: 'Classical',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3', 'Qf6', 'c3', 'Nge7', 'Bc4', 'O-O', 'O-O'],
      },
      {
        id: 'scotch-steinitz',
        name: 'Steinitz Variation',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Qh4', 'Nc3', 'Bb4', 'Be2', 'Qxe4', 'Nb5', 'Bxc3+', 'bxc3', 'Kd8'],
      },
      {
        id: 'scotch-four-knights',
        name: 'Scotch Four Knights',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3', 'Bb4', 'Nxc6', 'bxc6', 'Bd3', 'd5', 'exd5', 'cxd5', 'O-O', 'O-O', 'Bg5'],
      },
    ],
  },
  {
    id: 'vienna-game',
    name: 'Vienna Game',
    description: 'A flexible opening for White after 1.e4 e5 2.Nc3. Prepares f4 or Bc4 while keeping options open.',
    playerColor: 'w',
    thumbnailFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
    lines: [
      {
        id: 'vienna-gambit',
        name: 'Vienna Gambit',
        moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Nf3', 'Bg4', 'Qe2', 'Nc5', 'd4', 'Ne6', 'Be3'],
      },
      {
        id: 'vienna-copycat',
        name: 'Copycat Variation',
        moves: ['e4', 'e5', 'Nc3', 'Nc6', 'Bc4', 'Bc5', 'Qg4', 'g6', 'Qf3', 'Nf6', 'Nge2', 'd6', 'd3', 'Bg4', 'Qg3'],
      },
    ],
  },
];

// Combine all openings
OPENINGS.push(...ADDITIONAL_OPENINGS);

export function getOpeningById(id: string): Opening | undefined {
  return OPENINGS.find(o => o.id === id);
}
