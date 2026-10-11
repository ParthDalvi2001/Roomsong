// Pluck (LLD §7): a Karplus-Strong string rendered by pure code (see karplus.ts for why a native DelayNode loop
// cannot reach C4+), played through an AudioBufferSourceNode with an envelope from height.
// Hue (cutoffMul) → string damping (brighter = longer ring). Strings are cached per pitch and damping step, not per
// plant: at most RINGS × PLUCK_DAMPING_BUCKETS buffers in one key, about 6 MB at 48 kHz.
import {
  CENTS_PER_OCTAVE,
  HUE_CUTOFF_OCTAVES,
  PLUCK_BUFFER_S,
  PLUCK_DAMPING_BUCKETS,
  PLUCK_DAMPING_MAX,
  PLUCK_DAMPING_MID,
  PLUCK_DAMPING_MIN,
  PLUCK_DAMPING_PER_OCTAVE,
  PLUCK_LEVEL,
  PLUCK_RELEASE_START_MUL,
  PLUCK_RELEASE_TAU_MUL,
  PLUCK_TAIL_TAUS,
} from '../config.js';
import { renderKarplusStrong } from '../karplus.js';

import type { Note, NoteRef, Voice, VoiceParams } from './note.js';

/** String damping 0..1 for a cutoff multiplier: a brighter hue is damped less. */
export function pluckDamping(cutoffMul: number): number {
  const raw = PLUCK_DAMPING_MID - PLUCK_DAMPING_PER_OCTAVE * Math.log2(cutoffMul);
  return raw < PLUCK_DAMPING_MIN ? PLUCK_DAMPING_MIN : raw > PLUCK_DAMPING_MAX ? PLUCK_DAMPING_MAX : raw;
}

/** One pluck: `buffer`, a string rendered at `bufferHz`, through an envelope into `out`. Fills `note`. */
export function playString(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  bufferHz: number,
  time: number,
  p: VoiceParams,
  out: AudioNode,
  note: Note,
): void {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = (p.hz / bufferHz) * Math.pow(2, p.detune / CENTS_PER_OCTAVE);

  const releaseAt = time + p.release * PLUCK_RELEASE_START_MUL;
  const tau = p.release * PLUCK_RELEASE_TAU_MUL;
  const env = ctx.createGain();
  env.gain.setValueAtTime(p.gain * PLUCK_LEVEL, time);
  env.gain.setTargetAtTime(0, releaseAt, tau);
  src.connect(env).connect(out);

  const end = Math.min(time + PLUCK_BUFFER_S, releaseAt + PLUCK_TAIL_TAUS * tau);
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

export class Pluck implements Voice {
  // The cache, as three parallel arrays: finding a string in the tick allocates nothing.
  private readonly hz: number[] = [];
  private readonly bucket: number[] = [];
  private readonly buffers: AudioBuffer[] = [];

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly ref: NoteRef,
  ) {}

  /**
   * The string for this pitch and hue, rendered now unless it is cached. The engine calls this on plant sync and on
   * a re-tune, so a trigger in the tick finds its string ready.
   */
  prepare(p: VoiceParams): AudioBuffer {
    const b = bucketOf(p.cutoffMul);
    for (let i = 0; i < this.hz.length; i++) {
      if (this.hz[i] === p.hz && this.bucket[i] === b) return this.buffers[i] as AudioBuffer;
    }
    const sr = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.floor(sr * PLUCK_BUFFER_S), sr);
    // Damping of the middle of the step; the seed is fixed per string (CODING_GUIDELINES §9).
    const mid = Math.pow(2, HUE_CUTOFF_OCTAVES * ((2 * (b + 0.5)) / PLUCK_DAMPING_BUCKETS - 1));
    const seed = Math.round(p.hz) * PLUCK_DAMPING_BUCKETS + b + 1;
    renderKarplusStrong(buffer.getChannelData(0), sr, p.hz, pluckDamping(mid), seed);
    this.hz.push(p.hz);
    this.bucket.push(b);
    this.buffers.push(buffer);
    return buffer;
  }

  trigger(time: number, p: VoiceParams, out: AudioNode): void {
    playString(this.ctx, this.prepare(p), p.hz, time, p, out, this.ref.note);
  }

  /** Drop every cached string: the engine calls this on a re-tune, when none of them fits the new key. */
  dispose(): void {
    this.hz.length = 0;
    this.bucket.length = 0;
    this.buffers.length = 0;
  }
}
