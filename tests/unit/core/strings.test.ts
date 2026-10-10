import { describe, expect, it } from 'vitest';

import { RIPPLE_CAPTION_MAX_CHARS, RIPPLE_CAPTION_MAX_WORDS } from '../../../src/core/config.js';
import { STRINGS } from '../../../src/core/strings.js';

const entries = Object.entries(STRINGS);

describe('core/strings', () => {
  it('every string is plain English text: ASCII letters, digits and basic punctuation, no markup', () => {
    for (const [key, text] of entries) {
      expect(text, key).toMatch(/^[A-Za-z0-9][A-Za-z0-9 .,:;!?'()-]*$/);
      expect(text, key).toBe(text.trim());
      expect(text, key).not.toMatch(/ {2}/);
    }
  });

  it('holds the four tuning-ripple captions of LLD §5.8, inside their limits and naming their surface', () => {
    const ripple = entries.filter(([key]) => key.startsWith('ripple'));
    expect(ripple.map(([, text]) => text)).toEqual([
      'Table: seeds.',
      'Table: colour.',
      'Walls: colour.',
      'Ceiling: scale.',
    ]);
    for (const [key, text] of ripple) {
      expect(text.length, key).toBeLessThanOrEqual(RIPPLE_CAPTION_MAX_CHARS);
      expect(text.split(' ').length, key).toBeLessThanOrEqual(RIPPLE_CAPTION_MAX_WORDS);
      expect(text, key).toMatch(/^(Table|Walls|Ceiling): /);
    }
  });

  it('keys the message of a failure by its error code', () => {
    expect(STRINGS.E_SAVE_FAILED).toBe('Saving unavailable');
    for (const [key] of entries.filter(([k]) => !k.startsWith('ripple'))) expect(key).toMatch(/^E_[A-Z_]+$/);
  });
});
