// NFR-PERF-08 for the bed (T-128d): BedRenderSystem.update, with the bed, plant, tide and petal renderers inside
// it, creates nothing per frame with a full bed of 80 plants, the tide sweeping on a moving phase, a hand
// hovering a plant, a lost hand's tint, and an undo petal with its target. The events that set each up are
// sent before the measurement. Fake entities (seedRig.ts), not the ECS.
import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import { bus, clock } from '../../../src/core/index.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { BedRenderSystem } from '../../../src/render/RenderSystems.js';
import { fullBedExcept, garden, plant } from '../garden/fixtures.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

import { FakeEntity, FakeQuery } from './seedRig.js';

const FRAMES = 2_000; // about 28 s at 72 Hz
const MOST_ROUNDS = 20;

describe('BedRenderSystem.update per frame (NFR-PERF-08)', () => {
  // Wanderer, and a measured room whose signature turns the palette (D-060: the plants, petals and ring lines).
  it.each([0, 0x0fe2778b])(
    '80 plants, the tide, a hover, a tint and a petal, paletteSeed %i: nothing allocated',
    (paletteSeed) => {
      const bed = new Group();
      bed.position.set(0, 0.74, -0.45);
      bed.updateMatrixWorld(true);
      // The audio clock as the engine gives it: a bar phase that moves every frame, a fraction each time.
      const audio = new Float64Array([0.5, 0]);
      const engine = { clock: { now: () => audio[0]!, barPhase: () => audio[1]! } };
      const system = new BedRenderSystem({ createEntity: () => new FakeEntity() } as never, {} as never, 50);
      const beds = new FakeQuery();
      system.queries = { beds } as never;
      system.config.guard.value = new FlashGuard();
      system.config.engine.value = engine;
      system.config.bed.value = bed;
      system.init();
      beds.add(new FakeEntity());
      const full = garden(fullBedExcept([33]));
      bus.emit('garden:changed', {
        state: full,
        diff: { added: full.plants.map((p) => p.id), removed: [], changed: [] },
      });
      bus.emit('room:signature', { signature: { paletteSeed } as never, starterSeeds: false });
      bus.emit('target:hover', { hand: 'right', target: { kind: 'plant', id: 'p10' }, cell: null });
      bus.emit('hands:lost', { hand: 'left', held: { kind: 'plant', id: 'p20' } });
      // A petal that outlives the run: the frame clock below covers about 2 minutes.
      const removed = plant('gone', 2, 1);
      bus.emit('garden:removed', {
        plantId: 'gone',
        undoToken: { plant: removed },
        expiresAt: clock.now() + 1e9,
      });

      // Frame times exist before the loop, as numbers on the heap, which is how IWSDK hands `time` in.
      const total = (MOST_ROUNDS + 1) * FRAMES + 1;
      const TIMES: unknown[] = [null];
      for (let i = 1; i <= total; i++) TIMES.push((12_345_678 + i * 13.889) / 1000);
      // The update is called as elics calls it: from one loop over every system of the world, each of another
      // class. That call is megamorphic, so V8 compiles `update` on its own. Called straight from this loop it is
      // inlined into the loop instead, whose inlining budget then runs out before the FlashGuard call inside the
      // tide, and a fraction is boxed there (16 bytes a frame, measured in Node 2026-10-15) that is this loop's.
      const others = [class A {}, class B {}, class C {}, class D {}, class E {}].map((Kind) =>
        Object.assign(new Kind(), { update: (): void => {} }),
      );
      const systems: { update(delta: number, time: number): void }[] = [...others, system];
      let frames = 0;
      const run = (): void => {
        for (let i = 0; i < FRAMES; i++) {
          const k = ++frames;
          audio[1] = (k * 0.00731) % 1;
          for (let s = 0; s < systems.length; s++) systems[s]!.update(0.0139, TIMES[k] as number);
        }
      };
      const isClean = (cost: { gcs: number; grewBytes: number }): boolean =>
        cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < PROBE_BYTES;

      run(); // warm up: the JIT's own allocations happen here
      const rounds: { gcs: number; grewBytes: number }[] = [];
      const startedMs = performance.now();
      // The optimising compiler may be late on a loaded machine: rounds go on until one is clean.
      for (let i = 0; i < MOST_ROUNDS; i++) {
        const cost = heapCost(run);
        rounds.push(cost);
        if (isClean(cost)) break;
      }
      const msPerFrame = (performance.now() - startedMs) / (rounds.length * FRAMES);
      console.log(
        `T-128d BedRenderSystem.update, 79 plants, paletteSeed ${paletteSeed}: ${(msPerFrame * 1000).toFixed(1)} µs a frame, heap ` +
          `${JSON.stringify(rounds[rounds.length - 1])} per ${FRAMES} frames, after ${rounds.length} rounds (Node)`,
      );
      expect(isClean(rounds[rounds.length - 1]!), JSON.stringify(rounds)).toBe(true);
      // NFR-PERF-05 gives a frame's JavaScript 6 ms; 1 ms leaves room for a loaded machine.
      expect(msPerFrame).toBeLessThan(1);
      system.destroy();
    },
    120_000,
  );
});
