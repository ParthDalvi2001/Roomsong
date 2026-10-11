// TC-HND-01 (the two-signal rule), TC-HND-04 (the subset without T-116 and T-146: plant, press, commit on
// release), TC-HND-05 (release.cell is the snapped cell resolved to a free one) and TC-HND-03 (palm up through
// the machine). Synthetic HandFrames, garden's own bedZone and snapToCell, and a counted clock: no XR, no timers.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bus } from '../../../src/core/index.js';
import { PALM_UP_HOLD_MS } from '../../../src/hands/config.js';
import { GestureMachine } from '../../../src/hands/GestureMachine.js';
import { createHandFrame } from '../../../src/hands/InputSource.js';

import { heapCost, PROBE_BYTES } from './heapCost.js';

import type { Hand, Vec3 } from '../../../src/core/index.js';
import type { Cell } from '../../../src/garden/index.js';
import type { GestureContext, GesturePayload } from '../../../src/hands/GestureMachine.js';
import type { PickCandidate } from '../../../src/hands/TargetPicker.js';

const FRAME_MS = 14;
const EMITTED = ['gesture:palmUp', 'gesture:pinchStart', 'gesture:release'] as const;
type Emitted = GesturePayload<(typeof EMITTED)[number]>;

// The bed lies flat with its centre 0.45 m ahead at table height (column-major, no rotation).
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
const ON_BED: Vec3 = { x: 0.2, y: 0.76, z: -0.45 }; // 0.20 m from the centre: on the ring
const IN_HOLE: Vec3 = { x: 0.05, y: 0.76, z: -0.45 }; // 0.05 m: the centre hole
const OFF_BED: Vec3 = { x: 0.4, y: 0.76, z: -0.45 }; // 0.40 m: past the outer edge
const SEED_AT: Vec3 = { x: -0.25, y: 0.95, z: -0.3 };
const PLANT_AT: Vec3 = { x: 0.2, y: 0.76, z: -0.45 };
const ORB_AT: Vec3 = { x: 0, y: 0.76, z: -0.45 };
const NOWHERE: Vec3 = { x: 0.5, y: 1.2, z: -0.2 };
const SNAPPED: Cell = { ring: 2, step: 0 }; // what garden snaps ON_BED to: 0.20 m out is ring 2, to the right is step 0

const SEED = { kind: 'seed', id: 'seed-1' } as const;
const PLANT = { kind: 'plant', id: 'plant-1' } as const;
const ORB = { kind: 'orb', id: 'listen' } as const;

let seen: Emitted[];
let unsubscribe: (() => void)[];
beforeEach(() => {
  seen = [];
  // The machine reuses its payload objects, so each one is copied as it arrives.
  unsubscribe = EMITTED.map((type) => bus.on(type, (payload) => seen.push(structuredClone(payload))));
});
afterEach(() => unsubscribe.forEach((off) => off()));

/** One machine, one hand, the scene above, and a clock that advances 14 ms per sample. */
function rig(hand: Hand = 'right') {
  // Garden's state, as far as hands sees it: which cell is free, and which cells it was asked about.
  const garden = { free: 'same' as Cell | null | 'same', asked: [] as Cell[] };
  const candidates: PickCandidate[] = [
    { target: { ...SEED }, radius: 0.04, pos: SEED_AT },
    { target: { ...PLANT }, radius: 0.04, pos: PLANT_AT },
    { target: { ...ORB }, radius: 0.04, pos: ORB_AT },
  ];
  const context: GestureContext = {
    candidates,
    bedPose: BED,
    nearestFreeCell(cell) {
      garden.asked.push(cell);
      return garden.free === 'same' ? cell : garden.free;
    },
  };
  const machine = new GestureMachine(hand);
  const frame = createHandFrame(hand);
  frame.tracked = true;
  frame.palmNormal.y = -1; // palm down
  let timeMs = 0;
  /** Changes what is given, keeps the rest, and feeds one sample. */
  const step = (
    change: { at?: Vec3; pinch?: boolean; select?: boolean; tracked?: boolean; palmUp?: boolean } = {},
  ) => {
    if (change.at) Object.assign(frame.pinchPos, change.at);
    if (change.pinch !== undefined) frame.pinch = change.pinch;
    if (change.select !== undefined) frame.select = change.select;
    if (change.tracked !== undefined) frame.tracked = change.tracked;
    if (change.palmUp !== undefined) frame.palmNormal.y = change.palmUp ? 1 : -1;
    timeMs += FRAME_MS;
    machine.update(frame, timeMs, context);
    return timeMs;
  };
  return { step, context, candidates, garden };
}

