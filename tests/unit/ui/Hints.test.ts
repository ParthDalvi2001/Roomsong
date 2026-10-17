// T-150, UX §3.3 and §3.4: what HintSystem shows for each onboarding step, the remove arrow until the first removal,
// the hand hint (FR-HND-15, D-030) and when all of it hides. On the real bus with a fake world; the atlas is drawn
// on a canvas that records nothing. Zero allocation per frame is tests/unit/onboarding/onboarding.heap.test.ts.
import {
  Group,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Mesh,
  type MeshBasicMaterial,
} from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bus, DEFAULT_SETTINGS, settings } from '../../../src/core/index.js';
import { cellCentre } from '../../../src/garden/index.js';
import { HAND_HINT_MAX_MS, HandState } from '../../../src/hands/index.js';
import {
  FOV_HALF_H_DEG,
  FOV_HALF_V_DEG,
  GHOST_BOTTOM_M,
  GHOST_TOP_M,
  GUIDE_CELL,
  HINT_FADE_MS,
  PALM_ICON_LIFT_M,
  REMOVE_ARROW_AT_M,
} from '../../../src/ui/config.js';
import { HintSystem } from '../../../src/ui/Hints.js';
import { garden, plant } from '../garden/fixtures.js';
import { FakeEntity, FakeQuery } from '../render/seedRig.js';

import type { EventMap, Hand } from '../../../src/core/index.js';

// The atlas cells (Hints.ts `Frame`).
const PINCH_OPEN = 0;
const PINCH_CLOSED = 1;
const POINTER = 2;
const POINTER_CLICK = 3;
const PALM = 4;
const PALMS_OUT = 5;
const PULL = 6;
const DRAG = 7;
const REMOVE = 8;
const HAND_LOST = 9;
const RING = 10;
const REMOVE_OUTLINED = 11;

const live: HintSystem[] = [];
afterEach(() => {
  for (const system of live.splice(0)) system.destroy();
  settings.set({ ...DEFAULT_SETTINGS });
  bus.emit('xr:sessionEnd', { visible: false });
  vi.unstubAllGlobals();
});

type HintMesh = Mesh<never, MeshBasicMaterial>;

function rig() {
  // A canvas whose context takes every call and draws nothing: the atlas code runs, no pixels are checked.
  const ctx = new Proxy({}, { get: (target, key) => (target as never)[key] ?? (() => {}) });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
  const xr = { isPresenting: true };
  // The seated head of UX §2: 1.2 m up, looking 50 degrees down at the bed 0.45 m ahead.
  const head = new Matrix4().compose(
    new Vector3(0, 1.2, 0),
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (-50 * Math.PI) / 180),
    new Vector3(1, 1, 1),
  );
  const bed = new Group();
  bed.position.set(0, 0.74, -0.45);
  bed.updateMatrixWorld(true);
  const scene = new Group();
  const world = {
    scene,
    player: { head: { matrixWorld: head } },
    camera: { matrixWorld: head },
    renderer: { xr },
  };
  const hands = new FakeQuery();
  const handOf = { left: new FakeEntity(), right: new FakeEntity() };
  for (const hand of ['left', 'right'] as const) hands.add(handOf[hand].addComponent(HandState, { hand }));
  const system = new HintSystem(world as never, {} as never, 61);
  system.queries = { hands } as never;
  system.config.bed.value = bed;
  system.init();
  live.push(system);
  const [icon, ring, arrow] = bed.children as HintMesh[];
  const handMeshes = scene.children as HintMesh[];
  let timeS = 12_345.678;
  const frame = (ms = 14) => system.update(ms / 1000, (timeS += ms / 1000));
  /** Frames enough for every fade to end. */
  const settle = () => {
    for (let i = 0; i < 20; i++) frame();
  };
  return {
    xr,
    head,
    bed,
    system,
    icon: icon!,
    ring: ring!,
    arrow: arrow!,
    handMeshes,
    handOf,
    frame,
    settle,
  };
}

