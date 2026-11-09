// T-193 (D-076; API_SPEC §1.2 v1.2.70): a plant's library picks its voice. `VoiceParams.calm` is set at sync from
// `plant.family`, in every style; a note that is no plant's follows the style (drone, ripple, goodnight) or is never
// calm (a UI sound). On the fake AudioContext and the fake 25 ms tick: the notes the pool is asked for and the nodes
// they make are read, nothing is heard.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Engine } from '../../../src/audio/AudioEngine.js';
import { TICK_MS } from '../../../src/audio/config.js';
import { voiceParamsFor } from '../../../src/audio/mapping.js';
import { Scheduler } from '../../../src/audio/Scheduler.js';
import { STYLES, type SoundStyle } from '../../../src/audio/styles.js';
import { hzForRing } from '../../../src/audio/theory.js';
import { RINGS, SEED_KINDS, STEPS, WANDERER } from '../../../src/garden/index.js';

import { FakeAudioContext, last, type FakeNode } from './fakeAudio.js';
import { watchPool } from './uiRules.js';

import type { VoicePool } from '../../../src/audio/VoicePool.js';
import type { VoiceParams } from '../../../src/audio/voices/note.js';
import type { Plant, VoiceType } from '../../../src/garden/index.js';

const BPM = 84;
const BAR_S = STEPS * Scheduler.stepDurationFor(BPM);
const TICK_S = TICK_MS / 1000;
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];

const plant = (id: string, voice: VoiceType, ring: number, step: number, family?: 'new'): Plant => ({
  id,
  voice,
  cell: { ring, step },
  height: 0.55,
  hue: 0.8, // off the middle: a cutoff and a detune of its own
  plantedAt: 0,
  ...(family === 'new' && { family }),
});
const blank = (): VoiceParams => ({
  hz: 0,
  gain: 0,
  release: 0,
  cutoffMul: 1,
  detune: 0,
  timbre: 0,
  calm: false,
});
const isSource = (n: FakeNode): boolean => n.kind === 'oscillator' || n.kind === 'bufferSource';

async function start(style: SoundStyle | null, plants: Plant[] = []) {
  const ctx = new FakeAudioContext();
  const engine = new Engine();
  engine.setTempo(BPM);
  engine.setStyle(style);
  await engine.init(ctx.audio);
  engine.syncPlants(plants, BED);
  let ticks = 0;
  const run = (seconds: number): void => {
    for (let n = Math.round(seconds / TICK_S); n > 0; n--) {
      ctx.currentTime = ++ticks * TICK_S;
      vi.advanceTimersByTime(TICK_MS);
    }
  };
  return { ctx, engine, run };
}

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("a plant's library picks its voice (T-193)", () => {
  /** Sources a note: the voice as built (style B's Pad has three saws), and its calm sibling (calm.test.ts). */
  const OLD = { bell: 2, pluck: 1, choir: 2, pad: 3 };
  const CALM = { bell: 7, pluck: 7, choir: 3, pad: 4 };

  it.each(['bell', 'pluck', 'choir', 'pad'] as const)(
    'in style B a %s plant without `family` plays the voice as built, one with `family: "new"` its calm sibling',
    async (voice) => {
      const { ctx, engine, run } = await start('B', [
        plant('old', voice, 0, 0),
        plant('new', voice, 1, 8, 'new'),
      ]);
      // Each note a plant owns (its step note, a variation's echo of it): the sources its voice made for it.
      const old = new Set<number>();
      const fresh = new Set<number>();
      const pool = (engine as unknown as { g: { pool: VoicePool } }).g.pool;
      const play = pool.play.bind(pool);
      vi.spyOn(pool, 'play').mockImplementation((...args) => {
        const made = ctx.nodes.length;
        const ok = play(...args);
        const owner = args[6] as { plant: Plant } | null;
        if (owner !== null)
          (owner.plant.id === 'old' ? old : fresh).add(ctx.nodes.slice(made).filter(isSource).length);
        return ok;
      });
      run(8 * BAR_S);
      expect([...old]).toEqual([OLD[voice]]);
      expect([...fresh]).toEqual([CALM[voice]]);
    },
  );

  it('on every ring each of the ten kinds has the pitch of its voice, and is calm only in the New library', async () => {
    const plants = SEED_KINDS.flatMap((k, step) =>
      Array.from({ length: RINGS }, (_, ring) => plant(`${k.kind}${ring}`, k.voice, ring, step, k.family)),
    );
    expect(plants).toHaveLength(10 * RINGS);
    for (const style of [null, 'B'] as const) {
      const { engine } = await start(style, plants);
      const records = (engine as unknown as { records: Map<string, { params: VoiceParams }> }).records;
      for (const p of plants) {
        const params = records.get(p.id)?.params;
        expect(params?.hz, p.id).toBe(hzForRing(WANDERER, p.cell.ring, p.voice));
        expect(params?.calm, p.id).toBe(p.family === 'new');
      }
    }
  });

  it('two seeds of one kind on one ring differ in cutoff, detune or timbre; a reused scratch keeps no stale `calm`', () => {
    for (const k of SEED_KINDS) {
      const tone = (p: Plant): number[] => {
        const o = voiceParamsFor(p, 220, blank());
        return [o.cutoffMul, o.detune, o.timbre];
      };
      expect(tone(plant('a', k.voice, 2, 0, k.family)), k.kind).not.toEqual(
        tone(plant('b', k.voice, 2, 1, k.family)),
      );
    }
    const scratch = voiceParamsFor(plant('a', 'bell', 2, 0, 'new'), 220, blank());
    expect(scratch.calm).toBe(true);
    expect(voiceParamsFor(plant('b', 'bell', 2, 1), 220, scratch).calm).toBe(false);
  });
});

