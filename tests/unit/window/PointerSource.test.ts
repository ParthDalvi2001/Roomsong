// The garden window's input (FR-SYS-07, LLD §11, TC-E2E-14's click): a pointer as one hand's pinch. A fake canvas
// and a fake stage: nothing here shows what a browser delivers. The stage itself is in WindowStage.test.ts, the
// per-frame heap cost in PointerSource.heap.test.ts.
import { afterEach, describe, expect, it } from 'vitest';

import { bus, DEFAULT_SETTINGS, settings } from '../../../src/core/index.js';
import { createHandFrame, HIT_RADIUS_M } from '../../../src/hands/index.js';
import { PointerSource } from '../../../src/window/index.js';

import { at, fakeCanvas } from './fakeCanvas.js';

import type { Vec3 } from '../../../src/core/index.js';
import type { PickCandidate } from '../../../src/hands/index.js';
import type { WindowStage } from '../../../src/window/index.js';

/** Screen x, y (NDC) lands on the plane y = 1 at (x, 1, -y); above y = 0.9 the ray misses (the sky). */
const stage = {
  project(ndcX: number, ndcY: number, out: Vec3): boolean {
    if (ndcY > 0.9) return false;
    out.x = ndcX;
    out.y = 1;
    out.z = -ndcY;
    return true;
  },
  restPoint(out: Vec3): Vec3 {
    out.x = 9;
    out.y = 1;
    out.z = 9;
    return out;
  },
} as unknown as WindowStage;
const REST = { x: 9, y: 1, z: 9 };

const made: PointerSource[] = [];
afterEach(() => {
  for (const source of made.splice(0)) source.dispose();
  settings.set(DEFAULT_SETTINGS);
  bus.emit('xr:sessionEnd', { visible: false });
});

function rig(targets: PickCandidate[] = []) {
  const canvas = fakeCanvas();
  const source = new PointerSource(canvas.element, stage, targets);
  made.push(source);
  const frame = createHandFrame(source.hands[0]!);
  let timeMs = 1000;
  /** One frame's sample of the source's hand: what it said, copied. */
  const sample = () => {
    timeMs += 10;
    source.sample(frame.hand, timeMs, frame);
    return { tracked: frame.tracked, pinch: frame.pinch, select: frame.select, at: { ...frame.pinchPos } };
  };
  return { canvas, source, frame, sample };
}
const enter = () => bus.emit('xr:sessionStart', { visible: true });

