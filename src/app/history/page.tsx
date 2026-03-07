'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import AppShell from '@/components/AppShell';
import ChessBoard from '@/components/ChessBoard';
import EvalBar from '@/components/EvalBar';
import { getPieceSvg } from '@/components/ChessPieces';
import { getSettings } from '@/lib/settings';
import { getEvaluation } from '@/lib/engine';
import { calculateCpLoss, classifyMove, calculateAccuracy, MoveClassification, uciToSan, isBrilliantMove } from '@/lib/analysis';
import styles from './history.module.css';

interface Game {
  id: number;
  pgn: string;
  result: string;
  moves_count: number;
  created_at: string;
  opening_name?: string;
  opponent?: string;
  source?: string;
}

const PIECE_ORDER: Record<string, number> = { q: 0, r: 1, b: 2, n: 3, p: 4 };

function getCapturedPieces(game: Chess, color: 'w' | 'b'): PieceSymbol[] {
  const start: Record<string, number> = { p: 8, r: 2, n: 2, b: 2, q: 1 };
  const onBoard: Record<string, number> = { p: 0, r: 0, n: 0, b: 0, q: 0 };
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq && sq.color === color && sq.type !== 'k') {
        onBoard[sq.type]++;
      }
    }
  }
  const captured: PieceSymbol[] = [];
  for (const [type, max] of Object.entries(start)) {
    const diff = max - (onBoard[type] || 0);
    for (let i = 0; i < diff; i++) captured.push(type as PieceSymbol);
  }
  captured.sort((a, b) => (PIECE_ORDER[a] ?? 99) - (PIECE_ORDER[b] ?? 99));
  return captured;
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

const ANNOTATION_GLYPHS = ['!', '!!', '?', '??', '!?', '?!'];

