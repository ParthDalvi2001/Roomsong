// What a pinch would act on (FR-HND-04, LLD §4 Hover). Pure functions with no ECS in them: HandSystem turns the
// Interactable entities into candidates. The hover cue's memory (dead band, `target:hover`) is T-116.
import { snapToCell } from '../garden/index.js';

import type { Mat4, Vec2, Vec3 } from '../core/index.js';
import type { Cell } from '../garden/index.js';

export interface TargetRef {
  kind: 'plant' | 'seed' | 'orb' | 'undo' | 'bed' | 'panel';
  id: string;
}

/** One Interactable (LLD §3) as the picker reads it: its own hit radius in metres and its world position. */
export interface PickCandidate {
  readonly target: TargetRef;
  /** At least `HIT_RADIUS_M`: whoever builds the candidates sets it. An Interactable's default, 0, is never picked. */
  readonly radius: number;
  readonly pos: Vec3;
}

/** FR-HND-04: the nearest candidate that has `pos` within its own hit radius; null when none has. Creates nothing. */
export function pickTarget(pos: Vec3, candidates: readonly PickCandidate[]): TargetRef | null {
  let best: TargetRef | null = null;
  let bestM = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!;
    const dx = candidate.pos.x - pos.x;
    const dy = candidate.pos.y - pos.y;
    const dz = candidate.pos.z - pos.z;
    const distM = Math.sqrt(dx * dx + dy * dy + dz * dz); // not Math.hypot: it allocates on every call in V8
    if (distM <= candidate.radius && distM < bestM) {
      best = candidate.target;
      bestM = distM;
    }
  }
  return best;
}

/**
 * A world point on the bed's horizontal plane, in metres from the bed centre (API_SPEC §1.0: x = bed-local x,
 * y = bed-local z; the height is dropped). `bedPose` is the BedAnchor entity's `matrixWorld.elements` (LLD §3).
 */
export function toBedLocal(bedPose: Mat4, world: Vec3, out: Vec2): Vec2 {
  // shortcut: the pose is read as rotation + translation, whose inverse is the transpose; a scaled bed needs a
  // full matrix inverse here
  const dx = world.x - bedPose[12]!;
  const dy = world.y - bedPose[13]!;
  const dz = world.z - bedPose[14]!;
  out.x = dx * bedPose[0]! + dy * bedPose[1]! + dz * bedPose[2]!;
  out.y = dx * bedPose[8]! + dy * bedPose[9]! + dz * bedPose[10]!;
  return out;
}

/**
 * FR-HND-16: the cell a release at `bedLocal` would commit: the snapped cell resolved to the nearest free one.
 * null off the bed or when the bed is full. `nearestFreeCell` is garden's, on the latest garden state.
 */
export function hoverCell(bedLocal: Vec2, nearestFreeCell: (cell: Cell) => Cell | null): Cell | null {
  const cell = snapToCell(bedLocal);
  return cell === null ? null : nearestFreeCell(cell);
}
