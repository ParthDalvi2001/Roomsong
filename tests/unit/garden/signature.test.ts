// The room signature (LLD §5.8; TEST_PLAN TC-SIG-01..04 and the signature half of TC-ROOM-04): which key, mode
// and reverb decay a room gets. Only the pure function is tested here. Turning planes into RoomFeatures, and
// with it the heading independence of FR-ROOM-10, is room/'s: the three worked rooms are given as features.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { DEFAULT_TEMPO_BPM } from '../../../src/core/config.js';
import {
  CEILING_DEFAULT_M,
  CEILING_MODES,
  FNV_OFFSET_BASIS,
  FNV_PRIME,
  HASH_DEFAULT_BUCKET,
  MODE_CEILING_BOUNDS_M,
  MODE_DEFAULT_BUCKET,
  REVERB_LABEL_BOUNDS_S,
  REVERB_RT60_BOUNDS_S,
  ROOT_AREA_BOUNDS_M2,
  ROOT_DEFAULT_BUCKET,
  ROOT_SEMITONES,
  RT60_DEFAULT_BUCKET,
  SABINE_ABSORPTION_M2,
  SABINE_K,
  STARTER_SETS,
  TABLE_AREA_BOUNDS_M2,
  TABLE_HEIGHT_BOUNDS_M,
  WALL_COUNT_BOUNDS,
  WALL_WIDTH_BOUNDS_M,
} from '../../../src/garden/config.js';
import {
  chordDegrees,
  MODE_DEGREES,
  REVERB_RT60_DEFAULT_S,
  REVERB_RT60_MAX_S,
  REVERB_RT60_MIN_S,
  REVERB_RT60_STEPS_S,
  roomSignature,
  WANDERER,
} from '../../../src/garden/index.js';

import { deepFreeze } from './fixtures.js';

import type { ModeId, RoomFeatures, RoomSignature } from '../../../src/garden/index.js';

type Measured = Required<RoomFeatures>;
type Field = Exclude<keyof RoomFeatures, 'level'>;

/** The three rooms worked by hand in LLD §5.8, as the features room/ is to extract from them (TC-SIG-03). */
const DESK: Measured = deepFreeze({
  level: 1,
  tableHeight: 0.74,
  tableArea: 0.98,
  floorArea: 5.6,
  wallCount: 4,
  ceilingHeight: 2.4,
  largestWallWidth: 2.8,
  roomVolume: 13.44,
});
const KITCHEN: Measured = deepFreeze({
  level: 2,
  tableHeight: 0.92,
  tableArea: 1.92,
  floorArea: 15.12,
  wallCount: 4,
  ceilingHeight: 2.7,
  largestWallWidth: 4.2,
  roomVolume: 40.82,
});
const LIVING: Measured = deepFreeze({
  level: 1,
  tableHeight: 0.75,
  tableArea: 0.96,
  floorArea: 42,
  wallCount: 4,
  ceilingHeight: 3.0,
  largestWallWidth: 7.0,
  roomVolume: 126,
});
/** Each room with the two sides of its floor in metres, for a volume taken from the mesh bounds. */
const ROOMS: { name: string; features: Measured; sides: [number, number] }[] = [
  { name: 'sig-small-desk', features: DESK, sides: [2.0, 2.8] },
  { name: 'sig-kitchen-counter', features: KITCHEN, sides: [3.6, 4.2] },
  { name: 'sig-living-table', features: LIVING, sides: [6.0, 7.0] },
];
const FIELDS: Field[] = [
  'tableHeight',
  'tableArea',
  'floorArea',
  'wallCount',
  'ceilingHeight',
  'largestWallWidth',
  'roomVolume',
];
/** What counts as unknown: not finite, or not above 0 (FR-ROOM-10). */
const UNKNOWN = [Number.NaN, Infinity, -Infinity, 0, -0, -1, -2.7];
const EPS = 1e-9;

/** `features` with the named fields left out, as room/ leaves out what it could not measure. */
function without(features: RoomFeatures, ...fields: Field[]): RoomFeatures {
  const kept = Object.entries(features).filter(([key]) => !fields.includes(key as Field));
  return Object.fromEntries(kept) as unknown as RoomFeatures;
}

/** FNV-1a 32-bit over the bucket tuple, written out again here from LLD §5.8. */
const fnv = (tuple: readonly number[]): number =>
  tuple.reduce((h, byte) => Math.imul(h ^ byte, 0x01000193), 0x811c9dc5) >>> 0;

/** The raw decay of FR-ROOM-06, before it is quantised. */
const raw = (volume: number): number => (SABINE_K * volume) / SABINE_ABSORPTION_M2;

