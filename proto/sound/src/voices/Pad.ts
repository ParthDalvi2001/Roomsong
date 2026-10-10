// Pad (LLD §7): three detuned sawtooths → resonant low-pass (cutoff from hue) → slow 0.4 s attack.
// Height sets gain and the hold/release length, so tall pads overlap into a drone.
import {
  PAD_ATTACK_S,
  PAD_CUTOFF_CLOSED_MUL,
  PAD_CUTOFF_MAX_HZ,
  PAD_CUTOFF_MIN_HZ,
  PAD_CUTOFF_OPEN_MUL,
  PAD_CUTOFF_REST_MUL,
  PAD_DETUNE_CENTS,
  PAD_FILTER_Q,
  PAD_HOLD_MUL,
  PAD_RELEASE_TAU_DIV,
  PAD_SAW_LEVEL,
  PAD_TAIL_TAUS,
} from '../config';

import { ScheduledNote } from './note';

import type { Voice, VoiceParams } from '../types';
import type { VoicePool } from '../VoicePool';

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export class Pad implements Voice {
  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly output: AudioNode,
    private readonly pool: VoicePool,
  ) {}

  trigger(time: number, p: VoiceParams): void {
    const ctx = this.ctx;
    const hold = p.release * PAD_HOLD_MUL;
    const relTau = p.release / PAD_RELEASE_TAU_DIV;
    const releaseAt = time + PAD_ATTACK_S + hold;
    const end = releaseAt + PAD_TAIL_TAUS * relTau;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = PAD_FILTER_Q;
    const open = clamp(p.hz * PAD_CUTOFF_OPEN_MUL * p.cutoffMul, PAD_CUTOFF_MIN_HZ, PAD_CUTOFF_MAX_HZ);
    filter.frequency.setValueAtTime(open * PAD_CUTOFF_CLOSED_MUL, time);
    filter.frequency.exponentialRampToValueAtTime(open, time + PAD_ATTACK_S);
    filter.frequency.setTargetAtTime(open * PAD_CUTOFF_REST_MUL, releaseAt, relTau);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(p.gain * PAD_SAW_LEVEL, time + PAD_ATTACK_S);
    env.gain.setTargetAtTime(0, releaseAt, relTau);
    filter.connect(env).connect(this.output);

    const sources: OscillatorNode[] = [];
    for (let i = 0; i < PAD_DETUNE_CENTS.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = p.hz;
      osc.detune.value = (PAD_DETUNE_CENTS[i] as number) + p.detune;
      osc.connect(filter);
      osc.start(time);
      osc.stop(end);
      sources.push(osc);
    }
    this.pool.admit(
      new ScheduledNote(time, end, env, sources, p.gain * PAD_SAW_LEVEL, releaseAt, relTau),
      time,
    );
  }

  dispose(): void {
    // Nothing persistent (see Bell).
  }
}
