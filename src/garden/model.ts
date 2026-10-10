// The garden's data (API_SPEC §1.1). Plain data, no methods; the only import is core's Settings type.
import type { Settings } from '../core/index.js';

export type VoiceType = 'bell' | 'pad' | 'pluck' | 'bass' | 'choir' | 'shimmer'; // shimmer = Should (S5)

export interface Cell {
  ring: number; // 0..4, 0 = inner ring
  step: number; // 0..15; step 0 is at bed-local +x, step 4 nearest the user (D-029)
}
export interface Seed {
  id: string;
  voice: VoiceType;
  hue: number; // 0..1, fixed at creation
  receivedAt: number;
}
export interface Plant {
  id: string;
  voice: VoiceType;
  cell: Cell;
  height: number; // 0..1
  hue: number; // copied from the seed; not shapeable (C3)
  plantedAt: number;
}

/** FR-ROOM-01 fallback level. Declared here, not in room/: GardenState and RoomFeatures hold one. */
export type PlacementLevel = 1 | 2 | 3 | 4;

export interface GardenState {
  version: 1;
  bedInner: 0.12;
  bedOuter: 0.3;
  bedHeightOffset: number; // metres; ±0.10
  plants: Plant[];
  seeds: Seed[];
  lastSeedDate: string; // YYYY-MM-DD local
  createdAt: number;
  lastVisitAt: number;
  visits: number;
  codex: { discovered: VoiceType[] }; // kept for schema stability; no Codex UI (cut, D-011)
  // Set together by setAnchor(), absent together. The level is saved because a bed that comes back from an
  // anchor has no placement chain to report one (API_SPEC §1.3).
  anchorHandle?: string;
  anchorLevel?: PlacementLevel;
  settings: Settings; // written by persistence; the reducers never change it (API_SPEC §2)
}

/**
 * What room/ measured (LLD §5.8, FR-ROOM-10). An unknown field is omitted, never assigned undefined; a value
 * that is not finite or not > 0 counts as unknown.
 */
export interface RoomFeatures {
  level: PlacementLevel; // placement level reached
  tableHeight?: number; // m above the floor (L1/L2)
  tableArea?: number; // m²
  floorArea?: number; // m²; the floor plane, else the footprint rectangle of the walls
  wallCount?: number; // vertical planes ≥ 1.5 m tall
  ceilingHeight?: number; // m
  largestWallWidth?: number; // m
  roomVolume?: number; // m³; floorArea × ceilingHeight, else the global-mesh bounds, else unknown
}

/** Modes are anhemitonic pentatonic sets (D-025): two plants on adjacent rings are never a semitone apart. */
export type ModeId = 'majorPent' | 'minorPent' | 'susPent';
type Degrees = readonly [number, number, number, number, number];
/** Semitones above keyRoot, one per ring (LLD §5.2). */
export const MODE_DEGREES: Readonly<Record<ModeId, Degrees>> = Object.freeze({
  majorPent: Object.freeze<Degrees>([0, 2, 4, 7, 9]),
  minorPent: Object.freeze<Degrees>([0, 3, 5, 7, 10]),
  susPent: Object.freeze<Degrees>([0, 2, 5, 7, 10]),
});

export interface RoomSignature {
  keyRoot: -3 | 0 | 2 | 4; // semitones from C (A, C, D, E). v1: from floor area; a bigger room, a lower root
  mode: ModeId; // v1: from ceiling height
  tempo: number; // v1: always core's DEFAULT_TEMPO_BPM; the room does not set it (D-021)
  reverbRt60: number; // seconds; one of REVERB_RT60_STEPS_S (LLD §5.8)
  reverbSize: 'small' | 'medium' | 'large'; // label for the Settings UI only; it sets nothing in audio/
  starterVoices: [VoiceType, VoiceType, VoiceType];
  paletteSeed: number; // uint32 hash of the bucket tuple; 0 = Wanderer
}

/** The removed plant. GardenSystem keeps its 5 s life (garden:removed.expiresAt): reducers have no clock. */
export interface UndoToken {
  readonly plant: Plant;
}
/** Growth stage before and after (stageFor). */
export interface GrowthDelta {
  plantId: string;
  from: 0 | 1 | 2 | 3;
  to: 0 | 1 | 2 | 3;
}

export type BedZone = 'inner' | 'bed' | 'outer';

export type Result<T> =
  { ok: true; value: T } | { ok: false; reason: 'occupied' | 'full' | 'notFound' | 'noSeed' };
