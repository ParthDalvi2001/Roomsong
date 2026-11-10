import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

  it('holds the six tuning-ripple captions of LLD §5.8, inside their limits and naming their surface', () => {
    const ripple = entries.filter(([key]) => key.startsWith('ripple'));
    expect(ripple.map(([, text]) => text)).toEqual([
      'Table: seeds.',
      'Table: a note.',
      'Walls: a note.',
      'Ceiling: minor mood.', // one per mode (D-071)
      'Ceiling: major mood.',
      'Ceiling: open mood.',
    ]);
    expect(RIPPLE_CAPTION_MAX_CHARS).toBeLessThanOrEqual(29); // ui/Captions.ts: the longest that fits unsqueezed
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

  it('holds the no-room notice of FR-ROOM-14 (D-068), six words, within the 29 characters a caption fits', () => {
    expect(STRINGS.noRoomScan).toBe('No room scan: run Space Setup');
    expect(STRINGS.noRoomScan.split(' ')).toHaveLength(6);
    expect(STRINGS.noRoomScan.length).toBeLessThanOrEqual(29); // ui/Captions.ts: the longest that fits unsqueezed
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
    expect(STRINGS.seedsTomorrow).toBe('No seeds left. More tomorrow.'); // BUG-056
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
      'noRoomScan',
    ]; // T-152 and the 23 Oct audit: instructions, each with its gaze or window twin
    // kind* and lib*: the seed picker's names (T-193).
    const failures = entries.filter(
      ([k]) => !/^(ripple|place|onboard|kind|lib)/.test(k) && !notices.includes(k),
    );
    for (const [key] of failures) expect(key).toMatch(/^E_[A-Z_]+$/);
  });

  it('holds the ten kind names and the two library names on twelve adjacent lines, and no other file has a kind name (T-193)', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
    const read = (file: string): string => readFileSync(join(root, file), 'utf8');
    const named = entries.filter(([key]) => /^(kind|lib)/.test(key));
    expect(named.map(([key]) => key)).toEqual([
      ...['kindBell', 'kindPluck', 'kindChoir', 'kindPad', 'kindBass'],
      ...['kindBowl', 'kindChime', 'kindFlute', 'kindReed', 'kindHum'],
      ...['libOld', 'libNew'],
    ]);
    expect([STRINGS.libOld, STRINGS.libNew]).toEqual(['Classic', 'Calm']);
    const kinds = named.slice(0, 10).map(([, text]) => text);
    expect(new Set(kinds).size).toBe(10);
    for (const name of kinds) expect(name.length, name).toBeLessThanOrEqual(14); // the board's name column at 50 px

    // One line each and nothing between them: a rename is these twelve lines.
    const lines = read('src/core/strings.ts').split('\n');
    const at = named.map(([key, text]) => lines.indexOf(`  ${key}: '${text}',`));
    expect(at[0]).toBeGreaterThan(0);
    expect(at).toEqual(at.map((_, i) => at[0]! + i));

    const files = ['src', 'tests']
      .flatMap((dir) =>
        readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' }).map((f) => join(dir, f)),
      )
      .filter((file) => file.endsWith('.ts') && file !== join('src', 'core', 'strings.ts'));
    expect(files.length).toBeGreaterThan(100);
    for (const file of files) {
      const source = read(file);
      for (const name of kinds) expect(source.includes(name), `${name} in ${file}`).toBe(false);
    }
  });
});
