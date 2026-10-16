// CODING_GUIDELINES §5 for the garden window's per-frame path (LLD §11): PointerSource.sample, with the real
// WindowStage's ray onto the bed plane, creates nothing per frame. The pointer's own events are fed in too,
// through the fake canvas's listeners (no EventTarget, whose dispatch creates objects), with events made once.
import { Group, Object3D, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';

import { bus } from '../../../src/core/index.js';
import { createHandFrame, HIT_RADIUS_M } from '../../../src/hands/index.js';
import { PointerSource, WindowStage } from '../../../src/window/index.js';
import { heapCost } from '../hands/heapCost.js';

import { at, fakeCanvas } from './fakeCanvas.js';

import type { PickCandidate } from '../../../src/hands/index.js';

const PERIOD = 40;
const FRAMES = 4000; // a short window, as in HandSampler.test.ts: no collection falls into it at the bound
const MOST_ROUNDS = 20;

describe('PointerSource: no object per frame', () => {
  it('sampling a pointer that moves, clicks, drags over a plant and rests creates nothing', () => {
    const player = new Group();
    const camera = new PerspectiveCamera(50, 16 / 9, 0.001, 200);
    player.add(camera);
    const bed = new Object3D();
    const stage = new WindowStage(camera, bed);
    bed.position.set(0.0013, 0.9512, -0.4487);
    bed.updateMatrixWorld();
    // A plant under the canvas's centre-right, so the palm steps aside for part of each period.
    const plant = { x: 0.1, y: 0.9512, z: -0.45 };
    stage.project(0.25, 0, plant);
    const targets: PickCandidate[] = [
      { target: { kind: 'seed', id: 's' }, radius: HIT_RADIUS_M, pos: { x: 0.31, y: 0.95, z: -0.42 } },
      { target: { kind: 'plant', id: 'p' }, radius: HIT_RADIUS_M, pos: plant },
    ];
    const canvas = fakeCanvas();
    const source = new PointerSource(canvas.element, stage, targets);
    const frame = createHandFrame(source.hands[0]!);
    bus.emit('xr:sessionStart', { visible: true });
    // Fractional pixels, as a browser gives them; every event exists before the loop. The main button is held
    // from the press at k = 4 to the release at k = 30, and the moves between say so.
    const path = Array.from({ length: PERIOD }, (_, k) =>
      at(400.5 + k * 3.25, 300.25 - k * 1.5, { buttons: k > 4 && k <= 30 ? 1 : 0 }),
    );
    let timeMs = 0;
    const run = (): void => {
      for (let i = 0; i < FRAMES; i++) {
        const k = i % PERIOD;
        const event = path[k]!;
        canvas.fire('pointermove', event);
        if (k === 4) canvas.fire('pointerdown', event);
        if (k === 30) canvas.fire('pointerup', event);
        timeMs += 14;
        source.sample(frame.hand, timeMs, frame);
      }
    };
    const kept = [frame.pinchPos, frame.palmPos, frame.palmNormal, frame.velocity];

    run(); // warm up: the JIT's own allocations happen here
    const costs: { gcs: number; grewBytes: number }[] = [];
    for (let i = 0; i < MOST_ROUNDS; i++) {
      const cost = heapCost(run);
      costs.push(cost);
      if (cost.gcs === 0 && cost.grewBytes < BYTES_PER_FRAME * FRAMES) break;
    }
    const last = costs[costs.length - 1]!;
    console.log(`T-114 PointerSource.sample: heap ${JSON.stringify(last)} per ${FRAMES} frames`);
    expect(last.gcs === 0 && last.grewBytes < BYTES_PER_FRAME * FRAMES, JSON.stringify(costs)).toBe(true);
    expect(frame.tracked).toBe(true);
    [frame.pinchPos, frame.palmPos, frame.palmNormal, frame.velocity].forEach((v, i) =>
      expect(v).toBe(kept[i]),
    );
    source.dispose();
    bus.emit('xr:sessionEnd', { visible: false });
  }, 30_000);
});

// Not zero: 228 bytes a frame (Node 24.14, three runs: 227.5 to 228.2), every run, and no collection. They are
// boxed numbers, not objects (API_SPEC v1.2.3: "creates no objects"), measured part by part on 2026-10-16: the
// ray alone, WindowStage.project with fractions, is 80 (three's own calls, 5 boxes); a sample of a pointer at
// rest is 144, the stores into the frame's plain vectors, as HandSampler.test.ts found for its 120. The events
// cost nothing. The bound sits 32 above, so one object of 32 bytes a frame (a closure, a small array) shows.
const BYTES_PER_FRAME = 260;
