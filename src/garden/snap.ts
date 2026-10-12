// Bed-local position <-> (ring, step) on the annulus, and the bed zone (LLD §5.1, FR-MUS-01).
// Frame (D-029): bed-local +x is the seated user's right and +z points toward the user. A bed-local Vec2 is
// that horizontal plane, x = x and y = z, so step 0 is at +x and step 4 is nearest the user.
// All three functions run per frame while a hand hovers: they allocate nothing.
import { BED_INNER, BED_OUTER, RINGS, STEPS, ZONE_INNER_MARGIN_M, ZONE_OUTER_MARGIN_M } from './config.js';

import type { BedZone, Cell } from './model.js';
import type { Vec2 } from '../core/index.js';

const RING_GAP_M = (BED_OUTER - BED_INNER) / (RINGS - 1);
const STEP_RAD = (2 * Math.PI) / STEPS;

// One frozen Cell per (ring, step), at index ring * STEPS + step: handing these out costs no allocation.
const CELLS: readonly Cell[] = Array.from({ length: RINGS * STEPS }, (_, i) =>
  Object.freeze({ ring: Math.floor(i / STEPS), step: i % STEPS }),
);

/** Internal to garden/: the shared frozen Cell for (ring, step); null when that is not a cell of the bed. */
export function cellAt(ring: number, step: number): Cell | null {
  const isCell =
    Number.isInteger(ring) &&
    Number.isInteger(step) &&
    ring >= 0 &&
    ring < RINGS &&
    step >= 0 &&
    step < STEPS;
  return isCell ? (CELLS[ring * STEPS + step] ?? null) : null;
}

/** Zone of a bed-local point: inner below 0.09 m, outer above 0.35 m (FR-HND-10, FR-HND-11). */
export function bedZone(bedLocal: Vec2): BedZone {
  // Math.sqrt, not Math.hypot: hypot costs about 16 bytes a call in V8 (measured in the T-124 review).
  const len = Math.sqrt(bedLocal.x * bedLocal.x + bedLocal.y * bedLocal.y);
  // A point that is not finite (a tracking glitch) is 'inner': the one zone where a release commits nothing.
  if (!Number.isFinite(len) || len < BED_INNER - ZONE_INNER_MARGIN_M) return 'inner';
  return len > BED_OUTER + ZONE_OUTER_MARGIN_M ? 'outer' : 'bed';
}

/** The nearest cell to a bed-local point (FR-MUS-01); null when bedZone is not 'bed'. It has no memory. */
export function snapToCell(bedLocal: Vec2): Cell | null {
  if (bedZone(bedLocal) !== 'bed') return null;
  const t =
    (Math.sqrt(bedLocal.x * bedLocal.x + bedLocal.y * bedLocal.y) - BED_INNER) / (BED_OUTER - BED_INNER);
  const ring = Math.round(Math.min(1, Math.max(0, t)) * (RINGS - 1));
  const turn = Math.round(Math.atan2(bedLocal.y, bedLocal.x) / STEP_RAD); // -8..8
  return cellAt(ring, (turn + STEPS) % STEPS);
}

/** Writes the bed-local centre of a cell (FR-MUS-01), in metres, into `out` and returns it. No validation. */
export function cellCentre(cell: Cell, out: Vec2): Vec2 {
  const radius = BED_INNER + cell.ring * RING_GAP_M;
  out.x = radius * Math.cos(cell.step * STEP_RAD);
  out.y = radius * Math.sin(cell.step * STEP_RAD);
  return out;
}
