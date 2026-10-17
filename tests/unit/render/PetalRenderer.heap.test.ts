// NFR-PERF-08 for the undo petal (T-146): PetalRenderer.update creates nothing per frame, with a petal over
// every one of the 80 cells, through the whole of a petal's life: the shrinking, and the fade through the guard.
// A file of its own, and one loop per measurement, for the reasons PlantRenderer.heap.test.ts gives: update's
// call to FlashGuard.request stays free only while V8 inlines it, and it does when update is optimised by
// itself. The times are whole milliseconds: a fraction worked out in the loop would be boxed here, by the test.
import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import { settings } from '../../../src/core/index.js';
import { RINGS, STEPS, UNDO_LIFE_MS } from '../../../src/garden/index.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { PetalRenderer } from '../../../src/render/PetalRenderer.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

const MOST_ROUNDS = 40;
const FRAMES = UNDO_LIFE_MS - 1; // one frame per millisecond of a life, and none on its last: no petal runs out
// Once in a petal's life, when the guard starts the swing that is its fade, about 40 bytes were measured (3 960
// a round for the 80, the probe's own 700 included). That is per petal, not per frame: 64 leaves room.
const ONCE_PER_PETAL_BYTES = 64;
const CLEAN_BYTES = PROBE_BYTES + RINGS * STEPS * ONCE_PER_PETAL_BYTES;

describe('PetalRenderer.update per frame (NFR-PERF-08)', () => {
  it('80 petals shrinking and fading through their whole life allocate nothing', { timeout: 30_000 }, () => {
    const petals = new PetalRenderer(new Group(), new FlashGuard());
    let startMs = 0;
    /** Set-up, outside the measurement: a new petal over every cell, good for one life from `startMs`. */
    const showAll = (): void => {
      startMs += 2 * UNDO_LIFE_MS; // the guard's time never goes back
      for (let ring = 0; ring < RINGS; ring++) {
        for (let step = 0; step < STEPS; step++) {
          const id = `p${ring * STEPS + step}`;
          petals.show(id, { cell: { ring, step }, hue: step / STEPS }, startMs + UNDO_LIFE_MS);
        }
      }
    };
    const round = (): void => {
      for (let frame = 0; frame < FRAMES; frame++) petals.update(startMs + frame);
    };
    const costs: { gcs: number; grewBytes: number }[] = [];
    // A heap that shrank is no proof either: V8 frees some things with no collection the profiler counts.
    const isClean = (cost: { gcs: number; grewBytes: number }): boolean =>
      cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < CLEAN_BYTES;
    // The optimising compiler works on another thread and may be late on a loaded machine: the rounds go on
    // until one is clean, up to a limit. A real allocation in update never gives a clean round: one boxed
    // number per frame is 80 000 bytes a round, and one per petal in the first 21 ms of its fade, which the
    // guard cost before update stopped asking it then, was 28 000.
    for (let i = 0; i < MOST_ROUNDS; i++) {
      showAll();
      if (i === 0) round(); // warm up: the JIT's own allocations happen here
      const cost = heapCost(round);
      costs.push(cost);
      if (isClean(cost)) break;
    }
    const message = `heap cost of ${costs.length} rounds of ${FRAMES} frames: ${JSON.stringify(costs)}`;
    expect(isClean(costs[costs.length - 1]!), message).toBe(true);
    // And it did the work: every petal is still up, at the end of its fade.
    expect(petals.has('p0') && petals.has('p79')).toBe(true);
    const opacity = petals.mesh.geometry.getAttribute('aColour').getW(79);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(0.01);
  });

  // T-147: the same lives, each petal arriving. With a release point all 80 drift in from it and the pool's
  // petals fly and shrink (the last three bursts are in the air); under reduced motion all 80 fade in. Both in
  // high contrast, the outline shell switched on every frame (BUG-008).
  for (const arrival of ['burst', 'fade-in'] as const) {
    it(
      `80 petals arriving by ${arrival} through their whole life allocate nothing`,
      { timeout: 30_000 },
      () => {
        settings.set({ reducedMotion: arrival === 'fade-in', highContrast: true });
        const petals = new PetalRenderer(new Group(), new FlashGuard());
        const from = { x: 0.36, y: 0.08, z: 0.12 };
        let startMs = 0;
        const showAll = (): void => {
          startMs += 2 * UNDO_LIFE_MS;
          for (let i = 0; i < RINGS * STEPS; i++) {
            const plant = {
              cell: { ring: Math.floor(i / STEPS), step: i % STEPS },
              hue: (i % STEPS) / STEPS,
            };
            petals.show(`p${i}`, plant, startMs + UNDO_LIFE_MS, from);
          }
        };
        const round = (): void => {
          for (let frame = 0; frame < FRAMES; frame++) petals.update(startMs + frame);
        };
        const costs: { gcs: number; grewBytes: number }[] = [];
        const isClean = (cost: { gcs: number; grewBytes: number }): boolean =>
          cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < CLEAN_BYTES;
        let versions = 0;
        for (let i = 0; i < MOST_ROUNDS; i++) {
          showAll();
          if (i === 0) round(); // warm up
          const before = petals.mesh.instanceMatrix.version;
          const cost = heapCost(round);
          versions = petals.mesh.instanceMatrix.version - before;
          costs.push(cost);
          if (isClean(cost)) break;
        }
        settings.set({ reducedMotion: false, highContrast: false });
        const message = `heap cost of ${costs.length} rounds of ${FRAMES} frames: ${JSON.stringify(costs)}`;
        expect(isClean(costs[costs.length - 1]!), message).toBe(true);
        expect(versions).toBeGreaterThan(FRAMES / 2); // and it did move them, frame by frame
        expect(petals.outline.count).toBe(RINGS * STEPS); // and outlined them, not the burst
      },
    );
  }
});
