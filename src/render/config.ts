// Named constants of render/ (CODING_GUIDELINES §4). Each cites the requirement it comes from. Colours are the
// fixed palette of UX_WIREFRAMES §5; sizes the documents do not give are marked "chosen in T-125".
import { RINGS, STEPS } from '../garden/index.js';
import { TARGET_VISIBLE_DIAMETER_M } from '../hands/index.js';

/** FR-UI-11 (API_SPEC §1.8): luminance changes of one element in any 1 s window. */
export const FLASH_CAP_PER_S = 3;
/** FR-UI-11 (API_SPEC §1.8): a brightness swing smaller than this share of full scale is not a change. */
export const FLASH_MIN_DELTA = 0.1;
/** FR-UI-11: the sliding window the cap is counted over. */
export const FLASH_WINDOW_MS = 1000;

/** NFR-PERF-09: fixed foveated rendering "medium", as WebXRManager.setFoveation takes it (0 none .. 1 high). */
export const FOVEATION_MEDIUM = 2 / 3;
/** NFR-PERF-03/04/05: one `perf:sample` per this many milliseconds. */
export const PERF_SAMPLE_MS = 1000;
/** Perf HUD panel (flag perfHud), chosen in T-125: its size in the scene, its canvas in pixels, and the height
 *  of its text as a share of a line. */
export const PERF_HUD_WIDTH_M = 0.16;
export const PERF_HUD_HEIGHT_M = 0.08;
export const PERF_HUD_PX_PER_M = 1600;
export const PERF_HUD_TEXT_SHARE = 0.7;
/** Where the app shows the panel, from the head (x right, y up, -z ahead), chosen in T-128a: 0.5 m ahead, low and
 *  left, its far edges 19.8 degrees to the side and 18.3 down, inside the view box of NFR-FOV-01 (25 by 20). */
export const PERF_HUD_HEAD_OFFSET_M = [-0.1, -0.125, -0.5] as const;

/** UX §5 palette. */
export const CREAM = 0xfff8e7;
export const ICE = 0x48cae4;
/** UX §5: the bed base is charcoal glass at 40 % alpha, so passthrough stays visible. */
export const BED_BASE_COLOUR = 0x141a1f;
export const BED_BASE_ALPHA = 0.4;
/** FR-HND-04: a cell marker is drawn as wide as a target, 2.5 cm, the size of a plant's foot. */
export const MARKER_RADIUS_M = TARGET_VISIBLE_DIAMETER_M / 2;
/** UX §2: the glass reaches one marker radius past ring 0 and ring 4, so their markers sit on it. A visual rim
 *  only: nothing is planted or picked there. */
export const BED_RIM_M = MARKER_RADIUS_M;
/** Chosen in T-125: width and strength of the five ring guide lines and of a cell marker's outline. */
export const GUIDE_LINE_M = 0.0012;
export const GUIDE_LINE_ALPHA = 0.5;
export const MARKER_LINE_M = 0.002;
export const MARKER_ALPHA = 0.3;
/** Chosen in T-125: what lies flat on the bed is drawn this far above it, so nothing fights for depth. */
export const BED_LAYER_M = 0.001;
/** Chosen in T-125: straight edges around the glass, and around one marker. */
export const BED_SEGMENTS = 64;
export const MARKER_SEGMENTS = 20;

/** FR-MUS-03: the tide's light. Chosen in T-125: it ramps up over half a step ahead of the crest and trails
 *  three steps behind it (UX §8: the glow ramps, never strobes); TIDE_PEAK is its additive strength. */
export const TIDE_LEAD_STEPS = 0.5;
export const TIDE_TRAIL_STEPS = 3;
export const TIDE_PEAK = 0.7;
/** Chosen in T-125: the wedge has this many rows of vertices per step, and its light falls off as this power
 *  of the straight ramp (2 = a soft tail). */
export const TIDE_SEGMENTS_PER_STEP = 4;
export const TIDE_FALLOFF_POWER = 2;
/** FR-UI-11, chosen in T-125: the wedge takes this long to fade in when a tide starts and out when it stops. */
export const TIDE_FADE_MS = 300;

/** FR-MUS-01: one plant per cell at most, so 80 instances per silhouette is the worst case. */
export const PLANT_CAPACITY = RINGS * STEPS;
/** Chosen in T-125: the stem a plant of height 0 and of height 1 stands on, in metres (UX §5: height stretches). */
export const PLANT_STEM_MIN_M = 0.03;
export const PLANT_STEM_MAX_M = 0.14;
/** Chosen in T-125: the stem the outlines are turned at (so the lathe's normals are those of a real plant), and
 *  how far a lobed head is pressed in between two petals, as a share of its radius. */
export const PLANT_REFERENCE_STEM_M = 0.1;
export const PLANT_LOBE_DEPTH = 0.3;
/** Chosen in T-125: a plant's colour is its hue at the palette's saturation and lightness, in sRGB (UX §5). */
export const PLANT_SATURATION = 0.72;
export const PLANT_LIGHTNESS = 0.63;
/** Chosen in T-125 (UX §5: glass-like, soft glow): a plant is this dark at its foot, full at its head, and
 *  this much brighter where its surface turns away from the eye. No light is involved (NFR-PERF-09). */
export const PLANT_FOOT_SHADE = 0.45;
export const PLANT_RIM_GLOW = 0.6;
/** FR-UI-07: a plant's brightness at rest, and when the tide triggers it. One flash is two changes per bar. */
export const PLANT_REST_BRIGHTNESS = 0.7;
export const PLANT_FLASH_BRIGHTNESS = 1;

/** Radians per step: step s sits at angle s * STEP_RAD from +x toward +z (D-029). */
export const STEP_RAD = (2 * Math.PI) / STEPS;
