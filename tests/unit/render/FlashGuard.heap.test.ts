// NFR-PERF-08 for the flash guard itself (FR-UI-11): FlashGuard.request, asked once a frame for 80 elements with
// mixed swings (slow drifts inside the band, steps that start swings, bursts the cap refuses), creates nothing. The
// 23 Oct soak named request the largest src/ owner (about 1.1 kB a frame): the fraction it returns is boxed wherever
// a caller's loop no longer inlines it. This probe is the inlined case, one caller, as the renderers' own heap tests
// have it; a boxed return here would be 1.28 MB a round. The targets exist before the loop, as numbers already on
// the heap (the array starts with a non-number, so it keeps them boxed); the times are whole milliseconds.
import { describe, expect, it } from 'vitest';

import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

const ELEMENTS = 80;
const FRAMES = 20_000;
const MOST_ROUNDS = 40;
/** The pattern each element walks, a frame a step, offset by its index: a drift, a step up, a hold, a burst of
 *  steps inside one second (the cap refuses the fourth), a step down, a drift back. */
const PATTERN = 1009; // prime: the 80 elements are never in step with each other

describe('FlashGuard.request per frame (NFR-PERF-08)', () => {
  it('80 elements, mixed swings, 20 000 frames: nothing allocated', { timeout: 60_000 }, () => {
    const guard = new FlashGuard();
    const first = guard.claim(ELEMENTS, 0.7);
    const TARGETS: unknown[] = [null];
    for (let k = 0; k < PATTERN; k++) {
      const phase = k / PATTERN;
      let target = 0.7 + 0.03 * Math.sin(phase * 20 * Math.PI); // a drift inside the band
      if (phase > 0.2 && phase < 0.45)
        target = 1; // a step up, held
      else if (phase >= 0.45 && phase < 0.55)
        target = Math.floor(phase * 200) % 2 === 0 ? 1 : 0.5; // a burst
      else if (phase >= 0.55 && phase < 0.8) target = 0.4; // a step down, held
      TARGETS.push(target);
    }
    let t = 1_000_000;
    const out = new Float64Array(1);
    const round = (): void => {
      for (let frame = 0; frame < FRAMES; frame++) {
        t += 14;
        for (let e = 0; e < ELEMENTS; e++) {
          out[0] = guard.request(first + e, TARGETS[1 + ((frame + e * 7) % PATTERN)] as number, t);
        }
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
    console.log(
      `FR-UI-11 FlashGuard.request, ${ELEMENTS} elements: heap ${JSON.stringify(costs[costs.length - 1])} per ` +
        `${FRAMES} frames (${ELEMENTS * FRAMES} calls), after ${costs.length} rounds (Node)`,
    );
    expect(isClean(costs[costs.length - 1]!), JSON.stringify(costs)).toBe(true);
    // It did the work: swings were started and the cap held some back.
    expect(guard.takePeak()).toBeGreaterThanOrEqual(3);
    expect(out[0]).toBeGreaterThanOrEqual(0);
  });
});