/** Neighbouring doubles: the largest volume whose raw decay is below `bound`, and the smallest that reaches it. */
function volumesAround(bound: number): [below: number, at: number] {
  let lo = 0;
  let hi = 1000;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (raw(mid) >= bound) hi = mid;
    else lo = mid;
  }
  return [lo, hi];
}

/** A seeded source of numbers in 0..1 (CODING_GUIDELINES §9: no randomness without a seed). */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const rt60 = (features: RoomFeatures): number => roomSignature(features).reverbRt60;

describe('garden/config: the constants of the room signature (LLD §5.8)', () => {
  it('holds the numbers of FR-ROOM-06 and FR-ROOM-11', () => {
    expect([SABINE_K, SABINE_ABSORPTION_M2, CEILING_DEFAULT_M]).toEqual([0.161, 10, 2.7]);
    expect([REVERB_RT60_MIN_S, REVERB_RT60_MAX_S, REVERB_RT60_DEFAULT_S]).toEqual([0.3, 2.0, 0.9]);
    expect(REVERB_RT60_STEPS_S).toEqual([0.3, 0.6, 0.9, 1.2, 1.6, 2.0]);
    expect(REVERB_RT60_BOUNDS_S).toEqual([0.45, 0.75, 1.05, 1.4, 1.8]);
    expect(REVERB_LABEL_BOUNDS_S).toEqual([0.75, 1.05]);
    expect(ROOT_AREA_BOUNDS_M2).toEqual([8, 17, 34]);
    expect(ROOT_SEMITONES).toEqual([4, 2, 0, -3]);
    expect(MODE_CEILING_BOUNDS_M).toEqual([2.6, 2.9]);
    expect(CEILING_MODES).toEqual(['minorPent', 'majorPent', 'susPent']);
    expect(TABLE_HEIGHT_BOUNDS_M).toEqual([0.62, 0.85, 1.0]);
    expect(TABLE_AREA_BOUNDS_M2).toEqual([0.5, 1.5]);
    expect(WALL_COUNT_BOUNDS).toEqual([3, 6]);
    expect(WALL_WIDTH_BOUNDS_M).toEqual([2.5, 4.0]);
    expect([FNV_OFFSET_BASIS, FNV_PRIME]).toEqual([0x811c9dc5, 0x01000193]);
  });

  it('the default bucket of an unknown input is the one LLD §5.8 marks: C, majorPent, 0.9 s, the middle one', () => {
    expect(ROOT_SEMITONES[ROOT_DEFAULT_BUCKET]).toBe(0);
    expect(CEILING_MODES[MODE_DEFAULT_BUCKET]).toBe('majorPent');
    expect(REVERB_RT60_STEPS_S[RT60_DEFAULT_BUCKET]).toBe(REVERB_RT60_DEFAULT_S);
    expect(HASH_DEFAULT_BUCKET).toBe(1);
  });

  it('the steps are the clamp: the first is the minimum, the last the maximum, one more than the bounds', () => {
    expect(REVERB_RT60_STEPS_S[0]).toBe(REVERB_RT60_MIN_S);
    expect(REVERB_RT60_STEPS_S[REVERB_RT60_STEPS_S.length - 1]).toBe(REVERB_RT60_MAX_S);
    expect(REVERB_RT60_STEPS_S).toHaveLength(REVERB_RT60_BOUNDS_S.length + 1);
    expect(ROOT_SEMITONES).toHaveLength(ROOT_AREA_BOUNDS_M2.length + 1);
    expect(CEILING_MODES).toHaveLength(MODE_CEILING_BOUNDS_M.length + 1);
  });

  it('has six different starter sets, each with a sustaining and a percussive voice; set 0 is the Wanderer set', () => {
    expect(STARTER_SETS).toEqual([
      ['bell', 'pad', 'pluck'],
      ['pluck', 'choir', 'bass'],
      ['bell', 'choir', 'bass'],
      ['pad', 'pluck', 'bass'],
      ['bell', 'pad', 'choir'],
      ['pluck', 'bell', 'choir'],
    ]);
    expect(new Set(STARTER_SETS.map((set) => [...set].sort().join())).size).toBe(6);
    for (const set of STARTER_SETS) {
      expect(set.some((voice) => voice === 'pad' || voice === 'choir')).toBe(true);
      expect(set.some((voice) => voice === 'bell' || voice === 'pluck')).toBe(true);
    }
    expect(STARTER_SETS[0]).toEqual(WANDERER.starterVoices);
  });

  it('what leaves the module cannot be changed by a caller: the public steps and every starter set', () => {
    for (const list of [REVERB_RT60_STEPS_S, ...STARTER_SETS]) expect(Object.isFrozen(list)).toBe(true);
  });
});

