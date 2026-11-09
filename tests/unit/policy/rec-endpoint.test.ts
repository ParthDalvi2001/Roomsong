// BUG-048: the dev server's `/__rec` (vite.config.ts) appends only what the headset recorder writes.
import { describe, expect, it } from 'vitest';

import { isRecBody } from '../../../vite.config';

describe('isRecBody: the lines /__rec accepts', () => {
  it("the recorder's lines: JSON objects with a numeric t and a string kind, data or not", () => {
    expect(isRecBody('{"t":12,"kind":"bus","data":{"a":1}}\n{"t":0,"kind":"start"}')).toBe(true);
  });

  it('anything else is refused whole', () => {
    for (const body of [
      '',
      'hello',
      '{"t":1,"kind":"ok"}\n',
      '{"t":1,"kind":"ok"}\nnot json',
      '{"t":"1","kind":"ok"}',
      '{"t":1,"kind":2}',
      '{"kind":"ok"}',
      '[{"t":1,"kind":"ok"}]',
      'null',
    ])
      expect(isRecBody(body), body).toBe(false);
  });
});
