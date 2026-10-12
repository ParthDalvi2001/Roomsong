// FR-SYS-03, UX §3.1: what the landing page says about the device, from what the browser reported.
import { describe, expect, it } from 'vitest';

import { detectSupport, featureLines } from '../../../src/ui/Landing.js';
import { LANDING } from '../../../src/ui/strings.js';

describe('detectSupport', () => {
  it('knows only about immersive AR before a session: the rest cannot be asked without one', () => {
    expect(detectSupport(true, null)).toEqual({
      immersiveAr: 'yes',
      handTracking: 'unknown',
      planeDetection: 'unknown',
      anchors: 'unknown',
    });
    expect(detectSupport(false, null).immersiveAr).toBe('no');
    expect(detectSupport(undefined, null).immersiveAr).toBe('unknown'); // the browser has not answered yet
  });

  it('reads what a session was granted', () => {
    expect(detectSupport(true, ['viewer', 'local', 'hand-tracking', 'anchors'])).toEqual({
      immersiveAr: 'yes',
      handTracking: 'yes',
      planeDetection: 'no',
      anchors: 'yes',
    });
    expect(detectSupport(true, ['hand-tracking', 'plane-detection'])).toMatchObject({
      planeDetection: 'yes',
      anchors: 'no',
    });
  });

  it('takes a started session as proof of hand tracking (a required feature) when the browser lists nothing', () => {
    expect(detectSupport(true, undefined)).toEqual({
      immersiveAr: 'yes',
      handTracking: 'yes',
      planeDetection: 'unknown',
      anchors: 'unknown',
    });
  });
});

describe('featureLines: the visible text', () => {
  it('says plainly what is supported, what is not, and what the app does without it', () => {
    const lines = featureLines(detectSupport(true, ['hand-tracking']));
    expect(lines).toEqual([
      'Mixed reality: supported.',
      'Hand tracking: on.',
      'Table detection: not available. The garden asks you where to put it, or floats in front of you.',
      'Saved position: not available. The garden is placed again on each visit.',
    ]);
  });

  it('says what is still unknown before the first session, and that hands are required', () => {
    const lines = featureLines(detectSupport(true, null));
    expect(lines[1]).toBe('Hand tracking: checked when you enter. Roomsong cannot start without it.');
    expect(lines[2]).toMatch(/^Table detection: checked when you enter\. Without it /);
    expect(lines[3]).toMatch(/^Saved position: checked when you enter\. Without it /);
  });

  it('names the missing immersive AR', () => {
    const [first] = featureLines(detectSupport(false, null));
    expect(first).toBe('Mixed reality: not supported. Roomsong needs it.');
  });
});

describe('the wording of UX §9.7', () => {
  it("uses a visitor's words: no browser feature name, no promise of eye control or of a tuned song", () => {
    const texts = (value: unknown): string[] =>
      typeof value === 'string' ? [value] : Object.values(value as object).flatMap(texts);
    for (const text of texts(LANDING)) {
      expect(text).not.toMatch(/immersive AR|plane detection|anchors|eyes only|gaze|tune/i);
    }
    expect(LANDING.accessHeading).toBe('Accessibility');
    expect(LANDING.access.gazeDwell).toBe('No hands: look and hold');
    expect(LANDING.E_XR_UNSUPPORTED).toBe(
      'Roomsong is played in a mixed-reality headset. Open this page in the browser of a Meta Quest 3 or 3S.',
    );
    expect(LANDING.features.anchors.yes).toBe(
      'Saved position: on. The garden can come back to the same spot.',
    );
    expect(LANDING.help[2]).toMatch(/Where you plant it sets when it sounds and which note it sings\.$/);
    expect(LANDING.help[3]).toMatch(/^Hold your palms out, facing away from you, to sit back and listen\./);
    // The privacy line names the room and the hands, and that the save is this browser's.
    expect(LANDING.privacy).toBe(
      'Your garden is saved in this browser, on this device only. What the headset shares about your room and your hands stays on the device: nothing is sent anywhere.',
    );
  });
});

describe('landing strings', () => {
  it('are plain English in the character set of core/strings.ts', () => {
    const texts = (value: unknown): string[] =>
      typeof value === 'string' ? [value] : Object.values(value as object).flatMap(texts);
    const all = texts(LANDING);
    expect(all.length).toBeGreaterThan(20);
    for (const text of all) {
      expect(text).toMatch(/^[A-Za-z0-9][A-Za-z0-9 .,:;!?'()-]*$/);
      expect(text).toBe(text.trim());
      expect(text).not.toMatch(/ {2}/);
    }
  });

  it('give a first-time user three or four things in Help (not a manual)', () => {
    expect(LANDING.help.length).toBeGreaterThanOrEqual(3);
    expect(LANDING.help.length).toBeLessThanOrEqual(4);
  });
});
