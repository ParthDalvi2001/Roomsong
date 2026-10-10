// TC-AUD-02 (FR-MUS-03): fake clock; 16 steps/bar; look-ahead ≥ 100 ms; no drift over 1000 bars;
// plus ordering, no missed steps under tick jitter, tempo change, and clock-derived phase.
import { describe, expect, it } from 'vitest';

import { LOOK_AHEAD_S, STEPS, TICK_MS } from '../src/config';
import { mulberry32 } from '../src/prng';
import { Scheduler, type StepListener } from '../src/scheduler';

interface Ev {
  step: number;
  time: number;
  bar: number;
  now: number;
}

class FakeClock {
  t = 10; // start away from 0 so a "0 means unset" bug would show
  now(): number {
    return this.t;
  }
  advance(s: number): void {
    this.t += s;
  }
}

function harness(bpm = 84): { clock: FakeClock; sched: Scheduler; events: Ev[] } {
  const clock = new FakeClock();
  const events: Ev[] = [];
  const listener: StepListener = (step, time, bar) => {
    events.push({ step, time, bar, now: clock.now() });
  };
  const sched = new Scheduler(clock, listener, bpm);
  return { clock, sched, events };
}

/** Advance the fake clock in regular ticks until `seconds` have elapsed, ticking the scheduler each time. */
function runFor(clock: FakeClock, sched: Scheduler, seconds: number, tickS = TICK_MS / 1000): void {
  const end = clock.now() + seconds;
  while (clock.now() < end) {
    sched.tick();
    clock.advance(tickS);
  }
}

describe('Scheduler configuration', () => {
  it('uses a 120 ms look-ahead and a 25 ms tick (NFR-PERF-10, LLD §5.3)', () => {
    expect(LOOK_AHEAD_S).toBe(0.12);
    expect(TICK_MS).toBe(25);
    expect(STEPS).toBe(16);
  });

  it('step duration follows the tempo: 84 BPM, 4 beats/bar, 16 steps → 60/84/4 s', () => {
    const { sched } = harness(84);
    expect(sched.stepDurationS()).toBeCloseTo(60 / 84 / 4, 12);
    sched.setBpm(96);
    expect(sched.stepDurationS()).toBeCloseTo(60 / 96 / 4, 12);
  });
});

describe('Scheduler: one bar', () => {
  it('emits exactly 16 steps 0..15 in bar 0 at exact multiples of the step duration', () => {
    const { clock, sched, events } = harness(84);
    const stepDur = sched.stepDurationS();
    sched.start(0.05);
    const t0 = clock.now() + 0.05;
    runFor(clock, sched, 0.05 + 16 * stepDur - 1e-6 - LOOK_AHEAD_S);
    expect(events).toHaveLength(16);
    events.forEach((e, i) => {
      expect(e.step).toBe(i);
      expect(e.bar).toBe(0);
      expect(e.time).toBeCloseTo(t0 + i * stepDur, 9);
    });
  });

  it('schedules every event ahead of the clock by (lookAhead − tick) .. lookAhead', () => {
    const { clock, sched, events } = harness(84);
    sched.start(0.2);
    runFor(clock, sched, 20);
    expect(events.length).toBeGreaterThan(100);
    for (const e of events) {
      const lead = e.time - e.now;
      expect(lead).toBeGreaterThanOrEqual(LOOK_AHEAD_S - TICK_MS / 1000 - 1e-9);
      expect(lead).toBeLessThan(LOOK_AHEAD_S + 1e-9);
    }
  });

  it('does nothing before start() and nothing after stop()', () => {
    const { clock, sched, events } = harness(84);
    runFor(clock, sched, 2);
    expect(events).toHaveLength(0);
    sched.start(0.05);
    runFor(clock, sched, 1);
    const n = events.length;
    expect(n).toBeGreaterThan(0);
    sched.stop();
    runFor(clock, sched, 2);
    expect(events).toHaveLength(n);
  });
});

describe('Scheduler: no drift over 1000 bars (TC-AUD-02)', () => {
  it('step 15999 lands at t0 + 15999 × stepDur within 1 µs, with no missed or duplicated steps', () => {
    const { clock, sched, events } = harness(84);
    const stepDur = sched.stepDurationS();
    sched.start(0.05);
    const t0 = clock.now() + 0.05;
    runFor(clock, sched, 0.05 + 1000 * 16 * stepDur - LOOK_AHEAD_S - 1e-6);
    expect(events).toHaveLength(16000);
    const last = events[15999] as Ev;
    expect(Math.abs(last.time - (t0 + 15999 * stepDur))).toBeLessThan(1e-6);
    expect(last.step).toBe(15);
    expect(last.bar).toBe(999);
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1] as Ev;
      const cur = events[i] as Ev;
      expect(cur.time).toBeGreaterThan(prev.time);
      expect(cur.step).toBe(i % 16);
      expect(cur.bar).toBe(Math.floor(i / 16));
    }
  });
});

