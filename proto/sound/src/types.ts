// The page's types. The garden and audio types it mirrored until T-121 now come from src/garden and src/audio.
import type { Voice as AudioVoice, VoiceParams } from '../../../src/audio/voices/note';
import type { RoomSignature, VoiceType } from '../../../src/garden/index';

export type { VoiceParams } from '../../../src/audio/voices/note';
export type { Cell, ModeId, Plant, RoomSignature, VoiceType } from '../../../src/garden/index';

export type Tempo = 72 | 84 | 96;

/** Fallback signature when the room is unknown (REPLAN §4, FR-ROOM-11). garden/ exports its own with T-141. */
export const WANDERER: RoomSignature = Object.freeze({
  keyRoot: 0,
  mode: 'majorPent',
  tempo: 84,
  reverbRt60: 0.9,
  reverbSize: 'medium',
  starterVoices: ['bell', 'pad', 'pluck'] as [VoiceType, VoiceType, VoiceType],
  paletteSeed: 0,
});

/** The app's Voice, plus the page's own per-plant preparation (its Pluck renders one string per plant). */
export interface Voice extends AudioVoice {
  /** Heavy per-plant work done outside the scheduler tick. */
  prepare?(p: VoiceParams): void;
}
