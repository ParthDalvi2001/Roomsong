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
export const MOSS = 0x7dd181;
export const VIOLET = 0x9b5de5;
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
/** D-058 polish: at 0.3 the 80 markers read as a grid of targets over the ring lines; quieter at rest, the hover
 *  cue (MARKER_HOVER_ALPHA) stands out more. Not lower: the level-3 ghost fades them out at the cue's rate, and
 *  from 0.25 that fade still lasts two 72 Hz frames (UX §9.2: a fade, never a cut). */
export const MARKER_ALPHA = 0.25;
/** FR-HND-16, chosen in T-119: the marker of the cell a release will land on is drawn this strong: the cue. */
export const MARKER_HOVER_ALPHA = 1;
/** UX §5: a hover cue moves between rest and hover over this long, in and out (FR-HND-16). */
export const HOVER_CUE_MS = 100;
/** Chosen in T-125: what lies flat on the bed is drawn this far above it, so nothing fights for depth. */
export const BED_LAYER_M = 0.001;
/** Chosen in T-125: straight edges around the glass, and around one marker. */
export const BED_SEGMENTS = 64;
export const MARKER_SEGMENTS = 20;

/** FR-MUS-03, UX §9.4: the tide's light ramps up over one full step ahead of the crest and trails three steps behind
 *  it (UX §8: the glow ramps, never strobes); TIDE_PEAK is its additive strength. D-060 (8): the softer wedge, peak
 *  0.45 over a one-step lead (T-125 had 0.7 over half a step). A plant's own glow ramps over the same lead. */
export const TIDE_LEAD_STEPS = 1;
export const TIDE_TRAIL_STEPS = 3;
export const TIDE_PEAK = 0.45;
/** Chosen in T-125: the wedge has this many rows of vertices per step, and its light falls off as this power
 *  of the straight ramp (2 = a soft tail). */
export const TIDE_SEGMENTS_PER_STEP = 4;
export const TIDE_FALLOFF_POWER = 2;
/** FR-UI-11, chosen in T-125: the wedge takes this long to fade in when a tide starts and out when it stops. */
export const TIDE_FADE_MS = 300;
/** UX §9.4: a shade of the bed's charcoal leads the crest, so the sweep shows on a bright table. It begins this
 *  many steps ahead of the crest, covers this much where the light begins (TIDE_LEAD_STEPS ahead), and is gone
 *  on the crest. Half a step beyond the light, as before D-060: at the light's own lead its ramp would be empty. */
export const TIDE_SHADE_STEPS = TIDE_LEAD_STEPS + 0.5;
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
/** UX §5, ART_PASS_T163 §0 option A (D-060): a plant's hue 0..1 is a place on the arc from gold (47°) through moss
 *  and ice to violet (267°); a room turns the arc by up to ±PALETTE_SHIFT_MAX_DEG and nudges the saturation by
 *  ±PALETTE_SAT_STEP, both from its signature's paletteSeed (render/palette.ts). ±15°, not §0's ±30°: every room
 *  stays on 32°–282°, short of coral (17°) and magenta (297°), the promise of no pinks or reds (D-060 review). */
export const PALETTE_ARC_START_DEG = 47;
export const PALETTE_ARC_SPAN_DEG = 220;
export const PALETTE_SHIFT_MAX_DEG = 15;
export const PALETTE_SAT_STEP = 0.06;
/** Chosen in T-125 (UX §5: glass-like, soft glow): a plant is this dark at its foot, full at its head, and
 *  this much brighter where its surface turns away from the eye. No light is involved (NFR-PERF-09). */
export const PLANT_FOOT_SHADE = 0.45;
export const PLANT_RIM_GLOW = 0.6;
/** T-163 (ART_PASS §2.2): the head is the light. A stem row's shade rises with its share of the stem up to this
 *  (0.81 at the stem's top); every head and whorl row is at full, whatever the plant's height. */
export const PLANT_STEM_GLOW = 0.65;
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
/** T-163 (ART_PASS §2.4): each whorl's turn about the stem; the upper one by half a leaf, so from above the two
 *  make one rosette of eight leaves. */
export const PLANT_WHORL_TURN_RAD = [0, Math.PI / 4] as const;
export const PLANT_BLOSSOM_WIDTH = 1.3;
export const PLANT_BLOSSOM_LIGHTNESS = 0.75;
/** Chosen in T-119: how far a whorl is pressed in between its four leaves, as a share of its radius. At
 *  PLANT_LOBE_DEPTH a ring of four leaves on eight segments is exactly a square; at this it has four points. */
