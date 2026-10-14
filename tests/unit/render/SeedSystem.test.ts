// SeedSystem (T-127; API_SPEC §1.10 rule 8, LLD §3.2 priority 49): which event sends the seed where, the seed's
// target and the "Garden is full" caption. Fake entities and queries (seedRig.ts), the real bus, renderer and
// guard: no ECS world, no XR. What a seed's glide looks like is SeedRenderer.test.ts; the per-frame cost is
// SeedSystem.heap.test.ts; the whole flow on the emulator's hands is tests/e2e/16-seeds.spec.ts.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Caption, Interactable } from '../../../src/core/components.js';
import { bus, clock } from '../../../src/core/index.js';
import { HIT_RADIUS_M } from '../../../src/hands/config.js';
import { HandState } from '../../../src/hands/HandState.js';
import {
  GARDEN_FULL_CAPTION_MS,
  SEED_GLIDE_MS,
  SEED_HOP_MS,
  SUPPLY_ORB_LIFT_M,
  SUPPLY_ORB_RADIUS_M,
} from '../../../src/render/config.js';
import { SeedRenderer } from '../../../src/render/SeedRenderer.js';
import { garden, seed } from '../garden/fixtures.js';

import { BED_AT, FRAME_S, LEFT_PALM, RIGHT_PINCH, rig } from './seedRig.js';

import type { EventMap, Hand, Vec3 } from '../../../src/core/index.js';
import type { GardenState } from '../../../src/garden/index.js';

const changed = (state: GardenState, added: string[] = []): void =>
  bus.emit('garden:changed', { state, diff: { added, removed: [], changed: [] } });
const seedOut = (id: string, hand: Hand): void => bus.emit('garden:seedOut', { seed: seed(id), hand });
const pinch = (hand: Hand, kind: 'seed' | 'plant', id: string): void =>
  bus.emit('gesture:pinchStart', {
    type: 'gesture:pinchStart',
    hand,
    target: { kind, id },
    pos: RIGHT_PINCH,
  });
const back = (seedId: string, reason: EventMap['garden:seedBack']['reason']): void =>
  bus.emit('garden:seedBack', { seedId, reason });
const SUPPLY = garden([], [seed('s1'), seed('s2'), seed('s3')]);
const GLIDE_S = SEED_GLIDE_MS / 1000 + FRAME_S;
const HOP_S = SEED_HOP_MS / 1000 + FRAME_S;

/** Place 0 of the orb, the first seed's: nearest the user on the ring over the bed's centre. */
const ORB_PLACE_0: Vec3 = { x: BED_AT.x, y: BED_AT.y + SUPPLY_ORB_LIFT_M, z: BED_AT.z + SUPPLY_ORB_RADIUS_M };
/** Where instance `slot` is drawn, from the mesh itself. */
const drawnAt = (s: ReturnType<typeof rig>, slot: number): Vec3 => {
  const m = s.mesh.instanceMatrix.array;
  return { x: m[slot * 16 + 12]!, y: m[slot * 16 + 13]!, z: m[slot * 16 + 14]! };
};

const expectAt = (actual: Vec3 | null, expected: Vec3): void => {
  expect(actual).not.toBeNull();
  expect(actual!.x).toBeCloseTo(expected.x, 5);
  expect(actual!.y).toBeCloseTo(expected.y, 5);
  expect(actual!.z).toBeCloseTo(expected.z, 5);
};

let current: ReturnType<typeof rig> | undefined;
afterEach(() => {
  current?.system.destroy();
  current = undefined;
  vi.restoreAllMocks();
});
const start = () => (current = rig());

