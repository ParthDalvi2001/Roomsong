// T-164, specs/03-design/SOUND_PASS_T164.md: the three sound styles and the layers they share, on the fake
// AudioContext and the fake 25 ms tick. What the notes are asked for (times, levels, pitches, filters) is checked
// here; how they sound is for the listening page (proto/styles/) and Parth's ears.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Engine } from '../../../src/audio/AudioEngine.js';
import {
  BUILD_FADE_BARS,
  CLAVE_OCTAVES,
  HARMONY_FIFTH_DEGREES,
  HARMONY_ROOTS,
  KICK_START_HZ,
  LOOK_AHEAD_S,
  LIMITER_ATTACK_S,
  LIMITER_KNEE_DB,
  LIMITER_RATIO,
  LIMITER_RELEASE_S,
  LIMITER_THRESHOLD_DB,
  MIX_DB,
  NOISE_S,
  START_DELAY_S,
  TICK_MS,
  VOICE_CAP,
} from '../../../src/audio/config.js';
import { renderKarplusStrong } from '../../../src/audio/karplus.js';
import { dbToGain, heightToGainDb } from '../../../src/audio/mapping.js';
import { Scheduler } from '../../../src/audio/Scheduler.js';
import { STYLES, type Recipe, type SoundStyle } from '../../../src/audio/styles.js';
import { degreeToMidi, midiToHz } from '../../../src/audio/theory.js';
import { Bass, bassPartials } from '../../../src/audio/voices/Bass.js';
import { Bell } from '../../../src/audio/voices/Bell.js';
import { Choir } from '../../../src/audio/voices/Choir.js';
import { Note } from '../../../src/audio/voices/note.js';
import { Pad } from '../../../src/audio/voices/Pad.js';
import { renderNoise } from '../../../src/audio/voices/Perc.js';
import { Pluck } from '../../../src/audio/voices/Pluck.js';
import { MODE_DEGREES, RINGS, STEPS, WANDERER } from '../../../src/garden/index.js';

import { FakeAudioContext, FakeNode, last } from './fakeAudio.js';
import { isOwn, watchPool, type Played } from './uiRules.js';

import type { ModeId, Plant, VoiceType } from '../../../src/garden/index.js';

vi.mock('../../../src/audio/karplus.js', { spy: true });

const BPM = 84;
const STEP_S = Scheduler.stepDurationFor(BPM);
const BAR_S = STEPS * STEP_S;
const TICK_S = TICK_MS / 1000;
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];

const plant = (id: string, voice: VoiceType, ring: number, step: number, height = 0.55): Plant => ({
  id,
  voice,
  cell: { ring, step },
  height,
  hue: 0.5,
  plantedAt: 0,
});
/** `n` bells, ring 0..4 in turn, on steps 0, 2, 4…: plant notes that no layer note is mistaken for. */
const bells = (n: number): Plant[] =>
  Array.from({ length: n }, (_, i) => plant(`b${i}`, 'bell', i % RINGS, (2 * i) % STEPS));

async function start(style: SoundStyle | null, plants: Plant[] = []) {
  const ctx = new FakeAudioContext();
  const engine = new Engine();
  engine.setTempo(BPM);
  engine.setStyle(style);
  await engine.init(ctx.audio);
  engine.syncPlants(plants, BED);
  let ticks = 0;
  const run = (seconds: number, eachTick?: () => void): void => {
    for (let n = Math.round(seconds / TICK_S); n > 0; n--) {
      ctx.currentTime = ++ticks * TICK_S;
      vi.advanceTimersByTime(TICK_MS);
      eachTick?.();
    }
  };
  return { ctx, engine, run };
}

/** Step index since start (bar × 16 + step) a note at `time` belongs to; a swung or humanized note rounds back. */
const stepOf = (time: number): number => Math.round((time - START_DELAY_S) / STEP_S) + 0; // + 0: never −0
const stepTime = (i: number): number => START_DELAY_S + i * STEP_S;
const barOf = (time: number): number => Math.floor(stepOf(time) / STEPS);
/** A Bell's carrier: a sine into its envelope, which feeds a channel (its modulator feeds a frequency instead). */
const carriers = (ctx: FakeAudioContext): FakeNode[] =>
  ctx
    .of('oscillator')
    .filter((o) => o.type === 'sine' && (o.outputs[0] as FakeNode).outputs[0] instanceof FakeNode);
