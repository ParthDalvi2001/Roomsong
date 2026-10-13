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

/**
 * The most changes the eye gets inside any one second of what was drawn, each second looked at by itself (T-119
 * review). A change is a swing of at least FLASH_MIN_DELTA in one direction, measured from the value the second
 * begins with or from where the last swing inside it ended. It knows nothing of what came before the second, so
 * a step that carries an old swing on after a pause is a change in the second it falls in: changeTimes, which
 * keeps the guard's own book, calls that the old swing and cannot see it.
 * The series is read back from 32-bit colours. The largest move the guard lets pass uncounted is one just under
 * FLASH_MIN_DELTA, and read back it came out as 0.10000000975 (seed 4 of the fuzz in PlantRenderer.test.ts): so
 * a move counts here from DRAWN_ROUNDING above the threshold, a margin far above that rounding and far below
 * anything an eye could tell.
 */
const DRAWN_ROUNDING = 1e-6;
export function mostInAnyClip(series: readonly Drawn[]): number {
  let most = 0;
  for (let from = 0; from < series.length; from++) {
    let farEnd = series[from]!.value;
    let direction = 0;
    let count = 0;
    for (let i = from + 1; i < series.length && series[i]!.t - series[from]!.t <= 1000; i++) {
      const move = series[i]!.value - farEnd;
      if (direction !== 0 && move * direction >= 0) farEnd = series[i]!.value;
      else if (Math.abs(move) >= FLASH_MIN_DELTA + DRAWN_ROUNDING) {
        count++;
        direction = Math.sign(move);
        farEnd = series[i]!.value;
      }
    }
    most = Math.max(most, count);
  }
  return most;
}
