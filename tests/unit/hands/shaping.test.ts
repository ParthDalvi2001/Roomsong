// TC-HND-06 (FR-HND-10/11, FR-MUS-12) and the joins of T-146: what the garden does with what the machines send.
// The real GestureMachine for each hand, the real GardenSystem on a clock the test moves, garden's own
// nearestFreeCell and cell centres. HandFrame sequences go in, the garden's state comes out. No XR and no ECS:
// the targets are built here the way the wiring builds them (API_SPEC §1.10 rule 7), one per plant at its cell
// centre and one `undo` target per removed plant, 3 cm above that plant's own cell (UX §9.3).
// GardenSystem has no way to unsubscribe, so every handler is taken off the bus again after each test.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bus, createClock, flags } from '../../../src/core/index.js';
import { cellCentre, GardenSystem, heightAfterPull, nearestFreeCell } from '../../../src/garden/index.js';
import { TRACKING_GRACE_MS } from '../../../src/hands/config.js';
import { GestureMachine } from '../../../src/hands/GestureMachine.js';
import { createHandFrame } from '../../../src/hands/InputSource.js';
import { fullBedExcept, garden, plant } from '../garden/fixtures.js';

import type { EventMap, Hand, Vec3 } from '../../../src/core/index.js';
import type { Cell, GardenState, Plant } from '../../../src/garden/index.js';
import type { GestureContext } from '../../../src/hands/GestureMachine.js';
import type { PickCandidate } from '../../../src/hands/TargetPicker.js';
import type { MockInstance } from 'vitest';

const FRAME_MS = 14;
const T0 = 1_790_000_000_000; // the garden's clock: wall time, not the machines' frame time
// The bed lies flat with its centre 0.45 m ahead at table height (column-major, no rotation).
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
const PETAL_LIFT_M = 0.03; // UX §9.3

/** The world point `radiusM` from the bed centre toward `step`, `upM` above the bed. */
function onBed(radiusM: number, step: number, upM = 0): Vec3 {
  const rad = (step * Math.PI) / 8;
  return { x: radiusM * Math.cos(rad), y: 0.74 + upM, z: -0.45 + radiusM * Math.sin(rad) };
}
/** The world point of a cell's centre, `upM` above the bed. */
function over(cell: Cell, upM = 0): Vec3 {
  const centre = cellCentre(cell, { x: 0, y: 0 });
  return { x: centre.x, y: 0.74 + upM, z: -0.45 + centre.y };
}
const cell = (ring: number, step: number): Cell => ({ ring, step });

let subscribed: MockInstance<typeof bus.on>;
beforeEach(() => {
  subscribed = vi.spyOn(bus, 'on');
});
afterEach(() => {
  for (const subscription of subscribed.mock.results) (subscription.value as () => void)();
  vi.restoreAllMocks();
});