const envOf = (source: FakeNode): FakeNode => source.outputs[0] as FakeNode;
/** The level a note's envelope rises to. */
const peakOf = (env: FakeNode): number =>
  env.gain.last('linear')?.value ?? (env.gain.last('set')?.value as number);
const db = (gain: number): number => 20 * Math.log10(gain);
const near = (hz: number, want: number): boolean => Math.abs(hz - want) < 0.01;

/** Every percussion hit started so far, by kind, as step indices since start. */
function percussion(
  ctx: FakeAudioContext,
): Record<'kick' | 'shaker' | 'tick' | 'breath' | 'clave', number[]> {
  const noise = (type: string, hz: number): number[] =>
    ctx
      .of('bufferSource')
      .filter((s) => {
        const f = s.outputs[0] as FakeNode;
        return f.kind === 'biquad' && f.type === type && f.frequency.value === hz;
      })
      .map((s) => stepOf(s.startedAt as number));
  const clave = midiToHz(degreeToMidi(0, 'majorPent', 0, CLAVE_OCTAVES));
  return {
    kick: ctx
      .of('oscillator')
      .filter((o) => o.type === 'custom' && o.frequency.last('set')?.value === KICK_START_HZ)
      .map((o) => stepOf(o.startedAt as number)),
    shaker: noise('bandpass', 6000),
    tick: noise('highpass', 8000),
    breath: noise('bandpass', 900),
    clave: carriers(ctx)
      .filter((c) => near(c.frequency.value, clave))
      .map((c) => stepOf(c.startedAt as number)),
  };
}
/** The drone's notes: Pad saws (no plant here is a pad), one record per note (three saws), in time order. */
function drone(ctx: FakeAudioContext): { time: number; hz: number; peak: number; end: number }[] {
  const saws = ctx.of('oscillator').filter((o) => o.type === 'sawtooth' && o.detune.value === 0);
  return saws.map((o) => {
    const env = (o.outputs[0] as FakeNode).outputs[0] as FakeNode;
    return {
      time: o.startedAt as number,
      hz: o.frequency.value,
      peak: peakOf(env),
      end: o.stoppedAt as number,
    };
  });
}

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
afterEach(() => {
  vi.useRealTimers();
  vi.mocked(renderKarplusStrong).mockClear();
});

