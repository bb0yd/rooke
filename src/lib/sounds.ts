import { getSettings, SoundPack } from './settings';

// ── Synth engine (original Web Audio API oscillator code) ──

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType, volume: number) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume: number) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.08));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 800;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

function synthMove() {
  playTone(600, 0.08, 'sine', 0.15);
  playNoise(0.06, 0.08);
}

function synthCapture() {
  playTone(400, 0.1, 'sine', 0.18);
  playNoise(0.1, 0.15);
  playTone(250, 0.08, 'triangle', 0.1);
}

function synthCheck() {
  playTone(800, 0.12, 'square', 0.12);
  playTone(1000, 0.08, 'square', 0.1);
}

// ── MP3 playback ──

function playMp3(pack: string, file: string) {
  const audio = new Audio(`/sounds/${pack}/${file}.mp3`);
  audio.play().catch(() => {});
}

// ── Public API ──

function getPack(): SoundPack {
  return getSettings().soundPack;
}

export function playMoveSound() {
  const pack = getPack();
  if (pack === 'none') return;
  if (pack === 'synth') return synthMove();
  playMp3(pack, 'Move');
}

export function playCaptureSound() {
  const pack = getPack();
  if (pack === 'none') return;
  if (pack === 'synth') return synthCapture();
  playMp3(pack, 'Capture');
}

export function playCheckSound() {
  const pack = getPack();
  if (pack === 'none') return;
  if (pack === 'synth') return synthCheck();
  playMp3(pack, 'Check');
}

export function playGameStartSound() {
  const pack = getPack();
  if (pack === 'none') return;
  if (pack === 'synth') {
    playTone(523, 0.12, 'sine', 0.1);
    setTimeout(() => playTone(659, 0.12, 'sine', 0.1), 100);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.12), 200);
    return;
  }
  // Fallback: play a move sound
  playMp3(pack, 'Move');
}

export function playGameEndSound() {
  const pack = getPack();
  if (pack === 'none') return;
  if (pack === 'synth') {
    playTone(784, 0.15, 'sine', 0.12);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.1), 150);
    setTimeout(() => playTone(523, 0.2, 'sine', 0.12), 300);
    return;
  }
  playMp3(pack, 'Check');
}

export function playLowTimeSound() {
  const pack = getPack();
  if (pack === 'none') return;
  if (pack === 'synth') {
    playTone(440, 0.05, 'square', 0.08);
    return;
  }
  playMp3(pack, 'Move');
}

export function playPreMoveSound() {
  const pack = getPack();
  if (pack === 'none') return;
  if (pack === 'synth') {
    playTone(300, 0.06, 'triangle', 0.06);
    return;
  }
  playMp3(pack, 'Move');
}
