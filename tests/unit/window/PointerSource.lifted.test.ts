// BUG-011 (FR-SYS-07, FR-HND-04): in the garden window a click on the drawn Listen orb (2 cm over the bed) or on a
// drawn undo petal (3 cm over its cell) picks it, and a click on a far ring-0 cell still picks that cell's plant.
// The real WindowStage and camera, a fake canvas, and hands' own pickTarget: what the pointer's pinch point picks.
import { Group, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { bus } from '../../../src/core/index.js';
import { cellCentre } from '../../../src/garden/index.js';
import { createHandFrame, HIT_RADIUS_M, pickTarget } from '../../../src/hands/index.js';
import { BED_CENTRE_DEFAULT_M } from '../../../src/room/index.js';
import { LIFTED_DRAWN_RADIUS_M } from '../../../src/window/config.js';
import { PointerSource, WindowStage } from '../../../src/window/index.js';

import { at, CANVAS_HEIGHT_PX, CANVAS_WIDTH_PX, fakeCanvas } from './fakeCanvas.js';

import type { Vec3 } from '../../../src/core/index.js';
import type { PickCandidate } from '../../../src/hands/index.js';

const FLOATING_DROP_M = 0.35; // room/'s level-4 drop below the eyes, as WindowStage.test.ts has it
const ORB_LIFT_M = 0.02; // render's LISTEN_ORB_LIFT_M
const PETAL_LIFT_M = 0.03; // render's PETAL_LIFT_M
const HEAD_LIFT_M = 0.09; // a grown plant's head over its cell (D-063), as the T-168 review took it

const made: PointerSource[] = [];
afterEach(() => {
  for (const source of made.splice(0)) source.dispose();
  bus.emit('xr:sessionEnd', { visible: false });
});

/** The window's camera over the floating bed (a 4:3 tab, the fake canvas's), and world points on the bed. */
function rig() {
  const player = new Group();
  const camera = new PerspectiveCamera(50, CANVAS_WIDTH_PX / CANVAS_HEIGHT_PX, 0.001, 200);
  player.add(camera);
  const bed = new Object3D();
  const stage = new WindowStage(camera, bed);
  const head = new Vector3().setFromMatrixPosition(camera.matrixWorld);
  bed.position.set(head.x, head.y - FLOATING_DROP_M, head.z - BED_CENTRE_DEFAULT_M);
  bed.updateMatrixWorld();
  /** A bed-local point (D-029: the cell's x and y are the bed's x and z) `up` metres over the glass, in world space. */
  const onBed = (x: number, z: number, up = 0): Vec3 => {
    const p = new Vector3(x, up, z).applyMatrix4(bed.matrixWorld);
    return { x: p.x, y: p.y, z: p.z };
  };
  const cell = (ring: number, step: number, up = 0) => {
    const c = cellCentre({ ring, step }, { x: 0, y: 0 });
    return onBed(c.x, c.y, up);
  };
  /** Where a world point is drawn on the canvas, in its pixels. */
  const onCanvas = (p: Vec3) => {
    const ndc = new Vector3(p.x, p.y, p.z).project(camera);
    return { x: ((ndc.x + 1) / 2) * CANVAS_WIDTH_PX, y: ((1 - ndc.y) / 2) * CANVAS_HEIGHT_PX };
  };
  return { stage, onBed, cell, onCanvas };
}

describe('BUG-011: the pointer picks a lifted target where it is drawn', () => {
  it('a click on the drawn orb and on a drawn petal picks them; a far ring-0 cell still picks its plant', () => {
    const { stage, onBed, cell, onCanvas } = rig();
    const orb = onBed(0, 0, ORB_LIFT_M);
    const petal = cell(1, 0, PETAL_LIFT_M); // a removed plant's petal over its cell, on the user's right
    const farPlant = cell(0, 12); // ring 0, the far side: its ray passes about 3 cm from the orb
    const candidate = (kind: PickCandidate['target']['kind'], pos: Vec3): PickCandidate => ({
      target: { kind, id: kind },
      radius: HIT_RADIUS_M,
      pos,
    });
    const targets = [candidate('orb', orb), candidate('undo', petal), candidate('plant', farPlant)];
    const canvas = fakeCanvas();
    const source = new PointerSource(canvas.element, stage, targets);
    made.push(source);
    const frame = createHandFrame(source.hands[0]!);
    bus.emit('xr:sessionStart', { visible: true });
    let timeMs = 1000;
    const pickAt = (p: Vec3) => {
      const px = onCanvas(p);
      canvas.fire('pointermove', at(px.x, px.y));
      source.sample(frame.hand, (timeMs += 10), frame);
      return pickTarget(frame.pinchPos, targets)?.kind ?? null;
    };

    // The bug: the bed point behind the drawn petal is past its hit radius (behind the orb it no longer is since the
    // floating bed sits 0.35 m under the eye, BUG-053: a steeper view).
    const behind = { x: 0, y: 0, z: 0 };
    const px = onCanvas(petal);
    stage.project((px.x / CANVAS_WIDTH_PX) * 2 - 1, 1 - (px.y / CANVAS_HEIGHT_PX) * 2, behind);
    expect(Math.hypot(behind.x - petal.x, behind.y - petal.y, behind.z - petal.z)).toBeGreaterThan(
      HIT_RADIUS_M,
    );

    expect(pickAt(orb)).toBe('orb');
    expect(pickAt(petal)).toBe('undo');
    expect(pickAt(farPlant)).toBe('plant');
    // A press on the drawn orb is a pinch there, and so is its release: hover, press and release agree. (A click is
    // three samples, LLD §11: the move there, then the press, then the release.)
    expect(pickAt(orb)).toBe('orb');
    const orbPx = onCanvas(orb);
    canvas.fire('pointerdown', at(orbPx.x, orbPx.y, { buttons: 1 }));
    source.sample(frame.hand, (timeMs += 10), frame);
    expect([frame.pinch, pickTarget(frame.pinchPos, targets)?.kind]).toEqual([true, 'orb']);
    canvas.fire('pointerup', at(orbPx.x, orbPx.y));
    source.sample(frame.hand, (timeMs += 10), frame);
    expect([frame.pinch, pickTarget(frame.pinchPos, targets)?.kind]).toEqual([false, 'orb']);
  });

  it("a press on a plant's drawn head keeps the pinch on it, on the far ring and the near one; a drag holds its height (BUG-044)", () => {
    const { stage, cell, onCanvas } = rig();
    let timeMs = 1000;
    for (const head of [cell(4, 12, HEAD_LIFT_M), cell(4, 4, HEAD_LIFT_M)]) {
      const targets: PickCandidate[] = [{ target: { kind: 'plant', id: 'p' }, radius: HIT_RADIUS_M, pos: head }];
      const canvas = fakeCanvas();
      const source = new PointerSource(canvas.element, stage, targets);
      made.push(source);
      const frame = createHandFrame(source.hands[0]!);
      bus.emit('xr:sessionStart', { visible: true });
      const px = onCanvas(head);
      canvas.fire('pointermove', at(px.x, px.y));
      source.sample(frame.hand, (timeMs += 10), frame);
      expect(pickTarget(frame.pinchPos, targets)?.kind).toBe('plant');
      canvas.fire('pointerdown', at(px.x, px.y, { buttons: 1 }));
      source.sample(frame.hand, (timeMs += 10), frame);
      expect([frame.pinch, pickTarget(frame.pinchPos, targets)?.kind]).toEqual([true, 'plant']);
      // Dragged to where the head of a plant on ring 2 would be drawn: the point is there, at the same height.
      const to = cell(2, 0, HEAD_LIFT_M);
      const toPx = onCanvas(to);
      canvas.fire('pointermove', at(toPx.x, toPx.y, { buttons: 1 }));
      source.sample(frame.hand, (timeMs += 10), frame);
      expect(Math.hypot(frame.pinchPos.x - to.x, frame.pinchPos.y - to.y, frame.pinchPos.z - to.z)).toBeLessThan(0.001);
      // And let go there: the drop is where the drag was shown, not the bed point far behind it (BUG-049).
      canvas.fire('pointerup', at(toPx.x, toPx.y));
      source.sample(frame.hand, (timeMs += 10), frame);
      expect(Math.hypot(frame.pinchPos.x - to.x, frame.pinchPos.y - to.y, frame.pinchPos.z - to.z)).toBeLessThan(0.001);
    }
  });

  it('a plant taken by sight keeps the point on the bed under the pointer while held: a head it passes does not take it (BUG-049)', () => {
    const { stage, cell, onCanvas } = rig();
    const taken = cell(4, 12, HEAD_LIFT_M); // the far side: a slanted ray
    const other = cell(3, 12, HEAD_LIFT_M);
    const targets: PickCandidate[] = [taken, other].map((pos, i) => ({
      target: { kind: 'plant', id: `p${i}` },
      radius: HIT_RADIUS_M,
      pos,
    }));
    const canvas = fakeCanvas();
    const source = new PointerSource(canvas.element, stage, targets);
    made.push(source);
    const frame = createHandFrame(source.hands[0]!);
    bus.emit('xr:sessionStart', { visible: true });
    let timeMs = 1000;
    const onRay = new Vector3();
    /** The bed point under a canvas point, and how far its ray passes from `head`. */
    const behind = (px: { x: number; y: number }, head: Vec3) => {
      const p = { x: 0, y: 0, z: 0 };
      stage.project((px.x / CANVAS_WIDTH_PX) * 2 - 1, 1 - (px.y / CANVAS_HEIGHT_PX) * 2, p);
      return { p, offM: stage.closestOnRay(head, onRay) };
    };
    const send = (type: string, px: { x: number; y: number }, buttons: number) => {
      canvas.fire(type, at(px.x, px.y, { buttons }));
      source.sample(frame.hand, (timeMs += 10), frame);
      return frame.pinchPos;
    };
    const near = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

    // Pressed 2.5 cm beside the taken head: past the lifted radius, within the hit radius (the eye line takes it).
    const press = onCanvas({ x: taken.x + 0.025, y: taken.y, z: taken.z });
    const atPress = behind(press, taken);
    expect(atPress.offM).toBeGreaterThan(LIFTED_DRAWN_RADIUS_M);
    expect(atPress.offM).toBeLessThan(HIT_RADIUS_M);
    expect(near(send('pointermove', press, 0), atPress.p)).toBeLessThan(0.001);
    expect(near(send('pointerdown', press, 1), atPress.p)).toBeLessThan(0.001);
    // A small move right over the other head: the point stays on the bed under the pointer, and so does the release.
    const over = onCanvas(other);
    const atOver = behind(over, other);
    expect(atOver.offM).toBeLessThan(LIFTED_DRAWN_RADIUS_M);
    expect(near(send('pointermove', over, 1), atOver.p)).toBeLessThan(0.001);
    expect(frame.pinch).toBe(true);
    expect(near(send('pointerup', over, 0), atOver.p)).toBeLessThan(0.001);
    expect(frame.pinch).toBe(false);
  });
});
