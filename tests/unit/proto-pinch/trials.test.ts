// T-105: the pure trial logic of the pinch test page: layouts, seeded order, hit test, trial run, summary, FoV.
import { describe, expect, it } from 'vitest';

import {
  MIN_REACTION_MS,
  NEXT_TRIAL_DELAY_MS,
  STALL_MS,
  TRACKING_GRACE_MS,
} from '../../../proto/pinch/src/config.js';
import {
  bedFov,
  bedPoints,
  gridPoints,
  judge,
  plan,
  Run,
  summarize,
  type PinchSample,
  type Trial,
} from '../../../proto/pinch/src/trials.js';

const FRAME_MS = 14;
const at = (u: number, v: number, extra: Partial<PinchSample> = {}): PinchSample => ({
  hand: 'right',
  u,
  v,
  rawU: u,
  rawV: v,
  heightM: 0.01,
  ...extra,
});

/** A run whose first target is lit and has been seen for a reaction time, so the next pinch is a trial. */
function litRun(seed = 1) {
  const run = new Run(plan(seed));
  run.frame(NEXT_TRIAL_DELAY_MS, true);
  run.frame(MIN_REACTION_MS, true);
  return run;
}
const litPoint = (run: Run) => run.block!.points[run.target!]!;
/** Pinches the lit target (or `offset` metres to its right), then waits out the feedback. */
function pinchLit(run: Run, offset = 0) {
  const [u, v] = litPoint(run);
  const trial = run.pinch(at(u + offset, v));
  run.frame(NEXT_TRIAL_DELAY_MS, true);
  run.frame(MIN_REACTION_MS, true);
  return trial;
}

describe('layouts', () => {
  it('a grid is 5 x 5 targets at the given spacing, centred on the bed centre', () => {
    const points = gridPoints(0.03);
    expect(points).toHaveLength(25);
    expect(points[0]).toEqual([-0.06, -0.06]);
    expect(points[1]![0] - points[0]![0]).toBeCloseTo(0.03);
    expect(points[5]![1] - points[0]![1]).toBeCloseTo(0.03);
    expect(points[12]).toEqual([0, 0]);
  });

  it('the bed is 5 rings x 16 steps from 0.12 m to 0.30 m (FR-MUS-01)', () => {
    const radii = bedPoints().map(([u, v]) => Math.hypot(u, v));
    expect(radii).toHaveLength(80);
    [0.12, 0.165, 0.21, 0.255, 0.3].forEach((radius, ring) => {
      for (let step = 0; step < 16; step++) expect(radii[ring * 16 + step]).toBeCloseTo(radius);
    });
  });
});

describe('plan', () => {
  it('is 3 grids of 20 trials, then 10 outer-ring and 10 inner-ring bed trials, no target twice in a block', () => {
    const blocks = plan(1);
    expect(blocks.map((block) => block.points.length)).toEqual([25, 25, 25, 80]);
    for (const block of blocks) {
      expect(block.order).toHaveLength(20);
      expect(new Set(block.order.map((trial) => trial.target)).size).toBe(20);
    }
    expect(blocks.slice(0, 3).map((block) => block.order[0]!.group)).toEqual([
      '3 cm grid',
      '4 cm grid',
      '5 cm grid',
    ]);
    const bed = blocks[3]!.order;
    const outer = bed.filter((trial) => trial.group === 'bed outer ring');
    const inner = bed.filter((trial) => trial.group === 'bed inner ring');
    expect([outer.length, inner.length]).toEqual([10, 10]);
    expect(outer.every((trial) => trial.target >= 64 && trial.target < 80)).toBe(true);
    expect(inner.every((trial) => trial.target < 16)).toBe(true);
    // Mixed, not one ring after the other.
    expect(bed.slice(0, 10).map((trial) => trial.group)).not.toEqual(outer.map((trial) => trial.group));
  });

  it('repeats for the same seed and changes with the seed', () => {
    const order = (seed: number) => plan(seed).flatMap((block) => block.order.map((trial) => trial.target));
    expect(order(7)).toEqual(order(7));
    expect(order(7)).not.toEqual(order(8));
  });
});

describe('judge', () => {
  const grid = gridPoints(0.03);
  const bed = bedPoints();

  it('hits when the pinch is within the hit radius of the lit target and that target is the nearest', () => {
    expect(judge(grid, 12, 0.01, 0)).toMatchObject({ hit: true, nearest: 12 });
    expect(judge(grid, 12, 0.01, 0).distM).toBeCloseTo(0.01);
  });

  it('misses when another target is nearer, even inside the hit radius', () => {
    const result = judge(grid, 12, 0.02, 0); // 2 cm from the lit target, 1 cm from its right neighbour
    expect(result).toMatchObject({ hit: false, nearest: 13 });
    expect(result.distM).toBeCloseTo(0.02);
  });

  it('misses beyond the hit radius, even when the lit target is the nearest', () => {
    const [u, v] = bed[64]!; // outer ring: neighbours are 11.7 cm away
    expect(judge(bed, 64, u + 0.041, v)).toMatchObject({ hit: false, nearest: 64 });
    expect(judge(bed, 64, u + 0.039, v)).toMatchObject({ hit: true, nearest: 64 });
  });
});

