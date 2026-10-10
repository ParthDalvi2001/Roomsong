// Every tunable number of the sound prototype (CODING_GUIDELINES §4, PLAN_AMENDMENT §6.2: no magic numbers).
// Each cites the requirement it comes from; a value with no ID is a prototype choice and says what it does.
import type { Tempo, VoiceType } from './types';

/** Bed grid: rings outward, steps around (FR-MUS-01, REPLAN §3). */
export const RINGS = 5;
export const STEPS = 16;

/** Tide: 4 beats per bar, 16 steps per bar (FR-MUS-03). */
export const BEATS_PER_BAR = 4;
export const SECONDS_PER_MINUTE = 60;
/** Tempo is the listener's control, not the room's, in v1 (D-021, PLAN_AMENDMENT §6.2); T-103 may change the default. */
export const TEMPO_OPTIONS: readonly Tempo[] = [72, 84, 96];
export const DEFAULT_TEMPO: Tempo = 84;

/** Scheduler "two clocks" pattern (LLD §5.3): 25 ms wall-clock tick, 120 ms audio-clock look-ahead (≥ 100 ms, FR-MUS-03). */
export const TICK_MS = 25;
export const LOOK_AHEAD_S = 0.12;
/** First step lands this long after start() so the first trigger is never in the past. */
export const START_DELAY_S = 0.08;

/** Voice cap; the oldest-quietest note is stolen (FR-MUS-07, NFR-PERF-10). */
export const VOICE_CAP = 24;
/** Fade applied to a stolen note before it is stopped (no clicks). */
export const STEAL_FADE_S = 0.02;
/** The fade is a setTargetAtTime glide; this many of its time constants fit in the fade (4 τ ≈ −35 dB). */
export const STEAL_FADE_TAUS = 4;

/** MIDI note of C4; base octaves per voice are offsets from it (LLD §5.2). */
export const MIDI_C4 = 60;
/** Equal temperament reference: A4 = MIDI 69 = 440 Hz (LLD §5.2). */
export const MIDI_A4 = 69;
export const A4_HZ = 440;
export const SEMITONES_PER_OCTAVE = 12;
export const CENTS_PER_OCTAVE = 1200;

/** Static mix per voice in dB (UX §6). */
export const MIX_DB: Readonly<Record<VoiceType, number>> = {
  bass: -6,
  pad: -9,
  choir: -9,
  bell: -7,
  pluck: -8,
  shimmer: -12,
};

/** Height → gain (dB) and release (s) ranges (FR-MUS-05). */
export const HEIGHT_GAIN_DB_MIN = -24;
export const HEIGHT_GAIN_DB_MAX = 0;
export const HEIGHT_RELEASE_S_MIN = 0.2;
export const HEIGHT_RELEASE_S_MAX = 2.5;
/** Hue → cutoff ±1 octave, detune ±8 cents (FR-MUS-05). */
export const HUE_CUTOFF_OCTAVES = 1;
export const HUE_DETUNE_CENTS = 8;

/** Master limiter (FR-MUS-06): compressor as the limiter stage, then a −1 dBFS soft ceiling. */
export const LIMITER_THRESHOLD_DB = -10;
export const LIMITER_KNEE_DB = 6;
export const LIMITER_RATIO = 20;
export const LIMITER_ATTACK_S = 0.002;
export const LIMITER_RELEASE_S = 0.15;
export const CEILING_DBFS = -1;
/** Below this fraction of the ceiling the soft clipper is exactly linear. */
export const CEILING_KNEE = 0.7;

/** Points in the ceiling's WaveShaperNode curve; odd, so an input of 0 maps to exactly 0. */
export const CEILING_CURVE_POINTS = 4097;

export const DEFAULT_VOLUME = 0.8;
/** setTargetAtTime time constant for live parameter changes (CODING_GUIDELINES §5). */
export const PARAM_SMOOTH_S = 0.03;
/** Audio seconds to wait after muting a reverb return before swapping its impulse response. */
export const REVERB_SWAP_DELAY_S = 0.12;
/** setTargetAtTime time constant for muting the reverb return or a removed plant. */
export const MUTE_TAU_S = 0.015;
/** A removed plant's nodes are disconnected this long after its mute starts (20 τ, far below audibility). */
export const DISCONNECT_AFTER_S = 0.3;
/** Gain of the reverb return while it is open. */
export const WET_RETURN = 1;

/** Reverb decay clamp in seconds (FR-ROOM-06) and the longest impulse response allowed (NFR-PERF-10). */
export const REVERB_RT60_MIN_S = 0.3;
export const REVERB_RT60_MAX_S = 2.0;
export const REVERB_IR_MAX_S = 2.0;
/**
 * Wet send level, the same in every room (UX §6: 20–35 %). Only the decay follows the room in signature v1;
 * `reverbSize` is a Settings label and sets nothing here (D-021, PLAN_AMENDMENT §6.3).
 */
