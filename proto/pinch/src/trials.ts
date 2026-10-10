// Trial logic of the T-105 pinch test page: layouts, seeded order, hit test, the trial run, the summary and
// the bed's angular size. Pure: no XR, no DOM, no clock (time comes in as frame deltas).
import {
  BED_INNER_M,
  BED_OUTER_M,
  BED_RINGS,
  BED_STEPS,
  FOV_HALF_HORIZONTAL_DEG,
  FOV_HALF_VERTICAL_DEG,
  GRID_SIDE,
  GRID_SPACINGS_M,
  HIT_RADIUS_M,
  MIN_REACTION_MS,
  NEXT_TRIAL_DELAY_MS,
  STALL_MS,
  TRACKING_GRACE_MS,
  TRIALS_PER_GRID,
  TRIALS_PER_RING,
} from './config.js';

/** Metres on the surface from the bed centre: u to the user's right, v ahead (away from the user). */
export type Point = readonly [u: number, v: number];

/** One screen of targets and the targets to light, in order. `group` is the row of the summary. */
export interface Block {
  points: Point[];
  order: { target: number; group: string }[];
}

/** Where a pinch began: the filtered point that is judged, and the unfiltered point with its height. */
export interface PinchSample {
  hand: 'left' | 'right';
  u: number;
  v: number;
  rawU: number;
  rawV: number;
  heightM: number;
}

export interface Trial {
  group: string;
  /** Index of the lit target in its block's points; for the bed, ring x 16 + step (ring 0 = inner). */
  target: number;
  hit: boolean;
  nearest: number;
  /** Lit target to the filtered pinch point along the surface: the point that is judged (FR-HND-03). */
  distM: number;
  /** The same for the unfiltered point: a rawHit that is not a hit is a miss the filter's lag caused. */
  rawDistM: number;
  rawHit: boolean;
  /** The unfiltered pinch point above the surface: a steady offset is the plane's height error. */
  heightM: number;
  /** Light-up to pinch, without the time no hand was tracked. */
  timeMs: number;
  /** Pinch to the moment the tick is heard; set by the page, null when the audio clock gave no timestamp. */
  soundMs: number | null;
  hand: 'left' | 'right';
}

export interface Summary {
  group: string;
  trials: number;
  firstTry: number;
  rate: number;
  /** First-try hits had the pinch point not been filtered. */
  rawFirstTry: number;
  medianMs: number;
  maxMs: number;
  meanMissM: number | null;
  soundMedianMs: number | null;
  soundMaxMs: number | null;
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));

export function gridPoints(spacingM: number): Point[] {
  const half = (GRID_SIDE - 1) / 2;
  return Array.from({ length: GRID_SIDE ** 2 }, (_, i): Point => {
    return [((i % GRID_SIDE) - half) * spacingM, (Math.floor(i / GRID_SIDE) - half) * spacingM];
  });
}

/** FR-MUS-01: the 80 cells of the bed; index = ring x 16 + step, ring 0 = inner. */
export function bedPoints(): Point[] {
  return Array.from({ length: BED_RINGS * BED_STEPS }, (_, i): Point => {
    const radius = BED_INNER_M + (Math.floor(i / BED_STEPS) * (BED_OUTER_M - BED_INNER_M)) / (BED_RINGS - 1);
    const angle = ((i % BED_STEPS) * 2 * Math.PI) / BED_STEPS;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  });
}

/** mulberry32: a small seeded generator, so ?seed= repeats the order. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/** Block A: the three grids, 20 targets each. Block B: the bed, 10 outer-ring and 10 inner-ring targets, mixed. */
export function plan(seed: number): Block[] {
  const random = seeded(seed);
  const pick = (first: number, count: number, take: number, group: string) =>
    shuffle(
      Array.from({ length: count }, (_, i) => first + i),
      random,
    )
      .slice(0, take)
      .map((target) => ({ target, group }));
  const grids = GRID_SPACINGS_M.map((spacingM) => ({
    points: gridPoints(spacingM),
    order: pick(0, GRID_SIDE ** 2, TRIALS_PER_GRID, `${Math.round(spacingM * 100)} cm grid`),
  }));
  const bed = [
    ...pick((BED_RINGS - 1) * BED_STEPS, BED_STEPS, TRIALS_PER_RING, 'bed outer ring'),
    ...pick(0, BED_STEPS, TRIALS_PER_RING, 'bed inner ring'),
  ];
  return [...grids, { points: bedPoints(), order: shuffle(bed, random) }];
}

/** FR-HND-04: a hit is within the hit radius of the lit target, with no other target nearer. */
export function judge(points: readonly Point[], target: number, u: number, v: number) {
  const distance = (i: number) => Math.hypot(points[i]![0] - u, points[i]![1] - v);
  const distM = distance(target);
  let nearest = target;
  for (let i = 0; i < points.length; i++) if (distance(i) < distance(nearest)) nearest = i;
  return { hit: nearest === target && distM <= HIT_RADIUS_M, distM, nearest };
}

/** The trials of one session. Each frame: frame(), then pinch() for every pinch that began in it. */
export class Run {
  readonly trials: Trial[] = [];
  private blockIndex = 0;
  private trialIndex = 0;
  /** Above 0: the next target is not lit yet. */
  private waitMs = NEXT_TRIAL_DELAY_MS;
  /** How long the lit target has been lit with a hand tracked. */
  private litMs = 0;
  private feedback: 'hit' | 'miss' | null = null;
  /** How long no hand has been tracked. */
  private lostMs = 0;

