import { Group, Light, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { BED_INNER, BED_OUTER, cellCentre, RINGS, STEPS } from '../../../src/garden/index.js';
import { BedRenderer } from '../../../src/render/BedRenderer.js';
import {
  BED_RIM_M,
  FLASH_CAP_PER_S,
  HOVER_CUE_MS,
  MARKER_ALPHA,
  MARKER_HOVER_ALPHA,
} from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { PlantRenderer } from '../../../src/render/PlantRenderer.js';
import { TideRenderer } from '../../../src/render/TideRenderer.js';

import { changeTimes, mostInOneSecond, type Drawn } from './changes.js';

import type { Cell } from '../../../src/garden/index.js';
import type { BufferAttribute, Mesh } from 'three';

const FRAME_MS = 1000 / 72;

/** How strongly the marker of a cell is drawn: its alpha, as the shader gets it. */
function strength(bed: BedRenderer, { ring, step }: Cell): number {
  return bed.markers.geometry.getAttribute('aStrength').getX(ring * STEPS + step);
}

/** Calls update on every frame of `durationMs` and returns one cell's marker strength per frame. */
function watch(
  bed: BedRenderer,
  cell: Cell,
  fromMs: number,
  durationMs: number,
  each?: (frame: number) => void,
): Drawn[] {
  const series: Drawn[] = [];
  for (let frame = 0; frame * FRAME_MS < durationMs; frame++) {
    each?.(frame);
    bed.update(fromMs + frame * FRAME_MS);
    series.push({ t: fromMs + frame * FRAME_MS, value: strength(bed, cell) });
  }
  return series;
}

describe('BedRenderer (FR-MUS-01, UX §2)', () => {
  it('puts one marker on each of the 80 cells, at cellCentre in the bed frame of D-029', () => {
    const { markers } = new BedRenderer(new Group());
    expect(markers.count).toBe(RINGS * STEPS);
    const matrix = new Matrix4();
    const position = new Vector3();
    for (let ring = 0; ring < RINGS; ring++) {
      for (let step = 0; step < STEPS; step++) {
        markers.getMatrixAt(ring * STEPS + step, matrix);
        position.setFromMatrixPosition(matrix);
        const centre = cellCentre({ ring, step }, { x: 0, y: 0 });
        expect(position.x, `cell ${ring}/${step}`).toBeCloseTo(centre.x);
        expect(position.z, `cell ${ring}/${step}`).toBeCloseTo(centre.y);
        expect(position.y).toBeGreaterThan(0); // just above the glass
        expect(position.y).toBeLessThan(0.005);
      }
    }
    // Step 4 of the outer ring is the marker nearest the user: +z (D-029).
    markers.getMatrixAt(4 * STEPS + 4, matrix);
    expect(position.setFromMatrixPosition(matrix).z).toBeCloseTo(BED_OUTER);
  });

  it('the glass is a flat annulus from just inside ring 0 to just outside ring 4', () => {
    const { base } = new BedRenderer(new Group());
    const position = base.geometry.getAttribute('position');
    const radii = Array.from({ length: position.count }, (_, v) =>
      Math.hypot(position.getX(v), position.getZ(v)),
    );
    expect(Math.min(...radii)).toBeCloseTo(BED_INNER - BED_RIM_M);
    expect(Math.max(...radii)).toBeCloseTo(BED_OUTER + BED_RIM_M);
    for (let v = 0; v < position.count; v++) expect(position.getY(v)).toBeCloseTo(0);
  });

  it('the rim past the rings is one marker radius: a marker on ring 0 or ring 4 just fits on the glass (UX §2)', () => {
    expect(BED_RIM_M).toBe(0.0125);
  });

  it('is two meshes; dispose takes them out of the scene and frees their geometry and material', () => {
    const parent = new Group();
    const bed = new BedRenderer(parent);
    expect(parent.children).toEqual([bed.base, bed.markers]);
    const freed: string[] = [];
    bed.base.geometry.addEventListener('dispose', () => freed.push('glass geometry'));
    bed.base.material.addEventListener('dispose', () => freed.push('glass material'));
    bed.markers.geometry.addEventListener('dispose', () => freed.push('marker geometry'));
    bed.markers.material.addEventListener('dispose', () => freed.push('marker material'));
    bed.markers.addEventListener('dispose', () => freed.push('marker instances'));
    bed.dispose();
    expect(parent.children).toEqual([]);
    expect(freed.sort()).toEqual(
      ['glass geometry', 'glass material', 'marker geometry', 'marker instances', 'marker material'].sort(),
    );
  });
});

describe('BedRenderer hover cue (FR-HND-16, FR-UI-11)', () => {
  const HERE: Cell = { ring: 2, step: 5 };
  const THERE: Cell = { ring: 4, step: 15 };

  it('every marker rests at its faint strength; the hovered one fades up over 100 ms and back when it is left', () => {
    const guard = new FlashGuard();
    const bed = new BedRenderer(new Group(), guard);
    for (let i = 0; i < RINGS * STEPS; i++) {
      expect(strength(bed, { ring: Math.floor(i / STEPS), step: i % STEPS })).toBeCloseTo(MARKER_ALPHA);
    }
    bed.update(0);
    bed.setHover('right', HERE);
    const up = watch(bed, HERE, FRAME_MS, 2 * HOVER_CUE_MS);
    const oneFrame = ((MARKER_HOVER_ALPHA - MARKER_ALPHA) * FRAME_MS) / HOVER_CUE_MS;
    expect(up[0]!.value).toBeCloseTo(MARKER_ALPHA + oneFrame);
    const fullAtMs = up.find((drawn) => drawn.value === MARKER_HOVER_ALPHA)!.t;
    expect(fullAtMs).toBeGreaterThanOrEqual(HOVER_CUE_MS);
    expect(fullAtMs).toBeLessThan(HOVER_CUE_MS + 2 * FRAME_MS); // the first frame that is 100 ms in
    expect(up[up.length - 1]!.value).toBe(MARKER_HOVER_ALPHA);
    expect(changeTimes(up)).toHaveLength(1); // a level, not a blink
    expect(strength(bed, THERE)).toBeCloseTo(MARKER_ALPHA);
    expect(strength(bed, { ring: 2, step: 4 })).toBeCloseTo(MARKER_ALPHA);

    bed.setHover('right', null);
    const down = watch(bed, HERE, up[up.length - 1]!.t + FRAME_MS, 2 * HOVER_CUE_MS); // the frames carry on
    expect(down[0]!.value).toBeLessThan(MARKER_HOVER_ALPHA);
    expect(down[0]!.value).toBeGreaterThan(0.8);
    expect(down[down.length - 1]!.value).toBeCloseTo(MARKER_ALPHA);
    expect(changeTimes(down)).toHaveLength(1);
    expect(guard.takePeak()).toBe(2); // the page's guard saw both: one up, one back
  });

  it('one cue per hand; a hand that moves on leaves its cell to fade; two hands on one cell are one cue', () => {
    const bed = new BedRenderer(new Group());
    bed.update(0);
    bed.setHover('left', HERE);
    bed.setHover('right', THERE);
    watch(bed, HERE, FRAME_MS, 2 * HOVER_CUE_MS);
    expect(strength(bed, HERE)).toBe(MARKER_HOVER_ALPHA);
    expect(strength(bed, THERE)).toBe(MARKER_HOVER_ALPHA);

    bed.setHover('right', HERE); // the right hand joins the left: THERE fades, HERE stays as it is
    const joined = watch(bed, HERE, 1000, 2 * HOVER_CUE_MS);
    expect(changeTimes(joined)).toHaveLength(0);
    expect(strength(bed, THERE)).toBeCloseTo(MARKER_ALPHA);

    bed.setHover('left', null); // one of the two leaves: still hovered
    expect(changeTimes(watch(bed, HERE, 2000, 2 * HOVER_CUE_MS))).toHaveLength(0);
    bed.setHover('right', null);
    watch(bed, HERE, 3000, 2 * HOVER_CUE_MS);
    expect(strength(bed, HERE)).toBeCloseTo(MARKER_ALPHA);
  });

  it('a cell that is not on the bed is no cue, and a time that is not finite moves nothing', () => {
    const bed = new BedRenderer(new Group());
    const uploads = (): number => (bed.markers.geometry.getAttribute('aStrength') as BufferAttribute).version;
    bed.update(0);
    bed.setHover('right', HERE);
    for (const [ring, step] of [
      [5, 0],
      [0, 16],
      [-1, 3],
      [1.5, 2],
      [Number.NaN, 0],
    ] as const) {
      bed.setHover('left', { ring, step });
    }
    const before = uploads();
    for (const none of [Number.NaN, Number.POSITIVE_INFINITY]) bed.update(none);
    expect(uploads()).toBe(before);
    expect(strength(bed, HERE)).toBeCloseTo(MARKER_ALPHA);
    watch(bed, HERE, FRAME_MS, 2 * HOVER_CUE_MS);
    expect(strength(bed, HERE)).toBe(MARKER_HOVER_ALPHA);
    for (let i = 0; i < RINGS * STEPS; i++) {
      const cell = { ring: Math.floor(i / STEPS), step: i % STEPS };
      if (i !== HERE.ring * STEPS + HERE.step) expect(strength(bed, cell)).toBeCloseTo(MARKER_ALPHA);
    }
    // At rest again nothing is uploaded: only a change is.
    const settled = uploads();
    watch(bed, HERE, 1000, 200);
    expect(uploads()).toBe(settled);
  });

  it('a hover that flickers on and off cannot make a marker blink: 3 changes a second at most (FR-UI-11)', () => {
    const guard = new FlashGuard();
    const bed = new BedRenderer(new Group(), guard);
    bed.update(0);
    const everyFrame = watch(bed, HERE, FRAME_MS, 1000, (frame) =>
      bed.setHover('right', frame % 2 ? null : HERE),
    );
    expect(mostInOneSecond(everyFrame)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    // On for 100 ms, off for 100 ms: a full fade each way, five flashes a second asked for.
    const onOff = watch(bed, HERE, 2000, 4000, (frame) =>
      bed.setHover('right', Math.floor((frame * FRAME_MS) / HOVER_CUE_MS) % 2 ? null : HERE),
    );
    expect(changeTimes(onOff).length).toBeGreaterThan(FLASH_CAP_PER_S); // it did keep changing
    expect(mostInOneSecond(onOff)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(guard.takePeak()).toBe(FLASH_CAP_PER_S);
  });

  it('the cue costs no draw call: the markers stay one instanced mesh, each marker its own guard element', () => {
    const parent = new Group();
    const guard = new FlashGuard();
    const first = guard.claim(1); // something else claimed before the bed
    const bed = new BedRenderer(parent, guard);
    expect(parent.children).toEqual([bed.base, bed.markers]);
    expect(guard.claim(1) - first).toBe(1 + RINGS * STEPS);
  });
});

describe('the rendering rules (NFR-PERF-09, TC-PERF-08)', () => {
  it('bed, plants and tide together: nine meshes, no light, no shadow, statics that do not recompute', () => {
    const parent = new Group();
    const guard = new FlashGuard();
    new BedRenderer(parent);
    new PlantRenderer(parent, guard);
    new TideRenderer(parent, guard);
    const meshes: Mesh[] = [];
    parent.traverse((object) => {
      expect(object).not.toBeInstanceOf(Light);
      expect(object.castShadow || object.receiveShadow).toBe(false);
      if ((object as Mesh).isMesh) meshes.push(object as Mesh);
    });
    // Bed 2, the five silhouettes, the whorls, the tide: one draw call each at most, per eye; a mesh with no
    // instance to draw makes none.
    expect(meshes).toHaveLength(9);
    for (const mesh of meshes) expect(mesh.matrixAutoUpdate).toBe(false);
    // No material is lit (none needs a light), and none samples a texture.
    for (const mesh of meshes) {
      const material = mesh.material as { lights?: boolean; map?: unknown };
      expect(material.lights ?? false).toBe(false);
      expect(material.map ?? null).toBeNull();
    }
  });

  it('what lies flat on the bed is drawn in order: the glass, then its markers, then the tide over both', () => {
    const parent = new Group();
    const guard = new FlashGuard();
    const bed = new BedRenderer(parent, guard);
    const tide = new TideRenderer(parent, guard);
    // All three are transparent and write no depth, so the order they are drawn in is the order they lie in.
    expect(bed.markers.renderOrder).toBeGreaterThan(bed.base.renderOrder);
    expect(tide.mesh.renderOrder).toBeGreaterThan(bed.markers.renderOrder);
    expect(bed.markers.frustumCulled).toBe(false); // 80 markers, the bounds of one
  });
});