describe('SeedSystem: the supply and the seed that is out (API_SPEC §1.10 rule 8)', () => {
  it('garden:changed fills the orb over the bed; with the bed gone the orb is not drawn', () => {
    const s = start();
    changed(SUPPLY);
    s.frame();
    expect(s.drawn()).toBe(3);
    s.beds.remove(s.bed);
    s.frame();
    expect(s.drawn()).toBe(0);
    expect(s.targetAt()).toBeNull(); // no seed is out: no target
  });

  it("garden:seedOut: the seed glides to that hand's palm and is a seed target, its kind, id and radius given to addComponent", () => {
    const s = start();
    changed(SUPPLY);
    s.frame();
    seedOut('s1', 'left');
    expect(s.target.added).toEqual([[Interactable, { kind: 'seed', id: 's1', radius: HIT_RADIUS_M }]]);
    s.frame(GLIDE_S);
    expectAt(s.targetAt(), LEFT_PALM);
    expect(s.drawn()).toBe(3); // two in the orb and one on the hand
    // The palm moves: the seed rests on it with no smoothing (LLD §4), and the target with it.
    const moved = { x: -0.2, y: 0.97, z: -0.31 };
    s.put('left', 'palmPos', moved);
    s.frame();
    expectAt(s.targetAt(), moved);
  });

  it("gesture:pinchStart naming it: it hops to that hand's pinch point; a pinch on anything else does nothing", () => {
    const s = start();
    changed(SUPPLY);
    s.frame();
    seedOut('s1', 'left');
    s.frame(GLIDE_S);
    pinch('right', 'plant', 's1'); // a plant of that id is not the seed
    pinch('right', 'seed', 's2'); // a seed that is not out
    s.frame(HOP_S);
    expectAt(s.targetAt(), LEFT_PALM);
    pinch('right', 'seed', 's1');
    s.frame(HOP_S);
    expectAt(s.targetAt(), RIGHT_PINCH);
    // The other hand takes it over: the carrier is the hand of the latest pinch that names it.
    const leftPinch = { x: -0.1, y: 0.92, z: -0.33 };
    s.put('left', 'pinchPos', leftPinch);
    pinch('left', 'seed', 's1');
    s.frame(HOP_S);
    expectAt(s.targetAt(), leftPinch);
  });

  it('planted (garden:changed with its id in diff.added): it goes, and so does its target', () => {
    const s = start();
    changed(SUPPLY);
    seedOut('s1', 'left');
    pinch('right', 'seed', 's1');
    s.frame();
    const planted = garden([], [seed('s2'), seed('s3')]); // the plant takes the seed's id
    changed(planted, ['s1']);
    s.frame();
    expect(s.targetAt()).toBeNull();
    expect(s.target.hasComponent(Interactable)).toBe(false);
    expect(s.drawn()).toBe(2);
  });

  it.each([
    ['offBed', 'bump'],
    ['full', 'glide'],
    ['lost', 'jump'],
    ['reset', 'jump'],
  ] as const)(
    'garden:seedBack %s: the seed goes home to its place in the orb (a %s) and its target goes',
    (reason, move) => {
      const follow = vi.spyOn(SeedRenderer.prototype, 'follow');
      const s = start();
      changed(SUPPLY);
      s.frame();
      seedOut('s1', 'left');
      expect(follow).toHaveBeenLastCalledWith('s1', expect.anything(), expect.any(Number), 'glide');
      s.frame(GLIDE_S);
      expectAt(drawnAt(s, 0), LEFT_PALM);
      back('s1', reason);
      expect(follow).toHaveBeenLastCalledWith('s1', null, expect.any(Number), move); // UX §7
      expect(s.target.hasComponent(Interactable)).toBe(false);
      s.frame(GLIDE_S);
      expectAt(drawnAt(s, 0), ORB_PLACE_0);
      expect(s.drawn()).toBe(3);
      // Out again on the next palm-up: a new target, its values given again.
      seedOut('s1', 'right');
      expect(s.target.added).toHaveLength(2);
      expect(s.target.added[1]).toEqual([Interactable, { kind: 'seed', id: 's1', radius: HIT_RADIUS_M }]);
    },
  );

  it('"Garden is full" on its own entity on full only, taken back before it is raised again (UX §7)', () => {
    vi.spyOn(clock, 'now').mockReturnValue(1_790_000_000_000);
    const s = start();
    changed(SUPPLY);
    for (const reason of ['offBed', 'lost', 'reset'] as const) {
      seedOut('s1', 'left');
      back('s1', reason);
    }
    expect(s.caption.added).toEqual([]);
    seedOut('s1', 'left');
    back('s1', 'full');
    const raised = [Caption, { key: 'gardenFull', expiresAt: 1_790_000_000_000 + GARDEN_FULL_CAPTION_MS }];
    expect(s.caption.added).toEqual([raised]);
    const removed = vi.spyOn(s.caption, 'removeComponent');
    seedOut('s1', 'left');
    back('s1', 'full');
    expect(removed).toHaveBeenCalledWith(Caption);
    expect(s.caption.added).toEqual([raised, raised]);
    expect(s.target.hasComponent(Caption)).toBe(false); // not on the seed's target
  });

  it('a seed on a palm whose hand is lost stays out, where the palm was last seen (the garden ends nothing)', () => {
    const s = start();
    changed(SUPPLY);
    s.frame();
    seedOut('s1', 'left');
    s.frame(GLIDE_S);
    // A lost hand: HandSystem leaves its vectors as they were and only clears `tracked`. An idle hand gets no
    // gesture:trackingLost, so the garden sends nothing back.
    s.handOf.left.data.get(HandState)!.tracked = false;
    s.frame();
    s.frame();
    expectAt(s.targetAt(), LEFT_PALM);
    expect(s.drawn()).toBe(3);
  });

  it('a second garden:seedOut while one is out sends the first home, drawn and target alike', () => {
    const s = start();
    changed(SUPPLY);
    s.frame();
    seedOut('s1', 'left');
    s.frame(GLIDE_S);
    seedOut('s2', 'right'); // the garden never does this (rule 8); if it did, nothing may stay on a hand
    s.frame(GLIDE_S);
    expectAt(drawnAt(s, 0), ORB_PLACE_0);
    expect(s.target.added.map(([, values]) => values.id)).toEqual(['s1', 's2']);
    expect(s.targetAt()).not.toBeNull();
  });

  it('garden:seedOut for a seed that is not in the supply attaches nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = start();
    changed(SUPPLY);
    seedOut('elsewhere', 'left');
    expect(s.target.added).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('destroy() takes its mesh out of the scene and its handlers off the bus', () => {
    const s = start();
    s.system.destroy();
    current = undefined;
    expect(s.world.scene.children).toEqual([]);
    changed(SUPPLY);
    seedOut('s1', 'left');
    expect(s.target.added).toEqual([]);
  });
});