describe('groove (§1.1)', () => {
  it('an odd step is swung (s − 0.5) × 2 steps late; every note is humanized within its ± seconds, the same each run', async () => {
    const s = STYLES.A;
    const timesOf = async (): Promise<number[]> => {
      const { ctx, run } = await start('A', [plant('even', 'bell', 0, 0), plant('odd', 'bell', 1, 1)]);
      run(16 * BAR_S); // a style rests a plant in half its bars at most (P-009): 8 notes or more each
      return carriers(ctx).map((c) => c.startedAt as number);
    };
    const times = await timesOf();
    const offset = (t: number): number => t - stepTime(stepOf(t));
    const even = times.filter((t) => stepOf(t) % 2 === 0).map(offset);
    const odd = times.filter((t) => stepOf(t) % 2 === 1).map(offset);
    const swing = (s.swing - 0.5) * 2 * STEP_S; // 21 ms at 84 BPM
    expect(even.length).toBeGreaterThanOrEqual(8);
    expect(odd.length).toBeGreaterThanOrEqual(8);
    for (const o of even) expect(Math.abs(o)).toBeLessThanOrEqual(s.humanizeS + 1e-9);
    for (const o of odd) expect(Math.abs(o - swing)).toBeLessThanOrEqual(s.humanizeS + 1e-9);
    expect(new Set(even).size).toBe(even.length); // a new draw every bar
    expect(await timesOf()).toEqual(times); // seeded: the same garden sways the same way
  });

  it("accents and the style's mix and height floor: the downbeat is at the plant's level, an odd step 5 dB under it", async () => {
    const s = STYLES.A;
    const { ctx, run } = await start('A', [plant('down', 'bell', 0, 0, 0), plant('off', 'bell', 1, 1, 0)]);
    run(4 * BAR_S);
    const level = heightToGainDb(0, s.heightFloorDb) + s.mixDb.bell; // −12 + −9: the floor is −12 dB (FR-MUS-05)
    for (const c of carriers(ctx)) {
      const accent = stepOf(c.startedAt as number) % 2 === 0 ? 0 : -5;
      expect(Math.abs(db(peakOf(envOf(c))) - level - accent)).toBeLessThanOrEqual(s.humanizeDb + 1e-9);
    }
    // Today's sound is untouched: the −24 dB floor and today's mix, exactly, with no accent.
    const today = await start(null, [plant('down', 'bell', 0, 0, 0), plant('off', 'bell', 1, 1, 0)]);
    today.run(BAR_S);
    const want = dbToGain(heightToGainDb(0)) * dbToGain(MIX_DB.bell);
    const peaks = carriers(today.ctx).map((c) => peakOf(envOf(c)));
    expect(peaks.length).toBeGreaterThanOrEqual(2);
    expect(new Set(peaks)).toEqual(new Set([want]));
  });

  it("P-013: every style varies each plant note's level, ±1.5 dB or more, a new draw each bar", async () => {
    // Today's sound (null) moves none: the test above. The draws are seeded by GROOVE_SEED, the same each session.
    for (const style of ['A', 'B', 'C'] as const) {
      const s = STYLES[style];
      expect(s.humanizeDb).toBeGreaterThanOrEqual(1.5);
      const { ctx, engine, run } = await start(style, [plant('down', 'bell', 0, 0, 0)]);
      // The humanize alone: a variation's swell (§1.8) moves a level too. The counter-line (§1.7) never plays on
      // step 0, which has the plant.
      (engine as unknown as { recipe: Recipe }).recipe.variations = false;
      run(32 * BAR_S);
      const level = heightToGainDb(0, s.heightFloorDb) + s.mixDb.bell; // on the downbeat: no accent
      const moved = carriers(ctx)
        .filter((c) => stepOf(c.startedAt as number) % STEPS === 0) // not the clave of B's percussion
        .map((c) => db(peakOf(envOf(c))) - level);
      expect(moved.length).toBeGreaterThanOrEqual(16); // the plant rests in some bars (P-009)
      expect(Math.max(...moved)).toBeGreaterThan(s.humanizeDb * 0.75);
      expect(Math.min(...moved)).toBeLessThan(-s.humanizeDb * 0.75);
    }
  });
});

