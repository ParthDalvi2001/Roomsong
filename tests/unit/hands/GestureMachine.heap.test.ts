// CODING_GUIDELINES §5 for the shaping gestures (T-146): the dead zone, a pull, a drag and their previews create
// nothing per frame, although `gesture:pull` and `gesture:drag` go out on every tracked sample.
// Why this is a file of its own (as tests/unit/render/PlantRenderer.heap.test.ts is): V8 keeps one hidden class
// for every object with the same keys in the same order, whoever made it. A test that writes the expected
// preview as `{ type, hand, target, dy: expect.closeTo(...) }` puts a matcher, an object, where the machine's
// payload has a number, and from then on V8 holds `dy` as a tagged value in every object of that shape: each
// fraction the machine writes there is boxed, 16 bytes a frame (measured: 4 016 bytes per period of this test,
// one box for each of its 251 shaping frames, in GestureMachine.test.ts after its preview test had run; nothing
// when this test ran alone). Nothing in src/ makes an object of a preview's shape but the machine, so the app's
// payloads keep their number fields. Keep matchers and other non-numbers out of this file's payload shapes.
import { Vector3 } from '@iwsdk/core';
import { describe, expect, it } from 'vitest';

import { bus } from '../../../src/core/index.js';
import { GestureMachine } from '../../../src/hands/GestureMachine.js';
import { createHandFrame } from '../../../src/hands/InputSource.js';

import { heapCost, PROBE_BYTES } from './heapCost.js';

import type { Vec3 } from '../../../src/core/index.js';
import type { GestureContext } from '../../../src/hands/GestureMachine.js';

const ROUNDS = 100_000;
const PERIOD = 400;
const PERIODS_PER_ROUND = ROUNDS / PERIOD;
// A pull's release carries the fractional travel of its last preview in `gesture:release.dy`, a field that holds a
// number or null, so V8 boxes it: 16 bytes per release (measured: 4 000 bytes a round, 250 releases), not per frame.
// 32 per release leaves room; the smallest leak per frame, 16 bytes on the pull's frames alone, is 460 000 a round.
const RELEASE_BYTES = 32;
const CLEAN_BYTES = PROBE_BYTES + PERIODS_PER_ROUND * RELEASE_BYTES;
const BORDER_RAD = Math.PI / 16; // between steps 0 and 1
const RING_2_M = 0.21;

describe('GestureMachine: no allocation per frame while a plant is shaped (T-146)', () => {
  it('the dead zone, a pull and a drag, each with a preview on every frame, create nothing', () => {
    // The bed centre is at (0, 1, -1) and the plant stands 0.21 m to its right, on ring 2. Every point of the
    // hand is at fractions and exists before the loop: a fraction written into the frame inside the loop would
    // be boxed there, by the test.
    const context: GestureContext = {
      candidates: [{ target: { kind: 'plant', id: 'p' }, radius: 0.04, pos: { x: 0.21, y: 1.0004, z: -1 } }],
      bedPose: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, -1, 1],
      oneHand: false,
      nearestFreeCell: (cell) => cell,
    };
    const machine = new GestureMachine('right');
    const frame = createHandFrame('right');
    // Vector3s, as every HandFrame's are (createHandFrame): the machine copies them into its payloads.
    const onPlant: Vec3 = new Vector3(0.2101, 1.0003, -1.0002);
    const inDeadZone: Vec3 = new Vector3(0.2151, 1.0103, -1.0002); // 1.1 cm from where the pinch begins
    const pulled: Vec3[] = [1.0533, 1.0791].map((y) => new Vector3(0.2113, y, -1.0007));
    // Along ring 2, 1 mm either side of the border of two cells (inside the dead band), 4 cm from the plant.
    const dragged: Vec3[] = [-0.001, 0.001].map((offM) => {
      const rad = BORDER_RAD + offM / RING_2_M;
      return new Vector3(RING_2_M * Math.cos(rad), 1.0007, -1 + RING_2_M * Math.sin(rad));
    });
    let timeMs = 0;
    // One period of 400 frames, 10 ms each. The plant is pinched, held in the dead zone, pulled (the hand lost
    // for 150 ms on the way) and released. It is pinched again, held, dragged along the ring, and the hand is
    // lost for 500 ms: the grace runs out.
    const updateAll = (): void => {
      for (let i = 0; i < ROUNDS; i++) {
        const k = i % PERIOD;
        timeMs += 10;
        frame.tracked = !((k >= 100 && k < 115) || (k >= 320 && k < 370));
        frame.pinch = (k >= 1 && k < 150) || (k >= 201 && k < 372);
        if (k < 2 || (k >= 150 && k < 202) || k >= 372) frame.pinchPos = onPlant;
        else if (k < 20 || (k >= 202 && k < 220)) frame.pinchPos = inDeadZone;
        else frame.pinchPos = k < 150 ? pulled[k % 2]! : dragged[k % 2]!;
        machine.update(frame, timeMs, context);
      }
    };
    const count = { pulls: 0, drags: 0, cells: 0, pulled: 0, reverted: 0 };
    const off = [
      bus.on('gesture:pull', (event) => {
        if (event.dy > 0.05) count.pulls++;
      }),
      bus.on('gesture:drag', (event) => {
        if (event.zone === 'bed' && event.pos.y > 1) count.drags++;
      }),
      bus.on('target:hover', (event) => {
        if (event.cell !== null) count.cells++;
      }),
      bus.on('gesture:release', (event) => {
        // The travel of the last preview, a fraction (7.9 cm): the release sample itself is not measured.
        if (event.gesture === 'pull' && event.dy !== null && event.dy > 0.05) count.pulled++;
      }),
      bus.on('gesture:trackingLost', () => {
        count.reverted++;
      }),
    ];
    const keeper: { kept: unknown } = { kept: null };
    // The control: the smallest leak there is, one small object per frame.
    const allocateAll = (): void => {
      for (let i = 0; i < ROUNDS; i++) keeper.kept = { i };
    };
    updateAll(); // warm up: the JIT's own allocations happen here
    updateAll();
    allocateAll();

    const control = heapCost(allocateAll);
    expect(control.gcs > 0 || control.grewBytes > ROUNDS * 8).toBe(true); // the probe sees that leak
    // The best of five rounds: the JIT may still finish a compile during one of them. A heap that shrank is no
    // proof: V8 frees some things with no collection the profiler counts.
    const costs = Array.from({ length: 5 }, () => heapCost(updateAll));
    off.forEach((stop) => stop());
    const clean = costs.filter(
      (cost) => cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < CLEAN_BYTES,
    );
    // Measured 2026-10-13: 4 600 bytes a round of 100 000 frames: the probe's own 600, and 16 per pull release.
    expect(clean.length, JSON.stringify(costs)).toBeGreaterThan(0);
    const periods = 7 * PERIODS_PER_ROUND;
    expect(count).toEqual({
      pulls: 115 * periods, // frames 20 to 149 but the 15 the hand was away: one preview each
      drags: 100 * periods, // frames 220 to 319
      cells: periods, // one cell per drag: the jitter over the border never moved the cue
      pulled: periods, // the pull's release, with its travel
      reverted: periods, // the drag: no release
    });
    expect(keeper.kept).not.toBeNull();
  }, 30_000);
});
