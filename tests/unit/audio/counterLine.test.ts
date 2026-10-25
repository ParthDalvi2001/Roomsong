// T-164 §1.7 the counter-line and §1.8 the variations (FR-MUS-11), in the styles: what the pool is asked for, on
// Layers with a stand-in pool (the engine's tick written out, no rests, so a step's emptiness is fixed) and on the
// engine's fake tick. Today's sound (style null) has neither. The session's seed decides every draw.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Engine } from '../../../src/audio/AudioEngine.js';
import { createAudioEngine } from '../../../src/audio/AudioSystem.js';
import {
  BUILD_FADE_BARS,
  COUNTER_DB,
  COUNTER_MAX_PER_BAR,
  COUNTER_MOTIF_BARS,
  GROOVE_SEED,
  START_DELAY_S,
  TICK_MS,
  VARIATION_BARS,
  VARIATION_ECHO_DB,
  VARIATION_ECHO_STEPS,
  VARIATION_GHOST_DB,
  VARIATION_GHOST_STEPS,
  VARIATION_SWELL_BARS,
  VARIATION_SWELL_DB,
} from '../../../src/audio/config.js';
import { Layers, type Grooved } from '../../../src/audio/Layers.js';
import { dbToGain } from '../../../src/audio/mapping.js';
import { Scheduler } from '../../../src/audio/Scheduler.js';
import { STYLES, TODAY, type Recipe } from '../../../src/audio/styles.js';
import { clock, MS_PER_DAY } from '../../../src/core/index.js';
import { STEPS, WANDERER } from '../../../src/garden/index.js';

import { FakeAudioContext } from './fakeAudio.js';
import { watchPool, type Played } from './uiRules.js';

import type { Plant, VoiceType } from '../../../src/garden/index.js';

const BPM = 84;
const STEP_S = Scheduler.stepDurationFor(BPM);
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
/** Style A with no rests, no humanize and straight 8ths: every plant plays every bar, at its own level exactly. */
const EXACT: Recipe = {
  ...STYLES.A,
  cycleBars: [],
  humanizeDb: 0,
  humanizeS: 0,
  swing: 0.5,
  accentsDb: new Array<number>(STEPS).fill(0),
};

interface Asked {
  voice: object;
  time: number;
  hz: number;
  gain: number;
  release: number;
  owner: object | null;
  at: number[];
  /** A plant's own note, played by the tick below; else a layer's (a variation's echo or ghost is owned too). */
  own: boolean;
}

function record(i: number, voice: VoiceType, step: number, hz: number, gain: number): Grooved {
  return {
    plant: { id: `p${i}`, voice, cell: { ring: i % 5, step }, height: 0.55, hue: 0.5, plantedAt: 0 },
    params: { hz, gain, release: 1, cutoffMul: 1, detune: 0 },
    seed: i * 7919,
    voice: { name: `${voice}${i}` } as never,
    x: i,
    y: 0.74,
    z: -i,
  };
}

/** Layers on a stand-in pool with `plants` on their steps; `bars(n)` runs n bars as the engine's tick does. */
function rig(recipe: Recipe, plants: Grooved[], seed = GROOVE_SEED) {
  const ctx = new FakeAudioContext();
  const asked: Asked[] = [];
  let inTick = false;
  const pool = {
    ref: { note: null },
    play: (
      voice: object,
      time: number,
      p: { hz: number; gain: number; release: number },
      x: number,
      y: number,
      z: number,
      owner: object | null = null,
    ): boolean => {
      asked.push({
        voice,
        time,
        hz: p.hz,
        gain: p.gain,
        release: p.release,
        owner,
        at: [x, y, z],
        own: inTick,
      });
      return true;
    },
  };
  const steps: Grooved[][] = Array.from({ length: STEPS }, () => []);
  for (const p of plants) steps[p.plant.cell.step]!.push(p);
  const pluck = { name: 'pluck' };
  const bell = { name: 'bell' };
  const layers = new Layers({
    ctx: ctx.audio,
    pool: pool as never,
    scheduler: { stepS: STEP_S } as never,
    recipe,
    bell: bell as never,
    pluck: pluck as never,
    choirPulse: {},
    bus: ctx.createGain() as never,
    master: ctx.createGain() as never,
    compressor: ctx.createDynamicsCompressor() as never,
    bed: BED,
    key: () => WANDERER,
    steps,
    seed,
  });
  layers.restyle(0);
  let abs = -1;
  const bars = (n: number): void => {
    for (let k = 0; k < n * STEPS; k++) {
      abs++;
      const step = abs % STEPS;
      const bar = (abs / STEPS) | 0;
      const time = abs * STEP_S;
      for (const r of steps[step]!) {
        if (layers.rests(r, bar)) continue;
        layers.groove(r, step, bar, time);
        inTick = true;
        pool.play(r.voice, layers.noteTime, layers.note, r.x, r.y, r.z, r);
        inTick = false;
      }
      layers.step(step, time, bar, plants.length);
    }
  };
  const stepOf = (t: number): number => Math.round(t / STEP_S);
  /** The layer notes on a plant's voice or the counter-line's: the variations' and the line's, not the drone's or percussion's. */
  const ofPlants = (): Asked[] =>
    asked.filter(
      (a) => !a.own && (plants.some((p) => p.voice === a.voice) || a.voice === pluck || a.voice === bell),
    );
  const owned = (): Asked[] => asked.filter((a) => a.own);
  return { asked, bars, stepOf, ofPlants, owned, pluck, bell };
}