/** A garden of `plants` with both hands over it. */
function rig(plants: Plant[]) {
  const time = { now: T0 };
  const system = new GardenSystem(
    createClock(() => time.now),
    { ...flags },
  );
  let state: GardenState = garden(plants);
  const candidates: PickCandidate[] = [];
  const changes: EventMap['garden:changed']['diff'][] = [];
  const removals: EventMap['garden:removed'][] = [];
  const releases: EventMap['gesture:release'][] = [];
  const reverts: Hand[] = [];
  const hovered: Record<Hand, Cell | null> = { left: null, right: null };
  // Subscribed after the holder, as every system is: its handlers run first (API_SPEC §1.10).
  bus.on('garden:changed', (event) => {
    state = event.state;
    changes.push(event.diff);
    // The plants' targets, as BedRenderSystem keeps them: one per plant, at its cell centre.
    for (let i = candidates.length - 1; i >= 0; i--) {
      const { kind, id } = candidates[i]!.target;
      if (kind === 'plant' || event.diff.added.includes(id)) candidates.splice(i, 1);
    }
    for (const each of state.plants) {
      candidates.push({ target: { kind: 'plant', id: each.id }, radius: 0.04, pos: over(each.cell) });
    }
  });
  bus.on('garden:removed', (event) => {
    removals.push(event);
    // The petal's target: over the removed plant's own cell, until the undo.
    const pos = over(event.undoToken.plant.cell, PETAL_LIFT_M);
    candidates.push({ target: { kind: 'undo', id: event.plantId }, radius: 0.04, pos });
  });
  bus.on('gesture:release', (event) => releases.push(structuredClone(event)));
  bus.on('gesture:trackingLost', (event) => reverts.push(event.hand));
  bus.on('target:hover', (event) => {
    hovered[event.hand] = event.cell;
  });
  system.load(state);
  changes.length = 0;

  const context: GestureContext = {
    candidates,
    bedPose: BED,
    oneHand: false,
    nearestFreeCell: (wanted, ignorePlantId) => nearestFreeCell(state, wanted, ignorePlantId),
  };
  const hands = (['left', 'right'] as const).map((hand) => {
    const frame = createHandFrame(hand);
    frame.tracked = true;
    frame.palmNormal.y = -1;
    Object.assign(frame.pinchPos, { x: hand === 'left' ? -0.5 : 0.5, y: 1.2, z: -0.2 });
    return { frame, machine: new GestureMachine(hand) };
  });
  let timeMs = 0;
  /** One sample of that hand, `afterMs` after the last sample of either (14 ms if not given). */
  const step = (
    hand: Hand,
    change: { at?: Vec3; pinch?: boolean; select?: boolean; tracked?: boolean; afterMs?: number } = {},
  ): void => {
    const { frame, machine } = hands[hand === 'left' ? 0 : 1]!;
    if (change.at) Object.assign(frame.pinchPos, change.at);
    if (change.pinch !== undefined) frame.pinch = change.pinch;
    if (change.select !== undefined) frame.select = change.select;
    if (change.tracked !== undefined) frame.tracked = change.tracked;
    timeMs += change.afterMs ?? FRAME_MS;
    machine.update(frame, timeMs, context);
  };
  /** That hand pinches the plant where it stands. */
  const grab = (hand: Hand, id: string): void => {
    const held = state.plants.find((each) => each.id === id);
    if (held === undefined) throw new Error(`no plant ${id}`);
    step(hand, { at: over(held.cell) });
    step(hand, { pinch: true });
  };
  /** That hand pinches the plant, moves to each point in turn and lets go at the last one. */
  const shape = (hand: Hand, id: string, points: Vec3[]): void => {
    grab(hand, id);
    for (const at of points) step(hand, { at });
    step(hand, { pinch: false });
  };
  /** That hand pinches the petal of a removed plant and lets go on it (a `press`). */
  const pressPetal = (hand: Hand, removed: Plant): void => {
    step(hand, { at: over(removed.cell, PETAL_LIFT_M) });
    step(hand, { select: true });
    step(hand, { select: false });
  };
  return {
    time,
    system,
    hands,
    changes,
    removals,
    releases,
    reverts,
    hovered,
    step,
    grab,
    shape,
    pressPetal,
    state: () => state,
    plantNow: (id: string) => state.plants.find((each) => each.id === id),
  };
}

