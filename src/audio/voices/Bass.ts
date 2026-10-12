// Bass (LLD §7): a sine plus its 2nd harmonic, soft-clipped, through a low-pass (cutoff from hue).
// The envelope comes after the clip, so the clip always sees the same cycle: that cycle is worked out once, as the
// harmonics of a PeriodicWave, and one oscillator plays it. No wave-shaper per note, no aliasing, and a quiet
// plant keeps the harmonics a small speaker needs to play it at all (LLD §7). Stateless (see Bell).
import {
  BASS_ATTACK_S,
  BASS_CUTOFF_MUL,
  BASS_CYCLE_SAMPLES,
  BASS_DRIVE,
  BASS_FILTER_Q,
  BASS_HOLD_MUL,
  BASS_PARTIALS,
  BASS_RELEASE_TAU_DIV,
  BASS_SECOND_HARMONIC,
  BASS_TAIL_TAUS,
} from '../config.js';

import type { NoteRef, Voice, VoiceParams } from './note.js';

/**
 * Sine terms 1..BASS_PARTIALS of one cycle of tanh(drive × (sin θ + h2 · sin 2θ)); index 0 is unused. The cycle
 * is odd, so it has no cosine terms and no DC.
 */
export function bassPartials(): Float32Array {
  const sines = new Float32Array(BASS_PARTIALS + 1);
  for (let i = 0; i < BASS_CYCLE_SAMPLES; i++) {
    const theta = (2 * Math.PI * i) / BASS_CYCLE_SAMPLES;
    const x = Math.tanh(BASS_DRIVE * (Math.sin(theta) + BASS_SECOND_HARMONIC * Math.sin(2 * theta)));
    for (let k = 1; k <= BASS_PARTIALS; k++) {
      sines[k] = (sines[k] as number) + (2 / BASS_CYCLE_SAMPLES) * x * Math.sin(k * theta);
    }
  }
  return sines;
}

export class Bass implements Voice {
  private readonly wave: PeriodicWave;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly ref: NoteRef,
  ) {
    // MDN createPeriodicWave(real, imag): cosine terms, sine terms. The browser scales the wave to a peak of 1.
    this.wave = ctx.createPeriodicWave(new Float32Array(BASS_PARTIALS + 1), bassPartials());
  }

  trigger(time: number, p: VoiceParams, out: AudioNode): void {
    const ctx = this.ctx;
    const releaseAt = time + BASS_ATTACK_S + p.release * BASS_HOLD_MUL;
    const tau = p.release / BASS_RELEASE_TAU_DIV;
    const end = releaseAt + BASS_TAIL_TAUS * tau;

    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.wave);
    osc.frequency.value = p.hz;
    osc.detune.value = p.detune;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = BASS_FILTER_Q;
    filter.frequency.value = p.hz * BASS_CUTOFF_MUL * p.cutoffMul;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(p.gain, time + BASS_ATTACK_S);
    env.gain.setTargetAtTime(0, releaseAt, tau);
    osc.connect(filter).connect(env).connect(out);

    osc.start(time);
    osc.stop(end);
    const note = this.ref.note;
    note.begin(time, end, env, p.gain, releaseAt, tau);
    note.add(osc);
  }

  dispose(): void {
    // Nothing persistent but the wave, which is not a node (see Bell).
  }
}