const step = (s: EventMap['onboarding:step']['step']) => bus.emit('onboarding:step', { step: s });
const centre = (cell: { ring: number; step: number }) => cellCentre(cell, { x: 0, y: 0 });

describe('HintSystem: the onboarding steps (UX §3.3)', () => {
  it('off: nothing shows and nothing is drawn', () => {
    const r = rig();
    r.settle();
    expect(r.system.shows).toEqual({ icon: -1, ring: -1, arrow: -1, hands: [-1, -1] });
    for (const mesh of [r.icon, r.ring, r.arrow, ...r.handMeshes]) expect(mesh.visible).toBe(false);
  });

  it('palm: the open hand over the seed supply, fading in over HINT_FADE_MS', () => {
    const r = rig();
    step('palm');
    r.frame(HINT_FADE_MS / 2);
    expect(r.icon.visible).toBe(true);
    expect(r.icon.material.opacity).toBeCloseTo(0.5, 5); // a level that rises once, not a blink
    r.settle();
    expect(r.system.shows.icon).toBe(PALM);
    expect(r.icon.material.opacity).toBe(1);
    expect(r.icon.position.toArray()).toEqual([0, PALM_ICON_LIFT_M, 0]);
    expect(r.system.shows.ring).toBe(-1);
    r.xr.isPresenting = false; // the garden window: a pointer has no palm to open
    r.frame();
    expect(r.system.shows.icon).toBe(-1);
  });

  it('the ghost swaps its picture at most 3 times a second, in a headset and in the window (FR-UI-11)', () => {
    const r = rig();
    step('plant');
    for (const isXr of [true, false]) {
      r.xr.isPresenting = isXr;
      r.frame();
      let swaps = 0;
      let shown = r.icon.geometry;
      const frames = 720; // 10 s at 72 Hz
      for (let i = 0; i < frames; i++) {
        r.frame(1000 / 72);
        if (r.icon.geometry !== shown) swaps++;
        shown = r.icon.geometry;
      }
      expect(swaps / (frames / 72)).toBeLessThanOrEqual(3);
      expect(swaps).toBeGreaterThan(0); // it does loop
    }
  });

  it('plant: the glowing cell, and the ghost pinch looping down to it and up again', () => {
    const r = rig();
    step('plant');
    r.settle();
    const at = centre(GUIDE_CELL);
    expect(r.system.shows.ring).toBe(RING);
    expect(r.ring.position.x).toBeCloseTo(at.x, 6);
    expect(r.ring.position.z).toBeCloseTo(at.y, 6);
    const seen = new Set<number>();
    let lowest = Infinity;
    let highest = -Infinity;
    for (let i = 0; i < 150; i++) {
      r.frame();
      seen.add(r.system.shows.icon);
      lowest = Math.min(lowest, r.icon.position.y);
      highest = Math.max(highest, r.icon.position.y);
      expect(r.icon.position.x).toBeCloseTo(at.x, 6);
    }
    expect([...seen].sort()).toEqual([PINCH_OPEN, PINCH_CLOSED]);
    expect(lowest).toBeCloseTo(GHOST_BOTTOM_M, 3);
    expect(highest).toBeGreaterThan(GHOST_TOP_M - 0.005);
  });

  it('plant in the garden window: a pointer that clicks, standing still; reduced motion keeps the ghost still too', () => {
    const r = rig();
    r.xr.isPresenting = false;
    step('plant');
    const seen = new Set<number>();
    for (let i = 0; i < 150; i++) {
      r.frame();
      seen.add(r.system.shows.icon);
      expect(r.icon.position.y).toBe(GHOST_BOTTOM_M);
    }
    expect([...seen].sort()).toEqual([POINTER, POINTER_CLICK]);
    r.xr.isPresenting = true;
    settings.set({ ...DEFAULT_SETTINGS, reducedMotion: true });
    for (let i = 0; i < 150; i++) {
      r.frame();
      expect(r.icon.position.y).toBe(GHOST_BOTTOM_M);
    }
  });

  it('grow and move: the hint ring round the newest plant, with the pull and then the drag icon', () => {
    const r = rig();
    const plants = [plant('a', 1, 2), plant('b', 3, 6), plant('c', 2, 10)];
    bus.emit('garden:changed', { state: garden(plants), diff: { added: ['c'], removed: [], changed: [] } });
    step('grow');
    r.settle();
    const at = centre(plants[2]!.cell);
    expect(r.system.shows).toMatchObject({ icon: PULL, ring: RING });
    expect([r.ring.position.x, r.ring.position.z]).toEqual([at.x, at.y]);
    expect([r.icon.position.x, r.icon.position.z]).toEqual([at.x, at.y]);
    step('move');
    r.frame();
    expect(r.system.shows).toMatchObject({ icon: DRAG, ring: RING });
    // An empty bed has no newest plant: nothing to ring.
    bus.emit('garden:changed', { state: garden([]), diff: { added: [], removed: [], changed: [] } });
    r.frame();
    expect(r.system.shows).toMatchObject({ icon: -1, ring: -1 });
  });

  it('listen: two palms in a headset, a click over the orb in the garden window', () => {
    const r = rig();
    step('listen');
    r.frame();
    expect(r.system.shows.icon).toBe(PALMS_OUT);
    r.xr.isPresenting = false;
    r.frame();
    expect(r.system.shows.icon).toBe(POINTER_CLICK);
  });

  it('faces the eyes wherever the bed points, and mirrors for a left-handed player (FR-HND-13)', () => {
    const r = rig();
    r.bed.rotation.y = 0.6;
    r.bed.updateMatrixWorld(true);
    step('palm');
    r.frame();
    r.bed.updateMatrixWorld(true);
    const facing = r.icon.getWorldQuaternion(new Quaternion());
    const eyes = new Quaternion().setFromRotationMatrix(r.head);
    expect(facing.angleTo(eyes)).toBeLessThan(1e-6);
    expect(r.icon.scale.x).toBeGreaterThan(0);
    settings.set({ ...DEFAULT_SETTINGS, dominantHand: 'left' });
    r.frame();
    expect(r.icon.scale.x).toBeLessThan(0);
  });

  it('hides everything in Listen and with hints off, and shows it again after', () => {
    const r = rig();
    step('plant');
    r.settle();
    bus.emit('listen:enter', {});
    r.settle();
    expect(r.system.shows).toMatchObject({ icon: -1, ring: -1 });
    expect([r.icon.visible, r.ring.visible]).toEqual([false, false]);
    bus.emit('listen:exit', { timedOut: false });
    r.frame();
    expect(r.system.shows.ring).toBe(RING);
    settings.set({ ...DEFAULT_SETTINGS, hintsEnabled: false });
    r.frame();
    expect(r.system.shows).toMatchObject({ icon: -1, ring: -1 });
  });
});

