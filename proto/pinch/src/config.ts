// Named constants of the pinch-accuracy test page (T-105, TC-DEV-00). The numbers are sheet 6.2 of
// specs/08-status/PLAN_AMENDMENT_2026-10-10.md; this page exists to check them on a headset.

/** FR-HND-02: thumb tip to index tip below this starts a pinch; above the release value ends it (hysteresis). */
export const PINCH_ENTER_M = 0.02;
export const PINCH_RELEASE_M = 0.032;
/** FR-HND-02: each edge is confirmed over this many consecutive frames. */
export const PINCH_DEBOUNCE_FRAMES = 2;
/** FR-HND-02: no new pinch for this long after a release. */
export const PINCH_LOCKOUT_MS = 130;

/** FR-HND-03: 1-euro filter on the pinch point. Beta is the value to tune on device (?beta=, LLD 5.7). */
export const ONE_EURO_MIN_CUTOFF_HZ = 1.0;
export const ONE_EURO_BETA = 0.0;
export const ONE_EURO_D_CUTOFF_HZ = 1.0;
/** LLD 5.7 searches beta in about 5 to 50; anything above this in the URL is a typo. */
export const ONE_EURO_BETA_MAX = 100;

/** FR-HND-04: pick radius around a target (nearest wins) and the drawn size of a target. */
export const HIT_RADIUS_M = 0.04;
export const TARGET_DIAMETER_M = 0.025;

/** FR-ROOM-03, D-020: the bed centre, ahead of the head along the floor. */
export const BED_CENTRE_AHEAD_M = 0.45;
/** FR-MUS-01: the bed is a ring of 5 rings x 16 steps. */
export const BED_INNER_M = 0.12;
export const BED_OUTER_M = 0.3;
export const BED_RINGS = 5;
export const BED_STEPS = 16;

/** TC-DEV-00: three grids of GRID_SIDE x GRID_SIDE targets, 20 trials each; block B: 10 trials per tested ring. */
export const GRID_SPACINGS_M = [0.03, 0.04, 0.05] as const;
export const GRID_SIDE = 5;
export const TRIALS_PER_GRID = 20;
export const TRIALS_PER_RING = 10;
/** The feedback colour stays this long before the next target lights (FR-UI-11: under 3 changes a second). */
export const NEXT_TRIAL_DELAY_MS = 600;
/**
 * A pinch confirmed sooner than this after a dot lights began before the user could react to that dot (a pinch
 * closing as it lights, or a second pinch that corrects the last miss): it is not a trial.
 */
export const MIN_REACTION_MS = 150;
/**
 * FR-HND-15: the lit dot shows as paused only after no hand has been tracked for this grace, so tracking that
 * flickers cannot flash it (FR-UI-11). The time without a hand is left out of the trial from its first frame.
 */
export const TRACKING_GRACE_MS = 200;
/** A frame gap longer than this is a stalled session (system menu), not time the user took to pinch. */
export const STALL_MS = 250;

/** T-105 card: a horizontal plane with no table label counts as a surface between these heights. */
export const SURFACE_MIN_HEIGHT_M = 0.5;
export const SURFACE_MAX_HEIGHT_M = 1.1;
/** A plane is horizontal when its normal is within about 18 degrees of vertical, either way up. */
export const HORIZONTAL_MIN_UP = 0.95;
/** Planes arrive in the session's first frames; after this the floating surface is used. */
export const SURFACE_WAIT_MS = 1000;
/** Floating surface: seated eyes (about 1.2 m) minus a 0.75 m table. */
export const FLOATING_BELOW_HEAD_M = 0.45;

/** The finish target: left of the bed centre, 12 cm clear of the outer ring, drawn this many times larger. */
export const FINISH_LEFT_M = 0.42;
export const FINISH_SCALE = 2;

/** NFR-FOV-01: essential content within these half-angles of the view direction. */
export const FOV_HALF_HORIZONTAL_DEG = 25;
export const FOV_HALF_VERTICAL_DEG = 20;

/** Feedback tones (Web Audio, synthesized): frequency in Hz and length in seconds. */
export const HIT_TONE = { hz: 1320, seconds: 0.05 } as const;
export const MISS_TONE = { hz: 196, seconds: 0.18 } as const;
export const TONE_GAIN = 0.3;

/** Target colours. Hit and miss also differ by tone, so colour is never the only cue. Unrated on a headset. */
export const COLOURS = {
  idle: 0x4a7a90,
  lit: 0xfff2a0,
  paused: 0x7a7f88,
  hit: 0x5dff8a,
  miss: 0xff5a3c,
  finish: 0x4aa3ff,
} as const;
