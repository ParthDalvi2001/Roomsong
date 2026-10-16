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

  it('holds the hand hint of FR-HND-15 under the key hands/ raises it by', () => {
    expect(STRINGS.handOutOfView).toBe('Hand out of view');
  });

  it('holds the two level-3 placement hints of UX §9.2, six words each (FR-UI-01)', () => {
    expect(STRINGS.placeLook).toBe('Look at your table, and pinch');
    expect(STRINGS.placeLookGaze).toBe('Look at your table, and wait');
    for (const key of ['placeLook', 'placeLookGaze'] as const)
      expect(STRINGS[key].split(' ')).toHaveLength(6);
  });

  it('holds the ending of a Listen that ran its time (UX §3.5, T-148)', () => {
    expect(STRINGS.goodnight).toBe('Goodnight');
  });

  it('holds the full-bed caption of UX §7 under the key render/ raises it by (T-127)', () => {
    expect(STRINGS.gardenFull).toBe('Garden is full');
  });

  it('keys the message of a failure by its error code', () => {
    expect(STRINGS.E_SAVE_FAILED).toBe('Saving unavailable');
    expect(STRINGS.E_AUDIO_CONTEXT).toBe('Sound unavailable'); // a session with no sound (API_SPEC §1.10 rule 2)
    const notices = ['handOutOfView', 'gardenFull', 'goodnight'];
    const failures = entries.filter(([k]) => !/^(ripple|place)/.test(k) && !notices.includes(k));
    for (const [key] of failures) expect(key).toMatch(/^E_[A-Z_]+$/);
  });
});
