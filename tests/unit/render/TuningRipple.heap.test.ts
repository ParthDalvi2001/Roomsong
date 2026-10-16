// NFR-PERF-08 for the tuning ripple (T-142): TuningRipple.update creates nothing per frame, through a whole ripple
// on all three surfaces, with its sweeps, afterglows and the guard's in and out, and through the reduced-motion
// glow. A file of its own, as PetalRenderer.heap.test.ts: update's call to FlashGuard.request stays free only
// while V8 inlines it. The times are whole milliseconds: a fraction worked out in the loop would be boxed by the test.
import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import { RIPPLE_SWEEP_AT_MS, RIPPLE_TUNED_MS } from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { TuningRipple } from '../../../src/render/TuningRipple.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

const MOST_ROUNDS = 40;
const FRAMES = RIPPLE_TUNED_MS + 1000; // one frame per millisecond: past the ceiling's afterglow
const level = (y: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, y, -0.5, 1];
const SURFACES = {
  table: { id: 't', pose: level(0.74), extents: { x: 1.2, y: 0.8 } },
  nearestWall: {
    id: 'w',
    pose: [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1.25, -2.25, 1],
    extents: { x: 4, y: 2.5 },
  },
  ceiling: { id: 'c', pose: level(2.5), extents: { x: 4, y: 4.5 } },
};

describe('TuningRipple.update per frame (NFR-PERF-08)', () => {
  it.each([false, true])(
    'reduced motion %s: a whole ripple allocates nothing',
    { timeout: 30_000 },
    (isGlow) => {
      const parent = new Group();
      const guard = new FlashGuard();
      const ripple = new TuningRipple(parent, guard);
      let startMs = 0;
      const round = (): void => {
        for (let frame = 0; frame < FRAMES; frame++) ripple.update(startMs + frame);
      };
      const costs: { gcs: number; grewBytes: number }[] = [];
      const isClean = (cost: { gcs: number; grewBytes: number }): boolean =>
        cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < PROBE_BYTES;
      for (let i = 0; i < MOST_ROUNDS; i++) {
        startMs += 2 * FRAMES; // the guard's time never goes back; set-up stays outside the measurement
        const plan = {
          surfaces: SURFACES,
          bedPose: level(0.74),
          isWanderer: false,
          paletteSeed: 7,
          isReducedMotion: isGlow,
        };
        ripple.start(plan, startMs);
        if (i === 0) {
          round(); // warm up: the JIT's own allocations happen here
          continue;
        }
        const cost = heapCost(round);
        costs.push(cost);
        if (isClean(cost)) break;
      }
      const message = `heap cost of ${costs.length} rounds of ${FRAMES} frames: ${JSON.stringify(costs)}`;
      expect(isClean(costs[costs.length - 1]!), message).toBe(true);
      // And it did the work: the guard handed out each quad's in and out, and every quad is hidden again.
      expect(guard.takePeak()).toBe(isGlow ? 2 : 1);
      expect(parent.children.every((mesh) => !mesh.visible)).toBe(true);
      expect(RIPPLE_SWEEP_AT_MS).toHaveLength(parent.children.length);
    },
  );
});