describe('the bus effects (§1.2, §1.4, §3)', () => {
  /** compressor ← dim ← breath ← master; bus → [reverb send, echo send → delay → low-pass → master, low-pass → feedback]. */
  const nodes = (ctx: FakeAudioContext) => {
    const compressor = ctx.of('compressor')[0] as FakeNode;
    const breath = (compressor.inputs[0] as FakeNode).inputs[0] as FakeNode;
    const delay = ctx.of('delay')[0] as FakeNode;
    const echoSend = delay.inputs[0] as FakeNode; // the feedback is its second input
    const lpf = delay.outputs[0] as FakeNode;
    return { compressor, breath, echoSend, delay, lpf, feedback: lpf.outputs[1] as FakeNode };
  };

  it('the tempo echo: a delay of the style’s steps with feedback through a low-pass; it follows the tempo at the bar line', async () => {
    const { ctx, engine, run } = await start('A', bells(1));
    const n = nodes(ctx);
    expect(n.delay.kind).toBe('delay');
    expect(n.delay.maxDelayTime).toBeGreaterThanOrEqual(6 * Scheduler.stepDurationFor(60)); // C's 6 steps at 60 BPM
    expect(n.lpf.outputs[0]).toBe(n.breath.inputs[0]); // back into the master gain
    expect(n.feedback.outputs).toEqual([n.delay]);
    expect(n.echoSend.gain.last('target')?.value).toBe(0.25);
    expect(n.feedback.gain.last('target')?.value).toBe(STYLES.A.echoFeedback);
    expect(n.lpf.frequency.last('target')?.value).toBe(STYLES.A.echoLpfHz);
    // From no echo the delay is set at once, never glided up from 0 (a comb sweeping through the first notes).
    expect(n.delay.delayTime.events).toEqual([{ type: 'set', value: 3 * STEP_S, time: 0, tau: 0 }]);
    run(BAR_S);
    expect(n.delay.delayTime.events).toHaveLength(1); // the bar line finds it right
    engine.setTempo(120);
    run(2 * BAR_S);
    const changed = n.delay.delayTime.last('target');
    const step120 = Scheduler.stepDurationFor(120);
    expect(changed?.value).toBeCloseTo(3 * step120, 9);
    // At a bar line (the breathing filter glides once at each), over about a bar: τ = one bar ÷ 3.
    expect(n.breath.frequency.events.map((e) => e.time)).toContain(changed?.time);
    expect(changed?.time).toBeGreaterThan(BAR_S);
    expect(changed?.tau).toBeCloseTo((STEPS * step120) / 3, 9);
    // Today: the echo's send is shut and its delay never moves.
    const today = await start(null, bells(1));
    today.run(2 * BAR_S);
    expect(nodes(today.ctx).echoSend.gain.value).toBe(0);
    expect(nodes(today.ctx).delay.delayTime.events).toEqual([]);
  });

  it('a style set mid-session: the delay is right at once; reverb off shuts the echo send, auto opens it again', async () => {
    const { ctx, engine, run } = await start(null, bells(1));
    run(2 * BAR_S);
    const n = nodes(ctx);
    engine.setStyle('C');
    expect(n.delay.delayTime.events).toEqual([
      { type: 'set', value: 6 * STEP_S, time: ctx.currentTime, tau: 0 },
    ]);
    expect(n.echoSend.gain.last('target')?.value).toBe(STYLES.C.echoSend);
    engine.setReverb('off');
    expect(n.echoSend.gain.last('target')?.value).toBe(0);
    engine.setReverb('auto');
    expect(n.echoSend.gain.last('target')?.value).toBe(STYLES.C.echoSend);
  });

  it('the breathing filter glides once a bar to its point on the sine, low..high; today it stays wide open', async () => {
    const s = STYLES.A;
    const { ctx, run } = await start('A', bells(1));
    run(8 * BAR_S);
    const glides = nodes(ctx).breath.frequency.events.filter((e) => e.type === 'target');
    expect(glides.length).toBeGreaterThanOrEqual(8);
    const mid = Math.sqrt(s.breathLowHz * s.breathHighHz);
    expect(glides.slice(0, 8).map((e) => stepOf(e.time))).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 7].map((b) => b * STEPS),
    );
    expect(glides[0]?.value).toBeCloseTo(mid, 6);
    expect(glides[2]?.value).toBeCloseTo(s.breathHighHz, 6); // a quarter of the 8-bar sine
    expect(glides[6]?.value).toBeCloseTo(s.breathLowHz, 6);
    expect(glides[0]?.tau).toBeCloseTo(BAR_S / 3, 9);
    const today = await start(null, bells(1));
    today.run(2 * BAR_S);
    expect(nodes(today.ctx).breath.frequency.events).toEqual([]);
    expect(nodes(today.ctx).breath.frequency.value).toBe(today.ctx.sampleRate / 2);
  });

  it('the limiter of §3 with a style (−18 dB, knee 10, 4:1, 5 ms, 300 ms), and back to today’s with null', async () => {
    const { ctx, engine } = await start('B');
    const c = nodes(ctx).compressor;
    const targets = (): number[] =>
      [c.threshold, c.knee, c.ratio, c.attack, c.release].map((p) => p.last('target')?.value as number);
    expect(targets()).toEqual([-18, 10, 4, 0.005, 0.3]);
    engine.setStyle(null);
    expect(targets()).toEqual([
      LIMITER_THRESHOLD_DB,
      LIMITER_KNEE_DB,
      LIMITER_RATIO,
      LIMITER_ATTACK_S,
      LIMITER_RELEASE_S,
    ]);
  });
});

