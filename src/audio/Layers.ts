// What makes the garden alive (T-164, specs/03-design/SOUND_PASS_T164.md §1): a groove on every plant note (swing,
// accents, humanize), a tempo echo, a breathing master filter, a drone that moves through the room's chords and
// soft percussion; the last two come in as the garden grows (builds). The recipe in force sets them all
// (styles.ts); today's turns every one off, and then a note leaves `groove` exactly as it came in.
//
//   channel inputs ─► bus ─┬─► reverb send (AudioEngine)
//                          └─► echo send ─► delay ─► low-pass ─┬─► master
//                                             ▲──── feedback ◄─┘
//   master ─► breath (low-pass) ─► dim (the Listen −3 dB) ─► compressor ─► ceiling
//
// The six nodes are built once, with the engine's graph. The drone and percussion voices, and the one noise buffer,
// are made by the first style that plays them, in setStyle and never in the tick. Hot path: `groove` for each plant
// note and `step` once a step fill scratch params and play pooled notes (FR-MUS-07); they make nothing else.
import { STEPS } from '../garden/index.js';

import {
  BASS_DRIVE,
  BREATH_NOISE,
  BAR_GLIDE_TAUS,
  BUILD_BARS,
  BUILD_FADE_BARS,
  BUILD_PLANTS,
  CLAVE_OCTAVES,
  COUNTER_DB,
  COUNTER_MAX_PER_BAR,
  COUNTER_MOTIF_BARS,
  CLAVE_RELEASE_S,
  DRONE_TAU_DIV,
  ECHO_MAX_S,
  FLAT_Q_DB,
  GROOVE_SEED,
  HARMONY_FIFTH_DEGREES,
  HARMONY_ROOTS,
  HEIGHT_RELEASE_S_MIN,
  DRONE_REF_HEIGHT,
  LISTEN_BREATH_BARS,
  LISTEN_BREATH_HIGH_HZ,
  LISTEN_BREATH_LOW_HZ,
  LISTEN_DIM_DB,
  LISTEN_GLIDE_IN_S,
  LISTEN_GLIDE_OUT_S,
  NOISE_S,
  NOISE_SEED,
  PAD_EVOLVE_BARS,
  PARAM_SMOOTH_S,
  SHAKER,
  TICK,
  VARIATION_BARS,
  VARIATION_ECHO_DB,
  VARIATION_ECHO_STEPS,
  VARIATION_GHOST_DB,
  VARIATION_GHOST_STEPS,
  VARIATION_SWELL_BARS,
  VARIATION_SWELL_DB,
} from './config.js';
import { dbToGain, heightToGainDb } from './mapping.js';
import { degreeToMidi, midiToHz, VOICE_OCTAVE } from './theory.js';
import { bassWave } from './voices/Bass.js';
import { Choir } from './voices/Choir.js';
import { Pad } from './voices/Pad.js';
import { Kick, Noise, renderNoise } from './voices/Perc.js';

import type { Scheduler } from './Scheduler.js';
import type { PercHit, PercKind, Recipe } from './styles.js';
import type { VoicePool } from './VoicePool.js';
import type { Bell } from './voices/Bell.js';
import type { Voice, VoiceParams } from './voices/note.js';
import type { Pluck } from './voices/Pluck.js';
import type { Plant, RoomSignature } from '../garden/index.js';

export interface LayersOptions {
  ctx: BaseAudioContext;
  pool: VoicePool;
  scheduler: Scheduler;
  /** The engine's recipe, changed in place by setStyle; `restyle` follows it. */
  recipe: Readonly<Recipe>;
  /** The clave plays the plants' Bell; the drone's Choir shares the plants' pulse. */
  bell: Bell;
  choirPulse: PeriodicWave;
  bus: AudioNode;
  master: AudioNode;
  compressor: DynamicsCompressorNode;
  /** The engine's bed pose, column-major, kept up to date in place: layer notes sound at the bed's centre. */
  bed: readonly number[];
  key: () => Pick<RoomSignature, 'keyRoot' | 'mode'>;
  /** The counter-line's Pluck (§1.7) is the plants' own: its strings are theirs. */
  pluck: Pluck;
  /** The engine's plants by step, kept up to date in place: the counter-line and the variations draw from them. */
  steps: readonly (readonly Grooved[])[];
  /** The session's seed (API_SPEC §3 `seed`, else GROOVE_SEED): the counter-line's and the variations' draws. */
  seed: number;
}

