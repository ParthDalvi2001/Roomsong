// FR-HND-07: the wake pose, a palm turned to the face. Pure; timed with PoseHold (palmsOut.ts).
import { WAKE_MAX_ANGLE_DEG, WAKE_MAX_DISTANCE_M } from '../config.js';

import type { Vec3 } from '../../core/index.js';
import type { HandFrame } from '../InputSource.js';

const MIN_FACING = Math.cos((WAKE_MAX_ANGLE_DEG * Math.PI) / 180);

/**
 * FR-HND-07: a tracked hand whose unit palm normal is within 40 degrees of the way from its palm to the head.
 * D-050: and no farther than 0.45 m from the head, so a palm face up on the lap or the table's edge does not wake.
 */
export function isPalmToFace(frame: HandFrame, head: Vec3): boolean {
  if (!frame.tracked) return false;
  const n = frame.palmNormal;
  const dx = head.x - frame.palmPos.x;
  const dy = head.y - frame.palmPos.y;
  const dz = head.z - frame.palmPos.z;
  const distanceSq = dx * dx + dy * dy + dz * dz;
  if (distanceSq > WAKE_MAX_DISTANCE_M * WAKE_MAX_DISTANCE_M) return false;
  // cos(angle) >= MIN_FACING, compared squared so no root is taken; the dot must be positive first.
  const dot = n.x * dx + n.y * dy + n.z * dz;
  return dot > 0 && dot * dot >= MIN_FACING * MIN_FACING * distanceSq;
}
