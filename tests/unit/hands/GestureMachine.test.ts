// TC-HND-01 (the two-signal rule), TC-HND-04 (the subset without T-146: plant, press, commit on release),
// TC-HND-05 (release.cell is the hovered cell), TC-HND-07 (tracking loss), TC-HND-08 (the hover and its dead band)
// and TC-HND-03 (palm up through the machine). Synthetic HandFrames, garden's own bedZone and snapToCell, and a
// counted clock: no XR, no timers.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bus } from '../../../src/core/index.js';
import { HOVER_DEAD_BAND_M, PALM_UP_HOLD_MS, TRACKING_GRACE_MS } from '../../../src/hands/config.js';
import { GestureMachine } from '../../../src/hands/GestureMachine.js';
import { createHandFrame } from '../../../src/hands/InputSource.js';

import { heapCost, PROBE_BYTES } from './heapCost.js';

import type { EventMap, Hand, Vec3 } from '../../../src/core/index.js';
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

// The events of T-116, kept apart from `seen` so the older tests still read as the list of gestures.
const HEARD = ['hands:lost', 'hands:found', 'gesture:trackingLost', 'target:hover'] as const;
type Heard = {
  [K in (typeof HEARD)[number]]: { name: K } & Omit<EventMap[K], 'type'>;
}[(typeof HEARD)[number]];

