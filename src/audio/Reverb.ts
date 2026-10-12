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

/**
 * Samples in the impulse response for a decay of `rt60` seconds: one RT60 long (the tail is at −60 dB there),
 * never above 2.0 s (NFR-PERF-10) and never empty. `rt60` must be above 0.
 */
export function impulseLength(sampleRate: number, rt60: number): number {
  return Math.max(1, Math.floor(sampleRate * Math.min(rt60, REVERB_IR_MAX_S)));
}

/** The render of one channel: what it renders into, and what one slice hands to the next. */
interface ChannelRender {
  out: Float32Array;
  sampleRate: number;
  decayS: number;
  /** The next sample to render. */
  next: number;
  lowPass: number;
  peak: number;
  /** The state of the noise generator, an int32. */
  noise: number;
}

function channelRender(out: Float32Array, sampleRate: number, decayS: number, seed: number): ChannelRender {
  return { out, sampleRate, decayS, next: 0, lowPass: 0, peak: 0, noise: seed | 0 };
}

/**
 * Render up to `samples` more samples of a channel; true once it is whole. The slice that ends a channel also
 * scales all of it to a peak of 1, one more pass over its samples: it is not to be called again after that. A
 * slice makes no object and puts no number on the heap (NFR-PERF-08): the noise is mulberry32 written out in the
 * loop, because a generator called once per sample handed back a float that V8 kept on the heap, 40 bytes a
 * sample (measured in the T-143 review).
 */
function renderChannel(render: ChannelRender, samples: number): boolean {
  const { out, sampleRate, decayS } = render;
  const k = -Math.log(T60_AMPLITUDE) / decayS; // exp(−k·t) reaches −60 dB at t = decayS
  const fadeIn = Math.max(1, Math.floor(sampleRate * IR_FADE_IN_S));
  const end = Math.min(out.length, render.next + samples);
  let y = render.lowPass;
  let peak = render.peak;
  let a = render.noise;
  for (let i = render.next; i < end; i++) {
    const t = i / sampleRate;
    const progress = Math.min(1, t / decayS);
    const coef = IR_LPF_COEF_START + (IR_LPF_COEF_END - IR_LPF_COEF_START) * progress;
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), a | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    const w = (((r ^ (r >>> 14)) >>> 0) / 4294967296) * 2 - 1;
    y = (1 - coef) * w + coef * y;
    // The low-pass removes noise power as it closes, by (1 − coef) / (1 + coef). Undo that, so the broadband
    // level follows exp(−k·t) and the measured RT60 equals `decayS` while the tail still darkens.
    let v = y * Math.sqrt((1 + coef) / (1 - coef)) * Math.exp(-k * t);
    if (i < fadeIn) v *= i / fadeIn;
    out[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  render.next = end;
  render.lowPass = y;
  render.peak = peak;
  render.noise = a;
  if (end < out.length) return false;
  if (peak > 0) {
    const s = 1 / peak;
    for (let i = 0; i < out.length; i++) out[i] = (out[i] as number) * s;
  }
  return true;
}

/**
 * Fill one channel of an impulse response at once. Deterministic for (seed). The engine renders in slices
 * (impulseRenderer); this stays for the sound prototype (proto/sound) and for the tests that measure one channel.
 */
export function renderImpulseResponse(
  out: Float32Array,
  sampleRate: number,
  decayS: number,
  seed: number,
): void {
  renderChannel(channelRender(out, sampleRate, decayS, seed), out.length);
}

/**
 * A whole response a slice at a time, so that no tick pays for one at once (LLD §7.1, T-143): each call of the
 * returned function renders up to `samples` more samples and returns true once `ir` is complete. Channel c has
 * seed + c. The samples are the same whatever the slices. Everything it needs is made here, in the call that
 * asks for the response: a slice makes nothing.
 */
export function impulseRenderer(ir: AudioBuffer, decayS: number, seed: number): (samples: number) => boolean {
  const render = channelRender(ir.getChannelData(0), ir.sampleRate, decayS, seed);
  let channel = 0;
  return (samples) => {
    if (channel >= ir.numberOfChannels) return true;
    if (!renderChannel(render, samples)) return false;
    if (++channel >= ir.numberOfChannels) return true;
    // The same record goes on to the next channel.
    render.out = ir.getChannelData(channel);
    render.next = 0;
    render.lowPass = 0;
    render.peak = 0;
    render.noise = (seed + channel) | 0;
    return false;
  };
}
