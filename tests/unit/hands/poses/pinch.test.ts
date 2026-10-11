// TC-HND-01, the hold signal: the joint-distance pinch (FR-HND-02). Built in T-105 for the pinch test page.
import { describe, expect, it } from 'vitest';

import { PINCH_ENTER_M, PINCH_LOCKOUT_MS, PINCH_RELEASE_M } from '../../../../src/hands/config.js';
import { PinchMachine } from '../../../../src/hands/poses/pinch.js';

const OPEN = 0.09;
const CLOSED = 0.005;
const FRAME_MS = 14;

/** Feeds one gap per frame from `startMs` and returns what each frame confirmed. */
function feed(machine: PinchMachine, gaps: number[], startMs = 0) {
  return gaps.map((gap, i) => machine.update(gap, startMs + i * FRAME_MS));
}

describe('PinchMachine', () => {
  it('reads the contract thresholds: 2.0 cm in, 3.2 cm out, 130 ms lockout', () => {
    expect([PINCH_ENTER_M, PINCH_RELEASE_M, PINCH_LOCKOUT_MS]).toEqual([0.02, 0.032, 130]);
    const machine = new PinchMachine();
    expect(feed(machine, [0.021, 0.021, 0.021])).toEqual([null, null, null]); // just above 2.0 cm: no start
    expect(feed(machine, [0.019, 0.019])).toEqual([null, 'start']);
    expect(feed(machine, [0.031, 0.031, 0.031])).toEqual([null, null, null]); // just below 3.2 cm: no end
    expect(feed(machine, [0.033, 0.033])).toEqual([null, 'end']);
  });

  it('is strict at both thresholds: exactly 2.0 cm does not start, exactly 3.2 cm does not end', () => {
    const machine = new PinchMachine();
    expect(feed(machine, [PINCH_ENTER_M, PINCH_ENTER_M, PINCH_ENTER_M])).toEqual([null, null, null]);
    const gaps = [CLOSED, CLOSED, PINCH_RELEASE_M, PINCH_RELEASE_M, PINCH_RELEASE_M];
    expect(feed(machine, gaps, 100)).toEqual([null, 'start', null, null, null]);
    expect(machine.isPinching).toBe(true);
  });

  it('starts on the second closed frame and ends on the second open frame (debounce)', () => {
    const machine = new PinchMachine();
    expect(feed(machine, [OPEN, CLOSED, CLOSED, CLOSED, OPEN, OPEN])).toEqual([
      null,
      null,
      'start',
      null, // held
      null,
      'end',
    ]);
  });

  it('reports the level between the edges', () => {
    const machine = new PinchMachine();
    const levels = [OPEN, CLOSED, CLOSED, CLOSED, OPEN, OPEN].map((gap, i) => {
      machine.update(gap, i * FRAME_MS);
      return machine.isPinching;
    });
    expect(levels).toEqual([false, false, true, true, true, false]);
  });

  it('ignores a one-frame dip and a one-frame gap', () => {
    const machine = new PinchMachine();
    expect(feed(machine, [OPEN, CLOSED, OPEN, CLOSED, OPEN])).toEqual([null, null, null, null, null]);
    expect(feed(machine, [CLOSED, CLOSED, OPEN, CLOSED, OPEN, CLOSED])).toEqual([
      null,
      'start',
      null,
      null,
      null,
      null,
    ]);
  });

  it('holds between the two thresholds (hysteresis)', () => {
    const between = 0.025;
    const machine = new PinchMachine();
    expect(feed(machine, [between, between, between])).toEqual([null, null, null]); // 2.5 cm does not start
    expect(feed(machine, [CLOSED, CLOSED, between, between, between])).toEqual([
      null,
      'start',
      null,
      null,
      null,
    ]);
  });

  it('takes no new pinch for 130 ms after a release (lockout)', () => {
    const machine = new PinchMachine();
    expect(feed(machine, [CLOSED, CLOSED, OPEN, OPEN])).toEqual([null, 'start', null, 'end']); // released at 42 ms
    const releasedAt = 3 * FRAME_MS;
    // Closed again at once: nothing until the lockout has passed, then the usual two frames.
    const early = Array.from({ length: 8 }, () => CLOSED); // 56..154 ms: the lockout ends at 172 ms
    expect(feed(machine, early, releasedAt + FRAME_MS)).toEqual(early.map(() => null));
    expect(feed(machine, [CLOSED, CLOSED], releasedAt + PINCH_LOCKOUT_MS)).toEqual([null, 'start']);
  });

  it('does not join frames across a tracking loss, and keeps a held pinch held', () => {
    const machine = new PinchMachine();
    expect(machine.update(CLOSED, 0)).toBeNull();
    machine.lost();
    expect(feed(machine, [CLOSED, CLOSED], 500)).toEqual([null, 'start']);
    machine.lost(); // the hand comes back still pinched: no second start
    expect(feed(machine, [CLOSED, CLOSED, CLOSED], 1000)).toEqual([null, null, null]);
    expect(machine.isPinching).toBe(true);
  });
});
