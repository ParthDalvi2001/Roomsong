/// <reference types="webxr" />
// TC-HND-01 (the two signals as the source makes them), TC-HND-02 (the filter on the pinch point, reset when a
// lost hand is found) and the palm for TC-HND-03. A fake XR session with synthetic joints: nothing here shows
// what a headset or the emulator delivers.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { log } from '../../../src/core/index.js';
import { PALM_REST_OFFSET_M, PINCH_LOCKOUT_MS } from '../../../src/hands/config.js';
import { HandSampler } from '../../../src/hands/HandSampler.js';
import { createHandFrame } from '../../../src/hands/InputSource.js';

import { heapCost } from './heapCost.js';

import type { Hand, Vec3 } from '../../../src/core/index.js';

afterEach(() => vi.restoreAllMocks());

const FRAME_MS = 14;
const OPEN_M = 0.09;
const CLOSED_M = 0.005;
const JOINTS = [
  'thumb-tip',
  'index-finger-tip',
  'wrist',
  'index-finger-phalanx-proximal',
  'pinky-finger-phalanx-proximal',
] as const;
type Joint = (typeof JOINTS)[number];

interface JointSpace {
  pose: { transform: { position: Vec3 } } | undefined;
}

/** One hand's input source. Its joint positions are plain objects a test moves in place. */
class FakeHand {
  readonly at: Record<Joint, Vec3>;
  private readonly spaces = new Map<string, JointSpace>();
  readonly hand = { get: (joint: string) => this.spaces.get(joint) };

  constructor(readonly handedness: Hand) {
    // Born with fractions, like a real joint: V8 then keeps every point in one shape with unboxed numbers.
    const point = (): Vec3 => ({ x: 0.5, y: 0.5, z: 0.5 });
    this.at = {
      'thumb-tip': point(),
      'index-finger-tip': point(),
      wrist: point(),
      'index-finger-phalanx-proximal': point(),
      'pinky-finger-phalanx-proximal': point(),
    };
    for (const joint of JOINTS) this.spaces.set(joint, { pose: { transform: { position: this.at[joint] } } });
    this.pose({ x: 0, y: 1, z: -0.4 }, OPEN_M);
  }

  /**
   * Fingers pointing away from the user (-z), the pinch point at `centre`, the tips `gapM` apart. On a palm-down
   * hand the thumb is on the inner side (left of a right hand); turning the palm up swaps the sides.
   */
  pose(centre: Vec3, gapM: number, palm: 'up' | 'down' = 'down'): void {
    const thumbSide = (this.handedness === 'right' ? -1 : 1) * (palm === 'down' ? 1 : -1);
    const set = (joint: Joint, x: number, y: number, z: number) => Object.assign(this.at[joint], { x, y, z });
    set('thumb-tip', centre.x + (thumbSide * gapM) / 2, centre.y, centre.z);
    set('index-finger-tip', centre.x - (thumbSide * gapM) / 2, centre.y, centre.z);
    set('wrist', centre.x, centre.y, centre.z + 0.15);
    set('index-finger-phalanx-proximal', centre.x + thumbSide * 0.03, centre.y, centre.z + 0.06);
    set('pinky-finger-phalanx-proximal', centre.x - thumbSide * 0.03, centre.y, centre.z + 0.07);
  }

  /** The platform reports no pose for this joint (`false`), or reports it again. */
  track(joint: Joint, tracked: boolean): void {
    this.spaces.get(joint)!.pose = tracked ? { transform: { position: this.at[joint] } } : undefined;
  }
}

type SelectType = 'selectstart' | 'selectend';

/** A session with two hands, its frame, and the select events a test fires by hand. */
function fakeXR() {
  const listeners: Record<SelectType, Set<(event: XRInputSourceEvent) => void>> = {
    selectstart: new Set(),
    selectend: new Set(),
  };
  const right = new FakeHand('right');
  const left = new FakeHand('left');
  const inputSources: object[] = [left, right];
  const session = {
    inputSources,
    addEventListener: (type: SelectType, fn: (event: XRInputSourceEvent) => void) => listeners[type].add(fn),
    removeEventListener: (type: SelectType, fn: (event: XRInputSourceEvent) => void) =>
      listeners[type].delete(fn),
  } as unknown as XRSession;
  const frame = { getJointPose: (space: JointSpace) => space.pose } as unknown as XRFrame;
  const fire = (type: SelectType, inputSource: object) => {
    const event = { type, inputSource } as unknown as XRInputSourceEvent;
    listeners[type].forEach((fn) => fn(event));
  };
  return { session, frame, space: {} as XRReferenceSpace, right, left, inputSources, listeners, fire };
}

