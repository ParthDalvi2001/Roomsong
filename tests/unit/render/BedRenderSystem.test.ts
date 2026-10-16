// BedRenderSystem's T-128d wiring (LLD §3.2, API_SPEC §1.8 and §1.10 rules 7, 10, 11): the plants of the latest
// garden:changed and one plant target per plant while the bed is placed; the tide's phase only once the session
// is tuned; the hover cue (D-044), the tint of a lost hand, and the undo petal with its target. Fake entities and
// queries (seedRig.ts), the real bus and renderers, a stand-in engine clock.
import { Group, Vector3, type InstancedMesh } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Interactable } from '../../../src/core/components.js';
import { bus, clock } from '../../../src/core/index.js';
import { cellCentre } from '../../../src/garden/index.js';
import { HAND_HINT_MAX_MS, HIT_RADIUS_M } from '../../../src/hands/index.js';
import { BedRenderer } from '../../../src/render/BedRenderer.js';
import { PETAL_LIFT_M } from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { PetalRenderer } from '../../../src/render/PetalRenderer.js';
import { PlantRenderer } from '../../../src/render/PlantRenderer.js';
import { BedRenderSystem } from '../../../src/render/RenderSystems.js';
import { TideRenderer } from '../../../src/render/TideRenderer.js';
import { garden, plant } from '../garden/fixtures.js';

import { FakeEntity, FakeQuery } from './seedRig.js';

import type { EventMap } from '../../../src/core/index.js';
import type { Cell, GardenState, Plant } from '../../../src/garden/index.js';

const NO_DIFF = { added: [], removed: [], changed: [] };
const T0_S = 12_345.678;
const FRAME_S = 1 / 72;

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  vi.restoreAllMocks();
});

/** BedRenderSystem as `register(world, BedRenderSystem, 50, { guard, engine, bed })` makes it, on fakes. */
function rig() {
  const created: FakeEntity[] = [];
  const world = {
    createEntity: () => {
      const entity = new FakeEntity();
      created.push(entity);
      return entity;
    },
  };
  // The bed: 0.74 m up and 0.45 m ahead, turned a quarter about the vertical, as a bed on a table may be.
  const bed = new Group();
  bed.position.set(0.1, 0.74, -0.45);
  bed.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
  bed.updateMatrixWorld(true);
  const beds = new FakeQuery();
  const bedEntity = new FakeEntity();
  const audio = { nowS: 0, phase: 0.25 };
  const engine = { clock: { now: () => audio.nowS, barPhase: () => audio.phase } };
  const system = new BedRenderSystem(world as never, {} as never, 50);
  system.queries = { beds } as never;
  system.config.guard.value = new FlashGuard();
  system.config.engine.value = engine;
  system.config.bed.value = bed;
  system.init();
  stop = () => system.destroy();
  let timeS = T0_S;
  const frame = (seconds = FRAME_S): void => {
    timeS += seconds;
    system.update(seconds, timeS);
  };
  const changed = (state: GardenState, diff: Partial<EventMap['garden:changed']['diff']> = {}): void =>
    bus.emit('garden:changed', { state, diff: { ...NO_DIFF, ...diff } });
  /** The live targets of that kind: id, radius and where hands reads them. */
  const targets = (kind: 'plant' | 'undo') =>
    created
      .filter((e) => e.active && e.getValue(Interactable, 'kind') === kind)
      .map((e) => ({
        id: e.getValue(Interactable, 'id') as string,
        radius: e.getValue(Interactable, 'radius') as number,
        at: new Vector3().fromArray(e.getVectorView(Interactable, 'worldPos')),
      }));
  /** Where a cell's centre is in the world, `liftM` above the bed (D-029: bed-local x and z). */
  const worldOf = (cell: Cell, liftM = 0): Vector3 => {
    const c = cellCentre(cell, { x: 0, y: 0 });
    return new Vector3(c.x, liftM, c.y).applyMatrix4(bed.matrixWorld);
  };
  return {
    system,
    bed,
    audio,
    created,
    place: () => beds.add(bedEntity),
    unplace: () => beds.remove(bedEntity),
    frame,
    changed,
    targets,
    worldOf,
  };
}

