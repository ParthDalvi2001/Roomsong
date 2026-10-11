// The hold signal of a pinch (FR-HND-02, LLD §4): pure, no XR types. Moved here from the T-105 test page, which
// still runs on it (proto/pinch/).
import { PINCH_DEBOUNCE_FRAMES, PINCH_ENTER_M, PINCH_LOCKOUT_MS, PINCH_RELEASE_M } from '../config.js';

/** FR-HND-02: pinch start and end from the thumb-tip to index-tip distance of one hand. */
export class PinchMachine {
  private pinching = false;
  /** Consecutive frames that ask for the other state. */
  private streak = 0;
  private releasedAt = -Infinity;

  /** `HandFrame.pinch`: true from the confirmed start to the confirmed end. */
  get isPinching(): boolean {
    return this.pinching;
  }

  /** One tracked frame: the gap in metres and the time in ms. Returns the edge this frame confirms, if any. */
  update(gapM: number, nowMs: number): 'start' | 'end' | null {
    const flip = this.pinching
      ? gapM > PINCH_RELEASE_M
      : gapM < PINCH_ENTER_M && nowMs - this.releasedAt >= PINCH_LOCKOUT_MS;
    this.streak = flip ? this.streak + 1 : 0;
    if (this.streak < PINCH_DEBOUNCE_FRAMES) return null;
    this.streak = 0;
    this.pinching = !this.pinching;
    if (this.pinching) return 'start';
    this.releasedAt = nowMs;
    return 'end';
  }

  /** The hand lost tracking: frames either side of the loss are not consecutive. A held pinch stays held. */
  lost(): void {
    this.streak = 0;
  }
}