describe('harmony that moves (§1.3)', () => {
  it("each chord root's fifth, three degrees up, is a perfect fifth in its mode: nothing leaves the scale", () => {
    for (const mode of Object.keys(HARMONY_ROOTS) as ModeId[]) {
      for (const root of HARMONY_ROOTS[mode]) {
        const interval = degreeToMidi(0, mode, root + HARMONY_FIFTH_DEGREES) - degreeToMidi(0, mode, root);
        expect(interval, `${mode} degree ${root}`).toBe(7);
        expect(root).toBeLessThan(MODE_DEGREES[mode].length);
      }
    }
  });

  it('the drone plays root and fifth on the Pad, 2 bars a chord, I–vi–ii–V in C major, held to the next chord', async () => {
    const { ctx, run } = await start('A', bells(2)); // two plants: the harmony is in from the first bar
    run(8 * BAR_S + STEP_S);
    const notes = drone(ctx);
    expect(notes.map((n) => barOf(n.time))).toEqual([0, 0, 2, 2, 4, 4, 6, 6, 8, 8]);
    const roots = [0, 4, 1, 3, 0].map((d) => midiToHz(degreeToMidi(0, 'majorPent', d, -1))); // C3 A3 D3 G3 C3
    for (let chord = 0; chord < 5; chord++) {
      const [root, fifth] = [notes[2 * chord], notes[2 * chord + 1]];
      expect(root?.hz).toBeCloseTo(roots[chord] as number, 6);
      expect((fifth?.hz as number) / (root?.hz as number)).toBeCloseTo(Math.pow(2, 7 / 12), 9);
      expect(root?.end).toBeGreaterThan(stepTime((2 * chord + 2) * STEPS)); // it sounds into the next chord
    }
    // −8 dB under a new pad plant, once faded in.
    const full = dbToGain(heightToGainDb(0.55, -12) + STYLES.A.mixDb.pad - 8);
    expect(notes[8]?.peak).toBeCloseTo(full * 0.4, 9); // the Pad's saw level (PAD_SAW_LEVEL)
  });

  it("style C puts the fifth on the Choir and changes chord every 4 bars, in the room's own mode", async () => {
    const { ctx, engine, run } = await start('C', bells(2));
    engine.setSignature({ ...WANDERER, keyRoot: 2, mode: 'minorPent' });
    run(8 * BAR_S + STEP_S);
    const notes = drone(ctx);
    expect(notes.map((n) => barOf(n.time))).toEqual([0, 4, 8]);
    const fifths = ctx.of('oscillator').filter((o) => o.type === 'custom'); // the Choir's pulse (no bass plant)
    const kicks = percussion(ctx).kick.length;
    expect(fifths.length - kicks).toBe(3);
    expect(notes[1]?.hz).toBeCloseTo(midiToHz(degreeToMidi(2, 'minorPent', 4, -1)), 6); // B♭ over D: degree 4
  });
});

describe('the loop varies (P-009)', () => {
  const BARS = 30; // 1-, 2-, 3- and 5-bar cycles come round together every 30 bars
  /** The steps that sounded in each bar, one plant a step: "0,2,4" is a bar where the plants of steps 0, 2, 4 played. */
  const barsOf = (notes: readonly Played[]): string[] => {
    const bars: number[][] = Array.from({ length: BARS }, () => []);
    for (const n of notes) {
      const i = stepOf(n.time);
      bars[Math.floor(i / STEPS)]?.push(i % STEPS);
    }
    return bars.map((steps) => steps.sort((a, b) => a - b).join(','));
  };
  const play = async (style: SoundStyle | null) => {
    const { engine, run } = await start(style, bells(8)); // on steps 0, 2 … 14: none is swung
    const asked = watchPool(engine);
    run(BARS * BAR_S - STEP_S);
    // The plants' own notes: a variation's echo or ghost (§1.8) is owned by its plant too, a few steps after it.
    const notes = asked.filter((n) => isOwn(n, stepOf));
    return { bars: barsOf(notes), notes, triggers: engine.stats.triggers };
  };

  it('in a style each plant rests on its seeded cycle or skip: bars in a row differ, the same each run, on the grid', async () => {
    const a = await play('A');
    const alike = a.bars.filter((bar, i) => i > 0 && bar === a.bars[i - 1]).length;
    expect(alike).toBeLessThanOrEqual((BARS - 1) / 5); // today: all 29 pairs are alike (below)
    const played = a.bars.join(',').split(',').length;
    expect(played / (8 * BARS)).toBeGreaterThan(0.5); // a plant rests one bar of its cycle, never most of them
    expect(played / (8 * BARS)).toBeLessThan(0.95);
    expect(a.triggers).toBe(played); // a rested note is not started, and not counted
    expect((await play('A')).bars).toEqual(a.bars); // seeded by the plants' ids and the session's seed
    for (const n of a.notes) {
      const t = n.time;
      expect(Math.abs(t - stepTime(stepOf(t)))).toBeLessThanOrEqual(STYLES.A.humanizeS + 1e-9); // on its step
    }
    // Today's sound has no rest: every plant in every bar.
    expect(new Set((await play(null)).bars)).toEqual(new Set(['0,2,4,6,8,10,12,14']));
  });
});

