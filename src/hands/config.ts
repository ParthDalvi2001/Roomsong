// Every gesture threshold of hands/ (API_SPEC §1.4, CODING_GUIDELINES §6). render and tests read these too.
// All of them are provisional until the device pinch test (TC-DEV-00): none has been tuned on a headset.
import type { StringKey } from '../core/index.js';

/** FR-HND-02: thumb tip to index tip below this starts a pinch; above the release value ends it (hysteresis). */
export const PINCH_ENTER_M = 0.02;
export const PINCH_RELEASE_M = 0.032;
/** FR-HND-02: each edge is confirmed over this many consecutive samples (2 = 27.8 ms at 72 Hz). */
export const PINCH_DEBOUNCE_FRAMES = 2;
/** FR-HND-02: no new pinch, and no new select, for this long after a release. */
export const PINCH_LOCKOUT_MS = 130;

/** FR-HND-03: 1-euro filter on the pinch point. Beta is in Hz per m/s and is the value to tune on device (LLD §5.7). */
export const ONE_EURO_MIN_CUTOFF_HZ = 1.0;
export const ONE_EURO_BETA = 0.0;
export const ONE_EURO_D_CUTOFF_HZ = 1.0;

/** FR-HND-04: drawn size of a target, and the pick radius around it (tunable 0.035..0.040; nearest wins). */
export const TARGET_VISIBLE_DIAMETER_M = 0.025;
export const HIT_RADIUS_M = 0.04;
/** FR-HND-16: a new hover candidate must be at least this much closer. */
export const HOVER_DEAD_BAND_M = 0.005;
/** FR-HND-15: a held gesture survives a tracking loss this long (tunable 150..250); then render lerps it back. */
export const TRACKING_GRACE_MS = 200;
export const REVERT_LERP_MS = 150;
/** FR-HND-15, D-030: the hand hint and the tint last until `hands:found`, and at most this long after `hands:lost`. */
export const HAND_HINT_MAX_MS = 5000;
/** The caption that is the hand hint until ui/Hints draws the icon of UX §3.4 (T-151). */
export const HAND_HINT_KEY: StringKey = 'handOutOfView';
/** FR-HND-08/10: a pinched plant does not react inside this; then the dominant axis decides pull or drag. */
export const DRAG_DEAD_ZONE_M = 0.02;

/** FR-HND-05: the palm normal within this angle of world up, held this long, asks for a seed. */
export const PALM_UP_MAX_ANGLE_DEG = 35;
export const PALM_UP_HOLD_MS = 400;
/** API_SPEC §1.4 `palmPos`: a delivered seed rests this far above the palm, along its normal. Not rated on a headset. */
export const PALM_REST_OFFSET_M = 0.03;
/**
 * UX §2 (the settings orb, ui/PanelSystem.ts): the orb shows while the back of the hand faces the head. The cosine
 * of the angle between the two directions is above the first number to show it, and below the second to hide it
 * (the gap keeps it from flickering, FR-UI-11). Palm up, the pose that asks for a seed (FR-HND-05), it is hidden.
 * No requirement fixes the numbers, and neither was tried on a hand: device check.
 */
export const ORB_SHOW_FACING = 0.3;
export const ORB_HIDE_FACING = 0.1;
