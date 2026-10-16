// Pluck (LLD §7): a Karplus-Strong string rendered by pure code (see karplus.ts for why a native DelayNode loop
// cannot reach C4+), played through an AudioBufferSourceNode with an envelope from height.
// Hue (cutoffMul) → string damping (brighter = longer ring). Strings are cached per pitch and damping step, not per
// plant: at most RINGS × PLUCK_DAMPING_BUCKETS buffers in one key, about 6 MB at 48 kHz.
// A string is asked for (`prepare`) and rendered later, a few per tick (`render`), so neither a re-tune nor a
// restored garden renders a whole key in one call (T-143). Until its own string is ready a note plays the nearest
// ready one, re-pitched.
import {
  A4_HZ,
  CENTS_PER_OCTAVE,
  FLAT_Q_DB,
  HUE_CUTOFF_OCTAVES,
  PLUCK_BUFFER_S,
  PLUCK_DAMPING_BUCKETS,
  PLUCK_DAMPING_MAX,
  PLUCK_DAMPING_MID,
  PLUCK_DAMPING_MIN,
  PLUCK_DAMPING_PER_OCTAVE,
  PLUCK_LEVEL,
  PLUCK_RELEASE_TAU_MUL,
  PLUCK_TAIL_TAUS,
} from '../config.js';
import { renderKarplusStrong } from '../karplus.js';
import { TODAY, type Recipe } from '../styles.js';

import type { Note, NoteRef, Voice, VoiceParams } from './note.js';

/** String damping 0..1 for a cutoff multiplier: a brighter hue is damped less. */
export function pluckDamping(cutoffMul: number): number {
  const raw = PLUCK_DAMPING_MID - PLUCK_DAMPING_PER_OCTAVE * Math.log2(cutoffMul);
  return raw < PLUCK_DAMPING_MIN ? PLUCK_DAMPING_MIN : raw > PLUCK_DAMPING_MAX ? PLUCK_DAMPING_MAX : raw;
}

/**
 * One pluck: `buffer`, a string rendered at `bufferHz`, through an envelope into `out`. Fills `note`. A recipe with
 * an attack ramps the string in (a felt hammer), one with a low-pass multiplier adds a low-pass at that × the note.
 */
export function playString(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  bufferHz: number,
  time: number,
  p: VoiceParams,
  out: AudioNode,
  note: Note,
  r: Readonly<Recipe> = TODAY,
): void {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const rate = (p.hz / bufferHz) * Math.pow(2, p.detune / CENTS_PER_OCTAVE);
  src.playbackRate.value = rate;

  const releaseAt = time + p.release * r.pluckReleaseStartMul;
  const tau = p.release * PLUCK_RELEASE_TAU_MUL;
  const env = ctx.createGain();
  if (r.pluckAttackS > 0) {
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(p.gain * PLUCK_LEVEL, time + r.pluckAttackS);
  } else {
    env.gain.setValueAtTime(p.gain * PLUCK_LEVEL, time);
  }
  env.gain.setTargetAtTime(0, releaseAt, tau);
  if (r.pluckLpfMul > 0) {
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.Q.value = FLAT_Q_DB;
    lpf.frequency.value = p.hz * r.pluckLpfMul;
    src.connect(lpf).connect(env);
  } else {
    src.connect(env);
  }
  env.connect(out);

  // The buffer lasts PLUCK_BUFFER_S ÷ rate: a string played slower is stopped at its own faded end, not inside it.
  const end = Math.min(time + PLUCK_BUFFER_S / rate, releaseAt + PLUCK_TAIL_TAUS * tau);
  src.start(time);
  src.stop(end);
  note.begin(time, end, env, p.gain * PLUCK_LEVEL, releaseAt, tau);
  note.add(src);
}

/** Which of the PLUCK_DAMPING_BUCKETS steps across the hue range a cutoff multiplier falls in. */
function bucketOf(cutoffMul: number): number {
  const u = (Math.log2(cutoffMul) / HUE_CUTOFF_OCTAVES + 1) / 2;
  const b = Math.floor(u * PLUCK_DAMPING_BUCKETS);
  return b < 0 ? 0 : b >= PLUCK_DAMPING_BUCKETS ? PLUCK_DAMPING_BUCKETS - 1 : b;
}

/** A string that is asked for and not rendered yet, with the buffer made for it. */
interface Waiting {
  hz: number;
  bucket: number;
  buffer: AudioBuffer;
}

