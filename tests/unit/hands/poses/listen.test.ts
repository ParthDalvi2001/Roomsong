// TC-HND-04, the listen and wake part (FR-HND-06/07): palms out within 40 degrees of the head's forward, open,
// held 1.5 s; a palm facing the head within 40 degrees, held 600 ms.
import { describe, expect, it } from 'vitest';

import {
  PALMS_OUT_HOLD_MS,
  PALMS_OUT_MAX_ANGLE_DEG,
  PALMS_OUT_MIN_DOWN_ANGLE_DEG,
  WAKE_HOLD_MS,
  WAKE_MAX_ANGLE_DEG,
  WAKE_MAX_DISTANCE_M,
} from '../../../../src/hands/config.js';
import { createHandFrame } from '../../../../src/hands/InputSource.js';
import { isPalmOut, PoseHold } from '../../../../src/hands/poses/palmsOut.js';
import { isPalmToFace } from '../../../../src/hands/poses/wake.js';

const FRAME_MS = 14;
const FORWARD = { x: 0, y: 0, z: -1 }; // a level head looking down -z
const HEAD = { x: 0, y: 1.2, z: 0 };

/** A unit vector `degrees` away from -z, turned toward +x. */
function fromForward(degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  return { x: Math.sin(angle), y: 0, z: -Math.cos(angle) };
}

/** A tracked, open right hand at `palmPos` with its palm normal `normal`. */
function hand(normal: { x: number; y: number; z: number }, palmPos = { x: 0, y: 1, z: -0.4 }) {
  const frame = createHandFrame('right');
  frame.tracked = true;
  frame.palmNormal = normal;
  frame.palmPos = palmPos;
  return frame;
}

describe('isPalmOut (FR-HND-06)', () => {
  it('is true for an open palm within 40 degrees of the head forward, on either side, and false beyond', () => {
    expect(PALMS_OUT_MAX_ANGLE_DEG).toBe(40);
    expect(isPalmOut(hand(fromForward(0)), FORWARD)).toBe(true);
    expect(isPalmOut(hand(fromForward(39)), FORWARD)).toBe(true);
    expect(isPalmOut(hand(fromForward(-39)), FORWARD)).toBe(true);
    expect(isPalmOut(hand(fromForward(41)), FORWARD)).toBe(false);
    expect(isPalmOut(hand({ x: 0, y: 1, z: 0 }), FORWARD)).toBe(false); // palm up: the seed pose, not this one
    expect(isPalmOut(hand(fromForward(180)), FORWARD)).toBe(false); // palm to the face
    expect(isPalmOut(hand({ x: 0, y: 0, z: 0 }), FORWARD)).toBe(false); // a frame that was never sampled
  });

  it('D-050: a palm within 30 degrees of world down is not out, though the head looks down at it; one tilted more is', () => {
    expect(PALMS_OUT_MIN_DOWN_ANGLE_DEG).toBe(30);
    const angle = (62 * Math.PI) / 180; // looking down at a bed 0.45 m ahead on a desk 0.86 m below the eye
    const lookingDown = { x: 0, y: -Math.sin(angle), z: -Math.cos(angle) };
    expect(isPalmOut(hand({ x: 0, y: -1, z: 0 }), lookingDown)).toBe(false); // resting on the table, 28 deg off
    const tilt = (35 * Math.PI) / 180;
    expect(isPalmOut(hand({ x: 0, y: -Math.cos(tilt), z: -Math.sin(tilt) }), lookingDown)).toBe(true);
  });

  it('is false while either pinch signal is closed, and for an untracked hand', () => {
    const pinching = hand(fromForward(0));
    pinching.pinch = true;
    expect(isPalmOut(pinching, FORWARD)).toBe(false);
    const selecting = hand(fromForward(0));
    selecting.select = true;
    expect(isPalmOut(selecting, FORWARD)).toBe(false);
    const lost = hand(fromForward(0));
    lost.tracked = false;
    expect(isPalmOut(lost, FORWARD)).toBe(false);
  });
});