/** A sampler attached to a fake session, and `sample()` on a clock that advances 14 ms per call. */
function setup() {
  const xr = fakeXR();
  const sampler = new HandSampler();
  sampler.attach(xr.session);
  sampler.setFrame(xr.frame, xr.space);
  const frames = { left: createHandFrame('left'), right: createHandFrame('right') };
  let timeMs = 1000;
  const sample = (hand: Hand = 'right') => {
    timeMs += FRAME_MS;
    sampler.sample(hand, timeMs, frames[hand]);
    return frames[hand];
  };
  return { ...xr, sampler, sample, frames };
}

describe('HandSampler: joints to HandFrame', () => {
  it('reports both hands, and a hand with all its joints as tracked', () => {
    const { sampler, sample } = setup();
    expect(sampler.hands).toEqual(['left', 'right']);
    expect(sample('right')).toMatchObject({ hand: 'right', tracked: true, pinch: false, select: false });
    expect(sample('left')).toMatchObject({ hand: 'left', tracked: true, pinch: false, select: false });
  });

  it('puts the pinch point midway between the thumb tip and the index tip', () => {
    const { right, sample } = setup();
    right.pose({ x: 0.1, y: 0.8, z: -0.45 }, OPEN_M);
    const { pinchPos } = sample();
    expect(pinchPos.x).toBeCloseTo(0.1, 9);
    expect(pinchPos.y).toBeCloseTo(0.8, 9);
    expect(pinchPos.z).toBeCloseTo(-0.45, 9);
  });

  it.each(['right', 'left'] as const)(
    'gives the %s palm a unit normal that points out of the palm',
    (hand) => {
      const xr = setup();
      xr[hand].pose({ x: 0, y: 1, z: -0.4 }, OPEN_M, 'down');
      expect(xr.sample(hand).palmNormal.y).toBeCloseTo(-1, 9);
      xr[hand].pose({ x: 0, y: 1, z: -0.4 }, OPEN_M, 'up');
      const { palmNormal, palmPos } = xr.sample(hand);
      expect(palmNormal.y).toBeCloseTo(1, 9);
      expect(Math.hypot(palmNormal.x, palmNormal.y, palmNormal.z)).toBeCloseTo(1, 9);
      // A seed rests 3 cm above the middle of the palm: the wrist and the two knuckles, here at y = 1.
      expect(palmPos.x).toBeCloseTo(0, 9);
      expect(palmPos.y).toBeCloseTo(1 + PALM_REST_OFFSET_M, 9);
      expect(palmPos.z).toBeCloseTo(-0.4 + (0.15 + 0.06 + 0.07) / 3, 9);
    },
  );

  it('smooths the pinch point and reports its speed (FR-HND-03)', () => {
    const { right, sample } = setup();
    right.pose({ x: 0, y: 1, z: -0.4 }, OPEN_M);
    expect(sample().pinchPos.x).toBe(0); // the first sample passes through
    right.pose({ x: 0.1, y: 1, z: -0.4 }, OPEN_M);
    const jumped = sample().pinchPos.x; // a 10 cm jump in one frame
    expect(jumped).toBeGreaterThan(0);
    expect(jumped).toBeLessThan(0.02); // a 1 Hz low-pass lets through about 8% a frame
    let frame = sample();
    for (let i = 1; i <= 720; i++) {
      right.pose({ x: 0.1 + i * 0.2 * (FRAME_MS / 1000), y: 1, z: -0.4 }, OPEN_M); // 0.2 m/s to the right
      frame = sample();
    }
    expect(frame.velocity.x).toBeCloseTo(0.2, 2);
    expect(frame.velocity.y).toBeCloseTo(0, 6);
  });
});

