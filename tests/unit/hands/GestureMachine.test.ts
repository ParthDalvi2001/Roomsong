// TC-HND-01 (the two-signal rule), TC-HND-04 (plant, press, pull, drag, the dominant axis, commit on release),
// TC-HND-05 (release.cell is the hovered cell), TC-HND-07 (tracking loss), TC-HND-08 (the hover and its dead band)
// and TC-HND-03 (palm up through the machine). Synthetic HandFrames, garden's own bedZone and snapToCell, and a
// counted clock: no XR, no timers. What the garden does with a release (TC-HND-06) is in shaping.test.ts.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bus } from '../../../src/core/index.js';
import {
  DRAG_DEAD_ZONE_M,
  HOVER_DEAD_BAND_M,
  PALM_UP_HOLD_MS,
  TRACKING_GRACE_MS,
} from '../../../src/hands/config.js';
import { GestureMachine } from '../../../src/hands/GestureMachine.js';
import { createHandFrame } from '../../../src/hands/InputSource.js';

import { heapCost, PROBE_BYTES } from './heapCost.js';

import type { EventMap, Hand, Vec3 } from '../../../src/core/index.js';
import type { Cell } from '../../../src/garden/index.js';
import type { GestureContext, GesturePayload, HeldGesture } from '../../../src/hands/GestureMachine.js';
import type { PickCandidate, TargetRef } from '../../../src/hands/TargetPicker.js';

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

// The previews of a held plant (T-146), kept apart for the same reason: `seen` stays the list of what commits.
const SHOWN = ['gesture:pull', 'gesture:drag'] as const;
type Shown = GesturePayload<(typeof SHOWN)[number]>;

