// HandSystem (T-116, LLD §4): the order of one frame, the session events and the hand hint. Fake entities and a
// fake sampler: no XR session, no ECS world. What the real sampler does with joints is HandSampler.test.ts; what
// the emulator's hands do with the whole chain is tests/e2e/11-tracking-loss.spec.ts.
import { afterEach, describe, expect, it, vi } from 'vitest';

import manifest from '../../../src/components.js';
import { BedAnchor, Caption, Interactable } from '../../../src/core/components.js';
import { bus, clock } from '../../../src/core/index.js';
import { cellCentre } from '../../../src/garden/index.js';
import { HAND_HINT_KEY, HAND_HINT_MAX_MS, HIT_RADIUS_M } from '../../../src/hands/config.js';
import { GestureMachine } from '../../../src/hands/GestureMachine.js';
import { HandState } from '../../../src/hands/HandState.js';
import { HandSystem } from '../../../src/hands/HandSystem.js';
import { fullBedExcept, garden, plant } from '../garden/fixtures.js';

import { heapCost, PROBE_BYTES } from './heapCost.js';

import type { Hand, Vec3 } from '../../../src/core/index.js';
import type { Cell } from '../../../src/garden/index.js';
import type { GestureContext } from '../../../src/hands/GestureMachine.js';
import type { HandFrame } from '../../../src/hands/InputSource.js';

/** As much of an ECS entity as HandSystem uses. */
class FakeEntity {
  readonly data = new Map<unknown, Record<string, unknown>>();
  private readonly views = new Map<string, Float32Array>();
  object3D: { matrixWorld: { elements: number[] } } | undefined;

  addComponent(component: unknown, values: Record<string, unknown> = {}): this {
    this.data.set(component, { ...values });
    return this;
  }
  removeComponent(component: unknown): this {
    this.data.delete(component);
    return this;
  }
  hasComponent(component: unknown): boolean {
    return this.data.has(component);
  }
  getValue(component: unknown, key: string): unknown {
    return this.data.get(component)?.[key] ?? null;
  }
  setValue(component: unknown, key: string, value: unknown): void {
    this.data.get(component)![key] = value;
  }
  getVectorView(_component: unknown, key: string): Float32Array {
    let view = this.views.get(key);
    if (view === undefined) this.views.set(key, (view = new Float32Array(3)));
    return view;
  }
}

/** As much of an ECS query as HandSystem uses: the entities, and who is told when one comes or goes. */
class FakeQuery {
  readonly entities = new Set<FakeEntity>();
  private readonly told = {
    qualify: new Set<(e: FakeEntity) => void>(),
    disqualify: new Set<(e: FakeEntity) => void>(),
  };

  subscribe(event: 'qualify' | 'disqualify', callback: (e: FakeEntity) => void, replay = false): () => void {
    this.told[event].add(callback);
    if (replay) this.entities.forEach(callback);
    return () => this.told[event].delete(callback);
  }
  add(entity: FakeEntity): FakeEntity {
    this.entities.add(entity);
    this.told.qualify.forEach((callback) => callback(entity));
    return entity;
  }
  remove(entity: FakeEntity): void {
    this.entities.delete(entity);
    this.told.disqualify.forEach((callback) => callback(entity));
  }
}

function interactable(kind: string, id: string, radius: number, at: Vec3): FakeEntity {
  const entity = new FakeEntity().addComponent(Interactable, { kind, id, radius });
  entity.getVectorView(Interactable, 'worldPos').set([at.x, at.y, at.z]);
  return entity;
}

const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1]; // flat, its centre 0.45 m ahead
const SEED_AT: Vec3 = { x: -0.25, y: 1, z: -0.25 };
const ON_BED: Vec3 = { x: 0.25, y: 0.75, z: -0.45 }; // 0.25 m right of the centre: ring 3, step 0
// Two clocks, at the sizes they have in the app, so a test shows which one a time was read from: core's wall
// clock (ms since 1970) for the hint, and IWSDK's frame time (seconds since the render loop started) for the rest.
const WALL_START_MS = 1_790_000_000_000;
const FRAME_START_MS = 12_345_678;