describe('HintSystem: the remove arrow (UX §3.4)', () => {
  const drag = (hand: Hand) =>
    bus.emit('gesture:drag', {
      hand,
      target: { kind: 'plant', id: 'a' },
    } as unknown as EventMap['gesture:drag']);

  it('shows on the rim on the dragging hand side, pointing away, until the release', () => {
    const r = rig();
    drag('right');
    r.settle();
    expect(r.system.shows.arrow).toBe(REMOVE);
    expect(r.arrow.position.x).toBe(REMOVE_ARROW_AT_M);
    expect(r.arrow.scale.x).toBeGreaterThan(0);
    bus.emit('gesture:release', { hand: 'left' } as EventMap['gesture:release']); // the other hand: no change
    r.frame();
    expect(r.system.shows.arrow).toBe(REMOVE);
    bus.emit('gesture:release', { hand: 'right' } as EventMap['gesture:release']);
    r.settle();
    expect([r.system.shows.arrow, r.arrow.visible]).toEqual([-1, false]);
    drag('left');
    r.frame();
    expect(r.arrow.position.x).toBe(-REMOVE_ARROW_AT_M);
    expect(r.arrow.scale.x).toBeLessThan(0);
    bus.emit('gesture:trackingLost', { hand: 'left' } as EventMap['gesture:trackingLost']);
    r.frame();
    expect(r.system.shows.arrow).toBe(-1);
  });

  it('in high contrast has a cream outline round its charcoal one: its own cell of the atlas (FR-UI-05, BUG-008)', () => {
    const r = rig();
    const firstU = (): number => (r.arrow.geometry as BufferGeometry).getAttribute('uv').getX(0);
    drag('right');
    r.settle();
    expect([r.system.shows.arrow, firstU()]).toEqual([REMOVE, 0]); // cell 8: the first of the third row
    settings.set({ ...DEFAULT_SETTINGS, highContrast: true });
    r.frame();
    expect([r.system.shows.arrow, firstU()]).toEqual([REMOVE_OUTLINED, 0.75]); // cell 11: the last of that row
    expect(r.arrow.visible).toBe(true); // the same quad: no draw call more
  });

  it('is not shown again after the first removal', () => {
    const r = rig();
    drag('right');
    bus.emit('garden:removed', { plantId: 'a', undoToken: {} as never, expiresAt: 0 });
    r.frame();
    expect(r.system.shows.arrow).toBe(-1);
    drag('right');
    r.frame();
    expect(r.system.shows.arrow).toBe(-1);
  });
});

