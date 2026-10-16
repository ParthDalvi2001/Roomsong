// T-127, from the T-128b review: a palm that stays up gets the next seed. Two gesture machines and the real
// GardenSystem on the bus, synthetic frames and a counted clock. The two cases the garden used to forget: the palm
// raised while the bed is still being placed (no visit yet), and a seed planted by the other hand while the palm
// stays up (a seed was out). Without the re-arm of PalmUpHold neither palm ever got a seed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as core from '../../../src/core/index.js';
import { GardenSystem, nearestFreeCell } from '../../../src/garden/index.js';
import { PALM_UP_HOLD_MS } from '../../../src/hands/config.js';
import { GestureMachine } from '../../../src/hands/GestureMachine.js';
import { createHandFrame } from '../../../src/hands/InputSource.js';
import { garden, seed } from '../garden/fixtures.js';

import type { Hand, Vec3 } from '../../../src/core/index.js';
import type { GestureContext } from '../../../src/hands/GestureMachine.js';
import type { PickCandidate } from '../../../src/hands/TargetPicker.js';
import type { MockInstance } from 'vitest';

const FRAME_MS = 14;
const T0 = Date.UTC(2026, 9, 12, 10);
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1]; // flat, its centre 0.45 m ahead
const LEFT_PALM: Vec3 = { x: -0.25, y: 0.95, z: -0.3 };
const ON_BED: Vec3 = { x: 0.2, y: 0.76, z: -0.45 }; // ring 2, step 0
const AWAY: Vec3 = { x: 0.5, y: 1.2, z: -0.2 };

let subscribed: MockInstance<typeof core.bus.on>;
beforeEach(() => {
  subscribed = vi.spyOn(core.bus, 'on');
});
afterEach(() => {
  // GardenSystem subscribes for the life of a page: every handler of this test comes off the bus again.
  for (const subscription of subscribed.mock.results) (subscription.value as () => void)();
  vi.restoreAllMocks();
});

/** The garden with seeds s1 and s2, both hands (the left palm up, the right one down) and a clock. */
function rig() {
  const system = new GardenSystem(
    core.createClock(() => T0),
    core.flags,
  );
  system.load(garden([], [seed('s1'), seed('s2')], { lastSeedDate: '2026-10-12', lastVisitAt: T0 - 1000 }));
  const out: { id: string; hand: Hand; atMs: number }[] = [];
  let timeMs = 0;
  core.bus.on('garden:seedOut', ({ seed, hand }) => out.push({ id: seed.id, hand, atMs: timeMs }));
  const candidates: PickCandidate[] = [];
  // What SeedSystem does: the seed that is out is a target on the palm it rests on, until it is not out.
  core.bus.on('garden:seedOut', ({ seed }) =>
    candidates.push({ target: { kind: 'seed', id: seed.id }, radius: 0.04, pos: LEFT_PALM }),
  );
  core.bus.on('garden:changed', () => void (candidates.length = 0));
  const context: GestureContext = {
    candidates,
    bedPose: BED,
    oneHand: false,
    nearestFreeCell: (cell, ignore) =>
      system.state === null ? cell : nearestFreeCell(system.state, cell, ignore),
  };
  const machines = { left: new GestureMachine('left'), right: new GestureMachine('right') };
  const frames = { left: createHandFrame('left'), right: createHandFrame('right') };
  frames.left.tracked = frames.right.tracked = true;
  frames.left.palmNormal.y = 1; // up, all along
  frames.right.palmNormal.y = -1;
  Object.assign(frames.left.pinchPos, AWAY);
  Object.assign(frames.right.pinchPos, AWAY);
  /** Both hands, one sample each per 14 ms, until `untilMs`. */
  const run = (untilMs: number): void => {
    while (timeMs < untilMs) {
      timeMs += FRAME_MS;
      machines.left.update(frames.left, timeMs, context);
      machines.right.update(frames.right, timeMs, context);
    }
  };
  return { system, out, frames, run, now: () => timeMs };
}

describe('palm up, re-armed while the palm stays up (T-127, FR-HND-05)', () => {
  it('a palm raised while the bed is still being placed gets its seed once the visit is in', () => {
    const { out, run, now } = rig();
    run(1000); // the palm has been up for a second: two palm-ups the garden could not serve (no visit yet)
    expect(out).toEqual([]);
    core.bus.emit('room:features', { features: { level: 4 }, surfaces: {} }); // the bed is placed: the visit
    const visitAt = now();
    run(2000);
    expect(out[0]).toMatchObject({ id: 's1', hand: 'left' });
    expect(out[0]!.atMs - visitAt).toBeLessThanOrEqual(PALM_UP_HOLD_MS + FRAME_MS);
    expect(out).toHaveLength(1); // the repeats while s1 is out are ignored by the garden
  });

  it('a seed planted by the other hand while the palm stays up: the next seed comes to the same palm', () => {
    const { system, out, frames, run, now } = rig();
    core.bus.emit('room:features', { features: { level: 4 }, surfaces: {} });
    run(500);
    expect(out).toEqual([{ id: 's1', hand: 'left', atMs: expect.any(Number) as number }]);

    // The right hand pinches the seed off the left palm, carries it over the bed and lets go there.
    Object.assign(frames.right.pinchPos, LEFT_PALM);
    run(now() + FRAME_MS);
    frames.right.select = frames.right.pinch = true;
    run(now() + FRAME_MS);
    Object.assign(frames.right.pinchPos, ON_BED);
    run(now() + 3 * FRAME_MS);
    frames.right.select = frames.right.pinch = false;
    run(now() + FRAME_MS);
    expect(system.state?.plants.map((plant) => plant.id)).toEqual(['s1']);
    const plantedAt = now();

    run(plantedAt + 2 * PALM_UP_HOLD_MS);
    expect(out.map(({ id, hand }) => [id, hand])).toEqual([
      ['s1', 'left'],
      ['s2', 'left'],
    ]);
    expect(out[1]!.atMs - plantedAt).toBeLessThanOrEqual(PALM_UP_HOLD_MS + FRAME_MS);
  });
});
