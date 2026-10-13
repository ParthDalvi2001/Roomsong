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
// - A round only proves the paths it takes (T-119). The first test here has a tide, no hands and a young bed,
//   and two leaks stood beside it unseen: one number per frame for a plant under a tint, and one per plant per
//   frame for as long as it had never flashed (no tide yet). Both were a number picked by a condition from two
//   constants (`x ? 0.5 : 1`), which V8 boxes. So: a round with a blooming bed, a glow and a tint, and one with
//   no tide. What a round needs set up is set up before it, not in its loop.
import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import { MS_PER_DAY } from '../../../src/core/index.js';
import { BedRenderer } from '../../../src/render/BedRenderer.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { PlantRenderer } from '../../../src/render/PlantRenderer.js';
import { TideRenderer } from '../../../src/render/TideRenderer.js';
import { fullBedExcept } from '../garden/fixtures.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

import type { BufferAttribute } from 'three';

const ROUNDS = 20_000;
const MOST_ROUNDS = 40;
const BAR_FRAMES = 206; // 84 BPM at 72 fps
// The phases exist before the loops, as numbers V8 has already put on the heap (an array that starts with a
// non-number keeps them that way). A fraction computed in a loop would be boxed there, in the test, when it is
// handed to update: 16 bytes a frame that are not update's. The times are whole milliseconds.
const PHASES: unknown[] = [null];
for (let i = 0; i < BAR_FRAMES; i++) PHASES.push(i / BAR_FRAMES);
const phaseAt = (frame: number): number => PHASES[1 + (frame % BAR_FRAMES)] as number;

/**
 * Runs `round` until one costs the heap nothing, at most MOST_ROUNDS times; returns every cost it saw.
 * `prepare` runs before each round and is not measured.
 */
function costsUntilClean(round: () => void, prepare?: () => void): { gcs: number; grewBytes: number }[] {
  const costs: { gcs: number; grewBytes: number }[] = [];
  for (let i = 0; i < MOST_ROUNDS; i++) {
    prepare?.();
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
    plants.setState({ plants: fullBedExcept(), lastVisitAt: 0 });
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

  it(
    'PlantRenderer.update allocates nothing while a full bed blooms, one plant glows and one is dimmed',
    { timeout: 30_000 },
    () => {
      // The same renderer every round, and nothing but update in the measured loop (see the top of the file).
      // Before each round, not measured: every plant is put back to three and a half days old and then to a
      // week and a half, so all 80 wait, unfurl on their first note and take a blossom's colours inside the
      // round; one plant glows under a hover all through it; another is dimmed by a tint that ends half way.
      const bed = fullBedExcept().map((plant) => ({ ...plant, plantedAt: 0 }));
      const plants = new PlantRenderer(new Group(), new FlashGuard());
      plants.setHover('left', 'p3');
      let frame = 0;
      const prepare = (): void => {
        plants.setState({ plants: bed, lastVisitAt: 3.5 * MS_PER_DAY });
        plants.setState({ plants: bed, lastVisitAt: 7.5 * MS_PER_DAY });
        plants.setTint('right', 'p41', (frame + ROUNDS / 2) * 14);
      };
      const round = (): void => {
        for (let i = 0; i < ROUNDS; i++) {
          frame++;
          plants.update(phaseAt(frame), frame * 14);
        }
      };
      prepare();
      round(); // warm up: the JIT's own allocations happen here
      const unfurled = plants.whorls.instanceMatrix.version;
      expectClean(costsUntilClean(round, prepare));
      expect(plants.whorls.count).toBe(160);
      expect(plants.whorls.instanceMatrix.version - unfurled).toBeGreaterThan(80 * 30); // it unfurled, frame by frame
      expect(plants.whorls.instanceColor!.version).toBeGreaterThan(ROUNDS); // and whorls were painted with plants
    },
  );

  it('PlantRenderer.update allocates nothing when no tide runs', { timeout: 30_000 }, () => {
    const plants = new PlantRenderer(new Group(), new FlashGuard());
    plants.setState({ plants: fullBedExcept(), lastVisitAt: 0 });
    let frame = 0;
    const round = (): void => {
      for (let i = 0; i < ROUNDS; i++) {
        frame++;
        plants.update(Number.NaN, frame * 14);
      }
    };
    round();
    expectClean(costsUntilClean(round));
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
    expect(tide.mesh.material.uniforms.uShown!.value).toBe(1);
  });

  it('BedRenderer.update allocates nothing while hover cues fade in and out', { timeout: 30_000 }, () => {
    const bed = new BedRenderer(new Group(), new FlashGuard());
    const cells = [
      { ring: 0, step: 3 },
      { ring: 4, step: 12 },
    ];
    let frame = 0;
    const round = (): void => {
      for (let i = 0; i < ROUNDS; i++) {
        frame++;
        // Each hand moves on or lets go every 40 frames, so markers are fading on most frames.
        if (frame % 40 === 0) bed.setHover('left', frame % 80 ? cells[0]! : null);
        if (frame % 40 === 20) bed.setHover('right', frame % 160 < 80 ? cells[1]! : cells[0]!);
        bed.update(frame * 14);
      }
    };
    round();
    expectClean(costsUntilClean(round));
    const strength = bed.markers.geometry.getAttribute('aStrength') as BufferAttribute;
    expect(strength.version).toBeGreaterThan(ROUNDS / 10); // and it did fade
  });
});
