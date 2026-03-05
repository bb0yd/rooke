'use client';

import { useRef, useEffect } from 'react';
import { drawLineChart, ChartPoint } from '@/lib/chart';
import styles from './RatingChart.module.css';

interface Props {
  data: { rating: number; recorded_at: string }[];
  title?: string;
  height?: number;
}

export default function RatingChart({ data, title, height = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const points: ChartPoint[] = data.map((d, i) => ({
      x: i,
      y: d.rating,
      label: new Date(d.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    const ratings = data.map(d => d.rating);
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
      showPoints: data.length <= 30,
    });
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className={styles.container}>
        {title && <h3 className={styles.title}>{title}</h3>}
        <p className={styles.empty}>No rating data yet</p>
      </div>
    );
  }

  const currentRating = data[data.length - 1]?.rating;
  const prevRating = data.length > 1 ? data[data.length - 2]?.rating : currentRating;
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
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
