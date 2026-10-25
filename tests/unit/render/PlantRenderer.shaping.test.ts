// T-147, the shaping feedback (UX §3.4): what PlantRenderer draws while a hand holds a plant, from the events the
// hands emit (API_SPEC §1.4, "Shaping as built"). The parent is a plain Group with the bed's pose; no WebGL: what
// would be drawn is read back from the instances. The per-frame heap cost is in PlantRenderer.heap.test.ts.
import { Color, Group, Matrix4, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { settings } from '../../../src/core/index.js';
import { BED_OUTER, cellCentre, heightAfterPull, STEPS } from '../../../src/garden/index.js';
import { REVERT_LERP_MS } from '../../../src/hands/index.js';
import {
  BED_RIM_M,
  FLASH_CAP_PER_S,
  HOVER_CUE_MS,
  LADDER_ALPHA,
  LADDER_MARKS,
  LADDER_RADIUS_M,
  PLANT_HOVER_LIFT,
  PLANT_LIGHTNESS,
  PLANT_OFF_BED_BRIGHTNESS,
  PLANT_PINCH_LIFT_M,
  PLANT_REST_BRIGHTNESS,
  PLANT_STEM_MAX_M,
  PLANT_STEM_MIN_M,
  RIM_WARN_ALPHA,
} from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { newPalette, plantColour } from '../../../src/render/palette.js';
import { PlantRenderer } from '../../../src/render/PlantRenderer.js';
import { mulberry32 } from '../audio/prng.js';
import { plant } from '../garden/fixtures.js';

import { changeTimes, mostInAnyClip, type Drawn as Sample } from './changes.js';

import type { Hand } from '../../../src/core/index.js';
import type { BedZone, Plant } from '../../../src/garden/index.js';

const FRAME_MS = 1000 / 72;
const EXACT_M = 1e-6; // the instance buffers are 32-bit: a micrometre is exact here
/** Ease-out (UX §5): the share of a glide's way done after `elapsedMs` of REVERT_LERP_MS. */
const eased = (elapsedMs: number): number => 1 - (1 - Math.min(1, elapsedMs / REVERT_LERP_MS)) ** 2;
const HUE = 0.25; // the fixture's
const HELD: readonly [number, number] = [2, 4];
const GLOWING = PLANT_REST_BRIGHTNESS * (1 + PLANT_HOVER_LIFT);
const stemOf = (height: number): number => PLANT_STEM_MIN_M + (PLANT_STEM_MAX_M - PLANT_STEM_MIN_M) * height;
const full = plantColour(new Color(), HUE, PLANT_LIGHTNESS, newPalette()).r;

interface Bed {
  renderer: PlantRenderer;
  guard: FlashGuard;
  parent: Group;
  /** The frame time of the last update. */
  now: number;
}
/** A bed with a pose of its own (moved and turned), so a hand's world point must be taken into the bed frame. */
function make(plants: Plant[]): Bed {
  const parent = new Group();
  parent.position.set(0.1, 0.72, -0.45);
  parent.rotation.y = 0.4;
  parent.updateMatrixWorld();
  const guard = new FlashGuard();
  const renderer = new PlantRenderer(parent, guard);
  renderer.setState({ plants, lastVisitAt: 1000 });
  renderer.update(Number.NaN, 0);
  return { renderer, guard, parent, now: 0 };
}

/** Runs frames for `durationMs`, calling `each` before each update; returns what `read` saw after each. */
function frames<T>(bed: Bed, durationMs: number, read: () => T, each?: (t: number) => number | void): T[] {
  const out: T[] = [];
  const end = bed.now + durationMs;
  while (bed.now + FRAME_MS <= end + 1e-9) {
    bed.now += FRAME_MS;
    const phase = each?.(bed.now) ?? Number.NaN;
    bed.renderer.update(phase, bed.now);
    out.push(read());
  }
  return out;
}

/** The one bell's instance: its foot in the bed frame, its stem, and its brightness. */
function bell(
  renderer: PlantRenderer,
  index = 0,
): { at: Vector3; stemM: number; level: number; turnRad: number } {
  const mesh = renderer.meshes[0]!;
  expect(mesh.count).toBeGreaterThan(index);
  const matrix = new Matrix4();
  mesh.getMatrixAt(index, matrix);
  const colour = new Color();
  mesh.getColorAt(index, colour);
  const out = new Vector3().setFromMatrixColumn(matrix, 0); // its own +x, in the bed's plane
  return {
    at: new Vector3().setFromMatrixPosition(matrix),
    stemM: new Vector3().setFromMatrixColumn(matrix, 1).length(),
    level: colour.r / full,
    turnRad: Math.atan2(out.z, out.x),
  };
}

/** The ladder's rings and the rim, as the guides' mesh would draw them; none while it is hidden. */
interface Ring {
  at: Vector3;
  radiusM: number;
  innerM: number;
  alpha: number;
}
function rings(renderer: PlantRenderer): Ring[] {
  const { mesh } = renderer.guides;
  if (!mesh.visible) return [];
  const colour = mesh.geometry.getAttribute('aColour');
  const inner = mesh.geometry.getAttribute('aInner');
  const matrix = new Matrix4();
  return Array.from({ length: mesh.count }, (_, i) => {
    mesh.getMatrixAt(i, matrix);
    const radiusM = new Vector3().setFromMatrixColumn(matrix, 0).length();
    return {
      at: new Vector3().setFromMatrixPosition(matrix),
      radiusM,
      innerM: inner.getX(i) * radiusM,
      alpha: colour.getW(i),
    };
  });
}

/** A point of the bed frame (bed-local x, height, bed-local y as z: D-029), in the world. */
function world(bed: Bed, x: number, y: number, z: number): Vector3 {
  return bed.parent.localToWorld(new Vector3(x, y, z));
}
function cellAt([ring, step]: readonly [number, number]): Vector3 {
  const c = cellCentre({ ring, step }, { x: 0, y: 0 });
  return new Vector3(c.x, 0, c.y);
}

const pinch = (bed: Bed, hand: Hand, id: string, local: Vector3): void =>
  bed.renderer.onPinchStart({
    hand,
    target: { kind: 'plant', id },
    pos: world(bed, local.x, local.y, local.z),
  });
const drag = (bed: Bed, hand: Hand, local: Vector3, zone: BedZone = 'bed'): void =>
  bed.renderer.onDrag({ hand, pos: world(bed, local.x, local.y, local.z), zone });

afterEach(() => settings.set({ reducedMotion: false }));

describe('PlantRenderer, a plant held by a pinch (UX §3.4, T-147)', () => {
  it('lifts 1 cm over 150 ms, ease-out, and glows 20 % brighter until its hand lets go', () => {
    const bed = make([plant('a', ...HELD)]);
    const rest = bell(bed.renderer).at;
    pinch(bed, 'right', 'a', cellAt(HELD).setY(0.06)); // on its stem
    const up = frames(bed, 300, () => ({ t: bed.now, ...bell(bed.renderer) }));
    // From the next frame on: one frame still where it was, then the ease.
    expect(up[0]!.at.y).toBeCloseTo(0, 6);
    const half = up.find((f) => f.t >= up[0]!.t + REVERT_LERP_MS / 2 - 1e-6)!;
    expect(eased(half.t - up[0]!.t)).toBeGreaterThan(0.75); // ease-out: past three quarters at half time
    expect(half.at.y).toBeCloseTo(PLANT_PINCH_LIFT_M * eased(half.t - up[0]!.t), 6);
    const lifted = up.find((f) => f.t >= up[0]!.t + REVERT_LERP_MS - 1e-6)!;
    expect(lifted.at.y).toBeCloseTo(PLANT_PINCH_LIFT_M, 6);
    expect(lifted.at.x).toBeCloseTo(rest.x, 6); // it only rises
    expect(lifted.at.z).toBeCloseTo(rest.z, 6);
    expect(up[up.length - 1]!.level).toBeCloseTo(GLOWING, 6);

    bed.renderer.onRelease({ hand: 'right' }); // a release inside the dead zone ('none')
    const down = frames(bed, 300, () => bell(bed.renderer));
    expect(down[down.length - 1]!.at.y).toBeCloseTo(0, 6);
    expect(down[down.length - 1]!.level).toBeCloseTo(PLANT_REST_BRIGHTNESS, 6);
  });

  it('a pinch on anything else, on nothing, or on a plant that is not drawn changes no plant', () => {
    const bed = make([plant('a', ...HELD)]);
    bed.renderer.onPinchStart({ hand: 'left', target: { kind: 'seed', id: 'a' }, pos: world(bed, 0, 0, 0) });
    bed.renderer.onPinchStart({ hand: 'right', target: null, pos: world(bed, 0, 0, 0) });
    frames(bed, 200, () => null);
    bed.renderer.onPinchStart({
      hand: 'right',
      target: { kind: 'plant', id: 'gone' },
      pos: world(bed, 0, 0, 0),
    });
    bed.renderer.onPull({ hand: 'right', dy: 0.1 });
    bed.renderer.onDrag({ hand: 'left', pos: world(bed, 0.2, 0.1, 0), zone: 'outer' });
    frames(bed, 200, () => null);
    const still = bell(bed.renderer);
    expect(still.at.distanceTo(cellAt(HELD))).toBeLessThan(EXACT_M);
    expect(still.stemM).toBeCloseTo(stemOf(0.5), 6);
    expect(still.level).toBeCloseTo(PLANT_REST_BRIGHTNESS, 6);
    expect(bed.renderer.guides.mesh.visible).toBe(false); // no ladder, no rim
  });
});

describe('PlantRenderer, a pull (FR-HND-08, UX §3.4)', () => {
  it('stretches the stem to heightAfterPull(its height at the pinch, dy) on every pull; it never moves', () => {
    const bed = make([plant('a', ...HELD, { height: 0.5 })]);
    pinch(bed, 'right', 'a', cellAt(HELD).setY(0.07));
    frames(bed, 200, () => null);
    bed.renderer.onPull({ hand: 'right', dy: 0.02 }); // the sample that decided: an eased start
    frames(bed, 200, () => null);
    expect(bell(bed.renderer).stemM).toBeCloseTo(stemOf(heightAfterPull(0.5, 0.02)), 6);
    for (const dy of [0.05, 0.1, 0.2, -0.04, -0.3]) {
      bed.renderer.onPull({ hand: 'right', dy });
      frames(bed, FRAME_MS, () => null); // one frame: the stretch follows the hand at once
      const drawn = bell(bed.renderer);
      expect(drawn.stemM).toBeCloseTo(stemOf(heightAfterPull(0.5, dy)), 6);
      expect(drawn.at.distanceTo(cellAt(HELD).setY(PLANT_PINCH_LIFT_M))).toBeLessThan(EXACT_M);
    }
  });

  it('commits with garden:changed before the release: the stem is the pulled one on every frame, no jump', () => {
    const bed = make([plant('a', ...HELD, { height: 0.5 })]);
    pinch(bed, 'right', 'a', cellAt(HELD).setY(0.07));
    bed.renderer.onPull({ hand: 'right', dy: 0.1 });
    frames(bed, 300, () => null);
    const pulled = stemOf(heightAfterPull(0.5, 0.1));
    expect(bell(bed.renderer).stemM).toBeCloseTo(pulled, 6);
    // The order of one release (API_SPEC §1.4): garden sets the height and says so, then render hears the release.
    bed.renderer.setState({
      plants: [plant('a', ...HELD, { height: heightAfterPull(0.5, 0.1) })],
      lastVisitAt: 1000,
    });
    expect(bell(bed.renderer).stemM).toBeCloseTo(pulled, 6); // not the new height pulled once more
    expect(bell(bed.renderer).at.y).toBeCloseTo(PLANT_PINCH_LIFT_M, 6); // still lifted
    bed.renderer.onRelease({ hand: 'right' });
    const after = frames(bed, 300, () => ({ t: bed.now, ...bell(bed.renderer) }));
    for (const { stemM } of after) expect(stemM).toBeCloseTo(pulled, 6);
    // It sets down over the glide, from the next frame on: no frame drops the 1 cm at once.
    for (const { t, at } of after) {
      expect(at.y).toBeCloseTo(PLANT_PINCH_LIFT_M * (1 - eased(t - after[0]!.t)), 6);
    }
  });

  it('lost past the grace, it goes back to the height it had, over 150 ms, ease-out', () => {
    const bed = make([plant('a', ...HELD, { height: 0.5 })]);
    pinch(bed, 'left', 'a', cellAt(HELD).setY(0.07));
    bed.renderer.onPull({ hand: 'left', dy: 0.2 });
    frames(bed, 300, () => null);
    const pulled = bell(bed.renderer).stemM;
    bed.renderer.onRelease({ hand: 'left' }); // gesture:trackingLost
    const back = frames(bed, 300, () => ({ t: bed.now, stem: bell(bed.renderer).stemM }));
    expect(back[0]!.stem).toBeCloseTo(pulled, 6);
    const half = back.find((f) => f.t >= back[0]!.t + REVERT_LERP_MS / 2 - 1e-6)!;
    expect(half.stem).toBeCloseTo(pulled + (stemOf(0.5) - pulled) * eased(half.t - back[0]!.t), 6);
    expect(back[back.length - 1]!.stem).toBeCloseTo(stemOf(0.5), 6);
  });

  it('shows the scale ladder: five faint rings round the plant where its stem would end at each step', () => {
    const bed = make([plant('a', ...HELD, { height: 0.5 })]);
    const { mesh } = bed.renderer.guides;
    expect(mesh.visible).toBe(false); // no draw call before a pull
    pinch(bed, 'right', 'a', cellAt(HELD).setY(0.07));
    frames(bed, 200, () => null);
    expect(mesh.visible).toBe(false); // a pinch inside the dead zone shows no ladder
    bed.renderer.onPull({ hand: 'right', dy: 0.03 });
    frames(bed, 200, () => null);
    expect(mesh.visible).toBe(true);
    const marks = rings(bed.renderer).filter((ring) => ring.alpha > 0);
    expect(marks).toHaveLength(LADDER_MARKS);
    marks.forEach((mark, k) => {
      expect(mark.alpha).toBeCloseTo(LADDER_ALPHA, 6);
      expect(mark.radiusM).toBeCloseTo(LADDER_RADIUS_M, 6);
      expect(mark.at.x).toBeCloseTo(cellAt(HELD).x, 6);
      expect(mark.at.z).toBeCloseTo(cellAt(HELD).z, 6);
      expect(mark.at.y).toBeCloseTo(PLANT_PINCH_LIFT_M + stemOf(k / (LADDER_MARKS - 1)), 6);
    });
    bed.renderer.onRelease({ hand: 'right' });
    frames(bed, 200, () => null);
    expect(mesh.visible).toBe(false); // faded out, and no draw call again
  });
});

describe('PlantRenderer, a drag (FR-HND-10/11, UX §3.4)', () => {
  it('draws the plant under the hand, held where the hand took it, and keeps it at the last pos', () => {
    const bed = make([plant('a', ...HELD)]);
    const took = cellAt(HELD).setY(0.08); // the pinch on its head
    pinch(bed, 'right', 'a', took);
    frames(bed, 200, () => null);
    const hand = took.clone().add(new Vector3(0.03, 0.01, -0.02));
    drag(bed, 'right', hand); // the sample that decided: an eased catch-up
    frames(bed, 200, () => null);
    const foot = (p: Vector3): Vector3 => p.clone().sub(took).add(cellAt(HELD).setY(PLANT_PINCH_LIFT_M));
    expect(bell(bed.renderer).at.distanceTo(foot(hand))).toBeLessThan(EXACT_M);
    hand.add(new Vector3(-0.05, 0, 0.04));
    drag(bed, 'right', hand);
    frames(bed, FRAME_MS, () => null); // one frame: it follows at once
    expect(bell(bed.renderer).at.distanceTo(foot(hand))).toBeLessThan(EXACT_M);
    frames(bed, 500, () => null); // the hand away: no event, the plant stays at the last pos
    expect(bell(bed.renderer).at.distanceTo(foot(hand))).toBeLessThan(EXACT_M);
    expect(bell(bed.renderer).stemM).toBeCloseTo(stemOf(0.5), 6); // a drag never stretches
    expect(bell(bed.renderer).level).toBeCloseTo(GLOWING, 6); // and it glows while held
  });

  it('released in the hole, or lost past the grace, glides back to its cell in 150 ms, ease-out', () => {
    for (const how of ['inner', 'lost'] as const) {
      const bed = make([plant('a', ...HELD)]);
      pinch(bed, 'left', 'a', cellAt(HELD).setY(0.05));
      const hand = new Vector3(0.02, 0.05, 0.01); // near the bed's centre: the hole
      drag(bed, 'left', hand, how === 'inner' ? 'inner' : 'bed');
      frames(bed, 300, () => null);
      const from = bell(bed.renderer).at;
      bed.renderer.onRelease({ hand: 'left' }); // gesture:release { zone: 'inner', cell: null }, or trackingLost
      const back = frames(bed, 300, () => ({ t: bed.now, at: bell(bed.renderer).at }));
      expect(back[0]!.at.distanceTo(from)).toBeLessThan(EXACT_M);
      const half = back.find((f) => f.t >= back[0]!.t + REVERT_LERP_MS / 2 - 1e-6)!;
      const expected = from.clone().lerp(cellAt(HELD), eased(half.t - back[0]!.t));
      expect(half.at.distanceTo(expected), how).toBeLessThan(EXACT_M);
      const end = back.find((f) => f.t >= back[0]!.t + REVERT_LERP_MS - 1e-6)!;
      expect(end.at.distanceTo(cellAt(HELD)), how).toBeLessThan(EXACT_M);
    }
  });

  it('commits with garden:changed before the release: from the hand to its new cell, never at the old one', () => {
    const NEW: readonly [number, number] = [3, 6];
    const bed = make([plant('a', ...HELD)]);
    pinch(bed, 'right', 'a', cellAt(HELD).setY(0.05));
    const hand = cellAt(NEW).setY(0.06);
    const turns = [bell(bed.renderer).turnRad];
    drag(bed, 'right', hand);
    turns.push(...frames(bed, 300, () => bell(bed.renderer).turnRad));
    const from = bell(bed.renderer).at;
    bed.renderer.setState({ plants: [plant('a', ...NEW)], lastVisitAt: 1000 }); // garden:changed first
    expect(bell(bed.renderer).at.distanceTo(from)).toBeLessThan(EXACT_M); // still under the hand
    bed.renderer.onRelease({ hand: 'right' });
    const after = frames(bed, 300, () => bell(bed.renderer));
    for (const { at } of after) expect(at.distanceTo(cellAt(HELD))).toBeGreaterThan(0.01);
    const distances = after.map(({ at }) => at.distanceTo(cellAt(NEW)));
    for (let i = 1; i < distances.length; i++)
      expect(distances[i]!).toBeLessThanOrEqual(distances[i - 1]! + 1e-12);
    expect(distances[distances.length - 1]!).toBeLessThan(EXACT_M);
    // Its turn follows its place: from facing out of its old cell to facing out of its new one, never in one go
    // (the 45 degrees between the two cells took one frame before the T-147 review).
    turns.push(...after.map(({ turnRad }) => turnRad));
    const cellTurn = ([ring, step]: readonly [number, number]): number =>
      Math.atan2(cellAt([ring, step]).z, cellAt([ring, step]).x);
    expect(turns[0]).toBeCloseTo(cellTurn(HELD), 6);
    expect(turns[turns.length - 1]).toBeCloseTo(cellTurn(NEW), 6);
    for (let i = 1; i < turns.length; i++)
      expect(Math.abs(turns[i]! - turns[i - 1]!)).toBeLessThan(Math.PI / 18);
  });

  it('past the outer edge the plant fades to half and the rim dims; back over the bed both come back', () => {
    const bed = make([plant('a', ...HELD)]);
    pinch(bed, 'right', 'a', cellAt(HELD).setY(0.05));
    drag(
      bed,
      'right',
      cellAt(HELD)
        .setY(0.05)
        .add(new Vector3(0.03, 0, 0)),
    );
    frames(bed, 200, () => null);
    expect(bell(bed.renderer).level).toBeCloseTo(GLOWING, 6);
    drag(bed, 'right', new Vector3(BED_OUTER + 0.08, 0.05, 0), 'outer');
    const out = frames(bed, 200, () => ({ t: bed.now, level: bell(bed.renderer).level }));
    expect(out[out.length - 1]!.level).toBeCloseTo(GLOWING * PLANT_OFF_BED_BRIGHTNESS, 6);
    const fadedAt = out.find((f) => Math.abs(f.level - GLOWING * PLANT_OFF_BED_BRIGHTNESS) < 1e-6)!.t;
    expect(fadedAt - out[0]!.t).toBeGreaterThanOrEqual(HOVER_CUE_MS - FRAME_MS - 1e-6); // a fade, not a step
    expect(
      changeTimes([{ t: 0, value: GLOWING }, ...out.map((f) => ({ t: f.t, value: f.level }))]),
    ).toHaveLength(1);
    const rim = rings(bed.renderer).filter((ring) => ring.alpha > 0);
    expect(rim).toHaveLength(1);
    expect(rim[0]!.alpha).toBeCloseTo(RIM_WARN_ALPHA, 6);
    expect(rim[0]!.innerM).toBeCloseTo(BED_OUTER + BED_RIM_M, 6); // just outside the glass
    expect(Math.hypot(rim[0]!.at.x, rim[0]!.at.z)).toBeLessThan(EXACT_M); // round the bed's centre
    expect(rim[0]!.at.y).toBeGreaterThan(0); // over the glass and its markers
    expect(rim[0]!.at.y).toBeLessThan(0.005);

    drag(bed, 'right', cellAt(HELD).setY(0.05), 'bed');
    frames(bed, 200, () => null);
    expect(bell(bed.renderer).level).toBeCloseTo(GLOWING, 6);
    expect(bed.renderer.guides.mesh.visible).toBe(false);
  });

  it('dragged off the bed: garden:changed takes it, and heldAt says where it dissolved until the release', () => {
    const bed = make([plant('a', ...HELD), plant('b', 0, 0)]);
    pinch(bed, 'left', 'a', cellAt(HELD).setY(0.05));
    const hand = new Vector3(BED_OUTER + 0.08, 0.06, 0.1);
    drag(bed, 'left', hand, 'outer');
    frames(bed, 300, () => null);
    const drawn = bell(bed.renderer, 0);
    bed.renderer.setState({ plants: [plant('b', 0, 0)], lastVisitAt: 1000 }); // removePlant, garden:changed
    expect(bed.renderer.meshes[0]!.count).toBe(1); // only b is drawn
    const out = new Vector3();
    expect(bed.renderer.heldAt('a', out)).toBe(true); // garden:removed: where the petals start
    expect(out.distanceTo(drawn.at.clone().setY(drawn.at.y + drawn.stemM / 2))).toBeLessThan(EXACT_M);
    expect(bed.renderer.heldAt('b', out)).toBe(false);
    bed.renderer.onRelease({ hand: 'left' });
    expect(bed.renderer.heldAt('a', out)).toBe(false);
    frames(bed, 300, () => null);
    expect(bell(bed.renderer).at.distanceTo(cellAt([0, 0]))).toBeLessThan(EXACT_M); // b never moved
  });

  it('a plant planted in the same change that removes the held one stands at its cell, not at the hand', () => {
    const bed = make([plant('a', ...HELD)]);
    pinch(bed, 'right', 'a', cellAt(HELD).setY(0.05));
    drag(bed, 'right', new Vector3(BED_OUTER + 0.08, 0.06, 0.1), 'outer');
    frames(bed, 300, () => null);
    // One garden:changed drops `a` and adds `c`, which takes the slot `a` left; the hand still holds `a`.
    bed.renderer.setState({ plants: [plant('c', 3, 9)], lastVisitAt: 1000 });
    expect(bell(bed.renderer).at.distanceTo(cellAt([3, 9]))).toBeLessThan(EXACT_M);
    frames(bed, 300, () => null);
    expect(bell(bed.renderer).at.distanceTo(cellAt([3, 9]))).toBeLessThan(EXACT_M);
    expect(bell(bed.renderer).level).toBeCloseTo(PLANT_REST_BRIGHTNESS, 6); // no glow, no fade of the hold
  });

  it('two hands on one plant: the right one places it, fades it and says where it dissolved', () => {
    const bed = make([plant('a', ...HELD)]);
    pinch(bed, 'left', 'a', cellAt(HELD).setY(0.05));
    pinch(bed, 'right', 'a', cellAt(HELD).setY(0.05));
    drag(
      bed,
      'left',
      cellAt(HELD)
        .setY(0.05)
        .add(new Vector3(0.03, 0, 0)),
      'bed',
    );
    const off = new Vector3(BED_OUTER + 0.08, 0.06, 0.1);
    drag(bed, 'right', off, 'outer');
    frames(bed, 300, () => null);
    expect(bell(bed.renderer).level).toBeCloseTo(GLOWING * PLANT_OFF_BED_BRIGHTNESS, 6);
    drag(bed, 'left', new Vector3(0.4, 0.05, -0.1), 'outer'); // the hand that is not drawn changes nothing
    drag(bed, 'left', cellAt(HELD).setY(0.05), 'bed');
    frames(bed, 300, () => null);
    const drawn = bell(bed.renderer);
    const middle = drawn.at.clone().setY(drawn.at.y + drawn.stemM / 2);
    expect(drawn.level).toBeCloseTo(GLOWING * PLANT_OFF_BED_BRIGHTNESS, 6);
    // Under the right hand, as far from it as at its pinch (5 cm up the stem, the foot lifted 1 cm).
    expect(drawn.at.distanceTo(off.clone().setY(off.y - 0.05 + PLANT_PINCH_LIFT_M))).toBeLessThan(EXACT_M);
    const out = new Vector3();
    expect(bed.renderer.heldAt('a', out)).toBe(true); // where it is drawn, not where the left hand took it
    expect(out.distanceTo(middle)).toBeLessThan(EXACT_M);

    bed.renderer.onRelease({ hand: 'left' }); // the left's release does not take the fade from the right
    frames(bed, 300, () => null);
    expect(bell(bed.renderer).level).toBeCloseTo(GLOWING * PLANT_OFF_BED_BRIGHTNESS, 6);
    pinch(bed, 'left', 'a', cellAt(HELD).setY(0.05)); // nor does a new pinch of the left
    frames(bed, 300, () => null);
    expect(bell(bed.renderer).level).toBeCloseTo(GLOWING * PLANT_OFF_BED_BRIGHTNESS, 6);
    bed.renderer.setState({ plants: [], lastVisitAt: 1000 }); // the right hand's release removed it
    expect(bed.renderer.heldAt('a', out)).toBe(true);
    expect(out.distanceTo(middle)).toBeLessThan(EXACT_M);
  });

  it('reduced motion keeps the 150 ms glide (UX §5, §8: the tracking-loss glide is unchanged)', () => {
    settings.set({ reducedMotion: true });
    const bed = make([plant('a', ...HELD)]);
    pinch(bed, 'left', 'a', cellAt(HELD).setY(0.05));
    drag(bed, 'left', new Vector3(0.02, 0.05, 0.01), 'inner');
    frames(bed, 300, () => null);
    bed.renderer.onRelease({ hand: 'left' });
    const back = frames(bed, 300, () => ({ t: bed.now, at: bell(bed.renderer).at }));
    const half = back.find((f) => f.t >= back[0]!.t + REVERT_LERP_MS / 2 - 1e-6)!;
    expect(half.at.distanceTo(cellAt(HELD))).toBeGreaterThan(0.01);
    expect(back[back.length - 1]!.at.distanceTo(cellAt(HELD))).toBeLessThan(EXACT_M);
  });
});

describe('the flash cap while a plant is shaped (FR-UI-11), counted second by second from what is drawn', () => {
  const BAR_MS = 2000; // 120 BPM, the fastest

  it('a plant pulled while the tide passes and a hover flickers: at most 3 changes in any second', () => {
    const bed = make([plant('a', ...HELD)]);
    const drawn: Sample[] = [{ t: 0, value: bell(bed.renderer).level }];
    pinch(bed, 'right', 'a', cellAt(HELD).setY(0.07));
    bed.renderer.onPull({ hand: 'right', dy: 0.02 });
    // 8 s: the hand pulls up and down, the tide passes every 2 s, and the other hand's hover flickers on it
    // every 130 ms; twice a second the pull ends and starts again (a release and a pinch: the glow off and on).
    // The right hand's ladder, as drawn: its first ring's opacity over the ladder's own (the other four match it).
    const ladder: Sample[] = [{ t: 0, value: 0 }];
    const series = frames(
      bed,
      8000,
      () => {
        ladder.push({ t: bed.now, value: (rings(bed.renderer)[LADDER_MARKS]?.alpha ?? 0) / LADDER_ALPHA });
        return { t: bed.now, value: bell(bed.renderer).level };
      },
      (t) => {
        bed.renderer.setHover('left', Math.floor(t / 130) % 2 ? null : 'a');
        if (Math.floor(t / 250) % 2 && Math.floor((t - FRAME_MS) / 250) % 2 === 0) {
          bed.renderer.onRelease({ hand: 'right' });
        } else if (Math.floor(t / 250) % 2 === 0 && Math.floor((t - FRAME_MS) / 250) % 2) {
          pinch(bed, 'right', 'a', cellAt(HELD).setY(0.07));
        }
        bed.renderer.onPull({ hand: 'right', dy: 0.1 * Math.sin(t / 300) });
        return (t / BAR_MS) % 1;
      },
    );
    drawn.push(...series);
    expect(changeTimes(drawn).length).toBeGreaterThan(8); // busier than the tide alone, which is 2 a bar
    expect(mostInAnyClip(drawn)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(changeTimes(ladder).length).toBeGreaterThan(8); // the ladder came and went, too
    expect(mostInAnyClip(ladder)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(bed.guard.takePeak()).toBeLessThanOrEqual(FLASH_CAP_PER_S);
  });

  it('24 seeded runs of 6 s: a drag in and out past the edge, pinches, hovers and a tide on one plant', () => {
    const worst: number[] = [];
    const worstRim: number[] = [];
    for (let seed = 1; seed <= 24; seed++) {
      const random = mulberry32(seed);
      const bed = make([plant('a', ...HELD)]);
      const drawn: Sample[] = [{ t: 0, value: bell(bed.renderer).level }];
      const rim: Sample[] = [{ t: 0, value: 0 }];
      let isHeld = false;
      let isOut = false;
      for (let t = FRAME_MS; t < 6000; t += FRAME_MS) {
        if (random() < 0.03) {
          isHeld = !isHeld;
          if (isHeld) pinch(bed, 'right', 'a', cellAt(HELD).setY(0.05));
          else bed.renderer.onRelease({ hand: 'right' });
        }
        if (random() < 0.1) isOut = !isOut;
        if (isHeld) drag(bed, 'right', new Vector3(isOut ? 0.4 : 0.2, 0.05, 0.05), isOut ? 'outer' : 'bed');
        bed.renderer.setHover('left', random() < 0.5 ? 'a' : null);
        bed.now = t;
        bed.renderer.update(((t - 1000) / BAR_MS) % 1, t);
        drawn.push({ t, value: bell(bed.renderer).level });
        rim.push({ t, value: (rings(bed.renderer)[2 * LADDER_MARKS]?.alpha ?? 0) / RIM_WARN_ALPHA });
      }
      worst.push(mostInAnyClip(drawn));
      worstRim.push(mostInAnyClip(rim));
      expect(bed.guard.takePeak(), `seed ${seed}`).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    }
    expect(worst.filter((count) => count > FLASH_CAP_PER_S)).toEqual([]);
    expect(worstRim.filter((count) => count > FLASH_CAP_PER_S)).toEqual([]);
    expect(Math.max(...worst)).toBe(FLASH_CAP_PER_S); // the runs press on the cap
    expect(Math.max(...worstRim)).toBeGreaterThan(0); // and the rim did come and go
  });

  it('the tide still reaches a held plant at its own step: it plays where it stood until the garden moves it', () => {
    const bed = make([plant('a', ...HELD)]);
    pinch(bed, 'right', 'a', cellAt(HELD).setY(0.05));
    drag(bed, 'right', new Vector3(0.2, 0.05, -0.1));
    const lit = frames(
      bed,
      600,
      () => bell(bed.renderer).level,
      () => HELD[1] / STEPS,
    );
    expect(lit[lit.length - 1]!).toBeCloseTo(1, 6); // the crest on its step: full, the glow clamped there
  });
});
