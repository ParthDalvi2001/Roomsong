// Karplus-Strong pluck (LLD §7) rendered by pure code into a buffer. A native DelayNode cannot loop shorter than one
// render quantum (128 samples ≈ 2.7 ms → max ≈ 370 Hz), so the string is rendered here, outside the tick, and played
// back through an AudioBufferSourceNode; it stays synthesised at runtime (ADR-002: no audio files ship).
import {
  STRING_FADE_IN_SAMPLES,
  STRING_FADE_OUT_S,
  STRING_T60_LONG_S,
  STRING_T60_SHORT_S,
  T60_AMPLITUDE,
} from './config.js';
import { mulberry32 } from './prng.js';

/**
 * Fill `out` with a plucked string at `hz`. `damping` 0..1 shortens the note (T60 2.5 s → 0.4 s); `seed` fixes the
 * excitation noise. Output is peak-normalised to 1.0 with click-free edges.
 */
export function renderKarplusStrong(
  out: Float32Array,
  sampleRate: number,
  hz: number,
  damping: number,
  seed: number,
): void {
  const period = sampleRate / hz;
  // The 2-point average in the loop adds 0.5 samples of delay, so the fractional line is period − 0.5.
  const delay = period - 0.5;
  const n = Math.floor(delay);
  const frac = delay - n;
  const d = damping < 0 ? 0 : damping > 1 ? 1 : damping;
  const t60 = STRING_T60_LONG_S + (STRING_T60_SHORT_S - STRING_T60_LONG_S) * d;
  const loopGain = Math.pow(T60_AMPLITUDE, 1 / (t60 * hz));
  const rnd = mulberry32(seed);
  const excitationLen = n + 2;

  // Excitation: one period of noise, 2-point averaged (tames the harshest highs) and DC-free.
  let prev = 0;
  let mean = 0;
  for (let i = 0; i < excitationLen && i < out.length; i++) {
    const w = rnd() * 2 - 1;
    const v = 0.5 * (w + prev);
    prev = w;
    out[i] = v;
    mean += v;
  }
  mean /= excitationLen;
  for (let i = 0; i < excitationLen && i < out.length; i++) out[i] = (out[i] as number) - mean;

  // String loop: y[n] = g · ½ · (x(n − D) + x(n − D − 1)), x read with linear interpolation.
  for (let i = excitationLen; i < out.length; i++) {
    const a = out[i - n] as number;
    const b = out[i - n - 1] as number;
    const c = out[i - n - 2] as number;
    const x0 = a + (b - a) * frac;
    const x1 = b + (c - b) * frac;
    out[i] = loopGain * 0.5 * (x0 + x1);
  }

  // Click-free edges, then normalise.
  const fadeIn = Math.min(STRING_FADE_IN_SAMPLES, out.length);
  for (let i = 0; i < fadeIn; i++) out[i] = (out[i] as number) * (i / fadeIn);
  const fadeOut = Math.min(Math.floor(sampleRate * STRING_FADE_OUT_S), out.length);
  for (let i = 0; i < fadeOut; i++) {
    const k = out.length - 1 - i;
    out[k] = (out[k] as number) * (i / fadeOut);
  }
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i] as number));
  if (peak > 0) {
    const s = 1 / peak;
    for (let i = 0; i < out.length; i++) out[i] = (out[i] as number) * s;
  }
}
