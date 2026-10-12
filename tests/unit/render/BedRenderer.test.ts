import { Group, Light, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { BED_INNER, BED_OUTER, cellCentre, RINGS, STEPS } from '../../../src/garden/index.js';
import { BedRenderer } from '../../../src/render/BedRenderer.js';
import { BED_RIM_M } from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { PlantRenderer } from '../../../src/render/PlantRenderer.js';
import { TideRenderer } from '../../../src/render/TideRenderer.js';

import type { Mesh } from 'three';

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

describe('the rendering rules (NFR-PERF-09, TC-PERF-08)', () => {
  it('bed, plants and tide together: six meshes, no light, no shadow, statics that do not recompute', () => {
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
    expect(meshes).toHaveLength(6); // one draw call each at most: the budget of T-125 is 15
    for (const mesh of meshes) expect(mesh.matrixAutoUpdate).toBe(false);
    // No material is lit (none needs a light), and none samples a texture.
    for (const mesh of meshes) {
      const material = mesh.material as { lights?: boolean; map?: unknown };
      expect(material.lights ?? false).toBe(false);
      expect(material.map ?? null).toBeNull();
    }
  });
});