describe('reverb decay from the room volume (TC-ROOM-04, FR-ROOM-06)', () => {
  it.each([
    [27, 0.3],
    [29, 0.6],
    [46, 0.6],
    [47, 0.9],
    [65, 0.9],
    [66, 1.2],
    [86, 1.2],
    [88, 1.6],
    [111, 1.6],
    [113, 2.0],
  ])('a volume of %d m³ gives %d s: one volume on each side of every boundary', (roomVolume, seconds) => {
    expect(rt60({ level: 1, roomVolume })).toBe(seconds);
  });

  it('the boundaries are half-open on the raw value: the smallest volume that reaches one takes the upper step', () => {
    REVERB_RT60_BOUNDS_S.forEach((bound, i) => {
      const [below, at] = volumesAround(bound);
      expect(raw(below)).toBeLessThan(bound);
      expect(raw(at)).toBeGreaterThanOrEqual(bound);
      expect(rt60({ level: 1, roomVolume: below })).toBe(REVERB_RT60_STEPS_S[i]);
      expect(rt60({ level: 1, roomVolume: at })).toBe(REVERB_RT60_STEPS_S[i + 1]);
      expect(rt60({ level: 1, roomVolume: at + EPS })).toBe(REVERB_RT60_STEPS_S[i + 1]);
    });
  });

  it('the raw value decides, not the rounded volumes of FR-ROOM-06: 65.2 and 111.8 m³ fall just below theirs', () => {
    expect(rt60({ level: 1, roomVolume: 65.2 })).toBe(0.9);
    expect(rt60({ level: 1, roomVolume: 111.8 })).toBe(1.6);
  });

  it('is clamped: 1 m³ gives 0.3 s and 1000 m³ gives 2.0 s', () => {
    expect(rt60({ level: 1, roomVolume: 1 })).toBe(REVERB_RT60_MIN_S);
    expect(rt60({ level: 1, roomVolume: 1000 })).toBe(REVERB_RT60_MAX_S);
    expect(rt60({ level: 1, roomVolume: Number.MAX_VALUE })).toBe(REVERB_RT60_MAX_S);
    expect(rt60({ level: 1, floorArea: Number.MAX_VALUE, ceilingHeight: 3 })).toBe(REVERB_RT60_MAX_S);
  });

  it('without a volume it is floor area × ceiling height: a 3 × 4 × 2.7 m room 0.6 s, a 5 × 5 × 2.7 m room 1.2 s', () => {
    expect(rt60({ level: 1, floorArea: 12, ceilingHeight: 2.7 })).toBe(0.6);
    expect(rt60({ level: 1, floorArea: 25, ceilingHeight: 2.7 })).toBe(1.2);
    expect(rt60({ level: 2, floorArea: 17, ceilingHeight: 2.6 })).toBe(0.6);
    expect(rt60({ level: 2, floorArea: 17, ceilingHeight: 2.8 })).toBe(0.9);
  });

  it('a measured volume wins over floor area × ceiling height', () => {
    expect(roomSignature({ level: 1, roomVolume: 130, floorArea: 5, ceilingHeight: 2.4 })).toMatchObject({
      reverbRt60: 2.0,
      keyRoot: 4,
      mode: 'minorPent',
    });
  });

  it('an unknown ceiling counts as 2.7 m', () => {
    // 17.3 m² × 2.7 m is 0.752 s raw; under a 2.69 m ceiling it would still be 0.6 s.
    expect(rt60({ level: 1, floorArea: 17.3 })).toBe(0.9);
    [8, 14, 20, 28, 36, 45].forEach((floorArea, i) => {
      expect(rt60({ level: 1, floorArea })).toBe(REVERB_RT60_STEPS_S[i]);
      expect(rt60({ level: 1, floorArea })).toBe(
        rt60({ level: 1, roomVolume: floorArea * CEILING_DEFAULT_M }),
      );
    });
  });

  it('volume and floor area unknown gives 0.9 s; a volume that is not finite or not above 0 is unknown', () => {
    expect(rt60({ level: 1, ceilingHeight: 3.2 })).toBe(REVERB_RT60_DEFAULT_S);
    for (const roomVolume of UNKNOWN) {
      expect(rt60({ level: 1, roomVolume, tableHeight: 0.7 })).toBe(REVERB_RT60_DEFAULT_S);
      expect(rt60({ level: 1, roomVolume, floorArea: 42, ceilingHeight: 3 })).toBe(2.0);
    }
  });

  it('reverbSize is only the label of the step: below 0.75 s small, below 1.05 s medium, else large', () => {
    const labels = [27, 29, 47, 66, 88, 113].map((roomVolume) => {
      const { reverbRt60, reverbSize } = roomSignature({ level: 1, roomVolume });
      return [reverbRt60, reverbSize];
    });
    expect(labels).toEqual([
      [0.3, 'small'],
      [0.6, 'small'],
      [0.9, 'medium'],
      [1.2, 'large'],
      [1.6, 'large'],
      [2.0, 'large'],
    ]);
  });
});

