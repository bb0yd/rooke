// Time control parsing and utilities for multiplayer games

export interface TimeControl {
  initialMs: number;    // Initial time in milliseconds
  incrementMs: number;  // Increment per move in milliseconds
  label: string;
}

export const TIME_CONTROL_PRESETS: Record<string, TimeControl> = {
  'none':   { initialMs: 0, incrementMs: 0, label: 'No time limit' },
  '1+0':    { initialMs: 60000, incrementMs: 0, label: 'Bullet 1 min' },
  '2+1':    { initialMs: 120000, incrementMs: 1000, label: 'Bullet 2|1' },
  '3+0':    { initialMs: 180000, incrementMs: 0, label: 'Blitz 3 min' },
  '3+2':    { initialMs: 180000, incrementMs: 2000, label: 'Blitz 3|2' },
  '5+0':    { initialMs: 300000, incrementMs: 0, label: 'Blitz 5 min' },
  '5+3':    { initialMs: 300000, incrementMs: 3000, label: 'Blitz 5|3' },
  '10+0':   { initialMs: 600000, incrementMs: 0, label: 'Rapid 10 min' },
  '10+5':   { initialMs: 600000, incrementMs: 5000, label: 'Rapid 10|5' },
  '15+10':  { initialMs: 900000, incrementMs: 10000, label: 'Rapid 15|10' },
  '30+0':   { initialMs: 1800000, incrementMs: 0, label: 'Classical 30 min' },
};

export function parseTimeControl(tc: string): TimeControl {
  if (tc === 'none' || !tc) {
    return TIME_CONTROL_PRESETS['none'];
  }
  const preset = TIME_CONTROL_PRESETS[tc];
  if (preset) return preset;

  // Parse custom format "X+Y" where X is minutes, Y is seconds increment
  const match = tc.match(/^(\d+)\+(\d+)$/);
  if (match) {
    const mins = parseInt(match[1]);
    const inc = parseInt(match[2]);
    return {
      initialMs: mins * 60000,
      incrementMs: inc * 1000,
      label: `${mins}+${inc}`,
    };
  }

  return TIME_CONTROL_PRESETS['none'];
}

export function formatTime(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTimeWithTenths(ms: number): string {
  if (ms <= 0) return '0:00.0';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${Math.floor(seconds).toString().padStart(2, '0')}`;
  }
  return `0:${seconds.toFixed(1).padStart(4, '0')}`;
}
