import { describe, expect, it } from 'vitest';

import { FLASH_CAP_PER_S, FLASH_MIN_DELTA } from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';

import { changeTimes, mostInOneSecond, type Drawn } from './changes.js';

const FRAME_MS = 1000 / 72;

/** Asks the guard for `wanted(frame)` on every frame of `durationMs`, and returns what it handed out. */
function run(
  guard: FlashGuard,
  element: number,
  durationMs: number,
  wanted: (frame: number) => number,
): Drawn[] {
  const series: Drawn[] = [];
  for (let frame = 0; frame * FRAME_MS < durationMs; frame++) {
    const t = frame * FRAME_MS;
    series.push({ t, value: guard.request(element, wanted(frame), t) });
  }
  return series;
}

describe('FlashGuard (FR-UI-11, LLD §5.9)', () => {
  it('constants are the contract values (API_SPEC §1.8)', () => {
    expect(FLASH_CAP_PER_S).toBe(3);
    expect(FLASH_MIN_DELTA).toBe(0.1);
  });

  it('a 4-per-second blink gets at most 3 changes in any 1 s window, and the report reads 3 (TC-E2E-15)', () => {
    const guard = new FlashGuard();
    const element = guard.claim(1);
    let peak = 0;
    const series: Drawn[] = [];
    for (let t = 0; t < 5000; t += FRAME_MS) {
      const asked = Math.floor(t / 125) % 2; // 0, 1, 0, 1 … : 8 changes a second
      series.push({ t, value: guard.request(element, asked, t) });
      peak = Math.max(peak, guard.takePeak());
    }
    expect(mostInOneSecond(series)).toBe(FLASH_CAP_PER_S);
    expect(peak).toBe(FLASH_CAP_PER_S);
  });

  it('a 4th change inside one second is held at the current brightness, then granted when the window has room', () => {
    const guard = new FlashGuard();
    const element = guard.claim(1);
    expect(guard.request(element, 1, 0)).toBe(1);
    expect(guard.request(element, 0, 100)).toBe(0);
    expect(guard.request(element, 1, 200)).toBe(1);
    expect(guard.request(element, 0, 300)).toBe(1); // the 4th: refused, held
    expect(guard.request(element, 0, 1000)).toBe(1); // the first change is exactly 1 s old: still in the window
    expect(guard.request(element, 0, 1001)).toBe(0);
    expect(guard.takePeak()).toBe(3);
  });

  it('a flash, up and back, is two changes; a slow fade is one', () => {
    const flash = new FlashGuard();
    const a = flash.claim(1);
    for (let i = 0; i <= 10; i++) flash.request(a, i / 10, i * FRAME_MS);
    for (let i = 10; i >= 0; i--) flash.request(a, i / 10, (20 - i) * FRAME_MS);
    expect(flash.takePeak()).toBe(2);

    const fade = new FlashGuard();
    const b = fade.claim(1, 1);
    let last = 1;
    for (let i = 1; i <= 100; i++) last = fade.request(b, 1 - i / 100, i * 9); // 0.9 s, 1 % a step
    expect(last).toBe(0);
    expect(fade.takePeak()).toBe(1);
  });

  it('an element that has not swung yet cannot flicker just under 10 % to either side of where it began', () => {
    // 0.41 and 0.59 on alternate frames around 0.5: each is under 0.1 from the start, and 0.18 from the other.
    const guard = new FlashGuard();
    const element = guard.claim(1, 0.5);
    const series = run(guard, element, 3000, (frame) => (frame % 2 ? 0.59 : 0.41));
    expect(changeTimes(series).length).toBeGreaterThan(0); // it did move: the test is not vacuous
    expect(mostInOneSecond(series)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(guard.takePeak()).toBe(FLASH_CAP_PER_S); // and the guard counted what it let through
  });

  it('before its first swing an element may move less than half of 10 % from its start, uncounted', () => {
    const guard = new FlashGuard();
    const element = guard.claim(1, 0.5);
    const series = run(guard, element, 1500, (frame) => 0.5 + (frame % 2 ? 0.049 : -0.049));
    for (const [frame, { value }] of series.entries()) expect(value).toBe(0.5 + (frame % 2 ? 0.049 : -0.049));
    expect(mostInOneSecond(series)).toBe(0); // its whole travel is 0.098
    expect(guard.takePeak()).toBe(0);
  });

  it('small steps back from the far end of a swing are free; a real reversal is the next change', () => {
    const guard = new FlashGuard();
    const element = guard.claim(1, 0.5);
    expect(guard.request(element, 1, 0)).toBe(1);
    expect(guard.request(element, 0.95, 10)).toBe(0.95);
    expect(guard.request(element, 0.91, 20)).toBe(0.91);
    expect(guard.takePeak()).toBe(1);
    expect(guard.request(element, 0.8, 30)).toBe(0.8);
    expect(guard.takePeak()).toBe(2);
  });

  it('elements are counted apart, a later claim keeps the earlier ones, and the peak is read once', () => {
    const guard = new FlashGuard();
    const first = guard.claim(2);
    for (const t of [0, 100, 200]) guard.request(first + 1, t === 100 ? 0 : 1, t);
    const second = guard.claim(3, 0.7);
    expect([first, second]).toEqual([0, 2]);
    expect(guard.request(second, 0.7, 250)).toBe(0.7); // claimed at 0.7: no swing
    expect(guard.request(first + 1, 0, 300)).toBe(1); // still capped after the arrays grew
    expect(guard.request(first, 1, 300)).toBe(1); // its neighbour is free to change
    expect(guard.takePeak()).toBe(3);
    expect(guard.takePeak()).toBe(0);
  });

  it('a request that is not a number changes nothing, and one outside 0..1 is clamped', () => {
    const guard = new FlashGuard();
    const element = guard.claim(1, 0.4);
    expect(guard.request(element, Number.NaN, 0)).toBe(0.4);
    expect(guard.request(element, 7, 10)).toBe(1);
    expect(guard.request(element, -7, 20)).toBe(0);
  });

  it('a time that is not finite changes nothing, and does not spoil the element for later', () => {
    const guard = new FlashGuard();
    const element = guard.claim(1, 0.4);
    const series: Drawn[] = [];
    for (let frame = 0; frame < 72; frame++) {
      series.push({ t: frame * FRAME_MS, value: guard.request(element, frame % 2, Number.NaN) });
    }
    expect(series.every(({ value }) => value === 0.4)).toBe(true);
    expect(guard.request(element, 1, Number.POSITIVE_INFINITY)).toBe(0.4);
    expect(guard.request(element, 1, Number.NEGATIVE_INFINITY)).toBe(0.4);
    expect(guard.takePeak()).toBe(0);
    // With a real clock again it swings, and the cap still counts from real times only.
    expect(guard.request(element, 1, 5000)).toBe(1);
    expect(guard.request(element, 0, 5010)).toBe(0);
    expect(guard.request(element, 1, 5020)).toBe(1);
    expect(guard.request(element, 0, 5030)).toBe(1);
    expect(guard.takePeak()).toBe(3);
  });

  it('an element id that was never claimed gets 0 and is never animated', () => {
    const guard = new FlashGuard();
    expect(guard.request(0, 1, 0)).toBe(0); // nothing claimed at all
    const first = guard.claim(2, 0.5);
    for (const id of [first + 2, -1, 0.5, Number.NaN]) {
      expect(guard.request(id, 1, 10), String(id)).toBe(0);
      expect(guard.request(id, 0.3, 20), String(id)).toBe(0);
      guard.reset(id, 1); // and a reset of one does nothing
    }
    expect(guard.takePeak()).toBe(0);
    expect(guard.request(first, 0.5, 30)).toBe(0.5); // the claimed ones are untouched
    expect(guard.request(first + 1, 0.5, 30)).toBe(0.5);
  });

  it('reset puts a reused element at a brightness with no swing in progress, and keeps its count', () => {
    const guard = new FlashGuard();
    const element = guard.claim(1, 0.7);
    guard.request(element, 1, 0);
    guard.request(element, 0.7, 100);
    guard.request(element, 1, 200); // three changes, and it stands at 1
    guard.reset(element, 0.7);
    expect(guard.request(element, 0.7, 210)).toBe(0.7); // at rest, and that was not a change
    expect(guard.request(element, 0.74, 220)).toBe(0.74); // a little either way is free again
    expect(guard.request(element, 1, 300)).toBe(0.74); // but the last second's three still count
    expect(guard.request(element, 1, 1001)).toBe(1);
    expect(guard.takePeak()).toBe(3);
  });
});
