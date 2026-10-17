// Procedural reverb impulse response (ADR-002): noise burst with exponential decay that follows the decay it is
// given (the signature's RT60, D-021) and is never longer than 2.0 s (NFR-PERF-10). The 0.3–2.0 s clamp of
// FR-ROOM-06 is not audio's: garden/ owns it with the room signature (T-141). T-172: one wet level in every room
// (P-022), a pre-delay and a damping by room size (P-010).
import { describe, expect, it } from 'vitest';

import { Engine } from '../../../src/audio/AudioEngine.js';
import {
  IR_ENERGY,
  IR_PREDELAY_S,
  IR_SEED,
  REVERB_IR_MAX_S,
  REVERB_SEND,
  REVERB_SMALL_RT60_S,
} from '../../../src/audio/config.js';
import { impulseLength, impulseRenderer, renderImpulseResponse } from '../../../src/audio/Reverb.js';
import { REVERB_RT60_DEFAULT_S, REVERB_RT60_STEPS_S, WANDERER } from '../../../src/garden/index.js';

import { FakeAudioContext, last, type FakeBuffer, type FakeNode } from './fakeAudio.js';

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
/** Σ v² of one channel. */
const energy = (samples: Float32Array): number => samples.reduce((sum, v) => sum + v * v, 0);
/** Zero crossings per sample over [from, to): a cheap brightness proxy. */
function zcr(samples: Float32Array, from: number, to: number): number {
  let z = 0;
  for (let i = from + 1; i < to; i++) {
    if ((samples[i] as number) * (samples[i - 1] as number) < 0) z++;
  }
  return z / (to - from);
}
/** One channel of the response of a decay, and the sample its tail starts at: the first that is not 0. */
function response(rt60: number, seed = IR_SEED): { ir: Float32Array; onset: number } {
  const ir = new Float32Array(impulseLength(SR, rt60));
  renderImpulseResponse(ir, SR, rt60, seed);
  return { ir, onset: ir.findIndex((v) => v !== 0) };
}

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

  it('has the energy of every response (P-022), is bounded to ±1 and decays by ≥ 40 dB over its length', () => {
    const decayS = 1.6;
    const out = new Float32Array(Math.floor(SR * decayS));
    renderImpulseResponse(out, SR, decayS, 5);
    let p = 0;
    for (let i = 0; i < out.length; i++) p = Math.max(p, Math.abs(out[i] as number));
    expect(p).toBeLessThanOrEqual(1);
    expect(energy(out)).toBeCloseTo(IR_ENERGY, 6);
    const head = rms(out, 0, Math.floor(SR * 0.05));
    const tail = rms(out, out.length - Math.floor(SR * 0.1), out.length);
    expect(db(head) - db(tail)).toBeGreaterThanOrEqual(40);
  });

  it('the tail is darker than the onset (one-pole low-pass that closes over time)', () => {
    const { ir, onset } = response(1.6, 5);
    expect(zcr(ir, Math.floor(SR * 1.0), Math.floor(SR * 1.2))).toBeLessThan(
      zcr(ir, onset, onset + Math.floor(SR * 0.05)),
    );
  });
});

describe('impulseRenderer: a response a slice at a time (T-143)', () => {
  it('renders at most the samples asked for per call, is done only when whole, and gives the same samples as one render', () => {
    const decayS = 0.5;
    const ir = new FakeAudioContext().audio.createBuffer(2, impulseLength(SR, decayS), SR);
    const step = impulseRenderer(ir, decayS, 7);
    // Samples rendered: up to the last one that is not 0 (the pre-delay is silence, P-010).
    const filled = (): number =>
      [0, 1].reduce((n, ch) => {
        const data = ir.getChannelData(ch);
        let end = data.length;
        while (end > 0 && data[end - 1] === 0) end--;
        return n + end;
      }, 0);

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
    // T-172 (measured 2026-10-17): T-121's noise, low-pass and decay, now after the room's pre-delay, closing to
    // its damping and scaled to IR_ENERGY (P-010, P-022). A change to any of them moves the numbers by far more
    // than the 6 decimals asked for. Listen before changing them.
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
    const near = (values: number[]): unknown[] => values.map((v): unknown => expect.closeTo(v, 6));
    expect(sums(ir.getChannelData(0))).toEqual(near([0.199017, IR_ENERGY, 12.756085]));
    expect(sums(ir.getChannelData(1))).toEqual(near([0.400098, IR_ENERGY, 21.361323]));
  });
});

/**
 * The one scale a ConvolverNode with `normalize` on puts on a response when it is set (Web Audio spec, ConvolverNode,
 * "calculateNormalizationScale"): 0.00125 over the RMS of all its samples, times 44100 over its sample rate.
 */