/** The fade of a layer that came in at step 0 (§1.5), at absolute step `abs`. */
const fadeAt = (abs: number): number => Math.min(1, (abs + 1) / (BUILD_FADE_BARS * STEPS));

const THREE = [
  record(0, 'bell', 0, 220, 0.3),
  record(1, 'bell', 4, 330, 0.2),
  record(2, 'pluck', 8, 440, 0.1),
];
const FIVE = [...THREE, record(3, 'pad', 12, 110, 0.25), record(4, 'bass', 2, 55, 0.15)];
/** Style A's recipe with the line and the percussion only: the variations' notes are the only ones on a plant's voice. */
const VARIATIONS_ONLY: Recipe = { ...EXACT, counterProbability: 0, droneBarsPerChord: 0 };

describe('the counter-line (§1.7)', () => {
  it("in A: Pluck notes from the bed's centre on steps with no plant note only, at most 3 a bar, a planted pitch an octave up, −10 dB under the plant it copies", () => {
    const r = rig(EXACT, THREE);
    r.bars(12);
    const line = r.ofPlants().filter((n) => n.voice === r.pluck);
    expect(line.length).toBeGreaterThan(6);
    const perBar = new Map<number, number>();
    for (const n of line) {
      const abs = r.stepOf(n.time);
      expect([0, 4, 8]).not.toContain(abs % STEPS);
      const src = THREE.find((p) => p.params.hz * 2 === n.hz);
      expect(src).toBeDefined();
      expect(n.at).toEqual([0, 0.74, -0.45]);
      expect(n.gain).toBeCloseTo(src!.params.gain * dbToGain(COUNTER_DB) * fadeAt(abs), 9);
      const bar = Math.floor(abs / STEPS);
      perBar.set(bar, (perBar.get(bar) ?? 0) + 1);
    }
    expect(Math.max(...perBar.values())).toBeLessThanOrEqual(COUNTER_MAX_PER_BAR);
  });

  it('a motif holds for its 2 bars: the second bar plays the first again; the next motif is another line', () => {
    const r = rig(EXACT, THREE);
    r.bars(12);
    const line = r.ofPlants().filter((n) => n.voice === r.pluck);
    const barOf = (bar: number): string =>
      line
        .filter((n) => Math.floor(r.stepOf(n.time) / STEPS) === bar)
        .map((n) => `${r.stepOf(n.time) % STEPS}:${n.hz}`)
        .join(' ');
    const motifs = new Set<string>();
    for (let bar = BUILD_FADE_BARS; bar < 12; bar += COUNTER_MOTIF_BARS) {
      expect(barOf(bar + 1)).toBe(barOf(bar));
      motifs.add(barOf(bar));
    }
    expect(motifs.size).toBeGreaterThan(1);
  });

  it('seeded: the same seed plays the same line; another seed another; B plays it on the Bell; C, with 0.15, plays fewer notes; today none', () => {
    const line = (recipe: Recipe, seed: number) => {
      const r = rig(recipe, THREE, seed);
      r.bars(40);
      return r.ofPlants().filter((n) => n.voice === r.pluck || n.voice === r.bell);
    };
    const a1 = line(EXACT, 1);
    expect(line(EXACT, 1)).toEqual(a1);
    expect(line(EXACT, 2)).not.toEqual(a1);
    const b = rig({ ...STYLES.B, cycleBars: [] }, THREE);
    b.bars(12);
    const onBell = b
      .ofPlants()
      .filter((n) => n.voice === b.bell && THREE.some((p) => p.params.hz * 2 === n.hz));
    expect(onBell.length).toBeGreaterThan(6);
    expect(STYLES.C.counterProbability).toBe(0.15);
    expect(line({ ...STYLES.C, cycleBars: [] }, GROOVE_SEED).length).toBeLessThan(
      line(EXACT, GROOVE_SEED).length,
    );
    const today = rig({ ...TODAY }, THREE);
    today.bars(8);
    expect(today.ofPlants()).toEqual([]);
  });
});

