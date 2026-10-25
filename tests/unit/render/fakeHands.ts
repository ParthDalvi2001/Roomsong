/// <reference types="webxr" />
// Fake WebXR hands for the hand cue's tests (T-175): an XRHand of the 25 joints, and a frame whose fillPoses lays
// each hand's joints in a row along x, creating nothing itself (the heap test measures the cue, not the fake).
import { JOINTS } from '../../../src/render/HandCue.js';

/** A hand whose joint k the fake frame puts at (k cm + `dx`, 1 m, −0.3 m): each joint space carries its `dx`. */
export function fakeHand(handedness: XRHandedness, dx = 0): { hand: XRHand; source: XRInputSource } {
  const spaces = new Map(JOINTS.map((joint) => [joint, { dx } as unknown as XRJointSpace]));
  const hand = { get: (joint: XRHandJoint) => spaces.get(joint) } as unknown as XRHand;
  return { hand, source: { hand, handedness } as unknown as XRInputSource };
}

/** A frame whose fillPoses writes joint k of a hand at (k cm + its dx + `shift.dx`, 1 m, −0.3 m). */
export function fakeFrame(shift: { dx: number } = { dx: 0 }): XRFrame {
  return {
    fillPoses(spaces: XRSpace[], _base: XRSpace, out: Float32Array): boolean {
      const dx = (spaces[0] as unknown as { dx: number }).dx + shift.dx;
      for (let k = 0; k < spaces.length; k++) {
        out[16 * k + 12] = k / 100 + dx;
        out[16 * k + 13] = 1;
        out[16 * k + 14] = -0.3;
      }
      return true;
    },
  } as unknown as XRFrame;
}
