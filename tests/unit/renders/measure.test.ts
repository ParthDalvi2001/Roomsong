// T-173 part 2a (P-023): the render tool's measures checked on a known signal, so the numbers it prints on the
// engine's renders can be trusted. A 1 kHz sine at −20 dBFS peak reads −20.00 peak, −23.01 RMS and, in both
// channels, −20.0 LUFS (BS.1770-4: the −0.691 offset cancels the K-weighting at 1 kHz for a dual-mono sine).
import { describe, expect, it } from 'vitest';

import {
  activeSpanS,
  integratedLufs,
  longestSilenceS,
  measure,
  shareAboveDb,
  wavBytes,
  worstClick,
} from '../../renders/measure.js';

const SR = 48000;
const sine = (seconds: number, peak: number, hz = 1000): Float32Array =>
  Float32Array.from({ length: SR * seconds }, (_, i) => peak * Math.sin((2 * Math.PI * hz * i) / SR));

describe('measure', () => {
  it('a −20 dBFS sine in both channels: peak, RMS, LUFS and balance', () => {
    const s = sine(3, 0.1);
    const m = measure([s, s], SR);
    expect(m.peakDbfs).toBeCloseTo(-20, 2);
    expect(m.rmsDbfs).toBeCloseTo(-23.01, 2);
    expect(Math.abs(m.lufs + 20)).toBeLessThan(0.2);
    expect(m.rightMinusLeftDb).toBeCloseTo(0, 6);
  });

  it('the right channel 6 dB above the left, and silence read as −Infinity', () => {
    expect(measure([sine(1, 0.05), sine(1, 0.1)], SR).rightMinusLeftDb).toBeCloseTo(6.02, 2);
    const zero = new Float32Array(SR);
    expect(measure([zero, zero], SR).peakDbfs).toBe(-Infinity);
    expect(integratedLufs([zero, zero], SR)).toBe(-Infinity);
  });

  it('a 0.3 s hole in a sine is the longest silence; a step is the worst click', () => {
    const s = sine(2, 0.1);
    s.fill(0, SR, SR + Math.round(0.3 * SR));
    expect(longestSilenceS([s, s], SR, 0)).toBeCloseTo(0.3, 1);
    s.fill(0, 0, SR / 2);
    expect(activeSpanS([s, s], SR)).toEqual({ startS: 0.5, endS: 2 });
    expect(activeSpanS([new Float32Array(SR)], SR).startS).toBeNaN();
    expect(shareAboveDb([sine(1, 0.1)], SR, 4000, 0, 1)).toBeLessThan(-20);
    expect(shareAboveDb([sine(1, 0.1, 8000)], SR, 4000, 0, 1)).toBeGreaterThan(-1);
    const step = new Float32Array(SR);
    step.fill(0.25, SR / 2);
    const click = worstClick([step, step], SR, 0, 1);
    expect(click.jump).toBeCloseTo(0.25, 6);
    expect(click.atS).toBeCloseTo(0.5, 3);
  });

  it('writes a 16-bit PCM stereo WAV', () => {
    const bytes = wavBytes([Float32Array.of(0.5, -1), Float32Array.of(0, 2)], SR);
    expect(bytes.length).toBe(44 + 2 * 2 * 2);
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('RIFF');
    const v = new DataView(bytes.buffer);
    expect(v.getUint16(22, true)).toBe(2);
    expect(v.getUint32(24, true)).toBe(SR);
    expect(v.getInt16(44, true)).toBe(16384); // 0.5 left
    expect(v.getInt16(46, true)).toBe(0); // 0 right
    expect(v.getInt16(48, true)).toBe(-32767); // −1 left
    expect(v.getInt16(50, true)).toBe(32767); // 2 clipped right
  });
});
