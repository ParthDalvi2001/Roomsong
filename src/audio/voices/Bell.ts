// Bell (LLD §7): 2-operator FM, ratio 3.5, modulation index decays, exponential amplitude decay.
// Hue (cutoffMul) scales the onset index → brighter or mellower strike; height sets gain and decay length.
// Stateless: one instance plays every bell note, on whichever voice channel it is handed.
import {
  BELL_ATTACK_S,
  BELL_FM_INDEX,
  BELL_FM_INDEX_FLOOR,
  BELL_FM_INDEX_TAU_S,
  BELL_FM_RATIO,
  BELL_RELEASE_TAU_DIV,
  BELL_TAIL_TAUS,
} from '../config.js';

import type { NoteRef, Voice, VoiceParams } from './note.js';

export class Bell implements Voice {
  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly ref: NoteRef,
  ) {}

  trigger(time: number, p: VoiceParams, out: AudioNode): void {
    const ctx = this.ctx;
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = p.hz;
    carrier.detune.value = p.detune;

    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = p.hz * BELL_FM_RATIO;
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(BELL_FM_INDEX * p.cutoffMul * p.hz, time);
    modGain.gain.setTargetAtTime(BELL_FM_INDEX_FLOOR * p.hz, time, BELL_FM_INDEX_TAU_S);
    mod.connect(modGain).connect(carrier.frequency);

    const tau = p.release / BELL_RELEASE_TAU_DIV;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(p.gain, time + BELL_ATTACK_S);
    env.gain.setTargetAtTime(0, time + BELL_ATTACK_S, tau);
    carrier.connect(env).connect(out);

    const end = time + BELL_ATTACK_S + p.release + BELL_TAIL_TAUS * tau;
    carrier.start(time);
    mod.start(time);
    carrier.stop(end);
    mod.stop(end);
    const note = this.ref.note;
    note.begin(time, end, env, p.gain, time + BELL_ATTACK_S, tau);
    note.add(carrier);
    note.add(mod);
  }

  dispose(): void {
    // Nothing persistent: a note's nodes are single-use and finish on their own.
  }
}
