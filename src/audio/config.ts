// Named constants of audio/ (CODING_GUIDELINES §4, LLD §7.1). Each cites the requirement it comes from; a value
// with no ID is the T-102 prototype's choice and says what it does. Bed sizes (RINGS, STEPS) come from garden/.
import type { ModeId, VoiceType } from '../garden/index.js';

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
/**
 * P-014: from rest (the session's start, or a resume after a suspend that ran its course) the master fades in from
 * silence: a setTargetAtTime glide with this many time constants in this many seconds (−10 dB at 0.3 s, −3 dB at
 * 1 s, −0.4 dB at 2.5 s), so a garden that is already playing never starts at full level (startle).
 */
export const START_FADE_S = 2.5;
export const START_FADE_TAUS = 3;

/** Panner distance curve (LLD §7.1, NFR-PERF-10): gain 1 up to 40 cm from the head, about −6 dB at 80 cm. */
export const PAN_REF_DISTANCE_M = 0.4;
export const PAN_ROLLOFF = 1;
/**
 * Listen mode's foreground (T-148, "nearest plants foregrounded"; the law chosen in T-148): while it lasts, a
 * note's channel is at (this distance ÷ the note's distance from the head)², at most 1. The distance is the eye's
 * to the bed centre (UX §2: 0.62 m), so the near half of the bed keeps its level and the far rim (0.86 m) is
 * about −6 dB, on top of the panner's own curve.
 */
export const LISTEN_FOCUS_REF_M = 0.62;
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
/** P-011: the send is high-passed here (Butterworth, FLAT_Q_DB): a 2.0 s room had 69 % of its wet power in 100–250 Hz. */
export const REVERB_HPF_HZ = 200;
/** Gain of the reverb return while it is open. */
export const WET_RETURN = 1;
/**
 * P-016 (T-173): a still head facing the bed opens the garden: the reverb send this many times its level (+1.9 dB, a
 * little wider), glided with this time constant (about 2 s to settle), and the plant the gaze rests on this much
 * louder on each of its notes. Provisional until a headset listen.
 */
export const STILL_SEND_MUL = 1.25;
export const STILL_RAMP_TAU_S = 0.7;
export const STILL_GAZE_DB = 2;
/** Audio seconds to wait after muting the reverb return before swapping the impulse response. */
export const REVERB_SWAP_DELAY_S = 0.12;
/** setTargetAtTime time constant for muting the reverb return. */
export const MUTE_TAU_S = 0.015;
/** −60 dB as a linear amplitude: the level a decay has reached after its T60 / RT60 (FR-ROOM-06). */
export const T60_AMPLITUDE = 0.001;
/**
 * P-022: the energy (sum of squares) of each channel of every impulse response, played with the convolver's
 * normalize off, so the wet level is the same in every room. Normalize on scales a response to an energy that grows
 * with its length (Web Audio spec, ConvolverNode normalization: 0.00125 · 44100 / sampleRate over its RMS), and a
 * response is one RT60 long: +8.2 dB from 0.3 to 2.0 s. 0.057 is what it gave the default 0.9 s response at 48 kHz,
 * so the default room's response keeps its level; a 0.3 s room's is now 4.8 dB over what it was, a 2.0 s one's 3.4 dB
 * under. The high-pass ahead of the send (REVERB_HPF_HZ) lowers every room's reverb too, the default's included,
 * and more for the low voices: a bass note's reverb loses most of its fundamental.
 */
export const IR_ENERGY = 0.057;
/**
 * P-010: silence before the tail, in seconds, at the smallest room and at the largest; between them in proportion to
 * the decay, which grows with the room's volume (garden: Sabine with one absorption area, FR-ROOM-06). It is inside
 * the response's one RT60, so the tail loses as much at its end, where it is near −60 dB.
 */
export const IR_PREDELAY_S: readonly [number, number] = [0.005, 0.025];
/**
 * Impulse response (ADR-002): the noise is low-passed by a one-pole whose coefficient closes from start to end,
 * evenly over the whole decay. The end is set by room (P-010), at the smallest room and at the largest, as the
 * pre-delay, but it only shapes the last of the tail: a bigger room's tail ends darker (about 800 Hz down to 310 Hz
 * at 48 kHz) where it is below about −48 dB, and above it the rooms are about as bright. Rooms differ in their decay
 * and their pre-delay. The default 0.9 s room gets 0.921, the 0.92 all rooms had.
 */
export const IR_LPF_COEF_START = 0.15;
export const IR_LPF_COEF_END: readonly [number, number] = [0.9, 0.96];
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

/**
 * P-025, the rules every UI sound (`ui()`) passes; tests/unit/audio/uiRules.ts checks them. It starts at the audio
 * clock's now, never at the scheduler's next step (whose look-ahead alone is 95–120 ms). Its notes are tones of the
 * room's chord (chordDegrees). Each note's gain is within these dB of a full-height plant of its voice, the loudest
 * note of that voice the garden plays: P-025's −10…+3 LU "to the music" read as a note against a note, not as a
 * loudness measured against the whole garden.
 */
export const UI_LEVEL_DB_RE_PLANT: readonly [number, number] = [-10, 3];
/**
 * P-012: the note a plant sounds as it is set into its cell, in dB against a full-height plant of its voice: quiet,
 * inside UI_LEVEL_DB_RE_PLANT. A new plant's own notes are −10.8 dB with today's sound and −5.4 dB with a style.
 */
export const PLACED_DB_RE_PLANT = -9;

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

// T-164 sound pass (specs/03-design/SOUND_PASS_T164.md §1): what every style shares. A style's own values, and today's
// (every layer off), are the recipes in styles.ts.

