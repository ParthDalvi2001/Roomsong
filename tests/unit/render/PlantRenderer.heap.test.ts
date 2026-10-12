// NFR-PERF-08: the per-frame paths of render/ create nothing, once V8 has optimised them.
// What this measures, and why it is built this way (T-125 review, finding 7):
// - V8 keeps a fraction unboxed inside one optimised function, and boxes it (16 bytes) when it crosses a call
//   that was not inlined. FlashGuard.request takes and returns one, so "nothing per frame" holds while V8
//   inlines request into the renderer's update. It does when update is optimised by itself, as in the app, where
//   each update is called once per frame.
// - So each renderer has its own loop here. One loop over both made V8 inline everything into the test's own
//   function, run out of its inlining budget, and leave request as a call: 32 bytes per plant per frame.
// - The file is separate for the same reason: a spy or a second kind of guard at update's call site, in any
//   other test of the same file, also ends the inlining.
// - The optimising compiler works on another thread. On a loaded machine it is late, so the rounds go on
//   until one is clean, up to a limit. A real allocation in update never gives a clean round.
import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { PlantRenderer } from '../../../src/render/PlantRenderer.js';
import { TideRenderer } from '../../../src/render/TideRenderer.js';
import { fullBedExcept } from '../garden/fixtures.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

const ROUNDS = 20_000;
const MOST_ROUNDS = 40;
const BAR_FRAMES = 206; // 84 BPM at 72 fps
// The phases exist before the loops, as numbers V8 has already put on the heap (an array that starts with a
// non-number keeps them that way). A fraction computed in a loop would be boxed there, in the test, when it is
// handed to update: 16 bytes a frame that are not update's. The times are whole milliseconds.
const PHASES: unknown[] = [null];
for (let i = 0; i < BAR_FRAMES; i++) PHASES.push(i / BAR_FRAMES);
const phaseAt = (frame: number): number => PHASES[1 + (frame % BAR_FRAMES)] as number;

/** Runs `round` until one costs the heap nothing, at most MOST_ROUNDS times; returns every cost it saw. */
function costsUntilClean(round: () => void): { gcs: number; grewBytes: number }[] {
  const costs: { gcs: number; grewBytes: number }[] = [];
  for (let i = 0; i < MOST_ROUNDS; i++) {
    const cost = heapCost(round);
    costs.push(cost);
    if (cost.gcs === 0 && cost.grewBytes < PROBE_BYTES) break;
  }
  return costs;
}

/** The message of a red run is every cost, so it says whether the heap or the clock was the trouble. */
function expectClean(costs: { gcs: number; grewBytes: number }[]): void {
  const last = costs[costs.length - 1]!;
  const message = `heap cost of ${costs.length} rounds of ${ROUNDS} frames: ${JSON.stringify(costs)}`;
  expect(last.gcs === 0 && last.grewBytes < PROBE_BYTES, message).toBe(true);
}

// 30 s each: on a loaded machine (several agents on one Mac) 100,000 frames took 8 s instead of 1.
describe('render/ per frame (NFR-PERF-08)', () => {
  it('the probe sees the smallest leak there is: one small object per frame', () => {
    const keeper: { kept: unknown } = { kept: null };
    const leak = (): void => {
      for (let i = 0; i < ROUNDS; i++) keeper.kept = { i };
    };
    leak();
    const cost = heapCost(leak);
    expect(cost.gcs > 0 || cost.grewBytes > ROUNDS * 8).toBe(true);
    expect(keeper.kept).not.toBeNull();
  });

  it('PlantRenderer.update with a full bed allocates nothing', { timeout: 30_000 }, () => {
    const plants = new PlantRenderer(new Group(), new FlashGuard());
    plants.setState({ plants: fullBedExcept() });
    let frame = 0;
    const round = (): void => {
      for (let i = 0; i < ROUNDS; i++) {
        frame++;
        plants.update(phaseAt(frame), frame * 14);
      }
    };
    round(); // warm up: the JIT's own allocations happen here
    expectClean(costsUntilClean(round));
    expect(plants.meshes[0]!.instanceColor!.version).toBeGreaterThan(ROUNDS); // and it did paint, every frame
  });

  it('TideRenderer.update allocates nothing while the tide runs', { timeout: 30_000 }, () => {
    const tide = new TideRenderer(new Group(), new FlashGuard());
    let frame = 0;
    const round = (): void => {
      for (let i = 0; i < ROUNDS; i++) {
        frame++;
        tide.update(phaseAt(frame), frame * 14);
      }
    };
    round();
    expectClean(costsUntilClean(round));
    expect(tide.mesh.visible).toBe(true);
    expect(tide.mesh.material.opacity).toBe(1);
  });
});