const types = () => seen.map((event) => event.type);
const last = () => seen[seen.length - 1];

describe('GestureMachine: which signal a pinch uses (TC-HND-01)', () => {
  it('a seed starts and ends on select, whatever the joint distance does meanwhile', () => {
    const { step } = rig();
    step({ at: SEED_AT });
    step({ select: true });
    expect(seen).toEqual([{ type: 'gesture:pinchStart', hand: 'right', target: SEED, pos: SEED_AT }]);
    step({ pinch: true });
    step({ pinch: false }); // the joint distance opens: the seed is still carried
    expect(types()).toEqual(['gesture:pinchStart']);
    step({ select: false });
    expect(types()).toEqual(['gesture:pinchStart', 'gesture:release']);
    expect(last()).toMatchObject({ gesture: 'carry', target: SEED });
  });

  it('a joint-distance edge alone picks up no seed and presses no orb', () => {
    const { step } = rig();
    step({ at: SEED_AT });
    step({ pinch: true });
    step({ pinch: false });
    step({ at: ORB_AT });
    step({ pinch: true });
    step({ pinch: false });
    expect(seen).toEqual([]);
  });

  it('a plant starts and ends on the joint distance; a select edge alone does not grab it', () => {
    const { step } = rig();
    step({ at: PLANT_AT });
    step({ select: true }); // the platform says pinch first: not a grab
    expect(seen).toEqual([]);
    step({ pinch: true });
    expect(seen).toEqual([{ type: 'gesture:pinchStart', hand: 'right', target: PLANT, pos: PLANT_AT }]);
    step({ select: false }); // the platform lets go first: the plant is still held
    expect(types()).toEqual(['gesture:pinchStart']);
    step({ pinch: false });
    expect(last()).toEqual({
      type: 'gesture:release',
      hand: 'right',
      gesture: 'none', // v1: pull and drag are T-146
      target: PLANT,
      pos: PLANT_AT,
      zone: 'bed',
      cell: null,
      dy: null,
    });
  });

  it('a pinch on nothing starts and ends on select, with no target (the wake pinch)', () => {
    const { step } = rig('left');
    step({ at: NOWHERE });
    step({ pinch: true });
    expect(seen).toEqual([]);
    step({ select: true });
    expect(seen).toEqual([{ type: 'gesture:pinchStart', hand: 'left', target: null, pos: NOWHERE }]);
    step({ pinch: false });
    step({ select: false });
    expect(last()).toMatchObject({
      type: 'gesture:release',
      hand: 'left',
      gesture: 'none',
      target: null,
      cell: null,
    });
  });

  it('a source that reports select = pinch (the pointer) reaches seeds and plants alike', () => {
    const { step } = rig();
    step({ at: SEED_AT });
    step({ pinch: true, select: true });
    step({ at: ON_BED });
    step({ pinch: false, select: false });
    step({ at: PLANT_AT });
    step({ pinch: true, select: true });
    step({ pinch: false, select: false });
    expect(seen.map((event) => ('target' in event ? event.target?.kind : null))).toEqual([
      'seed',
      'seed',
      'plant',
      'plant',
    ]);
  });

  it('only a rising edge starts a pinch: joints still closed from the last one do not grab a plant', () => {
    const { step } = rig();
    step({ at: SEED_AT });
    step({ pinch: true, select: true }); // picks the seed up, on select
    step({ select: false }); // lets it go on select; the joints are still closed
    step({ at: PLANT_AT }); // and moves onto a plant like that
    step();
    expect(types()).toEqual(['gesture:pinchStart', 'gesture:release']);
  });

  it('only a rising edge starts a pinch: a select still down from the last one does not press the orb', () => {
    const { step } = rig();
    step({ at: PLANT_AT });
    step({ pinch: true, select: true }); // grabs the plant, on the joint distance
    step({ pinch: false }); // lets it go on the joint distance; the platform still says select
    step({ at: ORB_AT }); // and moves onto the orb like that
    step();
    expect(types()).toEqual(['gesture:pinchStart', 'gesture:release']);
  });
});