describe('builds (§1.5) and soft percussion (§1.6)', () => {
  it('one plant: the harmony comes in at bar 4, the texture at bar 8, the kick at bar 16, each fading in over 2 bars', async () => {
    const { ctx, run } = await start('A', bells(1));
    run(17 * BAR_S);
    const p = percussion(ctx);
    const notes = drone(ctx);
    expect(barOf(notes[0]?.time as number)).toBe(4);
    expect(barOf(stepTime(p.shaker[0] as number))).toBe(8);
    expect(barOf(stepTime(p.kick[0] as number))).toBe(16);
    // The first drone note is 1/32 of its full level, the one 2 bars on is full.
    expect((notes[0]?.peak as number) / (notes[2]?.peak as number)).toBeCloseTo(
      1 / (BUILD_FADE_BARS * STEPS),
      9,
    );
  });

  it('five plants: every layer from the first bar; no plant at all: nothing plays, however long', async () => {
    const full = await start('A', bells(5));
    full.run(BAR_S);
    const p = percussion(full.ctx);
    expect(p.kick[0]).toBe(0);
    expect(p.shaker[0]).toBe(0);
    expect(drone(full.ctx)[0]?.time).toBe(stepTime(0));
    const empty = await start('A', []);
    const fixed = empty.ctx.nodes.length;
    empty.run(20 * BAR_S);
    expect(empty.ctx.nodes).toHaveLength(fixed);
  });

  it('builds count bars from the first plant, not from start; an emptied bed builds again from its next plant', async () => {
    const { ctx, engine, run } = await start('A', []);
    run(5 * BAR_S); // an empty bed: no bar counts
    engine.syncPlants(bells(1), BED);
    // The bar of the first step scheduled from here: the first that has a plant (its own note is a bar later).
    const firstBar = barOf(ctx.currentTime + LOOK_AHEAD_S);
    run(17 * BAR_S);
    expect(firstBar).toBe(5);
    expect(barOf(carriers(ctx)[0]?.startedAt as number)).toBe(6);
    const fromHere = (steps: number[]): number[] => steps.map((s) => barOf(stepTime(s)) - firstBar);
    expect(fromHere(percussion(ctx).shaker)[0]).toBe(8);
    expect(fromHere(percussion(ctx).kick)[0]).toBe(16);
    const chord = barOf(drone(ctx)[0]?.time as number) - firstBar; // the next chord bar after 4 bars played
    expect(chord).toBeGreaterThanOrEqual(4);
    expect(chord).toBeLessThan(4 + STYLES.A.droneBarsPerChord);
    // Empty for two bars, then one plant: the shaker waits 8 bars again.
    engine.syncPlants([], BED);
    run(2 * BAR_S);
    const shakers = percussion(ctx).shaker.length;
    engine.syncPlants(bells(1), BED);
    run(7 * BAR_S);
    expect(percussion(ctx).shaker.length).toBe(shakers);
    run(2 * BAR_S);
    expect(percussion(ctx).shaker.length).toBeGreaterThan(shakers);
  });

  it.each([
    ['A', { kick: [0, 8], shaker: [0, 2, 4, 6, 8, 10, 12, 14], tick: [], clave: [], breath: [] }],
    ['B', { kick: [0], shaker: [], tick: [0, 3, 6, 8, 11, 14], clave: [4, 12], breath: [] }],
    ['C', { kick: [0, 2], shaker: [], tick: [], clave: [], breath: [0] }],
  ] as const)('style %s plays its own pattern, from the bed centre', async (style, bar) => {
    const { ctx, run } = await start(style, bells(5));
    run(2 * BAR_S - 2 * STEP_S); // bars 0 and 1
    const p = percussion(ctx);
    for (const kind of ['kick', 'shaker', 'tick', 'clave'] as const) {
      expect(p[kind], kind).toEqual([...bar[kind], ...bar[kind].map((s) => s + STEPS)]);
    }
    expect(p.breath).toEqual(bar.breath); // style C's breath: every second bar
    // Every percussion note (the bells are the plants) is placed at the bed's centre: z −0.45 m, x 0.
    const sources = [...ctx.of('bufferSource'), ...ctx.of('oscillator').filter((o) => o.type === 'custom')];
    const placedAt = (s: FakeNode): number[] => {
      let n = s;
      while (n.kind !== 'panner') n = n.outputs[0] as FakeNode;
      const at = (param: FakeNode['positionX']): number =>
        last(param.events.filter((e) => e.time <= (s.startedAt as number))).value;
      return [at(n.positionX), at(n.positionZ)];
    };
    expect(sources.length).toBeGreaterThan(0);
    for (const s of sources) expect(placedAt(s)).toEqual([0, -0.45]);
  });

  it('the noise is one buffer, rendered once in setStyle, for every style; seeded white noise in −1..1', async () => {
    const { ctx, engine, run } = await start(null, bells(5));
    // One channel and NOISE_S long: the counter-line's Pluck strings (§1.7) are one-channel buffers too.
    const noiseLength = Math.floor(ctx.sampleRate * NOISE_S);
    const noiseBuffers = (): number =>
      ctx.buffers.filter((b) => b.numberOfChannels === 1 && b.length === noiseLength).length;
    expect(noiseBuffers()).toBe(0);
    for (const s of ['A', 'B', 'C', 'A'] as const) {
      engine.setStyle(s);
      run(BAR_S);
    }
    expect(noiseBuffers()).toBe(1);
    const a = new Float32Array(4096);
    const b = new Float32Array(4096);
    renderNoise(a, 7);
    renderNoise(b, 7);
    expect(b).toEqual(a);
    expect(Math.max(...a)).toBeLessThanOrEqual(1);
    expect(Math.min(...a)).toBeGreaterThanOrEqual(-1);
    expect(Math.abs(a.reduce((sum, v) => sum + v, 0) / a.length)).toBeLessThan(0.05);
  });
});