const three = (): Plant[] => [plant('a', 0, 0), plant('b', 2, 5), plant('c', 4, 15)];
/** How many plants PlantRenderer draws: the instances of its five silhouettes, the bed's children 2 to 6. */
const drawn = (bed: Group): number =>
  bed.children.slice(2, 7).reduce((sum, mesh) => sum + (mesh as InstancedMesh).count, 0);

describe('the plants and their targets (LLD §3.5 d1; API_SPEC §1.10 rule 7)', () => {
  it('placed: every plant drawn, and one plant target each at its cell centre, in world space, with the hit radius', () => {
    const r = rig();
    r.place();
    r.changed(garden(three()), { added: ['a', 'b', 'c'] });
    expect(drawn(r.bed)).toBe(3);
    const targets = r.targets('plant');
    expect(targets.map((t) => t.id).sort()).toEqual(['a', 'b', 'c']);
    for (const t of targets) {
      expect(t.radius).toBe(HIT_RADIUS_M);
      const cell = three().find((p) => p.id === t.id)!.cell;
      expect(t.at.distanceTo(r.worldOf(cell))).toBeLessThan(1e-6);
    }
  });

  it('a garden that came before the bed is drawn when the bed is placed; Re-place and the session end take it away', () => {
    const r = rig();
    r.changed(garden(three()), { added: ['a', 'b', 'c'] }); // garden.load() comes before any session
    expect(drawn(r.bed)).toBe(0);
    expect(r.targets('plant')).toEqual([]);
    r.place();
    expect(drawn(r.bed)).toBe(3);
    expect(r.targets('plant')).toHaveLength(3);
    r.unplace();
    expect(drawn(r.bed)).toBe(0);
    expect(r.targets('plant')).toEqual([]);
    r.place(); // the next session
    expect(r.targets('plant')).toHaveLength(3);
  });

  it('follows each change: a new plant gets a target, a removed one loses it, a moved one moves', () => {
    const r = rig();
    r.place();
    const first = garden(three());
    r.changed(first, { added: ['a', 'b', 'c'] });
    const moved = { ...first.plants[1]!, cell: { ring: 1, step: 9 } };
    r.changed(garden([first.plants[0]!, moved, plant('d', 3, 3)]), {
      added: ['d'],
      removed: ['c'],
      changed: ['b'],
    });
    const at = Object.fromEntries(r.targets('plant').map((t) => [t.id, t.at]));
    expect(Object.keys(at).sort()).toEqual(['a', 'b', 'd']);
    expect(at.b!.distanceTo(r.worldOf({ ring: 1, step: 9 }))).toBeLessThan(1e-6);
    expect(at.d!.distanceTo(r.worldOf({ ring: 3, step: 3 }))).toBeLessThan(1e-6);
  });

  it('a bed moved with no event (an anchor re-read after a recentre) moves the targets in the next frame', () => {
    const r = rig();
    r.place();
    r.changed(garden(three()));
    r.frame();
    r.bed.position.x += 0.2;
    r.bed.updateMatrixWorld(true);
    r.frame();
    const a = r.targets('plant').find((t) => t.id === 'a')!;
    expect(a.at.distanceTo(r.worldOf({ ring: 0, step: 0 }))).toBeLessThan(1e-6);
  });
});

describe("the tide's phase (API_SPEC §1.10 rule 11)", () => {
  it('NaN until the bed is placed, the session tuned and the audio clock running; NaN again after the session', () => {
    const plants = vi.spyOn(PlantRenderer.prototype, 'update');
    const tide = vi.spyOn(TideRenderer.prototype, 'update');
    const r = rig();
    const phase = (): number => {
      r.frame();
      expect(plants.mock.lastCall?.[0]).toBe(tide.mock.lastCall?.[0]); // one phase for both
      return tide.mock.lastCall![0];
    };
    expect(phase()).toBeNaN();
    r.place();
    expect(phase()).toBeNaN(); // placed, not tuned: a restored garden must not be seen playing in the wrong key
    bus.emit('room:signature', { signature: {} as never, starterSeeds: false });
    expect(phase()).toBeNaN(); // the engine before init(): its phase 0 would stand the tide on step 0
    r.audio.nowS = 0.5;
    expect(phase()).toBe(0.25);
    r.audio.phase = Number.NaN; // a clock that gives no usable phase: no tide, not a wedge on step 0
    expect(phase()).toBeNaN();
    r.audio.phase = 0.25;
    r.unplace(); // Re-place: no bed to sweep
    expect(phase()).toBeNaN();
    r.place();
    expect(phase()).toBe(0.25);
    bus.emit('xr:sessionEnd', { visible: false });
    r.place();
    expect(phase()).toBeNaN();
  });
});

