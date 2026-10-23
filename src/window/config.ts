// Named constants of window/ (CODING_GUIDELINES §4): the garden window, FR-SYS-07 (LLD §11). None is a device
// number: the window is the headset-free bench and never the judged path.

/**
 * FR-SYS-07: the fixed camera stands at a seated eye point, in metres above the floor (y = 0). The floating bed
 * (room/, FR-ROOM-01 level 4) is placed from it as from a head: 0.45 m ahead and 0.25 m below.
 */
export const WINDOW_EYE_HEIGHT_M = 1.2;
/**
 * FR-SYS-07: how far the camera looks down, in radians. The floating bed's near edge is 59 degrees below level and
 * its far edge 18; a plant of height 1 on the far rim lifts its head to about 6, and the beat ring's near ticks lie
 * at 62. D-058 polish: at 39 with a 60 degree view (9 to 69) the tall far plants ran off the top; 34 with
 * WINDOW_FOV_DEG 64 shows 2 to 66, four degrees clear of both (tests/unit/window/WindowStage.test.ts).
 */
export const WINDOW_PITCH_RAD = (34 * Math.PI) / 180;
/**
 * FR-SYS-07: the camera's vertical field of view, degrees. Not the project's 50: at 50 a 4:3 tab cuts the bed's
 * sides off, and the seed's rest spot beside the bed is out of view at 16:9. 64, from 60, with WINDOW_PITCH_RAD.
 */
export const WINDOW_FOV_DEG = 64;
/**
 * FR-SYS-07: the narrowest horizontal field of view, degrees. A narrow (portrait) tab widens the vertical one until
 * the horizontal one is this: the rest spot is 35 degrees to the side, the bed's outer ring 32.
 */
export const WINDOW_MIN_HFOV_DEG = 76;
/**
 * LLD §11: where the pointer's seed waits (before the first pointer event, and while the pointer is on another
 * target): bed-local +x (the user's right) this far from the centre, 6 cm beyond the bed's outer ring.
 */
export const REST_SPOT_X_M = 0.36;
/** FR-SYS-07: the virtual table under the bed, in metres. Wide enough for the rest spot. */
export const TABLE_WIDTH_M = 0.9;
export const TABLE_DEPTH_M = 0.8;
export const TABLE_THICKNESS_M = 0.03;
/** The table's top lies this far below the bed plane, so the bed's own drawing never fights it for depth. */
export const TABLE_GAP_M = 0.002;
/** The table's colour (sRGB): a dark wood, under the glowing plants. */
export const TABLE_COLOUR = 0x3b2f27;
/**
 * D-058 polish: a floor under the table, so the window shows a room and not a slab in the void. A square this wide,
 * this far under the bed plane (a seated table's height), in the landing page's charcoal family (sRGB). From the
 * eye its far edge lies 1.4 degrees below level, above the view's top (2 degrees, WINDOW_PITCH_RAD): no void shows.
 */
export const FLOOR_SIZE_M = 80;
export const FLOOR_BELOW_BED_M = 0.7;
export const FLOOR_COLOUR = 0x1c2026;
/**
 * LLD §11: the pointer events that wait for a sample. A move after a move replaces it, so only button changes
 * take room: 32 holds 16 clicks between two frames.
 */
export const POINTER_QUEUE_SIZE = 32;
