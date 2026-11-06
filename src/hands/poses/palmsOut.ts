// FR-HND-06: the palms-out pose, the "let me listen" intent, and the hold every Listen pose is timed with. Pure.
import { PALMS_OUT_MAX_ANGLE_DEG, PALMS_OUT_MIN_DOWN_ANGLE_DEG, TRACKING_GRACE_MS } from '../config.js';

import type { Vec3 } from '../../core/index.js';
import type { HandFrame } from '../InputSource.js';

const MIN_OUT = Math.cos((PALMS_OUT_MAX_ANGLE_DEG * Math.PI) / 180);
const MAX_DOWN = Math.cos((PALMS_OUT_MIN_DOWN_ANGLE_DEG * Math.PI) / 180);

/**
 * FR-HND-06: a tracked, open hand (neither signal of a pinch) whose unit palm normal is within 40 degrees of the
 * head's unit forward: the palm faces away from the face, the way the user looks. D-050: not a palm within 30
 * degrees of world down, which is a hand resting on the table while the head looks down at it.
 */
export function isPalmOut(frame: HandFrame, headForward: Vec3): boolean {
  if (!frame.tracked || frame.pinch || frame.select) return false;
  const n = frame.palmNormal;
  if (-n.y >= MAX_DOWN) return false;
  return n.x * headForward.x + n.y * headForward.y + n.z * headForward.z >= MIN_OUT;
}

/**
 * A pose held for `holdMs` (FR-HND-06/07). True on the one sample that completes the hold; false again until the
 * pose has been left and retaken. A break of TRACKING_GRACE_MS or more restarts it; a shorter one is a tracking drop.
 */
export class PoseHold {
  private sinceMs = Number.NaN; // NaN: not in the pose
  private fired = false;
  private posedAtMs = Number.NEGATIVE_INFINITY;

  constructor(private readonly holdMs: number) {}

  update(isPosed: boolean, timeMs: number): boolean {
    if (!isPosed) {
      if (timeMs - this.posedAtMs >= TRACKING_GRACE_MS) this.reset();
      return false;
    }
    this.posedAtMs = timeMs;
    if (Number.isNaN(this.sinceMs)) this.sinceMs = timeMs;
    if (this.fired || timeMs - this.sinceMs < this.holdMs) return false;
    this.fired = true;
    return true;
  }

  reset(): void {
    this.sinceMs = Number.NaN;
    this.fired = false;
  }
}
