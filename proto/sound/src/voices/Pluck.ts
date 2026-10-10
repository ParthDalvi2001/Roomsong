// Pluck (LLD §7): Karplus-Strong string rendered once per plant by pure code (see karplus.ts for why a native
// DelayNode loop cannot reach C4+), played through an AudioBufferSourceNode with an envelope from height.
// Hue (cutoffMul) → string damping (brighter = longer ring); re-tune re-renders the string outside the tick.
import {
  CENTS_PER_OCTAVE,
  PLUCK_BUFFER_S,
  PLUCK_DAMPING_MAX,
  PLUCK_DAMPING_MID,
  PLUCK_DAMPING_MIN,
  PLUCK_DAMPING_PER_OCTAVE,
  PLUCK_LEVEL,
  PLUCK_RELEASE_START_MUL,
  PLUCK_RELEASE_TAU_MUL,
  PLUCK_TAIL_TAUS,
} from '../config';
import { renderKarplusStrong } from '../karplus';

import { ScheduledNote } from './note';

import type { Voice, VoiceParams } from '../types';
import type { VoicePool } from '../VoicePool';

export class Pluck implements Voice {
  private buffer: AudioBuffer | null = null;
  private bufferHz = 0;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly output: AudioNode,
    private readonly pool: VoicePool,
    private readonly seed: number,
  ) {}

  /** Render the string for this plant's pitch and hue. Called by the engine on sync and re-tune, never in the tick. */
  prepare(p: VoiceParams): void {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(sr * PLUCK_BUFFER_S), sr);
    const dampingRaw = PLUCK_DAMPING_MID - PLUCK_DAMPING_PER_OCTAVE * Math.log2(p.cutoffMul);
    const damping =
      dampingRaw < PLUCK_DAMPING_MIN
        ? PLUCK_DAMPING_MIN
        : dampingRaw > PLUCK_DAMPING_MAX
          ? PLUCK_DAMPING_MAX
          : dampingRaw;
    renderKarplusStrong(buf.getChannelData(0), sr, p.hz, damping, this.seed);
    this.buffer = buf;
    this.bufferHz = p.hz;
  }

  trigger(time: number, p: VoiceParams): void {
    if (this.buffer === null) this.prepare(p); // fallback only; the engine prepares ahead of time
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = (p.hz / this.bufferHz) * Math.pow(2, p.detune / CENTS_PER_OCTAVE);

    const releaseAt = time + p.release * PLUCK_RELEASE_START_MUL;
    const tau = p.release * PLUCK_RELEASE_TAU_MUL;
    const env = ctx.createGain();
    env.gain.setValueAtTime(p.gain * PLUCK_LEVEL, time);
    env.gain.setTargetAtTime(0, releaseAt, tau);
    src.connect(env).connect(this.output);

    const end = Math.min(time + PLUCK_BUFFER_S, releaseAt + PLUCK_TAIL_TAUS * tau);
    src.start(time);
    src.stop(end);
    this.pool.admit(new ScheduledNote(time, end, env, [src], p.gain * PLUCK_LEVEL, releaseAt, tau), time);
  }

  dispose(): void {
    this.buffer = null;
  }
}
