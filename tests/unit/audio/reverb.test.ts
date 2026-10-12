// Procedural reverb impulse response (ADR-002): noise burst with exponential decay that follows the decay it is
// given (the signature's RT60, D-021) and is never longer than 2.0 s (NFR-PERF-10). The 0.3–2.0 s clamp of
// FR-ROOM-06 is not audio's: garden/ owns it with the room signature (T-141).
import { describe, expect, it } from 'vitest';

import { IR_SEED, REVERB_IR_MAX_S, REVERB_SEND, REVERB_SMALL_RT60_S } from '../../../src/audio/config.js';
import { impulseLength, impulseRenderer, renderImpulseResponse } from '../../../src/audio/Reverb.js';

import { FakeAudioContext } from './fakeAudio.js';

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
  it('the impulse response lasts one RT60, never more than 2.0 s, and is never empty', () => {
    expect(REVERB_IR_MAX_S).toBe(2);
    expect(REVERB_SMALL_RT60_S).toBe(0.6);
    expect(impulseLength(SR, 0.3)).toBe(Math.floor(SR * 0.3));
    expect(impulseLength(SR, 2.0)).toBe(Math.floor(SR * 2.0));
    expect(impulseLength(SR, 5)).toBe(SR * 2);
    expect(impulseLength(SR, 0.000001)).toBe(1); // createBuffer rejects a length of 0
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

describe('impulseRenderer: a response a slice at a time (T-143)', () => {
  it('renders at most the samples asked for per call, is done only when whole, and gives the same samples as one render', () => {
    const decayS = 0.5;
    const ir = new FakeAudioContext().audio.createBuffer(2, impulseLength(SR, decayS), SR);
    const step = impulseRenderer(ir, decayS, 7);
    const filled = (): number =>
      [0, 1].reduce((n, ch) => n + ir.getChannelData(ch).filter((v) => v !== 0).length, 0);

    expect(filled()).toBe(0); // making the renderer renders nothing
    expect(step(1000)).toBe(false);
    expect(filled()).toBeGreaterThan(900);
    expect(filled()).toBeLessThanOrEqual(1000);
    let calls = 1;
    for (let done = false; !done; calls++) done = step(1000);
    expect(calls).toBe((2 * ir.length) / 1000); // 24 slices a channel, the left one first
    expect(step(1000)).toBe(true); // a call too many changes nothing: the samples below are not scaled twice

    for (let ch = 0; ch < 2; ch++) {
      const whole = new Float32Array(ir.length);
      renderImpulseResponse(whole, SR, decayS, 7 + ch); // the right channel has the next seed
      expect(ir.getChannelData(ch)).toEqual(whole);
    }
  });

  it('the response itself is pinned: three sums over the samples of the default 0.9 s response, left and right', () => {
    // Sliced and whole run the same code, so the test above pins no sound. These numbers are the response of
    // T-121 (measured 2026-10-12, before T-143 touched the loop): a change to the noise, to the low-pass or to
    // the decay moves them by far more than the 4 decimals asked for. Listen before changing them.
    const ir = new FakeAudioContext().audio.createBuffer(2, impulseLength(SR, 0.9), SR);
    const step = impulseRenderer(ir, 0.9, IR_SEED);
    while (!step(8000));
    const sums = (samples: Float32Array): number[] => {
      let sum = 0;
      let energy = 0;
      let weighted = 0; // by position, so that the same samples in another order do not pass
      for (let i = 0; i < samples.length; i++) {
        const v = samples[i] as number;
        sum += v;
        energy += v * v;
        weighted += v * (i % 97);
      }
      return [sum, energy, weighted];
    };
    const near = (values: number[]): unknown[] => values.map((v): unknown => expect.closeTo(v, 4));
    expect(sums(ir.getChannelData(0))).toEqual(near([24.667248, 882.745704, 2568.069268]));
    expect(sums(ir.getChannelData(1))).toEqual(near([50.538513, 912.130053, 2026.11167]));
  });
});