describe('key root from the floor area (FR-ROOM-11)', () => {
  const root = (floorArea: number): number => roomSignature({ level: 1, floorArea }).keyRoot;

  it('a bigger room has a lower root: E below 8 m², D to 17, C to 34, A from 34', () => {
    expect([0.5, 5, 12, 25, 40, 400].map(root)).toEqual([4, 4, 2, 0, -3, -3]);
  });

  it('each boundary belongs to the bucket above it', () => {
    ROOT_AREA_BOUNDS_M2.forEach((bound, i) => {
      expect(root(bound - EPS)).toBe(ROOT_SEMITONES[i]);
      expect(root(bound)).toBe(ROOT_SEMITONES[i + 1]);
      expect(root(bound + EPS)).toBe(ROOT_SEMITONES[i + 1]);
    });
  });

  it('follows the floor area alone, whatever the ceiling and the volume are', () => {
    expect(roomSignature({ ...LIVING, floorArea: 5 }).keyRoot).toBe(4);
    expect(roomSignature({ ...DESK, floorArea: 40 }).keyRoot).toBe(-3);
  });
});

describe('mode from the ceiling height (FR-ROOM-11)', () => {
  const mode = (ceilingHeight: number): ModeId => roomSignature({ level: 1, ceilingHeight }).mode;

  it('minorPent below 2.60 m, majorPent to 2.90 m, susPent from 2.90 m', () => {
    expect([0.4, 2.4, 2.7, 3.0, 12].map(mode)).toEqual([
      'minorPent',
      'minorPent',
      'majorPent',
      'susPent',
      'susPent',
    ]);
  });

  it('each boundary belongs to the bucket above it', () => {
    MODE_CEILING_BOUNDS_M.forEach((bound, i) => {
      expect(mode(bound - EPS)).toBe(CEILING_MODES[i]);
      expect(mode(bound)).toBe(CEILING_MODES[i + 1]);
      expect(mode(bound + EPS)).toBe(CEILING_MODES[i + 1]);
    });
  });

  it('follows the ceiling alone, never the table height', () => {
    expect(roomSignature({ ...DESK, tableHeight: 1.2 }).mode).toBe('minorPent');
    expect(roomSignature({ ...DESK, ceilingHeight: 3.1 }).mode).toBe('susPent');
  });
});

describe('roomSignature is pure, total and quantised (TC-SIG-01)', () => {
  it('100 calls with the same features give deep-equal results and leave the input alone', () => {
    for (const { features } of ROOMS) {
      const before = JSON.stringify(features);
      const first = roomSignature(features); // the fixtures are deep-frozen: a write to one would throw
      for (let i = 0; i < 100; i++) expect(roomSignature(features)).toEqual(first);
      expect(roomSignature({ ...features })).toEqual(first);
      expect(JSON.stringify(features)).toBe(before);
    }
  });

  it('a signature cannot be changed by its caller: the object and its starter voices are frozen', () => {
    for (const sig of [WANDERER, roomSignature(KITCHEN), roomSignature({ level: 1, floorArea: 20 })]) {
      expect(Object.isFrozen(sig)).toBe(true);
      expect(Object.isFrozen(sig.starterVoices)).toBe(true);
      expect(() => {
        sig.tempo = 60;
      }).toThrow(TypeError);
    }
  });

  it('has exactly the seven fields of v1, each inside its set, and a tempo of 84 for every input', () => {
    const next = seeded(141);
    const pick = (): number | undefined => {
      const r = next();
      if (r < 0.2) return undefined;
      return r < 0.35 ? UNKNOWN[Math.floor(next() * UNKNOWN.length)] : next() * 60;
    };
    for (let n = 0; n < 500; n++) {
      const features: Record<string, number> = { level: 1 + Math.floor(next() * 4) };
      for (const field of FIELDS) {
        const value = pick();
        if (value !== undefined) features[field] = value;
      }
      const sig = roomSignature(features as unknown as RoomFeatures);
      expect(Object.keys(sig).sort()).toEqual(
        ['keyRoot', 'mode', 'paletteSeed', 'reverbRt60', 'reverbSize', 'starterVoices', 'tempo'].sort(),
      );
      expect(ROOT_SEMITONES).toContain(sig.keyRoot);
      expect(CEILING_MODES).toContain(sig.mode);
      expect(REVERB_RT60_STEPS_S).toContain(sig.reverbRt60);
      const size = sig.reverbRt60 < 0.75 ? 'small' : sig.reverbRt60 < 1.05 ? 'medium' : 'large';
      expect(sig.reverbSize).toBe(size);
      expect(sig.tempo).toBe(84);
      expect(STARTER_SETS).toContainEqual(sig.starterVoices);
      const { paletteSeed } = sig;
      expect(Number.isInteger(paletteSeed) && paletteSeed >= 0 && paletteSeed < 2 ** 32).toBe(true);
    }
  });

  it('the tempo is the one default of core/, which garden/ may not load at run time', () => {
    expect(WANDERER.tempo).toBe(DEFAULT_TEMPO_BPM);
    expect(roomSignature(LIVING).tempo).toBe(DEFAULT_TEMPO_BPM);
  });

  it('a value that is not finite or not above 0 counts as unknown: the same as leaving the field out', () => {
    for (const field of FIELDS) {
      const left = roomSignature(without(KITCHEN, field));
      // The UNKNOWN values, and what a caller outside TypeScript could send: no value, a null, a string.
      // Each input is frozen: tidying an unknown field away in the caller's object would throw.
      for (const value of [...UNKNOWN, undefined, null, '4.2']) {
        expect(roomSignature(deepFreeze({ ...KITCHEN, [field]: value }))).toEqual(left);
      }
    }
  });

  it('reads no clock and no random source (static check)', () => {
    const source = readFileSync(new URL('../../../src/garden/signature.ts', import.meta.url), 'utf8');
    expect(/\bDate\b|\bMath\.random\b|\bperformance\b/.test(source)).toBe(false);
  });
});