let nowMs = WALL_START_MS;
let frameMs = FRAME_START_MS;
afterEach(() => {
  vi.restoreAllMocks();
  clock.setSource(() => Date.now());
});

/** The system on fake entities, with a sampler that reports what `hands` says and two clocks moved by hand. */
function rig() {
  nowMs = WALL_START_MS;
  frameMs = FRAME_START_MS;
  clock.setSource(() => nowMs);
  const xr = {
    frame: {} as XRFrame | null,
    space: {} as XRReferenceSpace | null,
    session: { name: 'the session' } as unknown as XRSession | null,
    getFrame: () => xr.frame,
    getReferenceSpace: () => xr.space,
    getSession: () => xr.session,
  };
  const created: FakeEntity[] = [];
  const world = {
    renderer: { xr },
    createEntity: () => {
      const entity = new FakeEntity();
      created.push(entity);
      return entity;
    },
  };
  const bed = new FakeEntity().addComponent(BedAnchor);
  bed.object3D = { matrixWorld: { elements: BED } };
  // Both are there before the system starts. Coordinates a 32-bit float holds exactly: worldPos is a Float32Array.
  const targets = new FakeQuery();
  const seed = targets.add(interactable('seed', 'seed-1', 0, SEED_AT)); // a radius nobody set
  const orb = targets.add(interactable('orb', 'listen', 0.06, { x: 0, y: 0.75, z: -0.5 }));
  const beds = new FakeQuery();
  beds.add(bed);
  const system = new HandSystem(world as never, {} as never, 20);
  system.queries = { targets, beds } as never;

  // What each hand's sample will be. An untracked sample leaves the vectors alone, as the real sampler does.
  // `pinch` follows `select` unless a test sets it; the three other vectors are written only when a test gives them.
  interface Sample {
    tracked: boolean;
    select: boolean;
    pinch?: boolean;
    at: Vec3;
    palmPos?: Vec3;
    palmNormal?: Vec3;
    velocity?: Vec3;
  }
  const hands: Record<Hand, Sample> = {
    left: { tracked: true, select: false, at: { x: -0.5, y: 1.2, z: -0.2 } },
    right: { tracked: true, select: false, at: { x: 0.5, y: 1.2, z: -0.2 } },
  };
  const calls: string[] = [];
  const setFrame = vi.spyOn(system.sampler, 'setFrame').mockImplementation(() => void calls.push('setFrame'));
  vi.spyOn(system.sampler, 'sample').mockImplementation((hand: Hand, _timeMs: number, out: HandFrame) => {
    calls.push(`sample ${hand}`);
    const now = hands[hand];
    out.tracked = now.tracked;
    out.select = now.select;
    out.pinch = now.pinch ?? now.select;
    if (!now.tracked) return;
    Object.assign(out.pinchPos, now.at);
    if (now.palmPos) Object.assign(out.palmPos, now.palmPos);
    if (now.palmNormal) Object.assign(out.palmNormal, now.palmNormal);
    if (now.velocity) Object.assign(out.velocity, now.velocity);
  });
  const attach = vi.spyOn(system.sampler, 'attach').mockImplementation(() => {});
  const detach = vi.spyOn(system.sampler, 'detach');
  /** What each machine was handed, read while its update ran: the context object is reused. */
  const handed: { hand: Hand; timeMs: number; targets: string[]; radii: number[]; bedPose: unknown }[] = [];
  let context: GestureContext | null = null;
  vi.spyOn(GestureMachine.prototype, 'update').mockImplementation(function (
    this: GestureMachine,
    frame: HandFrame,
    timeMs: number,
    given: GestureContext,
  ) {
    calls.push(`machine ${frame.hand}`);
    context = given;
    handed.push({
      hand: frame.hand,
      timeMs,
      targets: given.candidates.map(
        ({ target, pos }) => `${target.kind} ${target.id} @ ${pos.x},${pos.y},${pos.z}`,
      ),
      radii: given.candidates.map((candidate) => candidate.radius),
      bedPose: given.bedPose,
    });
    update.call(this, frame, timeMs, given);
  });
  system.init();
  const heard: string[] = [];
  const off = (['hands:lost', 'hands:found', 'gesture:trackingLost', 'gesture:release'] as const).map(
    (name) => bus.on(name, (event) => heard.push(`${name} ${event.hand}`)),
  );
  /** One frame, `afterMs` after the last one. */
  const frame = (afterMs = 14) => {
    nowMs += afterMs;
    frameMs += afterMs;
    system.update(afterMs / 1000, frameMs / 1000); // seconds, as IWSDK passes them
  };
  /** The right hand picks the seed up and holds it over the bed. */
  const carry = () => {
    hands.right.at = SEED_AT;
    frame();
    hands.right.select = true;
    frame();
    hands.right.at = ON_BED;
    frame();
  };
  const entityOf = (hand: Hand) => created.find((entity) => entity.getValue(HandState, 'hand') === hand)!;
  return {
    system,
    xr,
    bed,
    beds,
    targets,
    seed,
    orb,
    hands,
    calls,
    handed,
    heard,
    setFrame,
    attach,
    detach,
    frame,
    carry,
    entityOf,
    context: () => context!,
    stop: () => {
      off.forEach((each) => each());
      system.destroy();
    },
  };
}
// The real update, taken before any spy wraps it and called on its own machine (`update.call(this, …)` above).
const update = Object.getOwnPropertyDescriptor(GestureMachine.prototype, 'update')!
  .value as GestureMachine['update'];