describe('isPalmToFace (FR-HND-07)', () => {
  it('is true when the palm normal is within 40 degrees of the way to the head, and false beyond', () => {
    expect(WAKE_MAX_ANGLE_DEG).toBe(40);
    const at = { x: 0, y: 1.2, z: -0.4 }; // level with the head, 40 cm ahead: the way to the head is +z
    const toward = (degrees: number) => {
      const angle = (degrees * Math.PI) / 180;
      return { x: Math.sin(angle), y: 0, z: Math.cos(angle) };
    };
    expect(isPalmToFace(hand(toward(0), at), HEAD)).toBe(true);
    expect(isPalmToFace(hand(toward(39), at), HEAD)).toBe(true);
    expect(isPalmToFace(hand(toward(-39), at), HEAD)).toBe(true);
    expect(isPalmToFace(hand(toward(41), at), HEAD)).toBe(false);
    expect(isPalmToFace(hand(toward(180), at), HEAD)).toBe(false); // palms out
    expect(isPalmToFace(hand({ x: 0, y: 0, z: 0 }, at), HEAD)).toBe(false);
  });

  it('measures from the palm, not along the head forward: a palm low and to the side faces the head too', () => {
    const at = { x: 0.2, y: 1.0, z: -0.2 };
    const length = Math.hypot(-0.2, 0.2, 0.2);
    const toHead = { x: -0.2 / length, y: 0.2 / length, z: 0.2 / length };
    expect(isPalmToFace(hand(toHead, at), HEAD)).toBe(true);
    expect(isPalmToFace(hand(fromForward(180), at), HEAD)).toBe(false); // 55 degrees off the way to the head
  });

  it('D-050: a palm face up on the lap does not wake, however well it faces the head; the same palm nearer does', () => {
    expect(WAKE_MAX_DISTANCE_M).toBe(0.45);
    const up = { x: 0, y: 1, z: 0 };
    expect(isPalmToFace(hand(up, { x: 0.1, y: 0.7, z: -0.2 }), HEAD)).toBe(false); // 24 degrees off, 0.55 m away
    expect(isPalmToFace(hand(up, { x: 0.05, y: 0.85, z: -0.1 }), HEAD)).toBe(true); // 18 degrees off, 0.37 m away
  });

  it('is false for an untracked hand, whatever its last pose', () => {
    const lost = hand({ x: 0, y: 0, z: 1 }, { x: 0, y: 1.2, z: -0.4 });
    lost.tracked = false;
    expect(isPalmToFace(lost, HEAD)).toBe(false);
  });
});

describe('PoseHold', () => {
  /** Feeds `isPosed` every 14 ms from `fromMs` up to and including `toMs`; returns the times it was true. */
  function hold(pose: PoseHold, isPosed: boolean, fromMs: number, toMs: number): number[] {
    const fired: number[] = [];
    for (let t = fromMs; t <= toMs; t += FRAME_MS) if (pose.update(isPosed, t)) fired.push(t);
    return fired;
  }

  it('palms out: fires once, at 1.5 s of the pose and not a millisecond before; no repeat while it is held', () => {
    expect(PALMS_OUT_HOLD_MS).toBe(1500);
    const pose = new PoseHold(PALMS_OUT_HOLD_MS);
    expect(pose.update(true, 1000)).toBe(false);
    expect(pose.update(true, 2499)).toBe(false);
    expect(pose.update(true, 2500)).toBe(true);
    expect(hold(pose, true, 2514, 6000)).toEqual([]);
  });

  it('wake: fires at 600 ms', () => {
    expect(WAKE_HOLD_MS).toBe(600);
    expect(hold(new PoseHold(WAKE_HOLD_MS), true, 0, 2000)).toEqual([602]); // 43 frames of 14 ms
  });

  it('one sample without the pose restarts the hold, and a pose retaken fires again', () => {
    const pose = new PoseHold(PALMS_OUT_HOLD_MS);
    expect(hold(pose, true, 0, 1400)).toEqual([]);
    expect(pose.update(false, 1414)).toBe(false);
    expect(hold(pose, true, 1428, 2900)).toEqual([]); // 1.47 s since the restart
    expect(hold(pose, true, 2914, 3000)).toEqual([2928]);
    pose.update(false, 3014);
    expect(hold(pose, true, 3028, 5000)).toEqual([4540]); // the first sample at or past 4528
  });

  it('reset() starts the hold over', () => {
    const pose = new PoseHold(WAKE_HOLD_MS);
    hold(pose, true, 0, 500);
    pose.reset();
    expect(hold(pose, true, 514, 1100)).toEqual([]);
    expect(pose.update(true, 1114)).toBe(true);
  });
});
