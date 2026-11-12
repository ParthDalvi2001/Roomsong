// T-150, UX §3.3 and §3.4: what HintSystem shows for each onboarding step, the remove arrow until the first removal,
// the hand hint (FR-HND-15, D-030) and when all of it hides. On the real bus with a fake world; the atlas is drawn
// on a canvas that records nothing. Zero allocation per frame is tests/unit/onboarding/onboarding.heap.test.ts.
import {
  Color,
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
  GHOST_ACT_MS,
  GHOST_BOTTOM_M,
  GHOST_OPACITY,
  GLOW_LOW,
  GLOW_PERIOD_MS,
  GUIDE_CELL,
  HINT_FADE_MS,
  PANEL_ACCENT,
  PANEL_ACCENT_HIGH_CONTRAST,
  REMOVE_ARROW_AT_M,
} from '../../../src/ui/config.js';
import { HintSystem } from '../../../src/ui/Hints.js';
import { garden, plant } from '../garden/fixtures.js';
import { FakeEntity, FakeQuery } from '../render/seedRig.js';

import type { EventMap, Hand } from '../../../src/core/index.js';

// The atlas cells (Hints.ts `Frame`).
const POINTER = 0;
const POINTER_CLICK = 1;
const DRAG = 2;
const REMOVE = 3;
const HAND_LOST = 4;
const RING = 5;
const REMOVE_OUTLINED = 6;

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
  const ghost = () => system['ghostHands'];
  const line = () => system['line'];
  const m = new Matrix4();
  /** Joint `j` of ghost hand `slot`, world. */
  const joint = (slot: number, j: number) => {
    ghost().joints.getMatrixAt(slot * 25 + j, m);
    return new Vector3().setFromMatrixPosition(m);
  };
  return {
    xr,
    head,
    bed,
    scene,
    ghost,
    line,
    joint,
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
    expect(r.system.shows).toEqual({
      icon: -1,
      ring: -1,
      arrow: -1,
      hands: [-1, -1],
      ghostHands: 0,
      line: false,
    });
    for (const mesh of [r.icon, r.ring, r.arrow, ...r.scene.children]) expect(mesh.visible).toBe(false);
  });

  it('palm, D-087: in a headset the ghost hand turns palm up in front of the player, fading in; no icon', () => {
    const r = rig();
    step('palm');
    r.frame(HINT_FADE_MS / 2);
    expect(r.ghost().joints.visible).toBe(true);
    expect(r.ghost().material.opacity).toBeCloseTo(GHOST_OPACITY / 2, 5); // a level that rises once, not a blink
    r.settle();
    expect(r.system.shows).toMatchObject({ icon: -1, ring: -1, ghostHands: 1, line: false });
    expect(r.icon.visible).toBe(false);
    const wrist = r.joint(0, 0);
    expect(wrist.z).toBeLessThan(-0.2); // ahead of the eyes
    // FR-UI-03: inside the FoV box of a head looking 50 degrees down at the table
    const gaze = new Vector3(0, 0, -1).applyMatrix4(new Matrix4().extractRotation(r.head));
    const toWrist = wrist.clone().sub(new Vector3().setFromMatrixPosition(r.head));
    expect((gaze.angleTo(toWrist) * 180) / Math.PI).toBeLessThan(FOV_HALF_V_DEG);
    expect(wrist.x).toBeGreaterThan(0); // on the main hand's side
    settings.set({ ...DEFAULT_SETTINGS, dominantHand: 'left' });
    r.frame();
    expect(r.joint(0, 0).x).toBeLessThan(0);
    r.xr.isPresenting = false; // the garden window: a pointer has no palm to open
    r.settle();
    expect(r.system.shows).toMatchObject({ icon: -1, ghostHands: 0 });
  });

  it('the window pointer swaps its picture at most 3 times a second (FR-UI-11)', () => {
    const r = rig();
    r.xr.isPresenting = false;
    step('plant');
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
  });

  it('plant, D-087: the glowing cell; the ghost pinches, carries along the guide line and lets go at the cell', () => {
    const r = rig();
    step('plant');
    r.settle();
    const at = centre(GUIDE_CELL);
    expect(r.system.shows).toMatchObject({ icon: -1, ring: RING, ghostHands: 1, line: true });
    expect(r.ring.position.x).toBeCloseTo(at.x, 6);
    expect(r.ring.position.z).toBeCloseTo(at.y, 6);
    const cell = new Vector3(at.x, 0.02, at.y).applyMatrix4(r.bed.matrixWorld);
    expect(r.line().head.position.distanceTo(cell)).toBeLessThan(1e-6); // the arrowhead on the cell
    // Over one act the thumb tip meets the index tip (the pinch) and leaves it again (the drop)
    let closest = Infinity;
    let widest = 0;
    for (let ms = 0; ms < GHOST_ACT_MS; ms += 20) {
      r.frame(20);
      const gap = r.joint(0, 4).distanceTo(r.joint(0, 9));
      closest = Math.min(closest, gap);
      widest = Math.max(widest, gap);
    }
    expect(closest).toBeLessThan(0.005);
    expect(widest).toBeGreaterThan(0.03);
  });

  it('plant from the seed: the guide line starts at the palm the seed rests on', () => {
    const r = rig();
    r.handOf.left.data.get(HandState)!.tracked = true;
    r.handOf.left.getVectorView(HandState, 'palmPos').set([-0.1, 1.0, -0.3]);
    bus.emit('garden:seedOut', { seed: { id: 's' } as never, hand: 'left' });
    step('plant');
    r.frame();
    const start = r.line().at(0, new Vector3());
    expect(start.toArray().map((v) => Math.round(v * 1000) / 1000)).toEqual([-0.1, 1.035, -0.3]);
  });

  it('plant in the garden window: a pointer that clicks, standing still; with Reduce motion the ghost holds still', () => {
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
    r.frame();
    const still = r.joint(0, 9);
    for (let i = 0; i < 150; i++) r.frame();
    expect(r.joint(0, 9).distanceTo(still)).toBe(0);
  });

  it('grow and move: the hint ring round the newest plant; the ghost lifts it, then slides it; the window drags', () => {
    const r = rig();
    const plants = [plant('a', 1, 2), plant('b', 3, 6), plant('c', 2, 10)];
    bus.emit('garden:changed', { state: garden(plants), diff: { added: ['c'], removed: [], changed: [] } });
    step('grow');
    r.settle();
    const at = centre(plants[2]!.cell);
    expect(r.system.shows).toMatchObject({ icon: -1, ring: RING, ghostHands: 1, line: true });
    expect([r.ring.position.x, r.ring.position.z]).toEqual([at.x, at.y]);
    const base = new Vector3(at.x, 0.05, at.y).applyMatrix4(r.bed.matrixWorld);
    expect(r.line().head.position.y - base.y).toBeCloseTo(0.1, 6); // the arrowhead straight above the plant
    step('move');
    r.frame();
    expect(r.system.shows).toMatchObject({ ring: RING, ghostHands: 1, line: true });
    expect(r.line().head.position.y).toBeCloseTo(base.y, 6); // along the bed
    r.xr.isPresenting = false;
    r.frame();
    expect(r.system.shows).toMatchObject({ icon: DRAG, ring: RING, ghostHands: 0 });
    // An empty bed has no newest plant: nothing to ring, nothing to act out.
    bus.emit('garden:changed', { state: garden([]), diff: { added: [], removed: [], changed: [] } });
    r.xr.isPresenting = true;
    r.frame();
    expect(r.system.shows).toMatchObject({ icon: -1, ring: -1, ghostHands: 0 });
  });

  it('listen: two ghost palms pushed out in a headset, a click over the orb in the garden window', () => {
    const r = rig();
    step('listen');
    r.frame();
    expect(r.system.shows).toMatchObject({ icon: -1, ghostHands: 2, line: false });
    expect(r.joint(0, 0).x).toBeLessThan(r.joint(1, 0).x); // the left hand on the left
    r.xr.isPresenting = false;
    r.frame();
    expect(r.system.shows.icon).toBe(POINTER_CLICK);
  });

  it('orb: both ghost hands and a line to the back of the other hand; none in one-hand or gaze mode', () => {
    const r = rig();
    step('orb');
    r.frame();
    expect(r.system.shows).toMatchObject({ ghostHands: 2, line: true });
    settings.set({ ...DEFAULT_SETTINGS, oneHand: true });
    r.frame();
    expect(r.system.shows.ghostHands).toBe(0);
  });

  it('the window icon faces the eyes wherever the bed points', () => {
    const r = rig();
    r.xr.isPresenting = false;
    r.bed.rotation.y = 0.6;
    r.bed.updateMatrixWorld(true);
    step('listen');
    r.frame();
    r.bed.updateMatrixWorld(true);
    const facing = r.icon.getWorldQuaternion(new Quaternion());
    const eyes = new Quaternion().setFromRotationMatrix(r.head);
    expect(facing.angleTo(eyes)).toBeLessThan(1e-6);
  });
  it('hides everything in Listen and with hints off, and shows it again after', () => {
    const r = rig();
    step('plant');
    r.settle();
    bus.emit('listen:enter', {});
    r.settle();
    expect(r.system.shows).toMatchObject({ icon: -1, ring: -1, ghostHands: 0 });
    expect([r.icon.visible, r.ring.visible, r.ghost().joints.visible]).toEqual([false, false, false]);
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
    expect([r.system.shows.arrow, firstU()]).toEqual([REMOVE, 0.75]); // cell 3: the last of the first row
    settings.set({ ...DEFAULT_SETTINGS, highContrast: true });
    r.frame();
    expect([r.system.shows.arrow, firstU()]).toEqual([REMOVE_OUTLINED, 0.5]); // cell 6: the third of the second row
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

describe('the guide glow (D-084, FR-UI-11)', () => {
  const rounded = (colour: Color) => colour.toArray().map((v) => Math.round(v * 1e4) / 1e4);

  it('tints the hint ring with the accent and breathes it slowly: once in GLOW_PERIOD_MS (2.4 s), never 3 times a second', () => {
    const r = rig();
    step('plant');
    const reds: number[] = [];
    for (let ms = 0; ms < 2 * GLOW_PERIOD_MS; ms += 14) {
      r.frame();
      reds.push(r.ring.material.color.r);
    }
    const peak = Math.max(...reds);
    const low = Math.min(...reds);
    expect(GLOW_PERIOD_MS).toBe(2400); // 10 Nov: one a second read as blinking on the headset
    expect(peak).toBeCloseTo(new Color(PANEL_ACCENT).r, 2);
    expect(low).toBeCloseTo(GLOW_LOW * peak, 3);
    // a flash is a rise past the middle: two breaths hold one or two of them
    const mid = (peak + low) / 2;
    const rises = reds.filter((v, i) => i > 0 && v >= mid && (reds[i - 1] ?? 0) < mid).length;
    expect(rises).toBeGreaterThanOrEqual(1);
    expect(rises).toBeLessThanOrEqual(2);
  });

  it('glows steady in the full accent with Reduce motion, and in the high-contrast accent in high contrast', () => {
    settings.set({ ...DEFAULT_SETTINGS, reducedMotion: true });
    const r = rig();
    step('plant');
    for (let i = 0; i < 100; i++) {
      r.frame();
      expect(rounded(r.ring.material.color)).toEqual(rounded(new Color(PANEL_ACCENT)));
    }
    settings.set({ ...DEFAULT_SETTINGS, reducedMotion: true, highContrast: true });
    r.frame();
    expect(rounded(r.ring.material.color)).toEqual(rounded(new Color(PANEL_ACCENT_HIGH_CONTRAST)));
  });
});
