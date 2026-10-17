// The undo petal (UX §9.3, FR-MUS-12, T-146): where it waits, how it shrinks and fades, and who can take it away.
// A plain Object3D for the bed and the page's kind of FlashGuard; no WebGL: what would be drawn is read from the
// instances. The per-frame heap cost is in PetalRenderer.heap.test.ts.
import { Color, Group, Matrix4, Quaternion, SRGBColorSpace, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { settings } from '../../../src/core/index.js';
import { cellCentre, RINGS, STEPS, UNDO_LIFE_MS } from '../../../src/garden/index.js';
import {
  BURST_MS,
  BURST_PETAL_DIAMETER_M,
  BURST_PETALS,
  BURST_POOL,
  BURST_SPREAD_M,
  FLASH_MIN_DELTA,
  PETAL_FADE_IN_MS,
  PETAL_ASPECT,
  PETAL_END_DIAMETER_M,
  PETAL_FADE_MS,
  PETAL_LIFT_M,
  PETAL_START_DIAMETER_M,
  PLANT_CAPACITY,
  PLANT_LIGHTNESS,
  PLANT_REST_BRIGHTNESS,
  PLANT_SATURATION,
} from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { PetalRenderer } from '../../../src/render/PetalRenderer.js';

import { changeTimes, type Drawn } from './changes.js';

import type { Cell } from '../../../src/garden/index.js';
import type { InstancedBufferAttribute } from 'three';

const FRAME_MS = 1000 / 72;
const T0 = 12_345_678; // a frame time of real size, in ms
const cell = (ring: number, step: number): Cell => ({ ring, step });
/** As much of a removed plant as the renderer reads. */
const removed = (ring: number, step: number, hue = 0.25) => ({ cell: cell(ring, step), hue });

function make(): { petals: PetalRenderer; guard: FlashGuard; parent: Group } {
  const parent = new Group();
  const guard = new FlashGuard();
  return { petals: new PetalRenderer(parent, guard), guard, parent };
}

interface Petal {
  at: Vector3;
  /** Across its long side, in metres. */
  widthM: number;
  /** The way its long side points, in the bed's plane. */
  along: Vector3;
  rgb: number[];
  /** What reaches the eye: its colour's brightness times its opacity. */
  brightness: number;
}
/** Every petal that would be drawn now. */
function drawn(petals: PetalRenderer): Petal[] {
  const { mesh } = petals;
  if (!mesh.visible) return [];
  const colour = mesh.geometry.getAttribute('aColour');
  const [matrix, at, turn, scale] = [new Matrix4(), new Vector3(), new Quaternion(), new Vector3()];
  const out: Petal[] = [];
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    matrix.decompose(at, turn, scale);
    if (scale.x === 0) continue;
    out.push({
      at: at.clone(),
      widthM: scale.x,
      along: new Vector3(1, 0, 0).applyQuaternion(turn),
      rgb: [colour.getX(i), colour.getY(i), colour.getZ(i)],
      brightness: PLANT_REST_BRIGHTNESS * colour.getW(i),
    });
  }
  return out;
}
const only = (petals: PetalRenderer): Petal => {
  const all = drawn(petals);
  expect(all).toHaveLength(1);
  return all[0]!;
};

