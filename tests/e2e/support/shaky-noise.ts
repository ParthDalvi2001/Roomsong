// The "shaky hands" noise model: what a real Quest hand does that an emulated one never does. Pure and seeded, no DOM
// and no XR, so a seed gives the same hand on every run, and tests/unit can check it. It runs inside the page.
// The numbers below come from .tmp/headset/rec.jsonl, the recorder's log of the first real Quest 3S sessions
// (2026-11-07, 18 page loads, Quest Browser 156 at 90 fps). tests/tools/headset-recorder.ts keeps no per-frame hand
// position (its reused payloads are serialised at the 400 ms flush), so two values, marked "not in the file", are
// assumptions: anything marked so says nothing about a headset.

/** One value per recorded percentile, measured in rec.jsonl; between two of them `draw` interpolates. */
type Table = readonly (readonly [percentile: number, value: number])[];

/**
 * A hand's tracking in a burst: a gap under 300 ms followed by a spell under 400 ms (121 pairs in rec.jsonl). Real hands
 * leave the input sources for this long (`xr:inputs` loses the hand), many times a second. Spells stop at 300 ms, the
 * brief's "40-300 ms", as a frame of the slow emulator may add 100 ms and a spell must stay under the 400 ms palm hold.
 */
const BURST_GAP_MS: Table = [
  [0, 22],
  [0.1, 34],
  [0.25, 35],
  [0.5, 68],
  [0.75, 134],
  [0.9, 223],
  [1, 290],
];
const BURST_SPELL_MS: Table = [
  [0, 10],
  [0.1, 21],
  [0.25, 32],
  [0.5, 33],
  [0.75, 98],
  [0.9, 231],
  [1, 300],
];
/** TRACKING_GRACE_MS is 200: a gap kept under this stays under it in the emulator, whose frames are slower. */
export const UNDER_GRACE_GAP_MS = 120;

/**
 * How far the pinch point moves as the fingers close on a target, in metres: rec.jsonl, from pinchStart to the release
 * of the 28 presses on the settings panel (percentiles 10 to 90: 0.3, 0.5, 0.8, 1.6, 2.5 cm; at most 3.5 cm). Closing
 * and opening and the drift between are all in it. The 291 pinches on nothing (under 500 ms) moved more, 1.8 cm at the
 * median and 4.9 cm at the 90th percentile; they were aimed at nothing, so they are not used.
 */
const CLOSE_SHIFT_M: Table = [
  [0, 0.001],
  [0.1, 0.0028],
  [0.25, 0.0049],
  [0.5, 0.0081],
  [0.75, 0.0161],
  [0.9, 0.0252],
  [1, 0.0348],
];
/** How long fingers take to close, in ms. Not in the file: an assumption. */
export const CLOSE_MS = 150;

/**
 * Where the fingers are when a player aims by sight. rec.jsonl: pinches with the panel open at 23, 25, 35, 38 and 41 cm
 * from the head (percentiles 10 to 90, 34 pinches; the panel is at 55 cm; BUG-029 says 25). The one plant pinch with
 * plant positions in the file: 13.3 cm short of the head along the line of sight, 1.6 cm off it (BUG-025: 10 to 14 cm).
 */
export const PANEL_FINGERS_FROM_HEAD_M = 0.25;
export const PLANT_SHORT_M = 0.133;
export const PLANT_OFF_LINE_M = 0.016;

/**
 * A palm reading is how far its normal faces the way asked, read at 2 Hz by the recorder. Up: 0.83 to 0.98 near a
 * `gesture:palmUp` (percentiles 10 to 90, 228 samples) and 0.4 to 0.8 on the way there. Out: 0.88 to 0.97 in the 1.5 s
 * before a `gesture:palmsOut` (run 10).
 */
export const PALM_UP_BAND = [0.83, 0.98] as const;
export const PALM_OUT_BAND = [0.88, 0.97] as const;
export const PALM_UP_NATURAL = [0.4, 0.8] as const;

/**
 * The slow wander of a held hand, the largest of the summed sines per axis, in metres. rec.jsonl: a press moved 0.8 cm
 * at the median and 2.5 cm at the 90th percentile from pinchStart to release (28 presses, mostly under a second).
 */
const DRIFT_M = 0.006;
/** The fast shake of the tracked joints. Not in the file (see the head of this file): an assumption, and small. */
const JITTER_M = 0.002;

/** mulberry32: a small seeded generator, the same on every engine. */
export function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The value at percentile `r` (0..1) of a measured table. */
function draw(table: Table, r: number): number {
  let from = table[0]!;
  for (const to of table) {
    if (r <= to[0]) {
      const span = to[0] - from[0];
      return span === 0 ? to[1] : from[1] + ((to[1] - from[1]) * (r - from[0])) / span;
    }
    from = to;
  }
  return from[1];
}

/** An endless run of tracking drops. `maxGapMs` keeps every gap under the grace, for a hand that holds something. */
export class Drops {
  private readonly random: () => number;

  constructor(
    seed: number,
    private readonly maxGapMs = Infinity,
  ) {
    this.random = seeded(seed);
  }

  gapMs(): number {
    return Math.min(draw(BURST_GAP_MS, this.random()), this.maxGapMs);
  }

  spellMs(): number {
    return draw(BURST_SPELL_MS, this.random());
  }
}

/** A close shift in metres, at percentile `at` (0..1) of what rec.jsonl measured. */
export const closeShiftM = (at: number): number => draw(CLOSE_SHIFT_M, at);

/**
 * A hand's drift and jitter: `out` is written with its offset in metres at time `tMs`, a pure function of the time, so
 * a slower machine gets the same hand. Each axis sums three slow sines (0.2 to 1.2 Hz) and two fast ones (6 to 14 Hz).
 */
export function shake(seed: number): (tMs: number, out: { x: number; y: number; z: number }) => void {
  const random = seeded(seed);
  const sines = (count: number, size: number, low: number, high: number) =>
    Array.from({ length: 3 * count }, () => ({
      a: (size * (0.4 + 0.6 * random())) / count,
      w: 2 * Math.PI * (low + (high - low) * random()),
      phase: 2 * Math.PI * random(),
    }));
  const slow = sines(3, DRIFT_M, 0.2, 1.2);
  const fast = sines(2, JITTER_M, 6, 14);
  const axis = (i: number, s: number): number => {
    let sum = 0;
    for (let k = 0; k < 3; k++) {
      const one = slow[3 * i + k]!;
      sum += one.a * Math.sin(one.w * s + one.phase);
    }
    for (let k = 0; k < 2; k++) {
      const one = fast[2 * i + k]!;
      sum += one.a * Math.sin(one.w * s + one.phase);
    }
    return sum;
  };
  return (tMs, out) => {
    const s = tMs / 1000;
    out.x = axis(0, s);
    out.y = axis(1, s);
    out.z = axis(2, s);
  };
}

/** A palm reading between the band's two ends at time `tMs`: a slow wander, pure in the time. */
export function palmReading(seed: number, band: readonly [number, number], tMs: number): number {
  const phase = 2 * Math.PI * seeded(seed)();
  const s = tMs / 1000;
  const wave = 0.5 + 0.3 * Math.sin(2.3 * s + phase) + 0.2 * Math.sin(5.1 * s + 2 * phase);
  return band[0] + (band[1] - band[0]) * wave;
}
