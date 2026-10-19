// Sound styles (T-164, specs/03-design/SOUND_PASS_T164.md §2–§4). A recipe is every value a style changes. TODAY
// is config.ts as it stands, with every new layer off: it is what the engine plays until a style is set. A, B and
// C share the mix (§2), the limiter (§3) and the layers of §1, so they differ in mood and not in how alive they
// are. After Parth picks one by ear (proto/styles/), the winner's values become the constants in config.ts, TODAY
// and the other two go, and so does this file (plan §7 step 8).
import {
  ACCENTS_DB,
  BASS_ATTACK_S,
  BASS_CUTOFF_MUL,
  BASS_DRIVE,
  BASS_HOLD_MUL,
  BASS_RELEASE_TAU_DIV,
  BELL_ATTACK_S,
  BELL_FM_INDEX,
  BELL_FM_INDEX_FLOOR,
  BELL_FM_RATIO,
  BELL_RELEASE_TAU_DIV,
  CHOIR_ATTACK_S,
  CHOIR_FORMANT_Q,
  CHOIR_FORMANTS_HZ,
  CHOIR_HOLD_MUL,
  CHOIR_RELEASE_TAU_DIV,
  CHOIR_VIBRATO_CENTS,
  CHOIR_VIBRATO_HZ,
  CYCLE_BARS,
  CYCLE_SKIP,
  HEIGHT_GAIN_DB_MIN,
  LIMITER_ATTACK_S,
  LIMITER_KNEE_DB,
  LIMITER_RATIO,
  LIMITER_RELEASE_S,
  LIMITER_THRESHOLD_DB,
  MIX_DB,
  PAD_ATTACK_S,
  PAD_CUTOFF_OPEN_MUL,
  PAD_DETUNE_CENTS,
  PAD_FILTER_Q,
  PAD_HOLD_MUL,
  PAD_RELEASE_TAU_DIV,
  PLUCK_RELEASE_START_MUL,
  REVERB_SEND,
  STRING_T60_LONG_S,
} from './config.js';

import type { VoiceType } from '../garden/index.js';

export type SoundStyle = 'A' | 'B' | 'C';

export type PercKind = 'kick' | 'shaker' | 'tick' | 'clave' | 'breath';
/** One percussion hit of the bar: on `step`, `db` under a full-height Bell, in every `everyBars`-th bar. */
export interface PercHit {
  readonly kind: PercKind;
  readonly step: number;
  readonly db: number;
  readonly everyBars: number;
}

export interface Recipe {
  /** §2: the voice mix, dB; the height floor, dB (FR-MUS-05). */
  mixDb: Readonly<Record<VoiceType, number>>;
  heightFloorDb: number;
  /** §3: the compressor ahead of the −1 dBFS ceiling. */
  limiterThresholdDb: number;
  limiterKneeDb: number;
  limiterRatio: number;
  limiterAttackS: number;
  limiterReleaseS: number;
  reverbSend: number;
  bellFmRatio: number;
  bellFmIndex: number;
  bellFmIndexFloor: number;
  bellAttackS: number;
  bellReleaseTauDiv: number;
  /** 0 = the string starts at full level, as today. */
  pluckAttackS: number;
  /** A low-pass at this × the note; 0 = none, as today. */
  pluckLpfMul: number;
  stringT60LongS: number;
  pluckReleaseStartMul: number;
  padDetuneCents: readonly number[];
  padAttackS: number;
  padCutoffOpenMul: number;
  padFilterQ: number;
  padHoldMul: number;
  padReleaseTauDiv: number;
  bassDrive: number;
  bassCutoffMul: number;
  bassAttackS: number;
  bassHoldMul: number;
  bassReleaseTauDiv: number;
  choirFormantsHz: readonly number[];
  choirFormantQ: number;
  choirAttackS: number;
  choirHoldMul: number;
  choirReleaseTauDiv: number;
  choirVibratoHz: number;
  choirVibratoCents: number;
  /** §1.1 groove: swing (0.5 = straight), humanize ± seconds and ± dB, the per-step accents (16 values, dB). */
  swing: number;
  humanizeS: number;
  humanizeDb: number;
  accentsDb: readonly number[];
  /** §1.4: a pad plant's cutoff moves ± this many octaves over PAD_EVOLVE_BARS. */
  padEvolveOctaves: number;
  /** P-009: the cycles a plant draws from, in bars ([] = every plant plays every bar), and the 1-bar cycle's skip. */
  cycleBars: readonly number[];
  cycleSkip: number;
  /** §1.2 tempo echo: delay in steps, feedback, low-pass in the loop, send level (0 = off). */
  echoSteps: number;
  echoFeedback: number;
  echoLpfHz: number;
  echoSend: number;
  /** §1.4 breathing filter: the master low-pass sweeps low..high on a sine this many bars long; 0 = open. */
  breathLowHz: number;
  breathHighHz: number;
  breathBars: number;
  /** §1.3 harmony: bars a chord (0 = none), octaves over the Pad's, dB under a new plant, the fifth on the Choir. */
  droneBarsPerChord: number;
  droneOctave: number;
  droneDb: number;
  droneFifthOnChoir: boolean;
  /** §1.6 soft percussion: the hits of one bar. */
  perc: readonly PercHit[];
}