describe('PetalRenderer (UX §9.3)', () => {
  it('is one mesh, hidden while there is no petal, and gone after dispose', () => {
    const { petals, parent } = make();
    expect(parent.children).toEqual([petals.mesh]);
    expect(petals.mesh.visible).toBe(false); // no draw call while nothing was removed
    petals.update(T0);
    expect(petals.mesh.visible).toBe(false);
    petals.dispose();
    expect(parent.children).toEqual([]);
  });

  it('dispose frees its geometry and its material on the GPU', () => {
    const { petals } = make();
    const freed: string[] = [];
    petals.mesh.geometry.addEventListener('dispose', () => freed.push('geometry'));
    petals.mesh.material.addEventListener('dispose', () => freed.push('material'));
    petals.dispose();
    expect(freed.sort()).toEqual(['geometry', 'material']);
  });

  it('is never culled: its bounds are one petal at the bed centre, and the petals lie all over the bed', () => {
    expect(make().petals.mesh.frustumCulled).toBe(false);
  });

  it('marks what it changed for upload: the matrices when a petal comes, shrinks and goes, the colours as it fades', () => {
    // Without the flag Three.js never sends the new values to the GPU: a petal would not appear, shrink or fade.
    const { petals } = make();
    const colours = petals.mesh.geometry.getAttribute('aColour') as InstancedBufferAttribute;
    const versions = () => ({ matrix: petals.mesh.instanceMatrix.version, colour: colours.version });
    let before = versions();
    petals.show('p', removed(2, 3), T0 + 5000);
    expect(versions().matrix).toBeGreaterThan(before.matrix); // it appears
    expect(versions().colour).toBeGreaterThan(before.colour); // in its colour
    before = versions();
    petals.update(T0 + 1000);
    expect(versions().matrix).toBeGreaterThan(before.matrix); // it shrinks
    before = versions();
    petals.update(T0 + 4900);
    expect(versions().colour).toBeGreaterThan(before.colour); // it fades
    before = versions();
    petals.hide('p');
    expect(versions().matrix).toBeGreaterThan(before.matrix); // it goes
  });

  it("waits 3 cm above the removed plant's own cell, pointing out of the bed, for each of the 80 cells", () => {
    expect(PETAL_LIFT_M).toBe(0.03);
    for (let ring = 0; ring < RINGS; ring++) {
      for (let step = 0; step < STEPS; step++) {
        const { petals } = make();
        petals.show('p', removed(ring, step), T0 + UNDO_LIFE_MS);
        petals.update(T0);
        const centre = cellCentre(cell(ring, step), { x: 0, y: 0 });
        const { at, along } = only(petals);
        // Bed-local (x, y) is the bed's x and z (D-029).
        expect([at.x, at.y, at.z], `${ring}/${step}`).toEqual([
          expect.closeTo(centre.x, 6),
          expect.closeTo(PETAL_LIFT_M, 6),
          expect.closeTo(centre.y, 6),
        ]);
        const out = new Vector3(centre.x, 0, centre.y).normalize();
        expect(along.dot(out), `${ring}/${step}`).toBeCloseTo(1, 5);
      }
    }
  });

  it('is an oval, as long as it is said to be wide and narrower across', () => {
    const { geometry } = make().petals.mesh;
    geometry.computeBoundingBox();
    const size = geometry.boundingBox!.getSize(new Vector3());
    expect(size.x).toBeCloseTo(1); // one unit long: an instance's scale is its width in metres
    expect(size.y).toBeCloseTo(0); // flat on the bed's plane
    expect(size.z).toBeCloseTo(PETAL_ASPECT);
  });

  it('shrinks in a straight line from 2.5 cm to 1.0 cm over its 5 s, and is gone when they are over', () => {
    expect([PETAL_START_DIAMETER_M, PETAL_END_DIAMETER_M, UNDO_LIFE_MS]).toEqual([0.025, 0.01, 5000]);
    const { petals } = make();
    petals.show('p', removed(2, 3), T0 + 5000);
    expect(only(petals).widthM).toBeCloseTo(0.025, 6); // drawn at once, before the first update
    for (const [afterMs, widthM] of [
      [0, 0.025],
      [1000, 0.022],
      [2500, 0.0175],
      [4000, 0.013],
      [4999, 0.010003],
    ] as const) {
      petals.update(T0 + afterMs);
      expect(only(petals).widthM, String(afterMs)).toBeCloseTo(widthM, 6);
      expect(petals.has('p')).toBe(true);
    }
    petals.update(T0 + 5000);
    expect(petals.has('p')).toBe(false); // by its own time: no event says a token died
    expect(drawn(petals)).toEqual([]);
    expect(petals.mesh.visible).toBe(false);
  });

  it("is drawn in the plant's own colour at a plant's rest brightness", () => {
    const { petals } = make();
    petals.show('p', removed(1, 1, 0.6), T0 + 5000);
    petals.update(T0);
    const tint = new Color().setHSL(0.6, PLANT_SATURATION, PLANT_LIGHTNESS, SRGBColorSpace);
    const { rgb, brightness } = only(petals);
    [tint.r, tint.g, tint.b].forEach((channel, i) => expect(rgb[i]).toBeCloseTo(channel * 0.7, 5));
    expect(brightness).toBeCloseTo(0.7);
    expect(PLANT_REST_BRIGHTNESS).toBe(0.7);
  });

  it('keeps one brightness and fades out over its last 300 ms: one luminance change in its life (FR-UI-11)', () => {
    expect(PETAL_FADE_MS).toBe(300);
    const { petals, guard } = make();
    petals.show('p', removed(4, 9), T0 + 5000);
    const series: Drawn[] = [];
    for (let t = T0; t < T0 + 5000; t += FRAME_MS) {
      petals.update(t);
      series.push({ t: t - T0, value: only(petals).brightness });
    }
    const until = (ms: number): Drawn[] => series.filter((each) => each.t <= ms);
    expect(new Set(until(4700).map((each) => each.value))).toEqual(new Set([series[0]!.value]));
    expect(series[0]!.value).toBeCloseTo(0.7);
    const half = series.find((each) => each.t >= 4850)!;
    expect(half.value).toBeGreaterThan(0.3);
    expect(half.value).toBeLessThan(0.36);
    expect(series[series.length - 1]!.value).toBeLessThan(0.05);
    // Never brighter again once it fades. Its first step down is the 0.05 below which nothing is a change (half
    // of FLASH_MIN_DELTA: update asks the guard from there on) plus a frame's share of the fade; no step after
    // it is more than a frame's share.
    const steps = series.slice(1).map((each, i) => each.value - series[i]!.value);
    const frameShare = (0.7 * FRAME_MS) / PETAL_FADE_MS;
    expect(Math.max(...steps)).toBe(0);
    const falls = steps.filter((step) => step < 0);
    expect(falls[0]).toBeLessThan(-FLASH_MIN_DELTA / 2);
    expect(falls[0]).toBeGreaterThan(-FLASH_MIN_DELTA / 2 - 1.01 * frameShare);
    expect(Math.min(...falls.slice(1))).toBeGreaterThan(-1.01 * frameShare);
    expect(changeTimes(series)).toHaveLength(1);
    expect(guard.takePeak()).toBe(1);
  });

  it('several petals live at once, each by its own time, and hide takes one back at once (the undo)', () => {
    const { petals } = make();
    petals.show('a', removed(0, 0), T0 + 5000);
    petals.show('b', removed(4, 8), T0 + 7000);
    petals.show('c', removed(2, 5), T0 + 9000);
    petals.update(T0 + 3000);
    expect(drawn(petals)).toHaveLength(3);
    petals.hide('b'); // garden:changed named it in `added`
    expect([petals.has('a'), petals.has('b'), petals.has('c')]).toEqual([true, false, true]);
    expect(drawn(petals)).toHaveLength(2);
    petals.update(T0 + 5000);
    expect([petals.has('a'), petals.has('c')]).toEqual([false, true]);
    expect(only(petals).at.x).toBeCloseTo(cellCentre(cell(2, 5), { x: 0, y: 0 }).x);
    expect(only(petals).widthM).toBeCloseTo(0.025 - 0.015 * (1000 / 5000), 6); // c is 1 s old
    petals.hide('nobody'); // an id that has no petal: nothing happens
    petals.hide('c');
    expect(petals.mesh.visible).toBe(false);
  });

  it('never two on one spot: a second plant removed from the same cell takes the place of the older petal', () => {
    const { petals } = make();
    petals.show('old', removed(3, 3, 0.1), T0 + 5000);
    petals.update(T0 + 4900); // deep in its fade
    petals.show('new', removed(3, 3, 0.9), T0 + 9900);
    expect([petals.has('old'), petals.has('new')]).toEqual([false, true]); // the older plant cannot come back
    petals.update(T0 + 4914);
    const { widthM, brightness, rgb } = only(petals);
    expect(widthM).toBeCloseTo(0.025, 4);
    expect(brightness).toBeCloseTo(0.7); // at rest, whatever the older one had faded to
    const tint = new Color().setHSL(0.9, PLANT_SATURATION, PLANT_LIGHTNESS, SRGBColorSpace);
    expect(rgb[0]).toBeCloseTo(tint.r * 0.7, 5);
  });

  it('the same plant removed a second time starts over, where it stood then', () => {
    const { petals } = make();
    petals.show('p', removed(1, 2), T0 + 5000);
    petals.update(T0 + 3000);
    petals.hide('p'); // undone
    petals.show('p', removed(4, 12), T0 + 9000); // moved, and removed again
    petals.update(T0 + 4000);
    const centre = cellCentre(cell(4, 12), { x: 0, y: 0 });
    expect(only(petals).at.z).toBeCloseTo(centre.y);
    expect(only(petals).widthM).toBeCloseTo(0.025, 6);
    petals.show('p', removed(0, 0), T0 + 9500); // shown again while it is up: one petal, at the new place
    expect(drawn(petals)).toHaveLength(1);
    expect(only(petals).at.x).toBeCloseTo(0.12);
  });

  it('clear takes every petal at once (New garden drops every token with no event)', () => {
    const { petals } = make();
    for (let step = 0; step < STEPS; step++) petals.show(`p${step}`, removed(2, step), T0 + 5000);
    petals.update(T0 + 100);
    expect(drawn(petals)).toHaveLength(STEPS);
    petals.clear();
    expect(drawn(petals)).toEqual([]);
    expect(petals.has('p0')).toBe(false);
    expect(petals.mesh.visible).toBe(false);
    petals.show('again', removed(2, 0), T0 + 6000); // and it works afterwards
    expect(drawn(petals)).toHaveLength(1);
  });

  it('a cell that is not on the bed is not drawn, and a time that is not a number neither shows nor moves one', () => {
    const { petals } = make();
    for (const off of [cell(5, 0), cell(0, 16), cell(-1, 3), cell(1.5, 3), cell(Number.NaN, 0)]) {
      petals.show('off', { cell: off, hue: 0.5 }, T0 + 5000);
      expect(petals.has('off'), JSON.stringify(off)).toBe(false);
    }
    expect(petals.mesh.visible).toBe(false);
    petals.show('late', removed(0, 0), Number.NaN); // no end to wait for: gone at the first frame
    petals.show('p', removed(1, 1), T0 + 5000);
    petals.update(T0 + 1000);
    expect([petals.has('late'), petals.has('p')]).toEqual([false, true]);
    const before = only(petals).widthM;
    for (const time of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      petals.update(time); // a frame with no usable time changes nothing
      expect(petals.has('p')).toBe(true);
      expect(only(petals).widthM).toBe(before);
    }
  });

  it('a petal shown past its whole life is no wider than at its start', () => {
    const { petals } = make();
    petals.show('p', removed(2, 2), T0 + 60_000); // a wiring that got the clocks wrong
    petals.update(T0);
    expect(only(petals).widthM).toBeCloseTo(0.025, 6);
  });
});