describe('HandSampler: the two pinch signals (TC-HND-01)', () => {
  it('pinch follows the joint distance: on at the second closed sample, off at the second open one', () => {
    const { right, sample } = setup();
    const at = { x: 0, y: 1, z: -0.4 };
    const levels = [OPEN_M, CLOSED_M, CLOSED_M, 0.025, OPEN_M, OPEN_M].map((gapM) => {
      right.pose(at, gapM);
      return sample().pinch;
    });
    expect(levels).toEqual([false, false, true, true, true, false]);
  });

  it('measures the gap between the two tips itself: 2.1 cm is open, 1.9 cm closes, 3.1 cm holds, 3.3 cm opens', () => {
    const { right, sample } = setup();
    const at = { x: 0.1, y: 0.8, z: -0.45 };
    const levels = [0.021, 0.021, 0.019, 0.019, 0.031, 0.031, 0.033, 0.033].map((gapM) => {
      right.pose(at, gapM);
      return sample().pinch;
    });
    expect(levels).toEqual([false, false, false, true, true, true, true, false]);
  });

  it('with no select events from the platform, select = pinch', () => {
    const { right, sample } = setup();
    const at = { x: 0, y: 1, z: -0.4 };
    const levels = [OPEN_M, CLOSED_M, CLOSED_M, CLOSED_M, OPEN_M, OPEN_M].map((gapM) => {
      right.pose(at, gapM);
      const frame = sample();
      return [frame.pinch, frame.select];
    });
    expect(levels.map(([pinch]) => pinch)).toEqual([false, false, true, true, true, false]);
    expect(levels.every(([pinch, select]) => pinch === select)).toBe(true);
  });

  it('select is true from selectstart to selectend, at once, whatever the joints say', () => {
    const { right, left, sample, fire } = setup();
    fire('selectstart', right);
    expect(sample()).toMatchObject({ select: true, pinch: false }); // no debounce, and the tips are 9 cm apart
    expect(sample('left').select).toBe(false); // the other hand is not touched
    expect(sample().select).toBe(true);
    fire('selectend', right);
    expect(sample().select).toBe(false);
    expect(left.handedness).toBe('left');
  });

  it('never ORs the two: closed joints without a selectstart are a pinch and no select', () => {
    const { right, sample, fire } = setup();
    fire('selectstart', right); // the platform has shown that it sends select events for this hand
    fire('selectend', right);
    for (let i = 0; i < 12; i++) sample(); // past the lockout
    right.pose({ x: 0, y: 1, z: -0.4 }, CLOSED_M);
    sample();
    expect(sample()).toMatchObject({ pinch: true, select: false });
  });

  it('the select = pinch fallback ends for both hands with the first selectstart of the session (LLD §4)', () => {
    const { right, left, sample, fire } = setup();
    fire('selectstart', left); // the platform has shown that it sends select events for hands
    fire('selectend', left);
    right.pose({ x: 0, y: 1, z: -0.4 }, 0.015); // the right hand closes to 1.5 cm and the platform says nothing
    sample();
    expect(sample()).toMatchObject({ pinch: true, select: false }); // a joint-distance edge alone is no select
  });

  it('applies the 130 ms lockout to select too', () => {
    const { right, sample, fire } = setup();
    fire('selectstart', right);
    sample();
    fire('selectend', right);
    sample(); // released here
    fire('selectstart', right); // pinched again at once
    const levels = Array.from({ length: 10 }, () => sample().select); // 14 .. 140 ms after the release
    expect(PINCH_LOCKOUT_MS).toBe(130);
    expect(levels).toEqual([false, false, false, false, false, false, false, false, false, true]);
  });

  it('still reports a tap that starts and ends between two frames', () => {
    const { right, sample, fire } = setup();
    fire('selectstart', right);
    fire('selectend', right);
    expect(sample().select).toBe(true);
    expect(sample().select).toBe(false);
  });

  it('ignores a controller: no joints means not tracked, and its select events do nothing (FR-HND-01)', () => {
    const { inputSources, sample, fire } = setup();
    const controller = { handedness: 'right' };
    inputSources.length = 0;
    inputSources.push(controller);
    fire('selectstart', controller);
    expect(sample()).toMatchObject({ tracked: false, pinch: false, select: false });
  });
});