export const PLANT_WHORL_LOBE_DEPTH = 0.6;
/** UX §5 and §9.6: a plant that grew unfurls over this long (ease-out) on its first note of the session; one
 *  that no crest has reached after the wait unfurls then. */
export const PLANT_BLOOM_MS = 600;
export const PLANT_BLOOM_WAIT_MS = 10_000;
/** FR-UI-05 (outlines on all targets), T-163 (ART_PASS §2.8): in high contrast a cream shell this thick round each
 *  plant's silhouette (about 3.6 px at 0.6 m), at one strength whatever the plant does: it cannot flash. BUG-008:
 *  the same round the seeds, the Listen orb and the undo petal. */
export const PLANT_OUTLINE_M = 0.0015;
/** UX §5 (idle sway 0.2 Hz), T-163 (ART_PASS §2.7): every plant leans about its foot along the bed's x by this
 *  share of each point's height above the foot (3.4 degrees: 0.4 cm at the head of a 3 cm stem, 1.1 cm on the
 *  tallest), half that under reduced motion; the phase runs across the bed's diagonal in waves this long. The foot
 *  never moves, so no target does. */
export const PLANT_SWAY_HZ = 0.2;
export const PLANT_SWAY_LEAN = 0.06;
export const PLANT_SWAY_LEAN_REDUCED = PLANT_SWAY_LEAN / 2;
export const PLANT_SWAY_WAVE_M = 0.6;

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

/** FR-ROOM-12, LLD §5.8: the tuning ripple, timed from the frame of room:features (the bed placed). The sweeps of
 *  the table (in a Wanderer session: the bed), the nearest wall and the ceiling start at these times and run this
 *  long; room:tuned is emitted at RIPPLE_TUNED_MS. Each caption is up from its sweep's start to the next one's. */
export const RIPPLE_SWEEP_AT_MS = [300, 1500, 2700] as const;
export const RIPPLE_SWEEP_MS = [600, 1000, 800] as const;
export const RIPPLE_TUNED_MS = 4000;
/** UX §5: the crest is 3 to 5 cm wide, and each point it passed glows for this long after it. */
export const RIPPLE_CREST_M = 0.04;
export const RIPPLE_AFTERGLOW_MS = 1000;
/** UX §5, FR-UI-06: under reduced motion each surface glows this long in turn, with no sweep. */
export const RIPPLE_GLOW_MS = 400;
/** Chosen in T-142, as the tide's shade (UX §9.4): a band of the bed's charcoal leads the crest, so it reads on a
 *  light surface. It begins this far ahead of the crest's middle and is fullest (TIDE_SHADE_COVER) where the
 *  crest's light begins. */
export const RIPPLE_SHADE_M = 0.06;
/** Chosen in T-142: the afterglow's light right behind the crest, and the cover it carries there, so the glow
 *  tints a light surface too (light alone adds nothing to a white table). */
export const RIPPLE_AFTERGLOW = 0.4;
export const RIPPLE_AFTERGLOW_COVER = 0.3;
/** UX §3.5: the scene goes over into Listen mode in 1.2 s and comes back from it in 0.8 s. */
export const LISTEN_ENTER_MS = 1200;
export const LISTEN_EXIT_MS = 800;
/** UX §3.5: in Listen, passthrough dims to 40 % behind a dark see-through dome, never fully hidden. Chosen in
 *  T-148: the dome is a sphere this wide around the bed's centre, so a seated or standing head at the table is in
 *  it, of this many faces (it is one flat colour), drawn before everything else that is see-through. */
export const DOME_DIM = 0.6;
/** FR-UI-05 (BUG-008): high contrast dims the background to 60 % with the same dome, at all times. In Listen the
 *  deeper of the two dims holds; they never multiply (40 %, not 24 %). */
export const CONTRAST_DIM = 0.4;
export const DOME_RADIUS_M = 2;
export const DOME_DETAIL = 1;
export const DOME_RENDER_ORDER = -1;
/** FR-ROOM-04, UX §3.5, chosen in T-148: the aurora halo is a curtain of light round the bed's rim, from this far
 *  above the glass up this high, strongest at its foot, of this many sides and this additive strength. It rises:
 *  its height grows with the fade in (reduced motion: it fades in at full height). */
