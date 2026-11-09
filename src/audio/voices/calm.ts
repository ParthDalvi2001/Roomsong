// The calm voices (Parth and Chinmay, 9 Nov): every tone worked out here, no recording. A note plays one when its
// `calm` is set (T-193): a plant of the New library in every style, and style B's drone, ripple and goodnight.
//   Bell plant → a large singing bowl · Pluck → a small bowl · Choir → bansuri · Pad (and the drone) → shruti box
//   · Bass → the hum, a tanpura-like string (T-193 P5).
// The garden and its notes are unchanged: only the tone behind each seed. Numbers and their sources: audio/config.ts.
// Each plant sounds its own: `p.timbre` (its id and cell, mapping.ts) moves the bowl's modes, beat and brightness,
// the flute's vibrato and breath, and the reeds' spread and bellows, each inside a "U" range.
import {
  BELLOWS_DEPTH,
  BELLOWS_HZ_U,
  BOWL2_AMPS,
  BOWL2_LEVEL,
  BOWL2_RATIOS,
  BOWL2_TAU_MUL,
  BOWL_AMPS,
  BOWL_ATTACK_S,
  BOWL_BEAT_HZ_U,
  BOWL_BEAT_PER_MODE,
  BOWL_BRIGHT_U,
  BOWL_LEVEL,
  BOWL_MODE_DECAY,
  BOWL_OCTAVE_MUL,
  BOWL_PARTNER_LEVEL,
  BOWL_RATIO_SPREAD,
  BOWL_RATIOS,
  BOWL_STRIKE_LEVEL,
  BOWL_STRIKE_RATIO,
  BOWL_STRIKE_TAIL_TAUS,
  BOWL_STRIKE_TAU_S,
  BOWL_TAIL_TAUS,
  BOWL_TAU_BASE_S,
  BOWL_TAU_PER_S,
  BOWL_TAU_U,
  CHOIR_TAIL_TAUS,
  FLAT_Q_DB,
  FLUTE_ATTACK_S,
  FLUTE_BREATH_CHIFF,
  FLUTE_BREATH_LEVEL,
  FLUTE_BREATH_MUL,
  FLUTE_BREATH_Q,
  FLUTE_BREATH_TAU_S,
  FLUTE_BREATH_U,
  FLUTE_HARMONICS,
  FLUTE_LEVEL,
  FLUTE_NOISE_S,
  FLUTE_VIBRATO_CENTS_U,
  FLUTE_VIBRATO_DELAY_S,
  FLUTE_VIBRATO_HZ_U,
  FLUTE_VIBRATO_RISE_S,
  HUM_ATTACK_S,
  HUM_CENTS_U,
  HUM_FILTER_GAIN_DB,
  HUM_FILTER_Q,
  HUM_HARMONICS,
  HUM_LEVEL,
  HUM_SWEEP_MUL,
  HUM_SWEEP_S_U,
  HUM_TAIL_TAUS,
  HUM_TAU_BASE_S,
  HUM_TAU_PER_S,
  PAD_CUTOFF_MAX_HZ,
  PAD_CUTOFF_MIN_HZ,
  PAD_TAIL_TAUS,
  REED_ATTACK_S,
  REED_CUTOFF_MUL,
  REED_LEVEL,
  REED_SPREAD_CENTS_U,
} from '../config.js';

import { renderNoise } from './Perc.js';

import type { Recipe } from '../styles.js';
import type { Note, VoiceParams } from './note.js';

/** What the calm voices share in one context: made on the first calm note, then reused. */
interface Kit {
  partner: PeriodicWave;
  flute: PeriodicWave;
  hum: PeriodicWave;
  noise: AudioBuffer;
}
const KITS = new WeakMap<BaseAudioContext, Kit>();
const UNIT: readonly [number, number] = [0, 1];