describe('a drag and the garden (TC-HND-06, FR-HND-10/11)', () => {
  it('released more than 0.35 m from the bed centre: the plant is removed, with an undo token good for 5 s', () => {
    const a = plant('a', 2, 0);
    const r = rig([a, plant('b', 1, 5)]);
    r.shape('right', 'a', [onBed(0.36, 0)]);
    expect(r.releases).toMatchObject([
      { gesture: 'drag', target: { kind: 'plant', id: 'a' }, zone: 'outer' },
    ]);
    expect(r.state().plants.map((each) => each.id)).toEqual(['b']);
    expect(r.changes).toEqual([{ added: [], removed: ['a'], changed: [] }]);
    expect(r.removals).toEqual([{ plantId: 'a', undoToken: { plant: a }, expiresAt: T0 + 5000 }]);
  });

  it('released at 0.35 m or less it moves to the hovered free cell instead, and its old cell is free', () => {
    const r = rig([plant('a', 2, 0)]);
    r.shape('right', 'a', [onBed(0.349, 0)]);
    expect(r.plantNow('a')?.cell).toEqual(cell(4, 0));
    expect(r.changes).toEqual([{ added: [], removed: [], changed: ['a'] }]);
    expect(r.removals).toEqual([]);
    expect(nearestFreeCell(r.state(), cell(2, 0))).toEqual(cell(2, 0));
  });

  it('released over a taken cell it goes to the free cell that was shown, not onto the other plant', () => {
    const r = rig([plant('a', 2, 0), plant('b', 4, 0)]);
    r.grab('right', 'a');
    r.step('right', { at: over(cell(4, 0)) });
    expect(r.hovered.right).toEqual(cell(3, 0)); // the ring below: the cue before the commit (FR-HND-16)
    r.step('right', { pinch: false });
    expect(r.plantNow('a')?.cell).toEqual(cell(3, 0));
    expect(r.plantNow('b')?.cell).toEqual(cell(4, 0));
  });

  it('released in the hole (under 0.09 m) it stays in its cell: nothing changes', () => {
    const r = rig([plant('a', 2, 0)]);
    const before = r.state();
    r.shape('right', 'a', [onBed(0.089, 0)]);
    expect(r.releases).toMatchObject([{ gesture: 'drag', zone: 'inner', cell: null }]);
    expect(r.state()).toBe(before);
    expect(r.changes).toEqual([]);
  });

  it("its own cell counts as free: put back where it stands it stays, and a neighbour's cell is not taken", () => {
    const r = rig([plant('a', 2, 0), plant('b', 2, 1)]);
    const before = r.state();
    r.grab('right', 'a');
    r.step('right', { at: over(cell(3, 0)) });
    r.step('right', { at: onBed(0.215, 0) }); // back over the cell it stands on
    expect(r.hovered.right).toEqual(cell(2, 0));
    r.step('right', { pinch: false });
    expect(r.state()).toBe(before);

    r.shape('right', 'a', [over(cell(2, 1))]); // onto its neighbour
    expect(r.plantNow('a')?.cell).toEqual(cell(3, 1));
    expect(r.plantNow('b')?.cell).toEqual(cell(2, 1));
  });

  it('on a full bed a dragged plant can only go back where it stands, or off the bed', () => {
    const r = rig(fullBedExcept());
    const before = r.state();
    r.grab('right', 'p32'); // ring 2, step 0
    r.step('right', { at: over(cell(4, 9)) }); // the far side of the bed
    expect(r.hovered.right).toEqual(cell(2, 0)); // the one free cell there is: its own
    r.step('right', { pinch: false });
    expect(r.state()).toBe(before);
    expect(r.changes).toEqual([]);

    r.shape('right', 'p32', [onBed(0.36, 0)]);
    expect(r.state().plants).toHaveLength(79);
    expect(r.removals).toMatchObject([{ plantId: 'p32' }]);
  });
});

describe('the undo (TC-HND-06, FR-MUS-12)', () => {
  it.each([
    [4999, true],
    [5000, true],
    [5001, false],
  ])('a press on the petal %i ms after the removal: the plant is back in its own cell = %s', (ms, back) => {
    const a = plant('a', 2, 0, { height: 0.8 });
    const r = rig([a, plant('b', 2, 1)]);
    r.shape('right', 'a', [onBed(0.36, 0)]);
    r.time.now = T0 + ms;
    r.pressPetal('left', a); // either hand
    expect(r.releases[1]).toMatchObject({ gesture: 'press', target: { kind: 'undo', id: 'a' } });
    expect(r.plantNow('a')).toEqual(back ? a : undefined);
    expect(r.changes.slice(1)).toEqual(back ? [{ added: ['a'], removed: [], changed: [] }] : []);
  });

  it('several plants removed, each with its own petal: either can come back, in any order', () => {
    const [a, b] = [plant('a', 2, 0), plant('b', 3, 4)];
    const r = rig([a, b]);
    r.shape('right', 'a', [onBed(0.36, 0)]);
    r.shape('right', 'b', [onBed(0.36, 4)]);
    expect(r.state().plants).toEqual([]);
    r.pressPetal('left', b);
    r.pressPetal('right', a);
    expect(r.plantNow('a')).toEqual(a);
    expect(r.plantNow('b')).toEqual(b);
  });
});

