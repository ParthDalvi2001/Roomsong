// Named constants of core/ (CODING_GUIDELINES §4). Each cites the requirement it comes from.

/** FR-MUS-03: the one default tempo (API_SPEC §1.0). The listening review T-103 may change it. */
export const DEFAULT_TEMPO_BPM = 84;
/** FR-MUS-03, UX §3.6: the range of the tempo slider. */
export const TEMPO_MIN_BPM = 60;
export const TEMPO_MAX_BPM = 120;
/** UX §3.6: where the volume slider starts. No requirement fixes it; T-103 may change it. */
export const DEFAULT_VOLUME = 0.8;
/** FR-HND-12: the gaze dwell times a user can pick, and the default. */
export const DWELL_MS_OPTIONS = [600, 900, 1200] as const;
export const DEFAULT_DWELL_MS = 900;

/** LLD §5.8: a caption stays on screen at least this long (API_SPEC §1.0). */
export const CAPTION_MIN_MS = 1200;
/** LLD §5.8 (plan v2.1): the limits of a tuning-ripple caption. */
export const RIPPLE_CAPTION_MAX_WORDS = 3;
export const RIPPLE_CAPTION_MAX_CHARS = 16;

/** LLD §3: BedAnchor defaults. They equal garden's BED_INNER and BED_OUTER (FR-MUS-01); core/ may not import garden/. */
export const BED_ANCHOR_INNER_M = 0.12;
export const BED_ANCHOR_OUTER_M = 0.3;

/** LLD §1: entries the logger keeps for the perf HUD and the dev overlay. */
export const LOG_RING_SIZE = 64;

/** API_SPEC §3: bounds of the numeric URL flags. A value outside them is malformed and ignored. */
export const FORCE_LEVEL_MAX = 4; // FR-ROOM-01: placement levels 1..4
export const FAKE_DAY_MAX = 3650; // FR-MUS-09: growth testing; ten years either way keeps every date valid
export const SEED_MAX = 0xffffffff; // a uint32, like RoomSignature.paletteSeed
export const AUTOPLANT_MAX = 80; // FR-MUS-01: the bed has 5 × 16 = 80 cells
export const MS_PER_DAY = 86_400_000;