let seen: Emitted[];
let heard: Heard[];
let shown: Shown[];
let unsubscribe: (() => void)[];
beforeEach(() => {
  seen = [];
  heard = [];
  shown = [];
  // The machine reuses its payload objects, so each one is copied as it arrives.
  unsubscribe = [
    ...EMITTED.map((type) => bus.on(type, (payload) => seen.push(structuredClone(payload)))),
    ...SHOWN.map((type) => bus.on(type, (payload) => shown.push(structuredClone(payload)))),
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
  // Garden's state, as far as hands sees it: which cell is free, which cells it was asked about, and for each
  // of those asks the plant whose own cell was to count as free.
  const garden = {
    free: 'same' as Cell | null | 'same',
    asked: [] as Cell[],
    ignored: [] as (string | undefined)[],
  };
  const candidates: PickCandidate[] = [
    { target: { ...SEED }, radius: 0.04, pos: SEED_AT },
    { target: { ...PLANT }, radius: 0.04, pos: PLANT_AT },
    { target: { ...ORB }, radius: 0.04, pos: ORB_AT },
  ];
  const context: GestureContext = {
    candidates,
    bedPose: BED,
    nearestFreeCell(cell, ignorePlantId) {
      garden.asked.push(cell);
      garden.ignored.push(ignorePlantId);
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
/** `from` moved by `by`, in metres. */
const moved = (from: Vec3, by: Partial<Vec3>): Vec3 => ({
  x: from.x + (by.x ?? 0),
  y: from.y + (by.y ?? 0),
  z: from.z + (by.z ?? 0),
});
/** A travel in metres, to ten decimal places: the sums behind it are not exact. */
const near = (metres: number): number => expect.closeTo(metres, 10) as number;
const UP_5CM = moved(PLANT_AT, { y: 0.05 });
const ALONG_5CM = moved(PLANT_AT, { x: 0.05 }); // 0.25 m from the bed centre: ring 3, step 0

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
      gesture: 'none', // the hand never left the dead zone
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

describe('GestureMachine: pull and drag (TC-HND-04, FR-HND-08/10/11)', () => {
  /** Pinches the plant, moves the hand to each point in turn, and lets go at the last one. */
  function shapeTo(points: Vec3[], r = rig()) {
    r.step({ at: PLANT_AT });
    r.step({ pinch: true });
    for (const at of points) r.step({ at });
    r.step({ pinch: false });
    return r;
  }
  // A second plant at coordinates a double holds exactly, and travel of 1/32 m (3.1 cm): a tie that is a tie.
  const EXACT_AT: Vec3 = { x: 0.25, y: 0.75, z: -0.5 };
  const EXACT = { kind: 'plant', id: 'exact' } as const;
  const STEP = 1 / 32;
  const LESS = STEP - 1 / 1024;
  /** Pinches that plant, moves the hand by `by` in one sample and lets go; `bedPose`: another bed than the flat one. */
  function exact(by: Partial<Vec3>, bedPose?: number[]) {
    const r = rig();
    if (bedPose) r.context.bedPose = bedPose;
    r.candidates.push({ target: { ...EXACT }, radius: 0.04, pos: EXACT_AT });
    r.step({ at: EXACT_AT });
    r.step({ pinch: true });
    r.step({ at: moved(EXACT_AT, by) });
    r.step({ pinch: false });
    return last();
  }

  it('inside the 2 cm dead zone nothing reacts: no preview, and the release is the none it was', () => {
    expect(DRAG_DEAD_ZONE_M).toBe(0.02);
    const inside: Partial<Vec3>[] = [
      { y: 0.0199 },
      { y: -0.0199 },
      { x: 0.0199 },
      { z: 0.0199 },
      { x: 0.014, y: 0.014 }, // 1.98 cm on the diagonal
    ];
    for (const by of inside) {
      shapeTo([moved(PLANT_AT, by)]);
      expect(last(), JSON.stringify(by)).toMatchObject({
        gesture: 'none',
        target: PLANT,
        cell: null,
        dy: null,
      });
    }
    expect(shown).toEqual([]);
    expect(hovers().every((hover) => hover.cell === null)).toBe(true);
  });

  it('the first sample outside it decides, by the larger part of the travel: up or down a pull, level a drag', () => {
    const outside: [Partial<Vec3>, HeldGesture][] = [
      [{ y: 0.0201 }, 'pull'],
      [{ y: -0.0201 }, 'pull'],
      [{ x: 0.0201 }, 'drag'],
      [{ z: -0.0201 }, 'drag'],
      [{ x: 0.0142, y: 0.0145 }, 'pull'], // 2.03 cm on the diagonal, a little more up than along
      [{ x: 0.0145, y: 0.0142 }, 'drag'],
      // The level part is both level axes together: 1.2 cm each is 1.7 cm, more than the 1.65 cm of rise.
      [{ x: 0.012, y: 0.0165, z: 0.012 }, 'drag'],
    ];
    for (const [by, gesture] of outside) {
      shapeTo([moved(PLANT_AT, by)]);
      expect(last(), JSON.stringify(by)).toMatchObject({ gesture, target: PLANT });
    }
  });

  it('only a plant is pulled or dragged: a pinch on nothing that travels is still the none it was', () => {
    const { step } = rig();
    step({ at: NOWHERE });
    step({ select: true, pinch: true }); // on nothing: held on select (the wake pinch, the level-3 confirm)
    step({ at: moved(NOWHERE, { y: 0.1 }) });
    step({ at: moved(NOWHERE, { x: 0.1, y: 0.1 }) });
    step({ select: false, pinch: false });
    expect(last()).toMatchObject({ gesture: 'none', target: null, cell: null, dy: null });
    expect(shown).toEqual([]);
  });

  it('a tie is a pull, the gesture that cannot remove a plant', () => {
    expect(exact({ x: STEP, y: STEP })).toMatchObject({ gesture: 'pull', target: EXACT, dy: STEP });
    expect(exact({ x: STEP, y: -STEP })).toMatchObject({ gesture: 'pull', dy: -STEP });
    expect(exact({ x: STEP, y: LESS })).toMatchObject({ gesture: 'drag', dy: null });
  });

  it('a bed that is not level: the pull is measured along its own up, and the tie rule still holds', () => {
    // A restored anchor can give such a pose. A quarter turn about z keeps the numbers exact: this bed's up is
    // the world's +x, so rising in the world is level travel for it.
    const QUARTER = [0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
    expect(exact({ x: STEP }, QUARTER)).toMatchObject({ gesture: 'pull', dy: STEP });
    expect(exact({ y: STEP }, QUARTER)).toMatchObject({ gesture: 'drag', dy: null });
    expect(exact({ x: STEP, y: STEP }, QUARTER)).toMatchObject({ gesture: 'pull', dy: STEP }); // the tie
    expect(exact({ x: LESS, y: STEP }, QUARTER)).toMatchObject({ gesture: 'drag' });
    // And one a table could have: tipped 10 degrees toward the user, 5 cm straight up is 4.92 cm along its up.
    const [c, s] = [Math.cos(Math.PI / 18), Math.sin(Math.PI / 18)];
    const TIPPED = [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0.74, -0.45, 1];
    expect(exact({ y: 0.05 }, TIPPED)).toMatchObject({ gesture: 'pull', dy: near(0.05 * c) });
  });

  it('the choice is latched until the release: a pull never becomes a drag, nor a drag a pull', () => {
    const rise = moved(PLANT_AT, { y: 0.03 });
    const pulled = shapeTo([rise, moved(PLANT_AT, { x: 0.05, y: 0.03 })]); // drifts over the next ring
    expect(last()).toMatchObject({ gesture: 'pull', zone: 'bed', cell: null, dy: near(0.03) });
    expect(pulled.garden.asked).toEqual([]); // a pull never asks for a cell: it cannot move the plant
    shapeTo([rise, { ...OFF_BED, y: 0.79 }]); // and drifts off the bed: still no removal
    expect(last()).toMatchObject({ gesture: 'pull', zone: 'outer', cell: null });

    shapeTo([ALONG_5CM, moved(ALONG_5CM, { y: 0.1 })]); // a drag that rises 10 cm
    expect(last()).toMatchObject({ gesture: 'drag', zone: 'bed', cell: { ring: 3, step: 0 }, dy: null });
  });

  it('a pull is previewed once per tracked sample from the one that decided, and commits on the release only', () => {
    const r = rig();
    r.step({ at: PLANT_AT });
    r.step({ pinch: true });
    r.step({ at: moved(PLANT_AT, { y: 0.01 }) });
    expect(shown).toEqual([]);
    r.step({ at: moved(PLANT_AT, { y: 0.03 }) }); // the sample that decides
    r.step({ at: UP_5CM });
    r.step(); // a hand at rest: still one per sample
    r.step({ tracked: false }); // frozen: none
    r.step({ tracked: true });
    const pull = (dy: number) => ({
      type: 'gesture:pull',
      hand: 'right',
      target: PLANT,
      dy: near(dy),
    });
    expect(shown).toEqual([pull(0.03), pull(0.05), pull(0.05), pull(0.05)]);
    expect(types()).toEqual(['gesture:pinchStart']); // previews only (FR-HND-16)
    r.step({ pinch: false });
    expect(shown).toHaveLength(4); // the sample of the release is the release
    expect(last()).toEqual({
      type: 'gesture:release',
      hand: 'right',
      gesture: 'pull',
      target: PLANT,
      pos: UP_5CM,
      zone: 'bed',
      cell: null, // always: a pull never moves a plant
      dy: near(0.05), // the travel since the pinch began, never null
    });
    shapeTo([moved(PLANT_AT, { y: -0.05 })]);
    expect(last()).toMatchObject({ gesture: 'pull', dy: near(-0.05) });
  });

  it('a drag is previewed the same way, with where the hand is and the zone it is over', () => {
    const r = rig();
    r.step({ at: PLANT_AT });
    r.step({ pinch: true });
    for (const at of [ALONG_5CM, OFF_BED, IN_HOLE]) r.step({ at });
    const drag = (pos: Vec3, zone: string) => ({
      type: 'gesture:drag',
      hand: 'right',
      target: PLANT,
      pos,
      zone,
    });
    expect(shown).toEqual([drag(ALONG_5CM, 'bed'), drag(OFF_BED, 'outer'), drag(IN_HOLE, 'inner')]);
    expect(types()).toEqual(['gesture:pinchStart']);
  });

  it('reuses its preview payloads, as it does the others', () => {
    const kept: unknown[] = [];
    const off = SHOWN.map((type) => bus.on(type, (payload) => kept.push(payload)));
    shapeTo([UP_5CM, UP_5CM]);
    shapeTo([ALONG_5CM, ALONG_5CM]);
    off.forEach((stop) => stop());
    expect(kept).toHaveLength(4);
    expect(kept[0]).toBe(kept[1]);
    expect(kept[2]).toBe(kept[3]);
  });

  it('a drag released over the bed, beyond it and in the hole: the three zones at their boundaries', () => {
    shapeTo([ALONG_5CM]);
    expect(last()).toEqual({
      type: 'gesture:release',
      hand: 'right',
      gesture: 'drag',
      target: PLANT,
      pos: ALONG_5CM,
      zone: 'bed',
      cell: { ring: 3, step: 0 },
      dy: null,
    });
    // Metres from the bed centre, to the right: the bed zone is 0.09 to 0.35 m (FR-HND-10/11).
    const edges: [number, string, Cell | null][] = [
      [0.349, 'bed', { ring: 4, step: 0 }],
      [0.351, 'outer', null], // removed by garden
      [0.091, 'bed', { ring: 0, step: 0 }],
      [0.089, 'inner', null], // nothing: the plant stays where it was
    ];
    for (const [radius, zone, cell] of edges) {
      shapeTo([{ x: radius, y: 0.76, z: -0.45 }]);
      expect(last(), String(radius)).toMatchObject({ gesture: 'drag', target: PLANT, zone, cell });
    }
  });

  it('a dragged plant hovers the cell a release would fill, and its own cell counts as free', () => {
    const r = rig();
    r.step({ at: PLANT_AT });
    r.step({ pinch: true });
    expect(lastHover()).toMatchObject({ target: PLANT, cell: null });
    r.step({ at: ALONG_5CM });
    expect(lastHover()).toEqual({
      name: 'target:hover',
      hand: 'right',
      target: null,
      cell: { ring: 3, step: 0 },
    });
    r.step({ at: moved(PLANT_AT, { x: 0.021 }) }); // back over the cell it stands on
    expect(lastHover()).toMatchObject({ target: null, cell: SNAPPED });
    expect(r.garden.ignored).toEqual([PLANT.id, PLANT.id]); // garden is told whose cell to leave out
    r.garden.free = { ring: 1, step: 0 }; // the other hand planted there meanwhile
    r.step();
    expect(lastHover()).toMatchObject({ cell: { ring: 1, step: 0 } });
    r.step({ pinch: false });
    expect(last()).toMatchObject({ gesture: 'drag', zone: 'bed', cell: { ring: 1, step: 0 } });
    expect(lastHover()).toMatchObject({ cell: { ring: 1, step: 0 } }); // the release commits what was shown
  });

  it('a carried seed leaves no cell out', () => {
    const r = rig();
    r.step({ at: SEED_AT });
    r.step({ select: true });
    r.step({ at: ON_BED });
    expect(r.garden.ignored).toEqual([undefined]);
  });

  it('a drag over a bed with no free cell, or with no bed, has no cell: nothing can commit', () => {
    const full = rig();
    full.garden.free = null; // the dragged plant was taken out by something else and its cell filled
    shapeTo([ALONG_5CM], full);
    expect(last()).toMatchObject({ gesture: 'drag', target: PLANT, zone: 'bed', cell: null });

    const noBed = rig();
    noBed.context.bedPose = null;
    shapeTo([ALONG_5CM], noBed);
    expect(last()).toMatchObject({ gesture: 'drag', zone: 'inner', cell: null });
    expect(noBed.garden.asked).toEqual([]);
    shapeTo([UP_5CM], noBed); // with no bed a pull is measured against the world's up
    expect(last()).toMatchObject({ gesture: 'pull', zone: 'inner', dy: near(0.05) });
  });

  it('between two cells the cue of a dragged plant does not flicker, and the release commits the hovered one', () => {
    const r = rig();
    r.step({ at: PLANT_AT });
    r.step({ pinch: true });
    r.step({ at: onRing2(BORDER_RAD - arc(0.003)) }); // 3.9 cm along the ring: a drag, on the side of step 0
    expect(lastHover()).toMatchObject({ cell: { ring: 2, step: 0 } });
    const before = hovers().length;
    for (let i = 0; i < 50; i++) r.step({ at: onRing2(BORDER_RAD + (i % 2 ? -1 : 1) * arc(0.001)) }); // jitter
    expect(hovers()).toHaveLength(before);
    const past = onRing2(BORDER_RAD + arc(0.001)); // a fresh snap here is step 1
    r.step({ at: past });
    r.step({ pinch: false });
    expect(last()).toMatchObject({ gesture: 'drag', zone: 'bed', cell: { ring: 2, step: 0 }, pos: past });

    r.step({ at: PLANT_AT });
    r.step({ pinch: true });
    r.step({ at: onRing2(BORDER_RAD - arc(0.003)) });
    r.step({ at: onRing2(BORDER_RAD + arc(0.004)) }); // 4 mm past: its centre is 8 mm nearer than step 0's
    expect(lastHover()).toMatchObject({ cell: { ring: 2, step: 1 } });
    r.step({ at: onRing2(BORDER_RAD), pinch: false }); // back on the border: the memory is now step 1
    expect(last()).toMatchObject({ gesture: 'drag', cell: { ring: 2, step: 1 } });
  });

  it('a pinched or pulled plant stays the hover however far the hand goes, and whatever comes nearer', () => {
    const { step } = rig();
    step({ at: PLANT_AT });
    step({ pinch: true });
    step({ at: moved(PLANT_AT, { y: 0.2 }) }); // 20 cm up: far outside its 4.5 cm
    step({ at: ORB_AT }); // and then right onto another target
    expect(hovers()).toEqual([{ name: 'target:hover', hand: 'right', target: PLANT, cell: null }]);
    step({ pinch: false });
    expect(last()).toMatchObject({ gesture: 'pull', target: PLANT });
    step(); // the hand is empty again: now it hovers what a pinch would act on
    expect(lastHover()).toMatchObject({ target: ORB, cell: null });
  });

  // The sample on which the pinch opens is not measured (T-146 review): what commits is what was shown.
  it('a pinch that leaves the dead zone only on the sample where it opens is released as none', () => {
    // A plant on ring 4, at 0.30 m: 7 cm further out is the zone that removes.
    const r = rig();
    const ring4: Vec3 = { x: 0.3, y: 0.76, z: -0.45 };
    r.candidates.push({ target: { kind: 'plant', id: 'rim' }, radius: 0.04, pos: ring4 });
    r.step({ at: ring4 });
    r.step({ pinch: true });
    r.step({ tracked: false }); // lost under the grace, and back 7 cm out with the fingers open
    r.step({ tracked: true, pinch: false, at: moved(ring4, { x: 0.07 }), afterMs: 100 });
    expect(last()).toMatchObject({ gesture: 'none', target: { kind: 'plant', id: 'rim' }, zone: 'outer' });
    expect(last()).toMatchObject({ cell: null, dy: null });
    expect(hovers().every((hover) => hover.target?.id === 'rim')).toBe(true); // never a cleared cue
    // A tap whose opening throws the pinch point 3 cm up: no pull nobody made.
    r.step({ at: PLANT_AT });
    r.step({ pinch: true });
    r.step({ pinch: false, at: moved(PLANT_AT, { y: 0.03 }) });
    expect(last()).toMatchObject({ gesture: 'none', target: PLANT, dy: null });
    expect(shown).toEqual([]);
  });

  it('a pull commits the travel of its last preview, not where the opening hand went', () => {
    const r = rig();
    r.step({ at: PLANT_AT });
    r.step({ pinch: true });
    r.step({ at: moved(PLANT_AT, { y: 0.1 }) });
    expect(shown[shown.length - 1]).toMatchObject({ type: 'gesture:pull', dy: near(0.1) });
    r.step({ pinch: false, at: moved(PLANT_AT, { y: 0.115 }) });
    expect(last()).toMatchObject({ gesture: 'pull', target: PLANT, cell: null, dy: near(0.1) });
  });

  it('a drag commits the cell and zone hovered on the sample where it opens, as the hover showed', () => {
    const r = rig();
    r.step({ at: PLANT_AT });
    r.step({ pinch: true });
    r.step({ at: ALONG_5CM }); // ring 3
    r.step({ pinch: false, at: { x: 0.3, y: 0.76, z: -0.45 } }); // ring 4 on the sample it opens
    expect(lastHover()).toMatchObject({ target: null, cell: { ring: 4, step: 0 } });
    expect(last()).toMatchObject({ gesture: 'drag', zone: 'bed', cell: { ring: 4, step: 0 }, dy: null });
  });

  it('the session ends mid-drag: reverted once, the hover cleared, no release, and the next session is clean', () => {
    const { step, machine } = rig();
    step({ at: PLANT_AT });
    step({ pinch: true });
    step({ at: ALONG_5CM });
    heard.length = 0;
    shown.length = 0;
    machine.reset();
    expect(heard).toEqual([
      { name: 'gesture:trackingLost', hand: 'right' },
      { name: 'target:hover', hand: 'right', target: null, cell: null },
    ]);
    step({ pinch: false, at: NOWHERE }); // the next session: the hand is open and somewhere else
    step({ at: PLANT_AT });
    step({ pinch: true });
    step({ at: moved(PLANT_AT, { y: 0.019 }) }); // measured from this pinch, not from the old one
    step({ pinch: false });
    expect(shown).toEqual([]);
    expect(types()).toEqual(['gesture:pinchStart', 'gesture:pinchStart', 'gesture:release']);
    expect(last()).toMatchObject({ gesture: 'none', target: PLANT });
  });
});

describe('GestureMachine: tracking loss (TC-HND-07, FR-HND-15)', () => {
  // Each held state the machine has: where the pinch starts, the signal it rides on, where the hand goes next
  // (a pull and a drag need the travel that decides them), and what its release is.
  const HELD: readonly {
    name: string;
    at: Vec3;
    signal: 'select' | 'pinch';
    then?: Vec3;
    held: TargetRef | null;
    gesture: HeldGesture;
  }[] = [
    { name: 'CARRYING', at: SEED_AT, signal: 'select', held: SEED, gesture: 'carry' },
    { name: 'PINCHED (a plant)', at: PLANT_AT, signal: 'pinch', held: PLANT, gesture: 'none' },
    { name: 'PULLING', at: PLANT_AT, signal: 'pinch', then: UP_5CM, held: PLANT, gesture: 'pull' },
    { name: 'DRAGGING', at: PLANT_AT, signal: 'pinch', then: ALONG_5CM, held: PLANT, gesture: 'drag' },
    { name: 'PRESSED', at: ORB_AT, signal: 'select', held: ORB, gesture: 'press' },
    { name: 'PINCHED (nothing)', at: NOWHERE, signal: 'select', held: null, gesture: 'none' },
  ];

  for (const { name, at, signal, then, held, gesture } of HELD) {
    it(`${name}: lost for 199 ms the gesture goes on; hands:lost at once and hands:found, once each`, () => {
      const { step } = rig();
      step({ at });
      step({ [signal]: true });
      if (then) step({ at: then });
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
      if (then) step({ at: then });
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
      step({ [signal]: true, at }); // idle again: a new closing, where the first one was, is a new pinch
      expect(types()).toEqual(['gesture:pinchStart', 'gesture:pinchStart']);
    });
  }

  it('a held plant is frozen while its hand is away, and goes on with its latched choice from the new sample', () => {
    const pull = rig();
    pull.step({ at: PLANT_AT });
    pull.step({ pinch: true });
    pull.step({ at: UP_5CM });
    for (let i = 0; i < 10; i++) pull.step({ tracked: false }); // 140 ms
    expect(shown).toHaveLength(1); // no preview while it is away
    pull.step({ tracked: true, at: moved(PLANT_AT, { x: 0.1, y: 0.08 }) }); // back, further up and well aside
    expect(shown[1]).toMatchObject({ type: 'gesture:pull', dy: near(0.08) });
    pull.step({ pinch: false });
    expect(last()).toMatchObject({ gesture: 'pull', cell: null, dy: near(0.08) });

    const drag = rig();
    drag.step({ at: PLANT_AT });
    drag.step({ pinch: true });
    drag.step({ at: ALONG_5CM });
    const before = hovers().length;
    drag.garden.free = { ring: 4, step: 0 }; // the hovered cell fills while the hand is away: not looked at
    for (let i = 0; i < 10; i++) drag.step({ tracked: false });
    expect(hovers()).toHaveLength(before);
    drag.step({ tracked: true }); // back: garden is asked again
    expect(lastHover()).toMatchObject({ target: null, cell: { ring: 4, step: 0 } });
    drag.step({ pinch: false });
    expect(last()).toMatchObject({ gesture: 'drag', zone: 'bed', cell: { ring: 4, step: 0 } });
  });

  it('a pinch that left the dead zone while the hand was away is decided at the first sample it is back', () => {
    const { step } = rig();
    step({ at: PLANT_AT });
    step({ pinch: true });
    step({ tracked: false });
    step({ tracked: true, at: ALONG_5CM, afterMs: 100 });
    expect(shown).toMatchObject([{ type: 'gesture:drag', zone: 'bed' }]);
    expect(lastHover()).toMatchObject({ target: null, cell: { ring: 3, step: 0 } });
  });

  it('a drag whose grace runs out: its hover is cleared after gesture:trackingLost, and its previews stop', () => {
    const { step } = rig();
    step({ at: PLANT_AT });
    step({ pinch: true });
    step({ at: ALONG_5CM });
    step({ tracked: false });
    step({ afterMs: TRACKING_GRACE_MS });
    expect(heard.slice(-2)).toEqual([
      { name: 'gesture:trackingLost', hand: 'right' },
      { name: 'target:hover', hand: 'right', target: null, cell: null },
    ]);
    step({ tracked: true, at: OFF_BED }); // back, the pinch still closed, over the zone that removes
    step({ pinch: false });
    expect(shown).toHaveLength(1);
    expect(types()).toEqual(['gesture:pinchStart']); // no release: the plant ends where it was (NFR-REL-02)
  });

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

  it('a pinched plant hovers no cell before it is dragged: inside the dead zone it is its own hover', () => {
    const { step } = rig();
    step({ at: PLANT_AT });
    step({ pinch: true });
    step({ at: moved(PLANT_AT, { x: 0.019 }) });
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

  it('asks for a seed 400 ms after an idle hand turned its palm up, and again every 400 ms while it stays up', () => {
    const { step } = rig('left');
    const turnedAt = step({ at: NOWHERE, palmUp: true });
    const times = palmUpTimes(step, 2000);
    expect(times.length).toBeGreaterThanOrEqual(4); // T-127: the garden ignores the repeats it cannot serve
    expect(times[0]! - turnedAt).toBeGreaterThanOrEqual(PALM_UP_HOLD_MS);
    expect(times[0]! - turnedAt).toBeLessThan(PALM_UP_HOLD_MS + FRAME_MS);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(PALM_UP_HOLD_MS);
      expect(times[i]! - times[i - 1]!).toBeLessThan(PALM_UP_HOLD_MS + FRAME_MS);
    }
    expect(new Set(seen.map((event) => JSON.stringify(event)))).toEqual(
      new Set([JSON.stringify({ type: 'gesture:palmUp', hand: 'left' })]),
    );
  });

  it('does not ask while the hand carries a seed, and asks again 400 ms after it is idle', () => {
    const { step } = rig();
    step({ at: SEED_AT, palmUp: true });
    step({ select: true });
    expect(palmUpTimes(step, 1000)).toEqual([]); // palm up all along, but busy
    const idleAt = step({ select: false });
    const times = palmUpTimes(step, 2000);
    expect(times.length).toBeGreaterThanOrEqual(1); // the pointer's next seed (LLD §11)
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
    expect(times.length).toBeGreaterThanOrEqual(1);
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
  // The paths of T-146 (the dead zone, a pull, a drag, their previews) are measured in
  // GestureMachine.heap.test.ts: in this file they cannot be, and that file says why.
});
