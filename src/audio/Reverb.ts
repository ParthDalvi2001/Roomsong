// Procedural reverb impulse response (ADR-002, FR-ROOM-06): seeded noise burst with exponential decay and a one-pole
// low-pass that closes over time so the tail darkens like a real room. One ConvolverNode is shared by all voices.
// The decay comes in as an argument: which decay a room gets, and its 0.3..2.0 s clamp, belong to garden/ (T-141).
import {
  IR_FADE_IN_S,
  IR_LPF_COEF_END,
  IR_LPF_COEF_START,
  REVERB_IR_MAX_S,
  T60_AMPLITUDE,
} from './config.js';
import { mulberry32 } from './prng.js';

/**
 * Samples in the impulse response for a decay of `rt60` seconds: one RT60 long (the tail is at −60 dB there),
 * never above 2.0 s (NFR-PERF-10) and never empty. `rt60` must be above 0.
 */
export function impulseLength(sampleRate: number, rt60: number): number {
  return Math.max(1, Math.floor(sampleRate * Math.min(rt60, REVERB_IR_MAX_S)));
}

/** Fill one channel of an impulse response. Deterministic for (seed); use seed + channel for stereo decorrelation. */
export function renderImpulseResponse(
  out: Float32Array,
  sampleRate: number,
  decayS: number,
  seed: number,
): void {
  const rnd = mulberry32(seed);
  const k = -Math.log(T60_AMPLITUDE) / decayS; // exp(−k·t) reaches −60 dB at t = decayS
  const fadeIn = Math.max(1, Math.floor(sampleRate * IR_FADE_IN_S));
  let y = 0;
  let peak = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sampleRate;
    const progress = Math.min(1, t / decayS);
    const coef = IR_LPF_COEF_START + (IR_LPF_COEF_END - IR_LPF_COEF_START) * progress;
    const w = rnd() * 2 - 1;
    y = (1 - coef) * w + coef * y;
    // The low-pass removes noise power as it closes, by (1 − coef) / (1 + coef). Undo that, so the broadband level
    // follows exp(−k·t) and the measured RT60 equals `decayS` while the tail still darkens.
    let v = y * Math.sqrt((1 + coef) / (1 - coef)) * Math.exp(-k * t);
    if (i < fadeIn) v *= i / fadeIn;
    out[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  if (peak > 0) {
    const s = 1 / peak;
    for (let i = 0; i < out.length; i++) out[i] = (out[i] as number) * s;
  }
}