function normalizationScale(ir: FakeBuffer): number {
  let power = 0;
  for (let ch = 0; ch < ir.numberOfChannels; ch++) power += energy(ir.getChannelData(ch));
  const rms = Math.max(Math.sqrt(power / (ir.numberOfChannels * ir.length)), 0.000125); // the spec's MinPower
  return ((0.00125 / rms) * 44100) / ir.sampleRate;
}

/**
 * The reverb's wet output, dB per channel, for a steady white input of power 1 into its send. Noise through a filter
 * comes out at its own power times the filter's energy: send² · Σh² · return², h as the convolver plays it, with
 * `normalize` as the engine set it unless told. The high-pass ahead of the send is the same in every room: left out.
 */
function wetDb(ctx: FakeAudioContext, normalize?: boolean): number[] {
  const convolver = ctx.of('convolver')[0] as FakeNode;
  const send = (convolver.inputs[0] as FakeNode).gain.value;
  const wet = (convolver.outputs[0] as FakeNode).gain.value;
  const ir = convolver.buffer as FakeBuffer;
  const scale = (normalize ?? convolver.normalize) ? normalizationScale(ir) : 1;
  return [0, 1].map((ch) => 10 * Math.log10(energy(ir.getChannelData(ch)) * (scale * send * wet) ** 2));
}

/** The engine's reverb in a room of decay `rt60`, as a render test has it: init() renders the response whole. */
async function reverbIn(rt60: number): Promise<FakeAudioContext> {
  const ctx = new FakeAudioContext();
  Object.defineProperty(ctx, 'startRendering', { value: () => Promise.resolve() }); // no tick, no timer
  const engine = new Engine();
  engine.setSignature({ ...WANDERER, reverbRt60: rt60 });
  await engine.init(ctx.audio);
  return ctx;
}

describe('the reverb is as wet in every room (P-022)', () => {
  it('a steady input leaves the reverb at one level in each of the six rooms, the default room at the level it had', async () => {
    const rooms = await Promise.all(REVERB_RT60_STEPS_S.map(reverbIn));
    expect(rooms.map((ctx) => (ctx.of('convolver')[0] as FakeNode).normalize)).toEqual(
      rooms.map(() => false),
    );
    const levels = rooms.flatMap((ctx) => wetDb(ctx));
    expect(Math.max(...levels) - Math.min(...levels)).toBeLessThan(0.05);
    // The check does catch the old graph: with normalize on, the same responses come out 8.2 dB apart.
    const normalized = rooms.map((ctx) => wetDb(ctx, true)[0] as number);
    expect(last(normalized) - (normalized[0] as number)).toBeCloseTo(10 * Math.log10(2.0 / 0.3), 1);
    // IR_ENERGY is what normalize gave the default room's response: that room is as wet as before.
    const room = rooms[REVERB_RT60_STEPS_S.indexOf(REVERB_RT60_DEFAULT_S)] as FakeAudioContext;
    const [before, now] = [wetDb(room, true), wetDb(room)];
    for (const ch of [0, 1])
      expect(Math.abs((now[ch] as number) - (before[ch] as number))).toBeLessThan(0.15);
  });
});

describe('pre-delay and damping by room size (P-010)', () => {
  it('the tail starts 5 ms in the smallest room, 25 ms in the largest, in proportion between; the length stays one RT60', () => {
    expect(IR_PREDELAY_S).toEqual([0.005, 0.025]);
    for (const [rt60, ms] of [
      [0.3, 5],
      [REVERB_RT60_DEFAULT_S, 12.06],
      [2.0, 25],
    ] as const) {
      const { ir, onset } = response(rt60);
      expect((1000 * onset) / SR).toBeCloseTo(ms, 1);
      expect(ir.length).toBe(Math.floor(SR * rt60)); // the tail is cut where the response ends, never lengthened
    }
    expect(response(2.0).ir.length).toBe(SR * REVERB_IR_MAX_S);
  });

  it("the damping by room shapes the late tail only: in the last quarter of its decay (under −45 dB) the largest room's is darker than the smallest's", () => {
    const lastQuarter = (rt60: number): number => {
      let sum = 0;
      for (let seed = 1; seed <= 4; seed++) {
        const { ir, onset } = response(rt60, seed);
        sum += zcr(ir, onset + Math.floor(0.75 * (ir.length - onset)), ir.length);
      }
      return sum / 4;
    };
    expect(lastQuarter(2.0)).toBeLessThan(lastQuarter(0.3) - 0.01);
  });
});