describe("PetalRenderer, the petal's arrival (UX §9.3, T-147)", () => {
  const FROM = new Vector3(0.36, 0.08, 0.12); // off the bed, where the dragged plant was let go
  const home = (ring: number, step: number): Vector3 => {
    const centre = cellCentre(cell(ring, step), { x: 0, y: 0 });
    return new Vector3(centre.x, PETAL_LIFT_M, centre.y);
  };
  const eased = (share: number): number => 1 - (1 - share) ** 2; // ease-out (UX §5)
  afterEach(() => settings.set({ reducedMotion: false }));

  it('the plant dissolves into six petals at the release point; they drift to its cell in 400 ms and one stays', () => {
    expect(BURST_MS).toBe(400); // UX §5: the remove burst
    const { petals } = make();
    petals.show('a', removed(2, 1, 0.6), T0 + UNDO_LIFE_MS, FROM);
    petals.update(T0);
    const start = drawn(petals);
    expect(start).toHaveLength(BURST_PETALS);
    for (const petal of start) expect(petal.at.distanceTo(FROM)).toBeLessThanOrEqual(BURST_SPREAD_M + 1e-6);
    expect(start[0]!.at.distanceTo(FROM)).toBeLessThan(1e-6); // the undo petal itself starts on the point
    expect(start.slice(1).every((p) => Math.abs(p.widthM - BURST_PETAL_DIAMETER_M) < 1e-6)).toBe(true);
    expect(petals.has('a')).toBe(true); // its target is there from the start

    petals.update(T0 + BURST_MS / 2);
    const half = drawn(petals);
    const expected = FROM.clone().lerp(home(2, 1), eased(0.5));
    expect(half[0]!.at.distanceTo(expected)).toBeLessThan(1e-6);
    for (const petal of half.slice(1)) {
      expect(petal.widthM).toBeCloseTo(BURST_PETAL_DIAMETER_M / 2, 6); // shrinking in a straight line
      expect(petal.at.distanceTo(home(2, 1))).toBeLessThan(FROM.distanceTo(home(2, 1)) / 2);
    }

    petals.update(T0 + BURST_MS);
    expect(only(petals).at.distanceTo(home(2, 1))).toBeLessThan(1e-6); // one stays, over its cell
    expect(petals.mesh.visible).toBe(true);
  });

  it('every petal of the burst keeps one brightness: the burst changes no luminance (FR-UI-11)', () => {
    const { petals, guard } = make();
    petals.show('a', removed(3, 7, 0.1), T0 + UNDO_LIFE_MS, FROM);
    const seen = new Set<string>();
    for (let t = T0; t <= T0 + BURST_MS + 100; t += FRAME_MS) {
      petals.update(t);
      for (const petal of drawn(petals))
        seen.add([...petal.rgb, petal.brightness].map((v) => v.toFixed(6)).join());
    }
    expect(seen.size).toBe(1); // one colour at one strength, for all six, from the release to the landing
    expect(guard.takePeak()).toBe(0);
  });

  it('reduced motion: no burst and no drift; the petal fades in at its cell over 150 ms, one change', () => {
    settings.set({ reducedMotion: true });
    const { petals, guard } = make();
    petals.show('a', removed(1, 12), T0 + UNDO_LIFE_MS, FROM);
    const series: Drawn[] = [];
    for (let t = T0; t <= T0 + 400; t += FRAME_MS) {
      petals.update(t);
      const all = drawn(petals);
      expect(all).toHaveLength(1);
      expect(all[0]!.at.distanceTo(home(1, 12))).toBeLessThan(1e-6);
      series.push({ t: t - T0, value: all[0]!.brightness });
    }
    expect(series[0]!.value).toBe(0);
    const full = series.find((each) => each.value >= PLANT_REST_BRIGHTNESS - 1e-6)!;
    expect(full.t).toBeGreaterThanOrEqual(PETAL_FADE_IN_MS);
    expect(full.t).toBeLessThan(PETAL_FADE_IN_MS + 2 * FRAME_MS);
    expect(changeTimes(series)).toHaveLength(1);
    expect(guard.takePeak()).toBe(1);
    // And it still fades out at the end of its life, its second change.
    for (let t = T0 + 4700; t <= T0 + UNDO_LIFE_MS - 1; t += FRAME_MS) petals.update(t);
    expect(only(petals).brightness).toBeLessThan(0.05);
  });

  it('pooled: four bursts at once take no more than the pool, the newest whole; nothing new is made', () => {
    const { petals } = make();
    // The pool's instances follow the 80 cells' in the one mesh, and are drawn only while a burst flies: a petal
    // that only waits costs the 80 instances it cost before (T-146, 15-shaping.spec.ts).
    expect(petals.mesh.instanceMatrix.count).toBe(RINGS * STEPS + BURST_POOL);
    expect(petals.mesh.count).toBe(RINGS * STEPS);
    for (let k = 0; k < 4; k++) petals.show(`p${k}`, removed(k, 3 * k), T0 + UNDO_LIFE_MS, FROM);
    petals.update(T0);
    expect(drawn(petals)).toHaveLength(4 + BURST_POOL); // four petals, and the pool full
    expect(petals.mesh.count).toBe(RINGS * STEPS + BURST_POOL);
    petals.update(T0 + BURST_MS);
    expect(drawn(petals)).toHaveLength(4);
    expect(petals.mesh.count).toBe(RINGS * STEPS);
    for (let k = 0; k < 4; k++) petals.show(`q${k}`, removed(k, 3 * k + 1), T0 + 2 * UNDO_LIFE_MS, FROM);
    petals.update(T0 + BURST_MS + 1);
    expect(drawn(petals)).toHaveLength(8 + BURST_POOL); // the pool reused
  });

  it('hide during the drift takes the petal at once; clear takes a burst in the air too', () => {
    const { petals } = make();
    petals.show('a', removed(2, 2), T0 + UNDO_LIFE_MS, FROM);
    petals.update(T0);
    petals.hide('a'); // the undo
    expect(drawn(petals)).toHaveLength(BURST_PETALS - 1); // the rest of the burst lands by itself
    petals.update(T0 + BURST_MS);
    expect(petals.mesh.visible).toBe(false); // and then nothing is drawn
    petals.show('b', removed(2, 3), T0 + UNDO_LIFE_MS, FROM);
    petals.update(T0 + BURST_MS + 10);
    petals.clear(); // New garden
    expect(petals.mesh.visible).toBe(false);
    petals.update(T0 + BURST_MS + 20);
    expect(drawn(petals)).toEqual([]);
    // A burst after the clear draws its own five and none of the ones the clear stopped in the air.
    petals.show('c', removed(4, 0), T0 + 2 * UNDO_LIFE_MS, FROM);
    petals.update(T0 + BURST_MS + 30);
    expect(drawn(petals)).toHaveLength(BURST_PETALS);
  });
});