describe('HandSampler: a hand that is lost and found', () => {
  it('is untracked when a joint has no pose, and keeps the last pose in the frame', () => {
    const { right, sample } = setup();
    right.pose({ x: 0.1, y: 0.8, z: -0.45 }, OPEN_M);
    const before = structuredClone(sample());
    right.pose({ x: 0.3, y: 0.9, z: -0.2 }, OPEN_M);
    right.track('pinky-finger-phalanx-proximal', false);
    expect(sample()).toEqual({ ...before, tracked: false });
  });

  it('is untracked when the hand has left the input sources, or a joint is not a number', () => {
    const { right, inputSources, sample } = setup();
    expect(sample().tracked).toBe(true);
    right.at['thumb-tip'].x = NaN;
    expect(sample().tracked).toBe(false);
    right.pose({ x: 0, y: 1, z: -0.4 }, OPEN_M);
    expect(sample().tracked).toBe(true);
    Object.assign(right.at['pinky-finger-phalanx-proximal'], right.at.wrist); // a palm with no area
    expect(sample().tracked).toBe(false);
    right.pose({ x: 0, y: 1, z: -0.4 }, OPEN_M);
    inputSources.length = 0;
    expect(sample().tracked).toBe(false);
  });

  it('passes the first sample of a found hand through unfiltered (TC-HND-02)', () => {
    const { right, sample } = setup();
    right.pose({ x: 0, y: 1, z: -0.4 }, OPEN_M);
    sample();
    right.track('wrist', false);
    sample();
    right.track('wrist', true);
    right.pose({ x: 0.25, y: 0.8, z: -0.3 }, OPEN_M); // it comes back somewhere else
    const found = sample();
    expect(found.tracked).toBe(true);
    expect(found.pinchPos.x).toBeCloseTo(0.25, 9);
    expect(found.pinchPos.y).toBeCloseTo(0.8, 9);
    expect(found.velocity.x).toBe(0);
  });

  it('keeps a held pinch held across the loss, and does not join samples across it', () => {
    const { right, sample } = setup();
    const at = { x: 0, y: 1, z: -0.4 };
    right.pose(at, CLOSED_M);
    sample();
    expect(sample().pinch).toBe(true);
    right.track('wrist', false);
    expect(sample()).toMatchObject({ tracked: false, pinch: true, select: true });
    right.track('wrist', true);
    right.pose(at, OPEN_M);
    sample(); // one open sample before the next loss
    right.track('wrist', false);
    sample();
    right.track('wrist', true);
    expect(sample().pinch).toBe(true); // one open sample either side of a loss is not two in a row
    expect(sample().pinch).toBe(false);
  });
});

describe('HandSampler: the session', () => {
  it('reports nothing before it has a session and a frame, and does not throw', () => {
    const sampler = new HandSampler();
    const frame = createHandFrame('left');
    sampler.sample('left', 0, frame);
    expect(frame).toEqual(createHandFrame('left'));
    sampler.attach(fakeXR().session); // a session, and no frame yet
    sampler.sample('left', 14, frame);
    expect(frame.tracked).toBe(false);
  });

  it('detach removes its listeners and forgets a select that never ended', () => {
    const first = setup();
    first.fire('selectstart', first.right);
    expect(first.sample().select).toBe(true);
    first.sampler.detach();
    expect(first.listeners.selectstart.size + first.listeners.selectend.size).toBe(0);
    expect(first.sample()).toMatchObject({ tracked: false, select: false });

    const next = fakeXR();
    first.sampler.attach(next.session);
    first.sampler.setFrame(next.frame, next.space);
    expect(next.listeners.selectstart.size).toBe(1);
    expect(first.sample()).toMatchObject({ tracked: true, select: false });
  });

  it('detach forgets a pinch that was held: the next session starts from an open hand', () => {
    const first = setup();
    first.right.pose({ x: 0.3, y: 1, z: -0.4 }, CLOSED_M);
    first.sample();
    expect(first.sample()).toMatchObject({ pinch: true, select: true });
    first.sampler.detach();

    const next = fakeXR(); // a minute later; its hand is open, at another place
    first.sampler.attach(next.session);
    first.sampler.setFrame(next.frame, next.space);
    const frame = first.sample();
    expect(frame).toMatchObject({ tracked: true, pinch: false, select: false });
    expect(frame.pinchPos.x).toBe(0); // and the filter starts from where the hand is now
  });

  it('never throws into the frame loop: a frame that cannot be read is an untracked hand, logged once', () => {
    const { sampler, frame, space, sample } = setup();
    const error = vi.spyOn(log, 'error').mockImplementation(() => undefined);
    const stale = {
      getJointPose: () => {
        throw new Error('InvalidStateError: the frame is not active'); // what WebXR does outside the callback
      },
    } as unknown as XRFrame;
    const before = structuredClone(sample());
    expect(before.tracked).toBe(true);
    sampler.setFrame(stale, space);
    expect(() => sample()).not.toThrow();
    expect(sample()).toEqual({ ...before, tracked: false }); // nothing else was written
    sample('left');
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('hands', 'E_HANDS_UNAVAILABLE', expect.any(Error));
    sampler.setFrame(frame, space); // the next frame is a good one
    expect(sample().tracked).toBe(true);
  });
});

