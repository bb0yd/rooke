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

export function getOpeningById(id: string): Opening | undefined {
  return OPENINGS.find(o => o.id === id);
}
