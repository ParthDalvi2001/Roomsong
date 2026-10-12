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
      'Immersive AR: supported.',
      'Hand tracking: on.',
      'Plane detection: not available. You place the garden yourself and the room does not tune the song.',
      'Anchors: not available. The garden is placed again on each visit.',
    ]);
  });

  it('says what is still unknown before the first session, and that hands are required', () => {
    const lines = featureLines(detectSupport(true, null));
    expect(lines[1]).toBe('Hand tracking: checked when you enter. Roomsong cannot start without it.');
    expect(lines[2]).toMatch(/^Plane detection: checked when you enter\. Without it /);
    expect(lines[3]).toMatch(/^Anchors: checked when you enter\. Without them /);
  });

  it('names the missing immersive AR', () => {
    const [first] = featureLines(detectSupport(false, null));
    expect(first).toBe('Immersive AR: not supported. Roomsong needs it.');
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
