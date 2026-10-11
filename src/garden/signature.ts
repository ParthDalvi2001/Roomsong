// The room signature, v1 (LLD §5.8, FR-ROOM-06, FR-ROOM-11): what the real room tunes. Three outputs follow the
// room: the key root (floor area), the mode (ceiling height) and the reverb decay (room volume). The tempo is a
// constant, and the other features feed only a hash that picks the starter voices and the tint. Every input is
// bucketed first and a signature depends on the tuple of buckets alone, so measurement noise changes nothing
// unless an input sits within noise distance of a bound.
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
  REVERB_RT60_DEFAULT_S,
  REVERB_RT60_STEPS_S,
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
} from './config.js';

import type { ModeId, RoomFeatures, RoomSignature } from './model.js';
import type { DEFAULT_TEMPO_BPM } from '../core/index.js';

// FR-MUS-03: the room does not set the tempo (D-021). garden/ may not load core/ at run time, so core's one
// default is repeated here under core's own type: a different number does not compile.
const TEMPO_BPM: typeof DEFAULT_TEMPO_BPM = 84;
const SIZE_LABELS: readonly RoomSignature['reverbSize'][] = ['small', 'medium', 'large'];

/** The signature of an unknown room (FR-ROOM-11): C majorPent, 0.9 s. No room has its palette seed, 0. Frozen. */
export const WANDERER: RoomSignature = Object.freeze<RoomSignature>({
  keyRoot: 0,
  mode: 'majorPent',
  tempo: TEMPO_BPM,
  reverbRt60: REVERB_RT60_DEFAULT_S,
  reverbSize: 'medium',
  starterVoices: ['bell', 'pad', 'pluck'],
  paletteSeed: 0,
});
Object.freeze(WANDERER.starterVoices);

type Chord = readonly [number, number, number];
const CHORD_DEGREES: Readonly<Record<ModeId, Chord>> = Object.freeze({
  majorPent: Object.freeze<Chord>([0, 2, 3]),
  minorPent: Object.freeze<Chord>([0, 1, 3]),
  susPent: Object.freeze<Chord>([0, 2, 3]),
});

/** The room chord (FR-ROOM-12) as ring indices into MODE_DEGREES[mode]: the root, the third or fourth, the fifth. */
export function chordDegrees(mode: ModeId): Chord {
  return CHORD_DEGREES[mode];
}

/** A measurement that is not finite or not above 0 is unknown (FR-ROOM-10); so is anything that is not a number. */
function known(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * The 0-based bucket of `value`. Bounds are half-open: a value on a bound is in the bucket above it.
 * An unknown value takes `unknown`, its default bucket.
 */
function bucket(value: number | undefined, bounds: readonly number[], unknown = HASH_DEFAULT_BUCKET): number {
  if (value === undefined) return unknown;
  const above = bounds.findIndex((bound) => value < bound);
  return above < 0 ? bounds.length : above;
}

/** FR-ROOM-06: Sabine's decay of the room in seconds, before it is quantised; undefined without a volume. */
function rawDecay(roomVolume?: number, floorArea?: number, ceilingHeight?: number): number | undefined {
  const volume =
    roomVolume ?? (floorArea === undefined ? undefined : floorArea * (ceilingHeight ?? CEILING_DEFAULT_M));
  return volume === undefined ? undefined : (SABINE_K * volume) / SABINE_ABSORPTION_M2;
}

function fnv1a32(bytes: readonly number[]): number {
  let h = FNV_OFFSET_BASIS;
  for (const byte of bytes) h = Math.imul(h ^ byte, FNV_PRIME);
  return h >>> 0;
}

/**
 * The signature of a room (FR-ROOM-11): pure, total, deterministic and quantised; the result is frozen.
 * No argument, a placement level other than 1 or 2, or no measured field known gives WANDERER itself. At level
 * 1 or 2 an unknown field takes its default bucket on its own. Lengths in metres, areas in m², the volume in m³.
 */
export function roomSignature(features: RoomFeatures): RoomSignature {
  if (features == null) return WANDERER; // total: a caller outside TypeScript can pass nothing at all
  const floorArea = known(features.floorArea);
  const ceilingHeight = known(features.ceilingHeight);
  const roomVolume = known(features.roomVolume);
  const tableHeight = known(features.tableHeight);
  const tableArea = known(features.tableArea);
  const wallCount = known(features.wallCount);
  const wallWidth = known(features.largestWallWidth);
  const measured = [floorArea, ceilingHeight, roomVolume, tableHeight, tableArea, wallCount, wallWidth];
  const placed = features.level === 1 || features.level === 2;
  if (!placed || measured.every((value) => value === undefined)) return WANDERER;

  const root = bucket(floorArea, ROOT_AREA_BOUNDS_M2, ROOT_DEFAULT_BUCKET);
  const mode = bucket(ceilingHeight, MODE_CEILING_BOUNDS_M, MODE_DEFAULT_BUCKET);
  // The first and the last step are the 0.3–2.0 s clamp: every raw decay falls into one of the six.
  const raw = rawDecay(roomVolume, floorArea, ceilingHeight);
  const step = bucket(raw, REVERB_RT60_BOUNDS_S, RT60_DEFAULT_BUCKET);
  const h = fnv1a32([
    root,
    mode,
    step,
    bucket(tableHeight, TABLE_HEIGHT_BOUNDS_M),
    bucket(tableArea, TABLE_AREA_BOUNDS_M2),
    bucket(wallCount, WALL_COUNT_BOUNDS),
    bucket(wallWidth, WALL_WIDTH_BOUNDS_M),
  ]);
  // bucket() stays inside each list: the `??` fallbacks from here on are for the type checker.
  const reverbRt60 = REVERB_RT60_STEPS_S[step] ?? REVERB_RT60_DEFAULT_S;
  return Object.freeze<RoomSignature>({
    keyRoot: ROOT_SEMITONES[root] ?? WANDERER.keyRoot,
    mode: CEILING_MODES[mode] ?? WANDERER.mode,
    tempo: TEMPO_BPM,
    reverbRt60,
    reverbSize: SIZE_LABELS[bucket(reverbRt60, REVERB_LABEL_BOUNDS_S)] ?? WANDERER.reverbSize,
    starterVoices: STARTER_SETS[h % STARTER_SETS.length] ?? WANDERER.starterVoices,
    paletteSeed: h,
  });
}