describe('three rooms, three signatures: the rooms worked by hand in LLD §5.8 (TC-SIG-03)', () => {
  it('sig-small-desk (2.0 × 2.8 × 2.40 m, level 1) is E minorPent with a 0.3 s decay', () => {
    expect(fnv([0, 0, 0, 1, 1, 1, 1])).toBe(0x0fe2778b);
    expect(roomSignature(DESK)).toEqual({
      keyRoot: 4,
      mode: 'minorPent',
      tempo: 84,
      reverbRt60: 0.3,
      reverbSize: 'small',
      starterVoices: ['pluck', 'choir', 'bass'],
      paletteSeed: 0x0fe2778b,
    });
  });

  it('sig-kitchen-counter (3.6 × 4.2 × 2.70 m, level 2) is D majorPent with a 0.6 s decay', () => {
    expect(fnv([1, 1, 1, 2, 2, 1, 2])).toBe(0xccfb3565);
    expect(roomSignature(KITCHEN)).toEqual({
      keyRoot: 2,
      mode: 'majorPent',
      tempo: 84,
      reverbRt60: 0.6,
      reverbSize: 'small',
      starterVoices: ['pad', 'pluck', 'bass'],
      paletteSeed: 0xccfb3565,
    });
  });

  it('sig-living-table (6.0 × 7.0 × 3.00 m, level 1) is A susPent with a 2.0 s decay', () => {
    expect(fnv([3, 2, 5, 1, 1, 1, 2])).toBe(0xadd04cf6);
    expect(roomSignature(LIVING)).toEqual({
      keyRoot: -3,
      mode: 'susPent',
      tempo: 84,
      reverbRt60: 2.0,
      reverbSize: 'large',
      starterVoices: ['bell', 'pad', 'choir'],
      paletteSeed: 0xadd04cf6,
    });
  });

  it('the three differ pairwise in key root, mode, decay, starter set and palette seed', () => {
    const sigs = ROOMS.map(({ features }) => roomSignature(features));
    const keys = ['keyRoot', 'mode', 'reverbRt60', 'starterVoices', 'paletteSeed'] as const;
    for (const key of keys) expect(new Set(sigs.map((sig) => String(sig[key]))).size).toBe(3);
  });

  it('the seeds give the tints LLD §5.8 lists: hue rotation 259°, 69°, 118°; saturation nudge 0, −1, +1', () => {
    const seeds = ROOMS.map(({ features }) => roomSignature(features).paletteSeed);
    expect(seeds.map((h) => h % 360)).toEqual([259, 69, 118]);
    expect(seeds.map((h) => ((h >>> 9) % 3) - 1)).toEqual([0, -1, 1]);
  });

  it('each has the starter set its hash picks, and the volume as floor × ceiling changes nothing', () => {
    for (const { features } of ROOMS) {
      const sig = roomSignature(features);
      expect(sig.starterVoices).toBe(STARTER_SETS[sig.paletteSeed % 6]);
      expect(roomSignature(without(features, 'roomVolume'))).toEqual(sig);
    }
  });
});

