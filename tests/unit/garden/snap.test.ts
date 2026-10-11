import { describe, expect, it } from 'vitest';

import { bedZone, cellCentre, RINGS, snapToCell, STEPS } from '../../../src/garden/index.js';

import type { Vec2 } from '../../../src/core/index.js';
import type { Cell } from '../../../src/garden/index.js';

const STEP_RAD = (2 * Math.PI) / STEPS;
const EPS = 1e-6;
/** The bed-local point at `len` metres from the centre, `angleRad` round from +x toward +z. */
const at = (len: number, angleRad = 0): Vec2 => ({
  x: len * Math.cos(angleRad),
  y: len * Math.sin(angleRad),
});
const HOSTILE: Vec2[] = [
  { x: NaN, y: 0.2 },
  { x: 0.2, y: NaN },
  { x: Infinity, y: 0 },
  { x: 0, y: -Infinity },
  { x: NaN, y: Infinity },
];

describe('garden/snap bedZone', () => {
  it('is inner below 0.09 m, outer above 0.35 m and bed in between (FR-HND-10, FR-HND-11)', () => {
    expect(bedZone({ x: 0, y: 0 })).toBe('inner');
    expect(bedZone(at(0.09 - EPS, 1))).toBe('inner');
    expect(bedZone(at(0.09 + EPS, 1))).toBe('bed');
    expect(bedZone(at(0.21, 4))).toBe('bed');
    expect(bedZone(at(0.35 - EPS, 2))).toBe('bed');
    expect(bedZone(at(0.35 + EPS, 2))).toBe('outer');
    expect(bedZone({ x: -3, y: 4 })).toBe('outer');
  });

  it('exactly 0.09 m and exactly 0.35 m are still the bed', () => {
    expect(bedZone({ x: 0.09, y: 0 })).toBe('bed');
    expect(bedZone({ x: 0, y: 0.35 })).toBe('bed');
  });

  it('a point that is not finite is inner, the zone where a release commits nothing', () => {
    for (const point of HOSTILE) expect(bedZone(point)).toBe('inner');
  });
});

describe('garden/snap snapToCell (TC-GAR-01)', () => {
  it('the five ring radii snap to rings 0..4', () => {
    const radii = [0.12, 0.165, 0.21, 0.255, 0.3];
    radii.forEach((len, ring) => expect(snapToCell(at(len))).toEqual({ ring, step: 0 }));
  });

  it('a ring owns half a ring gap to each side', () => {
    for (let ring = 0; ring < RINGS - 1; ring++) {
      const boundary = 0.12 + (ring + 0.5) * 0.045;
      expect(snapToCell(at(boundary - EPS, 2))?.ring).toBe(ring);
      expect(snapToCell(at(boundary + EPS, 2))?.ring).toBe(ring + 1);
    }
  });

  it('clamps inside the margins: 0.10 m is ring 0 and 0.34 m is ring 4', () => {
    expect(snapToCell(at(0.1))).toEqual({ ring: 0, step: 0 });
    expect(snapToCell(at(0.09 + EPS))).toEqual({ ring: 0, step: 0 });
    expect(snapToCell(at(0.34))).toEqual({ ring: 4, step: 0 });
    expect(snapToCell(at(0.35 - EPS))).toEqual({ ring: 4, step: 0 });
  });

  it('is null off the bed: nearer than 0.09 m or farther than 0.35 m', () => {
    expect(snapToCell({ x: 0, y: 0 })).toBeNull();
    expect(snapToCell(at(0.09 - EPS))).toBeNull();
    expect(snapToCell(at(0.35 + EPS))).toBeNull();
    expect(snapToCell(at(5, 3))).toBeNull();
  });

  it('is null exactly when bedZone is not bed, hostile points included', () => {
    const points = [...HOSTILE];
    for (let len = 0; len < 0.5; len += 0.013) points.push(at(len, len * 40));
    for (const point of points) expect(snapToCell(point) === null).toBe(bedZone(point) !== 'bed');
    for (const point of HOSTILE) expect(snapToCell(point)).toBeNull();
  });

  it('the sixteen step angles snap to steps 0..15, and a step owns half a step to each side', () => {
    for (let step = 0; step < STEPS; step++) {
      expect(snapToCell(at(0.21, step * STEP_RAD))).toEqual({ ring: 2, step });
      expect(snapToCell(at(0.21, (step + 0.5) * STEP_RAD - EPS))?.step).toBe(step);
      expect(snapToCell(at(0.21, (step + 0.5) * STEP_RAD + EPS))?.step).toBe((step + 1) % STEPS);
    }
  });

  it('angles wrap: -pi is +pi, and a full turn is step 0 again, never step 16', () => {
    expect(snapToCell({ x: -0.2, y: 0 })).toEqual({ ring: 2, step: 8 }); // atan2 = +pi
    expect(snapToCell({ x: -0.2, y: -0 })).toEqual({ ring: 2, step: 8 }); // atan2 = -pi
    expect(snapToCell(at(0.2, -Math.PI))).toEqual(snapToCell(at(0.2, Math.PI)));
    expect(snapToCell(at(0.2, 2 * Math.PI - 0.01))).toEqual({ ring: 2, step: 0 });
    expect(snapToCell(at(0.2, 16 * STEP_RAD))).toEqual({ ring: 2, step: 0 });
    expect(snapToCell(at(0.2, -0.01))).toEqual({ ring: 2, step: 0 });
  });

  it('a sweep of the whole bed finds 80 cells: rings 0..4 and steps 0..15, nothing else', () => {
    const seen = new Set<string>();
    for (let len = 0.09 + EPS; len < 0.35; len += 0.004) {
      for (let deg = -180; deg <= 540; deg += 1) {
        const cell = snapToCell(at(len, (deg * Math.PI) / 180));
        if (cell === null) throw new Error(`no cell at ${len} m, ${deg} degrees`);
        expect(Number.isInteger(cell.ring) && cell.ring >= 0 && cell.ring <= 4).toBe(true);
        expect(Number.isInteger(cell.step) && cell.step >= 0 && cell.step <= 15).toBe(true);
        seen.add(`${cell.ring}:${cell.step}`);
      }
    }
    expect(seen.size).toBe(80);
  }, 30_000); // about 94,000 checks: it ran past the default 5 s on a loaded machine

  it('hands out one shared frozen object per cell, not a new one per call', () => {
    const cell = snapToCell(at(0.255, 3 * STEP_RAD));
    expect(snapToCell(at(0.26, 3.1 * STEP_RAD))).toBe(cell);
    expect(Object.isFrozen(cell)).toBe(true);
  });
});