describe('Run', () => {
  it('lights the first target after the delay and ignores a pinch before it lights', () => {
    const run = new Run(plan(1));
    expect(run.state).toBe('idle');
    expect(run.pinch(at(0, 0))).toBeNull();
    expect(run.frame(NEXT_TRIAL_DELAY_MS - 1, true)).toBe(false);
    expect(run.frame(1, true)).toBe(true);
    expect(run.state).toBe('lit');
    expect(run.trials).toEqual([]);
  });

  it('does not take a pinch sooner than a reaction time after light-up as a trial', () => {
    const run = new Run(plan(1));
    run.frame(NEXT_TRIAL_DELAY_MS, true); // the first target lights
    const [u, v] = litPoint(run);
    // 14 ms: a pinch that closed on the light-up frame. 83 ms: a second pinch that corrects the last miss.
    run.frame(14, true);
    expect(run.pinch(at(u + 0.2, v))).toBeNull();
    run.frame(69, true);
    expect(run.pinch(at(u + 0.2, v))).toBeNull();
    expect(run.state).toBe('lit'); // the dot is still waiting for its first pinch
    expect(run.trials).toEqual([]);
    run.frame(MIN_REACTION_MS - 83, true);
    expect(run.pinch(at(u, v))).toMatchObject({ hit: true, timeMs: MIN_REACTION_MS });
  });

  it('does not flash the lit dot when tracking flickers frame by frame (FR-UI-11)', () => {
    const run = litRun();
    let changes = 0;
    for (let i = 0; i < 144; i++) if (run.frame(FRAME_MS, i % 2 === 1)) changes++; // 2 s at 72 Hz
    expect(changes).toBe(0); // 144 before the grace
    expect(run.state).toBe('lit');
    const [u, v] = litPoint(run);
    expect(run.pinch(at(u, v))!.timeMs).toBe(MIN_REACTION_MS + 72 * FRAME_MS); // only the frames with a hand
  });

  it('records a first-try hit with the time since light-up, shows it, then lights the next target', () => {
    const run = litRun();
    const first = run.target!;
    run.frame(FRAME_MS, true);
    const [u, v] = litPoint(run);
    const trial = run.pinch(at(u + 0.004, v, { rawU: u + 0.01, heightM: 0.0123, hand: 'left' }));
    expect(trial).toEqual({
      group: '3 cm grid',
      target: first,
      hit: true,
      nearest: first,
      distM: 0.004,
      rawDistM: 0.01,
      rawHit: true,
      heightM: 0.0123,
      timeMs: MIN_REACTION_MS + FRAME_MS,
      soundMs: null,
      hand: 'left',
    });
    expect(run.state).toBe('hit');
    expect(run.target).toBe(first); // the judged target keeps its feedback colour
    expect(run.pinch(at(u, v))).toBeNull(); // a second pinch during the feedback is not a trial
    expect(run.frame(NEXT_TRIAL_DELAY_MS, true)).toBe(true);
    expect(run.state).toBe('lit');
    expect(run.target).not.toBe(first);
    expect(run.trials).toHaveLength(1);
  });

  it('tells a miss the filter caused from a miss of the hand', () => {
    const run = litRun();
    const [u, v] = litPoint(run);
    const towardsGrid = u > 0 ? -0.02 : 0.02; // 2 cm off on a 3 cm grid: the neighbour is nearer
    expect(run.pinch(at(u + towardsGrid, v, { rawU: u, rawV: v }))).toMatchObject({
      hit: false,
      rawHit: true,
    });
  });

  it('records a miss with its distance and the nearest target, then moves on', () => {
    const run = litRun();
    const first = run.target!;
    const trial = pinchLit(run, litPoint(run)[0] > 0 ? -0.09 : 0.09)!; // 9 cm off, towards the grid
    expect(trial.hit).toBe(false);
    expect(trial.distM).toBeCloseTo(0.09);
    expect(trial.nearest).not.toBe(first);
    expect(run.state).toBe('lit');
    expect(run.trials).toHaveLength(1);
  });

  it('pauses once no hand has been tracked for the grace: no miss, and none of the lost time is counted', () => {
    const run = litRun();
    expect(run.frame(TRACKING_GRACE_MS - 1, false)).toBe(false);
    expect(run.state).toBe('lit'); // within the grace nothing changes on show
    expect(run.frame(1, false)).toBe(true);
    expect(run.state).toBe('paused');
    const [u, v] = litPoint(run);
    expect(run.pinch(at(u, v))).toBeNull();
    for (let i = 0; i < 100; i++) expect(run.frame(FRAME_MS, false)).toBe(false);
    expect(run.frame(FRAME_MS, true)).toBe(true);
    expect(run.state).toBe('lit');
    expect(run.trials).toEqual([]);
    expect(run.pinch(at(u, v))!.timeMs).toBe(MIN_REACTION_MS + FRAME_MS);
  });

  it('does not count a stalled frame as time the user took', () => {
    const run = litRun();
    run.frame(STALL_MS + 1, true);
    const [u, v] = litPoint(run);
    expect(run.pinch(at(u, v))!.timeMs).toBe(MIN_REACTION_MS);
  });

  it('runs 4 blocks of 20 trials and is then done', () => {
    const run = litRun();
    const blocks = run.blocks;
    for (let i = 0; i < 80; i++) {
      expect(run.block).toBe(blocks[Math.floor(i / 20)]);
      expect(pinchLit(run)!.hit).toBe(true);
    }
    expect(run.state).toBe('done');
    expect(run.block).toBeUndefined();
    expect(run.pinch(at(0, 0))).toBeNull();
    expect(run.frame(FRAME_MS, true)).toBe(false);
    expect(summarize(run.trials).map((row) => [row.group, row.trials, row.firstTry])).toEqual(
      expect.arrayContaining([
        ['3 cm grid', 20, 20],
        ['4 cm grid', 20, 20],
        ['5 cm grid', 20, 20],
        ['bed outer ring', 10, 10],
        ['bed inner ring', 10, 10],
      ]),
    );
  });
});