describe('Scheduler: robustness', () => {
  it('under seeded tick jitter (5–60 ms) every step is still emitted exactly once at its exact time', () => {
    const { clock, sched, events } = harness(96);
    const stepDur = sched.stepDurationS();
    const rnd = mulberry32(42);
    sched.start(0.05);
    const t0 = clock.now() + 0.05;
    const end = clock.now() + 60;
    while (clock.now() < end) {
      sched.tick();
      clock.advance(0.005 + rnd() * 0.055);
    }
    const expected = Math.floor((end - LOOK_AHEAD_S - t0) / stepDur);
    expect(Math.abs(events.length - expected)).toBeLessThanOrEqual(3);
    events.forEach((e, i) => {
      expect(e.step).toBe(i % 16);
      expect(e.time).toBeCloseTo(t0 + i * stepDur, 9);
    });
  });

  it('a late tick (500 ms gap) emits every step that fell in the gap, none skipped', () => {
    const { clock, sched, events } = harness(84);
    sched.start(0.05);
    runFor(clock, sched, 1);
    const before = events.length;
    clock.advance(0.5); // main thread stalled
    sched.tick();
    const stepDur = sched.stepDurationS();
    const emitted = events.length - before;
    expect(emitted).toBeGreaterThanOrEqual(Math.floor(0.5 / stepDur));
    for (let i = 1; i < events.length; i++) {
      expect((events[i] as Ev).step).toBe(i % 16);
    }
    // the stalled steps are late (negative lead) but still ordered and continuous
    const late = events.slice(before).filter((e) => e.time < e.now);
    expect(late.length).toBeGreaterThan(0);
  });

  it('setBpm mid-run keeps the next step time and changes the spacing after it', () => {
    const { clock, sched, events } = harness(84);
    sched.start(0.05);
    runFor(clock, sched, 1);
    const slowDur = sched.stepDurationS();
    const lastBefore = events[events.length - 1] as Ev;
    sched.setBpm(96);
    const fastDur = sched.stepDurationS();
    runFor(clock, sched, 2);
    const after = events.slice(events.findIndex((e) => e === lastBefore) + 1);
    expect(after.length).toBeGreaterThan(4);
    // first step after the change is still one *old* step after the last scheduled step
    expect((after[0] as Ev).time).toBeCloseTo(lastBefore.time + slowDur, 9);
    for (let i = 1; i < after.length; i++) {
      expect((after[i] as Ev).time - (after[i - 1] as Ev).time).toBeCloseTo(fastDur, 9);
    }
  });

  it('start() after stop() restarts at step 0, bar 0', () => {
    const { clock, sched, events } = harness(84);
    sched.start(0.05);
    runFor(clock, sched, 3);
    sched.stop();
    events.length = 0;
    sched.start(0.05);
    runFor(clock, sched, 1);
    expect((events[0] as Ev).step).toBe(0);
    expect((events[0] as Ev).bar).toBe(0);
  });
});

describe('Scheduler: clock-derived phase (tide render reads the audio clock, not the tick)', () => {
  it('barPhase and stepIndex are computed from clock.now()', () => {
    const { clock, sched } = harness(84);
    expect(sched.barPhase()).toBe(0);
    expect(sched.stepIndex()).toBe(0);
    sched.start(0.05);
    const stepDur = sched.stepDurationS();
    runFor(clock, sched, 0.5);
    clock.t = 10 + 0.05 + 3.5 * stepDur;
    expect(sched.stepIndex()).toBe(3);
    expect(sched.barPhase()).toBeCloseTo(3.5 / 16, 9);
    expect(sched.barIndex()).toBe(0);
    clock.t = 10 + 0.05 + 16 * stepDur + 0.25 * stepDur;
    expect(sched.stepIndex()).toBe(0);
    expect(sched.barIndex()).toBe(1);
    expect(sched.barPhase()).toBeCloseTo(0.25 / 16, 9);
  });

  it('phase is clamped to 0 before the first step', () => {
    const { sched } = harness(84);
    sched.start(0.5);
    expect(sched.barPhase()).toBe(0);
    expect(sched.stepIndex()).toBe(0);
  });
});
