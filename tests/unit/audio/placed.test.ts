// P-012: a plant just set into its cell sounds its own note at once, quietly, by the UI-sound rules (P-025, T-172):
// at the audio clock's now, its voice and pitch, −10…+3 dB against a full-height plant of its voice; in every style,
// today's too, because it is the feedback of the planting. Its own step note never doubles it. On the fake
// AudioContext and the fake 25 ms tick: the notes the pool is asked for are read, nothing is heard.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Engine } from '../../../src/audio/AudioEngine.js';
import { TICK_MS, UI_LEVEL_DB_RE_PLANT } from '../../../src/audio/config.js';
import { grooveSeed } from '../../../src/audio/Layers.js';
import { dbToGain, hueToDetuneCents } from '../../../src/audio/mapping.js';
import { Scheduler } from '../../../src/audio/Scheduler.js';
import { STYLES, TODAY, type SoundStyle } from '../../../src/audio/styles.js';
import { hzForRing } from '../../../src/audio/theory.js';
import { STEPS, WANDERER } from '../../../src/garden/index.js';

import { FakeAudioContext } from './fakeAudio.js';
import { watchPool } from './uiRules.js';

import type { Layers } from '../../../src/audio/Layers.js';
import type { Plant, VoiceType } from '../../../src/garden/index.js';

const BPM = 84;
const STEP_S = Scheduler.stepDurationFor(BPM);
const TICK_S = TICK_MS / 1000;
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
const VOICES: Record<VoiceType, string> = {
  bell: 'Bell',
  pad: 'Pad',
  pluck: 'Pluck',
  bass: 'Bass',
  choir: 'Choir',
  shimmer: 'Bell',
};

const plant = (id: string, voice: VoiceType, ring: number, step: number): Plant => ({
  id,
  voice,
  cell: { ring, step },
  height: 0.55, // a new plant
  hue: 0.8,
  plantedAt: 0,
});

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function start(style: SoundStyle | null) {
  const ctx = new FakeAudioContext();
  const engine = new Engine();
  engine.setTempo(BPM);
  engine.setStyle(style);
  await engine.init(ctx.audio);
  let ticks = 0;
  const run = (seconds: number): void => {
    for (let n = Math.round(seconds / TICK_S); n > 0; n--) {
      ctx.currentTime = ++ticks * TICK_S;
      vi.advanceTimersByTime(TICK_MS);
    }
  };
  run(1); // the tide is going
  const g = (engine as unknown as { g: { scheduler: Scheduler; layers: Layers } }).g;
  return { ctx, engine, run, scheduler: g.scheduler, layers: g.layers, played: watchPool(engine) };
}

