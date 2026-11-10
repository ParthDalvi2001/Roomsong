// Named constants of ui/ (CODING_GUIDELINES §4). Each cites the requirement it comes from.
import type { Cell } from '../garden/index.js';

/** FR-UI-03, NFR-FOV-01: essential UI stays within this many degrees of the forward gaze, to each side and up or down. */
export const FOV_HALF_H_DEG = 25;
export const FOV_HALF_V_DEG = 20;

/** FR-UI-01: a caption has at most this many words (tuning-ripple captions have their own, smaller limits in core/). */
export const CAPTION_MAX_WORDS = 6;
/** UX §3.3: a caption is drawn this far ahead of the head, and this far below the gaze line ("slightly below"). */
export const CAPTION_DISTANCE_M = 0.6;
export const CAPTION_BELOW_GAZE_DEG = 8;
/** FR-SYS-07 (the garden window, UX §3.7): the window's camera line runs 10 degrees above the bed's centre, so 8
 *  degrees below it is the guide cell and its hint (T-150), and the caption covered them. In the window a caption
 *  sits this far below the camera line instead: a subtitle over the bed's near rim, inside the view box
 *  (NFR-FOV-01: 20 degrees less the quad's 2.4). A session keeps CAPTION_BELOW_GAZE_DEG. */
export const CAPTION_BELOW_CAMERA_WINDOW_DEG = 17;
/**
 * The caption's quad. UX §5 asks for a 1.6 cm cap height at 0.6 m (FR-UI-04: at least 1.4 cm): the font is 0.44 of
 * the quad's height and a sans-serif capital is about 0.72 of its font size, so 0.05 m gives 1.6 cm.
 * 0.40 m wide holds about 30 characters at that size; a longer text is squeezed to fit, never cut.
 */
export const CAPTION_WIDTH_M = 0.4;
export const CAPTION_HEIGHT_M = 0.05;
/** Canvas pixels of the quad: about one per display pixel at 0.6 m on a Quest 3 (25 px per degree). Powers of two. */
export const CAPTION_CANVAS_W = 1024;
export const CAPTION_CANVAS_H = 128;
export const CAPTION_FONT_PX = 56;
/** UX §5: one sans-serif, the system's. No web font (Golden Rules 8 and 9). */
export const CAPTION_FONT = `600 ${CAPTION_FONT_PX}px system-ui, sans-serif`;
/**
 * UX §5 palette: cream text on charcoal glass at 0.9 alpha (NFR-ACC-01: at least 4.5:1). Over a white wall, the worst
 * case, that is 12.4:1 if the compositor blends the encoded values and 6.2:1 if it blends in linear light; over black
 * it is 17:1 either way. Which blend a headset uses, and how passthrough reads behind it, is unverified on device.
 */
export const CAPTION_TEXT_COLOUR = '#FFF8E7';
export const CAPTION_BACKDROP = 'rgba(20, 26, 31, 0.9)';
/** FR-UI-05: high contrast is cream on opaque black (19:1; at least 7:1) with an outline. */
export const CAPTION_BACKDROP_HIGH_CONTRAST = '#000000';
export const CAPTION_OUTLINE_PX = 4;
/**
 * BUG-056, the quiet notice ("No seeds left. More tomorrow."): a smaller pill whose backdrop lets 60 % of the room
 * through. The words stay solid, with a charcoal edge around each letter, because cream on that glass over a white
 * wall is 1.3:1 and the edge is what keeps NFR-ACC-01's 4.5:1 (cream on charcoal, 17:1). 0.875 is the smallest
 * FR-UI-04 allows: a 1.4 cm cap height at 0.6 m. In high contrast it is drawn as every caption is: opaque black.
 * It sits above the gaze line, at the top of the view box (16 degrees up, its upper edge at 18.1 of NFR-FOV-01's
 * 20), not below it where the ring and its plants are. None of this was seen on a headset.
 */
export const CAPTION_BACKDROP_QUIET = 'rgba(20, 26, 31, 0.4)';
export const CAPTION_QUIET_SCALE = 0.875;
export const CAPTION_QUIET_ABOVE_GAZE_DEG = 16;
export const CAPTION_QUIET_EDGE_COLOUR = '#141A1F';
export const CAPTION_QUIET_EDGE_PX = 8;
/** Drawn after the garden and without a depth test: a caption is never hidden inside a plant. */
export const CAPTION_RENDER_ORDER = 1000;

// The settings panel (T-151, UX §3.6). Drawn like a caption: text on a canvas, on one quad in the scene.

