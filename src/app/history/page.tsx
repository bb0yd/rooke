'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import ChessBoard from '@/components/ChessBoard';

interface Game {
  id: number;
  pgn: string;
  result: string;
  moves_count: number;
  created_at: string;
}

function formatResult(result: string): { label: string; className: string } {
  switch (result) {
    case 'white_wins': return { label: 'White Wins', className: 'win' };
    case 'black_wins': return { label: 'Black Wins', className: 'loss' };
    case 'draw': return { label: 'Draw', className: 'draw' };
    default: return { label: 'In Progress', className: 'in-progress' };
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    fetch('/api/games')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGames(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (selectedGame) {
    return (
      <AppShell>
        <div>
          <button
            onClick={() => setSelectedGame(null)}
            style={{
              background: '#2a2a4a',
              color: '#eee',
              border: '1px solid #444',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            &larr; Back to History
          </button>
          <ChessBoard readOnly initialPgn={selectedGame.pgn} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 style={{ marginBottom: '16px' }}>Game History</h1>
      {loading ? (
        <p style={{ color: '#aaa' }}>Loading...</p>
      ) : games.length === 0 ? (
        <p style={{ color: '#aaa' }}>No games yet. Play a game to see it here!</p>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Result</th>
              <th>Moves</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {games.map(game => {
              const { label, className } = formatResult(game.result);
              return (
                <tr key={game.id}>
                  <td>{formatDate(game.created_at)}</td>
                  <td>
                    <span className={`result-badge ${className}`}>{label}</span>
                  </td>
                  <td>{game.moves_count}</td>
                  <td>
                    <button
                      onClick={() => setSelectedGame(game)}
                      style={{
                        background: 'none',
                        border: '1px solid #444',
                        color: '#4a9eff',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
