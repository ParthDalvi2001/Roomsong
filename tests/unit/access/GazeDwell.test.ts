// Gaze dwell (T-160; FR-HND-12, US-16; UX §8, §9.2, §9.8): the Dwell rules, then GazeDwellSystem on a fake world
// with the real reticle: the level-3 ghost, the Listen orb, a free cell, what it skips, and its cost per frame.
import { Group, Matrix4, Vector3 } from '@iwsdk/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RETICLE_IDLE_DISTANCE_M } from '../../../src/access/config.js';
import { Dwell, GazeDwellSystem } from '../../../src/access/index.js';
import { Reticle } from '../../../src/access/Reticle.js';
import { BedAnchor, Interactable } from '../../../src/core/components.js';
import { bus, DEFAULT_SETTINGS, settings, type EventMap } from '../../../src/core/index.js';
import { cellCentre, type Cell } from '../../../src/garden/index.js';
import { HandState } from '../../../src/hands/index.js';
import { FlashGuard } from '../../../src/render/index.js';
import { garden, plant, seed } from '../garden/fixtures.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

describe('Dwell (UX §8, §9.8)', () => {
  /** `ms` of frames 14 ms long on one target; how many selected. */
  const rest = (dwell: Dwell, ms: number, dwellMs = 900, isTurning = false): number => {
    let selected = 0;
    for (let t = 0; t < ms; t += 14)
      if (dwell.frame(Math.min(14, ms - t), true, true, isTurning, dwellMs)) selected++;
    return selected;
  };

  it.each([600, 900, 1200])(
    'selects after %i ms on one target, and not 1 ms sooner; then once only',
    (dwellMs) => {
      const dwell = new Dwell();
      dwell.frame(14, false, true, false, dwellMs); // the gaze arrives: that frame counts nothing
      expect(rest(dwell, dwellMs - 1, dwellMs)).toBe(0);
      expect(dwell.fill[0]).toBeCloseTo(1, 2);
      expect(rest(dwell, 1, dwellMs)).toBe(1);
      expect(dwell.fill[0]).toBe(0);
      expect(rest(dwell, 5000, dwellMs)).toBe(0);
    },
  );

  it('leaving resets it; a fast turn holds it (neither grows nor resets); a frame counts 100 ms at most', () => {
    const dwell = new Dwell();
    dwell.frame(14, false, true, false, 900);
    rest(dwell, 800);
    dwell.frame(14, false, true, false, 900); // another target
    expect(rest(dwell, 800)).toBe(0);
    const fill = dwell.fill[0];
    expect(rest(dwell, 2000, 900, true)).toBe(0);
    expect(dwell.fill[0]).toBe(fill);
    expect(rest(dwell, 100)).toBe(1);
    const paused = new Dwell();
    paused.frame(14, false, true, false, 900);
    expect(paused.frame(5000, true, true, false, 900)).toBe(false);
  });

  it('what comes under the gaze right after a select counts as selected until the gaze leaves it', () => {
    const dwell = new Dwell();
    dwell.frame(14, false, true, false, 600);
    expect(rest(dwell, 600, 600)).toBe(1);
    dwell.frame(14, false, true, false, 600); // the next free cell, at once
    expect(rest(dwell, 3000, 600)).toBe(0);
    dwell.frame(14, false, true, false, 600); // the gaze moved on
    expect(rest(dwell, 600, 600)).toBe(1);
  });
});

/** As much of an ECS entity as the system reads. */
class FakeEntity {
  readonly data = new Map<unknown, Record<string, unknown>>();
  private readonly views = new Map<string, Float32Array>();
  object3D?: Group;
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
    return this.data.get(component)?.[key];
  }
  getVectorView(_component: unknown, key: string): Float32Array {
    let view = this.views.get(key);
    if (view === undefined) this.views.set(key, (view = new Float32Array(3)));
    return view;
  }
}
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

const EYE = new Vector3(0, 1.15, 0);
const BED_AT = new Vector3(0, 0.74, -0.45); // flat, 0.45 m ahead on a 0.74 m desk
const off: (() => void)[] = [];
let live: GazeDwellSystem | null = null;
afterEach(() => {
  while (off.length > 0) off.pop()?.();
  live?.destroy();
  live = null;
  settings.set({ ...DEFAULT_SETTINGS });
  vi.restoreAllMocks();
});

/** A cell's centre in the world, on the bed above. */
function cellAt(cell: Cell): Vector3 {
  const c = cellCentre(cell, { x: 0, y: 0 });
  return new Vector3(BED_AT.x + c.x, BED_AT.y, BED_AT.z + c.y);
}