function kitOf(ctx: BaseAudioContext): Kit {
  let kit = KITS.get(ctx);
  if (kit === undefined) {
    // shortcut: made in the first calm note's tick (0.2 ms of noise at 48 kHz); move to init() if a device shows it.
    const sine = (level: number): Float32Array => Float32Array.of(0, level);
    const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * FLUTE_NOISE_S), ctx.sampleRate);
    renderNoise(noise.getChannelData(0), 0x5eed);
    const humSines = new Float32Array(HUM_HARMONICS + 1);
    for (let n = 1; n <= HUM_HARMONICS; n++) humSines[n] = 1 / n;
    kit = {
      // MDN createPeriodicWave: disableNormalization keeps the levels as given (see Choir).
      partner: ctx.createPeriodicWave(sine(0), sine(BOWL_PARTNER_LEVEL), { disableNormalization: true }),
      flute: ctx.createPeriodicWave(
        Float32Array.from(FLUTE_HARMONICS),
        new Float32Array(FLUTE_HARMONICS.length),
        {
          disableNormalization: true,
        },
      ),
      // Normalised to a peak of 1 like the Bass's wave (MDN createPeriodicWave), so HUM_LEVEL means the same on any browser.
      hum: ctx.createPeriodicWave(new Float32Array(HUM_HARMONICS + 1), humSines),
      noise,
    };
    KITS.set(ctx, kit);
  }
  return kit;
}

/** Bits `shift`.. of a plant's timbre as 0..1, mapped into `range`. */
export function timbreIn(timbre: number, shift: number, range: readonly [number, number]): number {
  return range[0] + (((timbre >>> shift) & 1023) / 1023) * (range[1] - range[0]);
}

/** Singing bowl: three modes, each a beating pair of sines, decaying apart, and a soft strike. 7 sources. */
export function playBowl(
  ctx: BaseAudioContext,
  note: Note,
  time: number,
  p: VoiceParams,
  out: AudioNode,
  large: boolean,
): void {
  const kit = kitOf(ctx);
  const t = p.timbre;
  const hz = large ? p.hz * BOWL_OCTAVE_MUL : p.hz;
  const beat = timbreIn(t, 0, BOWL_BEAT_HZ_U);
  const spread = 1 + BOWL_RATIO_SPREAD * (2 * timbreIn(t, 10, UNIT) - 1);
  const bright = timbreIn(t, 20, BOWL_BRIGHT_U) * Math.sqrt(p.cutoffMul);
  const tau =
    (BOWL_TAU_BASE_S + BOWL_TAU_PER_S * p.release) * timbreIn(t, 5, BOWL_TAU_U) * (large ? 1 : BOWL2_TAU_MUL);
  const level = p.gain * (large ? BOWL_LEVEL : BOWL2_LEVEL);
  const ratios = large ? BOWL_RATIOS : BOWL2_RATIOS;
  const amps = large ? BOWL_AMPS : BOWL2_AMPS;
  const end = time + BOWL_ATTACK_S + BOWL_TAIL_TAUS * tau;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(level, time + BOWL_ATTACK_S);
  env.gain.setTargetAtTime(0, time + BOWL_ATTACK_S, tau);
  env.connect(out);
  note.begin(time, end, env, level, time + BOWL_ATTACK_S, tau);

  for (let k = 0; k <= ratios.length; k++) {
    let dest: AudioNode = env;
    let f = hz;
    let stop = end;
    if (k > 0) {
      const decay = BOWL_MODE_DECAY[k - 1] as number;
      f = hz * (ratios[k - 1] as number) * spread;
      const mode = ctx.createGain();
      mode.gain.setValueAtTime((amps[k - 1] as number) * bright, time);
      mode.gain.setTargetAtTime(0, time + BOWL_ATTACK_S, tau / decay);
      mode.connect(env);
      dest = mode;
      // A faster mode stops as far down as the fundamental at `end`: fewer sines running, the same sound.
      stop = time + BOWL_ATTACK_S + (BOWL_TAIL_TAUS * tau) / (1 + decay);
    }
    const d = beat * (1 + BOWL_BEAT_PER_MODE * k);
    sine(ctx, note, f - d / 2, p.detune, null, time, stop, dest);
    sine(ctx, note, f + d / 2, p.detune, kit.partner, time, stop, dest);
  }
  const strike = ctx.createGain();
  strike.gain.setValueAtTime(BOWL_STRIKE_LEVEL * bright, time);
  strike.gain.setTargetAtTime(0, time + BOWL_ATTACK_S, BOWL_STRIKE_TAU_S);
  strike.connect(env);
  const strikeEnd = time + BOWL_ATTACK_S + BOWL_STRIKE_TAIL_TAUS * BOWL_STRIKE_TAU_S;
  sine(
    ctx,
    note,
    hz * BOWL_STRIKE_RATIO * spread,
    p.detune,
    null,
    time,
    strikeEnd < end ? strikeEnd : end,
    strike,
  );
}

