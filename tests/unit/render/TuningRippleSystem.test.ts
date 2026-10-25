// TuningRippleSystem (LLD §3.2, priority 55; FR-ROOM-12, LLD §5.8) on a fake world: the ripple starts on the
// surfaces of room:features and the signature of the same placement, whichever of the two the system hears first
// (API_SPEC §1.10 rule 4); it raises one caption per detected surface on its own entity, and emits room:tuned
// at 4.0 s. A Wanderer session is told by its signature, not by missing surfaces. The chord's three notes are
// scheduled on the audio clock in the ripple's first frame (T-142b).
import { Group, Object3D, type Mesh } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Caption } from '../../../src/core/components.js';
import { bus, clock, DEFAULT_SETTINGS, settings } from '../../../src/core/index.js';
import { WANDERER, type RoomSignature } from '../../../src/garden/index.js';
import { RIPPLE_SWEEP_AT_MS, RIPPLE_TUNED_MS } from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { TuningRippleSystem } from '../../../src/render/RenderSystems.js';
import { TuningRipple } from '../../../src/render/TuningRipple.js';

import type { Vec3 } from '../../../src/core/index.js';
import type { RoomSurfaces } from '../../../src/room/index.js';

const WALL_START_MS = 1_790_000_000_000;
const FRAME_S = 0.01;
const level = (y: number, z = -0.5) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, y, z, 1];
const SURFACES: RoomSurfaces = {
  table: { id: 't', pose: level(0.74), extents: { x: 1.2, y: 0.8 } },
  nearestWall: {
    id: 'w',
    pose: [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1.25, -2.25, 1],
    extents: { x: 4, y: 2.5 },
  },
  ceiling: { id: 'c', pose: level(2.5, 0), extents: { x: 4, y: 4.5 } },
};
const ROOM: RoomSignature = { ...WANDERER, keyRoot: 2, paletteSeed: 0xccfb3565 };
/** The audio clock in the rig: it stands still, so each note's time is AUDIO_S + its sweep's start. */
const AUDIO_S = 10;
const TABLE_AT = { x: 0, y: 0.74, z: -0.5 };
const WALL_AT = { x: 0, y: 1.25, z: -2.25 };
const CEILING_AT = { x: 0, y: 2.5, z: 0 };

/** As much of an ECS entity as the system uses, with every add and remove of its Caption. */
class FakeEntity {
  readonly data = new Map<unknown, Record<string, unknown>>();
  readonly ops: string[] = [];
  addComponent(component: unknown, values: Record<string, unknown> = {}): this {
    this.ops.push(`add ${String(values.key)}`);
    this.data.set(component, { ...values });
    return this;
  }
  removeComponent(component: unknown): this {
    this.ops.push('remove');
    this.data.delete(component);
    return this;
  }
  hasComponent(component: unknown): boolean {
    return this.data.has(component);
  }
}

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  vi.restoreAllMocks();
  clock.setSource(() => Date.now());
  settings.set(DEFAULT_SETTINGS);
});