describe('the variations (§1.8, FR-MUS-11)', () => {
  /** Block 0 of a 4-bar run with five plants (the layer is in from bar 0), as the seed draws it. */
  function block(seed: number) {
    const r = rig(VARIATIONS_ONLY, FIVE, seed);
    r.bars(VARIATION_BARS);
    const extra = r.ofPlants();
    const kind =
      extra.length === 0
        ? 'swell'
        : extra.every((n) => FIVE.some((p) => p.voice === n.voice && p.params.hz * 2 === n.hz))
          ? 'echo'
          : 'ghosts';
    return { r, extra, kind };
  }

  it('each block of 4 bars has one of the three, drawn from the seed: over seeds 0..40 all three come, each as specified, at most 2 notes a block', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed <= 40; seed++) {
      const { r, extra, kind } = block(seed);
      seen.add(kind);
      expect(extra.length).toBeLessThanOrEqual(2);
      for (const n of extra) {
        const abs = r.stepOf(n.time);
        const src = FIVE.find((p) => p.voice === n.voice)!;
        const later = kind === 'echo' ? VARIATION_ECHO_STEPS : VARIATION_GHOST_STEPS;
        expect(abs).toBe(src.plant.cell.step + later); // so many steps after the plant's own note of the block's first bar
        expect(n.hz).toBe(src.params.hz * (kind === 'echo' ? 2 : 1));
        expect(n.gain).toBeCloseTo(
          src.params.gain * dbToGain(kind === 'echo' ? VARIATION_ECHO_DB : VARIATION_GHOST_DB) * fadeAt(abs),
          9,
        );
        expect(n.at).toEqual([src.x, src.y, src.z]); // from the plant's own place
        expect(n.owner).toBe(src); // owned by it: a removal inside the look-ahead releases it (FR-MUS-12)
      }
      if (kind === 'echo') expect(extra).toHaveLength(1);
      if (kind === 'swell') {
        // One plant's notes rise +2 dB over 2 bars from the block's start, then fall back; the others stay.
        const swelled = FIVE.filter((p) => {
          const notes = r.owned().filter((n) => n.owner === p);
          return notes.some((n) => Math.abs(n.gain - p.params.gain) > 1e-9);
        });
        expect(swelled).toHaveLength(1);
        const p = swelled[0]!;
        const gainAt = (bar: number): number =>
          r.owned().find((n) => n.owner === p && r.stepOf(n.time) === bar * STEPS + p.plant.cell.step)!.gain;
        const want = (t: number): number => p.params.gain * dbToGain(VARIATION_SWELL_DB * t);
        const perBar = 1 / VARIATION_SWELL_BARS;
        expect(gainAt(1)).toBeCloseTo(want(perBar + p.plant.cell.step / (VARIATION_SWELL_BARS * STEPS)), 9);
        expect(gainAt(2)).toBeCloseTo(want(1 - p.plant.cell.step / (VARIATION_SWELL_BARS * STEPS)), 9);
        expect(gainAt(3)).toBeLessThan(gainAt(2));
      }
    }
    expect(seen).toEqual(new Set(['echo', 'ghosts', 'swell']));
  });

  it("deterministic by seed over 16 bars; a plant that rests in the block's first bar is not echoed; today has none", () => {
    const play = (recipe: Recipe, seed: number) => {
      const r = rig(recipe, FIVE, seed);
      r.bars(4 * VARIATION_BARS);
      return r.asked.map((a) => `${a.time.toFixed(4)} ${a.hz} ${a.gain.toFixed(6)}`);
    };
    expect(play(VARIATIONS_ONLY, 7)).toEqual(play(VARIATIONS_ONLY, 7));
    expect(play(VARIATIONS_ONLY, 7)).not.toEqual(play(VARIATIONS_ONLY, 8));
    // With the style's cycles a plant rests in some bars (P-009): no echo or ghost of a note that did not sound.
    const r = rig(
      { ...VARIATIONS_ONLY, cycleBars: STYLES.A.cycleBars, cycleSkip: STYLES.A.cycleSkip },
      FIVE,
      3,
    );
    r.bars(8 * VARIATION_BARS);
    for (const n of r.ofPlants()) {
      const src = FIVE.find((p) => p.voice === n.voice)!;
      const abs = r.stepOf(n.time);
      const first = Math.floor(abs / (VARIATION_BARS * STEPS)) * VARIATION_BARS; // the block's first bar
      expect(
        r.owned().some((o) => o.owner === src && r.stepOf(o.time) === first * STEPS + src.plant.cell.step),
      ).toBe(true);
    }
    const today = rig({ ...TODAY }, FIVE);
    today.bars(2 * VARIATION_BARS);
    expect(today.ofPlants()).toEqual([]);
  });
});