describe('HintSystem: the hand hint (FR-HND-15, D-030)', () => {
  const lost = (hand: Hand, held: EventMap['hands:lost']['held']) => bus.emit('hands:lost', { hand, held });

  it('a hand lost while it holds something: the palm in a dashed ring, held in the FoV box, until hands:found', () => {
    const r = rig();
    r.frame();
    // Last seen far to the right and behind: the hint comes to the edge of the box.
    r.handOf.right.getVectorView(HandState, 'palmPos').set([1, 1.1, 0.4]);
    lost('right', { kind: 'seed', id: 's1' });
    r.frame(75); // UX §3.4: in over 150 ms (a frame counts 100 ms at most)
    r.frame(75);
    const mesh = r.handMeshes[1]!;
    expect(r.system.shows.hands).toEqual([-1, HAND_LOST]);
    expect(mesh.material.opacity).toBe(1);
    const local = mesh.position.clone().applyMatrix4(r.head.clone().invert());
    const yaw = (Math.atan2(local.x, -local.z) * 180) / Math.PI;
    const pitch = (Math.atan2(local.y, Math.hypot(local.x, local.z)) * 180) / Math.PI;
    expect(Math.abs(yaw)).toBeLessThanOrEqual(FOV_HALF_H_DEG);
    expect(Math.abs(pitch)).toBeLessThanOrEqual(FOV_HALF_V_DEG);
    bus.emit('hands:found', { hand: 'right' });
    r.frame(100);
    expect(r.system.shows.hands).toEqual([-1, -1]);
    expect(mesh.material.opacity).toBeCloseTo(0.5, 5); // out over 200 ms
  });

  it('goes HAND_HINT_MAX_MS after the loss with the hand still away; an empty hand gets none', () => {
    const r = rig();
    r.frame();
    lost('left', { kind: 'plant', id: 'a' });
    r.frame(HAND_HINT_MAX_MS - 20);
    expect(r.system.shows.hands[0]).toBe(HAND_LOST);
    r.frame(40);
    expect(r.system.shows.hands[0]).toBe(-1);
    lost('right', null);
    r.frame();
    expect(r.system.shows.hands).toEqual([-1, -1]);
  });

  it('shows with hints off too (it says what happened to what the hand held); xr:sessionEnd takes it back', () => {
    const r = rig();
    settings.set({ ...DEFAULT_SETTINGS, hintsEnabled: false });
    r.frame();
    lost('left', { kind: 'seed', id: 's1' });
    r.frame();
    expect(r.system.shows.hands[0]).toBe(HAND_LOST);
    bus.emit('xr:sessionEnd', { visible: false });
    r.frame();
    expect(r.system.shows.hands[0]).toBe(-1);
  });
});