function rig() {
  let timeS = 2_000;
  clock.setSource(() => WALL_START_MS + timeS * 1000); // core's clock runs with the frames here
  const scene = new Group();
  const caption = new FakeEntity();
  const bed = new Object3D();
  bed.position.set(0, 0.74, -0.45);
  bed.updateMatrixWorld();
  const system = new TuningRippleSystem({ scene, createEntity: () => caption } as never, {} as never, 55);
  // The BedAnchor query: RoomSystem takes the component off at a Re-place, and the callbacks run inside that.
  const unplaced = new Set<() => void>();
  const beds = {
    subscribe: (event: string, callback: () => void) => {
      if (event === 'disqualify') unplaced.add(callback);
      return () => unplaced.delete(callback);
    },
  };
  system.queries = { beds } as never;
  system.config.guard.value = new FlashGuard();
  system.config.bed.value = bed;
  /** Each chordTone call: the note, its audio time, and its place as it was in the call (null = the bed). */
  const notes: [number, number, Vec3 | null][] = [];
  const engine = {
    clock: { now: () => AUDIO_S },
    chordTone: vi.fn((note: number, time: number, at?: Vec3) =>
      notes.push([note, time, at === undefined ? null : { x: at.x, y: at.y, z: at.z }]),
    ),
  };
  system.config.engine.value = engine;
  system.init();
  const tuned: number[] = [];
  const off = bus.on('room:tuned', () => tuned.push(timeS));
  stop = () => {
    off();
    system.destroy();
  };
  /** Captions as raised: the key, when (s from `t0`), and for how long (ms). */
  const raised: { key: string; atS: number; forMs: number }[] = [];
  let t0 = timeS;
  const frame = (): void => {
    timeS = Math.round((timeS + FRAME_S) * 1000) / 1000;
    const had = caption.data.get(Caption);
    system.update(FRAME_S, timeS);
    const now = caption.data.get(Caption);
    if (now !== undefined && now !== had) {
      raised.push({
        key: String(now.key),
        atS: Number((timeS - t0).toFixed(3)),
        forMs: Number(now.expiresAt) - clock.now(),
      });
    }
  };
  const runFor = (seconds: number): void => {
    const until = timeS + seconds;
    while (timeS < until - 1e-9) frame();
  };
  /** room:features as RoomSystem emits it, inside its update: the frame then goes on to this system. */
  const features = (surfaces: RoomSurfaces = SURFACES): void => {
    t0 = Math.round((timeS + FRAME_S) * 1000) / 1000; // the ripple counts from the frame of room:features
    bus.emit('room:features', { features: { level: 1 }, surfaces });
  };
  const signature = (sig: RoomSignature = ROOM, starterSeeds = true): void =>
    bus.emit('room:signature', { signature: sig, starterSeeds });
  const tunedAfter = () => tuned.map((t) => Number((t - t0).toFixed(3)));
  const meshes = scene.children as Mesh[];
  return {
    system,
    caption,
    raised,
    frame,
    runFor,
    features,
    signature,
    tunedAfter,
    meshes,
    notes,
    setTime: (s: number) => (timeS = s),
    /** RoomSystem.replace(): BedAnchor comes off the bed. */
    replace: () => unplaced.forEach((callback) => callback()),
  };
}

const at = (ms: number) => ms / 1000;
/** Note n at its sweep's start on the audio clock, from `from` (null = the bed). */
const note = (n: number, from: Vec3 | null): [number, number, Vec3 | null] => [
  n,
  AUDIO_S + at(RIPPLE_SWEEP_AT_MS[n]!),
  from,
];

describe('TuningRippleSystem: the chord tones (T-142b, LLD §5.8)', () => {
  it("in the first frame, all three notes, each at its sweep's start on the audio clock, from its surface", () => {
    const r = rig();
    r.signature();
    r.features();
    r.frame();
    expect(r.notes).toEqual([note(0, TABLE_AT), note(1, WALL_AT), note(2, CEILING_AT)]);
    r.runFor(6);
    expect(r.notes).toHaveLength(3); // once
  });

  it("a missing surface's note rings at the bed; Wanderer rings all three at the bed", () => {
    const r = rig();
    r.signature();
    r.features({ nearestWall: SURFACES.nearestWall!, ceiling: SURFACES.ceiling! });
    r.frame();
    expect(r.notes).toEqual([note(0, null), note(1, WALL_AT), note(2, CEILING_AT)]);
    stop?.();
    const w = rig();
    w.signature(WANDERER, true);
    w.features();
    w.frame();
    expect(w.notes).toEqual([note(0, null), note(1, null), note(2, null)]);
  });

  it('a throw while the quads are aimed still leaves the chord', () => {
    const r = rig();
    vi.spyOn(TuningRipple.prototype, 'start').mockImplementation(() => {
      throw new Error('planted');
    });
    r.signature();
    r.features();
    expect(() => r.frame()).toThrow('planted');
    expect(r.notes.map(([n]) => n)).toEqual([0, 1, 2]);
  });
});

