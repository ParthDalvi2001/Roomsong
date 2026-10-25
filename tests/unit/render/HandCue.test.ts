/// <reference types="webxr" />
// T-175 (API_SPEC §3 `handCue`): the capture rig's hand cue. Without the flag there is no cue and nothing is added;
// with it, each tracked hand's 25 joints are dots and its 24 bones lines, where the frame's poses put them.
import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import { DEFAULT_FLAGS } from '../../../src/core/flags.js';
import { BONES, createHandCue, JOINTS } from '../../../src/render/HandCue.js';

import { fakeFrame, fakeHand } from './fakeHands.js';

const SPACE = {} as XRReferenceSpace;
const ON = { ...DEFAULT_FLAGS, dev: true, handCue: true };
const mm = (v: number) => Math.round(v * 1000) / 1000;

describe('the hand cue (T-175)', () => {
  it('names the 25 joints of WebXR Hand Input once each, and 24 bones between them', () => {
    expect(new Set(JOINTS).size).toBe(25);
    expect([JOINTS[0], JOINTS[4], JOINTS[24]]).toEqual(['wrist', 'thumb-tip', 'pinky-finger-tip']);
    expect(BONES).toHaveLength(48);
    expect(Math.max(...BONES)).toBe(24);
  });

  it('is not made without the flag: nothing is added and nothing is drawn', () => {
    const parent = new Group();
    expect(createHandCue(parent, { ...DEFAULT_FLAGS, dev: true })).toBeNull();
    expect(parent.children).toHaveLength(0);
  });

  it('with the flag: hidden until a hand is tracked, then its dots and bones follow its joints', () => {
    const parent = new Group();
    const cue = createHandCue(parent, ON)!;
    expect(parent.children).toEqual([cue.dots, cue.bones]);
    expect([cue.dots.visible, cue.bones.visible]).toEqual([false, false]);

    const frame = fakeFrame();
    const right = fakeHand('right');
    const left = fakeHand('left', 0.5);
    const controller = { handedness: 'left' } as unknown as XRInputSource; // no joints: left out

    cue.update(frame, SPACE, [controller, right.source]);
    expect([cue.dots.visible, cue.bones.visible, cue.dots.count]).toEqual([true, true, 25]);
    expect(cue.bones.geometry.drawRange.count).toBe(48);
    const m = cue.dots.instanceMatrix.array;
    expect([...m.slice(16 * 9 + 12, 16 * 9 + 15)].map(mm)).toEqual([0.09, 1, -0.3]); // the index tip
    expect(m[16 * 9]).toBe(1); // a dot is not scaled or turned
    const p = cue.bones.geometry.getAttribute('position').array;
    expect([...p.slice(0, 6)].map(mm)).toEqual([0, 1, -0.3, 0.01, 1, -0.3]); // the wrist to the thumb's root

    cue.update(frame, SPACE, [right.source, left.source]);
    expect(cue.dots.count).toBe(50);
    expect(cue.bones.geometry.drawRange.count).toBe(96);
    expect(mm(m[16 * 25 + 12]!)).toBe(0.5); // the second hand's wrist, in the second block

    cue.update(null, SPACE, [right.source]); // no frame (outside a session): nothing drawn
    expect([cue.dots.visible, cue.bones.visible, cue.dots.count]).toEqual([false, false, 0]);
    cue.dispose();
    expect(parent.children).toHaveLength(0);
  });
});
