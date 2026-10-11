// The prototype page's own numbers (CODING_GUIDELINES §4: no magic numbers). Everything the app's audio module
// uses as well (scheduler, voices, limiter, reverb impulse) moved to src/audio/config.ts with T-121 and is
// re-exported here, so the page and the app play from the same values.
import type { Tempo } from './types';

export * from '../../../src/audio/config';
/** Bed grid: rings outward, steps around (FR-MUS-01). */
export { RINGS, STEPS } from '../../../src/garden/index';

/** Tempo is the listener's control, not the room's, in v1 (D-021, PLAN_AMENDMENT §6.2); T-103 may change the default. */
export const TEMPO_OPTIONS: readonly Tempo[] = [72, 84, 96];
export const DEFAULT_TEMPO: Tempo = 84;

export const DEFAULT_VOLUME = 0.8;
/** A removed plant's nodes are disconnected this long after its mute starts (20 τ, far below audibility). */
export const DISCONNECT_AFTER_S = 0.3;

/** Reverb decay clamp in seconds (FR-ROOM-06). garden/ takes these over with the room signature (T-141). */
export const REVERB_RT60_MIN_S = 0.3;
export const REVERB_RT60_MAX_S = 2.0;

/**
 * Stereo width of the bed (StereoPannerNode pan at steps 4 and 12). Below 1 because the bed spans roughly ±35° in
 * front of a seated listener, never hard left or right. The page's stand-in for the app's 24 pooled equal-power
 * panners (src/audio/Spatializer.ts, NFR-PERF-10).
 */
export const PAN_WIDTH = 0.7;

/** Output meter: AnalyserNode window in samples (about 43 ms at 48 kHz) and the level reported for silence. */
export const ANALYSER_FFT = 2048;
export const METER_SILENCE_DB = -100;

// Offline render check (TC-AUD-05, ADR-002).

export const SELFTEST_SAMPLE_RATE = 48000;
export const SELFTEST_RENDER_S = 3.5;
/** Audio time of the first trigger in a render. */
export const SELFTEST_TRIGGER_AT_S = 0.05;
/** A render quieter than this RMS counts as silent. */
export const SELFTEST_SILENCE_DBFS = -60;
/** Float rounding allowance on the −1 dBFS bound. */
export const SELFTEST_PEAK_TOLERANCE_DB = 0.001;
/** A plant at the right or left step must be at least this much louder on its side (dry pan alone gives about 12 dB). */
export const SELFTEST_PAN_MIN_DB = 6;
/** Steps a quarter turn right and left of straight ahead (see `panForStep`). */
export const SELFTEST_STEP_RIGHT = 4;
export const SELFTEST_STEP_LEFT = 12;

// Prototype page (main.ts): drawing sizes in SVG user units; index.html sets the same viewBox.

export const GRID_SIZE_PX = 420;
/** Ring radii: the 0.12..0.30 m bed (FR-MUS-01) at 600 px per metre. */
export const RING_RADIUS_PX: readonly number[] = [72, 99, 126, 153, 180];
export const CELL_RADIUS_PX = 9;
/** How far the tide ray reaches past the outer ring. */
export const TIDE_OVERHANG_PX = 12;
/** Drops the centre label onto the bed centre's baseline. */
export const CENTRE_LABEL_DROP_PX = 4;
/** Bottom of the output meter's scale. */
export const METER_FLOOR_DB = -60;
/** Height of a plant added by clicking a cell (FR-MUS-05 range 0..1). */
export const NEW_PLANT_HEIGHT = 0.55;
/** Golden-ratio step: spreads the hue of clicked-in plants evenly over 0..1. */
export const HUE_GOLDEN_STEP = 0.618;