describe('TuningRippleSystem: when the ripple starts (API_SPEC §1.10 rule 4)', () => {
  it("the app's order, room:signature then room:features: captions at 0.3, 1.5, 2.7 s; room:tuned at 4.0 s, once", () => {
    const r = rig();
    r.signature();
    r.features();
    r.runFor(6);
    expect(r.raised).toEqual([
      { key: 'rippleTableSeeds', atS: at(RIPPLE_SWEEP_AT_MS[0]), forMs: 1200 },
      { key: 'rippleWalls', atS: at(RIPPLE_SWEEP_AT_MS[1]), forMs: 1200 },
      { key: 'rippleCeiling', atS: at(RIPPLE_SWEEP_AT_MS[2]), forMs: 1300 },
    ]);
    // Each caption on the system's own entity: the one before it is taken back first.
    expect(r.caption.ops).toEqual([
      'add rippleTableSeeds',
      'remove',
      'add rippleWalls',
      'remove',
      'add rippleCeiling',
    ]);
    expect(r.tunedAfter()).toEqual([at(RIPPLE_TUNED_MS)]);
  });

  it('room:features first, its signature after it in the same frame: the same ripple', () => {
    const r = rig();
    r.features();
    r.signature();
    r.runFor(6);
    expect(r.raised.map((c) => [c.key, c.atS])).toEqual([
      ['rippleTableSeeds', 0.3],
      ['rippleWalls', 1.5],
      ['rippleCeiling', 2.7],
    ]);
    expect(r.tunedAfter()).toEqual([4]);
  });

  it('room:signature alone starts nothing, and room:features alone waits for its signature', () => {
    const r = rig();
    r.signature();
    r.runFor(5);
    expect(r.raised).toEqual([]);
    expect(r.tunedAfter()).toEqual([]);
    expect(r.meshes.some((mesh) => mesh.visible)).toBe(false);
    r.features(); // the placement's surfaces: now the ripple runs
    r.runFor(5);
    expect(r.raised.map((c) => c.key)).toEqual(['rippleTableSeeds', 'rippleWalls', 'rippleCeiling']);
    stop?.();
    const s = rig();
    s.features();
    s.runFor(5);
    expect(s.raised).toEqual([]);
    expect(s.tunedAfter()).toEqual([]);
    expect(s.meshes.some((mesh) => mesh.visible)).toBe(false);
  });

  it('Re-place: room:signature with starterSeeds false, then room:features: "Table: a note."', () => {
    const r = rig();
    r.signature();
    r.features();
    r.runFor(5);
    r.signature(ROOM, false);
    r.features();
    r.runFor(5);
    expect(r.raised.map((c) => c.key)).toEqual([
      'rippleTableSeeds',
      'rippleWalls',
      'rippleCeiling',
      'rippleTableNote',
      'rippleWalls',
      'rippleCeiling',
    ]);
    expect(r.tunedAfter()).toHaveLength(2);
  });

  it('a placement that comes again mid-ripple starts the ripple again; room:tuned once, for the second', () => {
    const r = rig();
    r.signature();
    r.features();
    r.runFor(2);
    r.signature(ROOM, false);
    r.features();
    r.runFor(5);
    expect(r.raised.map((c) => c.key)).toEqual([
      'rippleTableSeeds',
      'rippleWalls',
      'rippleTableNote',
      'rippleWalls',
      'rippleCeiling',
    ]);
    expect(r.tunedAfter()).toEqual([4]);
  });
});