describe('a pull and the garden (FR-HND-08)', () => {
  it('sets the height the travel gives over 25 cm, and never moves the plant', () => {
    const r = rig([plant('a', 2, 0, { height: 0.5 })]);
    r.shape('right', 'a', [over(cell(2, 0), 0.05)]);
    expect(r.plantNow('a')?.height).toBeCloseTo(heightAfterPull(0.5, 0.05)); // 0.7
    expect(r.plantNow('a')?.cell).toEqual(cell(2, 0));
    expect(r.changes).toEqual([{ added: [], removed: [], changed: ['a'] }]);

    r.shape('right', 'a', [over(cell(2, 0), -0.03), over(cell(4, 3), -0.1), onBed(0.4, 3, -0.1)]);
    expect(r.releases[1]).toMatchObject({ gesture: 'pull', zone: 'outer', cell: null });
    expect(r.plantNow('a')?.height).toBeCloseTo(0.3); // 10 cm down from 0.7
    expect(r.plantNow('a')?.cell).toEqual(cell(2, 0)); // pulled over other cells and off the bed: still there
    expect(r.removals).toEqual([]);
  });
});

describe('two hands, and what else can happen to a held plant', () => {
  it('both hands shape two plants at once: one pulls, one drags, and each release commits its own', () => {
    const r = rig([plant('a', 2, 0, { height: 0.5 }), plant('b', 2, 8)]);
    r.grab('left', 'b');
    r.grab('right', 'a');
    r.step('left', { at: over(cell(4, 8)) });
    r.step('right', { at: over(cell(2, 0), 0.05) });
    r.step('left', { at: over(cell(4, 9)) });
    expect(r.changes).toEqual([]); // previews only, on both hands
    r.step('right', { pinch: false });
    r.step('left', { pinch: false });
    expect(r.releases).toMatchObject([
      { hand: 'right', gesture: 'pull', target: { id: 'a' }, cell: null },
      { hand: 'left', gesture: 'drag', target: { id: 'b' }, cell: cell(4, 9), dy: null },
    ]);
    expect(r.plantNow('a')).toMatchObject({ cell: cell(2, 0), height: expect.closeTo(0.7) as number });
    expect(r.plantNow('b')?.cell).toEqual(cell(4, 9));
  });

  it('both drag to the same free cell: the first release takes it, the second is shown the next one first', () => {
    const r = rig([plant('a', 2, 0), plant('b', 2, 8)]);
    r.grab('left', 'b');
    r.grab('right', 'a');
    r.step('left', { at: over(cell(4, 4)) });
    r.step('right', { at: over(cell(4, 4)) });
    expect(r.hovered).toEqual({ left: cell(4, 4), right: cell(4, 4) });
    r.step('left', { pinch: false });
    r.step('right'); // the hand did not move: the cue did
    expect(r.hovered.right).toEqual(cell(3, 4));
    r.step('right', { pinch: false });
    expect(r.plantNow('b')?.cell).toEqual(cell(4, 4));
    expect(r.plantNow('a')?.cell).toEqual(cell(3, 4));
  });

  it('a plant removed by the other hand while this one holds it: its release names it, and the garden refuses', () => {
    const r = rig([plant('a', 2, 0), plant('b', 3, 4)]);
    r.grab('left', 'a');
    r.shape('right', 'a', [onBed(0.36, 0)]); // both pinched it; the right hand takes it off the bed
    const after = r.state();
    r.step('left', { at: over(cell(4, 12)) });
    expect(r.hovered.left).toEqual(cell(4, 12));
    r.step('left', { pinch: false });
    expect(r.releases[1]).toMatchObject({
      gesture: 'drag',
      target: { id: 'a' },
      zone: 'bed',
      cell: cell(4, 12),
    });
    expect(r.state()).toBe(after); // no such plant: nothing moved, nothing came back
    expect(r.changes).toHaveLength(1);
  });

  it('New garden while a plant is pulled and another dragged: both releases find no plant and change nothing', () => {
    const r = rig([plant('a', 2, 0), plant('b', 3, 4)]);
    r.grab('left', 'a');
    r.grab('right', 'b');
    r.step('left', { at: over(cell(2, 0), 0.05) });
    r.step('right', { at: onBed(0.36, 4) });
    r.system.newGarden();
    const fresh = r.state();
    r.step('left', { pinch: false });
    r.step('right', { pinch: false });
    expect(r.releases.map((release) => release.gesture)).toEqual(['pull', 'drag']);
    expect(r.state()).toBe(fresh);
    expect(r.removals).toEqual([]);
  });
});

