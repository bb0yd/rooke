// Canvas chart utilities for stats visualization

export interface ChartPoint {
  x: number;
  y: number;
  label?: string;
  value?: number;
}

export interface LineChartOptions {
  width: number;
  height: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  lineColor?: string;
  fillColor?: string;
  gridColor?: string;
  textColor?: string;
  pointRadius?: number;
  showPoints?: boolean;
  showGrid?: boolean;
  yMin?: number;
  yMax?: number;
  xLabels?: string[];
  yLabels?: number[];
}

export function drawLineChart(
  ctx: CanvasRenderingContext2D,
  points: ChartPoint[],
  options: LineChartOptions
): void {
  const {
    width, height,
    padding = { top: 20, right: 20, bottom: 30, left: 50 },
    lineColor = '#4a9eff',
    fillColor = 'rgba(74, 158, 255, 0.1)',
    gridColor = '#333',
    textColor = '#888',
    pointRadius = 3,
    showPoints = true,
    showGrid = true,
  } = options;

  ctx.clearRect(0, 0, width, height);

  if (points.length === 0) return;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = points.map(p => p.y);
  const yMin = options.yMin ?? Math.min(...values);
  const yMax = options.yMax ?? Math.max(...values);
  const yRange = yMax - yMin || 1;

  function toX(i: number): number {
    return padding.left + (i / Math.max(points.length - 1, 1)) * chartW;
  }
  function toY(val: number): number {
    return padding.top + chartH - ((val - yMin) / yRange) * chartH;
  }

  // Grid lines
  if (showGrid) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    const gridLines = options.yLabels || [yMin, yMin + yRange * 0.25, yMin + yRange * 0.5, yMin + yRange * 0.75, yMax];
    for (const val of gridLines) {
      const y = toY(val);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(val).toString(), padding.left - 5, y + 4);
    }
  }

  // X labels
  if (options.xLabels) {
    ctx.fillStyle = textColor;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(options.xLabels.length / 6));
    for (let i = 0; i < options.xLabels.length; i += step) {
      ctx.fillText(options.xLabels[i], toX(i), height - 5);
    }
  }

  // Fill area
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(points[0].y));
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(toX(i), toY(points[i].y));
  }
  ctx.lineTo(toX(points.length - 1), padding.top + chartH);
  ctx.lineTo(toX(0), padding.top + chartH);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(points[0].y));
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(toX(i), toY(points[i].y));
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Points
  if (showPoints && points.length < 50) {
    for (let i = 0; i < points.length; i++) {
      ctx.beginPath();
      ctx.arc(toX(i), toY(points[i].y), pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
    }
  }
}

export interface HeatmapOptions {
  width: number;
  height: number;
  lowColor?: [number, number, number];
  highColor?: [number, number, number];
  gridColor?: string;
}

export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  data: number[][], // 8x8 grid
  options: HeatmapOptions
): void {
  const {
    width, height,
    lowColor = [26, 26, 46],
    highColor = [74, 158, 255],
    gridColor = '#444',
  } = options;

  ctx.clearRect(0, 0, width, height);

  const sqW = width / 8;
  const sqH = height / 8;

  let maxVal = 0;
  for (const row of data) {
    for (const v of row) {
      maxVal = Math.max(maxVal, v);
    }
  }
  if (maxVal === 0) maxVal = 1;

  const files = 'abcdefgh';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const val = data[row][col];
      const t = val / maxVal;
      const r = Math.round(lowColor[0] + (highColor[0] - lowColor[0]) * t);
      const g = Math.round(lowColor[1] + (highColor[1] - lowColor[1]) * t);
      const b = Math.round(lowColor[2] + (highColor[2] - lowColor[2]) * t);

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(col * sqW, row * sqH, sqW, sqH);

      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(col * sqW, row * sqH, sqW, sqH);

      if (val > 0) {
        ctx.fillStyle = t > 0.5 ? '#fff' : '#aaa';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(val.toString(), col * sqW + sqW / 2, row * sqH + sqH / 2 + 4);
      }
    }
  }

  // Labels
  ctx.fillStyle = '#888';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  for (let col = 0; col < 8; col++) {
    ctx.fillText(files[col], col * sqW + sqW / 2, height - 2);
  }
  for (let row = 0; row < 8; row++) {
    ctx.textAlign = 'left';
    ctx.fillText((8 - row).toString(), 2, row * sqH + sqH / 2 + 4);
  }
}

export interface BarChartOptions {
  width: number;
  height: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  barColor?: string;
  textColor?: string;
  gridColor?: string;
}

export function drawBarChart(
  ctx: CanvasRenderingContext2D,
  data: { label: string; value: number; color?: string }[],
  options: BarChartOptions
): void {
  const {
    width, height,
    padding = { top: 20, right: 20, bottom: 40, left: 50 },
    barColor = '#4a9eff',
    textColor = '#888',
    gridColor = '#333',
  } = options;

  ctx.clearRect(0, 0, width, height);
  if (data.length === 0) return;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = chartW / data.length * 0.7;
  const gap = chartW / data.length * 0.3;

  // Grid
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + chartH - (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal * i / 4).toString(), padding.left - 5, y + 4);
  }

  // Bars
  for (let i = 0; i < data.length; i++) {
    const x = padding.left + i * (barW + gap) + gap / 2;
    const barH = (data[i].value / maxVal) * chartH;
    const y = padding.top + chartH - barH;

    ctx.fillStyle = data[i].color || barColor;
    ctx.fillRect(x, y, barW, barH);

    ctx.fillStyle = textColor;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(x + barW / 2, height - 5);
    ctx.rotate(-Math.PI / 6);
    ctx.fillText(data[i].label.slice(0, 12), 0, 0);
    ctx.restore();
  }
}