describe('summarize', () => {
  const trial = (
    group: string,
    hit: boolean,
    timeMs: number,
    distM: number,
    soundMs: number | null,
  ): Trial => ({
    group,
    target: 0,
    hit,
    nearest: 0,
    distM,
    rawDistM: distM,
    rawHit: true,
    heightM: 0,
    timeMs,
    soundMs,
    hand: 'right',
  });

  it('gives per group: trials, first-try count and rate, median and max time, mean miss distance, sound gap', () => {
    const rows = summarize([
      trial('3 cm grid', true, 900, 0.01, 30),
      trial('3 cm grid', false, 700, 0.05, null),
      trial('3 cm grid', false, 1500, 0.07, 50),
      trial('3 cm grid', true, 800, 0.02, 40),
      trial('bed outer ring', true, 1000, 0.015, null),
    ]);
    expect(rows).toEqual([
      {
        group: '3 cm grid',
        trials: 4,
        firstTry: 2,
        rate: 0.5,
        rawFirstTry: 4,
        medianMs: 850, // even count: the mean of the two middle times
        maxMs: 1500,
        meanMissM: 0.06, // misses only
        soundMedianMs: 40,
        soundMaxMs: 50,
      },
      {
        group: 'bed outer ring',
        trials: 1,
        firstTry: 1,
        rate: 1,
        rawFirstTry: 1,
        medianMs: 1000,
        maxMs: 1000,
        meanMissM: null, // no miss
        soundMedianMs: null, // no measurement
        soundMaxMs: null,
      },
    ]);
  });

  it('is empty for no trials', () => {
    expect(summarize([])).toEqual([]);
  });
});

describe('bedFov', () => {
  it('from straight above, the outer edge is atan(0.30 / height) to every side', () => {
    const fov = bedFov(0, 0.3);
    expect(fov.horizontalDeg).toBeCloseTo(45, 0);
    expect(fov.upDeg).toBeCloseTo(45, 0);
    expect(fov.downDeg).toBeCloseTo(45, 0);
    expect(fov.fits).toBe(false);
    expect(bedFov(0, 1).fits).toBe(true); // 16.7 degrees
  });

  it('seated (eyes 0.45 m above the table, centre 0.45 m ahead) the near edge is the widest angle', () => {
    const fov = bedFov(0.45, 0.45);
    expect(fov.upDeg).toBeCloseTo(14, 0); // far edge: 45 - atan(0.45 / 0.75)
    expect(fov.downDeg).toBeCloseTo(26.6, 0); // near edge: atan(0.45 / 0.15) - 45
    expect(fov.horizontalDeg).toBeGreaterThan(25);
    expect(fov.horizontalDeg).toBeLessThan(32);
    expect(fov.fits).toBe(false);
  });
});
