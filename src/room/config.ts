// Named constants of room/ (CODING_GUIDELINES §4). Each cites the requirement it comes from.
// None has been checked on a headset: the emulator's planes are not a real room.

/** FR-ROOM-03, D-020: the bed centre goes this far forward of the head, measured level. Far edge = this + BED_OUTER. */
export const BED_CENTRE_DEFAULT_M = 0.45;
/** FR-ROOM-03: nearer than the default only when the surface does not reach it, and never beyond the maximum. */
export const BED_CENTRE_MIN_M = 0.35;
export const BED_CENTRE_MAX_M = 0.45;
/**
 * FR-ROOM-03 (seated reach): the bed's far edge is never farther from the head than this. Also the reach of
 * FR-ROOM-01 (D-034): a surface counts when its point nearest the default spot is at most this far from the head.
 */
export const BED_FAR_EDGE_MAX_M = 0.75;

/** FR-ROOM-01 level 1: the plane labels that mean a table. The emulator has no `desk` (tests/e2e/README.md). */
export const TABLE_LABELS: readonly string[] = ['table', 'desk'];
/**
 * FR-ROOM-01 level 2: the surface's height above the floor, which is y = 0 in the local-floor space. The lower
 * value is also the lowest hit a level-3 pinch confirms (D-034): the floor is out of seated reach.
 */
export const SURFACE_MIN_HEIGHT_M = 0.5;
export const SURFACE_MAX_HEIGHT_M = 1.1;
/**
 * FR-ROOM-01 (D-034): a plane is level when its normal is within 5 degrees of vertical, either way up; a steeper
 * surface cannot carry a level bed. The cosine is 5.1 degrees, so 5.0 passes and 5.2 does not.
 */
export const LEVEL_MIN_COS = 0.996;
/**
 * FR-ROOM-01 level 4: the floating bed is this far below eye height. Also (D-034) no plane and no level-3 hit
 * less than this far below the eyes is used: no bed sits higher than the floating one would.
 */
export const FLOATING_DROP_M = 0.25;

/** FR-ROOM-01, LLD §5.5: levels 1 and 2 together wait this long for a plane. The caller passes it to `run()`. */
export const PLANE_LEVELS_TIMEOUT_MS = 3000;
/** FR-ROOM-01: level 3 waits this long for the pinch that confirms. */
export const HIT_TEST_TIMEOUT_MS = 10_000;

/** Below this a length has no direction worth dividing by. No requirement: a guard against dividing by zero. */
export const EPSILON_M = 1e-6;