/**
 * UX §3.6: the panel opens 0.55 m ahead of the head. 10 Nov (Parth: "make it systematic"): 0.48 by 0.39 m, was 0.40
 * by 0.28, for a grid of a header, the description row and five rows (ui/Panel.ts) with PANEL_PAD_M all round. At
 * 0.55 m that is 23.6 degrees either side and 19.5 up and down, inside the FoV box of 25 by 20 (Golden Rule 6).
 */
export const PANEL_WIDTH_M = 0.48;
export const PANEL_HEIGHT_M = 0.39;
/** The even padding inside the panel's edge, and its corner radius is the controls' own (PANEL_TARGET_M / 2). */
export const PANEL_PAD_M = 0.01;
export const PANEL_DISTANCE_M = 0.55;
/** Canvas pixels per metre: 1000 by 700, about one per display pixel at 0.55 m on a Quest 3 (25 px per degree). */
export const PANEL_PX_PER_M = 2500;
/** FR-UI-04: a cap height of at least 1.4 cm. A sans-serif capital is about 0.72 of its font size: 50 px is 1.44 cm. */
export const PANEL_FONT_PX = 50;
// 10 Nov: labels in the regular weight; read-outs, the chosen option, a switch that is on and the primary button bold.
export const PANEL_FONT = `400 ${PANEL_FONT_PX}px system-ui, sans-serif`;
export const PANEL_BOLD_FONT = `700 ${PANEL_FONT_PX}px system-ui, sans-serif`;
/** A control that holds one character (+, -, x, L, R) shows it larger. */
export const PANEL_SYMBOL_FONT = '700 70px system-ui, sans-serif';
/**
 * T-151, Golden Rule 3: a control is drawn 4 cm tall (UX §3.6 asks for 3 at least) and picked within the hit
 * radius of FR-HND-04 (4.0 cm, hands/config.ts). One that holds a word is 8 cm wide, which that radius covers.
 */
export const PANEL_TARGET_M = 0.04;
export const PANEL_WIDE_TARGET_M = 0.08;
/** T-151 ("clear gaps"): the centres of two controls are at least this far apart, so 1.5 cm lies between them. */
export const PANEL_TARGET_PITCH_M = 0.055;
/**
 * A control at its limit, and the echo read-out while it is not in effect, are drawn this faint: normal and high
 * contrast. Still readable: cream at 0.55 on the charcoal backdrop is 5.6:1 (NFR-ACC-01 asks 4.5:1) and at 0.75 on
 * black it is 10.6:1 (FR-UI-05 asks 7:1); tests/unit/ui/PanelSystem.test.ts works both out.
 */
export const PANEL_DIM_ALPHA = 0.55;
export const PANEL_DIM_ALPHA_HIGH_CONTRAST = 0.75;
/** 10 Nov: the description row's ink, a little dimmer than a label's (over 4.5:1, tested); full in high contrast. */
export const PANEL_DESCRIBE_ALPHA = 0.8;
/** FR-UI-05: the outline of a control, in canvas pixels: normal and high contrast. */
export const PANEL_OUTLINE_PX = 3;
export const PANEL_OUTLINE_HIGH_CONTRAST_PX = 6;
/** UX §5 palette: a control that is off is a faint cream glass; the text on one that is on is the charcoal. */
export const PANEL_TARGET_FILL = 'rgba(255, 248, 231, 0.12)';
export const PANEL_INK = '#141A1F';
/**
 * 10 Nov, the board's look: the accent (the ice of the UX §5 palette) fills a switch that is on, the chosen tab or
 * option and the primary button, with PANEL_INK on it (9.1:1; 12:1 for the high-contrast twin). The warm red outlines
 * New garden and fills its hold ring: 3:1 or better against the cream ring, the charcoal and the black it lies on.
 * The thin rule under the header is cream at PANEL_RULE_ALPHA, opaque in high contrast. tests/unit/ui/PanelSystem.test.ts
 * works the ratios out.
 */
export const PANEL_ACCENT = '#48CAE4';
export const PANEL_ACCENT_HIGH_CONTRAST = '#8FE3F2';
export const PANEL_DANGER = '#E5484D';
export const PANEL_DANGER_HIGH_CONTRAST = '#F2555A';
export const PANEL_RULE_ALPHA = 0.35;
/**
 * UX §3.6 ("a control lights up on hover"): a cream ring round the control, from 2 to 6 mm outside it. High contrast
 * asks for an outline as well as a glow (UX §8): the ring is an outline.
 */
