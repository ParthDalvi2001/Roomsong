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
/** FR-HND-16, chosen in T-119: the marker of the cell a release will land on is drawn this strong: the cue. */
export const MARKER_HOVER_ALPHA = 1;
/** UX §5: a hover cue moves between rest and hover over this long, in and out (FR-HND-16). */
export const HOVER_CUE_MS = 100;
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
/** UX §9.4: a shade of the bed's charcoal leads the crest, so the sweep shows on a bright table. It begins this
 *  many steps ahead of the crest, covers this much where the light begins (TIDE_LEAD_STEPS ahead), and is gone
 *  on the crest. */
export const TIDE_SHADE_STEPS = 1;
export const TIDE_SHADE_COVER = 0.6;

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
/** FR-HND-15, UX §3.4: the plant a lost hand held is drawn at this share of its brightness, in one step, and is
 *  back at full this long after the hand is seen again or the hint's time is up (D-030). */
export const PLANT_TINT_BRIGHTNESS = 0.5;
export const PLANT_TINT_BACK_MS = 100;
/** FR-HND-16, UX §3.4: the plant an empty hand hovers is drawn this much brighter (20 %), over HOVER_CUE_MS. */
export const PLANT_HOVER_LIFT = 0.2;
/** FR-MUS-09, UX §9.6: a plant's age is counted in leaf whorls on its stem, one from stage 1 and two from stage
 *  2, at these shares of the stem's height. At stage 3 they open into cream blossoms this many times as wide
 *  (3.1 cm for 2.4), and the plant's colour takes this lightness in place of PLANT_LIGHTNESS. */
export const PLANT_WHORL_AT = [0.4, 0.6] as const;
export const PLANT_BLOSSOM_WIDTH = 1.3;
export const PLANT_BLOSSOM_LIGHTNESS = 0.75;
/** Chosen in T-119: how far a whorl is pressed in between its four leaves, as a share of its radius. At
 *  PLANT_LOBE_DEPTH a ring of four leaves on eight segments is exactly a square; at this it has four points. */
export const PLANT_WHORL_LOBE_DEPTH = 0.6;
/** UX §5 and §9.6: a plant that grew unfurls over this long (ease-out) on its first note of the session; one
 *  that no crest has reached after the wait unfurls then. */
export const PLANT_BLOOM_MS = 600;
export const PLANT_BLOOM_WAIT_MS = 10_000;
/** FR-UI-05 (outlines on all targets), chosen in T-119: in high contrast a plant's surface turns cream where it
 *  turns away from the eye: from the first number on (0 = facing the eye, 1 = edge on), fully at the second. */
export const PLANT_OUTLINE_FROM = 0.55;
export const PLANT_OUTLINE_FULL = 0.75;

/** UX §3.4 (pinch on a plant): the plant a hand holds is drawn this much higher, and glows by PLANT_HOVER_LIFT for
 *  as long as it is held. Every jump of a held plant's place or stem (the lift, the pull or drag deciding, the
 *  release, the tracking loss) is eased over hands' REVERT_LERP_MS (150 ms, ease-out; UX §3.4, §5). */
export const PLANT_PINCH_LIFT_M = 0.01;
/** Chosen in T-147: a plant faces out of the bed from where it is drawn, except nearer the centre than this, where
 *  that way is not defined and it keeps its cell's. */
export const PLANT_TURN_MIN_R_M = 0.01;
/** UX §3.4 (drag): past the bed's outer edge the plant under the hand fades to this share of its brightness, over
 *  HOVER_CUE_MS, a level: removal ahead. Chosen in T-147. */
export const PLANT_OFF_BED_BRIGHTNESS = 0.5;
/** UX §3.4 (pull), chosen in T-147: the scale ladder is a faint cream ring round the pulled plant at each of
 *  LADDER_MARKS heights, where its stem would end at height 0, 1/4, 1/2, 3/4 and 1 (FR-HND-08: 25 cm of travel is
 *  the whole range, so a mark is 6.25 cm of hand). Each ring is this wide across, this thick and this opaque. */
