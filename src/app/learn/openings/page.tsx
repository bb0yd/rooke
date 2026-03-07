'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import AppShell from '@/components/AppShell';
import MiniBoard from '@/components/MiniBoard';
import ChessBoard from '@/components/ChessBoard';
import { OPENINGS, Opening } from '@/data/openings';
import { getOpeningStats, getLineStats, isDueForReview, syncFromServer } from '@/lib/trainerStats';
import styles from './openings.module.css';

interface ApiOpening {
  id: string;
  name: string;
  description: string;
  player_color: string;
  thumbnail_fen: string;
  is_custom?: boolean;
  lines: { id: string; name: string; moves: string[] }[];
}

function mapApiOpening(o: ApiOpening): Opening & { isCustom?: boolean } {
  return {
    id: o.id,
    name: o.name,
    description: o.description,
    playerColor: o.player_color as Opening['playerColor'],
    thumbnailFen: o.thumbnail_fen,
    lines: (o.lines ?? []).map(l => ({
      ...l,
      moves: Array.isArray(l.moves) ? l.moves : JSON.parse(String(l.moves)),
    })),
    isCustom: o.is_custom,
  };
}

export default function OpeningsPage() {
  const [openings, setOpenings] = useState<(Opening & { isCustom?: boolean })[]>(OPENINGS);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [dueCount, setDueCount] = useState(0);
  const [firstDueOpeningId, setFirstDueOpeningId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState<'w' | 'b'>('w');
  const [submitting, setSubmitting] = useState(false);

  // Line builder state
  const [showLineModal, setShowLineModal] = useState(false);
  const [lineOpeningId, setLineOpeningId] = useState<string | null>(null);
  const [lineName, setLineName] = useState('');
  const [lineGame, setLineGame] = useState<Chess>(() => new Chess());
  const [lineMoves, setLineMoves] = useState<string[]>([]);
  const [lineSubmitting, setLineSubmitting] = useState(false);

  const fetchOpenings = useCallback(async () => {
    try {
      const res = await fetch('/api/openings');
      if (res.ok) {
        const data: ApiOpening[] = await res.json();
        const mapped = data.map(mapApiOpening);
        setOpenings(mapped);
        return mapped;
      }
    } catch {}
    setOpenings(OPENINGS);
    return OPENINGS;
  }, []);

  const computeProgress = (list: (Opening & { isCustom?: boolean })[]) => {
    const p: Record<string, number> = {};
    let due = 0;
    let firstDueId: string | null = null;
    for (const opening of list) {
      const lineIds = opening.lines.map(l => l.id);
      const stats = getOpeningStats(opening.id, lineIds);
      p[opening.id] = stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0;
      for (const line of opening.lines) {
        const ls = getLineStats(opening.id, line.id);
        if (isDueForReview(ls)) {
          due++;
          if (!firstDueId) firstDueId = opening.id;
        }
      }
    }
    setProgress(p);
    setDueCount(due);
    setFirstDueOpeningId(firstDueId);
  };

  useEffect(() => {
    syncFromServer().finally(async () => {
      const list = await fetchOpenings();
      computeProgress(list);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, description: formDesc, playerColor: formColor }),
      });
      if (res.ok) {
        setShowModal(false);
        setFormName('');
        setFormDesc('');
        setFormColor('w');
        const list = await fetchOpenings();
        computeProgress(list);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOpening = async (openingId: string) => {
    if (!confirm('Delete this opening and all its lines?')) return;
    try {
      const res = await fetch(`/api/openings/${openingId}`, { method: 'DELETE' });
      if (res.ok) {
        const list = await fetchOpenings();
        computeProgress(list);
      }
    } catch {}
  };

  const openLineBuilder = (openingId: string) => {
    setLineOpeningId(openingId);
    setLineName('');
    setLineGame(new Chess());
    setLineMoves([]);
    setShowLineModal(true);
  };

  const handleLineBoardMove = useCallback((from: any, to: any, promotion?: any) => {
    setLineGame(prev => {
      const g = new Chess(prev.fen());
      const move = g.move({ from, to, promotion });
      if (move) {
        setLineMoves(m => [...m, move.san]);
        return g;
      }
      return prev;
    });
  }, []);

  const undoLineMove = () => {
    setLineGame(prev => {
      const g = new Chess(prev.fen());
      g.undo();
      setLineMoves(m => m.slice(0, -1));
      return g;
    });
  };

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineOpeningId || lineMoves.length === 0) return;
    setLineSubmitting(true);
    try {
      const res = await fetch(`/api/openings/${lineOpeningId}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: lineName || `Line ${Date.now()}`, moves: lineMoves }),
      });
      if (res.ok) {
        setShowLineModal(false);
        const list = await fetchOpenings();
        computeProgress(list);
      }
    } finally {
      setLineSubmitting(false);
    }
  };

  const customOpenings = openings.filter(o => o.isCustom);
  const builtinOpenings = openings.filter(o => !o.isCustom);

  const renderCard = (opening: Opening & { isCustom?: boolean }) => {
    const pct = progress[opening.id] ?? 0;
    const stats = (() => {
      const lineIds = opening.lines.map(l => l.id);
      return getOpeningStats(opening.id, lineIds);
    })();
    return (
      <div key={opening.id} className={styles.card}>
        <MiniBoard fen={opening.thumbnailFen} />
        <div className={styles.cardBody}>
          <div className={styles.cardName}>{opening.name}</div>
          <div className={styles.cardDescription}>{opening.description}</div>
          <div className={styles.cardMeta}>
            {opening.lines.length} lines &middot; Play as {opening.playerColor === 'w' ? 'White' : 'Black'}
            {stats.mastered > 0 && <> &middot; {stats.mastered} mastered</>}
            {stats.struggling > 0 && <> &middot; {stats.struggling} struggling</>}
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.cardActions}>
            <Link href={`/learn/${opening.id}`} className={styles.startLink}>
              {pct > 0 ? 'Continue learning' : 'Start learning'} &rarr;
            </Link>
            {opening.isCustom && (
              <>
                <button className={styles.addLineBtn} onClick={() => openLineBuilder(String(opening.id))}>
                  + Add Line
                </button>
                <button className={styles.deleteBtn} onClick={() => handleDeleteOpening(String(opening.id))}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppShell wide>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Link href="/learn" className={styles.backLink}>&larr; Back to Coach</Link>
            <h1 className={styles.title}>Opening Repertoire</h1>
            <p className={styles.subtitle}>Master key opening lines with interactive training</p>
          </div>
          <button className={styles.createBtn} onClick={() => setShowModal(true)}>
            + Create Opening
          </button>
        </div>

        {dueCount > 0 && firstDueOpeningId && (
          <div className={styles.reviewBanner}>
            <span className={styles.reviewBannerText}>
              <span className={styles.reviewBannerCount}>{dueCount}</span>{' '}
              {dueCount === 1 ? 'line is' : 'lines are'} due for review
            </span>
            <Link href={`/learn/${firstDueOpeningId}?mode=review`} className={styles.reviewBannerBtn}>
              Review Now
            </Link>
          </div>
        )}

        {customOpenings.length > 0 && (
          <div className={styles.customSection}>
            <h2 className={styles.sectionTitle}>Your Custom Repertoire</h2>
            <div className={styles.cardList}>{customOpenings.map(renderCard)}</div>
          </div>
        )}

        <div className={styles.cardList}>{builtinOpenings.map(renderCard)}</div>
      </div>

      {/* Create Opening Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Create Custom Opening</h2>
            <form onSubmit={handleCreate}>
              <label>
                Name
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required />
              </label>
              <label>
                Description
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} />
              </label>
              <label>
                Player Color
                <select value={formColor} onChange={e => setFormColor(e.target.value as 'w' | 'b')}>
                  <option value="w">White</option>
                  <option value="b">Black</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Line Modal */}
      {showLineModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLineModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2>Add Line</h2>
            <form onSubmit={handleAddLine}>
              <label>
                Line Name
                <input type="text" value={lineName} onChange={e => setLineName(e.target.value)} placeholder="e.g. Main Line" required />
              </label>
              <div style={{ margin: '12px 0' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Play the moves on the board to record the line:
                </p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ '--sq': '40px' } as React.CSSProperties}>
                    <ChessBoard externalGame={lineGame} onMoveRequest={handleLineBoardMove} hideControls />
                  </div>
                </div>
              </div>
              <div className={styles.lineBuilderMoves}>
                {lineMoves.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)' }}>Make moves on the board...</span>
                ) : (
                  lineMoves.map((m, i) => (
                    <span key={i}>
                      {i % 2 === 0 && <span style={{ color: 'var(--text-muted)' }}>{Math.floor(i / 2) + 1}.</span>}
                      {m}{' '}
                    </span>
                  ))
                )}
                {lineMoves.length > 0 && (
                  <button type="button" className={styles.lineBuilderUndo} onClick={undoLineMove}>Undo</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowLineModal(false)}>Cancel</button>
                <button type="submit" disabled={lineSubmitting || lineMoves.length === 0}>
                  {lineSubmitting ? 'Adding...' : 'Add Line'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
