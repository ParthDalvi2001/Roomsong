// Named constants of access/ (CODING_GUIDELINES §4). Each cites the requirement it comes from. Nothing here has
// been seen on a headset: sizes and levels are device checks (TC-DEV-06).
import { BED_OUTER } from '../garden/index.js';
import { PANEL_DISTANCE_M } from '../ui/index.js';

/** UX §8, §9.8: the gaze dot, 1.2 cm across, on the head's forward line; this far ahead when it is on no target. */
export const RETICLE_DOT_M = 0.012;
export const RETICLE_IDLE_DISTANCE_M = PANEL_DISTANCE_M;
/** High contrast (UX §8): the dot's charcoal outline, outside the 1.2 cm. The dot's quad holds both. */
export const RETICLE_OUTLINE_M = 0.002;
/** The dot's texture, square, in pixels: 20 per cm over the quad. */
export const RETICLE_TEXTURE_PX = 32;
/** UX §8: the dwell ring round the dot fills from the top, in this many steps. */
export const RETICLE_RING_INNER_M = 0.009;
export const RETICLE_RING_OUTER_M = 0.0115;
export const RETICLE_RING_SEGMENTS = 48;
/** UX §9.8: drawn over everything, captions and the panel included. */
export const RETICLE_RENDER_ORDER = 1010;

/** D-054: in Listen the orb's wake by gaze needs this many dwell times, so a look back at the garden does not end it. */
export const LISTEN_WAKE_DWELL_FACTOR = 2;

/** FR-UI-07, UX §8: the beat ring's 16 ticks, one per step, this far out from the bed centre (just past its edge). */
export const BEAT_TICK_RADIUS_M = BED_OUTER + 0.015;
/** A tick, radial length by width, lying on the bed's plane this far above it. */
export const BEAT_TICK_LENGTH_M = 0.016;
export const BEAT_TICK_WIDTH_M = 0.006;
export const BEAT_TICK_LIFT_M = 0.002;
/**
 * Tick brightness (0..1 of cream, added to the view): at rest; the lift the tide's crest gives a tick of an empty
 * step (the tide position); and the lift it gives a tick whose step holds a plant (the trigger flash). Through the
 * FlashGuard: at most one swing up and one down per bar per tick; the crest passes in 3.5 steps, so both fall inside
 * one second at 120 BPM: 2 a second, under the cap of 3 (FR-UI-11, BUG-009).
 */
export const BEAT_TICK_REST = 0.3;
export const BEAT_TICK_TIDE_LIFT = 0.2;
export const BEAT_TICK_FLASH_LIFT = 0.7;
