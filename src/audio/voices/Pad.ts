// Pad (LLD §7): three detuned sawtooths → resonant low-pass (cutoff from hue) → slow 0.4 s attack.
// Height sets gain and the hold/release length, so tall pads overlap into a drone. Stateless (see Bell); its values
// are the recipe's (see Bell).
import {
  PAD_CUTOFF_CLOSED_MUL,
  PAD_CUTOFF_MAX_HZ,
  PAD_CUTOFF_MIN_HZ,
  PAD_CUTOFF_REST_MUL,
  PAD_SAW_LEVEL,
  PAD_TAIL_TAUS,
} from '../config.js';
import { TODAY, type Recipe } from '../styles.js';

import type { NoteRef, Voice, VoiceParams } from './note.js';

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export class Pad implements Voice {
  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly ref: NoteRef,
    private readonly r: Readonly<Recipe> = TODAY,
  ) {}

  trigger(time: number, p: VoiceParams, out: AudioNode): void {
    const ctx = this.ctx;
    const r = this.r;
    const attack = r.padAttackS;
    const hold = p.release * r.padHoldMul;
    const relTau = p.release / r.padReleaseTauDiv;
    const releaseAt = time + attack + hold;
    const end = releaseAt + PAD_TAIL_TAUS * relTau;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = r.padFilterQ;
    const open = clamp(p.hz * r.padCutoffOpenMul * p.cutoffMul, PAD_CUTOFF_MIN_HZ, PAD_CUTOFF_MAX_HZ);
    filter.frequency.setValueAtTime(open * PAD_CUTOFF_CLOSED_MUL, time);
    filter.frequency.exponentialRampToValueAtTime(open, time + attack);
    filter.frequency.setTargetAtTime(open * PAD_CUTOFF_REST_MUL, releaseAt, relTau);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(p.gain * PAD_SAW_LEVEL, time + attack);
    env.gain.setTargetAtTime(0, releaseAt, relTau);
    filter.connect(env).connect(out);

    const note = this.ref.note;
    note.begin(time, end, env, p.gain * PAD_SAW_LEVEL, releaseAt, relTau);
    const detune = r.padDetuneCents;
    for (let i = 0; i < detune.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = p.hz;
      osc.detune.value = (detune[i] as number) + p.detune;
      osc.connect(filter);
      osc.start(time);
      osc.stop(end);
      note.add(osc);
    }
  }

  dispose(): void {
    // Nothing persistent (see Bell).
  }
}