describe('quantisation stability (TC-SIG-02; the stability contract of LLD §5.8)', () => {
  const LENGTH_TOLERANCE_M = 0.05;
  const AREA_TOLERANCE_M2 = 0.3;
  /** How far each input moves, as a share of its tolerance (−1..1); the mesh sides are the two floor sides. */
  interface Shift {
    floor: number;
    table: number;
    ceiling: number;
    height: number;
    width: number;
    sides: [number, number];
    /** The volume is the product of the three moved mesh sides, not moved floor area × moved ceiling. */
    mesh: boolean;
  }

  function moved({ features, sides }: (typeof ROOMS)[number], by: Shift): RoomFeatures {
    const floorArea = features.floorArea + by.floor * AREA_TOLERANCE_M2;
    const ceilingHeight = features.ceilingHeight + by.ceiling * LENGTH_TOLERANCE_M;
    const [a, b] = sides.map((side, i) => side + (by.sides[i] ?? 0) * LENGTH_TOLERANCE_M) as [number, number];
    return {
      ...features,
      floorArea,
      ceilingHeight,
      tableArea: features.tableArea + by.table * AREA_TOLERANCE_M2,
      tableHeight: features.tableHeight + by.height * LENGTH_TOLERANCE_M,
      largestWallWidth: features.largestWallWidth + by.width * LENGTH_TOLERANCE_M,
      roomVolume: by.mesh ? a * b * ceilingHeight : floorArea * ceilingHeight,
    };
  }

  /** The signatures of a room at the 64 corners of the tolerance. */
  function corners(room: (typeof ROOMS)[number]): RoomSignature[] {
    return Array.from({ length: 64 }, (_, corner) => {
      const sign = (bit: number): number => (corner & (1 << bit) ? 1 : -1);
      const by = { floor: sign(0), table: sign(1), ceiling: sign(2), height: sign(3), width: sign(4) };
      return roomSignature(moved(room, { ...by, sides: [sign(0), sign(0)], mesh: sign(5) > 0 }));
    });
  }

  it('all 64 corners of the tolerance leave each fixture room its signature', () => {
    for (const room of ROOMS) {
      const still = roomSignature(room.features);
      corners(room).forEach((sig, corner) => expect(sig, `${room.name} corner ${corner}`).toEqual(still));
    }
  });

  it('the same corners do move a room that sits within tolerance of a boundary: a 2.58 m ceiling', () => {
    const low = {
      name: 'low desk',
      features: { ...DESK, ceilingHeight: 2.58 },
      sides: [2.0, 2.8] as [number, number],
    };
    expect(new Set(corners(low).map((sig) => sig.mode))).toEqual(new Set(['minorPent', 'majorPent']));
  });

  it('200 seeded samples inside the tolerance leave each fixture room its signature', () => {
    const next = seeded(2026);
    const share = (): number => next() * 2 - 1;
    for (const room of ROOMS) {
      const still = roomSignature(room.features);
      for (let n = 0; n < 200; n++) {
        const by = { floor: share(), table: share(), ceiling: share(), height: share(), width: share() };
        const shift: Shift = { ...by, sides: [share(), share()], mesh: n % 2 === 1 };
        expect(roomSignature(moved(room, shift)), `${room.name} sample ${n}`).toEqual(still);
      }
    }
  });

  it('one wall more or less changes nothing: four walls sit inside the 3–5 bucket', () => {
    for (const { features } of ROOMS) {
      const still = roomSignature(features);
      expect(roomSignature({ ...features, wallCount: 3 })).toEqual(still);
      expect(roomSignature({ ...features, wallCount: 5 })).toEqual(still);
    }
  });

  it('an input within tolerance of a boundary does flip: a 2.58 m ceiling becomes majorPent at +5 cm', () => {
    expect(roomSignature({ ...DESK, ceilingHeight: 2.58 }).mode).toBe('minorPent');
    expect(roomSignature({ ...DESK, ceilingHeight: 2.58 + LENGTH_TOLERANCE_M }).mode).toBe('majorPent');
    expect(roomSignature({ level: 1, floorArea: 16.8 }).keyRoot).toBe(2);
    expect(roomSignature({ level: 1, floorArea: 16.8 + AREA_TOLERANCE_M2 }).keyRoot).toBe(0);
  });

  it('a decay flip moves the decay by exactly one step and changes neither key nor mode', () => {
    const room = (floorArea: number): RoomFeatures => ({ level: 1, floorArea, ceilingHeight: 2.7 });
    const near = roomSignature(room(17.2)); // 0.748 s raw, 0.002 s under the 0.75 s boundary
    const over = roomSignature(room(17.2 + AREA_TOLERANCE_M2));
    expect([near.reverbRt60, over.reverbRt60]).toEqual([0.6, 0.9]);
    const step = (sig: RoomSignature): number => REVERB_RT60_STEPS_S.indexOf(sig.reverbRt60);
    expect(step(over) - step(near)).toBe(1);
    expect([over.keyRoot, over.mode]).toEqual([near.keyRoot, near.mode]);
  });

  it('an input moved by two buckets or more changes its output', () => {
    expect(roomSignature({ ...DESK, floorArea: 20 }).keyRoot).not.toBe(roomSignature(DESK).keyRoot);
    expect(roomSignature({ ...DESK, ceilingHeight: 3.0 }).mode).not.toBe(roomSignature(DESK).mode);
    expect(roomSignature({ ...DESK, roomVolume: 60 }).reverbRt60).not.toBe(roomSignature(DESK).reverbRt60);
    expect(roomSignature({ ...DESK, tableHeight: 1.1 }).paletteSeed).not.toBe(
      roomSignature(DESK).paletteSeed,
    );
  });
});