/** Groove (§1.1): a note's level by its step in the bar, dB: the downbeat, the other beats, the 8ths, the 16ths. */
export const ACCENTS_DB: readonly number[] = [0, -5, -3, -5, -1, -5, -3, -5, -1, -5, -3, -5, -1, -5, -3, -5];
/**
 * Seed of the humanize draws, one per (bar, plant) (CODING_GUIDELINES §9). shortcut: the same in every session, so
 * a garden sways the same way each time; give it a session seed if a listener hears the repeat.
 */
export const GROOVE_SEED = 164;
/**
 * P-009, the loop that does not repeat: each plant draws one of these cycles, in bars, from its seed (grooveSeed) and
 * rests in one bar of each, at a seeded place in it; a plant of the 1-bar cycle skips this share of its bars instead,
 * a seeded draw a bar. Cycles of 1, 2, 3 and 5 bars come round together every 30 bars (86 s at 84 BPM). A rest
 * removes a note and moves none: the notes that play stay on the grid, under the tide.
 */
export const CYCLE_BARS: readonly number[] = [1, 2, 3, 5];
export const CYCLE_SKIP = 0.125;
/** Evolving pad (§1.4): a pad plant's cutoff moves on a sine this many bars long. */
export const PAD_EVOLVE_BARS = 16;
/** Tempo echo (§1.2): the DelayNode's longest delay. A style's 6 steps at 60 BPM are 1.5 s. */
export const ECHO_MAX_S = 2;
/** The breathing filter (§1.4) and the echo (§1.2) glide to a bar's value with τ = one bar ÷ this. */
export const BAR_GLIDE_TAUS = 3;
/**
 * A low-pass or high-pass with no peak: Butterworth, a Q of 1/√2. Web Audio takes their Q in dB (MDN:
 * BiquadFilterNode.Q), so that is 20·log10(1/√2); a Q of 0 dB is a linear Q of 1, a +1.25 dB peak at the cutoff.
 */
export const FLAT_Q_DB = -3.0103;
/**
 * Builds (§1.5): the harmony, texture (shaker, tick, clave, breath) and kick layers each come in at this many plants
 * or this many bars played, whichever is first, then fade in over BUILD_FADE_BARS. An empty bed plays none.
 */
export const BUILD_PLANTS: readonly number[] = [2, 3, 5];
export const BUILD_BARS: readonly number[] = [4, 8, 16];
export const BUILD_FADE_BARS = 2;
/**
 * Harmony that moves (§1.3): the chord roots, as degrees of the room's mode, one chord after the other. The fifth
 * is HARMONY_FIFTH_DEGREES degrees up, a perfect fifth for each of these roots, so every note stays in the scale
 * (D-025). Major C–A–D–G (I–vi–ii–V), minor C–B♭–E♭–F, sus C–B♭–F–G in C.
 */
export const HARMONY_ROOTS: Readonly<Record<ModeId, readonly number[]>> = {
  majorPent: [0, 4, 1, 3],
  minorPent: [0, 4, 1, 2],
  susPent: [0, 4, 2, 3],
};
export const HARMONY_FIFTH_DEGREES = 3;
/** A drone note is held to the next chord, then glides out with τ = its hold ÷ this, under the next one. */
export const DRONE_TAU_DIV = 12;
/** The drone sits under a new plant: this is its height (garden's NEW_PLANT_HEIGHT; audio/config.ts loads no garden/). */
export const DRONE_REF_HEIGHT = 0.55;
/** Felt kick (§1.6): the Bass wave, its pitch falling over KICK_DROP_S; attack, then τ. */
export const KICK_START_HZ = 140;
export const KICK_END_HZ = 55;
export const KICK_DROP_S = 0.06;
export const KICK_ATTACK_S = 0.003;
export const KICK_TAU_S = 0.06;
/** A percussion note's sources stop this many τ after its peak (about −52 dB). */
export const PERC_TAIL_TAUS = 6;
/** The one noise buffer that the shaker, the tick and the breath play, rendered once, and its seed. */
export const NOISE_S = 0.25;
export const NOISE_SEED = 2000;
/** A noise hit: its filter (Q in dB for a high-pass, see FLAT_Q_DB), attack and decay τ. */
export interface NoiseShape {
  type: BiquadFilterType;
  hz: number;
  q: number;
  attackS: number;
  tauS: number;
}
export const SHAKER: NoiseShape = { type: 'bandpass', hz: 6000, q: 0.7, attackS: 0.001, tauS: 0.025 };
export const TICK: NoiseShape = { type: 'highpass', hz: 8000, q: FLAT_Q_DB, attackS: 0.0005, tauS: 0.006 };
/** Style C's breath: a 0.6 s swell of band-passed noise. */
export const BREATH_NOISE: NoiseShape = { type: 'bandpass', hz: 900, q: 1, attackS: 0.3, tauS: 0.1 };
/** Style B's clave: a Bell this many octaves over the root, this short. */
export const CLAVE_OCTAVES = 2;
export const CLAVE_RELEASE_S = 0.05;

/**
 * The Listen sweep (SOUND_PASS_T164.md §6, UX §6): in Listen the breathing master low-pass breathes this range on
 * this cycle in every style, the mix is this much down and the reverb send this much up (to at most LISTEN_SEND_MAX),
 * gliding in over the visual transition (1.2 s) and out over 0.8 s (HaloSystem's times), in BAR_GLIDE_TAUS each.
 */
export const LISTEN_BREATH_LOW_HZ = 800;
export const LISTEN_BREATH_HIGH_HZ = 4000;
export const LISTEN_BREATH_BARS = 16;
export const LISTEN_DIM_DB = -3;
export const LISTEN_SEND_ADD = 0.07;
export const LISTEN_SEND_MAX = 0.35;
export const LISTEN_GLIDE_IN_S = 1.2;
export const LISTEN_GLIDE_OUT_S = 0.8;
