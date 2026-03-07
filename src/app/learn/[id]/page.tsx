'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import OpeningTrainer, { PracticeMode } from '@/components/OpeningTrainer';
import { getOpeningById, Opening } from '@/data/openings';

export default function LearnOpeningPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const requestedMode = searchParams.get('mode');
  const initialMode: PracticeMode = requestedMode === 'random' || requestedMode === 'weakspots' || requestedMode === 'review'
    ? requestedMode
    : 'sequential';
  const [opening, setOpening] = useState<Opening | null | undefined>(undefined);

  useEffect(() => {
    // Try static data first
    const staticOpening = getOpeningById(id);
    if (staticOpening) {
      setOpening(staticOpening);
      return;
    }

    // Try fetching from DB (for custom openings with numeric IDs)
    fetch('/api/openings')
      .then(r => r.json())
      .then((data: any[]) => {
        const match = data.find((o: any) => String(o.id) === id);
        if (match) {
          setOpening({
            id: String(match.id),
            name: match.name,
            description: match.description || '',
            playerColor: match.player_color as 'w' | 'b',
            thumbnailFen: match.thumbnail_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            lines: (match.lines || []).map((l: any) => ({
              id: String(l.id),
              name: l.name,
              moves: Array.isArray(l.moves) ? l.moves : JSON.parse(l.moves),
            })),
          });
        } else {
          setOpening(null);
        }
      })
      .catch(() => setOpening(null));
  }, [id]);

  if (opening === undefined) {
    return (
      <AppShell wide>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          Loading...
        </div>
      </AppShell>
    );
  }

  if (!opening) {
    return (
      <AppShell wide>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h1>Opening not found</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            The opening &ldquo;{id}&rdquo; doesn&apos;t exist.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell wide>
      <OpeningTrainer opening={opening} initialMode={initialMode} />
    </AppShell>
  );
}