export const REVERB_SEND = 0.28;
/** −60 dB as a linear amplitude: the level a decay has reached after its T60 / RT60 (FR-ROOM-06). */
export const T60_AMPLITUDE = 0.001;
/** Impulse response (ADR-002): the noise is low-passed by a one-pole whose coefficient closes from start to end. */
export const IR_LPF_COEF_START = 0.15;
export const IR_LPF_COEF_END = 0.92;
export const IR_FADE_IN_S = 0.001;
/** Noise seed of the left reverb channel; the right channel uses the next one (CODING_GUIDELINES §9). */
export const IR_SEED = 1000;

/**
 * Stereo width of the bed (StereoPannerNode pan at steps 4 and 12). Below 1 because the bed spans roughly ±35° in
 * front of a seated listener, never hard left or right. Desktop stand-in for the pooled equal-power panners
 * of NFR-PERF-10.
 */
export const PAN_WIDTH = 0.7;

/** Output meter: AnalyserNode window in samples (about 43 ms at 48 kHz) and the level reported for silence. */
export const ANALYSER_FFT = 2048;
export const METER_SILENCE_DB = -100;
/** Weight of the newest tick in the moving average behind `stats.cpuEstimate`. */
export const TICK_EMA = 0.05;

// Voice timbre (LLD §7). The LLD fixes the synthesis method and the values marked "LLD §7"; every other value is a
// first-pass choice that nobody has rated yet (T-103 listening review).

/** Bell: 2-operator FM. Modulator ratio (LLD §7). */
export const BELL_FM_RATIO = 3.5;
/** Modulation index at the strike (× hz = peak frequency deviation); it decays to the floor ("index decays", LLD §7). */
export const BELL_FM_INDEX = 2.2;
export const BELL_FM_INDEX_FLOOR = 0.15;
export const BELL_FM_INDEX_TAU_S = 0.22;
export const BELL_ATTACK_S = 0.004;
/** Decay time constant = release / this, so the bell is about −43 dB down at `release` seconds. */
export const BELL_RELEASE_TAU_DIV = 5;
/** The sources stop this many time constants after `release`. */
export const BELL_TAIL_TAUS = 3;

/** Pad: three sawtooths, detuned by these cents (LLD §7). */
export const PAD_DETUNE_CENTS: readonly number[] = [-7, 0, 7];
/** Slow attack (LLD §7). */
export const PAD_ATTACK_S = 0.4;
/** Three saws are loud; scaled before the voice mix so the pad peaks below the bell and pluck. */
export const PAD_SAW_LEVEL = 0.4;
/** Low-pass cutoff as multiples of the note: closed at the onset, open after the attack, resting in the release. */
export const PAD_CUTOFF_OPEN_MUL = 3.5;
export const PAD_CUTOFF_CLOSED_MUL = 0.35;
export const PAD_CUTOFF_REST_MUL = 0.6;
export const PAD_CUTOFF_MIN_HZ = 150;
export const PAD_CUTOFF_MAX_HZ = 6000;
export const PAD_FILTER_Q = 0.9;
/** Hold = release × this (height → sustain, FR-MUS-05). */
export const PAD_HOLD_MUL = 1;
export const PAD_RELEASE_TAU_DIV = 4;
/** The sources stop 6 τ after the release starts (about −52 dB), so the stop is inaudible. */
export const PAD_TAIL_TAUS = 6;

/** Pluck: seconds of Karplus-Strong string rendered per plant (LLD §7). */
export const PLUCK_BUFFER_S = 1.6;
/** String damping 0..1 from hue: the middle value, and how much one octave of cutoff multiplier moves it. */
export const PLUCK_DAMPING_MID = 0.5;
export const PLUCK_DAMPING_PER_OCTAVE = 0.25;
export const PLUCK_DAMPING_MIN = 0.1;
export const PLUCK_DAMPING_MAX = 0.9;
export const PLUCK_LEVEL = 0.9;
/** The envelope release starts at release × 0.5 with τ = release × 0.25; the source stops after 4 τ. */
export const PLUCK_RELEASE_START_MUL = 0.5;
export const PLUCK_RELEASE_TAU_MUL = 0.25;
export const PLUCK_TAIL_TAUS = 4;
/** String decay (T60) at damping 0 and at damping 1. */
export const STRING_T60_LONG_S = 2.5;
export const STRING_T60_SHORT_S = 0.4;
/** Click-free edges of the rendered string. */
export const STRING_FADE_IN_SAMPLES = 48;
export const STRING_FADE_OUT_S = 0.005;

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
