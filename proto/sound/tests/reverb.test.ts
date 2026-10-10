// Procedural reverb impulse response (ADR-002): noise burst with exponential decay that follows the signature's
// RT60 (D-021), clamped 0.3–2.0 s (FR-ROOM-06) and never longer than 2.0 s (NFR-PERF-10).
import { describe, expect, it } from 'vitest';

import { REVERB_IR_MAX_S, REVERB_RT60_MAX_S, REVERB_RT60_MIN_S, REVERB_SEND } from '../src/config';
import { clampRt60, impulseLength, renderImpulseResponse } from '../src/reverb';

const SR = 48000;

/** RT60 measured from an impulse response: Schroeder backward integration, T30 fit (−5 → −35 dB, doubled). */
function measuredRt60(ir: Float32Array, sampleRate: number): number {
  const edc = new Float64Array(ir.length);
  let acc = 0;
  for (let i = ir.length - 1; i >= 0; i--) {
    acc += (ir[i] as number) ** 2;
    edc[i] = acc;
  }
  const at = (dbDown: number): number => {
    const target = acc * Math.pow(10, -dbDown / 10);
    let i = 0;
    while (i < edc.length && (edc[i] as number) > target) i++;
    return i / sampleRate;
  };
  return 2 * (at(35) - at(5));
}

function rms(buf: Float32Array, from: number, to: number): number {
  let acc = 0;
  for (let i = from; i < to; i++) acc += (buf[i] as number) ** 2;
  return Math.sqrt(acc / (to - from));
}

const db = (x: number): number => 20 * Math.log10(x + 1e-12);

describe('reverb sizing', () => {
  it('clamps RT60 to 0.3–2.0 s and treats a bad value as the shortest room', () => {
    expect(REVERB_RT60_MIN_S).toBe(0.3);
    expect(REVERB_RT60_MAX_S).toBe(2);
    expect(clampRt60(0.9)).toBe(0.9);
    expect(clampRt60(0.05)).toBe(0.3);
    expect(clampRt60(7)).toBe(2);
    expect(clampRt60(Number.NaN)).toBe(0.3);
  });

  it('the impulse response lasts one RT60 and never more than 2.0 s', () => {
    expect(REVERB_IR_MAX_S).toBe(2);
    expect(impulseLength(SR, 0.3)).toBe(Math.floor(SR * 0.3));
    expect(impulseLength(SR, 2.0)).toBe(Math.floor(SR * 2.0));
    expect(impulseLength(SR, 5)).toBe(SR * 2);
    expect(impulseLength(SR, 0)).toBe(Math.floor(SR * 0.3));
  });

  it('the send is one level for every room, inside 20–35 % (UX §6): a room changes only the decay (D-021)', () => {
    expect(REVERB_SEND).toBeGreaterThanOrEqual(0.2);
    expect(REVERB_SEND).toBeLessThanOrEqual(0.35);
  });
});

describe('decay follows the RT60 of the signature', () => {
  it('measured RT60 (Schroeder T30) is within 10 % of 0.3, 0.9 and 2.0 s', () => {
    for (const rt60 of [0.3, 0.9, 2.0]) {
      const ir = new Float32Array(impulseLength(SR, rt60));
      renderImpulseResponse(ir, SR, rt60, 1000);
      const measured = measuredRt60(ir, SR);
      expect(measured).toBeGreaterThan(rt60 * 0.9);
      expect(measured).toBeLessThan(rt60 * 1.1);
    }
  });
});

describe('renderImpulseResponse', () => {
  it('is deterministic for a seed and differs between channels/seeds', () => {
    const a = new Float32Array(SR);
    const b = new Float32Array(SR);
    const c = new Float32Array(SR);
    renderImpulseResponse(a, SR, 1.0, 11);
    renderImpulseResponse(b, SR, 1.0, 11);
    renderImpulseResponse(c, SR, 1.0, 12);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('is non-silent, bounded to ±1 and decays by ≥ 40 dB over its length', () => {
    const decayS = 1.6;
    const out = new Float32Array(Math.floor(SR * decayS));
    renderImpulseResponse(out, SR, decayS, 5);
    let p = 0;
    for (let i = 0; i < out.length; i++) p = Math.max(p, Math.abs(out[i] as number));
    expect(p).toBeLessThanOrEqual(1);
    expect(p).toBeGreaterThan(0.3);
    const head = rms(out, 0, Math.floor(SR * 0.05));
    const tail = rms(out, out.length - Math.floor(SR * 0.1), out.length);
    expect(db(head) - db(tail)).toBeGreaterThanOrEqual(40);
  });

  it('the tail is darker than the onset (one-pole low-pass that closes over time)', () => {
    const decayS = 1.6;
    const out = new Float32Array(Math.floor(SR * decayS));
    renderImpulseResponse(out, SR, decayS, 5);
    // zero-crossing rate as a cheap brightness proxy
    const zcr = (from: number, to: number): number => {
      let z = 0;
      for (let i = from + 1; i < to; i++) {
        if ((out[i] as number) * (out[i - 1] as number) < 0) z++;
      }
      return z / (to - from);
    };
    const onset = zcr(0, Math.floor(SR * 0.05));
    const tail = zcr(Math.floor(SR * 1.0), Math.floor(SR * 1.2));
    expect(tail).toBeLessThan(onset);
  });
});