describe('TuningRippleSystem: what is swept and captioned (LLD §5.8)', () => {
  it('Wanderer, told by its signature: one ripple on the bed, no caption, room:tuned at 4.0 s', () => {
    const r = rig();
    const start = vi.spyOn(TuningRipple.prototype, 'start');
    r.signature(WANDERER, true);
    r.features(); // surfaces names the ceiling and the nearest wall in a Wanderer session too
    r.runFor(6);
    expect(r.raised).toEqual([]);
    expect(r.caption.ops).toEqual([]);
    expect(r.tunedAfter()).toEqual([4]);
    expect(start.mock.calls[0]?.[0]).toMatchObject({ isWanderer: true, surfaces: SURFACES, paletteSeed: 0 });
  });

  it('a paletteSeed of 0 is Wanderer too, even in a copy of the constant', () => {
    const r = rig();
    r.signature({ ...WANDERER }, false);
    r.features();
    r.runFor(5);
    expect(r.raised).toEqual([]);
  });

  it('a missing surface has no sweep and no caption; the others keep their times', () => {
    const r = rig();
    r.signature();
    r.features({ nearestWall: SURFACES.nearestWall!, ceiling: SURFACES.ceiling! });
    r.runFor(5);
    expect(r.raised.map((c) => [c.key, c.atS])).toEqual([
      ['rippleWalls', 1.5],
      ['rippleCeiling', 2.7],
    ]);
    expect(r.tunedAfter()).toEqual([4]);
  });

  it('reduced motion: the same captions and the same room:tuned; the ripple is told to glow', () => {
    settings.set({ reducedMotion: true });
    const r = rig();
    const start = vi.spyOn(TuningRipple.prototype, 'start');
    r.signature();
    r.features();
    r.runFor(5);
    expect(r.raised.map((c) => c.key)).toEqual(['rippleTableSeeds', 'rippleWalls', 'rippleCeiling']);
    expect(r.tunedAfter()).toEqual([4]);
    expect(start.mock.calls[0]?.[0]).toMatchObject({ isReducedMotion: true, isWanderer: false });
  });

  it("the table ripple spreads from the bed as drawn: the bed Object3D's world matrix", () => {
    const r = rig();
    const start = vi.spyOn(TuningRipple.prototype, 'start');
    r.signature();
    r.features();
    r.frame();
    expect(Array.from(start.mock.calls[0]![0].bedPose)).toEqual(level(0.74, -0.45));
  });
});

describe('TuningRippleSystem: the edges of a session', () => {
  it('xr:sessionEnd mid-ripple: the caption is taken back, the quads go, no room:tuned', () => {
    const r = rig();
    r.signature();
    r.features();
    r.runFor(1.6);
    expect(r.caption.hasComponent(Caption)).toBe(true);
    bus.emit('xr:sessionEnd', { visible: false });
    expect(r.caption.hasComponent(Caption)).toBe(false);
    r.runFor(5);
    expect(r.tunedAfter()).toEqual([]);
    expect(r.raised.map((c) => c.key)).toEqual(['rippleTableSeeds', 'rippleWalls']);
    expect(r.meshes.some((mesh) => mesh.visible)).toBe(false);
  });

  it("a signature of an ended session is not used by the next session's room:features", () => {
    const r = rig();
    r.signature();
    bus.emit('xr:sessionEnd', { visible: false });
    r.features();
    r.runFor(5);
    expect(r.raised).toEqual([]);
  });

  it('a frame after a pause skips the captions whose time is over, and room:tuned still comes', () => {
    const r = rig();
    r.signature();
    r.features();
    r.runFor(0.5);
    r.setTime(2_000 + 3.0); // no frames for a while (the session was hidden): the wall's time is over
    r.runFor(2);
    expect(r.raised.map((c) => c.key)).toEqual(['rippleTableSeeds', 'rippleCeiling']);
    expect(r.tunedAfter()).toHaveLength(1);
  });

  it('a Re-place mid-ripple (BedAnchor comes off): the caption is taken back, the quads go, no room:tuned', () => {
    const r = rig();
    r.signature();
    r.features();
    r.runFor(1.6);
    expect(r.caption.hasComponent(Caption)).toBe(true);
    r.replace();
    expect(r.caption.hasComponent(Caption)).toBe(false);
    r.runFor(5);
    expect(r.tunedAfter()).toEqual([]);
    expect(r.raised.map((c) => c.key)).toEqual(['rippleTableSeeds', 'rippleWalls']);
    expect(r.meshes.some((mesh) => mesh.visible)).toBe(false);
  });

  it('a throw while the quads are aimed costs the light, never the captions or room:tuned (T-150 waits on it)', () => {
    const r = rig();
    vi.spyOn(TuningRipple.prototype, 'start').mockImplementation(() => {
      throw new Error('planted');
    });
    r.signature();
    r.features();
    expect(() => r.frame()).toThrow('planted'); // src/app.ts's breaker catches it and skips this system for 1 s
    r.runFor(5);
    expect(r.raised.map((c) => c.key)).toEqual(['rippleTableSeeds', 'rippleWalls', 'rippleCeiling']);
    expect(r.tunedAfter()).toEqual([4]);
  });
});
