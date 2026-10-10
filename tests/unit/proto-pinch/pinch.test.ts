// T-105: the pinch state machine (FR-HND-02) and the 1-euro filter (FR-HND-03) of the pinch test page.
import { describe, expect, it } from 'vitest';

import { PINCH_LOCKOUT_MS } from '../../../proto/pinch/src/config.js';
import { OneEuro, PinchMachine } from '../../../proto/pinch/src/pinch.js';

const OPEN = 0.09;
const CLOSED = 0.005;
const FRAME_MS = 14;

/** Feeds one gap per frame from `startMs` and returns what each frame confirmed. */
function feed(machine: PinchMachine, gaps: number[], startMs = 0) {
  return gaps.map((gap, i) => machine.update(gap, startMs + i * FRAME_MS));
}

describe('PinchMachine', () => {
  it('starts on the second closed frame and ends on the second open frame (debounce)', () => {
    expect(feed(new PinchMachine(), [OPEN, CLOSED, CLOSED, CLOSED, OPEN, OPEN])).toEqual([
      null,
      null,
      'start',
      null, // held
      null,
      'end',
    ]);
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
    const between = 0.026;
    const machine = new PinchMachine();
    expect(feed(machine, [between, between, between])).toEqual([null, null, null]); // 2.6 cm does not start
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
  });
});

describe('OneEuro', () => {
  const DT_S = 1 / 72;

  it('passes the first sample through, and again after a reset', () => {
    const filter = new OneEuro(1, 0, 1);
    expect(filter.filter(0.3, DT_S)).toBe(0.3);
    expect(filter.filter(0.5, DT_S)).toBeLessThan(0.5);
    filter.reset();
    expect(filter.filter(0.5, DT_S)).toBe(0.5);
  });

  it('with beta 0 is a 1 Hz low-pass: 63% of a step after one time constant, steady at rest', () => {
    const filter = new OneEuro(1, 0, 1);
    filter.filter(0, DT_S);
    let value = 0;
    const timeConstantS = 1 / (2 * Math.PI); // 0.16 s at 1 Hz
    for (let t = DT_S; t <= timeConstantS; t += DT_S) value = filter.filter(1, DT_S);
    expect(value).toBeGreaterThan(0.55);
    expect(value).toBeLessThan(0.7);
    for (let i = 0; i < 720; i++) value = filter.filter(1, DT_S);
    expect(value).toBeCloseTo(1, 6);
  });

  it('with beta above 0 follows a moving hand more closely', () => {
    const lagAfterMove = (beta: number) => {
      const filter = new OneEuro(1, beta, 1);
      let value = filter.filter(0, DT_S);
      for (let i = 1; i <= 36; i++) value = filter.filter(i * 0.2 * DT_S, DT_S); // 0.2 m/s for half a second
      return 36 * 0.2 * DT_S - value;
    };
    expect(lagAfterMove(0)).toBeGreaterThan(0.02); // about 3 cm (LLD 5.7)
    expect(lagAfterMove(20)).toBeLessThan(0.01);
  });

  it('keeps its value when no time has passed', () => {
    const filter = new OneEuro(1, 0, 1);
    filter.filter(0.2, DT_S);
    expect(filter.filter(0.9, 0)).toBe(0.2);
  });
});
