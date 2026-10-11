// FR-HND-05: the palm-up pose, the "give me a seed" intent. Pure.
import { PALM_UP_HOLD_MS, PALM_UP_MAX_ANGLE_DEG } from '../config.js';

import type { Vec3 } from '../../core/index.js';
import type { HandFrame } from '../InputSource.js';

const MIN_UP = Math.cos((PALM_UP_MAX_ANGLE_DEG * Math.PI) / 180);

/** FR-HND-05: a unit palm normal within 35 degrees of world up. */
export function isPalmUp(palmNormal: Vec3): boolean {
  return palmNormal.y >= MIN_UP;
}

/** FR-HND-05: the pose has to be held for 400 ms. Any sample without it, or without tracking, restarts the hold. */
export class PalmUpHold {
  private sinceMs = NaN; // NaN: the palm is not up
  private fired = false;

  /** True on the one sample that completes the hold; false again until the pose has been left and retaken. */
  update(frame: HandFrame, timeMs: number): boolean {
    if (!frame.tracked || !isPalmUp(frame.palmNormal)) {
      this.reset();
      return false;
    }
    if (Number.isNaN(this.sinceMs)) this.sinceMs = timeMs;
    if (this.fired || timeMs - this.sinceMs < PALM_UP_HOLD_MS) return false;
    this.fired = true;
    return true;
  }

  /** Starts over: the hand was lost (LLD §4), or it was busy with a pinch. */
  reset(): void {
    this.sinceMs = NaN;
    this.fired = false;
  }
}