describe('the hover cue and the tint (FR-HND-15, FR-HND-16, D-044)', () => {
  it('an empty hand over a plant lights the plant and its own cell; a carry lights the cell; nothing clears both', () => {
    const bedHover = vi.spyOn(BedRenderer.prototype, 'setHover');
    const plantHover = vi.spyOn(PlantRenderer.prototype, 'setHover');
    const r = rig();
    r.place();
    r.changed(garden(three()));
    bus.emit('target:hover', { hand: 'right', target: { kind: 'plant', id: 'b' }, cell: null });
    expect(plantHover).toHaveBeenLastCalledWith('right', 'b');
    expect(bedHover).toHaveBeenLastCalledWith('right', { ring: 2, step: 5 });
    bus.emit('target:hover', { hand: 'left', target: null, cell: { ring: 1, step: 7 } });
    expect(plantHover).toHaveBeenLastCalledWith('left', null);
    expect(bedHover).toHaveBeenLastCalledWith('left', { ring: 1, step: 7 });
    bus.emit('target:hover', { hand: 'left', target: { kind: 'seed', id: 's1' }, cell: null });
    expect(plantHover).toHaveBeenLastCalledWith('left', null);
    expect(bedHover).toHaveBeenLastCalledWith('left', null);
  });

  it('a lost hand that held a plant dims it until the hint ends, on the frame clock; its return lifts the dim', () => {
    const tint = vi.spyOn(PlantRenderer.prototype, 'setTint');
    const r = rig();
    r.place();
    r.changed(garden(three()));
    r.frame();
    const frameMs = Math.round((T0_S + FRAME_S) * 1000);
    bus.emit('hands:lost', { hand: 'left', held: { kind: 'seed', id: 's1' } });
    expect(tint).not.toHaveBeenCalled(); // nothing draws a carried seed's tint (API_SPEC §1.8)
    bus.emit('hands:lost', { hand: 'left', held: { kind: 'plant', id: 'a' } });
    expect(tint).toHaveBeenLastCalledWith('left', 'a', frameMs + HAND_HINT_MAX_MS);
    bus.emit('hands:found', { hand: 'left' });
    expect(tint).toHaveBeenLastCalledWith('left', null, 0);
  });

  it('the session end clears every hover and tint', () => {
    const bedHover = vi.spyOn(BedRenderer.prototype, 'setHover');
    const plantHover = vi.spyOn(PlantRenderer.prototype, 'setHover');
    const tint = vi.spyOn(PlantRenderer.prototype, 'setTint');
    rig();
    bus.emit('xr:sessionEnd', { visible: false });
    for (const hand of ['left', 'right']) {
      expect(bedHover).toHaveBeenCalledWith(hand, null);
      expect(plantHover).toHaveBeenCalledWith(hand, null);
      expect(tint).toHaveBeenCalledWith(hand, null, 0);
    }
  });
});

describe('the shaping drawn (T-147, API_SPEC §1.8 "Who calls it")', () => {
  it('each gesture event reaches its PlantRenderer method; a tracking loss ends the hold as a release does', () => {
    const calls: string[] = [];
    for (const name of ['onPinchStart', 'onPull', 'onDrag', 'onRelease'] as const) {
      vi.spyOn(PlantRenderer.prototype, name).mockImplementation((e: { hand: string }) => {
        calls.push(`${name} ${e.hand}`);
      });
    }
    rig();
    const target = { kind: 'plant' as const, id: 'a' };
    const pos = { x: 0, y: 0.8, z: -0.4 };
    bus.emit('gesture:pinchStart', { type: 'gesture:pinchStart', hand: 'right', target, pos });
    bus.emit('gesture:pull', { type: 'gesture:pull', hand: 'right', target, dy: 0.03 });
    bus.emit('gesture:drag', { type: 'gesture:drag', hand: 'right', target, pos, zone: 'outer' });
    bus.emit('gesture:release', {
      type: 'gesture:release',
      hand: 'right',
      target,
      gesture: 'drag',
      zone: 'outer',
      cell: null,
      dy: null,
      pos,
    });
    bus.emit('gesture:trackingLost', {
      type: 'gesture:trackingLost',
      hand: 'left',
    });
    expect(calls).toEqual([
      'onPinchStart right',
      'onPull right',
      'onDrag right',
      'onRelease right',
      'onRelease left',
    ]);
  });

  it('a plant removed while a hand holds it: the petal bursts from where it was last drawn', () => {
    const show = vi.spyOn(PetalRenderer.prototype, 'show');
    vi.spyOn(PlantRenderer.prototype, 'heldAt').mockImplementation((id, out) => {
      if (id !== 'b') return false;
      Object.assign(out, { x: 0.31, y: 0.05, z: 0.02 });
      return true;
    });
    const r = rig();
    r.place();
    const plantB = plant('b', 2, 5);
    bus.emit('garden:removed', { plantId: 'b', undoToken: { plant: plantB }, expiresAt: clock.now() + 5000 });
    expect(show.mock.lastCall?.[3]).toMatchObject({ x: 0.31, y: 0.05, z: 0.02 });
    bus.emit('garden:removed', {
      plantId: 'a',
      undoToken: { plant: plant('a', 0, 0) },
      expiresAt: clock.now() + 5000,
    });
    expect(show.mock.lastCall?.[3]).toBeNull(); // not held (an undo of an undo, a removal by gaze): at once
  });
});

