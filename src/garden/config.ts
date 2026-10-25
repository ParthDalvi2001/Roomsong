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

/** FR-UI-10: the bed is raised or lowered by at most this many metres. persistence/ takes its bound from here. */
export const BED_HEIGHT_OFFSET_MAX_M = 0.1;

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

// Growth and the seed supply (growth.ts).

/** core/config.ts has the same day (the fakeDay offset); garden's pure files import no value from core/. */
export const MS_PER_DAY = 86_400_000;
export const MS_PER_MINUTE = 60_000;
/** FR-MUS-09, LLD §5.4: the age in days at which a plant reaches growth stages 1, 2 and 3. */
export const GROWTH_STAGE_DAYS = [1, 3, 7] as const;
/** FR-MUS-08: unplanted seeds pile up to this many. persistence/ takes its bound from here (API_SPEC §4). */
export const SEED_SUPPLY_MAX = 5;
/** FR-MUS-08: a new garden starts with this many seeds, one per voice of the signature's starter set. */
export const STARTER_SEEDS = 3;
/** FR-MUS-08: the voice of the daily seed goes round these, one step a day: the Must voices of LLD §7 (no Shimmer, S5). */
export const DAILY_VOICES = ['bell', 'pad', 'pluck', 'bass', 'choir'] as const;
/** FR-MUS-05: seed hues are the places of one golden-ratio sequence, so that neighbouring places are far apart. */
export const HUE_STEP = 0.618033988749895;
/** API_SPEC §1.1 (newGarden): lastSeedDate before the first visit. The save's validator takes it; that visit replaces it. */
export const NO_SEED_DATE = '1970-01-01';
/** API_SPEC §4: the last year a YYYY-MM-DD date can hold; a time beyond it is no visit. */
export const LAST_YEAR = 9999;
/** API_SPEC §1.1 (applyVisit): real zones lie between UTC−12 and UTC+14; an offset beyond 16 hours is no visit. */
export const TZ_OFFSET_MAX_MIN = 960;

// The state holder (GardenSystem.ts).

/** FR-MUS-12: how long a removed plant can be brought back, in milliseconds on core's clock. */
export const UNDO_LIFE_MS = 5000;
/** PRD §3.4, UX §3.5 (T-148): Listen mode ends by itself after 10 minutes, with the ending chord. */
export const LISTEN_MAX_MS = 600_000;
/** LLD §3.2 (the autoplant flag, API_SPEC §3): plant n goes to cell (seed + 7n) mod 80; 7 shares no factor with 80. */
export const AUTOPLANT_CELL_STRIDE = 7;
/** T-174, D-057: the time-lapse demo's simulated day, in real ms: stages 1, 2 and 3 show 4, 12 and 28 s after it starts. */
export const TIME_LAPSE_DAY_MS = 4000;
/** D-060 item 13: for this long after a New garden, and until the new one has a plant, the old one can come back. */
export const RESTORE_WINDOW_MS = 10_000;
