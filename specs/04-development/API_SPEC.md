# API Specification — Internal Module Contracts, Event Bus, Storage Schema, URL Flags

**Status:** Living · **Owner:** software-architect
Roomsong has **no HTTP API** (static app, no backend). This document is the contract **between modules**.
Rule: change this file first, then the code, in the same PR. Breaking changes bump the section's version note.

---

## 1. Module public interfaces (TypeScript)

### 1.1 `garden/` (pure, no side effects)
```ts
export type VoiceType = 'bell' | 'pad' | 'pluck' | 'bass' | 'choir' | 'shimmer'; // shimmer = Should (S5)
export const BED_INNER = 0.12, BED_OUTER = 0.30, RINGS = 5, STEPS = 16;       // annulus bed, 80 cells (LLD §5.1)
export interface Cell { ring: number /* 0..4, 0 = inner ring */; step: number /* 0..15 */ }
export interface Seed  { id: string; voice: VoiceType; hue: number /* 0..1, fixed at creation */; receivedAt: number }
export interface Plant { id: string; voice: VoiceType; cell: Cell; height: number /* 0..1 */; hue: number /* copied from the seed; not shapeable (C3) */; plantedAt: number }
export interface GardenState {
  version: 1; bedInner: 0.12; bedOuter: 0.30; bedHeightOffset: number; // metres; ±0.10
  plants: Plant[]; seeds: Seed[]; lastSeedDate: string /* YYYY-MM-DD local */;
  createdAt: number; lastVisitAt: number; visits: number; codex: { discovered: VoiceType[] }; // codex kept for schema stability; no Codex UI (cut, D-011)
  anchorHandle?: string; settings: Settings;
}
export interface Settings {
  tempo: number /* 60..120; 'auto' follows the signature until the user moves the slider */; volume: number /* 0..1 */; reverb: 'auto' | 'small' | 'off';
  oneHand: boolean; gazeDwell: boolean; highContrast: boolean; reducedMotion: boolean; beatRing: boolean;
  dominantHand: 'left' | 'right'; hintsEnabled: boolean;
}
// Room signature (LLD §5.8, FR-ROOM-10..13). Types live here because garden/ is the pure module; room/ produces RoomFeatures.
export interface RoomFeatures {
  level: 1 | 2 | 3 | 4;                 // placement level reached
  tableHeight?: number;                 // m above floor (L1/L2)
  tableArea?: number;                   // m²
  floorArea?: number;                   // m²
  wallCount?: number;                   // vertical planes ≥ 1.5 m tall
  ceilingHeight?: number;               // m
  largestWallWidth?: number;            // m
}                                       // undefined = unknown → default bucket
export type ModeId = 'majorPent' | 'dorianHex' | 'lydianHex';
export interface RoomSignature {
  keyRoot: -3 | 0 | 2 | 4;              // semitones from C (A, C, D, E)
  mode: ModeId;
  tempo: 72 | 84 | 96;
  reverbSize: 'small' | 'medium' | 'large';
  starterVoices: [VoiceType, VoiceType, VoiceType];
  paletteSeed: number;                  // uint32 hash of the bucket tuple; 0 = Wanderer
}
export const WANDERER: RoomSignature;   // C majorPent, 84, medium, [bell,pad,pluck], 0
export function roomSignature(features: RoomFeatures): RoomSignature; // pure, deterministic, quantised; level ≥ 3 → WANDERER
export function chordDegrees(mode: ModeId): [0, 2, 4];                // tuning-ripple notes = rings 0, 2, 4
// Pure reducers: never mutate input; return a new state (structural sharing allowed).
export function plantSeed(s: GardenState, seedId: string, cell: Cell, now: number): Result<GardenState>;
export function movePlant(s: GardenState, plantId: string, cell: Cell): Result<GardenState>;
export function setHeight(s: GardenState, plantId: string, height: number): GardenState;
export function removePlant(s: GardenState, plantId: string): { state: GardenState; undo: UndoToken };   // was prune
export function undoRemove(s: GardenState, token: UndoToken): GardenState;                              // was undoPrune; token valid 5 s
export function applyVisit(s: GardenState, now: number, sig: RoomSignature): { state: GardenState; grown: GrowthDelta[]; newSeeds: Seed[] }; // starter seeds use sig.starterVoices
export function stageFor(ageMs: number): 0 | 1 | 2 | 3;
export type BedZone = 'inner' | 'bed' | 'outer';
export function bedZone(bedLocal: Vec2): BedZone;                     // inner < 0.09 m, outer > 0.35 m
export function snapToCell(bedLocal: Vec2): Cell | null;              // null when bedZone ≠ 'bed'
export function cellCentre(cell: Cell, out: Vec2): Vec2;              // bed-local; allocation-free
export function nearestFreeCell(s: GardenState, cell: Cell): Cell | null;
export type Result<T> = { ok: true; value: T } | { ok: false; reason: 'occupied' | 'full' | 'notFound' | 'noSeed' };
```
Removed (D-011): `SeasonId`, `seasonFor()`, `setHue()` (hue is set once at seed creation; a settings-control hue shaper is Could C3 and would re-add `setHue` then).