const NO_ACCENTS: readonly number[] = new Array<number>(16).fill(0);

/** Today's sound: config.ts as it stands, every new layer off. */
export const TODAY: Readonly<Recipe> = Object.freeze({
  mixDb: MIX_DB,
  heightFloorDb: HEIGHT_GAIN_DB_MIN,
  limiterThresholdDb: LIMITER_THRESHOLD_DB,
  limiterKneeDb: LIMITER_KNEE_DB,
  limiterRatio: LIMITER_RATIO,
  limiterAttackS: LIMITER_ATTACK_S,
  limiterReleaseS: LIMITER_RELEASE_S,
  reverbSend: REVERB_SEND,
  bellFmRatio: BELL_FM_RATIO,
  bellFmIndex: BELL_FM_INDEX,
  bellFmIndexFloor: BELL_FM_INDEX_FLOOR,
  bellAttackS: BELL_ATTACK_S,
  bellReleaseTauDiv: BELL_RELEASE_TAU_DIV,
  pluckAttackS: 0,
  pluckLpfMul: 0,
  stringT60LongS: STRING_T60_LONG_S,
  pluckReleaseStartMul: PLUCK_RELEASE_START_MUL,
  padDetuneCents: PAD_DETUNE_CENTS,
  padAttackS: PAD_ATTACK_S,
  padCutoffOpenMul: PAD_CUTOFF_OPEN_MUL,
  padFilterQ: PAD_FILTER_Q,
  padHoldMul: PAD_HOLD_MUL,
  padReleaseTauDiv: PAD_RELEASE_TAU_DIV,
  bassDrive: BASS_DRIVE,
  bassCutoffMul: BASS_CUTOFF_MUL,
  bassAttackS: BASS_ATTACK_S,
  bassHoldMul: BASS_HOLD_MUL,
  bassReleaseTauDiv: BASS_RELEASE_TAU_DIV,
  choirFormantsHz: CHOIR_FORMANTS_HZ,
  choirFormantQ: CHOIR_FORMANT_Q,
  choirAttackS: CHOIR_ATTACK_S,
  choirHoldMul: CHOIR_HOLD_MUL,
  choirReleaseTauDiv: CHOIR_RELEASE_TAU_DIV,
  choirVibratoHz: CHOIR_VIBRATO_HZ,
  choirVibratoCents: CHOIR_VIBRATO_CENTS,
  swing: 0.5,
  humanizeS: 0,
  humanizeDb: 0,
  accentsDb: NO_ACCENTS,
  padEvolveOctaves: 0,
  cycleBars: [],
  cycleSkip: 0,
  echoSteps: 0,
  echoFeedback: 0,
  echoLpfHz: 2500,
  echoSend: 0,
  breathLowHz: 0,
  breathHighHz: 0,
  breathBars: 0,
  droneBarsPerChord: 0,
  droneOctave: 0,
  droneDb: 0,
  droneFifthOnChoir: false,
  perc: [],
});

const hits = (kind: PercKind, db: number, steps: readonly number[], everyBars = 1): PercHit[] =>
  steps.map((step) => ({ kind, step, db, everyBars }));
/** §1.6: a shaker on the 8ths, −30 dB, with accents [0, −6, −3, −6]. */
const SHAKER_8THS: PercHit[] = [0, 2, 4, 6, 8, 10, 12, 14].map((step, i) => ({
  kind: 'shaker',
  step,
  db: -30 + ([0, -6, -3, -6][i % 4] as number),
  everyBars: 1,
}));

/**
 * What A, B and C share: the mix of §2, the limiter of §3, the per-step accents and the evolving pad of §1, and the
 * plants' cycles of P-009.
 */
