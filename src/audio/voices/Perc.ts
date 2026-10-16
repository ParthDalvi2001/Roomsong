// Soft percussion (T-164, SOUND_PASS_T164.md §1.6), all synthesized: a felt kick, the Bass wave with a falling
// pitch so a small speaker carries it; and noise hits (shaker, tick, breath), one noise buffer rendered once and
// played through a filter. They take pooled channels like every note (FR-MUS-07) and play only `p.gain`: pitch,
// filter and length are the voice's own. Stateless per note (see Bell).
import {
  KICK_ATTACK_S,
  KICK_DROP_S,
  KICK_END_HZ,
  KICK_START_HZ,
  KICK_TAU_S,
  PERC_TAIL_TAUS,
  type NoiseShape,
} from '../config.js';

import type { NoteRef, Voice, VoiceParams } from './note.js';

/** Fill `out` with white noise in −1..1, mulberry32 written out in the loop as in karplus.ts. */
export function renderNoise(out: Float32Array, seed: number): void {
  let s = seed | 0;
  for (let i = 0; i < out.length; i++) {
    s = (s + 0x6d2b79f5) | 0;
    let r = Math.imul(s ^ (s >>> 15), s | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    out[i] = (((r ^ (r >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  }
}

export class Kick implements Voice {
  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly ref: NoteRef,
    private readonly wave: PeriodicWave,
  ) {}

  trigger(time: number, p: VoiceParams, out: AudioNode): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.wave);
    osc.frequency.setValueAtTime(KICK_START_HZ, time);
    osc.frequency.exponentialRampToValueAtTime(KICK_END_HZ, time + KICK_DROP_S);
    const peakAt = time + KICK_ATTACK_S;
    const end = peakAt + PERC_TAIL_TAUS * KICK_TAU_S;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(p.gain, peakAt);
    env.gain.setTargetAtTime(0, peakAt, KICK_TAU_S);
    osc.connect(env).connect(out);
    osc.start(time);
    osc.stop(end);
    const note = this.ref.note;
    note.begin(time, end, env, p.gain, peakAt, KICK_TAU_S);
    note.add(osc);
  }

  dispose(): void {
    // Nothing persistent (see Bell).
  }
}

export class Noise implements Voice {
  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly ref: NoteRef,
    private readonly buffer: AudioBuffer,
    private readonly shape: NoiseShape,
  ) {}

  trigger(time: number, p: VoiceParams, out: AudioNode): void {
    const ctx = this.ctx;
    const s = this.shape;
    const src = ctx.createBufferSource();
    src.buffer = this.buffer;
    src.loop = true; // the breath swells for longer than the buffer lasts
    const filter = ctx.createBiquadFilter();
    filter.type = s.type;
    filter.frequency.value = s.hz;
    filter.Q.value = s.q;
    const peakAt = time + s.attackS;
    const end = peakAt + PERC_TAIL_TAUS * s.tauS;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(p.gain, peakAt);
    env.gain.setTargetAtTime(0, peakAt, s.tauS);
    src.connect(filter).connect(env).connect(out);
    src.start(time);
    src.stop(end);
    const note = this.ref.note;
    note.begin(time, end, env, p.gain, peakAt, s.tauS);
    note.add(src);
  }

  dispose(): void {
    // Nothing persistent but the buffer, which the engine's layers hold (see Bell).
  }
}