### 1.2 `audio/`
```ts
export interface AudioEngine {
  init(ctx?: AudioContext): Promise<void>;            // must be called from a user gesture
  setTempo(bpm: number): void; setVolume(v: number): void; setReverb(size: 'small'|'medium'|'large'|'off'): void;
  setSignature(sig: RoomSignature): void;              // re-tunes all plants in place (key/mode), applies tempo + reverb unless the user overrode them
  chordTone(degree: 0 | 2 | 4, time: number): void;    // one tuning-ripple note of the room chord on the audio clock (LLD §5.8)
  syncPlants(plants: readonly Plant[], bedPose: Mat4): void; // idempotent; diff-based
  preview(plant: Plant): void;                         // quiet live preview while shaping
  ui(sound: 'tick'|'confirm'|'bump'|'removeRev'|'undoFwd'|'placed'|'goodnight'): void; // confirm = room chord
  enterListen(): void; exitListen(): void;             // dims; variations (Could) on/off
  suspend(): Promise<void>; resume(): Promise<void>;
  readonly clock: { now(): number; barPhase(): number; stepIndex(): number }; // audio-clock based
  readonly stats: { voices: number; cpuEstimate: number };
}
export interface Voice { trigger(time: number, p: VoiceParams): void; dispose(): void }
export interface VoiceParams { hz: number; gain: number; release: number; cutoffMul: number; detune: number }
```

### 1.3 `room/`
```ts
export type PlacementLevel = 1 | 2 | 3 | 4;
export interface BedPlacement { pose: Mat4; level: PlacementLevel; surfaceId?: string }
export interface PlacementSolver { run(opts: { timeoutMs: number }): Promise<BedPlacement>; cancel(): void }
export interface AnchorStore {
  supported(): boolean;
  create(pose: Mat4): Promise<string /* handle */>;
  restore(handle: string, timeoutMs: number): Promise<Mat4 | null>;
  clear(): Promise<void>;
}
export interface WallFinder { nearestWalls(from: Vec3, max: number, within: number): WallPlane[] }   // Should (S2)
export interface RoomFeatureExtractor { extract(placement: BedPlacement): RoomFeatures }            // FR-ROOM-10; replaces RoomSize (floor area is a feature)
export interface RoomSurfaces { table?: SurfaceRef; nearestWall?: SurfaceRef; ceiling?: SurfaceRef } // for the tuning ripple
export interface SurfaceRef { id: string; pose: Mat4; extents: Vec2 /* width, height in plane space */ }
```

### 1.4 `hands/`
```ts
export interface HandFrame { hand: 'left'|'right'; tracked: boolean; pinch: boolean; pinchPos: Vec3; palmNormal: Vec3; velocity: Vec3 } // wristRoll removed (twist cut)
export type GestureEvent =
  | { type: 'gesture:palmUp'; hand: Hand }
  | { type: 'gesture:pinchStart'; hand: Hand; target: TargetRef | null; pos: Vec3 }
  | { type: 'gesture:pull'; hand: Hand; target: TargetRef; dy: number }
  | { type: 'gesture:drag'; hand: Hand; target: TargetRef; pos: Vec3; zone: BedZone }
  | { type: 'gesture:release'; hand: Hand; target: TargetRef | null; pos: Vec3; zone: BedZone } // zone = bedZone(bed-local pos); 'outer' on a dragged plant = remove (FR-HND-11)
  | { type: 'gesture:palmsOut' } | { type: 'gesture:wake' } | { type: 'gesture:trackingLost'; hand: Hand };
export interface TargetRef { kind: 'plant'|'seed'|'orb'|'undo'|'bed'|'panel'; id: string }
```

### 1.5 `persistence/`
```ts
export interface Store {
  load(): Promise<GardenState | null>;     // validates + migrates; on corrupt → backup + null
  save(state: GardenState): Promise<void>; // debounced by PersistenceSystem, direct here
  backupKey(): string;
}
```

### 1.6 `access/`
```ts
export interface GazeDwell { enabled: boolean; setTargets(t: TargetRef[]): void; onSelect(cb: (t: TargetRef) => void): void }
```

## 2. Event bus (`core/events.ts`)
Typed pub/sub, synchronous, no async handlers in hot paths.

