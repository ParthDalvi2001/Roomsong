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
      'Table: a note.',
      'Walls: a note.',
      'Ceiling: mood.',
    ]);
    for (const [key, text] of ripple) {
      expect(text.length, key).toBeLessThanOrEqual(RIPPLE_CAPTION_MAX_CHARS);
      expect(text.split(' ').length, key).toBeLessThanOrEqual(RIPPLE_CAPTION_MAX_WORDS);
      expect(text, key).toMatch(/^(Table|Walls|Ceiling): /);
    }
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
    expect(STRINGS.gardenFull).toBe('Garden full. Remove a plant first.');
    expect(STRINGS.gardenFull.split(' ').length).toBeLessThanOrEqual(6); // FR-UI-01
  });

  it('holds the onboarding captions of UX §3.3, one instruction each, at most six words (FR-UI-01, T-150)', () => {
    const onboarding = entries.filter(([key]) => key.startsWith('onboard'));
    expect(onboarding.map(([, text]) => text)).toEqual([
      'Open your hand, palm up',
      'Pinch the seed, drop it here',
      'Click or tap to plant',
      'Look at a cell to plant', // gaze mode (T-160)
      'Show your palms to listen',
      'Click the orb to listen',
    ]);
    for (const [key, text] of onboarding) expect(text.split(' ').length, key).toBeLessThanOrEqual(6);
  });

  it('holds the two one-time notices onboarding/ raises (UX re-check 23 Oct), at most six words', () => {
    expect(STRINGS.seedsTomorrow).toBe('More seeds tomorrow');
    expect(STRINGS.undoHint).toBe('Pinch the petal to undo');
    expect(STRINGS.settingsHint).toBe('Turn a hand over for settings');
    for (const key of ['seedsTomorrow', 'undoHint', 'settingsHint'] as const)
      expect(STRINGS[key].split(' ').length, key).toBeLessThanOrEqual(6);
  });

  it('keys the message of a failure by its error code', () => {
    expect(STRINGS.E_SAVE_FAILED).toBe('This garden cannot be saved');
    expect(STRINGS.E_AUDIO_CONTEXT).toBe('No sound. Leave and enter again.'); // a session with no sound (API_SPEC §1.10 rule 2)
    const notices = [
      'gardenFull',
      'goodnight',
      'seedsTomorrow',
      'undoHint',
      'undoHintGaze',
      'undoHintClick',
      'settingsHint',
      'settingsHintLook',
      'soundResume',
      'soundResumeClick',
      'putControllersDown',
    ]; // T-152 and the 23 Oct audit: instructions, each with its gaze or window twin
    const failures = entries.filter(([k]) => !/^(ripple|place|onboard)/.test(k) && !notices.includes(k));
    for (const [key] of failures) expect(key).toMatch(/^E_[A-Z_]+$/);
  });
});