/** GazeDwellSystem as `register(world, GazeDwellSystem, 25, { room, guard })` makes it, in a session. */
function rig() {
  const head = new Matrix4().setPosition(EYE);
  const xr = { isPresenting: true };
  const scene = new Group();
  const world = {
    player: { head: { matrixWorld: head } },
    camera: { matrixWorld: new Matrix4() },
    scene,
    renderer: { xr },
  };
  const bed = new FakeEntity();
  bed.object3D = new Group();
  bed.object3D.position.copy(BED_AT);
  bed.object3D.updateMatrixWorld(true);
  const room = { bed, preview: null as { level: number; pose: number[] } | null, confirmed: 0 };
  const targets = new FakeQuery();
  const hands = new FakeQuery();
  const system = new GazeDwellSystem(world as never, {} as never, 25);
  system.queries = { targets, hands } as never;
  system.config.room.value = {
    bed,
    solver: { preview: () => room.preview },
    confirm: () => room.confirmed++,
  };
  system.config.guard.value = new FlashGuard();
  system.init();
  live = system;
  const [dot, ring] = scene.children as [import('three').Mesh, import('three').Mesh];
  let timeS = 100;
  const frames = (ms: number) => {
    for (let t = 0; t < ms; t += 14) system.update(0.014, (timeS += 0.014));
  };
  const lookAt = (at: Vector3) => {
    head.lookAt(EYE, at, new Vector3(0, 1, 0)).setPosition(EYE);
  };
  const target = (kind: string, id: string, at: Vector3) => {
    const entity = new FakeEntity().addComponent(Interactable, { kind, id, radius: 0.04 });
    entity.getVectorView(Interactable, 'worldPos').set(at.toArray());
    return targets.add(entity);
  };
  const hand = (pinch: boolean, select = false) =>
    hands.add(new FakeEntity().addComponent(HandState, { hand: 'left', pinch, select }));
  const heard = <K extends keyof EventMap>(type: K) => {
    const payloads: EventMap[K][] = [];
    off.push(bus.on(type, (payload) => payloads.push(structuredClone(payload))));
    return payloads;
  };
  const place = () => bed.addComponent(BedAnchor);
  return { system, room, bed, head, xr, dot, ring, frames, lookAt, target, hand, heard, place };
}

