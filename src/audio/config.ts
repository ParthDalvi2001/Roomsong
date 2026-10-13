// Named constants of audio/ (CODING_GUIDELINES §4, LLD §7.1). Each cites the requirement it comes from; a value
// with no ID is the T-102 prototype's choice and says what it does. Bed sizes (RINGS, STEPS) come from garden/.
import type { VoiceType } from '../garden/index.js';

/** Tide: 4 beats per bar (FR-MUS-03). */
export const BEATS_PER_BAR = 4;
export const SECONDS_PER_MINUTE = 60;
/** FR-MUS-03: the tempo range. core/config.ts holds the same pair for the Settings validator and does not export it. */
export const TEMPO_MIN_BPM = 60;
export const TEMPO_MAX_BPM = 120;

/** Scheduler "two clocks" pattern (LLD §5.3): 25 ms wall-clock tick, 120 ms audio-clock look-ahead (FR-MUS-03). */
export const TICK_MS = 25;
export const LOOK_AHEAD_S = 0.12;
/** First step lands this long after start() so the first trigger is never in the past. */
export const START_DELAY_S = 0.08;
/** A step found this late (a stalled or throttled tick) is skipped, not played in a burst with the ones after it. */
export const LATE_DROP_S = 0.1;

/** Voice cap = voice channels; the oldest-quietest note is stolen (FR-MUS-07, NFR-PERF-10). */
export const VOICE_CAP = 24;
/** Fade of a stolen note; it ends when the note that takes its channel starts (LLD §7.1). */
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

/** setTargetAtTime time constant for live parameter changes (CODING_GUIDELINES §5). */
export const PARAM_SMOOTH_S = 0.03;
/** FR-SYS-05: the master fade before the context is suspended; "within 300 ms". */
export const SUSPEND_FADE_S = 0.2;
/** The suspend fade is a setTargetAtTime glide with this many time constants in it (5 τ ≈ −43 dB). */
export const SUSPEND_FADE_TAUS = 5;

/** Panner distance curve (LLD §7.1, NFR-PERF-10): gain 1 up to 40 cm from the head, about −6 dB at 80 cm. */
export const PAN_REF_DISTANCE_M = 0.4;
export const PAN_ROLLOFF = 1;
/**
 * Sample frames in a Web Audio render quantum. The panners and the listener are k-rate (NFR-PERF-06, T-145): a
 * position changes only at a quantum's start, so a panner is moved at the one at or before its note.
 */
export const RENDER_QUANTUM = 128;

/** Longest impulse response of the one shared reverb (NFR-PERF-10). */
export const REVERB_IR_MAX_S = 2.0;
/** Decay of setReverb('small') (FR-ROOM-06). */
export const REVERB_SMALL_RT60_S = 0.6;
/** Wet send level, the same for every channel and every room (UX §6: 20–35 %; D-021). */
export const REVERB_SEND = 0.28;
/** Gain of the reverb return while it is open. */
export const WET_RETURN = 1;
/** Audio seconds to wait after muting the reverb return before swapping the impulse response. */
export const REVERB_SWAP_DELAY_S = 0.12;
/** setTargetAtTime time constant for muting the reverb return. */
export const MUTE_TAU_S = 0.015;
/** −60 dB as a linear amplitude: the level a decay has reached after its T60 / RT60 (FR-ROOM-06). */
export const T60_AMPLITUDE = 0.001;
/** Impulse response (ADR-002): the noise is low-passed by a one-pole whose coefficient closes from start to end. */
export const IR_LPF_COEF_START = 0.15;
export const IR_LPF_COEF_END = 0.92;
export const IR_FADE_IN_S = 0.001;
/** Noise seed of the left reverb channel; the right channel uses the next one (CODING_GUIDELINES §9). */
export const IR_SEED = 1000;

/**
 * Render work one tick may do, so that a re-tune or a restored garden never holds a frame (NFR-PERF-05: JS ≤ 6 ms
 * a frame; FR-ROOM-13; T-143). A tick renders strings, or else one slice of a new impulse response, never both.
 * Measured in Node on a laptop (2026-10-12): 2 strings take 0.5 ms and 8 000 response samples 0.3 ms, so the 20
 * strings of a key take 10 ticks and a 2.0 s stereo response 24. No test pins a time: the tests pin these two
 * counts. Not measured on a headset (T-129).
 */
export const PLUCK_STRINGS_PER_TICK = 2;
export const IR_SAMPLES_PER_TICK = 8000;

/** Weight of the newest tick in the moving average behind `stats.cpuEstimate`. */
export const TICK_EMA = 0.05;

// Voice timbre (LLD §7). The LLD fixes the synthesis method and the values marked "LLD §7"; every other value is a
// first-pass choice of the T-102 prototype (listening review T-103).

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

/** Pluck: seconds of Karplus-Strong string rendered per buffer (LLD §7). */
export const PLUCK_BUFFER_S = 1.6;
/** Strings are cached per pitch and per one of this many damping steps across the hue range, not per plant (LLD §7). */
export const PLUCK_DAMPING_BUCKETS = 4;
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

// Bass and Choir (T-144). The LLD fixes the method; these values are first choices that nobody has heard yet
// (sound pass T-164, device audio test T-129).

/** Bass (LLD §7): a sine plus this much 2nd harmonic, soft-clipped by tanh at this drive. */
export const BASS_SECOND_HARMONIC = 0.8;
export const BASS_DRIVE = 3;
/** Harmonics kept of the clipped cycle, and the points it is computed at. */
export const BASS_PARTIALS = 12;
export const BASS_CYCLE_SAMPLES = 256;
/** Low-pass cutoff as a multiple of the note at the middle hue: at the darkest hue it is the 4th harmonic. */
export const BASS_CUTOFF_MUL = 8;
/** For a low-pass, Q is the peak at the cutoff in dB (MDN: BiquadFilterNode): none. */
export const BASS_FILTER_Q = 0;
export const BASS_ATTACK_S = 0.01;
/** Hold = release × this, then τ = release / the divisor: a new plant's bass lasts about 0.6 s (LLD §7). */
export const BASS_HOLD_MUL = 0.2;
export const BASS_RELEASE_TAU_DIV = 25;
/** The source stops 6 τ after the release starts (about −52 dB). */
export const BASS_TAIL_TAUS = 6;

/** Choir (LLD §7): a pulse this wide, as a fraction of the period; its first missing harmonic is 1 / this. */
export const CHOIR_PULSE_DUTY = 1 / 16;
export const CHOIR_PULSE_PARTIALS = 40;
/** Height of the pulse: three band-passes keep little of it, and at this height no note peaks above its envelope. */
export const CHOIR_PULSE_LEVEL = 2;
/** The three formants of a sung "ah" at the middle hue, and their shared Q (centre / bandwidth). */
export const CHOIR_FORMANTS_HZ: readonly number[] = [650, 1080, 2650];
export const CHOIR_FORMANT_Q = 5;
/** Of the hue's ±1 octave (FR-MUS-05) the formants move this much: further is no longer a vowel. */
export const CHOIR_FORMANT_HUE_OCTAVES = 0.5;
/** Slow vibrato (LLD §7): rate, and depth each way in cents. */
export const CHOIR_VIBRATO_HZ = 4.5;
export const CHOIR_VIBRATO_CENTS = 10;
export const CHOIR_ATTACK_S = 0.25;
/** Hold = release × this, then τ = release / the divisor; the sources stop 6 τ later (about −52 dB). */
export const CHOIR_HOLD_MUL = 0.5;
export const CHOIR_RELEASE_TAU_DIV = 4;
export const CHOIR_TAIL_TAUS = 6;
