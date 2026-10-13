// Flash cap (FR-UI-11, LLD §5.9): no element changes luminance more than FLASH_CAP_PER_S times in any 1 s.
// Animation code never writes a brightness itself: every frame it asks the guard for the value it wants and
// draws what the guard hands back. The guard counts from the values it hands out, so its report does not
// depend on the callers.
// A change is one swing of an element's brightness in one direction of at least FLASH_MIN_DELTA, measured from
// where the last swing ended. It is counted when it starts, because that is the moment it can still be refused.
// A refused swing holds the element at its current brightness until the window has room. A swing ends only when
// the brightness comes back at least FLASH_MIN_DELTA from its far end: a pause does not end it. But a swing
// counts from its last movement: when it moves on, its time moves on with it, and the window is measured from
// there.
import { FLASH_CAP_PER_S, FLASH_MIN_DELTA, FLASH_WINDOW_MS } from './config.js';

// Per element: the value handed out last, the far end of its current swing, the swing's direction (0 = none yet),
// then the times of its latest changes, oldest first. One time more than the cap is kept, so the report can read
// above the cap if the guard ever lets a change through that it should not.
const VALUE = 0;
const PIVOT = 1;
const DIRECTION = 2;
const TIMES = 3;
const KEPT = FLASH_CAP_PER_S + 1;
const STRIDE = TIMES + KEPT;

export class FlashGuard {
  private data = new Float64Array(0);
  private peak = 0;

  /** Reserves `count` elements at `brightness` and returns the id of the first. Set-up only: it allocates. */
  claim(count: number, brightness = 0): number {
    const first = this.data.length / STRIDE;
    const data = new Float64Array((first + count) * STRIDE);
    data.set(this.data);
    for (let i = first * STRIDE; i < data.length; i += STRIDE) {
      data[i + VALUE] = data[i + PIVOT] = brightness;
      data.fill(Number.NEGATIVE_INFINITY, i + TIMES, i + STRIDE);
    }
    this.data = data;
    return first;
  }

  /**
   * Set-up only: a new thing drawn on a reused element (a new plant on a freed slot) starts at `brightness` with
   * no swing in progress. The element's changes of the last second stay counted.
   */
  reset(element: number, brightness: number): void {
    const d = this.data;
    const i = element * STRIDE;
    if (d[i + VALUE] === undefined || brightness !== brightness) return;
    d[i + VALUE] = d[i + PIVOT] = Math.min(1, Math.max(0, brightness));
    d[i + DIRECTION] = 0;
  }

  /**
   * Asks for brightness `target` (0..1) on an element at `nowMs`, the frame's time; returns the brightness to
   * draw (FR-UI-11). A target that is not a number, or a time that is not finite, changes nothing. An element
   * that was never claimed gets 0.
   */
  request(element: number, target: number, nowMs: number): number {
    const d = this.data;
    const i = element * STRIDE;
    const value = d[i + VALUE];
    if (value === undefined) return 0;
    if (target !== target || !Number.isFinite(nowMs)) return value;
    target = Math.min(1, Math.max(0, target)); // written out: a call that returns a fraction is boxed by V8
    const move = target - d[i + PIVOT]!;
    const direction = d[i + DIRECTION]!;
    // Onward in the direction already granted: the same swing, and the pivot rides its far end. A swing counts
    // from its last movement: one that moves on after a pause (a crest on a plant a hover already lit, a tint on
    // one whose glow has gone) is a change the eye gets now, so its time moves to now. Without that, three more
    // changes could follow it inside the second and the report still read 3 (T-119 review).
    if (direction !== 0 && move * direction >= 0) {
      if (move !== 0) d[i + STRIDE - 1] = nowMs;
      return (d[i + PIVOT] = d[i + VALUE] = target);
    }
    // Short of a change. Before the first swing the element may move to either side of where it started, so
    // each side gets half: its whole travel then stays under FLASH_MIN_DELTA. Two comparisons, not one against a
    // limit picked by the condition: V8 boxed that limit, 16 bytes per request of an element that had never
    // swung, so per plant per frame until its first note (measured in T-119).
    const size = Math.abs(move);
    if (direction === 0 ? size < FLASH_MIN_DELTA / 2 : size < FLASH_MIN_DELTA) {
      return (d[i + VALUE] = target);
    }
    // A new swing, if the window has room for it.
    if (!this.startSwing(i, nowMs)) return value;
    d[i + DIRECTION] = move > 0 ? 1 : -1;
    return (d[i + PIVOT] = d[i + VALUE] = target);
  }

  /**
   * Notes a new change of the element at offset `i`, unless the change FLASH_CAP_PER_S back is still inside the
   * window. Apart from `request` so that `request` stays small: V8 inlines it into the renderers' loops only
   * while it is, and a call that is not inlined boxes the fraction it returns (PlantRenderer.heap.test.ts).
   */
  private startSwing(i: number, nowMs: number): boolean {
    const d = this.data;
    if (nowMs - d[i + TIMES + 1]! <= FLASH_WINDOW_MS) return false;
    let inWindow = 1;
    for (let k = TIMES; k < STRIDE - 1; k++) {
      const time = (d[i + k] = d[i + k + 1]!);
      if (nowMs - time <= FLASH_WINDOW_MS) inWindow++;
    }
    d[i + STRIDE - 1] = nowMs;
    if (inWindow > this.peak) this.peak = inWindow;
    return true;
  }

  /** `perf:sample.maxFlashPerS`: the most changes any one element had inside one second, since the last call. */
  takePeak(): number {
    const peak = this.peak;
    this.peak = 0;
    return peak;
  }
}