describe('PointerSource: one hand, from Enter on (LLD §11)', () => {
  it('reports the dominant hand only; asked for the other one, that hand is untracked', () => {
    settings.set({ dominantHand: 'left' });
    const { source } = rig();
    expect(source.hands).toEqual(['left']);
    enter();
    const other = createHandFrame('right');
    source.sample('right', 10, other);
    expect(other.tracked).toBe(false);
  });

  it('follows the dominant hand when the setting changes after it was made (a restored setting)', () => {
    const { source } = rig(); // right, the default
    enter();
    settings.set({ dominantHand: 'left' });
    expect(source.hands).toEqual(['left']);
    const left = createHandFrame('left');
    const right = createHandFrame('right');
    source.sample('left', 10, left);
    source.sample('right', 10, right);
    expect([left.tracked, right.tracked]).toEqual([true, false]);
  });

  it('is untracked before Enter, and a press before it is not kept', () => {
    const { canvas, sample } = rig();
    canvas.fire('pointerdown', at(600, 300));
    expect(sample().tracked).toBe(false);
    enter();
    expect(sample()).toMatchObject({ tracked: true, pinch: false, at: REST });
    expect(sample().pinch).toBe(false);
  });

  it('before the first pointer event the hand waits at the rest spot, palm up', () => {
    const { frame, sample } = rig();
    enter();
    sample();
    expect(frame.pinchPos).toEqual(REST);
    expect(frame.palmPos).toEqual(REST);
    expect(frame.palmNormal).toEqual({ x: 0, y: 1, z: 0 });
    expect(frame.velocity).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('takes over the canvas for touch, and captures the pointer on a press', () => {
    const { canvas } = rig();
    expect(canvas.element.style.touchAction).toBe('none');
    enter();
    canvas.fire('pointerdown', at(600, 300));
    expect(canvas.captured).toEqual([1]);
  });
});

describe('PointerSource: the latched button (LLD §11)', () => {
  it('one click between two frames is three samples: the move, the press, the release', () => {
    const { canvas, sample } = rig();
    enter();
    canvas.fire('pointermove', at(600, 300));
    canvas.fire('pointerdown', at(600, 300));
    canvas.fire('pointerup', at(600, 300));
    const place = { x: 0.5, y: 1, z: -0 };
    expect(sample()).toEqual({ tracked: true, pinch: false, select: false, at: place });
    expect(sample()).toEqual({ tracked: true, pinch: true, select: true, at: place });
    expect(sample()).toEqual({ tracked: true, pinch: false, select: false, at: place });
    expect(sample().pinch).toBe(false);
  });

  it('a touch that lands somewhere new is reported there first, and pressed in the next sample', () => {
    const { canvas, sample } = rig();
    enter();
    canvas.fire('pointerdown', at(200, 450));
    expect(sample()).toMatchObject({ pinch: false, at: { x: -0.5, z: 0.5 } });
    expect(sample()).toMatchObject({ pinch: true, at: { x: -0.5, z: 0.5 } });
    canvas.fire('pointerup', at(200, 450));
    expect(sample().pinch).toBe(false);
  });

  it('moves between two frames are one move; a drag keeps the pinch and follows the pointer', () => {
    const { canvas, sample } = rig();
    enter();
    canvas.fire('pointermove', at(500, 300));
    canvas.fire('pointermove', at(550, 300));
    canvas.fire('pointermove', at(600, 300));
    expect(sample()).toMatchObject({ pinch: false, at: { x: 0.5 } });
    canvas.fire('pointerdown', at(600, 300));
    expect(sample().pinch).toBe(true);
    canvas.fire('pointermove', at(400, 150, { buttons: 1 }));
    canvas.fire('pointermove', at(200, 150, { buttons: 1 }));
    expect(sample()).toMatchObject({ pinch: true, at: { x: -0.5, z: -0.5 } });
    canvas.fire('pointerup', at(200, 150));
    expect(sample()).toMatchObject({ pinch: false, at: { x: -0.5, z: -0.5 } });
  });

  it('a press and a drag before the next frame: the press is where it began, the drag after it', () => {
    const { canvas, sample } = rig();
    enter();
    canvas.fire('pointermove', at(600, 300));
    sample();
    canvas.fire('pointerdown', at(600, 300, { buttons: 1 }));
    canvas.fire('pointermove', at(200, 300, { buttons: 1 }));
    expect(sample()).toMatchObject({ pinch: true, at: { x: 0.5 } });
    expect(sample()).toMatchObject({ pinch: true, at: { x: -0.5 } });
  });

  it('ignores the other mouse buttons and every pointer but the primary one; a cancel is a release', () => {
    const { canvas, sample } = rig();
    enter();
    canvas.fire('pointermove', at(600, 300));
    canvas.fire('pointerdown', at(600, 300, { button: 2, buttons: 2 }));
    canvas.fire('pointerdown', at(200, 300, { isPrimary: false, buttons: 1 }));
    sample();
    expect(sample()).toMatchObject({ pinch: false, at: { x: 0.5 } });
    canvas.fire('pointerdown', at(600, 300, { buttons: 1 }));
    expect(sample().pinch).toBe(true);
    canvas.fire('pointercancel', at(600, 300, { button: -1 }));
    expect(sample().pinch).toBe(false);
  });

  it('a release that comes as a move is a release: the main button let go while another is held', () => {
    const { canvas, sample } = rig();
    enter();
    canvas.fire('pointermove', at(600, 300));
    canvas.fire('pointerdown', at(600, 300, { buttons: 1 }));
    sample();
    expect(sample().pinch).toBe(true);
    // A chord: the browser sends the second button's press and the main one's release as pointermove events.
    canvas.fire('pointermove', at(600, 300, { button: 2, buttons: 3 }));
    expect(sample().pinch).toBe(true);
    canvas.fire('pointermove', at(600, 300, { button: 0, buttons: 2 }));
    expect(sample().pinch).toBe(false);
    canvas.fire('pointerup', at(600, 300, { button: 2, buttons: 0 }));
    expect(sample().pinch).toBe(false);
  });

  it('a release lost outside the window is taken from the next move: the hand moves there, then lets go', () => {
    const { canvas, sample } = rig();
    enter();
    canvas.fire('pointerdown', at(600, 300, { buttons: 1 }));
    sample();
    expect(sample().pinch).toBe(true);
    canvas.fire('pointermove', at(200, 300));
    expect(sample()).toMatchObject({ pinch: true, at: { x: -0.5 } });
    expect(sample()).toMatchObject({ pinch: false, at: { x: -0.5 } });
  });

  it('a pointer above the horizon keeps the last point on the bed plane', () => {
    const { canvas, sample } = rig();
    enter();
    canvas.fire('pointermove', at(600, 300));
    sample();
    canvas.fire('pointermove', at(200, 15));
    expect(sample().at).toEqual({ x: 0.5, y: 1, z: -0 });
  });
});

describe('PointerSource: tracking follows the page (LLD §11)', () => {
  it('a hidden page is untracked and changes nothing; the press it held is there when the page is back', () => {
    const { canvas, frame, sample } = rig();
    enter();
    canvas.fire('pointerdown', at(600, 300));
    sample();
    sample();
    bus.emit('xr:visibility', { visible: false });
    canvas.fire('pointerup', at(600, 300));
    expect(sample()).toMatchObject({ tracked: false, pinch: true, at: { x: 0.5 } });
    expect(frame.palmNormal).toEqual({ x: 0, y: 1, z: 0 });
    bus.emit('xr:visibility', { visible: true });
    expect(sample()).toMatchObject({ tracked: true, pinch: false });
  });

  it('the end of the window forgets everything: the next one starts at the rest spot, unpressed', () => {
    const { canvas, sample } = rig();
    enter();
    canvas.fire('pointerdown', at(600, 300));
    sample();
    sample();
    bus.emit('xr:sessionEnd', { visible: false });
    expect(sample().tracked).toBe(false);
    enter();
    expect(sample()).toMatchObject({ tracked: true, pinch: false, at: REST });
  });

  it('dispose stops listening to the canvas and the bus', () => {
    const { canvas, source, sample } = rig();
    expect(canvas.listening()).toBe(4);
    source.dispose();
    expect(canvas.listening()).toBe(0);
    enter();
    expect(sample().tracked).toBe(false);
  });
});

describe('PointerSource: the palm, where a delivered seed rests (LLD §11)', () => {
  const near: Vec3 = { x: 0.5 + 0.03, y: 1, z: 0 };
  const candidate = (kind: PickCandidate['target']['kind'], pos: Vec3): PickCandidate => ({
    target: { kind, id: kind },
    radius: HIT_RADIUS_M,
    pos,
  });

  it('is the pinch point over open ground', () => {
    const { canvas, frame, sample } = rig([candidate('plant', { x: -0.5, y: 1, z: 0 })]);
    enter();
    canvas.fire('pointermove', at(600, 300));
    sample();
    expect(frame.palmPos).toEqual(frame.pinchPos);
  });

  it('steps aside to the rest spot while a plant, the orb or the undo petal is in reach', () => {
    for (const kind of ['plant', 'orb', 'undo'] as const) {
      const { canvas, frame, sample } = rig([candidate(kind, near)]);
      enter();
      canvas.fire('pointermove', at(600, 300));
      sample();
      expect(frame.palmPos, kind).toEqual(REST);
      expect(frame.pinchPos.x).toBe(0.5);
    }
  });

  it('a target is in reach within its own radius, which may be more than the hit radius', () => {
    const wide = { ...candidate('plant', { x: 0.5 + 0.06, y: 1, z: 0 }), radius: 0.07 };
    const { canvas, frame, sample } = rig([wide]);
    enter();
    canvas.fire('pointermove', at(600, 300));
    sample();
    expect(frame.palmPos).toEqual(REST);
  });

  it('does not step aside for the seed itself or the settings orb', () => {
    const { canvas, frame, sample } = rig([candidate('seed', near), candidate('panel', near)]);
    enter();
    canvas.fire('pointermove', at(600, 300));
    sample();
    expect(frame.palmPos).toEqual(frame.pinchPos);
  });

  it('reads the targets live: one added after the source was made counts', () => {
    const targets: PickCandidate[] = [];
    const { canvas, frame, sample } = rig(targets);
    enter();
    canvas.fire('pointermove', at(600, 300));
    sample();
    targets.push(candidate('plant', near));
    sample();
    expect(frame.palmPos).toEqual(REST);
  });
});

describe('PointerSource: velocity (LLD §11)', () => {
  it('is the finite difference of the pinch point, in metres per second', () => {
    const { canvas, frame, sample } = rig();
    enter();
    canvas.fire('pointermove', at(400, 300));
    sample();
    canvas.fire('pointermove', at(600, 300));
    sample(); // 0.5 m in 10 ms
    expect(frame.velocity.x).toBeCloseTo(50);
    expect(frame.velocity.z).toBeCloseTo(0);
    sample();
    expect(frame.velocity.x).toBe(0);
  });
});
