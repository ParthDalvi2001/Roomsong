// Named constants of ui/ (CODING_GUIDELINES §4). Each cites the requirement it comes from.

/** FR-UI-03, NFR-FOV-01: essential UI stays within this many degrees of the forward gaze, to each side and up or down. */
export const FOV_HALF_H_DEG = 25;
export const FOV_HALF_V_DEG = 20;

/** FR-UI-01: a caption has at most this many words (tuning-ripple captions have their own, smaller limits in core/). */
export const CAPTION_MAX_WORDS = 6;
/** UX §3.3: a caption is drawn this far ahead of the head, and this far below the gaze line ("slightly below"). */
export const CAPTION_DISTANCE_M = 0.6;
export const CAPTION_BELOW_GAZE_DEG = 8;
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
/** Drawn after the garden and without a depth test: a caption is never hidden inside a plant. */
export const CAPTION_RENDER_ORDER = 1000;