let seen: Emitted[];
let heard: Heard[];
let unsubscribe: (() => void)[];
beforeEach(() => {
  seen = [];
  heard = [];
  // The machine reuses its payload objects, so each one is copied as it arrives.
  unsubscribe = [
    ...EMITTED.map((type) => bus.on(type, (payload) => seen.push(structuredClone(payload)))),
    ...HEARD.map((name) =>
      bus.on(name, (payload) => {
        const copy = structuredClone(payload) as Record<string, unknown>;
        delete copy.type; // gesture:trackingLost names itself; here every event is named the same way
        heard.push({ name, ...copy } as Heard);
      }),
    ),
  ];
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
  /** Changes what is given, keeps the rest, and feeds one sample, `afterMs` after the last one (14 ms if not given). */
  const step = (
    change: {
      at?: Vec3;
      pinch?: boolean;
      select?: boolean;
      tracked?: boolean;
      palmUp?: boolean;
      afterMs?: number;
    } = {},
  ) => {
    if (change.at) Object.assign(frame.pinchPos, change.at);
    if (change.pinch !== undefined) frame.pinch = change.pinch;
    if (change.select !== undefined) frame.select = change.select;
    if (change.tracked !== undefined) frame.tracked = change.tracked;
    if (change.palmUp !== undefined) frame.palmNormal.y = change.palmUp ? 1 : -1;
    timeMs += change.afterMs ?? FRAME_MS;
    machine.update(frame, timeMs, context);
    return timeMs;
  };
  return { step, context, candidates, garden, machine };
}

const types = () => seen.map((event) => event.type);
const last = () => seen[seen.length - 1];
const names = () => heard.map((event) => event.name);
const hovers = () => heard.filter((event) => event.name === 'target:hover');
const lastHover = () => hovers()[hovers().length - 1];
/** A point over ring 2 (0.21 m from the bed centre) at `rad` from step 0 toward step 1; the border is at pi / 16. */
const onRing2 = (rad: number): Vec3 => ({
  x: 0.21 * Math.cos(rad),
  y: 0.76,
  z: -0.45 + 0.21 * Math.sin(rad),
});
const BORDER_RAD = Math.PI / 16;
/** Radians along ring 2 for a length of arc in metres. */
const arc = (metres: number): number => metres / 0.21;

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
    // Garden is asked on every sample over the bed (the other hand may fill the cell), always about that cell.
    expect(r.garden.asked).toHaveLength(21);
    expect(r.garden.asked.every((cell) => cell.ring === 2 && cell.step === 0)).toBe(true);
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

describe('GestureMachine: tracking loss (TC-HND-07, FR-HND-15)', () => {
  // Each held state the machine has: where the pinch starts, the signal it rides on, and what its release is.
  const HELD = [
    { name: 'CARRYING', at: SEED_AT, signal: 'select', held: SEED, gesture: 'carry' },
    { name: 'PINCHED (a plant)', at: PLANT_AT, signal: 'pinch', held: PLANT, gesture: 'none' },
    { name: 'PRESSED', at: ORB_AT, signal: 'select', held: ORB, gesture: 'press' },
    { name: 'PINCHED (nothing)', at: NOWHERE, signal: 'select', held: null, gesture: 'none' },
  ] as const;

  for (const { name, at, signal, held, gesture } of HELD) {
    it(`${name}: lost for 199 ms the gesture goes on; hands:lost at once and hands:found, once each`, () => {
      const { step } = rig();
      step({ at });
      step({ [signal]: true });
      step({ tracked: false });
      expect(heard.filter((event) => event.name !== 'target:hover')).toEqual([
        { name: 'hands:lost', hand: 'right', held }, // at the first untracked sample, before any grace
      ]);
      for (let i = 0; i < 9; i++) step({ afterMs: 20 }); // 180 ms out of view
      step({ tracked: true, afterMs: 19 }); // back 199 ms after it was lost
      expect(names().filter((n) => n !== 'target:hover')).toEqual(['hands:lost', 'hands:found']);
      expect(types()).toEqual(['gesture:pinchStart']); // still held: nothing ended
      step({ [signal]: false });
      expect(last()).toMatchObject({ type: 'gesture:release', gesture, target: held });
    });

    it(`${name}: lost for 200 ms it is reverted: gesture:trackingLost, idle, and no release ever`, () => {
      const { step } = rig();
      step({ at });
      step({ [signal]: true });
      step({ tracked: false });
      for (let i = 0; i < 9; i++) step({ afterMs: 20 });
      expect(names()).not.toContain('gesture:trackingLost');
      step({ afterMs: 20 }); // 200 ms after it was lost
      expect(heard.filter((event) => event.name === 'gesture:trackingLost')).toEqual([
        { name: 'gesture:trackingLost', hand: 'right' },
      ]);
      for (let i = 0; i < 50; i++) step(); // still away: nothing more
      step({ tracked: true }); // back, the pinch still closed: that starts nothing
      step({ [signal]: false });
      expect(types()).toEqual(['gesture:pinchStart']); // nothing was committed (NFR-REL-02)
      expect(names().filter((n) => n !== 'target:hover')).toEqual([
        'hands:lost',
        'gesture:trackingLost',
        'hands:found',
      ]);
      step({ [signal]: true }); // idle again: a new closing is a new pinch
      expect(types()).toEqual(['gesture:pinchStart', 'gesture:pinchStart']);
    });
  }

  it('an empty hand that is lost emits hands:lost and hands:found, and no gesture:trackingLost', () => {
    const { step } = rig('left');
    step({ at: NOWHERE });
    for (let i = 0; i < 40; i++) step({ tracked: false }); // 560 ms
    step({ tracked: true });
    expect(heard).toEqual([
      { name: 'hands:lost', hand: 'left', held: null },
      { name: 'hands:found', hand: 'left' },
    ]);
    expect(seen).toEqual([]);
  });

  it('a first sighting is not a return: no hands:found without a hands:lost before it', () => {
    const { step } = rig();
    step({ at: NOWHERE, tracked: false });
    step({ tracked: true });
    expect(heard).toEqual([]);
  });

  it('the hover is frozen during the grace and cleared when it runs out', () => {
    const r = rig();
    r.step({ at: SEED_AT });
    r.step({ select: true });
    r.step({ at: ON_BED });
    expect(lastHover()).toMatchObject({ target: null, cell: SNAPPED });
    const before = hovers().length;
    r.garden.free = { ring: 3, step: 0 }; // the cell fills while the hand is away: not looked at
    for (let i = 0; i < 14; i++) r.step({ tracked: false }); // 182 ms after the first untracked sample
    expect(hovers()).toHaveLength(before);
    r.step({ afterMs: 18 });
    expect(heard.slice(-2)).toEqual([
      { name: 'gesture:trackingLost', hand: 'right' },
      { name: 'target:hover', hand: 'right', target: null, cell: null },
    ]);
  });

  it("an idle hand's hover is cleared the moment it is lost", () => {
    const { step } = rig();
    step({ at: PLANT_AT });
    expect(hovers()).toEqual([{ name: 'target:hover', hand: 'right', target: PLANT, cell: null }]);
    step({ tracked: false });
    expect(heard.slice(-2)).toEqual([
      { name: 'hands:lost', hand: 'right', held: null },
      { name: 'target:hover', hand: 'right', target: null, cell: null },
    ]);
  });

  it('a page that was paused: the first sample after the grace is a tracked one, and it reverts first', () => {
    const { step } = rig();
    step({ at: SEED_AT });
    step({ select: true });
    step({ tracked: false });
    step({ tracked: true, afterMs: 3000 }); // no sample in between; the pinch is still closed
    expect(names().filter((n) => n !== 'target:hover')).toEqual([
      'hands:lost',
      'gesture:trackingLost',
      'hands:found',
    ]);
    step({ select: false });
    expect(types()).toEqual(['gesture:pinchStart']); // the seed was not picked up again, and nothing is released
  });

  it('lost and found again in the next sample: one of each, and the seed is still carried', () => {
    const { step } = rig();
    step({ at: SEED_AT });
    step({ select: true });
    step({ tracked: false });
    step({ tracked: true, at: ON_BED });
    expect(names().filter((n) => n !== 'target:hover')).toEqual(['hands:lost', 'hands:found']);
    step({ select: false });
    expect(last()).toMatchObject({ gesture: 'carry', zone: 'bed', cell: SNAPPED });
  });

  it('both hands lost at once: each has its own grace and its own events', () => {
    const left = rig('left');
    const right = rig('right');
    for (const r of [left, right]) {
      r.step({ at: SEED_AT });
      r.step({ select: true });
      r.step({ tracked: false });
    }
    expect(heard.filter((event) => event.name === 'hands:lost')).toEqual([
      { name: 'hands:lost', hand: 'left', held: SEED },
      { name: 'hands:lost', hand: 'right', held: SEED },
    ]);
    left.step({ tracked: true, afterMs: 100 }); // the left hand is back in time
    right.step({ afterMs: TRACKING_GRACE_MS }); // the right one is not
    expect(heard.filter((event) => event.name !== 'hands:lost' && event.name !== 'target:hover')).toEqual([
      { name: 'hands:found', hand: 'left' },
      { name: 'gesture:trackingLost', hand: 'right' },
    ]);
    left.step({ select: false });
    expect(last()).toMatchObject({ hand: 'left', gesture: 'carry', target: SEED });
  });

  it('reset during the grace (the session ended): reverted once, no hands:found, and nothing is left over', () => {
    const { step, machine } = rig();
    step({ at: SEED_AT });
    step({ select: true });
    step({ tracked: false });
    machine.reset();
    machine.reset(); // a second one finds nothing to do
    expect(names().filter((n) => n !== 'target:hover')).toEqual(['hands:lost', 'gesture:trackingLost']);
    heard.length = 0;
    for (let i = 0; i < 30; i++) step(); // the old grace does not fire in the next session
    step({ tracked: true, select: false, at: NOWHERE });
    expect(heard).toEqual([]); // and its first sighting is not a return
    step({ at: SEED_AT });
    step({ select: true });
    expect(types()).toEqual(['gesture:pinchStart', 'gesture:pinchStart']);
  });

  it('reset forgets the edges too: a hand first seen pinching in the next session starts a pinch, as on a new machine', () => {
    // Without that, a signal still down from before the session ended would be "the last pinch" for good, and
    // the first pinch of the next session would do nothing. One case per signal.
    const onSelect = rig();
    onSelect.step({ at: SEED_AT });
    onSelect.step({ select: true }); // carries the seed
    onSelect.machine.reset(); // the session ends with the pinch held
    onSelect.step(); // the next session's first sample: at the seed, pinched
    expect(types()).toEqual(['gesture:pinchStart', 'gesture:pinchStart']);

    seen.length = 0;
    const onPinch = rig();
    onPinch.step({ at: PLANT_AT });
    onPinch.step({ pinch: true }); // holds the plant
    onPinch.machine.reset();
    onPinch.step();
    expect(types()).toEqual(['gesture:pinchStart', 'gesture:pinchStart']);
  });

  it('reset of a tracked, idle hand clears its hover and says nothing else', () => {
    const { step, machine } = rig();
    step({ at: PLANT_AT });
    heard.length = 0;
    machine.reset();
    expect(heard).toEqual([{ name: 'target:hover', hand: 'right', target: null, cell: null }]);
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

describe('GestureMachine: the hover (TC-HND-08, TC-HND-05, FR-HND-16)', () => {
  it('target:hover fires on a change only: one per move to a neighbour, none in 100 unchanged frames', () => {
    const { step } = rig();
    step({ at: NOWHERE });
    expect(heard).toEqual([]); // nothing in range, and nothing was hovered: no event
    step({ at: PLANT_AT });
    for (let i = 0; i < 100; i++) step();
    step({ at: ORB_AT });
    for (let i = 0; i < 100; i++) step();
    step({ at: NOWHERE });
    expect(heard).toEqual([
      { name: 'target:hover', hand: 'right', target: PLANT, cell: null },
      { name: 'target:hover', hand: 'right', target: ORB, cell: null },
      { name: 'target:hover', hand: 'right', target: null, cell: null },
    ]);
  });

  it('a pinch starts on the hovered target, not on one that came 0.3 cm nearer since', () => {
    const { step, candidates } = rig();
    candidates.push({
      target: { kind: 'orb', id: 'other' },
      radius: 0.04,
      pos: { x: 0.04, y: 0.76, z: -0.45 },
    });
    step({ at: ORB_AT }); // hovers the Listen orb, at x = 0
    step({ at: { x: 0.0215, y: 0.76, z: -0.45 } }); // 2.15 cm from it, 1.85 cm from the other one
    step({ select: true });
    expect(last()).toMatchObject({ type: 'gesture:pinchStart', target: ORB });
    expect(hovers()).toHaveLength(1);
  });

  it('a press is kept while the hover is, up to 4.5 cm from the target, and cancelled beyond', () => {
    const { step } = rig();
    step({ at: ORB_AT });
    step({ select: true });
    step({ at: { x: 0.044, y: 0.76, z: -0.45 } }); // past the 4 cm radius, inside the dead band
    step({ select: false });
    expect(last()).toMatchObject({ gesture: 'press', target: ORB });
    step({ at: ORB_AT });
    step({ select: true });
    step({ at: { x: 0.046, y: 0.76, z: -0.45 } });
    step({ select: false });
    expect(last()).toMatchObject({ gesture: 'press', target: null });
  });

  it('a carried seed hovers the cell a release would commit, and no target', () => {
    const r = rig();
    r.step({ at: SEED_AT });
    r.step({ select: true });
    r.step({ at: ON_BED });
    expect(lastHover()).toEqual({ name: 'target:hover', hand: 'right', target: null, cell: SNAPPED });
    r.garden.free = { ring: 3, step: 0 }; // the other hand planted there: the cue moves, the hand did not
    r.step();
    expect(lastHover()).toMatchObject({ cell: { ring: 3, step: 0 } });
    r.garden.free = null; // a full bed
    r.step();
    expect(lastHover()).toMatchObject({ target: null, cell: null });
    r.garden.free = 'same'; // room again
    r.step();
    expect(lastHover()).toMatchObject({ cell: SNAPPED });
    const count = hovers().length;
    r.step({ at: OFF_BED });
    expect(lastHover()).toMatchObject({ target: null, cell: null });
    r.step({ at: IN_HOLE }); // still no cell: no second event
    expect(hovers()).toHaveLength(count + 1);
    r.step({ at: ON_BED });
    r.context.bedPose = null; // the bed is taken away under the hand
    r.step();
    expect(lastHover()).toMatchObject({ target: null, cell: null });
    expect(hovers()).toHaveLength(count + 3);
  });

  it('at the border of two cells the cue does not flicker, and it follows a real move', () => {
    const r = rig();
    r.step({ at: SEED_AT });
    r.step({ select: true });
    r.step({ at: onRing2(BORDER_RAD - arc(0.001)) }); // 1 mm on the side of step 0
    const before = hovers().length;
    expect(lastHover()).toMatchObject({ cell: { ring: 2, step: 0 } });
    for (let i = 0; i < 50; i++) r.step({ at: onRing2(BORDER_RAD + (i % 2 ? -1 : 1) * arc(0.001)) }); // jitter over it
    expect(hovers()).toHaveLength(before);
    r.step({ at: onRing2(BORDER_RAD + arc(0.004)) }); // 4 mm past: its centre is 8 mm nearer than step 0's
    expect(hovers()).toHaveLength(before + 1);
    expect(lastHover()).toMatchObject({ cell: { ring: 2, step: 1 } });
    r.step({ at: onRing2(BORDER_RAD) }); // back on the border: the memory is now step 1
    expect(hovers()).toHaveLength(before + 1);
  });

  it('release.cell is the hovered cell, not a fresh snap of the release point (TC-HND-05)', () => {
    const r = rig();
    r.step({ at: SEED_AT });
    r.step({ select: true });
    r.step({ at: onRing2(0) });
    const past = onRing2(BORDER_RAD + arc(0.001)); // a fresh snap here is step 1
    r.step({ at: past });
    r.step({ select: false });
    expect(lastHover()).toMatchObject({ cell: { ring: 2, step: 0 } });
    expect(last()).toMatchObject({ gesture: 'carry', zone: 'bed', cell: { ring: 2, step: 0 }, pos: past });
    expect(HOVER_DEAD_BAND_M).toBe(0.005);
  });

  it('a held plant hovers no cell: its release commits none until the drag exists (T-146)', () => {
    const { step } = rig();
    step({ at: PLANT_AT });
    step({ pinch: true });
    step({ at: ON_BED });
    expect(hovers()).toEqual([{ name: 'target:hover', hand: 'right', target: PLANT, cell: null }]);
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
  }, 30_000); // a heap measurement: not to fail on the default 5 s on a loaded machine or under coverage

  it('the paths of T-116 create nothing: a cell hovered on the ring, a loss, the grace, the revert', () => {
    const ROUNDS = 100_000;
    const PERIOD = 400;
    // The bed centre is at (0, 1, -1); the seed lies 2 m to its right. Unlike the test above, the hand is at
    // fractions here: a carried seed over the ring cannot be at whole metres.
    const context: GestureContext = {
      candidates: [{ target: { kind: 'seed', id: 's' }, radius: 0.04, pos: { x: 2.01, y: 1, z: -1 } }],
      bedPose: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, -1, 1],
      nearestFreeCell: (cell) => cell,
    };
    const machine = new GestureMachine('right');
    const frame = createHandFrame('right');
    // Two points on ring 2, either side of the border of steps 0 and 1 and inside the dead band: the memory
    // measures both centres on every frame. The points exist before the loop and the frame is pointed at one of
    // them: a fraction written into the frame inside the loop would be boxed there, by the test (40 bytes a
    // frame, measured with the machine left out).
    const atSeed: Vec3 = { x: 2, y: 1, z: -1 };
    const overRing: Vec3[] = [BORDER_RAD - arc(0.001), BORDER_RAD + arc(0.001)].map((rad) => ({
      x: 0.21 * Math.cos(rad),
      y: 1,
      z: -1 + 0.21 * Math.sin(rad),
    }));
    let timeMs = 0;
    // One period of 400 frames, 10 ms each: the seed is picked up and carried over the ring; the hand is lost
    // for 150 ms and comes back; it is lost again for 500 ms, so the grace runs out; then an empty hand is lost.
    const updateAll = (): void => {
      for (let i = 0; i < ROUNDS; i++) {
        const k = i % PERIOD;
        timeMs += 10;
        frame.tracked = !((k >= 100 && k < 115) || (k >= 150 && k < 200) || (k >= 300 && k < 350));
        frame.select = k >= 1 && k < 201;
        frame.pinchPos = k < 2 || k > 201 ? atSeed : overRing[k % 2]!;
        machine.update(frame, timeMs, context);
      }
    };
    unsubscribe.forEach((off) => off());
    const count = { lost: 0, held: 0, found: 0, reverted: 0, cells: 0, released: 0 };
    const off = [
      bus.on('hands:lost', (event) => {
        count.lost++;
        if (event.held !== null) count.held++;
      }),
      bus.on('hands:found', () => {
        count.found++;
      }),
      bus.on('gesture:trackingLost', () => {
        count.reverted++;
      }),
      bus.on('target:hover', (event) => {
        if (event.cell !== null) count.cells++;
      }),
      bus.on('gesture:release', () => {
        count.released++;
      }),
    ];
    updateAll(); // warm up: the JIT's own allocations happen here
    updateAll();
    // The best of five rounds: the JIT may still finish a compile during one of them.
    const costs = Array.from({ length: 5 }, () => heapCost(updateAll));
    off.forEach((stop) => stop());
    const clean = costs.filter((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES);
    expect(clean.length, JSON.stringify(costs)).toBeGreaterThan(0);
    const periods = (7 * ROUNDS) / PERIOD;
    expect(count).toEqual({
      lost: 3 * periods,
      held: 2 * periods, // the two losses with the seed in the hand
      found: 3 * periods,
      reverted: periods, // the 500 ms one
      cells: periods, // one cell per carry: the jitter over the border never moved the cue
      released: 0, // the reverted carry ends with no release
    });
  }, 30_000);
});
