// NFR-PERF-08 for Listen mode's light (T-148): HaloRenderer.update and OrbRenderer.update create nothing per
// frame, through the fade in, the breath on the beat and the drift, and the fade out. A file of its own, one loop
// per measurement, for the reasons PlantRenderer.heap.test.ts gives (the guard's request stays free only while
// V8 inlines it). The phases exist before the loop, as numbers already on the heap (the array starts with a
// non-number, so it keeps them boxed), which is how HaloSystem hands audio's barPhase in; the times are whole ms.
import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { HaloRenderer } from '../../../src/render/HaloRenderer.js';
import { OrbRenderer } from '../../../src/render/OrbRenderer.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

const MOST_ROUNDS = 40;
const FRAMES = 20_000; // 278 s at 72 Hz, a frame a ms below: what matters is the count
const BAR_FRAMES = 206; // 84 BPM at 72 Hz
const TOGGLE_FRAMES = 2000;

describe('Listen light per frame (NFR-PERF-08)', () => {
  it(
    'the halo, the dome and the orb allocate nothing, in Listen and through its fades',
    { timeout: 60_000 },
    () => {
      const guard = new FlashGuard();
      const parent = new Group();
      const halo = new HaloRenderer(parent, guard);
      const orb = new OrbRenderer(parent, guard);
      const PHASES: unknown[] = [null];
      for (let i = 0; i < FRAMES; i++) PHASES.push((i % BAR_FRAMES) / BAR_FRAMES + 0.0001);
      let t = 100_000;
      const round = (): void => {
        for (let i = 1; i <= FRAMES; i++) {
          // In and out five times a round, the orb lit with it: every branch of both updates runs, and the fades
          // are 715 frames of the round (one boxed number in each would be 11 kB, above the probe's slack).
          if (i % TOGGLE_FRAMES === 1) {
            const isListening = Math.floor(i / TOGGLE_FRAMES) % 2 === 0;
            halo.setListening(isListening);
            orb.setListening(isListening);
          }
          t += 14;
          halo.update(PHASES[i] as number, t);
          orb.update(t);
        }
      };
      const costs: { gcs: number; grewBytes: number }[] = [];
      const isClean = (cost: { gcs: number; grewBytes: number }): boolean =>
        cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < PROBE_BYTES;
      for (let i = 0; i < MOST_ROUNDS; i++) {
        if (i === 0) round(); // warm up: the JIT's own allocations happen here
        const cost = heapCost(round);
        costs.push(cost);
        if (isClean(cost)) break;
      }
      // One boxed number a frame would be 320 000 bytes a round.
      expect(isClean(costs[costs.length - 1]!), JSON.stringify(costs)).toBe(true);
      // It did the work: the round ended faded out, after a Listen with the halo lit.
      expect(halo.halo.visible).toBe(false);
      expect(guard.takePeak()).toBeGreaterThan(0);
    },
  );
});