export const CUE_RING_INNER_M = PANEL_TARGET_M / 2 + 0.002;
export const CUE_RING_OUTER_M = PANEL_TARGET_M / 2 + 0.006;
/**
 * UX §8 ("dwell ring fills"), T-151 (the hold): the same ring, filling from the top in this many steps, in the
 * violet of the UX §5 palette. It lies on the cream ring and the backdrop, never on the control's own word: 3.9:1
 * against the cream, 4.2:1 against the charcoal; tests/unit/ui/PanelSystem.test.ts works both out.
 */
export const CUE_FILL_COLOUR = '#9B5DE5';
export const CUE_SEGMENTS = 48;
/** UX §3.6: one press moves the tempo by 4 BPM and the volume by 10 %. */
export const TEMPO_STEP_BPM = 4;
export const VOLUME_STEP = 0.1;
/** FR-UI-10: one press moves the bed by 2 cm, twenty presses from end to end. No requirement fixes the step. */
export const BED_HEIGHT_STEP_M = 0.02;
/**
 * T-151: New garden acts only when the pinch was held on it this long (in gaze mode: the look, after the dwell).
 * No requirement fixes the time; 1.5 s is the hold of the Listen pose (FR-HND-09).
 */
export const NEW_GARDEN_HOLD_MS = 1500;
/** UX §3.6: the panel closes when its centre has been outside the FoV box for this long. */
export const PANEL_LOOK_AWAY_MS = 5000;
/** A frame counts as this long at most: a pause must not finish a hold, a dwell or the look-away time. */
export const PANEL_MAX_FRAME_MS = 100;
/**
 * UX §8, §9.8: a gaze dwell holds (it neither grows nor resets) while the head turns faster than this, on the panel
 * and in access/ alike. The speed is smoothed with this time constant. 8 deg/s for a seated head is unverified until
 * the device run (TC-DEV-06, D-048).
 */
export const HEAD_TURN_PAUSE_DEG_PER_S = 8;
export const HEAD_SPEED_SMOOTHING_MS = 100;
/** Under the captions (CAPTION_RENDER_ORDER), above the garden; the hover ring and the fill are drawn over it. */
export const PANEL_RENDER_ORDER = 990;
/**
 * UX §2, §3.6: the panel opens as if the head looked down no more than this. A head that looks at the bed (44
 * degrees down in the seated sketch) would otherwise get the panel on the table, its bottom row among the plants or
 * under the table top; with the limit its lower edge is at most 40 cm below the eyes, and the user looks up to it.
 * 10 Nov: 23, was 30: at 30 the board grown by the description row reached 1 cm under the table top.
 */
export const PANEL_MAX_PITCH_DOWN_DEG = 23;

/** The settings orb (UX §2, §3.6): drawn 4 cm across, picked like every other target. */
export const ORB_DIAMETER_M = 0.04;
export const ORB_CANVAS_PX = 128;
/**
 * UX §2 ("wrist orb"): the orb floats this far behind the palm point, off the back of the hand. The palm point is
 * 3 cm above the palm (hands/config.ts PALM_REST_OFFSET_M); a hand is about 3 cm thick; 3 cm of air. It is 9 cm from
 * a seed resting on the palm, so their hit spheres never claim the same pinch. Unverified on a hand: device check.
 */
export const ORB_OFF_HAND_M = 0.09;
/**
 * FR-UI-09, FR-HND-12: with one hand or the gaze alone the orb cannot ride a hand, so it waits in the view box,
 * this far ahead, to the side of the hand that is not the dominant one, below the gaze line (UX §8 puts the copy
 * of the Listen orb 20 degrees to the dominant side). No requirement fixes the numbers: device check.
 */
export const ORB_DISTANCE_M = 0.45;
export const ORB_SIDE_DEG = 20;
export const ORB_BELOW_GAZE_DEG = 12;
/**
 * D-084: "Skip guide" while the panel is closed, a wide pill waiting like the orb (home, then clamped into the FoV
 * box): this far ahead, to the dominant side, below the gaze. At 0.35 m it spans 9.5 to 22.5 degrees out and 11.7 to
 * 18.3 down: inside the box, under the caption (8 degrees down, 2.4 tall) and, seated over the bed, about 13 cm above
 * its near rim, within reach. While the panel is open it sits in the header instead (Panel.ts SKIP_AT_X). Device check.
 */
