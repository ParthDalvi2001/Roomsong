// Procedural reverb impulse response (ADR-002, FR-ROOM-06): seeded noise burst with exponential decay and a one-pole
// low-pass that closes over time so the tail darkens like a real room. One ConvolverNode is shared by all voices.
import {
  IR_FADE_IN_S,
  IR_LPF_COEF_END,
  IR_LPF_COEF_START,
  REVERB_IR_MAX_S,
  REVERB_RT60_MAX_S,
  REVERB_RT60_MIN_S,
  T60_AMPLITUDE,
} from './config';
import { mulberry32 } from './prng';

/** RT60 in seconds inside the 0.3..2.0 clamp (FR-ROOM-06); anything that is not a number counts as the shortest room. */
export function clampRt60(rt60: number): number {
  if (!(rt60 > REVERB_RT60_MIN_S)) return REVERB_RT60_MIN_S;
  return rt60 > REVERB_RT60_MAX_S ? REVERB_RT60_MAX_S : rt60;
}

/** Samples in the impulse response for `rt60`: one RT60 long (the tail is at −60 dB there), never above 2.0 s. */
export function impulseLength(sampleRate: number, rt60: number): number {
  return Math.floor(sampleRate * Math.min(clampRt60(rt60), REVERB_IR_MAX_S));
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