describe('HandSystem: one frame', () => {
  it('gives the sampler the frame first, then for each hand its sample and its machine', () => {
    const r = rig();
    r.frame();
    expect(r.calls).toEqual(['setFrame', 'sample left', 'machine left', 'sample right', 'machine right']);
    expect(r.setFrame).toHaveBeenCalledWith(r.xr.frame, r.xr.space);
    // The frame's time in ms, the same for both hands: not the wall clock.
    expect(r.handed.map((each) => each.timeMs)).toEqual([FRAME_START_MS + 14, FRAME_START_MS + 14]);
    r.stop();
  });

  it('fills the context before the machines run: every Interactable, at least the hit radius, and the bed pose', () => {
    const r = rig();
    r.frame();
    expect(HIT_RADIUS_M).toBe(0.04);
    for (const given of r.handed) {
      expect(given.targets).toEqual(['seed seed-1 @ -0.25,1,-0.25', 'orb listen @ 0,0.75,-0.5']);
      expect(given.radii[0]).toBe(0.04); // 0 as attached: raised to the hit radius
      expect(given.radii[1]).toBeCloseTo(0.06); // a larger one is kept
      expect(given.bedPose).toBe(BED); // the entity's own matrix, not a copy
    }
    // The list follows the entities: one that goes is gone, one that comes is there, and a moved one has moved.
    r.targets.remove(r.seed);
    r.targets.add(interactable('plant', 'p1', 0.04, { x: 0.25, y: 0.75, z: -0.5 }));
    r.orb.getVectorView(Interactable, 'worldPos').set([1, 2, 3]);
    r.frame();
    expect(r.handed[2]!.targets).toEqual(['orb listen @ 1,2,3', 'plant p1 @ 0.25,0.75,-0.5']);
    r.stop();
  });

  it('reads kind and id every frame, and the radius once: an entity reused for another plant is that plant', () => {
    const r = rig();
    r.frame();
    // A plant's entity handed to the next plant: new values with setValue, and no qualify to tell of it.
    r.seed.setValue(Interactable, 'kind', 'plant');
    r.seed.setValue(Interactable, 'id', 'plant-7');
    r.orb.setValue(Interactable, 'radius', 0.5); // the radius is not followed: remove and add to change it
    r.frame();
    expect(r.handed[2]!.targets[0]).toBe('plant plant-7 @ -0.25,1,-0.25');
    expect(r.handed[2]!.radii[1]).toBeCloseTo(0.06);
    r.stop();
  });

  it('there is no bed pose while the BedAnchor entity has no transform, or once it is gone', () => {
    const r = rig();
    const { object3D } = r.bed;
    r.bed.object3D = undefined;
    r.frame();
    expect(r.handed[0]!.bedPose).toBeNull();
    r.bed.object3D = object3D;
    r.frame();
    expect(r.handed[2]!.bedPose).toBe(BED);
    r.beds.remove(r.bed);
    r.frame();
    expect(r.handed[4]!.bedPose).toBeNull();
    r.stop();
  });

  it('with two BedAnchor entities the newer one is the bed, and when it goes the older one is again', () => {
    const r = rig();
    const moved = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0.74, -0.45, 1];
    const newer = new FakeEntity().addComponent(BedAnchor);
    newer.object3D = { matrixWorld: { elements: moved } };
    r.beds.add(newer);
    r.frame();
    expect(r.handed[0]!.bedPose).toBe(moved);
    r.beds.remove(newer);
    r.frame();
    expect(r.handed[2]!.bedPose).toBe(BED); // not null: a bed is still there
    r.stop();
  });

  it("asks garden's nearestFreeCell about the state of the latest garden:changed; before one, every cell is free", () => {
    const r = rig();
    r.frame();
    const cell: Cell = { ring: 3, step: 0 };
    expect(r.context().nearestFreeCell(cell)).toBe(cell);
    const diff = { added: ['a'], removed: [], changed: [] };
    bus.emit('garden:changed', { state: garden([plant('a', 3, 0)]), diff });
    const free = r.context().nearestFreeCell(cell);
    expect(free).not.toBeNull();
    expect(free).not.toEqual(cell); // taken now: a neighbour
    expect(r.context().nearestFreeCell(cell, 'a')).toEqual(cell); // for the plant that stands there it is free
    bus.emit('garden:changed', { state: garden(), diff });
    expect(r.context().nearestFreeCell(cell)).toEqual(cell);
    r.stop();
  });

  it('writes each sample into the HandState of that hand: every field from its own source', () => {
    const r = rig();
    // Six different values (numbers a 32-bit float holds exactly), so a field written from its neighbour shows:
    // T-127 rests the seed at HandState.palmPos.
    r.hands.right = {
      tracked: true,
      select: true,
      pinch: false,
      at: { x: 0.5, y: 1.25, z: -0.25 },
      palmPos: { x: 0.375, y: 1.5, z: -0.125 },
      palmNormal: { x: 0.25, y: 0.75, z: -0.5 },
      velocity: { x: 1.5, y: -2.5, z: 3.5 },
    };
    r.frame();
    const right = r.entityOf('right');
    expect(right.data.get(HandState)).toEqual({ hand: 'right', tracked: true, pinch: false, select: true });
    expect([...right.getVectorView(HandState, 'pinchPos')]).toEqual([0.5, 1.25, -0.25]);
    expect([...right.getVectorView(HandState, 'palmPos')]).toEqual([0.375, 1.5, -0.125]);
    expect([...right.getVectorView(HandState, 'palmNormal')]).toEqual([0.25, 0.75, -0.5]);
    expect([...right.getVectorView(HandState, 'velocity')]).toEqual([1.5, -2.5, 3.5]);
    // The other hand's state is its own.
    expect(r.entityOf('left').data.get(HandState)).toEqual({
      hand: 'left',
      tracked: true,
      pinch: false,
      select: false,
    });
    expect([...r.entityOf('left').getVectorView(HandState, 'pinchPos')][0]).toBe(-0.5);
    r.stop();
  });

  it('does nothing outside a session: no frame, or no reference space', () => {
    const r = rig();
    r.xr.frame = null;
    r.frame();
    r.xr.frame = {} as XRFrame;
    r.xr.space = null;
    r.frame();
    expect(r.calls).toEqual([]);
    r.stop();
  });
});