describe('ui("placed", id) (P-012)', () => {
  it.each([null, 'A', 'B', 'C'] as const)(
    'style %s: the plant’s own voice and pitch, now, from its cell, −10…+3 dB against a full-height plant',
    async (style) => {
      const recipe = style === null ? TODAY : STYLES[style];
      for (const voice of ['bell', 'pad', 'pluck', 'bass', 'choir', 'shimmer'] as const) {
        const { ctx, engine, run, played } = await start(style);
        const step = (engine.clock.stepIndex() + STEPS / 2) % STEPS; // the tide is half a bar away
        const p = plant(`new-${voice}`, voice, 3, step);
        engine.syncPlants([p], BED);
        engine.ui('placed', p.id);
        expect(played, voice).toHaveLength(1);
        const note = played[0]!;
        expect(note.voice).toBe(VOICES[voice]);
        expect(note.time).toBe(ctx.currentTime); // P-025: at the clock's now, not at the next step
        expect(note.p.hz).toBeCloseTo(hzForRing(WANDERER, 3, voice), 9);
        expect(note.p.detune).toBe(hueToDetuneCents(p.hue));
        const db = 20 * Math.log10(note.p.gain / dbToGain(recipe.mixDb[voice]));
        expect(db).toBeGreaterThanOrEqual(UI_LEVEL_DB_RE_PLANT[0]);
        expect(db).toBeLessThanOrEqual(UI_LEVEL_DB_RE_PLANT[1]);
        if (style !== null) continue; // a style's layer notes sound from the bed's centre
        run(STEPS * STEP_S); // the tide reaches it: its own note, from the same place
        const own = played.slice(1);
        expect(own, voice).toHaveLength(1);
        expect(own[0]!.at).toEqual(note.at);
      }
    },
  );

  it('the tide reaches the plant within a step: its step note is the feedback, played once; a rest there gets the placed note', async () => {
    const { ctx, engine, run, scheduler, layers, played } = await start('A');
    // A step not scheduled yet whose time is less than a step away.
    const soon = (): number => {
      for (let s = 0; s < STEPS; s++)
        if (scheduler.timeOf(scheduler.nextIndexOf(s)) - ctx.currentTime < STEP_S) return s;
      return -1;
    };
    while (soon() < 0) run(TICK_S);
    const step = soon();
    const bar = (scheduler.nextIndexOf(step) / STEPS) | 0;
    // Two plants of that step: one that plays in that bar, one that rests in it (P-009, seeded by the id).
    const ids = Array.from({ length: 64 }, (_, k) => `p${k}`);
    const rests = (id: string): boolean => layers.rests({ seed: grooveSeed(id) } as never, bar);
    const playing = plant(
      ids.find((id) => !rests(id))!,
      'bell',
      1,
      step,
    );
    const resting = plant(ids.find(rests)!, 'bell', 2, step);
    engine.syncPlants([playing], BED);
    engine.ui('placed', playing.id);
    expect(played).toEqual([]); // no note now: the step's own note comes within a step
    engine.syncPlants([playing, resting], BED);
    engine.ui('placed', resting.id);
    expect(played.map((n) => n.time)).toEqual([ctx.currentTime]); // it rests there: it sounds now
    const placedAt = ctx.currentTime;
    run(STEP_S + 2 * TICK_S);
    const ofPlaying = played.filter((n) => n.p.hz === hzForRing(WANDERER, 1, 'bell'));
    expect(ofPlaying).toHaveLength(1); // its step note, once, less than a step after the planting
    expect(ofPlaying[0]!.time - placedAt).toBeLessThan(STEP_S + STYLES.A.humanizeS);
  });

  it('a styled step note can start humanizeS early: a step and that away, it is still the feedback, so no placed note', async () => {
    const { ctx, engine, scheduler, layers, played } = await start('A');
    const first = Math.min(...Array.from({ length: STEPS }, (_, s) => scheduler.nextIndexOf(s)));
    const i = first + 1; // the step after the next one to be scheduled
    const step = i % STEPS;
    const rests = (id: string): boolean => layers.rests({ seed: grooveSeed(id) } as never, (i / STEPS) | 0);
    const p = plant(
      Array.from({ length: 64 }, (_, k) => `q${k}`).find((id) => !rests(id))!,
      'bell',
      1,
      step,
    );
    ctx.currentTime = scheduler.timeOf(i) - STEP_S - STYLES.A.humanizeS / 2; // its step: a step and a bit away
    engine.syncPlants([p], BED);
    engine.ui('placed', p.id);
    expect(played).toEqual([]);
  });

  it('nothing for a plant the engine does not have, before init(), or while the context is not running', async () => {
    const before = new Engine();
    expect(() => before.ui('placed', 'a')).not.toThrow();
    const { ctx, engine, played } = await start(null);
    engine.syncPlants([plant('a', 'bell', 0, 0)], BED);
    engine.ui('placed', 'nobody');
    engine.syncPlants([{ ...plant('off', 'bell', 0, 0), cell: { ring: 7, step: 0 } }], BED); // off the bed
    engine.ui('placed', 'off');
    ctx.state = 'suspended';
    engine.syncPlants([plant('b', 'bell', 0, (engine.clock.stepIndex() + 8) % STEPS)], BED);
    engine.ui('placed', 'b');
    expect(played).toEqual([]);
  });
});