describe('GestureMachine: carry, plant and press (TC-HND-04 subset, TC-HND-05)', () => {
  /** Picks the seed up and carries it to `to`, then lets go there. */
  function carryTo(to: Vec3, r = rig()) {
    r.step({ at: SEED_AT });
    r.step({ select: true });
    r.step({ at: to });
    r.step({ select: false });
    return r;
  }

  it('PLANT: a seed released over the bed commits its cell, and nothing commits before the release', () => {
    const r = rig();
    r.step({ at: SEED_AT });
    r.step({ select: true });
    for (let i = 0; i < 20; i++) r.step({ at: ON_BED }); // carried about: previews only
    expect(types()).toEqual(['gesture:pinchStart']);
    r.step({ select: false });
    expect(seen).toHaveLength(2);
    expect(last()).toEqual({
      type: 'gesture:release',
      hand: 'right',
      gesture: 'carry',
      target: SEED,
      pos: ON_BED,
      zone: 'bed',
      cell: SNAPPED,
      dy: null,
    });
    expect(r.garden.asked).toEqual([SNAPPED]); // garden is asked once, at the release, about the snapped cell
  });

  it('the committed cell is the nearest free one when the cell under the hand is taken', () => {
    const r = rig();
    r.garden.free = { ring: 3, step: 0 };
    carryTo(ON_BED, r);
    expect(last()).toMatchObject({ gesture: 'carry', zone: 'bed', cell: { ring: 3, step: 0 } });
  });

  it('a seed released off the bed, in the hole or over a full bed has no cell: it goes back to the supply', () => {
    carryTo(OFF_BED);
    expect(last()).toMatchObject({ gesture: 'carry', target: SEED, zone: 'outer', cell: null });
    carryTo(IN_HOLE);
    expect(last()).toMatchObject({ gesture: 'carry', target: SEED, zone: 'inner', cell: null });
    const full = rig();
    full.garden.free = null;
    carryTo(ON_BED, full);
    expect(last()).toMatchObject({ gesture: 'carry', target: SEED, zone: 'bed', cell: null });
  });

  it('with no bed placed yet a release is in the zone where nothing commits', () => {
    const r = rig();
    r.context.bedPose = null;
    carryTo(ON_BED, r);
    expect(last()).toMatchObject({ gesture: 'carry', zone: 'inner', cell: null });
    expect(r.garden.asked).toEqual([]);
  });

  it('measures the release against the bed where it is: a bed moved 1 m to the right', () => {
    const r = rig();
    r.context.bedPose = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0.74, -0.45, 1];
    carryTo(ON_BED, r); // 0.8 m from that bed's centre
    expect(last()).toMatchObject({ zone: 'outer', cell: null });
    carryTo({ x: 1.2, y: 0.76, z: -0.45 }, r);
    expect(last()).toMatchObject({ zone: 'bed', cell: SNAPPED });
  });

  it('PRESSED: the orb acts on release over it, and moving off it first cancels', () => {
    const { step } = rig();
    step({ at: ORB_AT });
    step({ select: true });
    expect(last()).toEqual({ type: 'gesture:pinchStart', hand: 'right', target: ORB, pos: ORB_AT });
    step({ select: false });
    expect(last()).toMatchObject({ gesture: 'press', target: ORB, cell: null, dy: null });

    step({ select: true });
    step({ at: NOWHERE });
    step({ select: false });
    expect(last()).toMatchObject({ gesture: 'press', target: null, cell: null });

    step({ at: ORB_AT });
    step({ select: true });
    step({ at: PLANT_AT }); // off the orb and onto something else: still a cancel
    step({ select: false });
    expect(last()).toMatchObject({ gesture: 'press', target: null });
  });

  it('keeps its own copy of the target: the candidate list may be rewritten while a seed is carried', () => {
    const r = rig();
    r.step({ at: SEED_AT });
    r.step({ select: true });
    r.candidates[0]!.target.id = 'seed-2'; // the caller reuses its objects from frame to frame
    r.step({ at: ON_BED });
    r.step({ select: false });
    expect(last()).toMatchObject({ gesture: 'carry', target: SEED });
  });

  it('is idle again after a release: a second seed can be carried', () => {
    const r = carryTo(ON_BED);
    carryTo(ON_BED, r);
    expect(types()).toEqual([
      'gesture:pinchStart',
      'gesture:release',
      'gesture:pinchStart',
      'gesture:release',
    ]);
  });

  it('reuses its payload objects: a handler that keeps one sees the next event in it', () => {
    const kept: unknown[] = [];
    const off = bus.on('gesture:release', (payload) => kept.push(payload));
    carryTo(ON_BED, carryTo(OFF_BED));
    off();
    expect(kept).toHaveLength(2);
    expect(kept[0]).toBe(kept[1]);
  });
});