export const LADDER_MARKS = 5;
export const LADDER_RADIUS_M = 0.025;
export const LADDER_LINE_M = 0.0015;
export const LADDER_ALPHA = 0.35;
/** UX §3.4 (drag), chosen in T-147: while a dragged plant is past the outer edge the rim dims to warn: a charcoal
 *  band this wide just outside the glass, at this opacity. */
export const RIM_WARN_WIDTH_M = 0.01;
export const RIM_WARN_ALPHA = 0.6;
/** Chosen in T-147: the ladder's rings and the rim are round to this many edges. */
export const GUIDE_SEGMENTS = 48;

/** UX §5 (remove burst 0.4 s) and §9.3: the plant dissolves into this many petals at the release point, which drift
 *  to its cell over BURST_MS (ease-out); the undo petal is one of them and stays, the others shrink to nothing
 *  on the way. Each starts this far from the release point and this wide. Particles are pooled: BURST_POOL at most
 *  at once, a new burst taking the oldest. Chosen in T-147, except the 400 ms. */
export const BURST_PETALS = 6;
export const BURST_MS = 400;
export const BURST_SPREAD_M = 0.02;
export const BURST_PETAL_DIAMETER_M = 0.015;
export const BURST_POOL = 3 * (BURST_PETALS - 1);
/** UX §9.3, reduced motion: no burst and no drift; the petal fades in at its cell over this long. */
export const PETAL_FADE_IN_MS = 150;

/** Radians per step: step s sits at angle s * STEP_RAD from +x toward +z (D-029). */
export const STEP_RAD = (2 * Math.PI) / STEPS;

/** UX §9.3, FR-MUS-12: the undo petal waits this far above the removed plant's own cell; it is drawn this wide
 *  when the plant goes and this wide when its 5 s are over, shrinking in a straight line; and it fades out over
 *  its last 300 ms, its one luminance change. Its brightness until then is a plant's at rest. */
export const PETAL_LIFT_M = 0.03;
export const PETAL_START_DIAMETER_M = 0.025;
export const PETAL_END_DIAMETER_M = 0.01;
export const PETAL_FADE_MS = 300;
/** Chosen in T-146: a petal is an oval this much narrower than it is long, with this many edges. */
export const PETAL_ASPECT = 0.6;
export const PETAL_SEGMENTS = 12;

/** FR-HND-04: a seed is drawn as wide as a target, in the orb and on a hand alike; a sphere of 80 triangles. */
export const SEED_DIAMETER_M = TARGET_VISIBLE_DIAMETER_M;
export const SEED_DETAIL = 1;
/** UX §7 (the supply orb, FR-MUS-08), chosen in T-127: the waiting seeds hang on a ring this wide, this high over
 *  the bed's centre hole, one place per seed of the supply: the count is the seeds there. Inside the view box
 *  whenever the bed is (NFR-FOV-01); not a target, so it takes no reach and no pinch from the Listen orb below. */
export const SUPPLY_ORB_LIFT_M = 0.1;
export const SUPPLY_ORB_RADIUS_M = 0.03;
/** Chosen in T-127: a seed waits at a plant's rest brightness and is lit full while it is out on a hand. */
export const SEED_OUT_BRIGHTNESS = 1;
/** UX §3.3 ("seed glides to palm"), chosen in T-127: a seed's way between the orb and a hand, ease-out. UX §9.1:
 *  its hop from the palm to the pinch point that took it. */
export const SEED_GLIDE_MS = 300;
export const SEED_HOP_MS = 100;
/** UX §7, chosen in T-127: a seed let go off the bed hops this high on its way back to the orb; UX §5: reduced
 *  motion halves the amplitude. */
export const SEED_BUMP_M = 0.03;
export const SEED_BUMP_REDUCED_M = SEED_BUMP_M / 2;
/** UX §7: "Garden is full" when a seed is let go over a full bed. Chosen in T-127: up this long (core's clock). */
export const GARDEN_FULL_CAPTION_MS = 3000;
