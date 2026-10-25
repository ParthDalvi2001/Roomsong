/// <reference types="webxr" />
// NFR-PERF-08 for the capture rig's hand cue (T-175): HandCue.update creates nothing per frame, both hands moving,
// one dropping out and coming back. A file of its own, one loop per measurement, as the other heap tests.
import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import { DEFAULT_FLAGS } from '../../../src/core/flags.js';
import { createHandCue } from '../../../src/render/HandCue.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

import { fakeFrame, fakeHand } from './fakeHands.js';

const MOST_ROUNDS = 40;
const FRAMES = 20_000;
const DROP_FRAMES = 1500; // the left hand leaves and comes back out of step with the round

describe('the hand cue per frame (NFR-PERF-08)', () => {
  it('allocates nothing while it follows two hands', { timeout: 60_000 }, () => {
    const cue = createHandCue(new Group(), { ...DEFAULT_FLAGS, dev: true, handCue: true })!;
    const shift = { dx: 0 };
    const frame = fakeFrame(shift);
    const space = {} as XRReferenceSpace;
    const both = [fakeHand('right').source, fakeHand('left', 0.5).source];
    const one = [both[0]!];
    const round = (): void => {
      for (let i = 1; i <= FRAMES; i++) {
        shift.dx = (i % 97) / 1000; // the hands move every frame
        cue.update(frame, space, Math.floor(i / DROP_FRAMES) % 2 === 0 ? both : one);
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
    expect(costs.some(isClean), JSON.stringify(costs)).toBe(true);
  });
});
