// NFR-PERF-08 for the audio wiring (T-128d): GardenAudioSystem.update, with the real engine's setListenerPose
// inside it, creates nothing per frame with a full bed of 80 plants synced, the session tuned, the head moving
// every frame and the bed still (so no sync is due). The engine runs on the fake AudioContext of the audio tests;
// its tick is not run here (it is the engine's own timer, not the frame's).
import { Matrix4, Object3D } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { Engine } from '../../../src/audio/AudioEngine.js';
import { GardenAudioSystem } from '../../../src/audio/AudioSystem.js';
import { bus } from '../../../src/core/index.js';
import { WANDERER } from '../../../src/garden/index.js';
import { fullBedExcept, garden } from '../garden/fixtures.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';
import { FakeEntity, FakeQuery } from '../render/seedRig.js';

import { FakeAudioContext, type FakeParam } from './fakeAudio.js';

const FRAMES = 2_000;
const MOST_ROUNDS = 20;

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
});
