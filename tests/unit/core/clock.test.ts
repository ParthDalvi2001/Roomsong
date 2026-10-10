import { afterEach, describe, expect, it, vi } from 'vitest';

import { clock, createClock } from '../../../src/core/clock.js';
import { MS_PER_DAY } from '../../../src/core/config.js';

afterEach(() => vi.useRealTimers());

describe('core/clock', () => {
  it('reads a fake source every time it is asked', () => {
    let t = 1000;
    const fake = createClock(() => t);
    expect(fake.now()).toBe(1000);
    t = 1016;
    expect(fake.now()).toBe(1016);
  });

  it('adds its offset: fakeDay=+2 is two days ahead of the source', () => {
    expect(createClock(() => 5, 2 * MS_PER_DAY).now()).toBe(5 + 2 * MS_PER_DAY);
  });

  it('setSource swaps the source and keeps the offset', () => {
    const driven = createClock(() => 1, 10);
    driven.setSource(() => 500);
    expect(driven.now()).toBe(510);
  });

  it('the app clock is wall time in milliseconds and follows fake timers', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T12:00:00Z'));
    expect(clock.now()).toBe(Date.parse('2026-11-18T12:00:00Z'));
  });
});