describe('the Wanderer fallback and the default buckets (TC-SIG-04)', () => {
  it('WANDERER is C majorPent, 84 BPM, 0.9 s (medium), Bell / Pad / Pluck, palette seed 0', () => {
    expect(WANDERER).toEqual({
      keyRoot: 0,
      mode: 'majorPent',
      tempo: 84,
      reverbRt60: 0.9,
      reverbSize: 'medium',
      starterVoices: ['bell', 'pad', 'pluck'],
      paletteSeed: 0,
    });
    expect(WANDERER.reverbRt60).toBe(REVERB_RT60_DEFAULT_S);
  });

  it('placement level 3 or 4: the Wanderer with no wall known; with walls, the room signature (D-060 item 14)', () => {
    for (const level of [3, 4] as const) {
      expect(roomSignature({ level })).toBe(WANDERER);
      for (const { features } of ROOMS) {
        expect(roomSignature({ ...without(features, 'wallCount'), level })).toBe(WANDERER);
        // A floating bed has no table under it: the room is read from what is left, the walls among it.
        const floating = without(features, 'tableHeight', 'tableArea');
        expect(roomSignature({ ...floating, level })).toEqual(roomSignature({ ...floating, level: 1 }));
        expect(roomSignature({ ...floating, level })).not.toBe(WANDERER);
      }
    }
  });

  it('level 1 or 2 with no measured field known is the Wanderer', () => {
    for (const level of [1, 2] as const) {
      expect(roomSignature({ level })).toBe(WANDERER);
      for (const value of UNKNOWN) {
        const nothing = Object.fromEntries(FIELDS.map((field) => [field, value]));
        expect(roomSignature({ level, ...nothing })).toBe(WANDERER);
      }
    }
    // A count of 0 is not above 0, so it is unknown like any other field: no wall seen is no measurement.
    expect(roomSignature({ level: 1, wallCount: 0 })).toBe(WANDERER);
  });

  it('each of the seven fields is a measurement: a room with only that one known is not the Wanderer', () => {
    for (const field of FIELDS) {
      for (const level of [1, 2] as const) {
        const sig = roomSignature({ level, [field]: KITCHEN[field] });
        expect(sig, field).not.toBe(WANDERER);
        expect(sig.paletteSeed, field).not.toBe(WANDERER.paletteSeed);
      }
    }
  });

  it('a level that is not 1 or 2, or no argument at all, is the Wanderer: the function never throws', () => {
    for (const level of [0, 5, -1, 1.5, Number.NaN, Infinity, undefined, null, '1']) {
      expect(roomSignature({ ...KITCHEN, level } as unknown as RoomFeatures)).toBe(WANDERER);
    }
    for (const nothing of [null, undefined]) {
      expect(roomSignature(nothing as unknown as RoomFeatures)).toBe(WANDERER);
    }
  });

  it('at level 1 or 2 one unknown field takes its default bucket on its own', () => {
    expect(roomSignature(without(DESK, 'floorArea'))).toMatchObject({
      keyRoot: 0,
      mode: 'minorPent',
      reverbRt60: 0.3,
    });
    expect(roomSignature(without(DESK, 'ceilingHeight'))).toMatchObject({
      keyRoot: 4,
      mode: 'majorPent',
      reverbRt60: 0.3,
    });
    expect(roomSignature(without(DESK, 'roomVolume', 'floorArea'))).toMatchObject({
      keyRoot: 0,
      mode: 'minorPent',
      reverbRt60: 0.9,
      reverbSize: 'medium',
    });
  });

  it('one known field is a room, not the Wanderer: the rest take their default buckets and the seed is not 0', () => {
    const tableOnly = roomSignature({ level: 2, tableHeight: 0.92 });
    expect(tableOnly).toMatchObject({ keyRoot: 0, mode: 'majorPent', reverbRt60: 0.9, reverbSize: 'medium' });
    expect(tableOnly.paletteSeed).toBe(fnv([2, 1, 2, 2, 1, 1, 1]));
    // Every hash-only input left out hashes like its middle bucket.
    const floorOnly = roomSignature({ level: 1, floorArea: 20 });
    const middle = { tableHeight: 0.7, tableArea: 1, wallCount: 4, largestWallWidth: 3 };
    expect(floorOnly.paletteSeed).toBe(fnv([2, 1, 2, 1, 1, 1, 1]));
    expect(roomSignature({ level: 1, floorArea: 20, ...middle })).toEqual(floorOnly);
  });

  it('all 7,776 bucket tuples: the seed is the FNV-1a hash of the tuple, never 0, and picks the starter set', () => {
    const values = Object.entries({
      floorArea: [5, 12, 25, 40],
      ceilingHeight: [2.4, 2.7, 3.0],
      roomVolume: [10, 40, 55, 75, 100, 130],
      tableHeight: [0.5, 0.7, 0.9, 1.1],
      tableArea: [0.3, 1.0, 2.0],
      wallCount: [2, 4, 7],
      largestWallWidth: [2, 3, 5],
    });
    const total = values.reduce((n, [, list]) => n * list.length, 1);
    expect(total).toBe(7776);
    const seeds = new Set<number>();
    for (let n = 0; n < total; n++) {
      let rest = n;
      const tuple: number[] = [];
      const features: Record<string, number> = { level: 1 + (n % 2) };
      for (const [field, list] of values) {
        const bucket = rest % list.length;
        rest = Math.floor(rest / list.length);
        tuple.push(bucket);
        features[field] = list[bucket] as number;
      }
      const sig = roomSignature(features as unknown as RoomFeatures);
      const h = fnv(tuple);
      if (sig.paletteSeed !== h || h === 0) expect.fail(`tuple ${tuple.join()}: seed ${sig.paletteSeed}`);
      if (sig.starterVoices !== STARTER_SETS[h % 6]) expect.fail(`tuple ${tuple.join()}: starter set`);
      const [root = -1, mode = -1, step = -1] = tuple;
      expect([sig.keyRoot, sig.mode, sig.reverbRt60], tuple.join()).toEqual([
        ROOT_SEMITONES[root],
        CEILING_MODES[mode],
        REVERB_RT60_STEPS_S[step],
      ]);
      seeds.add(h);
    }
    expect(seeds.has(WANDERER.paletteSeed)).toBe(false);
  });
});

