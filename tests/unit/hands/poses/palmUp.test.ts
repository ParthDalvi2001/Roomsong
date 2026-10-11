// TC-HND-03, the palm-up part (FR-HND-05): within 35 degrees of world up, held 400 ms; a dropout restarts the hold.
import { describe, expect, it } from 'vitest';

import { PALM_UP_HOLD_MS, PALM_UP_MAX_ANGLE_DEG } from '../../../../src/hands/config.js';
import { createHandFrame } from '../../../../src/hands/InputSource.js';
import { isPalmUp, PalmUpHold } from '../../../../src/hands/poses/palmUp.js';

const FRAME_MS = 14;

/** A unit normal tilted `degrees` away from world up. */
function tilted(degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  return { x: Math.sin(angle), y: Math.cos(angle), z: 0 };
}

/** A tracked right hand with its palm `degrees` away from up. */
function hand(degrees: number, tracked = true) {
  const frame = createHandFrame('right');
  frame.tracked = tracked;
  frame.palmNormal = tilted(degrees);
  return frame;
}

/** Feeds the same frame every 14 ms from `fromMs` up to and including `toMs`; returns the times `update` was true. */
function hold(pose: PalmUpHold, frame: ReturnType<typeof hand>, fromMs: number, toMs: number): number[] {
  const fired: number[] = [];
  for (let t = fromMs; t <= toMs; t += FRAME_MS) if (pose.update(frame, t)) fired.push(t);
  return fired;
}

describe('isPalmUp', () => {
  it('is true within 35 degrees of world up, on either side, and false beyond', () => {
    expect([PALM_UP_MAX_ANGLE_DEG, PALM_UP_HOLD_MS]).toEqual([35, 400]);
    expect(isPalmUp(tilted(0))).toBe(true);
    expect(isPalmUp(tilted(34))).toBe(true);
    expect(isPalmUp(tilted(-34))).toBe(true);
    expect(isPalmUp(tilted(36))).toBe(false);
    expect(isPalmUp(tilted(90))).toBe(false); // palm to the side
    expect(isPalmUp(tilted(180))).toBe(false); // palm down
    expect(isPalmUp({ x: 0, y: 0, z: 0 })).toBe(false); // a frame that was never sampled
  });
});

describe('PalmUpHold', () => {
  it('fires once, on the first sample 400 ms after the palm turned up', () => {
    const pose = new PalmUpHold();
    // 0, 14, ... 392 ms are short of the hold; 406 ms is the first sample past it. Held on to 2 s: no repeat.
    expect(hold(pose, hand(0), 0, 2000)).toEqual([406]);
  });

  it('fires at exactly 400 ms, and not a millisecond before', () => {
    const pose = new PalmUpHold();
    expect(pose.update(hand(0), 1000)).toBe(false);
    expect(pose.update(hand(0), 1399)).toBe(false);
    expect(pose.update(hand(0), 1400)).toBe(true);
  });

  it('does not fire for a palm that is not up, however long', () => {
    expect(hold(new PalmUpHold(), hand(60), 0, 2000)).toEqual([]);
  });

  it('starts over after a 100 ms dropout of the pose', () => {
    const pose = new PalmUpHold();
    expect(hold(pose, hand(0), 0, 294)).toEqual([]); // 300 ms up: not yet
    expect(hold(pose, hand(60), 308, 406)).toEqual([]); // 100 ms turned away, across the 400 ms mark
    expect(hold(pose, hand(0), 420, 812)).toEqual([]); // up again at 420 ms: 392 ms held so far
    expect(pose.update(hand(0), 826)).toBe(true); // 406 ms after it came back
  });

  it('starts over after a 100 ms tracking dropout', () => {
    const pose = new PalmUpHold();
    expect(hold(pose, hand(0), 0, 294)).toEqual([]);
    expect(hold(pose, hand(0, false), 308, 406)).toEqual([]); // the palm reads up, but the hand is not tracked
    expect(hold(pose, hand(0), 420, 812)).toEqual([]);
    expect(pose.update(hand(0), 826)).toBe(true);
  });

  it('fires again once the pose has been left and retaken, or after a reset', () => {
    const pose = new PalmUpHold();
    expect(hold(pose, hand(0), 0, 500)).toEqual([406]);
    pose.update(hand(60), 514);
    expect(hold(pose, hand(0), 528, 1000)).toEqual([934]); // 406 ms after 528
    pose.reset();
    expect(hold(pose, hand(0), 1014, 1500)).toEqual([1420]);
  });
});
