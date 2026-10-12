// Luminance changes counted from a brightness series alone, for the flash-cap tests (FR-UI-11). It is the rule
// of LLD §5.9 written a second time, over what was drawn: it asks the FlashGuard nothing, so it can show the
// guard wrong.
import { FLASH_MIN_DELTA } from '../../../src/render/config.js';

export interface Drawn {
  t: number;
  value: number;
}

/**
 * When each change of a series began. A change is a swing of at least FLASH_MIN_DELTA in one direction, measured
 * from where the last swing ended (the first value, before any swing), stamped at the frame it got that far.
 * A swing ends only when the value comes back at least FLASH_MIN_DELTA from its far end.
 */
export function changeTimes(series: readonly Drawn[]): number[] {
  const times: number[] = [];
  let farEnd = series[0]?.value ?? 0;
  let direction = 0;
  for (const { t, value } of series) {
    const move = value - farEnd;
    if (direction !== 0 && move * direction >= 0) farEnd = value;
    else if (Math.abs(move) >= FLASH_MIN_DELTA - 1e-9) {
      times.push(t);
      direction = Math.sign(move);
      farEnd = value;
    }
  }
  return times;
}

/** The most changes of a series that began inside any one second. */
export function mostInOneSecond(series: readonly Drawn[]): number {
  const times = changeTimes(series);
  return Math.max(0, ...times.map((t) => times.filter((other) => other >= t && other - t <= 1000).length));
}