describe('HandState', () => {
  it('is in the manifest the runtime and the editor load, with the fields of HandFrame', () => {
    expect(Array.from(manifest)).toContain(HandState);
    expect(Object.keys(HandState.schema)).toEqual([
      'hand',
      'tracked',
      'pinch',
      'select',
      'pinchPos',
      'palmPos',
      'palmNormal',
      'velocity',
    ]); // the fields of HandFrame (LLD §3)
  });
});

describe('HandSystem: the session', () => {
  it("attaches the sampler to the renderer's session on xr:sessionStart", () => {
    const r = rig();
    bus.emit('xr:sessionStart', { visible: true });
    expect(r.attach).toHaveBeenCalledExactlyOnceWith(r.xr.session);
    r.xr.session = null; // the event with no session behind it: nothing to listen to
    bus.emit('xr:sessionStart', { visible: true });
    expect(r.attach).toHaveBeenCalledTimes(1);
    r.stop();
  });

  it('a session that ends during the grace: detached, the carried seed reverted once, hint and state cleared', () => {
    const r = rig();
    r.carry();
    r.hands.right.tracked = false;
    r.frame();
    expect(r.entityOf('right').hasComponent(Caption)).toBe(true);
    bus.emit('xr:sessionEnd', { visible: false });
    expect(r.detach).toHaveBeenCalledTimes(1);
    expect(r.heard).toEqual(['hands:lost right', 'gesture:trackingLost right']);
    expect(r.entityOf('right').hasComponent(Caption)).toBe(false);
    expect(r.entityOf('right').data.get(HandState)).toMatchObject({
      tracked: false,
      pinch: false,
      select: false,
    });
    // The next session starts clean: the old grace does not fire, and the hand's first sighting is not a return.
    r.frame(1000);
    r.hands.right.tracked = true;
    r.hands.right.select = false;
    r.frame();
    expect(r.heard).toEqual(['hands:lost right', 'gesture:trackingLost right']);
    r.stop();
  });

  it('a session that ends mid-drag: the dragged plant is reverted once, and nothing is released (T-146)', () => {
    const r = rig();
    const plantAt: Vec3 = { x: 0.25, y: 0.75, z: -0.5 };
    r.targets.add(interactable('plant', 'p1', 0.04, plantAt));
    r.hands.right.at = plantAt;
    r.frame();
    r.hands.right.pinch = true; // the joint distance: a plant is held on it
    r.frame();
    r.hands.right.at = { x: 0.125, y: 0.75, z: -0.5 }; // 12.5 cm toward the centre: a drag, over ring 0
    const hovers: unknown[] = [];
    const off = bus.on('target:hover', (event) => hovers.push({ ...event }));
    r.frame();
    bus.emit('xr:sessionEnd', { visible: false });
    off();
    expect(r.heard).toEqual(['gesture:trackingLost right']); // tracked all along: no hands:lost, no release
    expect(hovers).toEqual([
      { hand: 'right', target: null, cell: { ring: 0, step: 15 } }, // the cell a release would have filled
      { hand: 'right', target: null, cell: null }, // cleared with the revert
    ]);
    r.hands.right.pinch = false;
    r.frame(1000);
    expect(r.heard).toEqual(['gesture:trackingLost right']);
    r.stop();
  });
});

