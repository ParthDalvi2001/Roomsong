// NFR-PERF-08 for the audio wiring (T-128d): GardenAudioSystem.update, with the real engine's setListenerPose
// inside it, creates nothing per frame with a full bed of 80 plants synced, the session tuned, the head moving
// every frame and the bed still (so no sync is due). The engine runs on the fake AudioContext of the audio tests;
// its tick is not run here (it is the engine's own timer, not the frame's).
import { Matrix4, Object3D } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { Engine } from '../../../src/audio/AudioEngine.js';
import { GardenAudioSystem } from '../../../src/audio/AudioSystem.js';
import { Scheduler } from '../../../src/audio/Scheduler.js';
import { bus } from '../../../src/core/index.js';
import { STEPS, WANDERER } from '../../../src/garden/index.js';
import { fullBedExcept, garden } from '../garden/fixtures.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';
import { FakeEntity, FakeQuery } from '../render/seedRig.js';

import { FakeAudioContext, FakeParam } from './fakeAudio.js';

const FRAMES = 2_000;
const MOST_ROUNDS = 20;
/** 250 bars of steps for the stillness case. */
const STEPS_RUN = 4000;
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];

beforeAll(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
afterAll(() => vi.useRealTimers());

describe('GardenAudioSystem.update per frame (NFR-PERF-08)', () => {
  it('80 plants, tuned, the head moving every frame: nothing allocated', async () => {
    const engine = new Engine();
    const ctx = new FakeAudioContext();
    await engine.init(ctx.audio);
    // The fake keeps each parameter event as an object; what is measured is the wiring's and the engine's own.
    for (const p of Object.values(ctx.listener)) p.setTargetAtTime = (): FakeParam => p;
    const head = new Object3D();
    const world = { renderer: { xr: { isPresenting: true } }, player: { head }, camera: new Object3D() };
    const system = new GardenAudioSystem(world as never, {} as never, 40);
    const beds = new FakeQuery();
    system.queries = { beds } as never;
    system.config.engine.value = engine;
    system.init();
    const bed = new FakeEntity();
    bed.object3D = { matrixWorld: new Matrix4().makeTranslation(0, 0.74, -0.45) };
    beds.add(bed);
    const full = garden(fullBedExcept([12]));
    bus.emit('garden:changed', { state: full, diff: { added: [], removed: [], changed: [] } });
    bus.emit('room:signature', { signature: WANDERER, starterSeeds: false });

    // As elics calls it: one megamorphic loop over the world's systems (BedRenderSystem.heap.test.ts says why).
    const others = [class A {}, class B {}, class C {}, class D {}, class E {}].map((Kind) =>
      Object.assign(new Kind(), { update: (): void => {} }),
    );
    const systems: { update(delta: number, time: number): void }[] = [...others, system];
    // The head sways on fractions written in place into its matrix, as the XR input system writes it.
    const m = head.matrixWorld.elements;
    const WOBBLE = new Float64Array(97).map((_, i) => 0.0137 * Math.sin(i * 0.37));
    let frames = 0;
    const run = (): void => {
      for (let i = 0; i < FRAMES; i++) {
        const k = ++frames;
        m[12] = WOBBLE[k % 97]!;
        m[13] = 1.2 + WOBBLE[(k + 31) % 97]!;
        for (let s = 0; s < systems.length; s++) systems[s]!.update(0.0139, k);
      }
    };
    const isClean = (cost: { gcs: number; grewBytes: number }): boolean =>
      cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < PROBE_BYTES;

    run(); // warm up
    const rounds: { gcs: number; grewBytes: number }[] = [];
    const startedMs = performance.now();
    for (let i = 0; i < MOST_ROUNDS; i++) {
      const cost = heapCost(run);
      rounds.push(cost);
      if (isClean(cost)) break;
    }
    const msPerFrame = (performance.now() - startedMs) / (rounds.length * FRAMES);
    console.log(
      `T-128d GardenAudioSystem.update, 79 plants: ${(msPerFrame * 1000).toFixed(2)} µs a frame, heap ` +
        `${JSON.stringify(rounds[rounds.length - 1])} per ${FRAMES} frames, after ${rounds.length} rounds (Node)`,
    );
    expect(isClean(rounds[rounds.length - 1]!), JSON.stringify(rounds)).toBe(true);
    expect(msPerFrame).toBeLessThan(0.1);
    system.destroy();
  }, 120_000);

  // P-016: the engine's steps with the garden opening and closing every two bars and a gazed plant among the 79:
  // setStillness (the send's glide, the gazed id) and the +2 dB on that plant's notes allocate nothing. The steps
  // are triggered as the scheduler triggers them (triggerStep); the pool takes each note and builds nothing, as
  // layers.heap.test.ts has it; the fake's parameter events are counted, not kept. The step times exist before the
  // loop, as numbers already on the heap, so the round's own cost is the probe's.
  it('setStillness with a gazed plant, notes triggered across 250 bars: nothing allocated', async () => {
    const engine = new Engine();
    const ctx = new FakeAudioContext();
    engine.setTempo(84);
    await engine.init(ctx.audio);
    engine.setSignature(WANDERER);
    const full = garden(fullBedExcept([12]));
    engine.syncPlants(full.plants, BED);
    const g = (engine as unknown as { g: { pool: { play(): boolean }; send: { gain: FakeParam } } }).g;
    const gazed = full.plants[0]!.id;
    let isOpen = false;
    let notes = 0;
    let gazedOpen = 0;
    let gazedClosed = 0;
    g.pool.play = (...args: unknown[]): boolean => {
      notes++;
      const record = args[6] as { plant: { id: string } } | null;
      if (record !== null && record.plant.id === gazed) {
        if (isOpen) gazedOpen++;
        else gazedClosed++;
      }
      return true;
    };
    for (const node of ctx.nodes) {
      for (const param of Object.values(node)) {
        if (param instanceof FakeParam) param.setTargetAtTime = (): FakeParam => param;
      }
    }
    const stepS = Scheduler.stepDurationFor(84);
    const TIMES: unknown[] = [null];
    for (let i = 1; i <= STEPS_RUN * (MOST_ROUNDS + 1); i++) TIMES.push(i * stepS);
    let k = 0;
    // setStillness is a change, not a step: once every two bars here (125 a round), and each costs the fraction
    // sendLevel() returns, boxed on its way back (measured 20 B a change, 6 632 B a round with the probe's 4 kB).
    const CHANGES = STEPS_RUN / STEPS / 2;
    const MOST_BYTES_A_CHANGE = 32;
    const isClean = (cost: { gcs: number; grewBytes: number }): boolean =>
      cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < PROBE_BYTES + MOST_BYTES_A_CHANGE * CHANGES;
    const run = (): void => {
      for (let i = 0; i < STEPS_RUN; i++) {
        const abs = ++k;
        const step = abs % STEPS;
        const bar = (abs / STEPS) | 0;
        if (step === 0 && bar % 2 === 0) {
          isOpen = (bar / 2) % 2 === 0;
          engine.setStillness(isOpen, isOpen ? gazed : '');
        }
        engine.triggerStep(step, TIMES[abs] as number, bar);
      }
    };
    run(); // warm up
    const rounds: { gcs: number; grewBytes: number }[] = [];
    for (let i = 0; i < MOST_ROUNDS; i++) {
      const cost = heapCost(run);
      rounds.push(cost);
      if (isClean(cost)) break;
    }
    console.log(
      `P-016 setStillness, 79 plants: heap ${JSON.stringify(rounds[rounds.length - 1])} per ${STEPS_RUN} steps, ` +
        `after ${rounds.length} rounds (Node)`,
    );
    expect(isClean(rounds[rounds.length - 1]!), JSON.stringify(rounds)).toBe(true);
    // It did the work: notes every step, the gazed plant's among them while open and while closed.
    expect(notes).toBeGreaterThan(STEPS_RUN);
    expect(gazedOpen).toBeGreaterThan(0);
    expect(gazedClosed).toBeGreaterThan(0);
    expect(engine.stats.triggers).toBeGreaterThan(STEPS_RUN);
  }, 120_000);
});