/** One sine (or `wave`) of a bowl or the hum into `dest`, added to the note. */
function sine(
  ctx: BaseAudioContext,
  note: Note,
  hz: number,
  detune: number,
  wave: PeriodicWave | null,
  time: number,
  end: number,
  dest: AudioNode,
): void {
  const osc = ctx.createOscillator();
  if (wave === null) osc.type = 'sine';
  else osc.setPeriodicWave(wave);
  osc.frequency.value = hz;
  osc.detune.value = detune;
  osc.connect(dest);
  osc.start(time);
  osc.stop(end);
  note.add(osc);
}

/**
 * The hum: two strings on one wave a few cents apart, through a peaking filter that slides down the harmonics (the
 * jawari), into a plucked envelope with a long decay. 4 nodes, 2 sources; the pitch is the Bass's.
 */
export function playHum(
  ctx: BaseAudioContext,
  note: Note,
  time: number,
  p: VoiceParams,
  out: AudioNode,
): void {
  const kit = kitOf(ctx);
  const t = p.timbre;
  const tau = HUM_TAU_BASE_S + HUM_TAU_PER_S * p.release;
  const end = time + HUM_ATTACK_S + HUM_TAIL_TAUS * tau;
  const level = p.gain * HUM_LEVEL;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(level, time + HUM_ATTACK_S);
  env.gain.setTargetAtTime(0, time + HUM_ATTACK_S, tau);
  env.connect(out);

  const jawari = ctx.createBiquadFilter();
  jawari.type = 'peaking';
  jawari.Q.value = HUM_FILTER_Q;
  jawari.gain.value = HUM_FILTER_GAIN_DB;
  jawari.frequency.setValueAtTime(p.hz * HUM_SWEEP_MUL[0], time);
  jawari.frequency.exponentialRampToValueAtTime(
    p.hz * HUM_SWEEP_MUL[1] * Math.sqrt(p.cutoffMul),
    time + timbreIn(t, 0, HUM_SWEEP_S_U),
  );
  jawari.connect(env);

  note.begin(time, end, env, level, time + HUM_ATTACK_S, tau);
  sine(ctx, note, p.hz, p.detune, kit.hum, time, end, jawari);
  sine(ctx, note, p.hz, p.detune + timbreIn(t, 10, HUM_CENTS_U), kit.hum, time, end, jawari);
}

