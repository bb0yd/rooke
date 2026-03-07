'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { drawLineChart, ChartPoint } from '@/lib/chart';
import styles from './RatingChart.module.css';

type TimeRange = '7d' | '30d' | '1y' | 'all';

function filterByRange(data: { rating: number; recorded_at: string }[], range: TimeRange) {
  if (range === 'all') return data;
  const now = Date.now();
  const ms = range === '7d' ? 7 * 86400000 : range === '30d' ? 30 * 86400000 : 365 * 86400000;
  const cutoff = now - ms;
  return data.filter(d => new Date(d.recorded_at).getTime() >= cutoff);
}

interface Props {
  data: { rating: number; recorded_at: string }[];
  title?: string;
  height?: number;
}

export default function RatingChart({ data, title, height = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [range, setRange] = useState<TimeRange>('all');
  const filteredData = useMemo(() => filterByRange(data, range), [data, range]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || filteredData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const points: ChartPoint[] = filteredData.map((d, i) => ({
      x: i,
      y: d.rating,
      label: new Date(d.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    const ratings = filteredData.map(d => d.rating);
    const min = Math.min(...ratings);
    const max = Math.max(...ratings);
    const range = max - min;
    const yMin = Math.floor((min - range * 0.1) / 50) * 50;
    const yMax = Math.ceil((max + range * 0.1) / 50) * 50;

    drawLineChart(ctx, points, {
      width: rect.width,
      height: height,
      yMin: yMin || 1300,
      yMax: yMax || 1700,
      xLabels: points.map(p => p.label || ''),
      showPoints: filteredData.length <= 30,
    });
  }, [filteredData, height]);

  if (data.length === 0) {
    return (
      <div className={styles.container}>
        {title && <h3 className={styles.title}>{title}</h3>}
        <p className={styles.empty}>No rating data yet</p>
      </div>
    );
  }

  const currentRating = filteredData[filteredData.length - 1]?.rating;
  const prevRating = filteredData.length > 1 ? filteredData[filteredData.length - 2]?.rating : currentRating;
  const change = currentRating - prevRating;

  return (
    <div className={styles.container}>
      {title && (
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.ratingInfo}>
            <span className={styles.currentRating}>{currentRating}</span>
            {change !== 0 && (
              <span className={change > 0 ? styles.ratingUp : styles.ratingDown}>
                {change > 0 ? '+' : ''}{change}
              </span>
            )}
          </div>
        </div>
      )}
      <div className={styles.rangeRow}>
        {(['7d', '30d', '1y', 'all'] as TimeRange[]).map(r => (
          <button
            key={r}
            className={`${styles.rangeBtn} ${range === r ? styles.rangeBtnActive : ''}`}
            onClick={() => setRange(r)}
          >
            {r === '7d' ? '7D' : r === '30d' ? '30D' : r === '1y' ? '1Y' : 'All'}
          </button>
        ))}
      </div>
      {filteredData.length === 0 ? (
        <p className={styles.empty}>No data in this range</p>
      ) : (
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={{ height: `${height}px` }}
        />
      )}
    </div>
  );
}