function GameReview({ game: gameData, onBack }: { game: Game; onBack: () => void }) {
  const [boardTheme, setBoardTheme] = useState('classic');
  const [viewIndex, setViewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(1500);
  const [annotations, setAnnotations] = useState<Record<number, { glyph?: string; comment?: string }>>({});
  const [editingAnnotation, setEditingAnnotation] = useState<number | null>(null);
  const [annotationComment, setAnnotationComment] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [evaluations, setEvaluations] = useState<Record<number, { score: number; mate: number | null; bestMove: string; pv: string[] }>>({});
  const [moveClassifications, setMoveClassifications] = useState<Record<number, MoveClassification>>({});
  const [accuracy, setAccuracy] = useState<{ white: number; black: number } | null>(null);
  const [analysisDepth, setAnalysisDepth] = useState(12);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveListRef = useRef<HTMLDivElement>(null);
  const analyzingRef = useRef(false);

  // Parse the full game
  const fullGame = (() => {
    const g = new Chess();
    if (gameData.pgn) g.loadPgn(gameData.pgn);
    return g;
  })();

  const history = fullGame.history({ verbose: true });
  const totalMoves = history.length;

  useEffect(() => {
    const s = getSettings();
    if (s.boardTheme) setBoardTheme(s.boardTheme);
  }, []);

  // Build game at current view index
  const viewGame = (() => {
    const g = new Chess();
    for (let i = 0; i < viewIndex; i++) {
      g.move(history[i].san);
    }
    return g;
  })();

  const viewLastMove = (() => {
    if (viewIndex === 0) return null;
    const m = history[viewIndex - 1];
    return { from: m.from, to: m.to };
  })();

  // Auto-scroll move list to active move
  useEffect(() => {
    if (moveListRef.current) {
      const activeEl = moveListRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [viewIndex]);

  // Navigation
  const goFirst = useCallback(() => setViewIndex(0), []);
  const goPrev = useCallback(() => setViewIndex(v => Math.max(0, v - 1)), []);
  const goNext = useCallback(() => setViewIndex(v => Math.min(totalMoves, v + 1)), [totalMoves]);
  const goLast = useCallback(() => setViewIndex(totalMoves), [totalMoves]);

  // Auto play
  useEffect(() => {
    if (autoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setViewIndex(v => {
          if (v >= totalMoves) {
            setAutoPlaying(false);
            return v;
          }
          return v + 1;
        });
      }, autoPlaySpeed);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlaying, autoPlaySpeed, totalMoves]);

  function toggleAutoPlay() {
    if (autoPlaying) {
      setAutoPlaying(false);
    } else {
      if (viewIndex >= totalMoves) setViewIndex(0);
      setAutoPlaying(true);
    }
  }

  // Run Stockfish analysis on all positions
  async function runAnalysis() {
    if (analyzing || totalMoves === 0) return;
    setAnalyzing(true);
    analyzingRef.current = true;
    setAnalysisProgress(0);
    setEvaluations({});
    setMoveClassifications({});
    setAccuracy(null);

    const evals: Record<number, { score: number; mate: number | null; bestMove: string; pv: string[] }> = {};
    const classifications: Record<number, MoveClassification> = {};
    const whiteCpLosses: number[] = [];
    const blackCpLosses: number[] = [];

    // Build all positions (starting position + after each move)
    const positions: string[] = [];
    const tempGame = new Chess();
    positions.push(tempGame.fen());
    for (let i = 0; i < totalMoves; i++) {
      tempGame.move(history[i].san);
      positions.push(tempGame.fen());
    }

    // Evaluate each position
    for (let i = 0; i <= totalMoves; i++) {
      if (!analyzingRef.current) break;
      const result = await getEvaluation(positions[i], analysisDepth);
      evals[i] = { score: result.score, mate: result.mate, bestMove: result.bestMove, pv: result.pv || [] };
      setEvaluations(prev => ({ ...prev, [i]: evals[i] }));

      // Classify the move that led to this position (i > 0)
      if (i > 0) {
        const prevEval = evals[i - 1];
        const currEval = evals[i];
        const isWhiteMove = (i - 1) % 2 === 0;
        const cpLoss = calculateCpLoss(prevEval.score, currEval.score);
        let classification = classifyMove(cpLoss);
        // Check for brilliant move: top engine choice with no immediate recapture in PV
        if (classification === 'best' && evals[i - 1]?.pv?.length >= 2) {
          const isTop = evals[i - 1].bestMove === (history[i - 1].from + history[i - 1].to);
          if (isBrilliantMove(cpLoss, isTop, evals[i - 1].pv, 50)) {
            classification = 'brilliant';
          }
        }
        classifications[i] = classification;
        setMoveClassifications(prev => ({ ...prev, [i]: classification }));

        if (isWhiteMove) {
          whiteCpLosses.push(cpLoss);
        } else {
          blackCpLosses.push(cpLoss);
        }
      }

      setAnalysisProgress(Math.round(((i + 1) / (totalMoves + 1)) * 100));
    }

    if (analyzingRef.current) {
      setAccuracy({
        white: calculateAccuracy(whiteCpLosses),
        black: calculateAccuracy(blackCpLosses),
      });
    }
    setAnalyzing(false);
    analyzingRef.current = false;
  }

  function cancelAnalysis() {
    analyzingRef.current = false;
    setAnalyzing(false);
  }

  // Compute best move arrow for current position
  const bestMoveArrow = (() => {
    if (!evaluations[viewIndex] || !evaluations[viewIndex].bestMove) return undefined;
    const bm = evaluations[viewIndex].bestMove;
    if (bm.length < 4) return undefined;
    return { from: bm.slice(0, 2), to: bm.slice(2, 4), color: '#4a9eff' };
  })();

  // Check if current move was not the best move (to show arrow)
  const showBestMoveArrow = (() => {
    if (!bestMoveArrow) return false;
    // Only show when we have classification data and the move wasn't best/good
    if (viewIndex > 0 && moveClassifications[viewIndex]) {
      const cls = moveClassifications[viewIndex];
      return cls === 'inaccuracy' || cls === 'mistake' || cls === 'blunder';
    }
    return false;
  })();

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); goPrev(); setAutoPlaying(false); break;
        case 'ArrowRight': e.preventDefault(); goNext(); setAutoPlaying(false); break;
        case 'Home': e.preventDefault(); goFirst(); setAutoPlaying(false); break;
        case 'End': e.preventDefault(); goLast(); setAutoPlaying(false); break;
        case 'f': if (!e.ctrlKey && !e.metaKey) setFlipped(f => !f); break;
        case ' ': e.preventDefault(); toggleAutoPlay(); break;
        case 'Escape': onBack(); break;
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [totalMoves, autoPlaying, viewIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Captured pieces
  const blackCaptured = getCapturedPieces(viewGame, 'b');
  const whiteCaptured = getCapturedPieces(viewGame, 'w');

  // Result info
  const { label: resultLabel } = formatResult(gameData.result);

  // Status text
  function getStatus(): string {
    if (viewIndex === 0) return 'Starting position';
    if (viewIndex === totalMoves && viewGame.isCheckmate()) {
      const winner = viewGame.turn() === 'w' ? 'Black' : 'White';
      return `Checkmate! ${winner} wins!`;
    }
    if (viewIndex === totalMoves && viewGame.isDraw()) return 'Game drawn';
    const turn = viewGame.turn() === 'w' ? 'White' : 'Black';
    if (viewGame.isCheck()) return `${turn} is in check`;
    return `Move ${viewIndex} of ${totalMoves}`;
  }

  // Helper to get move color class from classification
  function getMoveClassStyle(moveIndex: number): string {
    const cls = moveClassifications[moveIndex];
    if (!cls) return '';
    switch (cls) {
      case 'brilliant': return styles.moveBrilliant;
      case 'inaccuracy': return styles.moveInaccuracy;
      case 'mistake': return styles.moveMistake;
      case 'blunder': return styles.moveBlunder;
      default: return '';
    }
  }

  // Build move rows
  const moveRows: React.ReactNode[] = [];
  for (let i = 0; i < totalMoves; i += 2) {
    const whiteIdx = i;
    const blackIdx = i + 1;
    moveRows.push(
      <div key={`row-${i}`} className={styles.moveRow}>
        <span className={styles.moveNumber}>{Math.floor(i / 2) + 1}.</span>
        <span
          className={`${styles.move} ${viewIndex === whiteIdx + 1 ? styles.moveActive : ''} ${getMoveClassStyle(whiteIdx + 1)}`}
          data-active={viewIndex === whiteIdx + 1}
          onClick={() => { setViewIndex(whiteIdx + 1); setAutoPlaying(false); }}
        >
          {history[whiteIdx].san}{annotations[whiteIdx + 1]?.glyph || ''}
          {moveClassifications[whiteIdx + 1] && ['inaccuracy', 'mistake', 'blunder'].includes(moveClassifications[whiteIdx + 1]) && evaluations[whiteIdx] && evaluations[whiteIdx].bestMove && (
            <span className={styles.moveBestHint}>
              Best: {uciToSan((() => { const g = new Chess(); for (let k = 0; k < whiteIdx; k++) g.move(history[k].san); return g.fen(); })(), evaluations[whiteIdx].bestMove)}
            </span>
          )}
        </span>
        {blackIdx < totalMoves ? (
          <span
            className={`${styles.move} ${viewIndex === blackIdx + 1 ? styles.moveActive : ''} ${getMoveClassStyle(blackIdx + 1)}`}
            data-active={viewIndex === blackIdx + 1}
            onClick={() => { setViewIndex(blackIdx + 1); setAutoPlaying(false); }}
          >
            {history[blackIdx].san}{annotations[blackIdx + 1]?.glyph || ''}
            {moveClassifications[blackIdx + 1] && ['inaccuracy', 'mistake', 'blunder'].includes(moveClassifications[blackIdx + 1]) && evaluations[blackIdx] && evaluations[blackIdx].bestMove && (
              <span className={styles.moveBestHint}>
                Best: {uciToSan((() => { const g = new Chess(); for (let k = 0; k < blackIdx; k++) g.move(history[k].san); return g.fen(); })(), evaluations[blackIdx].bestMove)}
              </span>
            )}
          </span>
        ) : <span />}
      </div>
    );
  }

  // Build annotated PGN string
  const GLYPH_TO_NAG: Record<string, string> = {
    '!': '$1', '?': '$2', '!!': '$3', '??': '$4', '!?': '$5', '?!': '$6',
  };

  function buildAnnotatedPgn(): string {
    // Extract headers from original PGN
    const headerLines: string[] = [];
    if (gameData.pgn) {
      const headerRegex = /\[([^\]]+)\]/g;
      let match;
      while ((match = headerRegex.exec(gameData.pgn)) !== null) {
        headerLines.push(match[0]);
      }
    }

    // Build move text from history with annotations
    const parts: string[] = [];
    for (let i = 0; i < history.length; i++) {
      const moveIndex = i + 1; // 1-based annotation key
      const isWhite = i % 2 === 0;
      const moveNumber = Math.floor(i / 2) + 1;

      if (isWhite) {
        parts.push(`${moveNumber}.`);
      }

      parts.push(history[i].san);

      // Add NAG if glyph annotation exists
      const ann = annotations[moveIndex];
      if (ann?.glyph && GLYPH_TO_NAG[ann.glyph]) {
        parts.push(GLYPH_TO_NAG[ann.glyph]);
      }

      // Add comment if exists
      if (ann?.comment) {
        parts.push(`{ ${ann.comment} }`);
      }
    }

    // Determine result string
    let resultStr = '*';
    if (gameData.result === 'white_wins') resultStr = '1-0';
    else if (gameData.result === 'black_wins') resultStr = '0-1';
    else if (gameData.result === 'draw') resultStr = '1/2-1/2';
    parts.push(resultStr);

    const moveText = parts.join(' ');
    if (headerLines.length > 0) {
      return headerLines.join('\n') + '\n\n' + moveText + '\n';
    }
    return moveText + '\n';
  }

  // Current position eval for the eval bar
  const currentEval = evaluations[viewIndex];

  return (
    <div className={styles.reviewLayout}>
      {currentEval && (
        <div className={styles.evalColumn}>
          <EvalBar score={currentEval.score} mate={currentEval.mate} flipped={flipped} />
        </div>
      )}
      <div className={styles.boardColumn}>
        <ChessBoard
          className={styles.reviewBoard}
          externalGame={viewGame}
          hideControls
          readOnly
          initialFlipped={flipped}
          externalLastMove={viewLastMove}
          theme={boardTheme}
          arrow={showBestMoveArrow ? bestMoveArrow : undefined}
        />
      </div>

      <div className={styles.panel}>
        <div className={styles.panelTop}>
          <div className={styles.gameInfo}>
            <span className={styles.gameDate}>{formatDate(gameData.created_at)}</span>
            <span className={styles.gameResult}>
              <span className={`result-badge ${formatResult(gameData.result).className}`}>{resultLabel}</span>
            </span>
            <span className={styles.positionInfo}>{getStatus()}</span>
          </div>

          <div className={styles.capturedRow}>
            {(flipped ? whiteCaptured : blackCaptured).map((t, i) => (
              <span key={i} className={styles.capturedPiece}>{getPieceSvg(flipped ? 'w' : 'b', t)}</span>
            ))}
          </div>

          <div className={styles.moveListContainer} ref={moveListRef}>
            <div className={styles.moveList}>
              {moveRows}
            </div>
          </div>

          <div className={styles.capturedRow}>
            {(flipped ? blackCaptured : whiteCaptured).map((t, i) => (
              <span key={i} className={styles.capturedPiece}>{getPieceSvg(flipped ? 'b' : 'w', t)}</span>
            ))}
          </div>

          {/* Annotation panel for current move */}
          {viewIndex > 0 && (
            <div className={styles.annotationPanel}>
              <div className={styles.annotationGlyphs}>
                {ANNOTATION_GLYPHS.map(g => (
                  <button
                    key={g}
                    className={`${styles.glyphBtn} ${annotations[viewIndex]?.glyph === g ? styles.glyphBtnActive : ''}`}
                    onClick={() => {
                      setAnnotations(prev => ({
                        ...prev,
                        [viewIndex]: {
                          ...prev[viewIndex],
                          glyph: prev[viewIndex]?.glyph === g ? undefined : g,
                        },
                      }));
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {editingAnnotation === viewIndex ? (
                <div className={styles.commentEdit}>
                  <input
                    type="text"
                    value={annotationComment}
                    onChange={e => setAnnotationComment(e.target.value)}
                    placeholder="Add a comment..."
                    className={styles.commentInput}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        setAnnotations(prev => ({
                          ...prev,
                          [viewIndex]: { ...prev[viewIndex], comment: annotationComment || undefined },
                        }));
                        setEditingAnnotation(null);
                      }
                      if (e.key === 'Escape') setEditingAnnotation(null);
                    }}
                  />
                  <button
                    className={styles.commentSaveBtn}
                    onClick={() => {
                      setAnnotations(prev => ({
                        ...prev,
                        [viewIndex]: { ...prev[viewIndex], comment: annotationComment || undefined },
                      }));
                      setEditingAnnotation(null);
                    }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  className={styles.addCommentBtn}
                  onClick={() => {
                    setAnnotationComment(annotations[viewIndex]?.comment || '');
                    setEditingAnnotation(viewIndex);
                  }}
                >
                  {annotations[viewIndex]?.comment ? `"${annotations[viewIndex].comment}"` : '+ Add comment'}
                </button>
              )}
            </div>
          )}

          {viewIndex > 0 && evaluations[viewIndex - 1] && evaluations[viewIndex - 1].bestMove && moveClassifications[viewIndex] && (
            <div className={styles.bestMovePanel}>
              <div className={styles.bestMoveHeader}>Engine suggestion</div>
              <div className={styles.bestMoveContent}>
                <span className={styles.bestMoveLabel}>Best:</span>
                <span className={styles.bestMoveSan}>
                  {uciToSan((() => {
                    const g = new Chess();
                    for (let i = 0; i < viewIndex - 1; i++) g.move(history[i].san);
                    return g.fen();
                  })(), evaluations[viewIndex - 1].bestMove)}
                </span>
                <span className={styles.bestMoveEval}>
                  ({evaluations[viewIndex - 1].score > 0 ? '+' : ''}{(evaluations[viewIndex - 1].score / 100).toFixed(1)})
                </span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.panelBottom}>
          {/* Analysis controls */}
          <div className={styles.toolbar}>
            {!analyzing && !accuracy && (
              <>
                <select
                  className={styles.autoPlaySelect}
                  value={analysisDepth}
                  onChange={e => setAnalysisDepth(Number(e.target.value))}
                  title="Analysis depth"
                >
                  <option value={10}>Depth 10</option>
                  <option value={12}>Depth 12</option>
                  <option value={14}>Depth 14</option>
                  <option value={16}>Depth 16</option>
                  <option value={18}>Depth 18</option>
                  <option value={20}>Depth 20</option>
                  <option value={24}>Depth 24</option>
                </select>
                <button
                  className={`${styles.toolBtn} ${styles.analyzeBtn}`}
                  onClick={runAnalysis}
                  disabled={totalMoves === 0}
                >
                  Analyze
                </button>
                {analysisDepth > 18 && totalMoves > 40 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High depth on long games may be slow</span>
                )}
              </>
            )}
            {analyzing && (
              <button
                className={`${styles.toolBtn}`}
                onClick={cancelAnalysis}
              >
                Cancel
              </button>
            )}
            {accuracy && (
              <div className={styles.accuracySummary}>
                <span>White: {accuracy.white}%</span>
                <span>|</span>
                <span>Black: {accuracy.black}%</span>
              </div>
            )}
          </div>
          {analyzing && (
            <div className={styles.analysisProgress}>
              <div
                className={styles.analysisProgressBar}
                style={{ width: `${analysisProgress}%` }}
              />
              <span className={styles.analysisProgressText}>Analyzing... {analysisProgress}%</span>
            </div>
          )}

          {/* Move navigation */}
          <div className={styles.toolbar}>
            <button className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={goFirst} disabled={viewIndex === 0} title="First move (Home)">&#x23EE;</button>
            <button className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={goPrev} disabled={viewIndex === 0} title="Previous (Left arrow)">&#x25C0;</button>
            <button
              className={`${styles.toolBtn} ${styles.toolBtnIcon}`}
              onClick={toggleAutoPlay}
              title="Auto-play (Space)"
            >
              {autoPlaying ? '&#x23F8;' : '&#x23F5;'}
            </button>
            <button className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={goNext} disabled={viewIndex === totalMoves} title="Next (Right arrow)">&#x25B6;</button>
            <button className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={goLast} disabled={viewIndex === totalMoves} title="Last move (End)">&#x23ED;</button>
            <div className={styles.toolSpacer} />
            <button className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={() => setFlipped(f => !f)} title="Flip board (F)">&#x21C5;</button>
          </div>

          {/* Auto play speed */}
          <div className={styles.autoPlayRow}>
            <span>Speed:</span>
            <select
              className={styles.autoPlaySelect}
              value={autoPlaySpeed}
              onChange={e => setAutoPlaySpeed(Number(e.target.value))}
            >
              <option value={500}>Fast (0.5s)</option>
              <option value={1000}>Normal (1s)</option>
              <option value={1500}>Slow (1.5s)</option>
              <option value={3000}>Very Slow (3s)</option>
            </select>
          </div>

          {/* Export & Back */}
          <div className={styles.toolbar}>
            <button className={`${styles.toolBtn} ${styles.backBtn}`} onClick={onBack}>
              &larr; Back
            </button>
            <button className={styles.toolBtn} onClick={() => {
              const pgn = buildAnnotatedPgn();
              navigator.clipboard.writeText(pgn);
              alert('PGN copied to clipboard!');
            }}>
              Copy PGN
            </button>
            <button className={styles.toolBtn} onClick={() => {
              const pgn = buildAnnotatedPgn();
              const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `game-${gameData.id}.pgn`;
              a.click();
              URL.revokeObjectURL(url);
            }}>
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadGames(p = page) {
    const params = new URLSearchParams({ page: String(p), limit: '20', include_multiplayer: 'true' });
    if (searchQuery) params.set('search', searchQuery);
    if (resultFilter) params.set('result', resultFilter);
    fetch(`/api/games?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.games) {
          setGames(data.games);
          setTotalPages(data.totalPages || 1);
        } else if (Array.isArray(data)) {
          setGames(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // loadGames is stable (uses its own param + state captured at call time)
  useEffect(() => { loadGames(page); }, [page, resultFilter]); // eslint-disable-line react-hooks/exhaustive-deps -- loadGames uses page param directly

  async function handleDelete(id: number) {
    if (!confirm('Delete this game?')) return;
    try {
      await fetch(`/api/games/${id}`, { method: 'DELETE' });
      setGames(games.filter(g => g.id !== id));
    } catch { /* silent */ }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      // Split multi-game PGN by double newline before "[Event" or just try as single
      const pgnChunks = text.split(/\n\n(?=\[Event)/);
      const chunks = pgnChunks.length > 0 ? pgnChunks : [text];

      for (const pgn of chunks) {
        const trimmed = pgn.trim();
        if (!trimmed) continue;
        const importedGame = new Chess();
        try {
          importedGame.loadPgn(trimmed);
        } catch {
          continue; // skip invalid PGN chunks
        }
        const h = importedGame.history();
        let result = 'in_progress';
        if (importedGame.isCheckmate()) result = importedGame.turn() === 'w' ? 'black_wins' : 'white_wins';
        else if (importedGame.isDraw()) result = 'draw';

        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pgn: trimmed, result, movesCount: h.length }),
        });
      }
      loadGames();
    } catch {
      alert('Failed to import PGN');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function exportAll() {
    const allPgn = games.map(g => g.pgn).join('\n\n');
    const blob = new Blob([allPgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rooke-games.pgn';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (selectedGame) {
    return (
      <AppShell>
        <GameReview game={selectedGame} onBack={() => setSelectedGame(null)} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 className={styles.title} style={{ marginBottom: 0 }}>Game History</h1>
          {games.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={exportAll}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Export All
              </button>
              <label
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {importing ? 'Importing...' : 'Import PGN'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pgn,.txt"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}
        </div>
        {/* Search and filter */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); loadGames(1); } }}
            style={{
              flex: 1, minWidth: '150px', background: 'var(--bg-primary)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none',
            }}
          />
          <select
            value={resultFilter}
            onChange={e => { setResultFilter(e.target.value); setPage(1); }}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)',
              padding: '6px 10px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            <option value="">All results</option>
            <option value="white_wins">White wins</option>
            <option value="black_wins">Black wins</option>
            <option value="draw">Draws</option>
          </select>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : games.length === 0 ? (
          <div>
            <p className={styles.empty}>No games yet. Play a game to see it here!</p>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <label
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Import PGN File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pgn,.txt"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        ) : (
          <>
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Opponent</th>
                <th>Result</th>
                <th>Moves</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {games.map(game => {
                const { label, className } = formatResult(game.result);
                return (
                  <tr key={`${game.source || 'local'}-${game.id}`}>
                    <td>{formatDate(game.created_at)}</td>
                    <td style={{ fontSize: '0.85rem' }}>{game.opponent || (game.source === 'multiplayer' ? 'Player' : 'AI')}</td>
                    <td>
                      <span className={`result-badge ${className}`}>{label}</span>
                    </td>
                    <td>{game.moves_count}</td>
                    <td style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setSelectedGame(game)}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          color: '#4a9eff',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Review
                      </button>
                      <button
                        onClick={() => handleDelete(game.id)}
                        style={{
                          background: 'none',
                          border: '1px solid #553333',
                          color: 'var(--danger)',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px', alignItems: 'center' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                  padding: '6px 14px', borderRadius: '6px', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.4 : 1, fontSize: '0.85rem',
                }}
              >
                Previous
              </button>
              <span style={{ color: '#aaa', fontSize: '0.85rem' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                  padding: '6px 14px', borderRadius: '6px', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.4 : 1, fontSize: '0.85rem',
                }}
              >
                Next
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </AppShell>
  );
}
