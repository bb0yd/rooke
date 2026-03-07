export interface EndgamePosition {
  id: string;
  fen: string;
  type: 'queen-vs-king' | 'rook-vs-king' | 'two-rooks-vs-king' | 'pawn-promotion';
  difficulty: number;
  title: string;
  goal: string;
  playerColor: 'w' | 'b';
}

export const ENDGAMES: EndgamePosition[] = [
  // Queen vs King (easiest mates)
  {
    id: 'eg01', fen: '4k3/8/8/8/8/8/8/4K2Q w - - 0 1',
    type: 'queen-vs-king', difficulty: 1,
    title: 'Queen vs King #1', goal: 'Checkmate the opponent with your queen.',
    playerColor: 'w',
  },
  {
    id: 'eg02', fen: '8/8/8/3k4/8/8/8/Q3K3 w - - 0 1',
    type: 'queen-vs-king', difficulty: 1,
    title: 'Queen vs King #2', goal: 'Push the king to the edge and deliver checkmate.',
    playerColor: 'w',
  },
  {
    id: 'eg03', fen: '8/8/8/8/4k3/8/8/Q3K3 w - - 0 1',
    type: 'queen-vs-king', difficulty: 1,
    title: 'Queen vs King #3', goal: 'Use your queen and king together to force checkmate.',
    playerColor: 'w',
  },
  {
    id: 'eg04', fen: '8/2k5/8/8/8/8/8/4K2Q w - - 0 1',
    type: 'queen-vs-king', difficulty: 2,
    title: 'Queen vs King #4', goal: 'Corner the king and checkmate — avoid stalemate!',
    playerColor: 'w',
  },
  {
    id: 'eg05', fen: '8/8/8/8/8/5k2/8/Q3K3 w - - 0 1',
    type: 'queen-vs-king', difficulty: 2,
    title: 'Queen vs King #5', goal: 'Careful — the king is close. Avoid stalemate!',
    playerColor: 'w',
  },

  // Two Rooks vs King
  {
    id: 'eg06', fen: '4k3/8/8/8/8/8/8/R3K2R w - - 0 1',
    type: 'two-rooks-vs-king', difficulty: 1,
    title: 'Two Rooks vs King #1', goal: 'Use both rooks to create a "ladder" checkmate.',
    playerColor: 'w',
  },
  {
    id: 'eg07', fen: '8/3k4/8/8/8/8/8/R3K2R w - - 0 1',
    type: 'two-rooks-vs-king', difficulty: 1,
    title: 'Two Rooks vs King #2', goal: 'Push the king to the edge with alternating rook checks.',
    playerColor: 'w',
  },
  {
    id: 'eg08', fen: '8/8/4k3/8/8/8/8/R3K2R w - - 0 1',
    type: 'two-rooks-vs-king', difficulty: 2,
    title: 'Two Rooks vs King #3', goal: 'The "lawnmower" pattern — rooks work together.',
    playerColor: 'w',
  },
  {
    id: 'eg09', fen: '8/8/8/8/3k4/8/8/R3K2R w - - 0 1',
    type: 'two-rooks-vs-king', difficulty: 2,
    title: 'Two Rooks vs King #4', goal: 'Deliver checkmate with the two-rook technique.',
    playerColor: 'w',
  },

  // Rook vs King (harder)
  {
    id: 'eg10', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
    type: 'rook-vs-king', difficulty: 2,
    title: 'Rook vs King #1', goal: 'Use your king and rook to force checkmate.',
    playerColor: 'w',
  },
  {
    id: 'eg11', fen: '8/3k4/8/8/8/8/8/R3K3 w - - 0 1',
    type: 'rook-vs-king', difficulty: 3,
    title: 'Rook vs King #2', goal: 'Bring your king up to help the rook.',
    playerColor: 'w',
  },
  {
    id: 'eg12', fen: '8/8/4k3/8/8/8/8/R3K3 w - - 0 1',
    type: 'rook-vs-king', difficulty: 3,
    title: 'Rook vs King #3', goal: 'Opposition and rook checks to force the king back.',
    playerColor: 'w',
  },
  {
    id: 'eg13', fen: '8/8/8/4k3/8/8/8/4K2R w - - 0 1',
    type: 'rook-vs-king', difficulty: 3,
    title: 'Rook vs King #4', goal: 'Use the "box" technique to restrict the king.',
    playerColor: 'w',
  },
  {
    id: 'eg14', fen: '8/8/8/8/4k3/8/8/4K2R w - - 0 1',
    type: 'rook-vs-king', difficulty: 3,
    title: 'Rook vs King #5', goal: 'Tricky position — march your king up first.',
    playerColor: 'w',
  },

  // Pawn Promotion
  {
    id: 'eg15', fen: '8/4P3/8/8/8/8/8/4K2k w - - 0 1',
    type: 'pawn-promotion', difficulty: 1,
    title: 'Simple Promotion #1', goal: 'Promote your pawn to a queen!',
    playerColor: 'w',
  },
  {
    id: 'eg16', fen: '8/P7/8/8/8/8/8/K6k w - - 0 1',
    type: 'pawn-promotion', difficulty: 1,
    title: 'Simple Promotion #2', goal: 'Push your pawn to promote.',
    playerColor: 'w',
  },
  {
    id: 'eg17', fen: '8/8/8/8/8/4k3/4P3/4K3 w - - 0 1',
    type: 'pawn-promotion', difficulty: 2,
    title: 'King + Pawn #1', goal: 'Use your king to escort the pawn to promotion.',
    playerColor: 'w',
  },
  {
    id: 'eg18', fen: '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1',
    type: 'pawn-promotion', difficulty: 2,
    title: 'King + Pawn #2', goal: 'Gain the opposition and push your pawn.',
    playerColor: 'w',
  },
  {
    id: 'eg19', fen: '8/8/4k3/8/8/8/4P3/4K3 w - - 0 1',
    type: 'pawn-promotion', difficulty: 2,
    title: 'King + Pawn #3', goal: 'Can you promote? Find the right path.',
    playerColor: 'w',
  },
  {
    id: 'eg20', fen: '8/8/8/8/3pk3/8/3P4/3K4 w - - 0 1',
    type: 'pawn-promotion', difficulty: 3,
    title: 'Pawn Race #1', goal: 'Win the pawn race — promote first!',
    playerColor: 'w',
  },
  {
    id: 'eg21', fen: '8/1p6/8/8/8/8/P7/K6k w - - 0 1',
    type: 'pawn-promotion', difficulty: 3,
    title: 'Pawn Race #2', goal: 'Both sides have a pawn — can you promote first?',
    playerColor: 'w',
  },
  {
    id: 'eg22', fen: '8/8/3k4/8/4K3/8/4P3/8 w - - 0 1',
    type: 'pawn-promotion', difficulty: 2,
    title: 'King + Pawn #4', goal: 'Use opposition to promote your pawn.',
    playerColor: 'w',
  },
  {
    id: 'eg23', fen: '8/8/8/1k6/8/1K6/1P6/8 w - - 0 1',
    type: 'pawn-promotion', difficulty: 2,
    title: 'King + Pawn #5', goal: 'Opposition is key. Find the winning plan.',
    playerColor: 'w',
  },

  // Black to play versions
  {
    id: 'eg24', fen: 'q3k3/8/8/8/8/8/8/4K3 b - - 0 1',
    type: 'queen-vs-king', difficulty: 1,
    title: 'Queen vs King (Black)', goal: 'Checkmate with your queen.',
    playerColor: 'b',
  },
  {
    id: 'eg25', fen: 'r3k2r/8/8/8/8/8/8/4K3 b - - 0 1',
    type: 'two-rooks-vs-king', difficulty: 1,
    title: 'Two Rooks vs King (Black)', goal: 'Deliver a ladder mate as Black.',
    playerColor: 'b',
  },
  {
    id: 'eg26', fen: 'r3k3/8/8/8/8/8/8/4K3 b - - 0 1',
    type: 'rook-vs-king', difficulty: 2,
    title: 'Rook vs King (Black)', goal: 'Use your king and rook together.',
    playerColor: 'b',
  },
  {
    id: 'eg27', fen: '4k3/8/8/8/8/8/4p3/K7 b - - 0 1',
    type: 'pawn-promotion', difficulty: 1,
    title: 'Simple Promotion (Black)', goal: 'Promote your pawn!',
    playerColor: 'b',
  },
];
