import { describe, expect, it, vi } from 'vitest';

import { Pool } from '../../../src/core/pool.js';

describe('core/pool', () => {
  it('pre-allocates and then reuses without calling the factory again', () => {
    const factory = vi.fn(() => ({ v: 0 }));
    const pool = new Pool(factory, 4);
    expect(factory).toHaveBeenCalledTimes(4);

    for (let round = 0; round < 100; round++) {
      const a = pool.acquire();
      const b = pool.acquire();
      expect(pool.inUse).toBe(2);
      pool.release(a);
      pool.release(b);
    }
    expect(factory).toHaveBeenCalledTimes(4);
    expect(pool).toMatchObject({ size: 4, grown: 0, inUse: 0 });
  });

  it('grows by exactly one object per acquire past its size, and keeps what it grew', () => {
    const factory = vi.fn(() => ({}));
    const pool = new Pool(factory, 1);
    const a = pool.acquire();
    const b = pool.acquire();
    const c = pool.acquire();
    expect(new Set([a, b, c]).size).toBe(3);
    expect(pool).toMatchObject({ size: 3, grown: 2, inUse: 3 });

    pool.release(b);
    expect(pool.acquire()).toBe(b);
    expect(factory).toHaveBeenCalledTimes(3);
  });

  it('refuses a second release and a foreign object', () => {
    const pool = new Pool(() => ({}), 2);
    const a = pool.acquire();
    expect(pool.release(a)).toBe(true);
    expect(pool.release(a)).toBe(false);
    expect(pool.release({})).toBe(false);
    expect(pool.inUse).toBe(0);
    // The double release did not put `a` in the free list twice.
    expect(pool.acquire()).not.toBe(pool.acquire());
    expect(pool.grown).toBe(0);
  });
});