describe('GestureMachine: an untracked hand (the grace and the revert are T-116)', () => {
  it('nothing starts, ends or commits on an untracked sample; the gesture goes on when the hand is back', () => {
    const { step } = rig();
    step({ at: SEED_AT });
    step({ select: true });
    step({ at: ON_BED });
    for (let i = 0; i < 30; i++) step({ tracked: false, select: false }); // 420 ms out of view
    expect(types()).toEqual(['gesture:pinchStart']);
    step({ tracked: true, select: true }); // back, still pinched: still carried
    expect(types()).toEqual(['gesture:pinchStart']);
    step({ select: false });
    expect(last()).toMatchObject({ gesture: 'carry', zone: 'bed', cell: SNAPPED });
  });

  it('a pinch that opened while the hand was away is an ordinary release at the new sample', () => {
    const { step } = rig();
    step({ at: SEED_AT });
    step({ select: true });
    step({ tracked: false, select: false });
    step({ tracked: true, at: OFF_BED });
    expect(last()).toMatchObject({ gesture: 'carry', zone: 'outer', cell: null, pos: OFF_BED });
  });

  it('starts nothing for a hand that is not tracked', () => {
    const { step } = rig();
    step({ at: SEED_AT, tracked: false });
    step({ select: true });
    expect(seen).toEqual([]);
    step({ tracked: true }); // seen pinching for the first time: that is the edge
    expect(types()).toEqual(['gesture:pinchStart']);
  });
});

describe('GestureMachine: palm up (TC-HND-03, FR-HND-05)', () => {
  /** Feeds samples until `untilMs` on the rig clock and returns the times a palm-up event arrived. */
  function palmUpTimes(step: ReturnType<typeof rig>['step'], untilMs: number): number[] {
    const times: number[] = [];
    let timeMs = 0;
    while (timeMs < untilMs) {
      const before = seen.length;
      timeMs = step();
      if (seen.length > before && last()?.type === 'gesture:palmUp') times.push(timeMs);
    }
    return times;
  }

  it('asks for a seed once, 400 ms after an idle hand turned its palm up', () => {
    const { step } = rig('left');
    const turnedAt = step({ at: NOWHERE, palmUp: true });
    const times = palmUpTimes(step, 2000);
    expect(times).toHaveLength(1);
    expect(times[0]! - turnedAt).toBeGreaterThanOrEqual(PALM_UP_HOLD_MS);
    expect(times[0]! - turnedAt).toBeLessThan(PALM_UP_HOLD_MS + FRAME_MS);
    expect(seen).toEqual([{ type: 'gesture:palmUp', hand: 'left' }]);
  });

  it('does not ask while the hand carries a seed, and asks again 400 ms after it is idle', () => {
    const { step } = rig();
    step({ at: SEED_AT, palmUp: true });
    step({ select: true });
    expect(palmUpTimes(step, 1000)).toEqual([]); // palm up all along, but busy
    const idleAt = step({ select: false });
    const times = palmUpTimes(step, 2000);
    expect(times).toHaveLength(1); // the pointer's next seed (LLD §11)
    expect(times[0]! - idleAt).toBeGreaterThanOrEqual(PALM_UP_HOLD_MS);
    expect(times[0]! - idleAt).toBeLessThanOrEqual(PALM_UP_HOLD_MS + 2 * FRAME_MS);
  });

  it('starts the hold over when the hand is lost', () => {
    const { step } = rig();
    step({ at: NOWHERE, palmUp: true });
    expect(palmUpTimes(step, 300)).toEqual([]);
    step({ tracked: false });
    const backAt = step({ tracked: true });
    const times = palmUpTimes(step, 1500);
    expect(times).toHaveLength(1);
    expect(times[0]! - backAt).toBeGreaterThanOrEqual(PALM_UP_HOLD_MS);
  });
});

