// What a pinch would act on (FR-HND-04, LLD §4 Hover). Pure functions with no ECS in them: HandSystem turns the
// Interactable entities into candidates. The hover's memory (FR-HND-16) comes in as an argument, `kept`: the
// gesture machine holds what these functions returned last.
import { cellCentre, snapToCell } from '../garden/index.js';

import { HOVER_DEAD_BAND_M } from './config.js';

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

/**
 * FR-HND-04: the nearest candidate that has `pos` within its own hit radius; null when none has. Creates nothing.
 * `kept` is the hover memory (FR-HND-16): the candidate of that kind and id counts as HOVER_DEAD_BAND_M nearer
 * than it is, so another takes over only when it is that much closer, and the kept one lasts that far past its
 * radius. The highlight then cannot flicker between two neighbours or at the edge of a radius.
 * `only`: candidates of that kind alone (the one-hand palm pick takes a seed, whatever else is near the palm).
 */
export function pickTarget(
  pos: Vec3,
  candidates: readonly PickCandidate[],
  kept: TargetRef | null = null,
  only?: TargetRef['kind'],
): TargetRef | null {
  let best: TargetRef | null = null;
  let bestM = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!;
    if (only !== undefined && candidate.target.kind !== only) continue;
    const dx = candidate.pos.x - pos.x;
    const dy = candidate.pos.y - pos.y;
    const dz = candidate.pos.z - pos.z;
    let distM = Math.sqrt(dx * dx + dy * dy + dz * dz); // not Math.hypot: it allocates on every call in V8
    const { target } = candidate;
    if (kept !== null && target.kind === kept.kind && target.id === kept.id) distM -= HOVER_DEAD_BAND_M;
    if (distM <= candidate.radius && distM < bestM) {
      best = candidate.target;
      bestM = distM;
    }
  }
  return best;
}

/**
 * D-066, first device run: the settings panel is drawn over the real hand, which leaves no depth to reach by, so
 * fingers that look on a control can be 30 cm short of it. The nearest panel target past the hand, within its own hit
 * radius of the line from the eyes through `at`, with the same memory as `pickTarget`. Creates nothing.
 */
export function pickPastHand(
  eye: Vec3,
  at: Vec3,
  candidates: readonly PickCandidate[],
  kept: TargetRef | null = null,
): TargetRef | null {
  const dx = at.x - eye.x;
  const dy = at.y - eye.y;
  const dz = at.z - eye.z;
  const squared = dx * dx + dy * dy + dz * dz;
  if (squared === 0) return null;
  let best: TargetRef | null = null;
  let bestM = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!;
    const { target } = candidate;
    if (target.kind !== 'panel') continue;
    const vx = candidate.pos.x - eye.x;
    const vy = candidate.pos.y - eye.y;
    const vz = candidate.pos.z - eye.z;
    const along = (vx * dx + vy * dy + vz * dz) / squared;
    if (along <= 1) continue; // between the eyes and the hand: not what the fingers are on
    const ox = vx - along * dx;
    const oy = vy - along * dy;
    const oz = vz - along * dz;
    let offM = Math.sqrt(ox * ox + oy * oy + oz * oz);
    if (kept !== null && target.kind === kept.kind && target.id === kept.id) offM -= HOVER_DEAD_BAND_M;
    if (offM <= candidate.radius && offM < bestM) {
      best = target;
      bestM = offM;
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

const centre: Vec2 = { x: 0, y: 0 };

/**
 * FR-HND-16: `snapToCell` with the hover memory. `kept`, the cell this returned last, stays until the centre of
 * the newly snapped cell is at least HOVER_DEAD_BAND_M nearer to the point than its own, so a hand resting on the
 * border of two cells does not flicker between them. null off the bed, whatever `kept` is. Creates nothing.
 */
export function stickyCell(bedLocal: Vec2, kept: Cell | null): Cell | null {
  const cell = snapToCell(bedLocal);
  if (cell === null || kept === null) return cell;
  if (cell.ring === kept.ring && cell.step === kept.step) return kept;
  // Both distances are worked out here: a helper that returned one had V8 box it, 16 bytes a call (measured).
  cellCentre(kept, centre);
  let dx = centre.x - bedLocal.x;
  let dy = centre.y - bedLocal.y;
  const keptM = Math.sqrt(dx * dx + dy * dy);
  cellCentre(cell, centre);
  dx = centre.x - bedLocal.x;
  dy = centre.y - bedLocal.y;
  return keptM - Math.sqrt(dx * dx + dy * dy) < HOVER_DEAD_BAND_M ? kept : cell;
}