/** What `groove`, the counter-line and the variations need of a plant's record. */
export interface Grooved {
  plant: Plant;
  params: VoiceParams;
  /** grooveSeed(plant.id). */
  seed: number;
  /** Its voice and its place: a variation plays its note again from there (§1.8). */
  voice: Voice;
  x: number;
  y: number;
  z: number;
}

interface LayerVoices {
  kick: Kick;
  shaker: Noise;
  tick: Noise;
  breath: Noise;
  pad: Pad;
  choir: Choir;
}

/** Indices into BUILD_PLANTS and BUILD_BARS. */
const HARMONY = 0;
const TEXTURE = 1;
const KICK = 2;
const COUNTER = 3;
const VARIATION = 4;
/** The variations (§1.8), as hash() % 3 draws them. */
const ECHO = 0;
const GHOSTS = 1;
const SWELL = 2;

/** A drone note is held to the next chord: its hold is its `release` (× 1), its glide out a short one. */
const DRONE_HOLD: Partial<Recipe> = {
  padHoldMul: 1,
  padReleaseTauDiv: DRONE_TAU_DIV,
  choirHoldMul: 1,
  choirReleaseTauDiv: DRONE_TAU_DIV,
};

/** FNV-1a of a plant's id, mixed with the session's seed: its humanize draws are its own, the same every bar. */
export function grooveSeed(id: string): number {
  let h = 0x811c9dc5 ^ GROOVE_SEED;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return h | 0;
}

/** hash() gives an integer below this. */
const HASH_RANGE = 2 ** 30;

/**
 * An integer in 0..HASH_RANGE − 1 from three integers: mulberry32 of their mix, written out (no closure, no object).
 * 30 bits: a small integer, which V8 never puts on the heap where a fraction a call returns can go (P-009's rests).
 */