export class Pluck implements Voice {
  // The rendered strings, as three parallel arrays: finding one in the tick allocates nothing.
  private readonly hz: number[] = [];
  private readonly bucket: number[] = [];
  private readonly buffers: AudioBuffer[] = [];
  /** The strings asked for and not rendered yet, oldest first. */
  private readonly waiting: Waiting[] = [];

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly ref: NoteRef,
    /** The recipe (see Bell); its strings ring for its T60, so the engine disposes them when it changes style. */
    private readonly r: Readonly<Recipe> = TODAY,
  ) {}

  /**
   * Ask for the string of this pitch and hue; nothing is rendered here. The engine calls this on plant sync and on
   * a re-tune, and `render` from its tick. The string's buffer is made here, in the call, so that the tick which
   * renders it makes no object (NFR-PERF-08).
   */
  prepare(p: VoiceParams): void {
    const b = bucketOf(p.cutoffMul);
    if (this.readyAt(p.hz, b) >= 0 || this.waitingAt(p.hz, b) >= 0) return;
    const sr = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.floor(sr * PLUCK_BUFFER_S), sr);
    this.waiting.push({ hz: p.hz, bucket: b, buffer });
  }

  /**
   * Render one string to no buffer, so that the render loop is compiled before a tick needs it. The engine calls
   * this in init(). The first string of a process takes 4 to 5 ms in Node on a laptop, the next ones 0.3 ms.
   * shortcut: a browser may drop compiled code it has not run for minutes, and the next string then costs one
   * tick of that size again; render strings in slices of samples, as Reverb.ts does, if a device shows it (T-129).
   */
  warmUp(): void {
    const sr = this.ctx.sampleRate;
    renderKarplusStrong(new Float32Array(Math.floor(sr * PLUCK_BUFFER_S)), sr, A4_HZ, PLUCK_DAMPING_MID, 1);
  }

  /** Render up to `count` of the strings asked for, oldest first. False = none was waiting. */
  render(count: number): boolean {
    const n = Math.min(count, this.waiting.length);
    for (let i = 0; i < n; i++) this.renderWaiting(0);
    return n > 0;
  }

  trigger(time: number, p: VoiceParams, out: AudioNode): void {
    const b = bucketOf(p.cutoffMul);
    let i = this.readyAt(p.hz, b);
    // Not rendered yet: the nearest ready string, which playString re-pitches to the note (LLD §7). None is ready
    // only when nothing was rendered since the last dispose(), which a running engine never meets (its tick renders
    // before it schedules): then this one string is asked for and rendered here, ahead of any other that waits.
    if (i < 0) i = this.nearest(p.hz, b);
    if (i < 0) {
      this.prepare(p);
      i = this.renderWaiting(this.waitingAt(p.hz, b));
    }
    const buffer = this.buffers[i] as AudioBuffer;
    playString(this.ctx, buffer, this.hz[i] as number, time, p, out, this.ref.note, this.r);
  }

  /** Drop every string, rendered or asked for: the engine calls this on a re-tune, when none fits the new key. */
  dispose(): void {
    this.hz.length = 0;
    this.bucket.length = 0;
    this.buffers.length = 0;
    this.waiting.length = 0;
  }

  /** Where the rendered string of this pitch and damping step is, or −1. */
  private readyAt(hz: number, b: number): number {
    for (let i = 0; i < this.hz.length; i++) if (this.hz[i] === hz && this.bucket[i] === b) return i;
    return -1;
  }

  /** Where the string of this pitch and damping step waits in the queue, or −1. */
  private waitingAt(hz: number, b: number): number {
    for (let i = 0; i < this.waiting.length; i++) {
      const w = this.waiting[i] as Waiting;
      if (w.hz === hz && w.bucket === b) return i;
    }
    return -1;
  }

  /** The ready string nearest in pitch; of two as near, one of the same damping step. −1 = none is ready. */
  private nearest(hz: number, b: number): number {
    let pick = -1;
    let least = Infinity;
    for (let i = 0; i < this.hz.length; i++) {
      const interval = Math.abs(Math.log((this.hz[i] as number) / hz));
      if (interval < least || (interval === least && this.bucket[i] === b)) {
        pick = i;
        least = interval;
      }
    }
    return pick;
  }

  /** Render the waiting string at `at` into its buffer and move it to the rendered ones; its index there. */
  private renderWaiting(at: number): number {
    const { hz, bucket, buffer } = this.waiting[at] as Waiting;
    // Out of the queue with no array made, as splice() would: the ones behind it move up one place.
    this.waiting.copyWithin(at, at + 1);
    this.waiting.length--;
    // Damping of the middle of the step; the seed is fixed per string (CODING_GUIDELINES §9).
    const mid = Math.pow(2, HUE_CUTOFF_OCTAVES * ((2 * (bucket + 0.5)) / PLUCK_DAMPING_BUCKETS - 1));
    const seed = Math.round(hz) * PLUCK_DAMPING_BUCKETS + bucket + 1;
    const data = buffer.getChannelData(0);
    renderKarplusStrong(data, this.ctx.sampleRate, hz, pluckDamping(mid), seed, this.r.stringT60LongS);
    this.hz.push(hz);
    this.bucket.push(bucket);
    return this.buffers.push(buffer) - 1;
  }
}