describe('HandSystem: the hand hint (FR-HND-15, D-030)', () => {
  it('a hand lost while it carries a seed raises the caption on its own entity, for at most 5 s', () => {
    const r = rig();
    r.carry();
    r.hands.right.tracked = false;
    r.frame();
    expect(HAND_HINT_MAX_MS).toBe(5000);
    expect(r.entityOf('right').data.get(Caption)).toEqual({ key: HAND_HINT_KEY, expiresAt: nowMs + 5000 });
    expect(r.entityOf('left').hasComponent(Caption)).toBe(false);
    r.frame(200); // the grace runs out: the seed is reverted, the hint stays
    expect(r.heard).toEqual(['hands:lost right', 'gesture:trackingLost right']);
    expect(r.entityOf('right').hasComponent(Caption)).toBe(true);
    r.frame(4799); // 4999 ms after the loss
    expect(r.entityOf('right').hasComponent(Caption)).toBe(true);
    r.frame(1); // 5000 ms: taken back, with the hand still away
    expect(r.entityOf('right').hasComponent(Caption)).toBe(false);
    r.frame(5000);
    expect(r.entityOf('right').hasComponent(Caption)).toBe(false);
    r.stop();
  });

  it('the hint goes when the hand is seen again, inside the grace or after it', () => {
    const r = rig();
    r.carry();
    r.hands.right.tracked = false;
    r.frame();
    r.hands.right.tracked = true;
    r.frame(100); // back inside the grace: the seed is still carried
    expect(r.entityOf('right').hasComponent(Caption)).toBe(false);
    r.hands.right.tracked = false;
    r.frame();
    expect(r.entityOf('right').hasComponent(Caption)).toBe(true); // lost again, still holding
    r.frame(1000);
    r.hands.right.tracked = true;
    r.frame();
    expect(r.entityOf('right').hasComponent(Caption)).toBe(false);
    expect(r.heard).toEqual([
      'hands:lost right',
      'hands:found right',
      'hands:lost right',
      'gesture:trackingLost right',
      'hands:found right',
    ]);
    r.stop();
  });

  it('an empty hand that is lost raises nothing, however long it stays away', () => {
    const r = rig();
    r.frame();
    r.hands.left.tracked = false;
    r.frame();
    // Looked at in the frame of the loss: later, the 5 s limit would have taken a wrong hint back already.
    expect(r.heard).toEqual(['hands:lost left']);
    expect(r.entityOf('left').hasComponent(Caption)).toBe(false);
    r.frame(1000);
    expect(r.entityOf('left').hasComponent(Caption)).toBe(false);
    expect(r.heard).toEqual(['hands:lost left']);
    r.stop();
  });

  it('both hands lost at once, one of them holding: one hint, on that hand', () => {
    const r = rig();
    r.carry();
    r.hands.left.tracked = r.hands.right.tracked = false;
    r.frame();
    expect(r.heard).toEqual(['hands:lost left', 'hands:lost right']);
    expect(r.entityOf('left').hasComponent(Caption)).toBe(false);
    expect(r.entityOf('right').hasComponent(Caption)).toBe(true);
    r.stop();
  });
});

