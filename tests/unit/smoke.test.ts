import { describe, expect, it } from 'vitest';

describe('T-101 scaffold smoke', () => {
  it('runs under Vitest in the node environment', () => {
    expect(typeof window).toBe('undefined');
    expect(2 + 2).toBe(4);
  });
});
