// FR-HND-05: the palm-up pose, the "give me a seed" intent. Pure.
import { PALM_UP_HOLD_MS, PALM_UP_MAX_ANGLE_DEG } from '../config.js';

import type { Vec3 } from '../../core/index.js';
import type { HandFrame } from '../InputSource.js';

const MIN_UP = Math.cos((PALM_UP_MAX_ANGLE_DEG * Math.PI) / 180);

/** FR-HND-05: a unit palm normal within 35 degrees of world up. */
export function isPalmUp(palmNormal: Vec3): boolean {
  return palmNormal.y >= MIN_UP;
}

/**
 * FR-HND-05: the pose has to be held for 400 ms, and asks again every 400 ms while it holds (T-127): the garden
 * ignores a palm-up it cannot serve (no visit yet, a seed already out) and forgets it, so a palm that stays up
 * must ask again. Any sample without the pose, or without tracking, restarts the hold.
 */
export class PalmUpHold {
  private sinceMs = NaN; // NaN: the palm is not up

  /** True on the sample that completes a hold; the next hold starts there. */
  update(frame: HandFrame, timeMs: number): boolean {
    if (!frame.tracked || !isPalmUp(frame.palmNormal)) {
      this.reset();
      return false;
    }
    if (Number.isNaN(this.sinceMs)) this.sinceMs = timeMs;
    if (timeMs - this.sinceMs < PALM_UP_HOLD_MS) return false;
    this.sinceMs = timeMs; // from this sample, not on the old count: a paused page asks once when it is back
    return true;
  }

  /** Starts over: the hand was lost (LLD §4), or it was busy with a pinch. */
  reset(): void {
    this.sinceMs = NaN;
  }
}
