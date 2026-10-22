// NFR-PERF-08 for the vine (T-149): VineRenderer.update creates nothing per frame, through a whole growth and
// a whole shrink with the guard's in and out. A file of its own, as the other renderers' heap tests.
import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import { PLANT_CAPACITY, VINE_GROW_MS, VINE_SEGMENTS } from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { VineRenderer } from '../../../src/render/VineRenderer.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

import type { Plant } from '../../../src/garden/index.js';

const MOST_ROUNDS = 40;
const FRAME_MS = 10;
const FRAMES = (VINE_GROW_MS + 1000) / FRAME_MS;
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
const WALL = { id: 'w', pose: [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1.25, -1, 1], extents: { x: 4, y: 2.5 } };
const PLANTS: Plant[] = Array.from({ length: PLANT_CAPACITY }, (_, i) => ({
  id: `p${i}`,
  voice: 'bell',
  cell: { ring: i % 5, step: i % 16 },
  height: 0.5,
  hue: i / PLANT_CAPACITY,
  plantedAt: 0,
}));

describe('VineRenderer.update per frame (NFR-PERF-08)', () => {
  it('a whole growth and a whole shrink allocate nothing', { timeout: 30_000 }, () => {
    const parent = new Group();
    const guard = new FlashGuard();
    const vine = new VineRenderer(parent, guard);
    vine.setWall(WALL, BED);
    let startMs = 0;
    const round = (): void => {
      for (let frame = 0; frame < FRAMES; frame++) vine.update(startMs + frame * FRAME_MS);
    };
    const costs: { gcs: number; grewBytes: number }[] = [];
    const isClean = (cost: { gcs: number; grewBytes: number }): boolean =>
      cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < PROBE_BYTES;
    for (let i = 0; i < MOST_ROUNDS; i++) {
      startMs += 2 * FRAMES * FRAME_MS; // the guard's time never goes back; set-up stays outside the measurement
      vine.setPlants(i % 2 === 0 ? PLANTS : []);
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
    // And it did the work: the vine grew and went through the guard, round by round.
    expect(guard.takePeak()).toBe(1);
    expect([0, VINE_SEGMENTS]).toContain(vine.mesh.count);
  });
});