  constructor(readonly blocks: readonly Block[]) {}

  /** The block on show; undefined when all trials are done. */
  get block(): Block | undefined {
    return this.blocks[this.blockIndex];
  }

  /** The target that is lit or shows the feedback of the last pinch. */
  get target(): number | undefined {
    return this.block?.order[this.trialIndex]?.target;
  }

  get state(): 'idle' | 'lit' | 'paused' | 'hit' | 'miss' | 'done' {
    if (!this.block) return 'done';
    if (this.feedback) return this.feedback;
    if (this.waitMs > 0) return 'idle';
    return this.lostMs >= TRACKING_GRACE_MS ? 'paused' : 'lit';
  }

  /** `tracked`: at least one hand is tracked. Returns true when the state changed (redraw). */
  frame(dtMs: number, tracked: boolean): boolean {
    const before = this.state;
    this.lostMs = tracked ? 0 : this.lostMs + dtMs;
    if (this.waitMs > 0) {
      this.waitMs -= dtMs;
      if (this.waitMs <= 0) {
        if (this.feedback && ++this.trialIndex >= this.block!.order.length) {
          this.blockIndex++;
          this.trialIndex = 0;
        }
        this.feedback = null;
        this.litMs = 0;
      }
    } else if (tracked && dtMs <= STALL_MS) {
      this.litMs += dtMs; // tracking loss and stalls pause the trial: they are not the user's time
    }
    return this.state !== before;
  }

  /** A pinch began. Returns the trial it decides, or null when it is not the first pinch on a lit target. */
  pinch(sample: PinchSample): Trial | null {
    const block = this.block;
    const target = this.target;
    // Sooner than a reaction time after light-up, the pinch was not aimed at this target.
    if (!block || target === undefined || this.state !== 'lit' || this.litMs < MIN_REACTION_MS) return null;
    const { hit, distM, nearest } = judge(block.points, target, sample.u, sample.v);
    const raw = judge(block.points, target, sample.rawU, sample.rawV);
    const trial: Trial = {
      group: block.order[this.trialIndex]!.group,
      target,
      hit,
      nearest,
      distM: round(distM, 4),
      rawDistM: round(raw.distM, 4),
      rawHit: raw.hit,
      heightM: round(sample.heightM, 4),
      timeMs: round(this.litMs, 1),
      soundMs: null,
      hand: sample.hand,
    };
    this.trials.push(trial);
    this.feedback = hit ? 'hit' : 'miss';
    this.waitMs = NEXT_TRIAL_DELAY_MS;
    return trial;
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** One row per group, in the order the groups first appear. */
export function summarize(trials: readonly Trial[]): Summary[] {
  const groups = new Map<string, Trial[]>();
  for (const trial of trials) groups.set(trial.group, [...(groups.get(trial.group) ?? []), trial]);
  return [...groups].map(([group, list]) => {
    const firstTry = list.filter((trial) => trial.hit).length;
    const times = list.map((trial) => trial.timeMs);
    const misses = list.filter((trial) => !trial.hit).map((trial) => trial.distM);
    const sounds = list.flatMap((trial) => (trial.soundMs === null ? [] : [trial.soundMs]));
    return {
      group,
      trials: list.length,
      firstTry,
      rate: round(firstTry / list.length, 3),
      rawFirstTry: list.filter((trial) => trial.rawHit).length,
      medianMs: round(median(times), 1),
      maxMs: Math.max(...times),
      meanMissM: misses.length ? round(misses.reduce((sum, d) => sum + d, 0) / misses.length, 4) : null,
      soundMedianMs: sounds.length ? round(median(sounds), 1) : null,
      soundMaxMs: sounds.length ? Math.max(...sounds) : null,
    };
  });
}

/**
 * Half-angles (degrees) of the bed's outer edge for a head `aheadM` behind and `aboveM` above the bed centre
 * that looks at the centre, against the NFR-FOV-01 guideline. The near edge is `downDeg`, the far edge `upDeg`.
 */
export function bedFov(aheadM: number, aboveM: number) {
  const length = Math.hypot(aheadM, aboveM);
  const [lookAhead, lookUp] = [aheadM / length, -aboveM / length]; // the view direction; its up is (-lookUp, lookAhead)
  let [horizontal, up, down] = [0, 0, 0];
  const SAMPLES = 64;
  for (let i = 0; i < SAMPLES; i++) {
    const angle = (i * 2 * Math.PI) / SAMPLES;
    const ahead = aheadM + BED_OUTER_M * Math.cos(angle);
    const depth = ahead * lookAhead - aboveM * lookUp;
    const pitch = Math.atan2(ahead * -lookUp - aboveM * lookAhead, depth);
    horizontal = Math.max(horizontal, Math.abs(Math.atan2(BED_OUTER_M * Math.sin(angle), depth)));
    up = Math.max(up, pitch);
    down = Math.max(down, -pitch);
  }
  const degrees = (radians: number) => round((radians * 180) / Math.PI, 1);
  const fov = { horizontalDeg: degrees(horizontal), upDeg: degrees(up), downDeg: degrees(down) };
  const fits =
    fov.horizontalDeg <= FOV_HALF_HORIZONTAL_DEG && Math.max(fov.upDeg, fov.downDeg) <= FOV_HALF_VERTICAL_DEG;
  return { ...fov, fits };
}