describe('HandSampler: no object per frame', () => {
  it('the sampler writes into the frame it is given and creates no object', () => {
    const WARM_UP = 60_000;
    const ROUNDS = 2000; // a short window: at 120 bytes a frame no collection falls into it
    // Whole numbers on purpose: fingertips at whole metres, one sample a second. V8 boxes a fractional number
    // (16 bytes) when it hands one to a function it did not inline, and a whole number never.
    // Still not zero: 120 bytes a frame for two hands (Node 24.14), every run. Cause, from the T-124 review:
    // the six stores into out.palmNormal and out.palmPos, one 16-byte box per value that is not whole (left
    // hand 3 a sample, right hand 3 flat or 6 tilted: 7.5 x 16). The trigger is the process, not the code: the
    // same run costs 0 when IWSDK and three.js are not loaded, and this file loads them through core/. With
    // real hand positions the review measured 232 to 272 bytes a frame for one hand. Short-lived numbers, no
    // objects. The bound sits 30 bytes above the 120, so an object of 32 bytes per frame shows. If this file
    // ever stops loading core/, the baseline drops to 0 and the bound has to drop with it.
    const BYTES_PER_FRAME = 150;
    const { right, left, sampler, frames, fire } = setup();
    const kept = [
      frames.right.pinchPos,
      frames.right.palmPos,
      frames.right.palmNormal,
      frames.right.velocity,
    ];
    let timeMs = 0;
    // Both hands every frame. The right one closes and opens its pinch and tilts its palm.
    const sampleAll = (rounds: number): void => {
      for (let i = 0; i < rounds; i++) {
        timeMs += 1000;
        const closed = i % 80 < 40;
        right.at['thumb-tip'].x = closed ? 0 : 1;
        right.at['index-finger-tip'].x = closed ? 0 : -1;
        right.at.wrist.y = i % 200 < 100 ? 1 : 2;
        sampler.sample('left', timeMs, frames.left);
        sampler.sample('right', timeMs, frames.right);
      }
    };
    right.pose({ x: 0, y: 1, z: -1 }, 2);
    left.pose({ x: -1, y: 1, z: -1 }, 2, 'up');
    fire('selectstart', left); // the left hand holds a select throughout
    sampleAll(WARM_UP);

    const costs = Array.from({ length: 5 }, () => heapCost(() => sampleAll(ROUNDS)));
    const clean = costs.filter((cost) => cost.gcs === 0 && cost.grewBytes < BYTES_PER_FRAME * ROUNDS);
    expect(clean.length, JSON.stringify(costs)).toBeGreaterThan(0);
    expect(frames.right).toMatchObject({ tracked: true, pinchPos: { x: 0, y: 1, z: -1 } });
    const now = [frames.right.pinchPos, frames.right.palmPos, frames.right.palmNormal, frames.right.velocity];
    now.forEach((vector, i) => expect(vector).toBe(kept[i])); // the same four objects as before the first sample
  }, 30_000); // a heap measurement: not to fail on the default 5 s on a loaded machine or under coverage
});