describe('tracking loss while shaping (TC-HND-07, the hands part of TC-E2E-16; NFR-REL-02)', () => {
  it('a hand lost mid-drag past the grace: gesture:trackingLost, no release, and the plant is where it was', () => {
    const r = rig([plant('a', 2, 0)]);
    const before = r.state();
    r.grab('right', 'a');
    r.step('right', { at: onBed(0.36, 0) }); // over the zone that removes
    r.step('right', { tracked: false });
    r.step('right', { afterMs: TRACKING_GRACE_MS });
    expect(r.reverts).toEqual(['right']);
    r.step('right', { tracked: true });
    r.step('right', { pinch: false }); // the hand comes back and opens: that is no release
    expect(r.releases).toEqual([]);
    expect(r.state()).toBe(before);
    expect(r.changes).toEqual([]);
    r.shape('right', 'a', [over(cell(3, 0))]); // and a new pinch works
    expect(r.plantNow('a')?.cell).toEqual(cell(3, 0));
  });

  it('a hand lost mid-pull past the grace: the plant keeps the height it had', () => {
    const r = rig([plant('a', 2, 0, { height: 0.5 })]);
    const before = r.state();
    r.grab('right', 'a');
    r.step('right', { at: over(cell(2, 0), 0.1) });
    r.step('right', { tracked: false });
    r.step('right', { afterMs: TRACKING_GRACE_MS });
    r.step('right', { tracked: true, pinch: false });
    expect(r.reverts).toEqual(['right']);
    expect(r.releases).toEqual([]);
    expect(r.state()).toBe(before);
  });

  it('back inside the grace, the drag goes on and commits on its release (TC-E2E-16, the second case)', () => {
    const r = rig([plant('a', 2, 0)]);
    r.grab('right', 'a');
    r.step('right', { at: over(cell(3, 0)) });
    r.step('right', { tracked: false });
    r.step('right', { tracked: true, at: over(cell(4, 1)), afterMs: 100 });
    expect(r.reverts).toEqual([]);
    r.step('right', { pinch: false });
    expect(r.plantNow('a')?.cell).toEqual(cell(4, 1));
  });

  it('the session ends mid-drag and mid-pull: both are reverted, and the garden is as it was', () => {
    const r = rig([plant('a', 2, 0), plant('b', 3, 4)]);
    const before = r.state();
    r.grab('left', 'a');
    r.grab('right', 'b');
    r.step('left', { at: over(cell(2, 0), 0.05) });
    r.step('right', { at: onBed(0.36, 4) });
    // What HandSystem does on xr:sessionEnd, and the event itself for the garden.
    for (const { machine } of r.hands) machine.reset();
    bus.emit('xr:sessionEnd', { visible: false });
    expect(r.reverts).toEqual(['left', 'right']);
    expect(r.releases).toEqual([]);
    expect(r.state()).toBe(before);
    expect(r.changes).toEqual([]);
  });
});