describe('chordDegrees: the room chord as ring indices (API_SPEC §1.1, FR-ROOM-12)', () => {
  it('is root, third or fourth, fifth: a major triad, a minor triad, a sus4', () => {
    expect(chordDegrees('majorPent')).toEqual([0, 2, 3]);
    expect(chordDegrees('minorPent')).toEqual([0, 1, 3]);
    expect(chordDegrees('susPent')).toEqual([0, 2, 3]);
  });

  it('the rings it names are 0-4-7, 0-3-7 and 0-5-7 semitones above the key root', () => {
    const semitones = (mode: ModeId): (number | undefined)[] =>
      chordDegrees(mode).map((ring) => MODE_DEGREES[mode][ring]);
    expect(semitones('majorPent')).toEqual([0, 4, 7]);
    expect(semitones('minorPent')).toEqual([0, 3, 7]);
    expect(semitones('susPent')).toEqual([0, 5, 7]);
  });

  it('gives the chords of the three worked rooms, and cannot be changed by a caller', () => {
    const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
    const chord = ({ keyRoot, mode }: RoomSignature): (string | undefined)[] =>
      chordDegrees(mode).map((ring) => NOTES[(keyRoot + (MODE_DEGREES[mode][ring] ?? 0) + 12) % 12]);
    expect(ROOMS.map(({ features }) => chord(roomSignature(features)))).toEqual([
      ['E', 'G', 'B'],
      ['D', 'F♯', 'A'],
      ['A', 'D', 'E'],
    ]);
    for (const mode of CEILING_MODES) expect(Object.isFrozen(chordDegrees(mode))).toBe(true);
  });
});
