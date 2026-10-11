// Named constants of garden/ (CODING_GUIDELINES §4). Each cites the requirement it comes from.
import type { ModeId, RoomSignature } from './model.js';

/** FR-MUS-01: the bed is an annulus; radii in metres. core/config.ts repeats both (BedAnchor). */
export const BED_INNER = 0.12;
export const BED_OUTER = 0.3;
/** FR-MUS-01: 5 pitch rings (0 = inner) of 16 steps = 80 cells. */
export const RINGS = 5;
export const STEPS = 16;

/** FR-HND-10: a point nearer the centre than BED_INNER minus this is in the inner hole (zone 'inner'). */
export const ZONE_INNER_MARGIN_M = 0.03;
/** FR-HND-11: a point farther out than BED_OUTER plus this is off the bed (zone 'outer'). */
export const ZONE_OUTER_MARGIN_M = 0.05;

/** FR-HND-08: the vertical hand travel, in metres, that takes a plant's height from 0 to 1. */
export const PULL_RANGE_M = 0.25;
/** API_SPEC §1.1 (plantSeed): the height a new plant starts at; the sound prototype's value. */
export const NEW_PLANT_HEIGHT = 0.55;

// Room signature v1 (LLD §5.8). Every list of bounds is ascending and half-open: a value on a bound is in the
// bucket above it. The bucket an unknown input takes is the one LLD §5.8 marks with *.

/** FR-ROOM-06: Sabine's RT60 = 0.161 · V / A (s/m). */
export const SABINE_K = 0.161;
/** FR-ROOM-06: the absorption area A in m², the same for every room. Tuned for an audible range, not for acoustic truth. */
export const SABINE_ABSORPTION_M2 = 10;
/** FR-ROOM-06: the ceiling height in metres taken for a room whose floor area is known and whose ceiling is not. */
export const CEILING_DEFAULT_M = 2.7;
/** FR-ROOM-06: the clamp of the reverb decay, in seconds. audio/ imports both. */
export const REVERB_RT60_MIN_S = 0.3;
export const REVERB_RT60_MAX_S = 2.0;
/** FR-ROOM-06: every value reverbRt60 can take, in seconds. */
export const REVERB_RT60_STEPS_S: readonly number[] = Object.freeze([
  REVERB_RT60_MIN_S,
  0.6,
  0.9,
  1.2,
  1.6,
  REVERB_RT60_MAX_S,
]);
/** FR-ROOM-06: the raw decay, in seconds, at which one step ends and the next begins. */
export const REVERB_RT60_BOUNDS_S: readonly number[] = [0.45, 0.75, 1.05, 1.4, 1.8];
/** FR-ROOM-06: the decay of a room whose volume is unknown, and of the Wanderer; RT60_DEFAULT_BUCKET is its step. */
export const REVERB_RT60_DEFAULT_S = 0.9;
export const RT60_DEFAULT_BUCKET = 2;
/** FR-ROOM-06: a decay below the first is labelled small, below the second medium, else large (Settings UI only). */
export const REVERB_LABEL_BOUNDS_S: readonly number[] = [0.75, 1.05];

/** FR-ROOM-11: floor area in m² → key root in semitones from C (E, D, C, A): a bigger room has a lower root. */
export const ROOT_AREA_BOUNDS_M2: readonly number[] = [8, 17, 34];
export const ROOT_SEMITONES: readonly RoomSignature['keyRoot'][] = [4, 2, 0, -3];
/** FR-ROOM-11: an unknown floor area is C. */
export const ROOT_DEFAULT_BUCKET = 2;
/** FR-ROOM-11: ceiling height in metres → mode. */
export const MODE_CEILING_BOUNDS_M: readonly number[] = [2.6, 2.9];
export const CEILING_MODES: readonly ModeId[] = ['minorPent', 'majorPent', 'susPent'];
/** FR-ROOM-11: an unknown ceiling height is majorPent. */
export const MODE_DEFAULT_BUCKET = 1;

/** FR-ROOM-11: these four inputs feed only the hash; an unknown one takes the middle bucket. */
export const TABLE_HEIGHT_BOUNDS_M: readonly number[] = [0.62, 0.85, 1.0];
export const TABLE_AREA_BOUNDS_M2: readonly number[] = [0.5, 1.5];
export const WALL_COUNT_BOUNDS: readonly number[] = [3, 6];
export const WALL_WIDTH_BOUNDS_M: readonly number[] = [2.5, 4.0];
export const HASH_DEFAULT_BUCKET = 1;
/** FR-ROOM-11: FNV-1a, 32-bit, over the seven bucket indices. No tuple hashes to 0, the Wanderer's palette seed. */
export const FNV_OFFSET_BASIS = 0x811c9dc5;
export const FNV_PRIME = 0x01000193;
/**
 * FR-ROOM-11, FR-MUS-08: the hash picks the three voices a new garden's starter seeds get. Each set has a
 * sustaining voice (pad, choir) and a percussive one (bell, pluck); set 0 is the Wanderer's.
 */
export const STARTER_SETS: readonly RoomSignature['starterVoices'][] = [
  ['bell', 'pad', 'pluck'],
  ['pluck', 'choir', 'bass'],
  ['bell', 'choir', 'bass'],
  ['pad', 'pluck', 'bass'],
  ['bell', 'pad', 'choir'],
  ['pluck', 'bell', 'choir'],
];
// A signature hands one of these out: frozen, so no caller can change the set the next room gets.
STARTER_SETS.forEach((set) => Object.freeze(set));
