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
 * FR-ROOM-01 levels 1 and 2: the surface's height above the floor, which is y = 0 in the local-floor space (a
 * labelled table outside it is not used either, BUG-010: a 0.42 m coffee table is past a seated reach, golden
 * rule 2). The lower value is also the lowest hit a level-3 pinch confirms (D-034): the floor is out of seated reach.
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
/** FR-ROOM-01: level 3 waits this long for the pinch that confirms. 6 s, was 10 s (D-060 item 12): the first-sound
 *  budget is then 5 + 3 + 6 + the planting, under FR-UI-02's 20 s. */
export const HIT_TEST_TIMEOUT_MS = 6000;
/** UX §9.2: the level-3 ghost follows the preview with this ease, so hit-test jitter does not shake it. */
export const GHOST_EASE_MS = 100;

/**
 * FR-ROOM-07: a saved anchor that has given no pose after this long is given up, and the chain places the bed.
 * The caller passes it to `restore()`.
 */
export const ANCHOR_RESTORE_TIMEOUT_MS = 4000;
/**
 * D-041: a bed that comes back from its anchor is kept when its centre is in front of the user and at most
 * BED_CENTRE_MAX_M plus this from the head, measured level; farther out it is placed again. Provisional: the
 * reviewer's starting number, to confirm on the headset (T-129). Without it a small change of posture moves the bed.
 */
export const RESTORE_REACH_SLACK_M = 0.1;
/**
 * FR-ROOM-07 (the new anchor is made in the background and its failure is no error): `create()` gives up after
 * this long, and nothing waits longer than this for an old anchor to be deleted. No requirement gives the
 * number: it is the time FR-ROOM-07 gives a restore. How long a headset takes is unverified (T-129).
 */
export const ANCHOR_CALL_TIMEOUT_MS = 4000;

/** Below this a length has no direction worth dividing by. No requirement: a guard against dividing by zero. */
export const EPSILON_M = 1e-6;

// Room features (FR-ROOM-10, LLD §5.8). A plane is told apart by pose and size, never by its label.
/** FR-ROOM-10: the floor is a level plane within this of y = 0, the floor of the local-floor space. */
export const FLOOR_MAX_OFFSET_M = 0.2;
/** FR-ROOM-10: a ceiling is a level plane at least this far above the floor; a shelf or a door top is lower. */
export const CEILING_MIN_HEIGHT_M = 1.8;
/** FR-ROOM-10 (`wallCount`, LLD §5.8): a wall is an upright plane at least this tall. */
export const WALL_MIN_HEIGHT_M = 1.5;
/**
 * FR-ROOM-10: two upright planes are one wall when the centre of one is within this of the other's line on the
 * floor plan (a door set in a wall, a wall reported twice). Twice the 5 cm length tolerance of LLD §5.8.
 */
export const WALL_LINE_TOLERANCE_M = 0.1;
/** FR-ROOM-10, LLD §5.8: the bed surface is a level plane within this of the bed centre's height. */
export const BED_SURFACE_MAX_GAP_M = 0.05;
/** FR-ROOM-10 (`roomVolume`): the label of the mesh of the whole room, as the emulator gives it. */
export const GLOBAL_MESH_LABEL = 'global mesh';
/** FR-ROOM-10 (no made-up measurement): a plane or a mesh point farther out, or larger, than this is no room. */
export const ROOM_MAX_M = 100;
/** FR-ROOM-10: a pose is rigid when its axes are unit length and square to each other to within this. */
export const RIGID_TOLERANCE = 1e-3;
/**
 * FR-ROOM-10 (inside one XR frame): a footprint with more hull corners than this is not measured. The rectangle
 * search is quadratic in them: 2,000 corners took 26 ms, 5,000 134 ms, 10,000 733 ms and 20,000 3.4 s on the
 * development Mac (2026-10-12). A room's plan has a few dozen.
 */
export const HULL_MAX_CORNERS = 1000;