function hash(a: number, b: number, c: number): number {
  let t = (Math.imul(a, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca77) ^ Math.imul(c, 0xc2b2ae3d)) | 0;
  t = (t + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 2;
}

/** A number in [−1, 1) from three integers. */
function draw(a: number, b: number, c: number): number {
  return (hash(a, b, c) / HASH_RANGE) * 2 - 1;
}

export class Layers {
  /** The plant note `groove` shaped last: the engine plays this one. */
  readonly note: VoiceParams = { hz: 0, gain: 0, release: 0, cutoffMul: 1, detune: 0 };
  /** The drone or percussion note being played. */
  private readonly hit: VoiceParams = { hz: 0, gain: 0, release: 0, cutoffMul: 1, detune: 0 };
  private readonly breath: BiquadFilterNode;
  private readonly dim: GainNode;
  /** The Listen sweep (§6) is on: the filter breathes its own range, whatever the recipe's. */
  private listening = false;
  /** The last bar line's bar: where the filter is on its sine when Listen starts. */
  private bar = 0;
  private readonly echoSend: GainNode;
  private readonly delay: DelayNode;
  private readonly feedback: GainNode;
  private readonly echoLpf: BiquadFilterNode;
  /** The absolute step (bar × STEPS + step) at which each build layer came in; −1 = not yet. */
  private readonly entered: number[] = BUILD_PLANTS.map(() => -1);
  /** §1.7: the counter-line notes played in this bar, at most COUNTER_MAX_PER_BAR. */
  private counterInBar = 0;
  /** §1.8: the variation of the current VARIATION_BARS-bar block (ECHO, GHOSTS, SWELL; −1 none), its first absolute step, and the plants it is on. */
  private variation = -1;
  private variationAbs = 0;
  private varA: Grooved | null = null;
  private varB: Grooved | null = null;
  /** The bar of the first step with plants since the bed was last empty: builds count bars from it. −1 = empty. */
  private firstBar = -1;
  /** The recipe in force with a drone's hold (DRONE_HOLD): the drone's Pad and Choir play it. */
  private readonly drone: Recipe;
  private voices: LayerVoices | null = null;
  /** The echo's delay as last set, seconds. */
  private echoS = 0;
  /** The time `groove` gave the plant note it shaped last. */
  noteTime = 0;
  /** The step being played: its time and absolute index, and the time of the layer note being played. */
  private time = 0;
  private abs = 0;
  private hitTime = 0;

  constructor(private readonly o: LayersOptions) {
    const ctx = o.ctx;
    this.breath = ctx.createBiquadFilter();
    this.breath.type = 'lowpass';
    this.breath.Q.value = FLAT_Q_DB;
    this.breath.frequency.value = ctx.sampleRate / 2; // at Nyquist a low-pass passes everything: today's sound
    this.dim = ctx.createGain();
    o.master.connect(this.breath).connect(this.dim).connect(o.compressor);
    this.echoSend = ctx.createGain();
    this.echoSend.gain.value = o.recipe.echoSend;
    this.delay = ctx.createDelay(ECHO_MAX_S);
    this.echoLpf = ctx.createBiquadFilter();
    this.echoLpf.type = 'lowpass';
    this.echoLpf.Q.value = FLAT_Q_DB;
    this.echoLpf.frequency.value = o.recipe.echoLpfHz;
    this.feedback = ctx.createGain();
    this.feedback.gain.value = o.recipe.echoFeedback;
    o.bus.connect(this.echoSend).connect(this.delay).connect(this.echoLpf).connect(o.master);
    this.echoLpf.connect(this.feedback).connect(this.delay);
    this.drone = { ...o.recipe, ...DRONE_HOLD };
  }

  /**
   * Follow the recipe after setStyle: the limiter, the echo and the filter glide to it from `now`. The echo's send
   * is `openEcho`'s, which the engine calls next. From no echo yet the delay is set at once: a glide up from 0 would
   * sweep a comb through the notes, and waiting for the bar line would leave one at about 370 Hz until then.
   */
  restyle(now: number): void {
    const r = this.o.recipe;
    Object.assign(this.drone, r, DRONE_HOLD);
    this.variation = -1; // the next block draws under the new recipe (today's has none)
    const c = this.o.compressor;
    c.threshold.setTargetAtTime(r.limiterThresholdDb, now, PARAM_SMOOTH_S);
    c.knee.setTargetAtTime(r.limiterKneeDb, now, PARAM_SMOOTH_S);
    c.ratio.setTargetAtTime(r.limiterRatio, now, PARAM_SMOOTH_S);
    c.attack.setTargetAtTime(r.limiterAttackS, now, PARAM_SMOOTH_S);
    c.release.setTargetAtTime(r.limiterReleaseS, now, PARAM_SMOOTH_S);
    const echo = Math.min(ECHO_MAX_S, r.echoSteps * this.o.scheduler.stepS);
    if (this.echoS === 0 && echo > 0) {
      this.echoS = echo;
      this.delay.delayTime.setValueAtTime(echo, now);
    }
    this.feedback.gain.setTargetAtTime(r.echoFeedback, now, PARAM_SMOOTH_S);
    this.echoLpf.frequency.setTargetAtTime(r.echoLpfHz, now, PARAM_SMOOTH_S);
    if (r.breathBars === 0 && !this.listening)
      this.breath.frequency.setTargetAtTime(this.o.ctx.sampleRate / 2, now, PARAM_SMOOTH_S);
    if (this.voices === null && (r.perc.length > 0 || r.droneBarsPerChord > 0))
      this.voices = this.makeVoices();
  }

  /**
   * §6 the Listen sweep: the filter drops to its Listen range (its 16-bar sine from the last bar line) and the mix
   * goes −3 dB, gliding in over 1.2 s; out, back to the recipe's point over 0.8 s. The engine lifts the reverb send.
   */
  listen(on: boolean, now: number): void {
    this.listening = on;
    const tau = (on ? LISTEN_GLIDE_IN_S : LISTEN_GLIDE_OUT_S) / BAR_GLIDE_TAUS;
    this.dim.gain.setTargetAtTime(on ? dbToGain(LISTEN_DIM_DB) : 1, now, tau);
    this.breath.frequency.setTargetAtTime(this.breathHz(this.bar), now, tau);
  }

  /** The echo's send: the recipe's level, or shut while the reverb is 'off' (a dry sound, FR-ROOM-06). */
  openEcho(open: boolean, now: number): void {
    this.echoSend.gain.setTargetAtTime(open ? this.o.recipe.echoSend : 0, now, PARAM_SMOOTH_S);
  }

  /**
   * §1.1, §1.4: fill `note` from a plant's params, at its step's accent and with its humanize draw for this bar (a
   * pad's cutoff on the 16-bar sine), and `noteTime`: the step's time, swung if the step is odd, then humanized.
   * Fields, not a return value: V8 puts a number a call returns, or is handed, on the heap (NFR-PERF-08).
   */
  groove(r: Grooved, step: number, bar: number, time: number): void {
    const s = this.o.recipe;
    const p = r.params;
    const n = this.note;
    n.hz = p.hz;
    n.release = p.release;
    n.detune = p.detune;
    n.cutoffMul =
      r.plant.voice === 'pad'
        ? p.cutoffMul * Math.pow(2, s.padEvolveOctaves * Math.sin((2 * Math.PI * bar) / PAD_EVOLVE_BARS))
        : p.cutoffMul;
    n.gain = p.gain * dbToGain((s.accentsDb[step] as number) + s.humanizeDb * draw(r.seed, bar, 1));
    // §1.8 the swell: this plant's notes rise VARIATION_SWELL_DB over VARIATION_SWELL_BARS, then fall back.
    if (this.variation === SWELL && r === this.varA)
      n.gain *= dbToGain(VARIATION_SWELL_DB * this.swell(bar * STEPS + step));
    this.noteTime = time + this.swing(step) + s.humanizeS * draw(r.seed, bar, 2);
  }

  /**
   * P-009: the plant rests in `bar`, in one bar of each of its seeded cycle (CYCLE_BARS), or, on the 1-bar cycle,
   * in a seeded share of its bars. Never with today's recipe, whose cycles are none.
   */
  rests(r: Grooved, bar: number): boolean {
    const s = this.o.recipe;
    const cycles = s.cycleBars;
    if (cycles.length === 0) return false;
    // Bar −1 in the hash: the plant's own cycle and place in it, the same in every bar.
    const cycle = cycles[hash(r.seed, -1, 5) % cycles.length] as number;
    if (cycle === 1) return hash(r.seed, bar, 7) < s.cycleSkip * HASH_RANGE;
    return (bar + (hash(r.seed, -1, 6) % cycle)) % cycle === 0;
  }

  /**
   * After the plants of a step: the bar line's automation, then the builds, the drone, the percussion, the
   * counter-line (§1.7) and the variations (§1.8).
   */
  step(step: number, time: number, bar: number, plants: number): void {
    this.time = time;
    if (step === 0) this.barLine(bar);
    if (plants === 0) {
      // An empty bed is silent, and builds again from its next plant.
      this.firstBar = -1;
      for (let i = 0; i < BUILD_PLANTS.length; i++) this.entered[i] = -1;
      this.variation = -1;
      return;
    }
    if (this.firstBar === -1) this.firstBar = bar;
    if (this.voices === null) return;
    const abs = (this.abs = bar * STEPS + step);
    const barsPlayed = bar - this.firstBar;
    for (let i = 0; i < BUILD_PLANTS.length; i++) {
      if (
        this.entered[i] === -1 &&
        (plants >= (BUILD_PLANTS[i] as number) || barsPlayed >= (BUILD_BARS[i] as number))
      )
        this.entered[i] = abs;
    }
    if (step === 0) {
      this.counterInBar = 0;
      if (bar % VARIATION_BARS === 0) this.drawVariation(bar);
      this.chord(bar);
    }
    this.percussion(step, bar);
    this.counterLine(step, bar);
    this.variations(step);
  }

  /**
   * §1.2: the echo's delay follows the tempo and the style, gliding over about a bar (a short glide chirps the
   * repeats); today's recipe leaves it where it is, its send shut. §1.4: the filter glides to this bar's point.
   */
  private barLine(bar: number): void {
    const r = this.o.recipe;
    const stepS = this.o.scheduler.stepS;
    const tau = (STEPS * stepS) / BAR_GLIDE_TAUS;
    const echo = Math.min(ECHO_MAX_S, r.echoSteps * stepS);
    if (echo > 0 && echo !== this.echoS) {
      this.echoS = echo;
      this.delay.delayTime.setTargetAtTime(echo, this.time, tau);
    }
    this.bar = bar;
    if (r.breathBars === 0 && !this.listening) return;
    this.breath.frequency.setTargetAtTime(this.breathHz(bar), this.time, tau);
  }

  /** §1.4: the filter's point at `bar` on the recipe's sine, or in Listen on the sweep's (§6); open when neither breathes. */
  private breathHz(bar: number): number {
    const r = this.o.recipe;
    const on = this.listening;
    const low = on ? LISTEN_BREATH_LOW_HZ : r.breathLowHz;
    const high = on ? LISTEN_BREATH_HIGH_HZ : r.breathHighHz;
    const bars = on ? LISTEN_BREATH_BARS : r.breathBars;
    if (bars === 0) return this.o.ctx.sampleRate / 2;
    const octaves = Math.log2(high / low) / 2;
    return Math.sqrt(low * high) * Math.pow(2, octaves * Math.sin((2 * Math.PI * bar) / bars));
  }

  /** §1.3: on the first bar of each chord, its root and fifth, held to the next chord. */
  private chord(bar: number): void {
    const r = this.o.recipe;
    const every = r.droneBarsPerChord;
    if (every === 0 || this.entered[HARMONY] === -1 || bar % every !== 0) return;
    const roots = HARMONY_ROOTS[this.o.key().mode];
    const root = roots[((bar / every) | 0) % roots.length] as number;
    this.droneNote('pad', root);
    this.droneNote(r.droneFifthOnChoir ? 'choir' : 'pad', root + HARMONY_FIFTH_DEGREES);
  }

  private droneNote(voice: 'pad' | 'choir', degree: number): void {
    const r = this.o.recipe;
    const key = this.o.key();
    const h = this.hit;
    const attack = voice === 'pad' ? r.padAttackS : r.choirAttackS;
    h.hz = midiToHz(degreeToMidi(key.keyRoot, key.mode, degree, VOICE_OCTAVE[voice] + r.droneOctave));
    const db = heightToGainDb(DRONE_REF_HEIGHT, r.heightFloorDb) + r.mixDb[voice] + r.droneDb;
    h.gain = this.fade(HARMONY) * dbToGain(db);
    const chordS = r.droneBarsPerChord * STEPS * this.o.scheduler.stepS;
    h.release = Math.max(HEIGHT_RELEASE_S_MIN, chordS - attack);
    h.cutoffMul = 1;
    h.detune = 0;
    this.hitTime = this.time;
    const v = this.voices as LayerVoices;
    this.atCentre(voice === 'pad' ? v.pad : v.choir);
  }

  /** §1.6: the hits of this step, each once its layer is in; swung and humanized as a plant note is. */
  private percussion(step: number, bar: number): void {
    const hits = this.o.recipe.perc;
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i] as PercHit;
      if (hit.step !== step || bar % hit.everyBars !== 0) continue;
      if (this.entered[hit.kind === 'kick' ? KICK : TEXTURE] !== -1) this.percHit(i, bar);
    }
  }

  private percHit(i: number, bar: number): void {
    const r = this.o.recipe;
    const hit = r.perc[i] as PercHit;
    const h = this.hit;
    // Level under a full-height Bell (§1.6); the draws are the hit's own: seeded by its place in the bar's list.
    const db = r.mixDb.bell + hit.db + r.humanizeDb * draw(GROOVE_SEED, bar, 3 + 2 * i);
    h.gain = this.fade(hit.kind === 'kick' ? KICK : TEXTURE) * dbToGain(db);
    const key = this.o.key();
    h.hz = midiToHz(degreeToMidi(key.keyRoot, key.mode, 0, VOICE_OCTAVE.bell + CLAVE_OCTAVES));
    h.release = CLAVE_RELEASE_S; // the clave is a Bell; the other hits have their own pitch and length
    h.cutoffMul = 1;
    h.detune = 0;
    this.hitTime = this.time + this.swing(hit.step) + r.humanizeS * draw(GROOVE_SEED, bar, 4 + 2 * i);
    this.atCentre(this.percVoice(hit.kind));
  }

  private percVoice(kind: PercKind): Voice {
    const v = this.voices as LayerVoices;
    if (kind === 'kick') return v.kick;
    if (kind === 'shaker') return v.shaker;
    if (kind === 'tick') return v.tick;
    if (kind === 'breath') return v.breath;
    return this.o.bell;
  }

  /**
   * §1.7 the counter-line: on an empty step (no plant on it, resting or not), with the style's probability and at
   * most COUNTER_MAX_PER_BAR a bar, a planted pitch one octave up, COUNTER_DB under the plant it copies, on the
   * style's voice from the bed's centre. Its draws are the motif's, one per COUNTER_MOTIF_BARS bars, so the line
   * plays once more before it moves.
   */
  private counterLine(step: number, bar: number): void {
    const r = this.o.recipe;
    if (r.counterProbability === 0 || this.entered[COUNTER] === -1) return;
    if ((this.o.steps[step] as readonly Grooved[]).length > 0) return;
    if (this.counterInBar >= COUNTER_MAX_PER_BAR) return;
    const seed = this.o.seed;
    const motif = (bar / COUNTER_MOTIF_BARS) | 0;
    if (hash(seed, motif, 100 + step) >= r.counterProbability * HASH_RANGE) return;
    const src = this.plantAt(hash(seed, motif, 120 + step));
    if (src === null) return;
    this.counterInBar++;
    this.copy(src, 2, COUNTER_DB, this.fade(COUNTER));
    this.hitTime = this.time + this.swing(step) + r.humanizeS * draw(seed, bar, 140 + step);
    // shortcut: on the Pluck the note plays the nearest string re-pitched an octave up (a shorter ring, as a high
    // piano note has); prepare its own strings at sync if Parth hears it as thin.
    this.atCentre(r.counterVoice === 'pluck' ? this.o.pluck : this.o.bell);
  }

  /** `hit` from a plant's params: `octave` × its pitch, `db` under it, at `level` (a build's fade). */
  private copy(src: Grooved, octave: number, db: number, level: number): void {
    const h = this.hit;
    const p = src.params;
    h.hz = p.hz * octave;
    h.gain = level * p.gain * dbToGain(db);
    h.release = p.release;
    h.cutoffMul = p.cutoffMul;
    h.detune = p.detune;
  }

  /** Plant `n` (modulo their number) of the engine's lists, step by step; null with no plant. */
  private plantAt(n: number): Grooved | null {
    const steps = this.o.steps;
    let count = 0;
    for (let s = 0; s < steps.length; s++) count += (steps[s] as readonly Grooved[]).length;
    if (count === 0) return null;
    let i = n % count;
    for (let s = 0; s < steps.length; s++) {
      const list = steps[s] as readonly Grooved[];
      if (i < list.length) return list[i] as Grooved;
      i -= list.length;
    }
    return null;
  }

  /**
   * §1.8 the variations (FR-MUS-11): for each block of VARIATION_BARS bars, one of an octave echo, ghost notes or a
   * swell and the plants it is on, drawn from the session's seed; none until the layer is in (§1.5).
   */
  private drawVariation(bar: number): void {
    const seed = this.o.seed;
    const block = (bar / VARIATION_BARS) | 0;
    const on = this.o.recipe.variations && this.entered[VARIATION] !== -1;
    this.variation = on ? hash(seed, block, 160) % 3 : -1;
    this.variationAbs = bar * STEPS;
    this.varA = this.plantAt(hash(seed, block, 161));
    this.varB = this.plantAt(hash(seed, block, 162));
  }

  /** The echo and the ghosts: a plant's note again, so many steps after its own. The swell is in `groove`. */
  private variations(step: number): void {
    const kind = this.variation;
    if (kind === -1 || kind === SWELL) return;
    const later = kind === ECHO ? VARIATION_ECHO_STEPS : VARIATION_GHOST_STEPS;
    const a = this.varA;
    const b = this.varB;
    if (a !== null && this.abs === this.variationAbs + a.plant.cell.step + later) this.again(a, kind, step);
    if (
      kind === GHOSTS &&
      b !== null &&
      b !== a &&
      this.abs === this.variationAbs + b.plant.cell.step + later
    )
      this.again(b, kind, step);
  }

  /** `p`'s note of the block's first bar again, from its own place and voice, unless it rested there or has gone. */
  private again(p: Grooved, kind: number, step: number): void {
    const bar = (this.variationAbs / STEPS) | 0;
    if (this.rests(p, bar) || (this.o.steps[p.plant.cell.step] as readonly Grooved[]).indexOf(p) < 0) return;
    const echo = kind === ECHO;
    this.copy(p, echo ? 2 : 1, echo ? VARIATION_ECHO_DB : VARIATION_GHOST_DB, this.fade(VARIATION));
    const r = this.o.recipe;
    this.hitTime = this.time + this.swing(step) + r.humanizeS * draw(this.o.seed, bar, 180 + step);
    // Owned by the plant: removing it inside the look-ahead releases this note too (FR-MUS-12, VoicePool.release).
    this.o.pool.play(p.voice, this.hitTime, this.hit, p.x, p.y, p.z, p, this.time - r.humanizeS);
  }

  /** §1.8: the swell at absolute step `abs`, 0..1: up over VARIATION_SWELL_BARS from the block's start, then down. */
  private swell(abs: number): number {
    const t = (abs - this.variationAbs) / (VARIATION_SWELL_BARS * STEPS);
    return t < 1 ? Math.max(0, t) : Math.max(0, 2 - t);
  }

  /** A layer note plays `hit` at `hitTime` from the bed's centre, and belongs to no plant. */
  private atCentre(voice: Voice): void {
    const b = this.o.bed;
    // The guard: the earliest a note of this step may start, so none of them is stolen for this one (VoicePool).
    const guard = this.time - this.o.recipe.humanizeS;
    this.o.pool.play(
      voice,
      this.hitTime,
      this.hit,
      b[12] as number,
      b[13] as number,
      b[14] as number,
      null,
      guard,
    );
  }

  /** §1.5: up to 1 over BUILD_FADE_BARS from the step the layer came in (it is in: entered is not −1). */
  private fade(layer: number): number {
    return Math.min(1, (this.abs - (this.entered[layer] as number) + 1) / (BUILD_FADE_BARS * STEPS));
  }

  /** §1.1: an odd step is late by (swing − 0.5) × 2 steps. */
  private swing(step: number): number {
    return (step & 1) === 1 ? (this.o.recipe.swing - 0.5) * 2 * this.o.scheduler.stepS : 0;
  }

  private makeVoices(): LayerVoices {
    const { ctx, pool, choirPulse } = this.o;
    const sr = ctx.sampleRate;
    const noise = ctx.createBuffer(1, Math.floor(sr * NOISE_S), sr);
    renderNoise(noise.getChannelData(0), NOISE_SEED);
    return {
      kick: new Kick(ctx, pool.ref, bassWave(ctx, BASS_DRIVE)),
      shaker: new Noise(ctx, pool.ref, noise, SHAKER),
      tick: new Noise(ctx, pool.ref, noise, TICK),
      breath: new Noise(ctx, pool.ref, noise, BREATH_NOISE),
      pad: new Pad(ctx, pool.ref, this.drone),
      choir: new Choir(ctx, pool.ref, this.drone, choirPulse),
    };
  }
}