describe('garden/snap cellCentre', () => {
  it('writes into the out parameter and returns it', () => {
    const out = { x: 9, y: 9 };
    expect(cellCentre({ ring: 0, step: 0 }, out)).toBe(out);
    expect(out.x).toBeCloseTo(0.12, 12);
    expect(out.y).toBeCloseTo(0, 12);
  });

  it('puts ring r at 0.12 + r x 0.045 m from the centre, at every step', () => {
    const out = { x: 0, y: 0 };
    for (let ring = 0; ring < RINGS; ring++) {
      for (let step = 0; step < STEPS; step++) {
        cellCentre({ ring, step }, out);
        expect(Math.hypot(out.x, out.y)).toBeCloseTo(0.12 + ring * 0.045, 12);
      }
    }
  });

  it('D-029: step 0 is on +x, step 4 on +z (nearest the user), step 8 on -x, step 12 on -z', () => {
    const centre = (step: number): Vec2 => cellCentre({ ring: 4, step }, { x: 0, y: 0 });
    const expectAt = (step: number, x: number, z: number): void => {
      expect(centre(step).x).toBeCloseTo(x, 12);
      expect(centre(step).y).toBeCloseTo(z, 12); // a bed-local Vec2's y is bed-local z (API_SPEC §1.0)
    };
    expectAt(0, 0.3, 0);
    expectAt(4, 0, 0.3);
    expectAt(8, -0.3, 0);
    expectAt(12, 0, -0.3);
  });

  it('D-029: the steps advance from +x toward +z, clockwise seen from above', () => {
    for (let step = 0; step < STEPS; step++) {
      const a = cellCentre({ ring: 2, step }, { x: 0, y: 0 });
      const b = cellCentre({ ring: 2, step: (step + 1) % STEPS }, { x: 0, y: 0 });
      expect(a.x * b.y - a.y * b.x).toBeGreaterThan(0); // the turn from a to b goes from +x toward +z
    }
  });

  it('snapToCell(cellCentre(c)) is c for all 80 cells', () => {
    const out = { x: 0, y: 0 };
    let count = 0;
    for (let ring = 0; ring < RINGS; ring++) {
      for (let step = 0; step < STEPS; step++) {
        const cell: Cell = { ring, step };
        expect(snapToCell(cellCentre(cell, out))).toEqual(cell);
        count++;
      }
    }
    expect(count).toBe(80);
  });
});