export const HALO_LIFT_M = 0.02;
export const HALO_HEIGHT_M = 0.22;
export const HALO_SEGMENTS = 48;
export const HALO_PEAK = 0.9;
/** PRD §3.4 ("pulsing with the music"), UX §5 (the flash cap): the halo breathes between full and this share of
 *  its brightness (a swing of 0.25: two changes a breath) once every this many beats, at every tempo. Not UX §5's
 *  "every beat up to 90 BPM": the guard times a swing from its last movement (T-119), so a smooth breath on every
 *  beat was held still in 39 % of frames at 84 BPM and 63 % at 90 (measured in T-148). Every second beat is never
 *  held, 60 to 120 BPM. Chosen in T-148: its folds drift round the bed once in HALO_DRIFT_MS (whole cycles of
 *  it, so the drift has no seam), slower than 0.1 Hz at any point. */
export const HALO_LOW = 0.75;
export const HALO_BEATS_PER_BREATH = 2;
export const HALO_DRIFT_MS = 60_000;
/**
 * P-016 (T-173): a still head facing the bed opens the garden: the halo lit this much of the way from where Listen
 * has it (0 outside Listen) to 1, glided in and out over STILL_RAMP_MS: one slow swing each way, never a blink
 * (FR-UI-11). Provisional until a headset look.
 */
export const STILL_HALO = 0.25;
export const STILL_RAMP_MS = 2000;
/** UX §2 (the Listen orb glows in the bed's centre hole), chosen in T-148: this far above the glass, as wide as a
 *  target, under the supply orb's ring (10 cm up, T-127; not a target). Its pinch target is `orb` / this id. It is
 *  drawn at a plant's rest brightness, lifted as a plant is when hovered, and at full in Listen. */
export const LISTEN_ORB_LIFT_M = 0.02;
export const LISTEN_ORB_ID = 'listen';
export const LISTEN_ORB_DETAIL = 2;
/** UX §3.5: the 10-minute end shows "Goodnight". Chosen in T-148: as long as the wiring's own captions. */
export const GOODNIGHT_CAPTION_MS = 5000;

/** FR-HND-04: a seed is drawn as wide as a target, in the orb and on a hand alike; a sphere of 320 triangles
 *  (D-058 polish: at 80 its unlit flat colour showed a faceted, jaggy outline on the pictures; the same count
 *  for the Listen orb). */
export const SEED_DIAMETER_M = TARGET_VISIBLE_DIAMETER_M;
export const SEED_DETAIL = 2;
/** UX §7 (the supply orb, FR-MUS-08), chosen in T-127: the waiting seeds hang on a ring this wide, this high over
 *  the bed's centre hole, one place per seed of the supply: the count is the seeds there. Inside the view box
 *  whenever the bed is (NFR-FOV-01); not a target, so it takes no reach and no pinch from the Listen orb below. */
export const SUPPLY_ORB_LIFT_M = 0.1;
export const SUPPLY_ORB_RADIUS_M = 0.03;
/** Chosen in T-127: a seed waits at a plant's rest brightness and is lit while it is out on a hand. BUG-007: lit
 *  so that a hover's PLANT_HOVER_LIFT takes it to full (UX §9.1), not full already, where the glow could not show. */
export const SEED_OUT_BRIGHTNESS = 1 / (1 + PLANT_HOVER_LIFT);
/** UX §3.3 ("seed glides to palm"), chosen in T-127: a seed's way between the orb and a hand, ease-out. UX §9.1:
 *  its hop from the palm to the pinch point that took it. */
export const SEED_GLIDE_MS = 300;
export const SEED_HOP_MS = 100;
/** UX §7, chosen in T-127: a seed let go off the bed hops this high on its way back to the orb; UX §5: reduced
 *  motion halves the amplitude. */
export const SEED_BUMP_M = 0.03;
export const SEED_BUMP_REDUCED_M = SEED_BUMP_M / 2;
/** UX §7: "Garden full. Remove a plant first." when a seed is let go over a full bed. Chosen in T-127: up this long (core's clock). */
export const GARDEN_FULL_CAPTION_MS = 3000;

/** FR-ROOM-04 (Could C4, D-021, T-149): the vine on the nearest wall. A wall farther than this from the bed's
 *  centre gets none. The vine is VINE_SEGMENTS pieces of VINE_SEGMENT_M, so a full bed (PLANT_CAPACITY plants)
 *  grows 1.2 m; it sways this far sideways on its way up. UX §3.5: the whole length grows in 6 s; FR-UI-06: under
 *  reduced motion it fades in over VINE_FADE_MS instead of growing. */
export const VINE_WALL_MAX_M = 1.5;
export const VINE_SEGMENTS = 48;
export const VINE_SEGMENT_M = 0.025;
export const VINE_RADIUS_M = 0.008;
export const VINE_SWAY_M = 0.06;
export const VINE_GROW_MS = 6000;
export const VINE_FADE_MS = 400;