describe('the undo petal (T-146, UX §9.3; API_SPEC §1.8 "Who calls it")', () => {
  const removed = plant('b', 2, 5, { hue: 0.6 });
  const remove = (expiresAt: number): void =>
    bus.emit('garden:removed', { plantId: 'b', undoToken: { plant: removed }, expiresAt });

  it('garden:removed: the petal until the token ends, on the frame clock, and an undo target 3 cm over the cell', () => {
    const show = vi.spyOn(PetalRenderer.prototype, 'show');
    const r = rig();
    r.place();
    r.frame();
    const frameMs = Math.round((T0_S + FRAME_S) * 1000);
    remove(clock.now() + 5000);
    const [id, shown, untilMs] = show.mock.lastCall!;
    expect([id, shown]).toEqual(['b', removed]);
    expect(untilMs).toBeGreaterThan(frameMs + 4990); // core's clock moved on a little since the event was made
    expect(untilMs).toBeLessThanOrEqual(frameMs + 5000);
    const [undo] = r.targets('undo');
    expect(undo).toMatchObject({ id: 'b', radius: HIT_RADIUS_M });
    expect(undo!.at.distanceTo(r.worldOf(removed.cell, PETAL_LIFT_M))).toBeLessThan(1e-6);
  });

  it('its target goes with the petal: at the end of its life, on the undo, and on New garden', () => {
    const r = rig();
    r.place();
    const before = garden([], [], { createdAt: 1 });
    r.changed(before);
    r.frame();
    remove(clock.now() + 1000);
    r.frame(0.5);
    expect(r.targets('undo')).toHaveLength(1);
    r.frame(0.6); // past its end
    expect(r.targets('undo')).toEqual([]);

    remove(clock.now() + 5000);
    r.changed(garden([removed], [], { createdAt: 1 }), { added: ['b'] }); // the undo
    r.frame();
    expect(r.targets('undo')).toEqual([]);

    remove(clock.now() + 5000);
    r.frame();
    r.changed(garden([], [], { createdAt: 2 }), { removed: [] }); // New garden: another garden's createdAt
    r.frame();
    expect(r.targets('undo')).toEqual([]);
  });

  it('no petal and no target while the bed is not placed (a plant held through Re-place, dragged off)', () => {
    const show = vi.spyOn(PetalRenderer.prototype, 'show');
    const r = rig();
    r.place();
    r.unplace();
    remove(clock.now() + 5000);
    expect(show).not.toHaveBeenCalled();
    expect(r.targets('undo')).toEqual([]);
  });

  it('its target goes at its end even when a renderer throws every frame', () => {
    const r = rig();
    r.place();
    r.frame();
    remove(clock.now() + 1000);
    vi.spyOn(PetalRenderer.prototype, 'update').mockImplementation(() => {
      throw new Error('planted');
    });
    expect(() => r.frame(0.5)).toThrow('planted');
    expect(r.targets('undo')).toHaveLength(1);
    expect(() => r.frame(0.6)).toThrow('planted'); // past its end
    expect(r.targets('undo')).toEqual([]);
  });
});