describe("the notes that are no plant's (T-193)", () => {
  it('the drone in style B is still the shruti box, over Old plants; a UI tick is never calm: the FM bell', async () => {
    const { ctx, engine, run } = await start('B', [plant('a', 'bell', 0, 0), plant('b', 'bell', 1, 2)]);
    const played = watchPool(engine);
    run(2 * BAR_S);
    const drone = played.filter((n) => n.voice === 'Pad' && n.owner === null); // no plant here is a pad
    expect(drone.length).toBeGreaterThanOrEqual(2);
    expect(drone.every((n) => n.p.calm)).toBe(true);
    // The shruti box has a reed an octave up; the Pad as built has its three saws on the note.
    const saws = ctx.of('oscillator').filter((o) => o.type === 'sawtooth');
    const root = drone[0]?.p.hz as number;
    expect(saws.some((o) => o.frequency.value === 2 * root)).toBe(true);

    engine.chordTone(1, ctx.currentTime); // a ripple note on the Bell: calm in B, on the scratch the tick takes next
    expect(last(played).p.calm).toBe(true);
    const made = ctx.nodes.length;
    engine.ui('tick');
    expect(last(played).p.calm).toBe(false);
    const tick = ctx.nodes.slice(made).filter(isSource);
    expect(tick.map((o) => o.type)).toEqual(['sine', 'sine']); // carrier and modulator; a bowl has seven
    expect(tick[1]?.frequency.value).toBe((tick[0] as FakeNode).frequency.value * STYLES.B.bellFmRatio);
  });

  it.each([
    [null, false],
    ['B', true],
  ] as const)(
    'style %s: after a preview, chordTone and goodnight have cutoffMul 1, detune 0, timbre 0 and calm %s',
    async (style, calm) => {
      const { ctx, engine, run } = await start(style);
      run(1); // the tide is going
      const p = plant(
        'a',
        'bell',
        2,
        (engine.clock.stepIndex() + STEPS / 2) % STEPS,
        calm ? undefined : 'new',
      );
      engine.syncPlants([p], BED);
      const played = watchPool(engine);
      engine.preview({ ...p, height: 0.9 });
      const preview = played[0]?.p as VoiceParams;
      // The preview leaves the plant's own tone, and the other library's switch, on the scratch the next notes fill.
      expect(preview.cutoffMul).not.toBe(1);
      expect(preview.detune).not.toBe(0);
      expect(preview.timbre).not.toBe(0);
      expect(preview.calm).toBe(!calm);
      engine.chordTone(1, ctx.currentTime);
      engine.ui('goodnight');
      const after = played.slice(1).map((n) => [n.p.cutoffMul, n.p.detune, n.p.timbre, n.p.calm]);
      // One ripple note, then the three of the ending chord.
      expect(after).toEqual(Array.from({ length: 4 }, () => [1, 0, 0, calm]));
    },
  );
});

describe('the voices (T-193)', () => {
  it('no voice reads the style for its calm sibling: the note says it (`p.calm`)', () => {
    const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src/audio/voices');
    for (const file of readdirSync(dir)) {
      expect(readFileSync(join(dir, file), 'utf8'), file).not.toMatch(/\br\.calmVoices\b/);
    }
  });
});