// Parth, 10 Nov on the headset: it pulled the eye from the guide. Now the view box's upper corner on the dominant side,
// farther and so smaller: at 0.5 m it spans 14.4 to 23.6 degrees out and 13.7 to 18.3 up (negative = above the gaze),
// clear of the caption, the bed and the hands, and dim until a hand or the gaze is on it.
export const SKIP_DISTANCE_M = 0.5;
export const SKIP_SIDE_DEG = 19;
export const SKIP_BELOW_GAZE_DEG = -16;
/** D-084: "Skip guide" at rest; full while hovered, gazed at or held, and always in high contrast (FR-UI-05). */
export const SKIP_REST_OPACITY = 0.45;
/**
 * D-084: the guide's neon glow on what it points at (the hint ring, the orb, Seeds, Move), in PANEL_ACCENT (its
 * high-contrast twin in high contrast). A slow breath (10 Nov: one a second read as blinking), one per GLOW_PERIOD_MS
 * (FR-UI-11: never more than 3 flashes a second), from GLOW_LOW of the accent to all of it; the settings ring also
 * grows by GLOW_GROW at the peak. Steady at full and at its own size with Reduce motion (UX §8).
 */
export const GLOW_PERIOD_MS = 2400;
export const GLOW_LOW = 0.65;
export const GLOW_GROW = 0.05;

// The hints (T-150, UX §3.3, §3.4): the onboarding icons, the hint ring, the remove arrow and the hand hint. Each is
// a quad of one icon atlas, drawn on a canvas once (UX §1: an icon, never a paragraph; no hand model, D-027).

/** The icon atlas: ATLAS_GRID by ATLAS_GRID cells of ATLAS_CELL_PX. Powers of two. */
export const ATLAS_CELL_PX = 128;
export const ATLAS_GRID = 4;
/** UX §5 palette: cream strokes on a charcoal outline, so every icon is outlined (UX §8, high contrast). */
export const HINT_INK = CAPTION_TEXT_COLOUR;
export const HINT_OUTLINE = 'rgba(20, 26, 31, 0.9)';
/** Under the panel (PANEL_RENDER_ORDER) and the captions, over the garden; no depth test, like a caption. */
export const HINT_RENDER_ORDER = 980;
/**
 * T-150: the one glowing cell the ghost hand pinches over, on the middle ring nearest the seated player (bed-local
 * step 4 is nearest, D-029): the easiest reach for either hand. No requirement fixes the cell.
 */
export const GUIDE_CELL: Readonly<Cell> = Object.freeze({ ring: 2, step: 4 });
/** The ring round a cell (the glowing cell, the hint ring): its quad lies on the bed, a little above the glass. */
export const RING_SIZE_M = 0.07;
export const RING_LIFT_M = 0.004;
/** The ghost hand: its quad, the top and bottom of its loop over the cell, and the loop's period. */
export const GHOST_SIZE_M = 0.06;
export const GHOST_TOP_M = 0.1;
export const GHOST_BOTTOM_M = 0.045;
export const GHOST_LOOP_MS = 2000;
/** Of the loop: down with the fingers open until this fraction, closed until the next, then up open again. */
export const GHOST_CLOSE_AT = 0.35;
export const GHOST_OPEN_AT = 0.7;
/** The grow and move icons stand this far over their plant's cell; the palm and Listen icons over the bed centre. */
export const ICON_SIZE_M = 0.05;
export const RING_ICON_LIFT_M = 0.12;
/** Above the seed supply (render SUPPLY_ORB_LIFT_M 0.10 plus its 0.03 radius): where the seeds come from. */
export const PALM_ICON_LIFT_M = 0.17;
export const LISTEN_ICON_LIFT_M = 0.14;
/** UX §3.4: the remove arrow lies on the bed, just past the rim (0.30 m), on the side of the dragging hand. */
export const REMOVE_ARROW_SIZE_M = 0.06;
export const REMOVE_ARROW_AT_M = 0.34;
/** UX §3.4: the hand hint is 4 cm across, 4 cm above where the hand was last seen, held in the FoV box. */
export const HAND_HINT_SIZE_M = 0.04;
export const HAND_HINT_LIFT_M = 0.04;
/** The hand hint is clamped as if it stood this far ahead (a seated hand is 0.3 to 0.6 m from the eyes). */
export const HAND_HINT_DISTANCE_M = 0.45;
/** UX §3.4: the hand hint fades in over 150 ms and out over 200 ms; the other hints take 200 ms both ways. */
export const HAND_HINT_FADE_IN_MS = 150;
export const HINT_FADE_MS = 200;