| Event | Payload | Emitter → Consumers |
|---|---|---|
| `xr:sessionStart` / `xr:sessionEnd` / `xr:visibility` | `{ visible: boolean }` | core → audio, persistence, ui |
| `room:placementLevel` | `{ level }` | room → ui, log |
| `room:bedPlaced` | `{ placement }` | room → garden, render, audio |
| `room:features` | `{ features: RoomFeatures, surfaces: RoomSurfaces }` | room → garden, log (≤ 3 s after session start; FR-ROOM-10) |
| `room:signature` | `{ signature: RoomSignature }` | garden → audio, render (TuningRipple, palette), onboarding, log (FR-ROOM-11/13) |
| `room:tuned` | `{}` | render (TuningRipple) → onboarding, ui (≤ 4 s after `room:signature`; FR-ROOM-12) |
| `room:wallsFound` | `{ walls }` | room → render (Should) |
| `gesture:*` | see §1.4 | hands/access → garden, onboarding, ui |
| `garden:changed` | `{ state, diff }` | garden → audio, render, persistence, ui |
| `garden:removed` | `{ plantId, undoToken, expiresAt }` | garden → render (undo petal at the release point), audio (`removeRev`), ui; `expiresAt = now + 5000` (FR-HND-11, FR-MUS-12) |
| `garden:grown` | `{ deltas }` | garden → render, audio |
| `garden:seedArrived` | `{ seed }` | garden → render, onboarding |
| `listen:enter` / `listen:exit` | `{}` | garden → audio, render, ui |
| `onboarding:step` | `{ step }` | onboarding → ui |
| `perf:sample` | `{ fps, draws, tris, jsMs, voices }` | render → perf hud, tests |

## 3. URL flags (`core/flags.ts`) — dev/test only, ignored in prod builds unless `?dev=1`
`perfHud` · `fovGuide` · `eventLog` · `noAnchors` · `noPlanes` · `noMeshes` · `forceLevel=1..4` · `fakeDay=+N` · `seed=<int>` (deterministic variations) · `autoplant=N` (plants N random seeds for perf tests) · `skipOnboarding` · `forceSignature=wanderer` (skip room features; use `WANDERER`) · `pinchTest` (opens the pinch-accuracy page, TC-DEV-00 / T-105) · `capSpike` (opens the capability-spike probe page, TC-DEV-0A / T-104).

## 4. Storage schema (IndexedDB db `roomsong`, store `garden`, key `state`)
`GardenStateV1` as in §1.1 (`bedInner`/`bedOuter` are stored as constants for forward compatibility; `bedRadius` never shipped). The room signature is **not** stored; it is recomputed each session (FR-ROOM-13). Backup at key `state.backup.<timestamp>`; keep the latest 2.
Migration policy: `migrations.ts` has `migrate(v: unknown): GardenState | null`; unknown versions → null (new garden, backup kept).

## 5. Error codes (for logs and captions)
`E_XR_UNSUPPORTED`, `E_HANDS_UNAVAILABLE`, `E_PLACEMENT_TIMEOUT` (non-fatal → L4), `E_ANCHOR_RESTORE` (non-fatal), `E_SAVE_FAILED`, `E_AUDIO_CONTEXT`.

## 6. Versioning
Module interface changes: note here under a "Changelog" entry with date, PR, and reason.

### Changelog
- 2026-10-09 — v1.0 initial contracts.
- 2026-10-10 — v1.1 (REPLAN_2026-10-10, D-010/D-011; no PR yet, pre-scaffold). garden: `Cell.ring` 0..4 (annulus, 5×16 = 80 cells); `GardenState.bedRadius` → `bedInner: 0.12; bedOuter: 0.30`; `snapToCell(bedLocal)` (no radius arg) returns `Cell | null`; added `bedZone`, `cellCentre`, `BED_*`/`RINGS`/`STEPS` constants; `prune`/`undoPrune` → `removePlant`/`undoRemove`; removed `setHue` (hue fixed at seed creation), `SeasonId`, `seasonFor`; added `RoomFeatures`, `RoomSignature`, `ModeId`, `WANDERER`, `roomSignature()`, `chordDegrees()`; `applyVisit` takes the signature for starter voices. audio: `setSeason` → `setSignature`; added `chordTone`; ui sound `pruneRev` → `removeRev`. room: `RoomSize` → `RoomFeatureExtractor`; added `RoomSurfaces`/`SurfaceRef`. hands: removed `wristRoll` and `gesture:twist`; `gesture:release.flick` → `zone: BedZone`; `gesture:drag` carries `zone`. events: added `room:features`, `room:signature`, `room:tuned`, `garden:removed`. flags: added `forceSignature=wanderer`, `pinchTest`, `capSpike`.