describe('the styles (§4)', () => {
  it.each(['A', 'B', 'C'] as const)("style %s's recipe reaches every voice's notes", (style) => {
    const s = STYLES[style];
    const ctx = new FakeAudioContext();
    const ref = { note: new Note() };
    const out = ctx.createGain() as unknown as AudioNode;
    const p = { hz: 220, gain: 0.5, release: 1, cutoffMul: 1, detune: 0 };
    const made = (fn: () => void): FakeNode[] => {
      const before = ctx.nodes.length;
      fn();
      return ctx.nodes.slice(before);
    };
    const bell = made(() => new Bell(ctx.audio, ref, s).trigger(1, p, out));
    expect(bell.filter((n) => n.kind === 'oscillator')[1]?.frequency.value).toBe(220 * s.bellFmRatio);
    expect(bell.find((n) => n.kind === 'gain' && n.gain.last('linear'))?.gain.last('linear')?.time).toBe(
      1 + s.bellAttackS,
    );

    const pad = made(() => new Pad(ctx.audio, ref, s).trigger(1, p, out));
    expect(pad.filter((n) => n.kind === 'oscillator').map((o) => o.detune.value)).toEqual(s.padDetuneCents);
    expect(pad.find((n) => n.kind === 'biquad')?.Q.value).toBe(s.padFilterQ);

    const bass = made(() => new Bass(ctx.audio, ref, s).trigger(1, p, out));
    expect(bass.find((n) => n.kind === 'biquad')?.frequency.value).toBe(220 * s.bassCutoffMul);
    expect(last(ctx.waves).imag).toEqual(bassPartials(s.bassDrive));

    const choir = made(() => new Choir(ctx.audio, ref, s).trigger(1, p, out));
    expect(choir.filter((n) => n.kind === 'biquad').map((f) => f.frequency.value)).toEqual(s.choirFormantsHz);
    expect(choir.filter((n) => n.kind === 'biquad').every((f) => f.Q.value === s.choirFormantQ)).toBe(true);
    expect(choir.find((n) => n.kind === 'oscillator' && n.type === 'sine')?.frequency.value).toBe(
      s.choirVibratoHz,
    );

    const pluck = made(() => new Pluck(ctx.audio, ref, s).trigger(1, p, out));
    expect(vi.mocked(renderKarplusStrong).mock.lastCall?.[5]).toBe(s.stringT60LongS);
    expect(pluck.some((n) => n.kind === 'biquad')).toBe(s.pluckLpfMul > 0);
    const env = pluck.find((n) => n.kind === 'gain') as FakeNode;
    expect(env.gain.last('linear')?.time ?? 1).toBe(1 + s.pluckAttackS);
  });

  it('switching style on a running garden: the next notes play it, with a new bass wave and the strings rendered again', async () => {
    const { ctx, engine, run } = await start(null, [plant('pl', 'pluck', 0, 0), plant('ba', 'bass', 0, 8)]);
    run(BAR_S);
    expect(vi.mocked(renderKarplusStrong).mock.lastCall?.[5]).toBe(2.5);
    engine.setStyle('A');
    run(2 * BAR_S); // two bars: a style rests a plant in some bars (P-009), this bass plant in one of these
    expect(vi.mocked(renderKarplusStrong).mock.lastCall?.[5]).toBe(STYLES.A.stringT60LongS);
    const lastBass = last(
      ctx.of('oscillator').filter((o) => o.type === 'custom' && o.frequency.events.length === 0),
    );
    expect(lastBass.wave?.imag).toEqual(bassPartials(STYLES.A.bassDrive));
    const made = { nodes: ctx.nodes.length, waves: ctx.waves.length, buffers: ctx.buffers.length };
    engine.setStyle('A'); // the same style again: nothing
    expect({ nodes: ctx.nodes.length, waves: ctx.waves.length, buffers: ctx.buffers.length }).toEqual(made);
  });

  it('a full bed of all five voices with every layer, for 13 bars: no note is stolen before it starts, every source stops', async () => {
    const voices: VoiceType[] = ['bell', 'pad', 'pluck', 'bass', 'choir'];
    const bed: Plant[] = [];
    for (let ring = 0; ring < RINGS; ring++) {
      for (let step = 0; step < STEPS; step++)
        bed.push(plant(`${ring}-${step}`, voices[(ring + step) % 5] as VoiceType, ring, step, 1));
    }
    const { ctx, engine, run } = await start('C', bed); // C humanizes the most: ±12 ms
    let most = 0;
    run(13 * BAR_S, () => {
      most = Math.max(most, engine.stats.voices);
    });
    expect(most).toBe(VOICE_CAP); // the pool is full: stealing is the bed's normal state
    expect(percussion(ctx).kick.length).toBeGreaterThan(0);
    // A note humanized ahead of its step is still a note of that step: no other note of it steals its channel.
    // A note stolen before its start is dropped whole (a 'cancel'); a stolen note that sounds is held, then faded.
    const envelopes = ctx.of('panner').flatMap((p) => (p.inputs[0] as FakeNode).inputs);
    expect(envelopes.length).toBeGreaterThan(700); // 80 plants for 13 bars, less the bars a style rests them in (P-009)
    const held = envelopes.filter((e) => e.gain.last('hold') !== undefined);
    expect(held.length).toBeGreaterThan(100);
    const droppedOrEarly = envelopes.filter((e) => {
      const start = (e.gain.events[0] as { time: number }).time;
      return e.gain.events.some((ev) => ev.type === 'cancel' || (ev.type === 'hold' && ev.time <= start));
    });
    expect(droppedOrEarly).toHaveLength(0);
    const sources = [...ctx.of('oscillator'), ...ctx.of('bufferSource')];
    expect(sources.filter((s) => s.stoppedAt === null)).toEqual([]);
    expect(ctx.count('panner')).toBe(VOICE_CAP);
  });
});
