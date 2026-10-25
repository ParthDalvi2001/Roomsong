// NFR-PERF-08 for the seeds (T-127): SeedSystem.update, with SeedRenderer.update inside it, creates nothing per
// frame, through every way a seed moves: the glide from the orb to a moving palm and the ride on it, the hop to a
// moving pinch point and the ride on that, the glide home with its hop up, each with its brightness ramp through
// the guard, and four seeds resting in the orb all along. The events that start each part are set-up (they attach
// and remove a target) and are sent between the measurements. Fake entities (seedRig.ts), not the ECS. BUG-007 and
// BUG-008: in high contrast, with a hand's hover on the seed coming and going every HOVER_FRAMES all along.
// Hovering a seed that is carried or home is not what the hands send; here it runs the glow on every path.
import { Color } from 'three';
import { describe, expect, it } from 'vitest';

import { bus, settings } from '../../../src/core/index.js';
import { HandState } from '../../../src/hands/HandState.js';
import { PLANT_LIGHTNESS, SEED_OUT_BRIGHTNESS } from '../../../src/render/config.js';
import { newPalette, plantColour } from '../../../src/render/palette.js';
import { garden, seed } from '../garden/fixtures.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

import { rig } from './seedRig.js';

import type { EventMap } from '../../../src/core/index.js';

const SEGMENT = 2_000; // frames per measured part: about 28 s at 72 Hz
const PARTS = 3;
const MOST_ROUNDS = 20;
const FRAME_START_MS = 12_345_678;
const HOVER_FRAMES = 20; // 0.28 s: the guard holds some of them, so the glow is asked for on most frames

describe('SeedSystem.update per frame (NFR-PERF-08)', () => {
  it('a seed out on a moving palm, carried by a moving pinch, sent home with a hop: nothing allocated', () => {
    const r = rig();
    const supply = garden(
      [],
      ['s1', 's2', 's3', 's4', 's5'].map((id) => seed(id)),
    );
    bus.emit('garden:changed', { state: supply, diff: { added: [], removed: [], changed: [] } });
    const out: EventMap['garden:seedOut'] = { seed: supply.seeds[0]!, hand: 'left' };
    const pinched: EventMap['gesture:pinchStart'] = {
      type: 'gesture:pinchStart',
      hand: 'right',
      target: { kind: 'seed', id: 's1' },
      pos: { x: 0, y: 0, z: 0 },
    };
    const sentBack: EventMap['garden:seedBack'] = { seedId: 's1', reason: 'offBed' };
    const onSeed: EventMap['target:hover'] = { hand: 'left', target: { kind: 'seed', id: 's1' }, cell: null };
    const offSeed: EventMap['target:hover'] = { hand: 'left', target: null, cell: null };
    settings.set({ highContrast: true });

    // The frame times exist before the loops, as numbers already on the heap (an array that starts with a
    // non-number keeps them boxed), which is how IWSDK hands `time` in: real size, 13.889 ms apart, so no frame
    // falls on a whole millisecond. The hands wander on fractions, written into their HandState views.
    const total = (MOST_ROUNDS + 1) * PARTS * SEGMENT + 1;
    const TIMES: unknown[] = [null];
    for (let i = 1; i <= total; i++) TIMES.push((FRAME_START_MS + i * 13.889) / 1000);
    const WOBBLE = new Float64Array(97).map((_, i) => 0.0137 * Math.sin(i * 0.37));
    const palm = r.handOf.left.getVectorView(HandState, 'palmPos');
    const pinch = r.handOf.right.getVectorView(HandState, 'pinchPos');
    // Per part of a round, the brightest the seed out (slot 0) was drawn, read from its green (its hue's top
    // channel) in the measured frames: a typed array, so the probe itself creates nothing.
    const colours = r.mesh.instanceColor!.array;
    const peak = new Float64Array(PARTS);
    let part = 0;
    let frames = 0;
    const run = (): void => {
      for (let i = 0; i < SEGMENT; i++) {
        const k = ++frames;
        const wobble = WOBBLE[k % WOBBLE.length]!;
        palm[0] = -0.22 + wobble;
        palm[1] = 0.95 + wobble;
        pinch[0] = 0.15 - wobble;
        pinch[2] = -0.32 + wobble;
        if (k % HOVER_FRAMES === 0) bus.emit('target:hover', k % (2 * HOVER_FRAMES) === 0 ? onSeed : offSeed);
        r.system.update(0.014, TIMES[k] as number);
        if (colours[1]! > peak[part]!) peak[part] = colours[1]!;
      }
    };
    const round = (): { gcs: number; grewBytes: number }[] => {
      peak.fill(0);
      part = 0;
      bus.emit('garden:seedOut', out);
      const toPalm = heapCost(run);
      part = 1;
      bus.emit('gesture:pinchStart', pinched);
      const carried = heapCost(run);
      part = 2;
      bus.emit('garden:seedBack', sentBack);
      const home = heapCost(run);
      return [toPalm, carried, home];
    };
    const isClean = (cost: { gcs: number; grewBytes: number }): boolean =>
      cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < PROBE_BYTES;

    round(); // warm up: the JIT's own allocations happen here
    const rounds: { gcs: number; grewBytes: number }[][] = [];
    const startedMs = performance.now();
    // The optimising compiler works on another thread and may be late on a loaded machine: rounds go on until
    // one is clean in all three parts. A real allocation never gives a clean part: 16 bytes a frame is 32 000.
    for (let i = 0; i < MOST_ROUNDS; i++) {
      const costs = round();
      rounds.push(costs);
      if (costs.every(isClean)) break;
    }
    const msPerFrame = (performance.now() - startedMs) / (rounds.length * PARTS * SEGMENT);
    const last = rounds[rounds.length - 1]!;
    console.log(
      `T-127 SeedSystem.update: ${(msPerFrame * 1000).toFixed(2)} µs a frame, heap ${JSON.stringify(last)} ` +
        `per ${SEGMENT} frames, after ${rounds.length} rounds (Node, stand-in entities)`,
    );
    expect(last.every(isClean), JSON.stringify(rounds)).toBe(true);
    // NFR-PERF-05 gives a frame's JavaScript 6 ms; this is a few microseconds. 0.1 ms leaves room for a loaded
    // machine and still catches a cost gone wrong.
    expect(msPerFrame).toBeLessThan(0.1);
    // And it did the work: the seed is home in the orb with the four others, and has no target.
    expect(r.drawn()).toBe(5);
    expect(r.targetAt()).toBeNull();
    expect((r.mesh.children[0] as typeof r.mesh).count).toBe(5); // outlined all along
    // And the hover's glow ran in the measured frames: out on the palm and carried, the seed was drawn above
    // SEED_OUT_BRIGHTNESS, which only the glow reaches (at home its glow starts below where it was).
    const full = plantColour(new Color(), 0.4, PLANT_LIGHTNESS, newPalette()).g; // the fixtures' hue
    expect(peak[0]! / full).toBeGreaterThan(SEED_OUT_BRIGHTNESS + 0.1);
    expect(peak[1]! / full).toBeGreaterThan(SEED_OUT_BRIGHTNESS + 0.1);
    settings.set({ highContrast: false });
    r.system.destroy();
  }, 60_000);
});