const ALIVE: Recipe = {
  ...TODAY,
  mixDb: { bell: -9, bass: -11.5, pad: -6.5, choir: -6.5, pluck: -4, shimmer: -14 },
  heightFloorDb: -12,
  limiterThresholdDb: -18,
  limiterKneeDb: 10,
  limiterRatio: 4,
  limiterAttackS: 0.005,
  limiterReleaseS: 0.3,
  accentsDb: ACCENTS_DB,
  padEvolveOctaves: 0.5,
  cycleBars: CYCLE_BARS,
  cycleSkip: CYCLE_SKIP,
  echoSend: 0.25,
};

/** §4, one column each. */
export const STYLES: Readonly<Record<SoundStyle, Readonly<Recipe>>> = {
  /** Soft and warm: a felt piano and mellow pads. */
  A: {
    ...ALIVE,
    mixDb: { ...ALIVE.mixDb, pluck: -1 }, // the low-pass costs the pluck 2.9 dB
    reverbSend: 0.28,
    bellFmRatio: 1,
    bellFmIndex: 1.2,
    bellAttackS: 0.008,
    pluckAttackS: 0.006,
    pluckLpfMul: 4,
    stringT60LongS: 3.5,
    padCutoffOpenMul: 2,
    padFilterQ: 0,
    padDetuneCents: [-4, 0, 4],
    padAttackS: 0.6,
    bassDrive: 2,
    bassCutoffMul: 5,
    choirFormantsHz: [450, 800, 2830],
    choirFormantQ: 4,
    choirAttackS: 0.35,
    swing: 0.56,
    humanizeS: 0.008,
    humanizeDb: 2,
    echoSteps: 3,
    echoFeedback: 0.3,
    echoLpfHz: 2000,
    breathLowHz: 2500,
    breathHighHz: 8000,
    breathBars: 8,
    droneBarsPerChord: 2,
    droneOctave: 0,
    droneDb: -8,
    perc: [...hits('kick', -22, [0, 8]), ...SHAKER_8THS],
  },
  /** Bright and glassy: bells and chimes. */
  B: {
    ...ALIVE,
    mixDb: { ...ALIVE.mixDb, choir: -2.5, bass: -8 },
    reverbSend: 0.24,
    bellFmIndex: 1.6,
    bellFmIndexFloor: 0.3,
    bellReleaseTauDiv: 3.5,
    stringT60LongS: 3,
    pluckReleaseStartMul: 0.8,
    padCutoffOpenMul: 6,
    padFilterQ: 3,
    padDetuneCents: [-10, 0, 10],
    bassHoldMul: 0.1,
    bassCutoffMul: 10,
    choirFormantsHz: [300, 2200, 3000],
    choirFormantQ: 6,
    swing: 0.54,
    humanizeS: 0.004,
    humanizeDb: 1.5,
    echoSteps: 2,
    echoFeedback: 0.4,
    echoLpfHz: 6000,
    breathLowHz: 5000,
    breathHighHz: 16000,
    breathBars: 4,
    droneBarsPerChord: 2,
    droneOctave: 1,
    droneDb: -10,
    perc: [
      ...hits('tick', -32, [0, 3, 6, 8, 11, 14]),
      ...hits('clave', -26, [4, 12]),
      ...hits('kick', -22, [0]),
    ],
  },
  /** Deep and ambient: low pads and slow attacks. */
  C: {
    ...ALIVE,
    reverbSend: 0.35,
    bellAttackS: 0.03,
    bellFmIndex: 1.2,
    bellReleaseTauDiv: 3,
    pluckAttackS: 0.02,
    stringT60LongS: 4,
    pluckReleaseStartMul: 1,
    padAttackS: 1.2,
    padHoldMul: 1.5,
    padReleaseTauDiv: 2.5,
    padCutoffOpenMul: 2.5,
    bassAttackS: 0.06,
    bassHoldMul: 0.6,
    bassReleaseTauDiv: 8,
    choirFormantsHz: [350, 700, 2500],
    choirAttackS: 0.8,
    choirHoldMul: 1,
    choirVibratoHz: 3.5,
    choirVibratoCents: 6,
    swing: 0.52,
    humanizeS: 0.012,
    humanizeDb: 2.5,
    echoSteps: 6,
    echoFeedback: 0.5,
    echoLpfHz: 1500,
    breathLowHz: 1500,
    breathHighHz: 6000,
    breathBars: 8,
    droneBarsPerChord: 4,
    droneOctave: 0,
    droneDb: -6,
    droneFifthOnChoir: true,
    perc: [...hits('kick', -22, [0]), ...hits('kick', -28, [2]), ...hits('breath', -30, [0], 2)],
  },
};
