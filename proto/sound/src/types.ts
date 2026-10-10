// Mirrors API_SPEC §1.1 (garden types) and §1.2 (audio types) so the engine can move to src/audio in T-121.
// The v1.2 deltas of PLAN_AMENDMENT_2026-10-10 §6.3 are applied: pentatonic modes (D-025) and signature v1 (D-021).

export type VoiceType = 'bell' | 'pad' | 'pluck' | 'bass' | 'choir' | 'shimmer';

export interface Cell {
  /** 0..4, 0 = inner ring (lowest pitch). */
  ring: number;
  /** 0..15 around the bed. */
  step: number;
}

export interface Plant {
  id: string;
  voice: VoiceType;
  cell: Cell;
  /** 0..1 → gain and sustain (FR-MUS-05). */
  height: number;
  /** 0..1, fixed at seed creation → filter cutoff and detune (FR-MUS-05). */
  hue: number;
  plantedAt: number;
}

/** Anhemitonic pentatonic sets only (D-025): adjacent rings can never be a semitone apart. */
export type ModeId = 'majorPent' | 'minorPent' | 'susPent';
export type ReverbSize = 'small' | 'medium' | 'large';
export type KeyRoot = -3 | 0 | 2 | 4;
export type Tempo = 72 | 84 | 96;

export interface RoomSignature {
  /** Semitones from C: A = −3, C = 0, D = 2, E = 4 (LLD §5.2). */
  keyRoot: KeyRoot;
  mode: ModeId;
  /** Kept in the type, but the constant 84 in v1: the room does not set the tempo (D-021). */
  tempo: Tempo;
  /** Reverb decay in seconds, clamped 0.3..2.0 (FR-ROOM-06). The one shared reverb follows this. */
  reverbRt60: number;
  /** Three-way label derived from `reverbRt60` for the Settings UI; the audio does not read it (PLAN_AMENDMENT §6.3). */
  reverbSize: ReverbSize;
  starterVoices: [VoiceType, VoiceType, VoiceType];
  paletteSeed: number;
}

/** Fallback signature when the room is unknown (REPLAN §4, FR-ROOM-11). */
export const WANDERER: RoomSignature = Object.freeze({
  keyRoot: 0,
  mode: 'majorPent',
  tempo: 84,
  reverbRt60: 0.9,
  reverbSize: 'medium',
  starterVoices: ['bell', 'pad', 'pluck'] as [VoiceType, VoiceType, VoiceType],
  paletteSeed: 0,
});

export interface VoiceParams {
  hz: number;
  /** Linear amplitude 0..1 (from height, −24..0 dB). */
  gain: number;
  /** Seconds, 0.2..2.5 (from height). */
  release: number;
  /** Filter cutoff multiplier 0.5..2 (from hue, ±1 octave). */
  cutoffMul: number;
  /** Cents, −8..+8 (from hue). */
  detune: number;
}

export interface Voice {
  trigger(time: number, p: VoiceParams): void;
  dispose(): void;
  /** Optional: heavy per-plant preparation (e.g. the pluck renders its string) done outside the scheduler tick. */
  prepare?(p: VoiceParams): void;
}