describe('PetalRenderer: high contrast (FR-UI-05, BUG-008)', () => {
  afterEach(() => settings.set({ highContrast: false }));

  it('a cream band round each undo petal, none under it and none for the burst, at its opacity, only in high contrast', () => {
    const { petals, parent } = make();
    expect(parent.children).toEqual([petals.mesh]);
    expect(petals.mesh.children).toEqual([petals.outline]); // a child: hidden with the petals
    expect(petals.outline.instanceMatrix).toBe(petals.mesh.instanceMatrix);
    expect(petals.outline.geometry).toBe(petals.mesh.geometry); // its aColour too: it fades with its petal
    expect(petals.outline.material.vertexShader).toContain('aColour.a');
    // Only the band outside the petal: under a fading petal a cream disc would brighten it past the guard.
    expect(petals.outline.material.fragmentShader).toMatch(/if \(vRim\.x \* vRim\.x < vRim\.y\) discard;/);
    expect(petals.outline.renderOrder).toBeLessThan(petals.mesh.renderOrder);
    petals.show('a', removed(2, 4), T0 + UNDO_LIFE_MS);
    petals.update(T0);
    expect(petals.outline.count).toBe(0); // no draw call
    settings.set({ highContrast: true });
    petals.update(T0 + FRAME_MS);
    expect(petals.outline.count).toBe(PLANT_CAPACITY);
    expect(petals.outline.visible).toBe(true); // kept visible, switched by its count: compiled at start (T-163)
    petals.show('b', removed(3, 9), T0 + UNDO_LIFE_MS, { x: 0.3, y: 0.05, z: 0.1 }); // a burst in the air
    petals.update(T0 + 2 * FRAME_MS);
    expect(petals.mesh.count).toBe(PLANT_CAPACITY + BURST_POOL);
    expect(petals.outline.count).toBe(PLANT_CAPACITY); // the burst's petals are not targets
    settings.set({ highContrast: false });
    petals.update(T0 + 3 * FRAME_MS);
    expect(petals.outline.count).toBe(0);
  });
});
