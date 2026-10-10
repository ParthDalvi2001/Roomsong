// Pluck = Karplus-Strong (LLD §7) rendered into a buffer by pure code, so it can be tested in Node.
import { describe, expect, it } from 'vitest';

import { renderKarplusStrong } from '../src/karplus';

const SR = 48000;

function rms(buf: Float32Array, from: number, to: number): number {
  let acc = 0;
  for (let i = from; i < to; i++) acc += (buf[i] as number) ** 2;
  return Math.sqrt(acc / (to - from));
}

function peak(buf: Float32Array): number {
  let p = 0;
  for (let i = 0; i < buf.length; i++) p = Math.max(p, Math.abs(buf[i] as number));
  return p;
}

/** Fundamental estimate by normalised autocorrelation over the sustained part of the note. */
function estimateHz(buf: Float32Array, sampleRate: number, minHz: number, maxHz: number): number {
  const from = Math.floor(sampleRate * 0.05);
  const len = Math.floor(sampleRate * 0.3);
  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.ceil(sampleRate / minHz);
  let bestLag = minLag;
  let best = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let num = 0;
    let d0 = 0;
    let d1 = 0;
    for (let i = from; i < from + len; i++) {
      const a = buf[i] as number;
      const b = buf[i + lag] as number;
      num += a * b;
      d0 += a * a;
      d1 += b * b;
    }
    const r = num / Math.sqrt(d0 * d1 + 1e-12);
    if (r > best) {
      best = r;
      bestLag = lag;
    }
  }
  // parabolic interpolation around the best lag for sub-sample accuracy
  const corr = (lag: number): number => {
    let num = 0;
    for (let i = from; i < from + len; i++) num += (buf[i] as number) * (buf[i + lag] as number);
    return num;
  };
  const y0 = corr(bestLag - 1);
  const y1 = corr(bestLag);
  const y2 = corr(bestLag + 1);
  const denom = y0 - 2 * y1 + y2;
  const shift = denom === 0 ? 0 : (0.5 * (y0 - y2)) / denom;
  return sampleRate / (bestLag + shift);
}

const cents = (a: number, b: number): number => 1200 * Math.log2(a / b);

describe('renderKarplusStrong', () => {
  it('produces a non-silent, decaying, peak-normalised note', () => {
    const out = new Float32Array(SR * 1.5);
    renderKarplusStrong(out, SR, 261.63, 0.5, 1);
    expect(peak(out)).toBeCloseTo(1, 3);
    const head = rms(out, 0, SR * 0.1);
    const tail = rms(out, out.length - SR * 0.1, out.length);
    expect(head).toBeGreaterThan(0.05);
    expect(tail).toBeLessThan(head * 0.1);
  });

  it('is deterministic for the same seed and differs for another seed', () => {
    const a = new Float32Array(SR * 0.5);
    const b = new Float32Array(SR * 0.5);
    const c = new Float32Array(SR * 0.5);
    renderKarplusStrong(a, SR, 330, 0.5, 7);
    renderKarplusStrong(b, SR, 330, 0.5, 7);
    renderKarplusStrong(c, SR, 330, 0.5, 8);
    expect(a).toEqual(b);
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += Math.abs((a[i] as number) - (c[i] as number));
    expect(diff).toBeGreaterThan(1);
  });

  it.each([261.63, 329.63, 440, 523.25])('is in tune within ±5 cents at %f Hz', (hz) => {
    const out = new Float32Array(SR * 1.0);
    renderKarplusStrong(out, SR, hz, 0.5, 3);
    const est = estimateHz(out, SR, hz * 0.8, hz * 1.25);
    expect(Math.abs(cents(est, hz))).toBeLessThan(5);
  });

  it('higher damping shortens the note', () => {
    const soft = new Float32Array(SR * 1.5);
    const hard = new Float32Array(SR * 1.5);
    renderKarplusStrong(soft, SR, 330, 0.1, 3);
    renderKarplusStrong(hard, SR, 330, 0.9, 3);
    const softTail = rms(soft, SR * 0.6, SR * 0.8);
    const hardTail = rms(hard, SR * 0.6, SR * 0.8);
    expect(hardTail).toBeLessThan(softTail);
  });

  it('starts from silence at sample 0 (no click) and finishes near silence', () => {
    const out = new Float32Array(SR * 1.5);
    renderKarplusStrong(out, SR, 440, 0.5, 3);
    expect(Math.abs(out[0] as number)).toBeLessThan(0.05);
    expect(Math.abs(out[out.length - 1] as number)).toBeLessThan(0.01);
  });
});
