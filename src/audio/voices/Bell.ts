// Bell (LLD §7): 2-operator FM, ratio 3.5, modulation index decays, exponential amplitude decay.
// Hue (cutoffMul) scales the onset index → brighter or mellower strike; height sets gain and decay length.
// Stateless: one instance plays every bell note, on whichever voice channel it is handed. Its values are the
// recipe's (styles.ts, T-164): today's unless the engine hands it a style's.
import { BELL_FM_INDEX_TAU_S, BELL_TAIL_TAUS } from '../config.js';
import { TODAY, type Recipe } from '../styles.js';

import type { NoteRef, Voice, VoiceParams } from './note.js';

export class Bell implements Voice {
  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly ref: NoteRef,
    private readonly r: Readonly<Recipe> = TODAY,
  ) {}

  trigger(time: number, p: VoiceParams, out: AudioNode): void {
    const ctx = this.ctx;
    const r = this.r;
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = p.hz;
    carrier.detune.value = p.detune;

    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = p.hz * r.bellFmRatio;
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(r.bellFmIndex * p.cutoffMul * p.hz, time);
    modGain.gain.setTargetAtTime(r.bellFmIndexFloor * p.hz, time, BELL_FM_INDEX_TAU_S);
    mod.connect(modGain).connect(carrier.frequency);

    const attack = r.bellAttackS;
    const tau = p.release / r.bellReleaseTauDiv;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(p.gain, time + attack);
    env.gain.setTargetAtTime(0, time + attack, tau);
    carrier.connect(env).connect(out);

    const end = time + attack + p.release + BELL_TAIL_TAUS * tau;
    carrier.start(time);
    mod.start(time);
    carrier.stop(end);
    mod.stop(end);
    const note = this.ref.note;
    note.begin(time, end, env, p.gain, time + attack, tau);
    note.add(carrier);
    note.add(mod);
  }

  dispose(): void {
    // Nothing persistent: a note's nodes are single-use and finish on their own.
  }
}
