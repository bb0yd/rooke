'use client';

import { useRef, useEffect } from 'react';
import { drawHeatmap } from '@/lib/chart';
import styles from './SquareHeatmap.module.css';

interface Props {
  data: number[][];  // 8x8 grid
  title?: string;
  size?: number;
}

export default function SquareHeatmap({ data, title, size = 280 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    drawHeatmap(ctx, data, { width: size, height: size });
  }, [data, size]);

  return (
    <div className={styles.container}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
}
