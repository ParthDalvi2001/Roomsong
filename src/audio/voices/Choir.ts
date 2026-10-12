// Choir (LLD §7): a narrow pulse through three formant band-passes in parallel, with a slow vibrato.
// Hue (cutoffMul) moves the three formants together, so the vowel darkens or brightens and the pitch stays;
// height sets gain and the hold/release length. The pulse is a PeriodicWave made once. Stateless (see Bell).
import {
  CHOIR_ATTACK_S,
  CHOIR_FORMANT_HUE_OCTAVES,
  CHOIR_FORMANT_Q,
  CHOIR_FORMANTS_HZ,
  CHOIR_HOLD_MUL,
  CHOIR_PULSE_DUTY,
  CHOIR_PULSE_LEVEL,
  CHOIR_PULSE_PARTIALS,
  CHOIR_RELEASE_TAU_DIV,
  CHOIR_TAIL_TAUS,
  CHOIR_VIBRATO_CENTS,
  CHOIR_VIBRATO_HZ,
} from '../config.js';

import type { NoteRef, Voice, VoiceParams } from './note.js';

/**
 * Cosine terms 1..CHOIR_PULSE_PARTIALS of a rectangular pulse CHOIR_PULSE_LEVEL high and CHOIR_PULSE_DUTY of the
 * period wide, centred on the start of the cycle; index 0 (DC) is unused.
 */
export function choirPartials(): Float32Array {
  const cosines = new Float32Array(CHOIR_PULSE_PARTIALS + 1);
  for (let k = 1; k <= CHOIR_PULSE_PARTIALS; k++) {
    cosines[k] = ((2 * CHOIR_PULSE_LEVEL) / (Math.PI * k)) * Math.sin(Math.PI * k * CHOIR_PULSE_DUTY);
  }
  return cosines;
}

export class Choir implements Voice {
  private readonly pulse: PeriodicWave;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly ref: NoteRef,
  ) {
    // MDN createPeriodicWave(real, imag, { disableNormalization }): the terms are played as given, so the level
    // is the one worked out here and not the browser's rescaling to a peak of 1.
    this.pulse = ctx.createPeriodicWave(choirPartials(), new Float32Array(CHOIR_PULSE_PARTIALS + 1), {
      disableNormalization: true,
    });
  }

  trigger(time: number, p: VoiceParams, out: AudioNode): void {
    const ctx = this.ctx;
    const relTau = p.release / CHOIR_RELEASE_TAU_DIV;
    const releaseAt = time + CHOIR_ATTACK_S + p.release * CHOIR_HOLD_MUL;
    const end = releaseAt + CHOIR_TAIL_TAUS * relTau;

    const source = ctx.createOscillator();
    source.setPeriodicWave(this.pulse);
    source.frequency.value = p.hz;
    source.detune.value = p.detune;

    // The vibrato adds to the detune parameter, in cents, so the note wobbles around its own in-tune pitch.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = CHOIR_VIBRATO_HZ;
    const depth = ctx.createGain();
    depth.gain.value = CHOIR_VIBRATO_CENTS;
    lfo.connect(depth).connect(source.detune);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(p.gain, time + CHOIR_ATTACK_S);
    env.gain.setTargetAtTime(0, releaseAt, relTau);
    env.connect(out);

    const shift = Math.pow(p.cutoffMul, CHOIR_FORMANT_HUE_OCTAVES);
    for (let i = 0; i < CHOIR_FORMANTS_HZ.length; i++) {
      const formant = ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.value = (CHOIR_FORMANTS_HZ[i] as number) * shift;
      formant.Q.value = CHOIR_FORMANT_Q;
      source.connect(formant).connect(env);
    }

    source.start(time);
    lfo.start(time);
    source.stop(end);
    lfo.stop(end);
    const note = this.ref.note;
    note.begin(time, end, env, p.gain, releaseAt, relTau);
    note.add(source);
    note.add(lfo);
  }

  dispose(): void {
    // Nothing persistent but the pulse, which is not a node (see Bell).
  }
}