describe('HandSystem: no allocation per frame', () => {
  it('update creates nothing (0 bytes a frame at real-size times; the real sampler joint reads are not in it)', () => {
    const ROUNDS = 50_000;
    const r = rig();
    vi.restoreAllMocks(); // the spies record every call, which allocates: plain functions take their place
    clock.setSource(() => nowMs);
    const { sampler } = r.system;
    sampler.setFrame = () => {};
    sampler.sample = (hand, _timeMs, out) => {
      out.tracked = true;
      out.hand = hand;
    };
    // A full bed: 80 targets, every one at fractions, as real positions are. With whole numbers this test passed
    // while each fraction copied into a plain { x, y, z } cost a boxed number (16 bytes): the candidates'
    // positions are Vector3s for that reason. The first plant is 2.4 cm from the hands, so it is hovered.
    for (let i = 0; i < 78; i++) {
      r.targets.add(interactable('plant', `p${i}`, 0.04, { x: i * 0.3 + 0.01, y: 0.02, z: 0.01 }));
    }
    // The frame times exist before the loops, as numbers V8 has already put on the heap (an array that starts
    // with a non-number keeps them that way), which is how IWSDK hands `time` in. A time worked out in the loop
    // would be boxed here, by the test. They are real-size times at 72 Hz: 12 345.678 s and on, 13.889 ms apart,
    // so no frame falls on a whole millisecond (a whole number never needs a box, and would hide one).
    const TIMES: unknown[] = [null];
    for (let i = 1; i <= 7 * ROUNDS; i++) TIMES.push((FRAME_START_MS + i * 13.889) / 1000);
    let frames = 0;
    const round = (): void => {
      for (let i = 0; i < ROUNDS; i++) r.system.update(0.014, TIMES[++frames] as number);
    };
    round(); // warm up: the JIT's own allocations happen here
    round();
    const startedMs = performance.now();
    const costs = Array.from({ length: 5 }, () => heapCost(round));
    const msPerFrame = (performance.now() - startedMs) / (5 * ROUNDS);
    r.stop();
    const clean = costs.filter((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES);
    expect(clean.length, JSON.stringify(costs)).toBeGreaterThan(0);
    // NFR-PERF-05 gives a frame's JavaScript 6 ms. With a full bed this system took about 0.011 ms on a laptop
    // (2026-10-12, with the stand-in entities of this file); 0.1 ms leaves room for a loaded machine and still
    // catches a per-target cost gone wrong.
    expect(msPerFrame).toBeLessThan(0.1);
    // It did the work: both hands' states were written on the last frame, with all 80 targets in the list.
    expect(r.entityOf('left').data.get(HandState)).toMatchObject({ tracked: true });
    expect(r.entityOf('right').data.get(HandState)).toMatchObject({ tracked: true });
    expect(r.targets.entities.size).toBe(80);
  }, 60_000);

  it('update creates nothing while a plant is dragged over 80 targets and its hovered cell changes every frame', () => {
    const ROUNDS = 50_000;
    const r = rig();
    vi.restoreAllMocks(); // as above: plain functions take the spies' place
    clock.setSource(() => nowMs);
    // The garden: every cell taken but ring 3, step 5. Its plants' targets stand where the wiring puts them, at
    // their cell centres (API_SPEC §1.10 rule 7); with the orb that is 80 targets.
    r.targets.remove(r.seed);
    const plants = fullBedExcept([3 * 16 + 5]);
    const worldOf = (cell: Cell, upM: number): Vec3 => {
      const centre = cellCentre(cell, { x: 0, y: 0 });
      return { x: centre.x, y: 0.74 + upM, z: -0.45 + centre.y };
    };
    for (const each of plants) r.targets.add(interactable('plant', each.id, 0.04, worldOf(each.cell, 0)));
    bus.emit('garden:changed', { state: garden(plants), diff: { added: [], removed: [], changed: [] } });
    // The right hand pinches the plant on ring 2, step 0 (p32) and drags it between two points: over the free
    // cell, and over the taken cell beside its own, where garden's search answers with its own. So the hover
    // changes on every frame, with a search behind every other one. The points exist before the loop and are
    // at fractions; the frame is pointed at one of them (a fraction written into it here would be boxed here).
    const onPlant = worldOf({ ring: 2, step: 0 }, 0.0003);
    const dragged = [worldOf({ ring: 3, step: 5 }, 0.0131), worldOf({ ring: 2, step: 1 }, 0.0127)];
    let phase: 'on' | 'pinched' | 'dragging' = 'on';
    let samples = 0;
    const { sampler } = r.system;
    sampler.setFrame = () => {};
    sampler.sample = (hand, _timeMs, out) => {
      out.tracked = true;
      out.hand = hand;
      if (hand === 'left') return; // an empty hand, somewhere else
      out.pinch = phase !== 'on';
      out.pinchPos = phase === 'dragging' ? dragged[++samples & 1]! : onPlant;
    };
    const TIMES: unknown[] = [null]; // real-size frame times that exist before the loops, as in the test above
    for (let i = 1; i <= 7 * ROUNDS + 2; i++) TIMES.push((FRAME_START_MS + i * 13.889) / 1000);
    const count = { drags: 0, cells: 0, ended: 0 };
    const off = [
      bus.on('gesture:drag', (event) => {
        if (event.zone === 'bed') count.drags++;
      }),
      bus.on('target:hover', (event) => {
        if (event.hand === 'right' && event.cell !== null) count.cells++;
      }),
      bus.on('gesture:release', () => {
        count.ended++;
      }),
      bus.on('gesture:trackingLost', () => {
        count.ended++;
      }),
    ];
    let frames = 0;
    const next = (): void => r.system.update(0.014, TIMES[++frames] as number);
    next();
    phase = 'pinched';
    next();
    phase = 'dragging';
    const round = (): void => {
      for (let i = 0; i < ROUNDS; i++) next();
    };
    round(); // warm up: the JIT's own allocations happen here
    round();
    const startedMs = performance.now();
    const costs = Array.from({ length: 5 }, () => heapCost(round));
    const msPerFrame = (performance.now() - startedMs) / (5 * ROUNDS);
    off.forEach((stop) => stop());
    r.stop();
    const clean = costs.filter((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES);
    expect(clean.length, JSON.stringify(costs)).toBeGreaterThan(0);
    // 0.016 ms a frame on a laptop, and 616 bytes per 50 000 frames, which is the probe's own cost (2026-10-13,
    // stand-in entities, other agents running): the same limit as above.
    expect(msPerFrame).toBeLessThan(0.1);
    // It did the work: a preview and a new hovered cell on every frame, and the drag never ended.
    expect(count).toEqual({ drags: 7 * ROUNDS, cells: 7 * ROUNDS, ended: 0 });
    expect(r.targets.entities.size).toBe(80);
  }, 60_000);
});