describe('GazeDwellSystem (T-160, priority 25)', () => {
  it('does nothing and shows no dot with gaze mode off, or outside a session', () => {
    const r = rig();
    r.place();
    const orb = new Vector3(0, 0.79, -0.45);
    r.target('orb', 'listen', orb);
    r.lookAt(orb);
    const releases = r.heard('gesture:release');
    r.frames(2000);
    expect(releases).toEqual([]);
    expect(r.dot.visible).toBe(false);
    settings.set({ gazeDwell: true });
    r.xr.isPresenting = false;
    r.frames(2000);
    expect([releases, r.dot.visible]).toEqual([[], false]);
  });

  it('the level-3 ghost on a usable spot: one confirm after the dwell; never at level 4', () => {
    settings.set({ gazeDwell: true, dwellMs: 600 });
    const r = rig();
    r.room.preview = { level: 4, pose: new Matrix4().setPosition(BED_AT).elements };
    r.lookAt(BED_AT);
    r.frames(2000);
    expect(r.room.confirmed).toBe(0);
    r.room.preview = { level: 3, pose: new Matrix4().setPosition(BED_AT).elements };
    r.frames(580);
    expect(r.room.confirmed).toBe(0);
    expect(r.ring.visible).toBe(true);
    r.frames(40);
    expect(r.room.confirmed).toBe(1);
    r.frames(3000);
    expect(r.room.confirmed).toBe(1);
  });

  it('the Listen orb: a press of the dominant hand after the dwell; in Listen, the wake', () => {
    settings.set({ gazeDwell: true, dominantHand: 'left' });
    const r = rig();
    r.place();
    const orb = new Vector3(0, 0.79, -0.45);
    r.target('orb', 'listen', orb);
    r.lookAt(orb);
    const releases = r.heard('gesture:release');
    const hovers = r.heard('target:hover');
    const wakes = r.heard('gesture:wake');
    const starts = r.heard('gesture:pinchStart');
    r.frames(950);
    expect(releases).toMatchObject([
      { hand: 'left', gesture: 'press', target: { kind: 'orb', id: 'listen' }, cell: null },
    ]);
    expect(hovers[0]).toMatchObject({ hand: 'left', target: { kind: 'orb', id: 'listen' }, cell: null });
    bus.emit('listen:enter', {});
    r.frames(2000);
    expect(wakes).toEqual([]); // one select per look: the gaze has to leave the orb first
    r.lookAt(new Vector3(0.5, 1.15, -0.45));
    r.frames(100);
    r.lookAt(orb);
    // A head that jumps reads as turning for its first 0.4 s (UX §9.8). D-054: the wake takes twice the dwell.
    r.frames(1400);
    expect(wakes).toEqual([]);
    r.frames(900);
    expect(wakes).toHaveLength(1);
    expect([releases.length, starts]).toEqual([1, []]); // no pinch event at all
  });

  it('a free cell: palm up for the next seed, then a carry release of that seed into that cell', () => {
    settings.set({ gazeDwell: true });
    const r = rig();
    r.place();
    bus.emit('garden:changed', {
      state: garden([plant('p', 2, 4)], [seed('s1')]),
      diff: { added: [], removed: [], changed: [] },
    });
    // The garden's answer to a palm up: the next seed goes out on that hand.
    off.push(bus.on('gesture:palmUp', ({ hand }) => bus.emit('garden:seedOut', { seed: seed('s1'), hand })));
    const releases = r.heard('gesture:release');
    const hovers = r.heard('target:hover');
    r.lookAt(cellAt({ ring: 2, step: 5 }));
    r.frames(950);
    expect(hovers[0]).toMatchObject({ hand: 'right', target: null, cell: { ring: 2, step: 5 } });
    expect(releases).toMatchObject([
      {
        hand: 'right',
        gesture: 'carry',
        target: { kind: 'seed', id: 's1' },
        zone: 'bed',
        cell: { ring: 2, step: 5 },
      },
    ]);
    // On a plant: the nearest free cell is the one a seed would fill.
    r.lookAt(cellAt({ ring: 2, step: 4 }));
    r.frames(28);
    expect(hovers[hovers.length - 1]?.cell).not.toEqual({ ring: 2, step: 4 });
    expect(hovers[hovers.length - 1]?.cell).not.toBeNull();
  });

  it('no seed to give, a full bed, or Listen: a cell is no target and the ring stays empty', () => {
    settings.set({ gazeDwell: true });
    const r = rig();
    r.place();
    bus.emit('garden:changed', {
      state: garden([], []),
      diff: { added: [], removed: [], changed: [] },
    });
    r.lookAt(cellAt({ ring: 2, step: 5 }));
    r.frames(1500);
    expect(r.system.kind).toBe('none');
    expect([r.dot.visible, r.ring.visible]).toEqual([true, false]);
  });

  it('skips seeds and plants; a hand that is pinching or selecting stops the dwell', () => {
    settings.set({ gazeDwell: true });
    const r = rig();
    r.place();
    const at = new Vector3(0, 1.15, -0.55);
    for (const kind of ['seed', 'plant']) r.target(kind, 'x', at);
    r.lookAt(at);
    const releases = r.heard('gesture:release');
    r.frames(1500);
    expect(releases).toEqual([]);
    r.target('undo', 'p', at);
    const hand = r.hand(true);
    r.frames(1500);
    hand.addComponent(HandState, { hand: 'left', pinch: false, select: true }); // a seed carried on select
    r.frames(1500);
    expect(releases).toEqual([]);
    hand.addComponent(HandState, { hand: 'left', pinch: false, select: false });
    r.frames(950);
    expect(releases).toMatchObject([{ gesture: 'press', target: { kind: 'undo', id: 'p' } }]);
  });

  it('a panel control blocks the gaze: nothing behind it is selected, and the dot lies on the panel (UX §9.8)', () => {
    settings.set({ gazeDwell: true });
    const r = rig();
    r.place();
    bus.emit('garden:changed', {
      state: garden([], [seed('s1')]),
      diff: { added: [], removed: [], changed: [] },
    });
    const releases = r.heard('gesture:release');
    const asks = r.heard('gesture:palmUp');
    // A lower control 0.55 m out on the line to a free cell of the far ring: the gaze carries on to the bed.
    const cell = cellAt({ ring: 4, step: 12 });
    const onLine = EYE.clone().addScaledVector(cell.clone().sub(EYE).normalize(), 0.55);
    r.target('panel', 'reducedMotion', onLine);
    r.lookAt(cell);
    r.frames(2000);
    expect([r.system.kind, releases, asks]).toEqual(['none', [], []]);
    expect(new Vector3().setFromMatrixPosition(r.dot.matrix).distanceTo(onLine)).toBeLessThan(1e-6);
    // The settings orb (a panel target too) on the line to another free cell: its own dwell has it, not the bed.
    const farCell = cellAt({ ring: 4, step: 11 });
    const settingsOrb = EYE.clone().addScaledVector(farCell.clone().sub(EYE).normalize(), 0.45);
    r.target('panel', 'orb', settingsOrb);
    r.lookAt(farCell);
    r.frames(2000);
    expect([r.system.kind, releases, asks]).toEqual(['none', [], []]);
    // Between two controls (3.5 cm from this one), the Listen orb on the line behind: still nothing is pressed.
    const orb = new Vector3(0, 0.79, -0.45);
    r.target('orb', 'listen', orb);
    const beside = EYE.clone().addScaledVector(orb.clone().sub(EYE).normalize(), 0.55);
    r.target('panel', 'beatRing', beside.clone().add(new Vector3(0.035, 0, 0)));
    r.lookAt(orb);
    r.frames(2000);
    expect(releases).toEqual([]);
  });

  it('a fade-out the guard refuses leaves the ring on show with nothing drawn (FR-UI-11)', () => {
    const guard = new FlashGuard();
    const reticle = new Reticle(new Group(), guard);
    const head = new Matrix4().setPosition(EYE).elements;
    const distance = new Float64Array([0.55]);
    const fill = new Float64Array(1);
    // Four changes inside a second: the fourth, the last fade-out, is refused.
    for (const [i, f] of [0.5, 0, 0.5, 0].entries()) {
      fill[0] = f;
      reticle.update(head, true, distance, fill, 1000 + 100 * i);
    }
    expect(reticle.ring.visible).toBe(true);
    expect(reticle.ring.geometry.drawRange.count).toBe(0);
  });

  it('the dot is on the forward line at the target, else 0.55 m ahead; outlined in high contrast', () => {
    settings.set({ gazeDwell: true });
    const r = rig();
    r.place();
    const orb = new Vector3(0, 0.79, -0.45);
    r.target('orb', 'listen', orb);
    r.lookAt(new Vector3(0.6, 1.15, -0.5));
    r.frames(14);
    const forward = new Vector3(0, 0, -1).transformDirection(r.head);
    const idle = new Vector3().setFromMatrixPosition(r.dot.matrix);
    expect(idle.distanceTo(EYE.clone().addScaledVector(forward, RETICLE_IDLE_DISTANCE_M))).toBeLessThan(1e-6);
    r.lookAt(orb);
    r.frames(500);
    const on = new Vector3().setFromMatrixPosition(r.dot.matrix);
    expect(on.distanceTo(orb)).toBeLessThan(1e-6);
    expect(r.ring.visible).toBe(true);
    const pixels = () =>
      Array.from(
        ((r.dot.material as import('three').MeshBasicMaterial).map!.image as { data: Uint8Array }).data,
      );
    const before = pixels();
    settings.set({ highContrast: true });
    r.frames(14);
    expect(pixels()).not.toEqual(before);
  });

  it('creates nothing per frame while the gaze dwells on a cell and on the orb (CODING_GUIDELINES §5)', () => {
    settings.set({ gazeDwell: true, dwellMs: 1200 });
    const r = rig();
    r.place();
    bus.emit('garden:changed', {
      state: garden([], [seed('s1')]),
      diff: { added: [], removed: [], changed: [] },
    });
    const orb = new Vector3(0, 0.79, -0.45);
    r.target('orb', 'listen', orb);
    const heads = [cellAt({ ring: 3, step: 6 }), orb].map((at) =>
      new Matrix4().lookAt(EYE, at, new Vector3(0, 1, 0)).setPosition(EYE),
    );
    // Real-size frame times that exist before the loop (a fraction made inside it would be boxed by the test),
    // as tests/unit/hands/HandSystem.test.ts has them. Each target for 70 frames, under the dwell, turning between.
    const FRAMES = 20_000;
    const TIMES: unknown[] = [null];
    for (let i = 1; i <= 12 * FRAMES; i++) TIMES.push((12_345_678 + i * 13.889) / 1000);
    let frame = 0;
    const round = () => {
      for (let i = 0; i < FRAMES; i++) {
        r.head.copy(heads[Math.floor(frame / 70) % 2]!);
        r.system.update(0.014, TIMES[++frame] as number);
      }
    };
    round(); // warm up: V8 settles its hidden classes and code
    // Up to ten measured rounds, the first clean one counts: V8 may still be settling in the first few.
    const costs: { gcs: number; grewBytes: number }[] = [];
    while (costs.length < 10 && !costs.some((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES)) {
      costs.push(heapCost(round));
    }
    // One boxed number a frame would be 320 000 bytes a round.
    expect(
      costs.some((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES),
      JSON.stringify(costs),
    ).toBe(true);
  });
});