describe('in the engine', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  const bells = (n: number): Plant[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `b${i}`,
      voice: 'bell',
      cell: { ring: i % 5, step: (3 * i) % STEPS },
      height: 0.55,
      hue: 0.5,
      plantedAt: 0,
    }));

  async function start(style: 'A' | null, plants: Plant[], seed?: number) {
    const ctx = new FakeAudioContext();
    const engine = seed === undefined ? (createAudioEngine() as Engine) : new Engine(seed);
    engine.setTempo(BPM);
    engine.setStyle(style);
    await engine.init(ctx.audio);
    engine.syncPlants(plants, BED);
    const asked = watchPool(engine);
    let ticks = 0;
    const run = (seconds: number): void => {
      for (let n = Math.round((seconds * 1000) / TICK_MS); n > 0; n--) {
        ctx.currentTime = (++ticks * TICK_MS) / 1000;
        vi.advanceTimersByTime(TICK_MS);
      }
    };
    return { engine, asked, run };
  }

  it("today's sound (style null) is unchanged: every note is a plant's own", async () => {
    const { asked, run } = await start(null, bells(5));
    run(8 * STEPS * STEP_S);
    expect(asked.length).toBeGreaterThan(30);
    expect(asked.every((n) => n.owner !== null)).toBe(true);
  });

  /** Style A's counter-line, as the times its Pluck notes start: the plants are bells, so a Pluck note is the line's. */
  const lineOf = (asked: Played[]): number[] =>
    asked.filter((n) => n.owner === null && n.voice === 'Pluck').map((n) => Math.round(n.time * 1e4));

  it('style A with five plants: the line is on the Pluck, only on the steps with no plant; the seed decides it', async () => {
    const stepOf = (t: number): number => Math.round((t - START_DELAY_S) / STEP_S);
    const plants = bells(5);
    const a = await start('A', plants, 5);
    a.run(8 * STEPS * STEP_S);
    const line = a.asked.filter((n) => n.owner === null && n.voice === 'Pluck');
    expect(line.length).toBeGreaterThan(0);
    const plantSteps = new Set(plants.map((p) => p.cell.step));
    for (const n of line) expect(plantSteps.has(stepOf(n.time) % STEPS)).toBe(false);
    expect(a.engine.stats.voices).toBeLessThanOrEqual(24);
    const b = await start('A', plants, 6);
    b.run(8 * STEPS * STEP_S);
    expect(lineOf(b.asked)).not.toEqual(lineOf(a.asked));
  });

  it("the app's engine draws them from the local day (FR-MUS-11): the same day plays the same line, the next day another", async () => {
    const lineOn = async (day: number): Promise<number[]> => {
      const now = vi.spyOn(clock, 'now').mockReturnValue(day * MS_PER_DAY + MS_PER_DAY / 2); // midday UTC: that day in any zone
      const { asked, run } = await start('A', bells(5));
      run(8 * STEPS * STEP_S);
      now.mockRestore();
      return lineOf(asked);
    };
    const today = await lineOn(20_385);
    expect(today.length).toBeGreaterThan(0);
    expect(await lineOn(20_385)).toEqual(today);
    expect(await lineOn(20_386)).not.toEqual(today);
  });
});