describe('GestureMachine: no allocation per frame', () => {
  it('the machine, the picker, the bed zone and the palm-up hold create nothing', () => {
    const ROUNDS = 100_000;
    // The hand is at whole metres and the clock ticks whole seconds: V8 boxes a fractional number (16 bytes)
    // when it hands one to a function it did not inline, and a whole number never. The seed is 1 cm off the
    // hand, so the picker's distance is a fraction: Math.hypot there would show.
    // The hand is over the bed centre, so a release reads the zone and snaps nothing. A release over the ring
    // costs about 160 bytes more, once per release and not per frame: boxed numbers again (the bed-local point
    // is a fraction there, and garden's snap computes with it). Measured when this was written, not asserted.
    const context: GestureContext = {
      candidates: [{ target: { kind: 'seed', id: 's' }, radius: 0.04, pos: { x: 0.01, y: 1, z: -1 } }],
      bedPose: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, -1, 1],
      nearestFreeCell: (cell) => cell,
    };
    const machine = new GestureMachine('right');
    const frame = createHandFrame('right');
    frame.tracked = true;
    Object.assign(frame.pinchPos, { x: 0, y: 1, z: -1 });
    let timeMs = 0;
    // A pinch on the seed every 80 frames and a palm that turns up and down: the pick, pinchStart, the bed
    // zone, release and palmUp all run, each with its event on the bus.
    const updateAll = (): void => {
      for (let i = 0; i < ROUNDS; i++) {
        timeMs += 1000;
        frame.pinch = frame.select = i % 80 < 40;
        frame.palmNormal.y = i % 200 < 100 ? 1 : -1;
        machine.update(frame, timeMs, context);
      }
    };
    const keeper: { kept: unknown } = { kept: null };
    // The control: the smallest leak there is, one small object per frame.
    const allocateAll = (): void => {
      for (let i = 0; i < ROUNDS; i++) keeper.kept = { i };
    };
    // The file's recorders copy every payload, which is an allocation: counters take their place here.
    unsubscribe.forEach((off) => off());
    const count = { starts: 0, releases: 0, palmUps: 0 };
    const off = [
      bus.on('gesture:pinchStart', (event) => {
        if (event.target !== null) count.starts++;
      }),
      bus.on('gesture:release', (event) => {
        if (event.gesture === 'carry' && event.zone === 'inner') count.releases++;
      }),
      bus.on('gesture:palmUp', () => {
        count.palmUps++;
      }),
    ];
    updateAll(); // warm up: the JIT's own allocations happen here
    updateAll();
    allocateAll();

    const control = heapCost(allocateAll);
    expect(control.gcs > 0 || control.grewBytes > ROUNDS * 8).toBe(true); // the probe sees that leak
    // The best of three rounds: the JIT may still finish a compile during one of them.
    const costs = [heapCost(updateAll), heapCost(updateAll), heapCost(updateAll)];
    off.forEach((stop) => stop());
    const clean = costs.filter((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES);
    expect(clean.length, JSON.stringify(costs)).toBeGreaterThan(0);
    expect(count.starts).toBe((5 * ROUNDS) / 80); // every pinch did pick the seed up
    expect(count.releases).toBe((5 * ROUNDS) / 80); // and every release read the zone from garden
    expect(count.palmUps).toBeGreaterThan(0);
    expect(keeper.kept).not.toBeNull();
  });
});