/** Bansuri: a near-sine with weak harmonics, a soft attack, delayed vibrato and band-passed breath. 3 sources. */
export function playFlute(
  ctx: BaseAudioContext,
  note: Note,
  time: number,
  p: VoiceParams,
  out: AudioNode,
  r: Readonly<Recipe>,
): void {
  const kit = kitOf(ctx);
  const t = p.timbre;
  const attack = Math.max(r.choirAttackS, FLUTE_ATTACK_S);
  const relTau = p.release / r.choirReleaseTauDiv;
  const releaseAt = time + attack + p.release * r.choirHoldMul;
  const end = releaseAt + CHOIR_TAIL_TAUS * relTau;
  const level = p.gain * FLUTE_LEVEL;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(level, time + attack);
  env.gain.setTargetAtTime(0, releaseAt, relTau);
  env.connect(out);

  const tone = ctx.createOscillator();
  tone.setPeriodicWave(kit.flute);
  tone.frequency.value = p.hz;
  tone.detune.value = p.detune;
  tone.connect(env);

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = timbreIn(t, 0, FLUTE_VIBRATO_HZ_U);
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, time + FLUTE_VIBRATO_DELAY_S);
  depth.gain.linearRampToValueAtTime(
    timbreIn(t, 10, FLUTE_VIBRATO_CENTS_U),
    time + FLUTE_VIBRATO_DELAY_S + FLUTE_VIBRATO_RISE_S,
  );
  lfo.connect(depth).connect(tone.detune);

  const breath = ctx.createBufferSource();
  breath.buffer = kit.noise;
  breath.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = Math.min(p.hz * FLUTE_BREATH_MUL * p.cutoffMul, ctx.sampleRate / 4);
  band.Q.value = FLUTE_BREATH_Q;
  const air = ctx.createGain();
  const airLevel = FLUTE_BREATH_LEVEL * timbreIn(t, 20, FLUTE_BREATH_U);
  air.gain.setValueAtTime(FLUTE_BREATH_CHIFF, time);
  air.gain.setTargetAtTime(airLevel, time + attack, FLUTE_BREATH_TAU_S);
  breath.connect(band).connect(air).connect(env);

  tone.start(time);
  lfo.start(time);
  // Each plant breathes from its own place in the noise, so two flutes never share a breath.
  breath.start(time, (timbreIn(t, 5, UNIT) * FLUTE_NOISE_S) / 2);
  tone.stop(end);
  lfo.stop(end);
  breath.stop(end);
  note.begin(time, end, env, level, releaseAt, relTau);
  note.add(tone);
  note.add(lfo);
  note.add(breath);
}

/** Shruti box: two reeds a few cents apart and one an octave up, a soft low-pass, a slow bellows. 4 sources. */
export function playReeds(
  ctx: BaseAudioContext,
  note: Note,
  time: number,
  p: VoiceParams,
  out: AudioNode,
  r: Readonly<Recipe>,
): void {
  const t = p.timbre;
  const attack = Math.max(r.padAttackS, REED_ATTACK_S);
  const relTau = p.release / r.padReleaseTauDiv;
  const releaseAt = time + attack + p.release * r.padHoldMul;
  const end = releaseAt + PAD_TAIL_TAUS * relTau;
  const level = p.gain * REED_LEVEL;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(level, time + attack);
  env.gain.setTargetAtTime(0, releaseAt, relTau);
  env.connect(out);

  // The bellows: the reeds' level breathes ± BELLOWS_DEPTH, never through zero.
  const bellows = ctx.createGain();
  bellows.gain.value = 1;
  bellows.connect(env);
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = timbreIn(t, 0, BELLOWS_HZ_U);
  const depth = ctx.createGain();
  depth.gain.value = BELLOWS_DEPTH;
  lfo.connect(depth).connect(bellows.gain);

  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.Q.value = FLAT_Q_DB;
  const cut = p.hz * REED_CUTOFF_MUL * p.cutoffMul;
  lpf.frequency.value =
    cut < PAD_CUTOFF_MIN_HZ ? PAD_CUTOFF_MIN_HZ : cut > PAD_CUTOFF_MAX_HZ ? PAD_CUTOFF_MAX_HZ : cut;
  lpf.connect(bellows);

  note.begin(time, end, env, level, releaseAt, relTau);
  lfo.start(time);
  lfo.stop(end);
  note.add(lfo);
  const spread = timbreIn(t, 10, REED_SPREAD_CENTS_U);
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = i === 2 ? p.hz * 2 : p.hz;
    osc.detune.value = p.detune + (i === 0 ? -spread : i === 1 ? spread : 0);
    osc.connect(lpf);
    osc.start(time);
    osc.stop(end);
    note.add(osc);
  }
}
