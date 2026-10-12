# API Specification — Internal Module Contracts, Event Bus, Storage Schema, URL Flags

**Status:** Living · **Owner:** software-architect · **Version:** 1.2.13 (2026-10-12, T-128 wiring contract, reviewed: new §1.10 and the changes it needs elsewhere, not built yet, see the Changelog; v1.2.12 was T-140, room feature extraction as built and reviewed; v1.2.11 was T-144, Bass and Choir voices; v1.2.10 was T-161, daily seed and growth as built and reviewed; v1.2.9 was T-125, the render contract as built and reviewed; v1.2.8 was T-126, the ui contract as built and reviewed, new §1.9; v1.2.7 was T-141, the room signature as built and reviewed; v1.2.6 was T-123, the room contract as built and reviewed, with the reach rule of D-034; v1.2.5 was T-122, the persistence contract as built and reviewed; v1.2.4 was T-121, the audio contract as built and reviewed; v1.2.3 was T-124, the hands contract as built and reviewed; v1.2.2 was T-120 and D-029/D-031, the garden contract as built and reviewed; on plan v2.1 of 2026-10-10: PLAN_AMENDMENT_2026-10-10 §6; D-020, D-021, D-025; v1.2.1 added core's runtime surface as built in T-106)
Roomsong has **no HTTP API** (static app, no backend). This document is the contract **between modules**.
Rule: change this file first, then the code, in the same PR. Breaking changes bump the section's version note.

---

## 1. Module public interfaces (TypeScript)

**Dependency direction (v1.2).** `core/` imports no other Roomsong module; the only package it may import is `@iwsdk/core`, in `core/components.ts`. `garden/` imports only `core/`: its pure files (`model`, `rules`, `snap`, `signature`, `growth`, `config`) take plain types only (`import type`, so no IWSDK or Three.js code is loaded with them), and `garden/GardenSystem.ts`, the garden's state holder, a plain class and not an ECS system (§1.10), also uses core's bus, clock, flags, log and settings store. `room/`, `hands/`, `audio/` and `persistence/` import `core/` and `garden/`. `render/`, `ui/`, `access/`, `onboarding/` and `window/` may import any module named before them. Only `src/index.ts` (the boot) and `src/app.ts` (the wiring it loads, §1.10) import across all modules. An import goes through the other module's `index.ts`, with two rules that keep the SDK out of the boot chunk (§1.10 rule 1): every importer of the three shared components takes them from `core/components.js`, which `core/index.ts` does not re-export; and `src/index.ts` takes `mountLanding` from `ui/Landing.js`, because `ui/index.ts` also exports `CaptionSystem`. Nothing imports upward, and modules on the same level talk through the event bus (§2) or a shared component, never through imports.
**Shared ECS components.** A component has to be imported to be queried or attached, so a component that a module on the same level or a lower level uses is declared in `core/components.ts`: `BedAnchor` (room writes it; hands, render and audio read it), `Interactable` (render and ui attach it; hands and access read it) and `Caption` (any module raises one; ui is the only reader). Every other component stays with the module that writes it and is read only from above: today that is `HandState` in `hands/` alone. Fields: LLD §3.1. All of them are registered in `src/components.ts`. Not components: `RoomSurfaces` is a plain type of `room/` that travels in `room:features` (§2); `PlantView` is *Cut (T-128 contract)*, nothing would read it; `VineTarget` belongs to the vines (Could, C4) and is not built.

### 1.0 `core/` (the base; imports no other module)
```ts
export type Hand = 'left' | 'right';
// Plain data, no methods. A Three.js Vector2 / Vector3 satisfies Vec2 / Vec3 structurally, so hands/, render/ and room/
// pass their own vectors with no copy and no allocation, and garden/ never imports Three.js.
export interface Vec2 { x: number; y: number }
export interface Vec3 { x: number; y: number; z: number }
export type Mat4 = ArrayLike<number>;   // 16 numbers, column-major: the layout of THREE.Matrix4.elements. A callee only reads it
export const DEFAULT_TEMPO_BPM = 84;    // FR-MUS-03: the one default tempo. Settings.tempo starts here, and RoomSignature.tempo is always
                                        // this value in v1 (the room does not set the tempo, D-021). The research band is 60–80 BPM;
                                        // the listening review T-103 may change this default (sheet 6.2)
export const CAPTION_MIN_MS = 1200;     // a caption stays on screen at least this long (LLD §5.8)
// Settings lives here since v1.2: core/settings.ts (SettingsStore) needs the type and core/ may import no other module.
// garden/ imports it (type only) for GardenState.settings.
export interface Settings {
  tempo: number /* 60..120 BPM, default DEFAULT_TEMPO_BPM; the room does not set the tempo in v1 (D-021) */; volume: number /* 0..1 */; reverb: 'auto' | 'small' | 'off';
  oneHand: boolean; gazeDwell: boolean; dwellMs: 600 | 900 | 1200 /* gaze dwell time, default 900 (FR-HND-12) */;
  highContrast: boolean; reducedMotion: boolean; beatRing: boolean;
  dominantHand: Hand; hintsEnabled: boolean;
}
export interface EventMap { /* only the events declared in core/: xr:* and settings:changed; every other module merges in the events it emits (§2) */ }

// Runtime surface (v1.2.1, as built in T-106). Everything here is exported from core/index.ts.
export const bus: {                                         // the one event bus (§2)
  on<K extends keyof EventMap>(type: K, handler: (payload: EventMap[K]) => void): () => void;   // returns the unsubscribe
  once<K extends keyof EventMap>(type: K, handler: (payload: EventMap[K]) => void): () => void; // removed just before its first call
  off<K extends keyof EventMap>(type: K, handler: (payload: EventMap[K]) => void): void;
  emit<K extends keyof EventMap>(type: K, payload: EventMap[K]): void;                          // synchronous; allocates nothing
};
export interface Clock { now(): number /* ms since the epoch + the fakeDay offset */; setSource(source: () => number /* ms */): void }
export const clock: Clock;                                  // the app clock: plantedAt, lastVisitAt, expiresAt, Caption.expiresAt. Not the audio clock (§1.2)
export function createClock(source: () => number, offsetMs?: number): Clock; // for a test's fake clock
export type Flags = Readonly<{                              // §3
  dev: boolean;                                             // the gate: a dev build, or dev=1 in the URL
  perfHud: boolean; fovGuide: boolean; eventLog: boolean; noAnchors: boolean; noPlanes: boolean; noMeshes: boolean;
  skipOnboarding: boolean; pinchTest: boolean; capSpike: boolean; window: boolean;
  forceLevel: 1 | 2 | 3 | 4 | null; fakeDay: number; seed: number | null; autoplant: number; forceSignature: 'wanderer' | null;
}>;
export const flags: Flags;                                  // this page load's flags, frozen
export function parseFlags(search: string, isDevBuild: boolean): Flags;      // never throws; for tests and tools
export const DEFAULT_SETTINGS: Readonly<Settings>;          // tempo 84 (DEFAULT_TEMPO_BPM), volume 0.8, reverb 'auto', dwellMs 900, beatRing true,
                                                            // hintsEnabled true, dominantHand 'right'; oneHand, gazeDwell, highContrast, reducedMotion false
export function validateSettings(raw: unknown, fallback?: Readonly<Settings>): Settings; // never throws. Per field: a valid value is kept, a finite
                                                            // number out of range is clamped, anything else takes the fallback's value; unknown keys are dropped
export interface SettingsStore { get(): Readonly<Settings>; set(patch: Partial<Settings>): void }
export const settings: SettingsStore;                       // starts at DEFAULT_SETTINGS. set() validates, freezes and emits settings:changed (§2). It saves nothing
export type ErrorCode = 'E_XR_UNSUPPORTED' | 'E_HANDS_UNAVAILABLE' | 'E_PLACEMENT_TIMEOUT' | 'E_ANCHOR_RESTORE' | 'E_SAVE_FAILED' | 'E_AUDIO_CONTEXT'; // §5
export interface LogEntry { level: 'debug' | 'info' | 'warn' | 'error'; scope: string; msg: string; data: unknown }
export const log: {                                         // an expected failure: log.error('hands', 'E_HANDS_UNAVAILABLE', err). A designed fallback that is a
                                                            // normal path is logged at warn: log.warn('room', 'E_PLACEMENT_TIMEOUT') (non-fatal: the floating bed, §5)
  debug(scope: string, msg: string, data?: unknown): void; info(scope: string, msg: string, data?: unknown): void;
  warn(scope: string, msg: string, data?: unknown): void;  error(scope: string, msg: string, data?: unknown): void;
  recent(): LogEntry[];                                     // the last 64 entries, oldest first, for the perf HUD; a new array, not for a hot path
};
export class Pool<T extends object> {                       // pre-allocated; acquire and release allocate nothing
  constructor(factory: () => T, initialSize: number);
  acquire(): T;                                             // an empty pool creates exactly one more object and counts it in `grown`; it never refuses
  release(item: T): boolean;                                // false, and nothing changes, for a second release or a foreign object
  readonly size: number; readonly grown: number; readonly inUse: number;
}
export const STRINGS: Readonly<Record<StringKey, string>>;  // the caption table (below). The message of a failure has its ErrorCode as its key
export type StringKey = keyof typeof STRINGS;               // 'rippleTableSeeds' | 'rippleTableColour' | 'rippleWalls' | 'rippleCeiling' | 'E_SAVE_FAILED' so far.
                                                            // T-128 adds three: placeLook "Look at your table, and pinch" · placeLookGaze "Look at your
                                                            // table, and wait" (UX §9.2, the level-3 hint) · E_AUDIO_CONTEXT "Sound unavailable" (a session
                                                            // with no sound, §1.10 rule 2; the wording is UX's to confirm)
export const BedAnchor, Interactable, Caption;              // the shared ECS components (above); fields: LLD §3.1. Exported from core/components.ts
                                                            // and NOT from core/index.ts: that file is the one that loads @iwsdk/core, and the landing
                                                            // page's chunk must not (§1.10 rule 1). Every importer uses core/components.js
```
**Runtime rules (v1.2.1).** `log`: without `Flags.dev`, debug and info are dropped before any work; warn and error always reach the console and the ring. `bus`: one function is one subscription per event, as with `addEventListener`; `on`, `once` and `off` allocate and never run per frame. `core/` builds `flags`, `log` and `clock` once, when it is first imported; every other module follows the `Flags` rule of §3.
**Strings.** `STRINGS` is the caption table: everything a `Caption.key` may name, at most six words each (FR-UI-01; tuning-ripple captions have their own smaller limits, LLD §5.8). The 2D page's copy lives in `ui/strings.ts` (§1.9). There is no user-facing text anywhere else, except the two things `index.html` must hold without a script: the page title and the `<noscript>` line.
**Axes (D-029).** Bed-local space: +x points to the seated user's right, +y up, +z from the bed centre toward the user; the PlacementSolver places the bed that way (LLD §5.5). A bed-local `Vec2` is the bed's horizontal plane: `x` = bed-local x, `y` = bed-local z. `snapToCell`, `bedZone` and `cellCentre` (§1.1) take and return that; the height is dropped before the call. Step 0 is at +x and the steps advance toward +z, clockwise seen from above: step 4 is nearest the user, step 8 on the left, step 12 farthest (`θ = atan2(z, x)`, LLD §5.1). `SurfaceRef.extents` (§1.3) is `x` = width, `y` = height in the plane's own space.

### 1.1 `garden/` (pure, no side effects)
```ts
export type VoiceType = 'bell' | 'pad' | 'pluck' | 'bass' | 'choir' | 'shimmer'; // shimmer = Should (S5)
export const BED_INNER = 0.12, BED_OUTER = 0.30, RINGS = 5, STEPS = 16;       // annulus bed, 80 cells (LLD §5.1)
export interface Cell { ring: number /* 0..4, 0 = inner ring */; step: number /* 0..15 */ }
export interface Seed  { id: string; voice: VoiceType; hue: number /* 0..1, fixed at creation */; receivedAt: number }
export interface Plant { id: string; voice: VoiceType; cell: Cell; height: number /* 0..1 */; hue: number /* copied from the seed; not shapeable (C3) */; plantedAt: number }
export type PlacementLevel = 1 | 2 | 3 | 4;   // FR-ROOM-01 fallback level. Declared here, not in room/: GardenState and RoomFeatures hold one
export interface GardenState {
  version: 1; bedInner: 0.12; bedOuter: 0.30; bedHeightOffset: number; // metres; ±0.10
  plants: Plant[]; seeds: Seed[]; lastSeedDate: string /* YYYY-MM-DD local */;
  createdAt: number; lastVisitAt: number; visits: number; codex: { discovered: VoiceType[] }; // codex kept for schema stability; no Codex UI (cut, D-011)
  anchorHandle?: string; anchorLevel?: PlacementLevel; // set together by setAnchor(), absent together. The level is saved because a bed
                                                       // that comes back from an anchor has no placement chain to report one (§1.3)
  settings: Settings;
}
// Settings: moved to core/ (§1.0) in v1.2. garden/ imports the type; the stored shape is unchanged apart from dwellMs.
// Room signature (LLD §5.8, FR-ROOM-10..13). Types live here because garden/ is the pure module; room/ produces RoomFeatures.
export interface RoomFeatures {
  level: PlacementLevel;                // placement level reached
  tableHeight?: number;                 // m above floor (L1/L2)
  tableArea?: number;                   // m²
  floorArea?: number;                   // m²; the floor plane, else the footprint rectangle of the walls (LLD §5.8)
  wallCount?: number;                   // vertical planes ≥ 1.5 m tall
  ceilingHeight?: number;               // m
  largestWallWidth?: number;            // m
  roomVolume?: number;                  // m³; floorArea × ceilingHeight, else the global-mesh bounds, else unknown (v1.2)
}                                       // an unknown field is omitted (never assigned undefined: exactOptionalPropertyTypes) → default bucket.
                                        // A value that is not finite or not > 0 counts as unknown
// Modes are anhemitonic pentatonic sets (D-025): two plants on adjacent rings are never a semitone apart.
// 'dorianHex' and 'lydianHex': Cut (D-025).
export type ModeId = 'majorPent' | 'minorPent' | 'susPent';
export const MODE_DEGREES: Readonly<Record<ModeId, readonly [number, number, number, number, number]>>;
//   semitones above keyRoot, one per ring: majorPent [0,2,4,7,9] · minorPent [0,3,5,7,10] · susPent [0,2,5,7,10]
export const REVERB_RT60_MIN_S = 0.3, REVERB_RT60_MAX_S = 2.0;           // FR-ROOM-06 clamp: the first and the last step. audio/ imports REVERB_RT60_MAX_S (its cap on a
                                                                         // decay, §1.2) and REVERB_RT60_DEFAULT_S and redeclares neither; it does not use the minimum.
                                                                         // audio's own REVERB_IR_MAX_S (2.0 s) is another requirement with the same number: the
                                                                         // NFR-PERF-10 limit on the impulse-response buffer. A test keeps REVERB_RT60_MAX_S at or under it
export const REVERB_RT60_STEPS_S: readonly number[];                     // [0.3, 0.6, 0.9, 1.2, 1.6, 2.0]: every value reverbRt60 can take
export const REVERB_RT60_DEFAULT_S = 0.9;                                // room volume unknown, and Wanderer; audio's decay before the first signature
export interface RoomSignature {
  keyRoot: -3 | 0 | 2 | 4;              // semitones from C (A, C, D, E). v1: from floor area; a bigger room has a lower root
  mode: ModeId;                          // v1: from ceiling height
  tempo: number;                        // kept in the type. v1: always DEFAULT_TEMPO_BPM (core/, §1.0); the room does not set it (D-021)
  reverbRt60: number;                   // seconds; one of REVERB_RT60_STEPS_S. v1: Sabine on the room volume with a fixed absorption area (LLD §5.8)
  reverbSize: 'small' | 'medium' | 'large'; // label for the Settings UI only, derived from reverbRt60: < 0.75 s small · < 1.05 s medium · else large. It sets nothing in audio/
  starterVoices: readonly [VoiceType, VoiceType, VoiceType]; // the voices of a new garden's starter seeds, picked by the hash; a frozen array
  paletteSeed: number;                  // uint32 hash of the bucket tuple; 0 = Wanderer
}
export const WANDERER: RoomSignature;   // C majorPent, DEFAULT_TEMPO_BPM (84), reverbRt60 0.9 (medium), [bell,pad,pluck], 0. Frozen
export function roomSignature(features: RoomFeatures): RoomSignature; // pure, total, deterministic, quantised. Every signature it returns is frozen, starterVoices
                                                                      // included. Level ≥ 3, a level that is not 1 or 2, a missing argument (null or undefined),
                                                                      // or no feature known → WANDERER itself, the same object.
                                                                      // The forceSignature flag is applied by the caller (GardenSystem), not in here
export function chordDegrees(mode: ModeId): readonly [number, number, number]; // the room chord as ring indices into MODE_DEGREES[mode]; table below
export interface UndoToken { readonly plant: Plant }                  // the removed plant. Its 5 s life is kept by GardenSystem (garden:removed.expiresAt): reducers have no clock
export interface GrowthDelta { plantId: string; from: 0 | 1 | 2 | 3; to: 0 | 1 | 2 | 3 } // growth stage before and after (stageFor)
// Pure reducers: never mutate input; return a new state (structural sharing allowed). A call that changes nothing returns `s` itself,
// the same reference, so a caller compares references to tell (v1.2.2). They never throw on a bad argument
export function plantSeed(s: GardenState, seedId: string, cell: Cell, now: number): Result<GardenState>;
//   The plant takes its seed's id, voice and hue; seed ids are never reused for the life of a garden (D-031). A new plant starts at height 0.55
//   (NEW_PLANT_HEIGHT in garden/config.ts, internal; the sound prototype's value). noSeed: no such seed in the supply · notFound: `cell` is not
//   a cell of the bed (ring 0..4, step 0..15, whole numbers) · full: the bed has no free cell · occupied: the cell holds a plant
export function movePlant(s: GardenState, plantId: string, cell: Cell): Result<GardenState>; // the plant's own cell is ok and returns `s` itself.
//   notFound: no such plant, or `cell` is not a cell of the bed · occupied: another plant holds the cell
export function setHeight(s: GardenState, plantId: string, height: number): GardenState; // clamped to 0..1. `s` itself for an unknown plant, a NaN or an unchanged height
export const PULL_RANGE_M = 0.25;                                     // FR-HND-08
export function heightAfterPull(height: number, dy: number): number;  // clamp(height + dy / PULL_RANGE_M, 0, 1), dy in metres; a NaN `dy` counts as 0.
                                                                      // The preview (render, audio) and the commit (garden) both call it
export function removePlant(s: GardenState, plantId: string): Result<{ state: GardenState; undo: UndoToken }>; // was prune. notFound: no such plant (v1.2.2)
export function undoRemove(s: GardenState, token: UndoToken): GardenState; // was undoPrune. Undo keeps the plant (D-031): it goes back on its own cell when that
//   cell is free; if the cell was taken meanwhile, on the nearest free cell (nearestFreeCell); on a full bed it does nothing. `s` itself then, and when the
//   plant is already back or the token's cell is not a cell of the bed. The token's 5 s life is not checked here: GardenSystem keeps it (T-128)
export function setAnchor(s: GardenState, anchor: { handle: string; level: PlacementLevel } | null): GardenState; // null removes both fields. `s` itself when
//   that pair is already stored, or on null with no pair stored. It does not validate the pair: the persistence validator does (§4)
export const SEED_SUPPLY_MAX = 5;                                     // FR-MUS-08: unplanted seeds pile up to this many. persistence/ takes its bound from here (§4)
export function newGarden(now: number, settings: Settings): GardenState;
//   A garden nobody has visited: version 1, bed 0.12 / 0.30, bedHeightOffset 0, no plants, no seeds, lastSeedDate '1970-01-01' (a placeholder
//   the validator takes; the first visit replaces it), createdAt = lastVisitAt = now (0 when `now` is not finite), visits 0,
//   codex { discovered: [] }, `settings` as given, no anchor pair. The one way to make a garden: first launch, a corrupt save (FR-PER-02),
//   New garden (FR-PER-03). visits 0 is what makes it new
export function applyVisit(s: GardenState, now: number, sig: RoomSignature, tzOffsetMin: number): { state: GardenState; grown: GrowthDelta[]; newSeeds: Seed[] };
//   One visit. GardenSystem calls it at session start and when the page returns from a pause, with now = clock.now() and
//   tzOffsetMin = new Date(now).getTimezoneOffset() (minutes, UTC minus local; India -330). garden reads no clock and no zone.
//   Time: lastVisitAt = max(now, s.lastVisitAt), visits + 1. A plant's age is state.lastVisitAt - plantedAt everywhere and changes only here.
//     grown: one delta per plant whose stage rose since the last visit, however long ago; a clock set back gives none.
//   Seeds (FR-MUS-08): visits 0 -> one starter per sig.starterVoices, ids seed-<date>-0..2, as far as the supply has room. Otherwise one seed,
//     id seed-<date>, when the local date of now is later than lastSeedDate and the supply is below SEED_SUPPLY_MAX: one per day visited, not
//     per day missed. lastSeedDate moves only when seeds are issued, so a full supply keeps the day's seed for the next visit that day and no
//     date issues twice. <date> is the local date of now, YYYY-MM-DD. Every seed's receivedAt is now.
//     Daily voice: bell, pad, pluck, bass, choir in turn by local day number. Hue: one golden-ratio sequence shared with the starters,
//     frac((day + i) × 0.618…) with day = the local day number, i = 0..2 for the starters and 2 for a daily seed.
//   No visit (`s` itself, two empty lists): now or tzOffsetMin not finite, an offset beyond 16 h either way, a local date outside the years
//     0000..9999, a signature whose starterVoices is not an array of 3, a lastVisitAt that is not finite, or visits that is not a whole
//     number >= 0. The rest of the state's shape is the validator's job (§4). Never throws.
//   Known limit: after a clock or fakeDay that ran ahead, no seed and no growth until real time passes it
export function stageFor(ageMs: number): 0 | 1 | 2 | 3; // 0 below 1 day, 1 from 1 day, 2 from 3, 3 from 7 (86 400 000 ms each; a boundary belongs to the higher stage). Negative or NaN -> 0
export type BedZone = 'inner' | 'bed' | 'outer';
export function bedZone(bedLocal: Vec2): BedZone;                     // inner < 0.09 m, outer > 0.35 m. A point that is not finite is 'inner',
                                                                      // the zone where a release commits nothing (§1.4)
export function snapToCell(bedLocal: Vec2): Cell | null;              // null when bedZone ≠ 'bed'. The Cell is a shared frozen object, one per cell of
                                                                      // the bed: no allocation, and a write to it throws
export function cellCentre(cell: Cell, out: Vec2): Vec2;              // bed-local; allocation-free: writes into `out` and returns it. It does not validate `cell`
export function nearestFreeCell(s: GardenState, cell: Cell, ignorePlantId?: string): Cell | null; // `cell` when it is free. ignorePlantId: that plant's
                                                                      // own cell counts as free (a drag). null = the bed is full, or `cell` is not a cell
                                                                      // of the bed. The Cell is a shared frozen object, as from snapToCell; the reducers
                                                                      // store those in the plants they write
export type Result<T> = { ok: true; value: T } | { ok: false; reason: 'occupied' | 'full' | 'notFound' | 'noSeed' };
```
`chordDegrees(mode)` is mode-specific, so each room chord is a distinct consonant sonority. Root and fifth are shared; the middle note tells the modes apart.

| mode | `chordDegrees` (ring indices) | semitones above `keyRoot` | chord (shown on C) |
|---|---|---|---|
| `majorPent` | `[0, 2, 3]` | 0, 4, 7 | major triad: C–E–G |
| `minorPent` | `[0, 1, 3]` | 0, 3, 7 | minor triad: C–E♭–G |
| `susPent` | `[0, 2, 3]` | 0, 5, 7 | sus4: C–F–G |

Removed (D-011): `SeasonId`, `seasonFor()`, `setHue()` (hue is set once at seed creation; a settings-control hue shaper is Could C3 and would re-add `setHue` then).
*Cut (D-025):* `ModeId` values `dorianHex`, `lydianHex`; the fixed `[0, 2, 4]` return of `chordDegrees`. Moved (v1.2): `Settings` → `core/`.
*Cut (v1.2 review):* `SIGNATURE_TEMPO_BPM` (the one default is `DEFAULT_TEMPO_BPM` in `core/`) and the `72 | 84 | 96` type of `RoomSignature.tempo` (now `number`, so T-103 can move the default). Moved: `PlacementLevel` from `room/` to here.

### 1.2 `audio/`
```ts
export const VOICE_CAP = 24;                           // NFR-PERF-10, FR-MUS-07: voices = pooled equal-power panners
export function createAudioEngine(): AudioEngine;      // the one way to get an engine: call it once per page (v1.2.4). The engine starts from the `settings` store
                                                       // (tempo, volume, reverb) and follows settings:changed; it follows xr:sessionStart, xr:sessionEnd and
                                                       // xr:visibility (§2): visible → resume(), not visible → suspend(), and a rejection of either is logged as
                                                       // E_AUDIO_CONTEXT. It never unsubscribes. The garden and room events are wired by AudioSystem (T-128)
export interface AudioEngine {
  init(ctx?: AudioContext): Promise<void>;            // creates or resumes the AudioContext; must run inside the Enter gesture (NFR-PERF-10). It rejects when the
                                                       // context cannot be created or resumed: the caller logs E_AUDIO_CONTEXT and raises the caption (§5). The first
                                                       // call builds the graph; a later call only resumes, and its `ctx` is ignored. A context that has
                                                       // `startRendering` (an OfflineAudioContext, in a render test) is not resumed and gets no tick timer
  setTempo(bpm: number): void; setVolume(v: number): void; // clamped to 60..120 BPM and to 0..1; a value that is not finite is ignored. A tempo change does not
                                                       // move the tide phase. A volume set while a suspend() is fading is kept and applied by resume()
  setReverb(mode: 'auto' | 'small' | 'off'): void;     // the ONE shared reverb; the argument is Settings.reverb. 'auto' (default) = follow the signature's
                                                       // reverbRt60; 'small' = a fixed short decay (0.6 s, a constant inside audio/); 'off' = send muted
  setSignature(sig: RoomSignature): void;              // re-tunes all plants in place (key/mode); the reverb decay follows sig.reverbRt60 while setReverb is 'auto'; does not touch the tempo in v1.
                                                       // A signature whose mode or key root is not valid is dropped whole, its decay too. On a change of key or mode
                                                       // the sounding notes fade out and the scheduled ones are cancelled, so one step can be silent. The decay is
                                                       // capped at garden's REVERB_RT60_MAX_S (2.0 s) and one that is not above 0 is ignored. There is no floor in
                                                       // audio/: roomSignature never returns less than REVERB_RT60_MIN_S (0.3 s), and audio/ plays the decay it is given
  setListenerPose(head: Mat4): void;                   // the listener is the user's head. AudioSystem calls this every frame with the viewer's world matrix
                                                       // (XR: the head; garden window: the WindowStage camera). Allocation-free (LLD §7.1). A no-op before init():
                                                       // the pose is not kept. A matrix with a value that is not finite is ignored
  chordTone(note: 0 | 1 | 2, time: number): void;      // note = position in chordDegrees(mode); one tuning-ripple note of the room chord on the audio clock (LLD §5.8)
  syncPlants(plants: readonly Plant[], bedPose: Mat4): void; // idempotent; diff-based; plants sound at their world position, equal-power panned (NFR-PERF-10).
                                                       // Called on garden:changed and room:bedPlaced, not every frame: a real change re-tunes every plant and
                                                       // allocates. The same array reference with an equal pose counts as unchanged and returns at once (garden
                                                       // state is immutable; an array changed in place is not seen). Plants synced before init() are kept and
                                                       // sound after it. Left out: a plant whose cell is not on the bed or whose voice is not a VoiceType. A pose
                                                       // with a value that is not finite is ignored (the plants keep their place). A removed plant's notes fade out
  preview(plant: Plant): void;                         // quiet live preview while shaping
  ui(sound: 'tick'|'confirm'|'bump'|'removeRev'|'undoFwd'|'placed'|'goodnight'): void; // confirm = room chord
  enterListen(): void; exitListen(): void;             // dims; variations (Could) on/off
  suspend(): Promise<void>; resume(): Promise<void>;   // suspend(): the master fades out over 0.2 s (FR-SYS-05), then the engine's tick suspends the context and
                                                       // stops; it resolves then, or at once when a resume() cancels it. A context that never started is not faded:
                                                       // the tick just stops. resume(): resumes the context, restarts the tick and fades the master back in; the
                                                       // audio clock stood still meanwhile, so the tide carries on. A suspend() made while a resume() is still
                                                       // waiting for the browser wins: the context ends suspended. Both do nothing before init()
  readonly clock: { now(): number; barPhase(): number; stepIndex(): number }; // audio-clock based; all three are 0 before init()
  readonly stats: { voices: number /* ≤ VOICE_CAP, always: the notes sounding or scheduled, refreshed once per tick */;
                    cpuEstimate: number /* main-thread milliseconds of one scheduler tick, a moving average; a page cannot read audio-thread CPU */ };
}
// Internal to audio/: not exported from audio/index.ts. Listed here so the voices and the pool agree on one shape.
export interface Voice { trigger(time: number, p: VoiceParams, out: AudioNode): void; dispose(): void } // out = the input of the voice channel the pool
                                                       // assigned; the pool has already moved that channel's panner to the plant (LLD §7.1)
export interface VoiceParams { hz: number; gain: number; release: number; cutoffMul: number; detune: number }
```
Graph shape (LLD §7.1, NFR-PERF-10): 24 pooled `PannerNode`s with `panningModel = 'equalpower'`, exactly one `ConvolverNode` on a shared send bus with one send level for every room, and one master limiter stage (a compressor, then a −1 dBFS ceiling). The listener follows the head (`setListenerPose`). There is no HRTF switch in this interface: at most 2 HRTF "hero" panners may be added, and only after a device A/B (T-129, W1) justifies them. *Cut (D-021, D-025):* `setReverb('small'|'medium'|'large'|'off')` (three reverb sizes) and `chordTone(degree: 0 | 2 | 4)`; the signatures above replace them. *Cut (v1.2 review):* the numeric argument of the draft `setReverb(decay: number | 'auto' | 'off')`: Settings has three states and nothing ever passed a number.
**As built (v1.2.4, T-121).** Before the first `setSignature` the engine plays C major pentatonic, the Wanderer tuning, with the default 0.9 s reverb. `chordTone`, `preview`, `ui`, `enterListen` and `exitListen` do nothing yet and are safe to call (T-142, T-147, T-164, T-148); Bell, Pad, Pluck, Bass and Choir plants play their own voices (T-144); a Shimmer plant (Should S5) rings as a bell at its own octave and mix level until its voice is built. A step the scheduler finds more than 100 ms late is skipped (LLD §5.3). A note's sources and envelope are created per note; the channel strips, the note records and the Pluck strings are pooled (LLD §7.1).

### 1.3 `room/`
```ts
export const BED_CENTRE_DEFAULT_M = 0.45;                                 // FR-ROOM-03, D-020: forward of the head; far edge = 0.45 + BED_OUTER = 0.75
export const BED_CENTRE_MIN_M = 0.35, BED_CENTRE_MAX_M = 0.45, BED_FAR_EDGE_MAX_M = 0.75; // FR-ROOM-03; 0.75 is also the reach of FR-ROOM-01 (D-034)
export const PLANE_LEVELS_TIMEOUT_MS = 3000;            // FR-ROOM-01: levels 1 and 2 together; the caller passes it to run()
// PlacementLevel is declared in garden/ (§1.1); room/ imports it.
export interface BedPlacement { pose: Mat4; level: PlacementLevel; surfaceId?: string } // surfaceId: only when the chain chose a plane in this session
export interface RoomPlane extends SurfaceRef { label: string }  // a detected plane as the rectangle around its polygon: pose at the rectangle's centre;
                                                                 // the sign of its normal is undefined; label '' when the platform gives none
export interface RoomMesh { label: string; pose: Mat4; vertices: Float32Array; indices: Uint32Array } // the platform's own arrays, in the space of `pose`
// The adapters read optional session features, never required ones. supported() is false before the first setFrame, in a session without the
// feature, and with the flag (noPlanes, noMeshes); the caller handles false. RoomSystem calls setFrame in every XR frame, before any read.
export class PlaneAdapter { constructor(flags?: Flags); setFrame(frame: XRFrame, space: XRReferenceSpace): void; supported(): boolean; read(): RoomPlane[] } // never throws; allocates
export class MeshAdapter  { constructor(flags?: Flags); setFrame(frame: XRFrame, space: XRReferenceSpace): void; supported(): boolean; read(): RoomMesh[] }
export class HitTestAdapter { setFrame(frame: XRFrame, space: XRReferenceSpace): void; supported(): boolean; hit(): Vec3 | null }  // gaze ray
export class PlacementSolver {                              // the chain of FR-ROOM-01; the bed centre targets BED_CENTRE_DEFAULT_M (LLD §5.5)
  constructor(planes: { supported(): boolean; read(): readonly RoomPlane[] }, hits: { supported(): boolean; hit(): Vec3 | null }, flags?: Flags);
  run(opts: { timeoutMs: number }): Promise<BedPlacement>; // timeoutMs: the wait of levels 1+2; level 3 waits HIT_TEST_TIMEOUT_MS (10 000, room/config.ts: the one
                                                            // place that number is written). Never rejects. A second run() drops the first. The caller does no
                                                            // work in the promise's continuation: it runs after the frame, outside any XRFrame (§1.10 rule 4)
  cancel(): void;                                           // drops the pending run: its promise never settles
  update(headPose: Mat4, nowMs: number): void;              // every XR frame while a run is pending, after the adapters' setFrame; never throws
  confirm(): void;                                          // the level-3 confirm; ignored at any other level. As built it places only on a usable spot.
                                                            // To build (T-128c, UX §9.2): it places the bed where preview() is, on the surface (level 3)
                                                            // or, with the gaze on no usable spot, floating at once (level 4)
  // To build (T-128c, UX §9.2):
  preview(): Readonly<BedPlacement> | null;                 // level 3 only: the pose and the level (3 or 4) a confirm in this frame would give, as of the last
                                                            // update(). One reused object: copy what you keep. null at any other level and with no run pending
}                                                           // Also to build: a level-3 wait that runs out places the bed where preview() is, so on the surface
                                                            // when the gaze is on a usable spot. As built it always floats then
// AnchorStore is Must (M5, D-021; was Should S4). supported() === false, or restore() → null, is not an error:
// the caller re-places the bed by the PlacementSolver chain and keeps the garden (FR-ROOM-07).
export interface AnchorStore {
  supported(): boolean;
  create(pose: Mat4): Promise<string /* handle */>;
  restore(handle: string, timeoutMs: number): Promise<Mat4 | null>;
  clear(): Promise<void>;
}
export interface SurfaceRef { id: string; pose: Mat4; extents: Vec2 /* x = width, y = height in plane space */ }
export type WallPlane = SurfaceRef;
export interface WallFinder { nearestWalls(from: Vec3, max: number, within: number): WallPlane[] }   // Could (C4, D-021; was Should S2)
export class RoomFeatureExtractor {                    // FR-ROOM-10; replaces RoomSize (floor area is a feature). Emits nothing: the caller emits room:features
  constructor(planes: { read(): readonly RoomPlane[] }, meshes: { read(): readonly RoomMesh[] }); // the PlaneAdapter and the MeshAdapter
  extract(placement: BedPlacement): RoomFeatures;      // inside an XR frame, after both adapters' setFrame. Never throws; an unknown field is left out.
                                                       // Reads pose and level only, never surfaceId, and does not need the solver to have run (LLD §5.8)
  surfaces: RoomSurfaces;                              // of the last extract; {} before the first
}
export interface RoomSurfaces { table?: SurfaceRef; nearestWall?: SurfaceRef; ceiling?: SurfaceRef } // for the tuning ripple. Ceiling and nearest wall
                                                       // at every level, table at levels 1 and 2: "no sweep" for Wanderer is decided from the signature
```
**The solver as built (T-123, D-034).** `PlacementSolver` holds no XR and no timer: RoomSystem calls `update` with the head pose in the reference space (the camera's `matrixWorld.elements`) and a clock that only goes forward, and the wait of levels 1 and 2 starts at the first `update` after `run`. A `timeoutMs` that is not finite counts as expired. `flags.forceLevel` starts the chain at that level, and a forced level that cannot place still falls on to the next. Forward is the level direction square to the head's right vector, and every distance of FR-ROOM-01 and FR-ROOM-03 is measured level (horizontally) from the head. Pitch therefore does not move the bed, and a user looking straight down at the table still has a forward; head roll does move it (20° of roll at 45° of pitch shifts the spot by about 11 cm). A frame whose head pose is not finite, or whose head lies on its side, is skipped: the run waits for a usable one. The solver emits `room:placementLevel` (§2) once for each level it tries. Do not call `run()` from a `room:placementLevel` handler: the new run would be resolved with the old run's bed. `E_PLACEMENT_TIMEOUT` is logged at warn when a wait ran out and the chain ended at level 4 (§5).
**Placing the bed** (RoomSystem; once per session, and again on Re-place; LLD §5.5). This is how an anchor travels in both directions:
1. RoomSystem takes the saved pair `{ anchorHandle, anchorLevel }`, or its absence, from the state of the latest `garden:changed`: the first one of a page comes from `GardenSystem.load`, before any session (§1.10 rule 6). Nothing hands it over, and `room/` never reads the store.
2. Pair present and `supported()`: `restore(anchorHandle, 4000)`. A pose comes back → `BedPlacement { pose, level: anchorLevel }`, then `room:placementLevel` and `room:bedPlaced { restored: true }`. The chain does not run.
3. Otherwise (no pair, unsupported, `null`, timeout): `PlacementSolver.run()`, then `room:bedPlaced { restored: false }`, on which garden drops a stale pair. After that, holding nothing up: `clear()`, `create(pose)`, and `room:anchored { handle, level }` when it resolves; garden stores the pair with `setAnchor` and the normal save persists it.
4. In both cases `RoomFeatureExtractor.extract(placement)` runs next and `room:features` follows. A bed restored at level 1 or 2 gets its room signature again; only a bed that was placed at level 3 or 4 is Wanderer, as it was on the day it was placed.

### 1.4 `hands/`
```ts
export interface HandFrame {
  hand: Hand; tracked: boolean;
  pinch: boolean;      // the hold signal: thumb tip to index tip with hysteresis, debounce and lockout (constants below). A pinch on a plant uses it
  select: boolean;     // the tap signal: the platform's own pinch classifier (selectstart..selectend). Discrete actions use it.
                       // A source with no platform classifier reports select = pinch (LLD §4, Pinch signal). HandSampler decides
                       // that per session: select = pinch for both hands until either hand's first selectstart of the session
  pinchPos: Vec3;      // world; 1€-filtered
  palmPos: Vec3;       // world; where a delivered seed rests (a hand: just above the palm; a pointer: LLD §11)
  palmNormal: Vec3;    // world, unit length, pointing out of the palm
  velocity: Vec3;      // of the pinch point, world, metres per second
} // wristRoll removed (twist cut). An untracked sample (tracked = false) leaves the four vectors as they were and keeps `pinch`
  // as held; `select` goes on following the platform's events (or `pinch`, in a session without them)
// InputSource (FR-SYS-07): the one seam between an input device and the gesture machine. hands/ owns the interface and the WebXR
// implementation (IWER's emulated hands arrive through the same WebXR hand API, so they need no adapter); window/ implements it for a pointer.
export interface InputSource {
  readonly hands: readonly Hand[];                            // the hands this source reports: WebXR = both, pointer = one
  sample(hand: Hand, timeMs: number, out: HandFrame): void;   // fills `out` for this frame; creates no objects (hot path)
}
export function createHandFrame(hand: Hand): HandFrame;      // untracked and zeroed. The caller keeps one per hand and passes it to sample() every frame
// HandSampler (v1.2.3): the WebXR InputSource, on raw joints. Precondition: the caller (HandSystem) calls setFrame() in every XR frame
// before it samples, and detach() on xr:sessionEnd.
export class HandSampler implements InputSource {
  readonly hands: readonly Hand[];                            // ['left', 'right']
  attach(session: XRSession): void;                           // on xr:sessionStart: listens for the session's selectstart / selectend
  detach(): void;                                             // stops listening and forgets all it held: pinch, select, filters, the select fallback
  setFrame(frame: XRFrame, space: XRReferenceSpace): void;    // an XRFrame can be read only inside its own callback
  sample(hand: Hand, timeMs: number, out: HandFrame): void;   // never throws: a joint read that fails reports the hand untracked (logged once per session)
}
export type HeldGesture = 'press' | 'carry' | 'drag' | 'pull' | 'none'; // what the pinch had become when it ended.
                                                              // 'none' = it never left the dead zone, or it started on nothing
export type GestureEvent =
  | { type: 'gesture:palmUp'; hand: Hand }
  | { type: 'gesture:pinchStart'; hand: Hand; target: TargetRef | null; pos: Vec3 }
  | { type: 'gesture:pull'; hand: Hand; target: TargetRef; dy: number }                // preview only; commits nothing
  | { type: 'gesture:drag'; hand: Hand; target: TargetRef; pos: Vec3; zone: BedZone }  // preview only; commits nothing
  | { type: 'gesture:release'; hand: Hand; gesture: HeldGesture; target: TargetRef | null; pos: Vec3; zone: BedZone;
      cell: Cell | null; dy: number | null }                  // the one event that commits (FR-HND-16); who does what: table below
  | { type: 'gesture:palmsOut' } | { type: 'gesture:wake' }
  | { type: 'gesture:trackingLost'; hand: Hand };             // the FR-HND-15 grace expired and the held gesture was reverted
export interface TargetRef { kind: 'plant'|'seed'|'orb'|'undo'|'bed'|'panel'; id: string }
// Picker and machine (v1.2.3, as built in T-124). HandSystem (T-128) builds the candidates and the context.
export interface PickCandidate { readonly target: TargetRef; readonly radius: number; readonly pos: Vec3 } // one Interactable (LLD §3): hit radius in m, world position
export function pickTarget(pos: Vec3, candidates: readonly PickCandidate[]): TargetRef | null; // FR-HND-04: the nearest candidate that has `pos` within its OWN
                                                              // radius, else null. Whoever builds the candidates sets each radius to at least HIT_RADIUS_M
                                                              // (an Interactable's default radius is 0, which is never picked)
export function toBedLocal(bedPose: Mat4, world: Vec3, out: Vec2): Vec2; // world → bed-local (§1.0 Axes), written into `out`. bedPose = the BedAnchor entity's
                                                              // matrixWorld.elements, read as rotation + translation (a bed has no scale)
export function hoverCell(bedLocal: Vec2, nearestFreeCell: (cell: Cell) => Cell | null): Cell | null; // the cell a release there would commit: snapToCell (§1.1),
                                                              // then the nearest free cell; null off the bed or on a full bed
export interface GestureContext {                             // what the machine reads when a pinch starts or ends. HandSystem keeps one and refreshes it every frame
  candidates: readonly PickCandidate[];                       // every Interactable there is this frame
  bedPose: Mat4 | null;                                       // null while no bed is placed
  nearestFreeCell: (cell: Cell) => Cell | null;               // garden's nearestFreeCell (§1.1) on the state of the latest garden:changed
}
export class GestureMachine {                                 // one per hand. v1 (T-124): IDLE, CARRYING, PINCHED, PRESSED; pull, drag and remove are T-146;
  constructor(hand: Hand);                                    // the tracking-loss grace, the revert and the hover are T-116
  update(frame: HandFrame, timeMs: number, context: GestureContext): void; // one sample of that hand; emits gesture:* on the bus.
}                                                             // Nothing starts, ends or commits on an untracked sample
// hands/config.ts: thresholds as named constants (render and tests read them; LLD §4, §5.1, §5.7)
export const PALM_UP_MAX_ANGLE_DEG = 35, PALM_UP_HOLD_MS = 400;           // FR-HND-05: palm normal within the angle of world up, held this long
export const PINCH_ENTER_M = 0.020, PINCH_RELEASE_M = 0.032;              // FR-HND-02: thumb tip to index tip, hysteresis
export const PINCH_DEBOUNCE_FRAMES = 2, PINCH_LOCKOUT_MS = 130;           // FR-HND-02; a frame = one InputSource sample (2 = 27.8 ms at 72 Hz)
export const ONE_EURO_MIN_CUTOFF_HZ = 1.0, ONE_EURO_BETA = 0.0, ONE_EURO_D_CUTOFF_HZ = 1.0; // FR-HND-03: on the pinch point; beta in Hz per m/s (LLD §5.7)
export const TARGET_VISIBLE_DIAMETER_M = 0.025, HIT_RADIUS_M = 0.040;     // FR-HND-04: hit radius tunable 0.035..0.040 by T-105; nearest wins
export const HOVER_DEAD_BAND_M = 0.005;                                   // FR-HND-16
export const TRACKING_GRACE_MS = 200, REVERT_LERP_MS = 150;               // FR-HND-15: grace tunable 150..250
export const DRAG_DEAD_ZONE_M = 0.02;                                     // FR-HND-08/10: then the dominant axis decides pull or drag
```
**As built (v1.2.3, T-124).** A `gesture:*` payload is the `GestureEvent` member of that name, `type` included, and it is an object the emitter reuses for the next event of that kind: a handler reads it at once and copies what it keeps. `gesture:palmUp` fires once per hold (FR-HND-05), only while that hand holds nothing, and again 400 ms after a pinch of that hand ends if the palm is still up; hands does not look at the seed supply, garden decides whether a seed is delivered. Until T-116 adds the hover, `gesture:release.cell` is worked out at the release: `snapToCell` of the release point, then `nearestFreeCell`. Not built yet, declared only: `gesture:pull`, `gesture:drag`, `gesture:palmsOut`, `gesture:wake`, `gesture:trackingLost`, `hands:lost`, `hands:found`, `target:hover`.

`gesture:release` by `gesture`. `zone` is `bedZone` of the bed-local release point in every row; with no bed placed it is `'inner'`, the zone where a release commits nothing (the same answer garden gives for a point it cannot place, §1.1). `'outer'` on a dragged plant = remove (FR-HND-11). Garden reads `gesture` and never infers it from `zone` or `target`.

| `gesture` | `target` | `cell` | `dy` | Who commits what |
|---|---|---|---|---|
| `press` | the pressed orb, undo petal or panel control when the release is over that same hovered target; `null` when the hand moved off it (cancelled) | `null` | `null` | orb → garden enters Listen · undo → garden `undoRemove` · panel → ui acts on the control · `null` → nothing |
| `carry` | the seed | `zone = 'bed'`: the cell that gets the plant, already resolved to a free cell (§2 `target:hover`), or `null` when the bed is full. Other zones: `null` | `null` | garden `plantSeed(seed, cell)`; `null` → the seed returns to the supply |
| `drag` | the plant | `zone = 'bed'`: the free cell it moves to. Other zones: `null` | `null` | `bed` → garden `movePlant` · `inner` → nothing (render returns the plant to its cell) · `outer` → garden `removePlant` + `garden:removed` |
| `pull` | the plant | `null`, always: a pull never moves a plant | total vertical travel since pinch start, metres | garden `setHeight(plant, heightAfterPull(plant.height, dy))` |
| `none` | the plant, or `null` | `null` | `null` | nothing in the garden. With `target: null` while placement level 3 runs it is the confirm: RoomSystem calls `PlacementSolver.confirm()` (§1.3, §1.10) |

### 1.5 `persistence/`
```ts
export interface Store {
  load(): Promise<GardenState | null>;     // validated + migrated: a new object with the schema's fields only. null: nothing saved, storage
                                           // unreadable, or corrupt / unknown version (then moved to a backup key, §4). Never rejects
  save(state: GardenState): Promise<void>; // writes now. Rejects, writing nothing, for a state load() would refuse; rejects when no storage took it
}
export function openStore(): Promise<Store>; // IndexedDB, localStorage as the fallback (FR-PER-01, §4). Never rejects; settles within
                                             // IDB_OPEN_TIMEOUT_MS (1500). With no storage at all: load() gives null, save() rejects
export class PersistenceSystem {             // the debounce; a plain class, not an ECS system. It listens to no event (§2)
  constructor(store: Store, onSaveFailed?: () => void); // called when writes start to fail: once per run of failed writes, and again only after
                                             // a write has succeeded (the E_SAVE_FAILED caption, LLD §8); a throw from it is logged
  save(state: GardenState): void;            // one write of the newest state, started at most SAVE_DEBOUNCE_MS (500) after the first unsaved change
  flush(): Promise<void>;                    // writes the pending state now, after a write under way. Never rejects. A failed write keeps its
                                             // state pending until the next save() or flush()
}
```
*Cut (v1.2.5):* `Store.backupKey()`: nothing called it. The backup key is in §4.

### 1.6 `access/`
```ts
export interface GazeDwell { enabled: boolean; setTargets(t: TargetRef[]): void; onSelect(cb: (t: TargetRef) => void): void } // dwell time = Settings.dwellMs
```

### 1.7 `window/` (garden window: FR-SYS-07, Should S6)
Exports `PointerSource` (implements `InputSource`, §1.4: a mouse, pen or touch contact as the pinch-equivalent, with sticky tracking and latched button edges) and `WindowStage` (one fixed camera over a virtual table). Only `src/index.ts` imports `window/`: it opens the garden window when `immersive-ar` is unsupported, or when the `window` flag is set (§3), and hands the chosen `InputSource` to `HandSystem`. `garden/`, `audio/` and `persistence/` run unchanged. Never the judged path. Mapping and render path: LLD §11.

### 1.8 `render/` (flash cap: FR-UI-11)
```ts
export const FLASH_CAP_PER_S = 3;      // FR-UI-11: luminance changes of one element in any 1 s window (sheet 6.2)
export const FLASH_MIN_DELTA = 0.10;   // a brightness swing smaller than 10 % of full scale is not counted as a change
export const FOVEATION_MEDIUM = 2 / 3; // NFR-PERF-09: fixed foveation "medium", as renderer.xr.setFoveation takes it (0 none .. 1 high); src/index.ts sets it
export class FlashGuard {              // one per page, built by src/index.ts and handed to every module that animates a brightness (LLD §5.9)
  claim(count: number, brightness?: number): number; // set-up only (it allocates): `count` elements at `brightness` (default 0); returns the id of the first.
                                       // Elements are never released
  reset(element: number, brightness: number): void;  // set-up only: a new thing drawn on a reused element (a new plant on a freed slot) starts at `brightness`
                                       // with no swing in progress. The element's changes of the last second stay counted
  request(element: number, target: number, nowMs: number): number; // per frame, creates no objects: the brightness to draw. ONE call per element per frame:
                                       // a caller with two effects on one element combines them first. `target` is clamped to 0..1; one that is not a number
                                       // returns the current brightness. `nowMs` is the frame's time and never goes back (a clock that does freezes the
                                       // element); with one that is not finite nothing changes. An element id that was never claimed gets 0, always
  takePeak(): number;                  // the most changes any one element had inside one second, since the last call. It resets: only PerfSampler calls it
}
export class BedRenderer { constructor(parent: Object3D); setGhost(on: boolean): void; dispose(): void } // static: the glass with its five ring lines, and
                                       // 80 cell markers. 2 draw calls. setGhost (to build, T-128c): true hides the cell markers, which leaves the
                                       // level-3 ghost of UX §9.2 (the glass and its ring lines, 1 draw call); false shows them again
export class PlantRenderer {           // one InstancedMesh per silhouette: at most 3 draw calls (LLD §1)
  constructor(parent: Object3D, guard: FlashGuard);
  setState(state: Pick<GardenState, 'plants'>): void; // on garden:changed, not per frame: it rewrites every instance. The same array reference again is no
                                       // work. Left out, as in syncPlants (§1.2): a plant whose cell is not on the bed or whose voice is not a VoiceType
  update(barPhase: number, nowMs: number): void; // per frame, creates no objects: each plant glows as the tide passes its step (FR-UI-07), through the guard.
                                       // barPhase = AudioEngine.clock.barPhase() (0..1, 0 = on step 0); one that is not finite = no tide, every plant at rest
  dispose(): void;
}
export class TideRenderer {            // the wedge of light: 1 draw call, and one FlashGuard element for its showing and hiding
  constructor(parent: Object3D, guard: FlashGuard);
  update(barPhase: number, nowMs: number): void; // per frame, creates no objects. A finite barPhase shows the wedge with its crest there; one that is not
                                       // finite hides it and leaves it where it was. Showing and hiding are fades through the guard, so the wedge cannot
                                       // blink. The sweep itself is not guarded: barPhase must be continuous (a jump of the phase is a jump of the light)
  dispose(): void;
}
export class PerfSampler {
  constructor(info: { render: { calls: number; triangles: number } } /* WebGLRenderer.info */, guard: FlashGuard);
  frame(nowMs: number, jsMs: number, voices?: number): void; // once per frame, after the render. jsMs = the main-thread time of that frame (the updates plus
                                       // the render call); voices = AudioEngine.stats.voices (default 0). Emits perf:sample (§2) every 1000 ms
}
export interface PerfHud { readonly mesh: Mesh; dispose(): void } // the read-out panel; a type only: createPerfHud is the way to get one
export function createPerfHud(parent: Object3D, flags?: Flags): PerfHud | null; // the panel when Flags.perfHud is on (§3), else null. It shows each perf:sample;
                                       // the caller places `.mesh` and calls dispose()
```
`parent` is the Object3D that carries the bed's pose: the renderers draw in the bed frame of D-029 (§1.0), in metres. None of them adds a light, a shadow or a render target (NFR-PERF-09), and none reads a clock: time comes in as an argument.
One luminance change = one swing of an element's brightness in one direction of at least `FLASH_MIN_DELTA`; a flash (up and back) is two changes. An element = one drawn instance (one plant, one cell marker, one beat-ring tick, one ripple quad, the halo, the tide wedge). The cap is half of what WCAG's three-flashes rule allows, so NFR-ACC-01 holds with margin. Enforcement and its consequences: LLD §5.9. `perf:sample.maxFlashPerS` (§2) reports the worst element.

### 1.9 `ui/` (T-126: landing page, captions, FoV guard; Hints and Panel join in T-151)
```ts
export interface FovElement { distanceM: number; halfWidthM: number; halfHeightM: number } // flat, facing the head, metres; a point has half sizes 0
export function clampToFov(head: Mat4, wanted: Vec3, element: Readonly<FovElement>, out: Vec3): boolean;
// FR-UI-03. Pure, creates no objects, never throws; `out` may be `wanted`; `head` is the head's world matrix, no scale.
// Writes the point `distanceM` ahead of the head in the direction of `wanted`, moved to the nearest edge so the element's
// edges stay within 25 degrees to each side and 20 up or down (|x ± halfWidth| <= d tan 25, |y ± halfHeight| <= d tan 20).
// An element larger than the box is centred on that axis. Beside or behind the head: the nearer side edge at its own
// elevation (exactly behind: the right edge). Returns true when the direction changed. NaN in gives NaN out.
// The result is always `distanceM` ahead: a caller that keeps a world point at its own depth passes that depth.
// Per frame, pass a THREE.Vector3 as `out`: V8 may box a number written to a plain { x, y, z }.
export class CaptionSystem {                                // an ECS system; src/index.ts registers it at priority 60 (LLD §3)
  readonly shown: StringKey | null;                         // the key of the caption on screen
  readonly fov: { leftDeg: number; rightDeg: number; downDeg: number; upDeg: number }; // where its edges were on the last frame it was
}                                                           // shown, in degrees from the gaze: the self-report of TC-E2E-11
export interface Landing {
  ready(enter: () => Promise<boolean>): void;               // the world is ready: Enter works from now on
  granted(enabledFeatures: readonly string[] | undefined): void; // a session started: its XRSession.enabledFeatures
  failed(): void;                                           // the world could not load: the page says to reload it
}
export function mountLanding(root: HTMLElement): Landing;   // once per page
```
**Captions.** A module raises a caption by creating an entity with `Caption { key, expiresAt }`; it never calls `ui/`. The fields are read once, when the component is added. An unknown key is logged, never shown, and left to its raiser. One caption at a time, first raised first shown, from its turn until `expiresAt` and never less than `CAPTION_MIN_MS`, even if it expired while waiting; so a far `expiresAt` blocks later captions until the raiser removes the component. Times are on core's clock, which is wall time: a pause uses a caption's time up. Removing the component takes the caption back: a waiting one is dropped, the one on screen stays for its minimum. When a caption has run, CaptionSystem removes the component; the entity stays its raiser's and may carry the next caption. The line has no cap and merges nothing, so a raiser keeps at most one live caption per key. At most six words: a unit test checks every entry of `STRINGS` and nothing checks at run time; a text too long for the quad is squeezed, never cut. Drawn in the scene (the projection layer, FR-UI-01), 0.6 m ahead and 8 degrees below the gaze where it appears; it stays at that point of the room, is clamped into the box every frame and faces the head. The head pose is this frame's inside a session and the camera's outside one.
**Landing.** `mountLanding` builds the page into `root`. Until `ready(enter)`, Enter is disabled. `enter` is called synchronously inside the click (a session request needs the user's gesture), must not throw, and resolves false when no session started; a throw or a rejection is logged and counted as false, so Enter stays usable. `granted` is called at each session start. After `failed()` Enter stays disabled. The page hides on `xr:sessionStart` and shows on `xr:sessionEnd`, with the focus back on Enter. `src/index.ts` emits an `xr:sessionEnd` only for a session whose `xr:sessionStart` it emitted. A handler of `xr:sessionStart` takes the session from `renderer.xr.getSession()`: IWSDK sets `world.session` only after the event.
**Strings.** The page's copy is `LANDING` in `ui/strings.ts`, in the character set of `STRINGS` (§1.0); a failure message that has an error code (§5) has it as its key.

### 1.10 App wiring (`src/index.ts` and the systems)
The contract of the integration task T-128: what a task other than T-128 may rely on once the modules are joined. The design behind it, the sequences and the build order are in LLD §3. Written 2026-10-12 against `develop` at `44dfe39`; **to build** marks what is not there yet, with its task. Internals of the wiring are not listed.
```ts
// Files
//   src/index.ts   exists; becomes the boot: mountLanding(), then import('./app.js'). Its chunk holds no SDK code (rule 1)
//   src/app.ts     to build (T-128a): makes the objects below, registers the systems, owns the session.
//                  Where §1.2, §1.5, §1.8, §1.9 and §2 say that `src/index.ts` wires, saves or emits, the code is here

// One per page, made in src/app.ts and nowhere else (unit tests and the proto pages make their own):
//   world: World                                        IWSDK
//   engine: AudioEngine = createAudioEngine()           §1.2
//   guard: FlashGuard = new FlashGuard()                §1.8
//   garden: GardenSystem                                below
//   saver: PersistenceSystem, over openStore()          §1.5

// How a system receives them: as configData when it is registered. It declares each key it needs in its schema as
// { type: Types.Object, default: null } and reads it once, in init(): `this.config.engine.value as AudioEngine`.
//   engine: AudioEngine · guard: FlashGuard · garden: GardenSystem · room: RoomSystem · bed: Object3D (the bed entity's object3D)
// Who takes which today: PerfSystem guard, engine · GardenAudioSystem engine · BedRenderSystem guard, engine, bed ·
// RoomSystem, HandSystem, CaptionSystem none. A later system names its keys in the table at the end of this section

// garden/ (to build, T-128b)
export const UNDO_LIFE_MS = 5000;                     // FR-MUS-12: how long a removed plant can be brought back
export class GardenSystem {                           // a plain class, not an ECS system: the one owner of GardenState
  constructor(appClock?: Clock, appFlags?: Flags);    // core's clock and flags by default. It subscribes to the bus here, and reads
                                                      // core's settings store when it makes a garden
  readonly state: GardenState | null;                 // null before load(). A module follows garden:changed; this is for a late reader
  load(state: GardenState): void;                     // once per page, after every system is registered: the saved garden or
                                                      // newGarden(clock.now(), settings.get()). Emits garden:changed, every plant id in diff.added
  newGarden(): void;                                  // FR-PER-03: a new garden in place of this one. The caller has done the two-step
                                                      // confirm. Kept undo tokens are dropped; the bed and its anchor pair stay. Its three
                                                      // starter seeds come at once when the session has its signature, else with that
                                                      // session's visit
}                                                     // T-151 adds setBedHeightOffset(metres), with its reducer in garden/rules.ts
// Two events join garden/events.ts (§2):
//   'garden:seedOut':  { seed: Seed; hand: Hand }    a seed of the supply is on that hand (FR-HND-05). At most one seed is out
//   'garden:seedBack': { seedId: string; reason: 'offBed' | 'full' | 'lost' | 'reset' }
//                                                    that seed is in the supply again: released off the bed · released over a full bed ·
//                                                    the carrying hand was lost past its grace · the session ended or newGarden() ran

// room/ (to build, T-128c)
export class RoomSystem {                             // ECS system, priority 10
  readonly bed: Entity;                               // made in init(), lives as long as the page. Everything drawn on the bed is a child
                                                      // of bed.object3D. It carries BedAnchor only while a bed is placed (rule 5)
  replace(): void;                                    // FR-ROOM-05: places the bed again by the chain; the garden is kept. Nothing outside a session
  confirm(): void;                                    // the level-3 confirm from a gaze dwell (T-160). It acts only while the solver's
                                                      // preview is at level 3 (the gaze on a usable spot): a dwell never floats the bed
}

// audio/ (to build, T-128d): the ECS system that drives the engine is GardenAudioSystem, priority 40, in audio/AudioSystem.ts.
// It is not named AudioSystem: IWSDK registers a system of that name. §1.2's "AudioSystem" means this class

// hands/: HandSystem, priority 20, is §1.4's (built by T-116). It makes its own HandSampler and has no way to take another
// InputSource; the garden window (T-114) adds one
```
**Priorities.** A system is registered through the wiring's one helper, in ascending priority, with a number from this table. Bus handlers of one event run in the same order, because systems subscribe in `init()` (§2: subscription order).

| −100 | 10 | 20 | 25 | 35 | 40 | 49 | 50 | 52 | 53 | 54 | 55 | 60 | 61 | 62 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Perf | Room | Hand | GazeDwell | Onboarding | GardenAudio | Seed | BedRender | Halo | Vine | Particle | TuningRipple | Caption | Hint | Panel |

IWSDK's own systems hold −5 to 1. A new system takes a free number between the two it must run between and adds it here first.

**Rules a task may rely on.**
1. **The boot chunk.** `src/index.ts` and everything it imports without `import()` load neither `@iwsdk/core` nor `three`: the landing page is on screen before the SDK has arrived. That is `ui/Landing.ts`, `ui/strings.ts` and `core/` without `core/components.ts`. A file that joins that graph keeps the rule; a test follows the imports from `src/index.ts` and fails on either package.
2. **One way in.** `world.xr.offer` is `"none"` in `iwsdk.config.json`: a session starts from the page's Enter click only, in the emulator and on a headset. `engine.init()` and the session request are both made inside that click. A session therefore has sound or the `E_AUDIO_CONTEXT` caption: the caption is raised at `xr:sessionStart` when `init()` rejected or was never called (the dev plugin's native XR control can start a session with no click), and `AUDIO_START_GRACE_MS` (3000) later when `engine.clock.now()` is still 0, because a context the browser will not start rejects nothing.
3. **A session is two bus events.** `src/app.ts` emits `xr:sessionStart`, `xr:sessionEnd` (only for a session whose start it emitted) and `xr:visibility { visible }`, where `visible` is `session.visibilityState !== 'hidden'`, emitted on a change, from the session's own `visibilitychange` event. `world.visibilityState` is not a substitute: IWSDK sets it inside the render tick, and a hidden session has none. A system starts and ends its session work on those events and reads XR objects only where it needs them: the session in an `xr:sessionStart` handler is `this.renderer.xr.getSession()` (`world.session` is set later); the frame is `this.xrFrame`, which is `null` outside XR; the reference space is `this.xrManager.getReferenceSpace()`; the head is `this.xrManager.isPresenting ? this.player.head.matrixWorld : this.camera.matrixWorld`. A system written that way runs unchanged in the garden window.
4. **The order inside a session.** `xr:sessionStart` → `room:placementLevel` (one or more) → `room:bedPlaced` → `room:features` → `room:signature` → `garden:changed` (the visit) → `garden:grown` (when plants grew) → `garden:seedArrived` (one per new seed). Everything from `room:bedPlaced` on is emitted in one frame, inside `RoomSystem.update`, with this frame's `XRFrame` readable; nothing is emitted from a promise continuation. That one frame may take up to 50 ms of script time (LLD §3.3 D). Plants sound, and the tide shows, from `room:signature` on and not before. `room:tuned` follows 4.0 s later once the ripple is built (T-142); the wiring does not wait for it.
5. **The bed.** One entity for the life of the page, `RoomSystem.bed`. It carries `BedAnchor` exactly while a bed is placed: not before the first placement, not during Re-place, not after `xr:sessionEnd`, and not while the level-3 ghost shows. A query on `BedAnchor` is how a system learns "placed" and "no longer placed". Where the bed is drawn is `bed.object3D.matrixWorld`, which includes `bedHeightOffset`; `room:bedPlaced.placement.pose` is the surface's pose without it, and is what an anchor is made from.
6. **The garden's state** changes in `GardenSystem` only. Every change is one `garden:changed { state, diff }`, emitted after the state is replaced; a call that changes nothing emits nothing. The first one of a page comes from `load()`, before any session. A module that wants a change sends the gesture event the release table of §1.4 names, or calls one of the methods above.
7. **Targets.** `Interactable.id` is the id the reducers take: a plant's id for `kind: 'plant'`, the seed's id for `'seed'`, and the removed plant's id for `'undo'`. A plant's `worldPos` is its cell centre on the bed (its foot), in world space, with `radius = HIT_RADIUS_M`. `BedRenderSystem` owns the plants' targets; whoever draws a seed, an orb, a petal or a control owns that target. `kind`, `id` and `radius` are passed to `addComponent` and never set afterwards: hands reads them once, when the component is added (§1.4); only `worldPos` is written later.
8. **Seeds.** `garden:seedArrived` = a seed joined the supply. `garden:seedOut` = the next seed of the supply rests on a hand; it is still in `state.seeds`. It is drawn at that hand's `HandState.palmPos` until another hand's `gesture:pinchStart` names it as its target, and from then at the carrying hand's `HandState.pinchPos`. It stops being out in exactly two ways: `garden:changed` naming its id in `diff.added` (planted), or `garden:seedBack`, whose `reason` covers every other end, the session's end and `newGarden()` included. No seed is handed out before the session's visit.
9. **Saving.** Every `garden:changed` and every `settings:changed` is handed to the saver, with the live settings in the state, and written within `SAVE_DEBOUNCE_MS`; the saver is flushed on `xr:visibility { visible: false }`, on `xr:sessionEnd` and when the document is hidden. A module never calls the store or the saver.
10. **Brightness.** There is one `FlashGuard`. An element belongs to the object that claimed it, and only that object calls `request` for it, once per frame. A second effect on a plant (hover glow, bloom, Listen foreground) is handed to `PlantRenderer` and combined there.
11. **The tide's phase.** A renderer that follows the tide takes `engine.clock.barPhase()` only when the bed is placed, the session has its signature and `engine.clock.now() > 0`, and `NaN` otherwise. Before `init()` the engine reports phase 0, which is a valid phase, and during Re-place there is no bed to sweep.
12. **A throw does not stop the frames.** The helper catches a throw from a system's `update`, logs it and pauses that system for 1 s (LLD §8). It covers every system of the world: the ones registered through it, and IWSDK's own, which it wraps after the last registration. It does not reach three other places, and code there catches its own throw: a query's `qualify` or `disqualify` callback (it runs inside the caller's `addComponent`), a callback inside the render (`scene.onAfterRender`), and a promise continuation, which does no work in the wiring for that reason. A bus handler is covered by the bus (§2). `register` returns the instance, and throws at start-up for a priority lower than the previous call's and for a `configData` key the system's schema lacks.
13. **One space.** `world.player` is never moved (`locomotion: false`), so a pose in the XR reference space is a world pose.
14. **For browser tests.** With `Flags.dev` on, `window.__roomsong` is `{ world, engine, garden }`. Nothing in `src/` reads it. Events are read from the bus, which a test already reaches through the dev server's `/src/core/index.ts`.

**Where the later tasks plug in.**
| Task | Uses |
|---|---|
| Seed delivery (T-127) | `garden:seedOut`, `garden:seedBack` and its `reason`, `HandState.palmPos` and `pinchPos` (rule 8); a system at 49 that takes `guard` |
| Shaping (T-146) | makes `GestureMachine` send `drag` and `pull`; `GardenSystem` already commits them and emits `garden:removed`. The undo petal is an `Interactable { kind: 'undo', id }` drawn on `garden:removed` |
| Listen mode (T-148) | adds the Listen state and `listen:*` to `GardenSystem`; a system at 52 that takes `guard` and `engine` |
| Onboarding (T-150) | `room:signature`, `room:tuned`, `garden:seedOut`, `garden:changed`; a system at 35 |
| Settings panel (T-151) | a system at 62 that takes `garden` and `room`: `garden.newGarden()`, `room.replace()`, and its own `garden.setBedHeightOffset()` |
| Pause and resume (T-152) | `xr:visibility`; rule 9 |
| Anchors (T-162) | an `AnchorStore` handed to `RoomSystem`; the saved pair from `garden:changed.state`; `room:bedPlaced.placement.pose` for `create()` |
| Garden window (T-114) | the mode gate in `src/app.ts` (`World.create` with `xr: false`, the page's own `xr:*` events), rule 3, and a way to give `HandSystem` another `InputSource`, which it adds to `hands/` |
| Gaze dwell (T-160) | `room.confirm()`; the `Interactable` entities |

**What the wiring adds to other sections**, each marked "to build" where it stands: `PlacementSolver.preview()` and the two level-3 rules (§1.3); `BedRenderer.setGhost()` (§1.8); the caption keys `placeLook`, `placeLookGaze` and `E_AUDIO_CONTEXT` and the components' export (§1.0); the events `garden:seedOut` and `garden:seedBack` (§2). Still to be written into §1.2 by the task that builds it (T-128d): `AudioEngine.stats.triggers`, the number of notes the scheduler has started since `init()`.

## 2. Event bus (`core/events.ts`)
Typed pub/sub, synchronous, no async handlers in hot paths.
`core/events.ts` owns the bus and the `EventMap` interface (§1.0), which holds only the events declared in `core/`: `settings:changed`, which core emits, and the three `xr:*` events, which `src/index.ts` emits (it owns the session; core cannot see it). Every other module adds the events it emits by declaration merging in its own `events.ts` (`declare module '../core/index.js' { interface EventMap { … } }`), so `core/` imports no payload type and a payload type lives with its emitter. The table is the merged map.
An `events.ts` must be a module, or the `declare module` block does not compile: it has an import (usually the `import type` of a payload type) or `export {}`. An empty payload, `{}` in the table, is typed `Record<string, never>` (lint bans the `{}` type) and emitted with `{}`. A copyable example is in the JSDoc of `EventMap` in `core/events.ts`.
During an emit (v1.2.1): handlers run in subscription order; a handler removed before its turn is not called; a handler added is first called by the next emit; a handler that throws is logged and the rest still run; emitting from inside a handler is allowed. With the `eventLog` flag (§3) every emit is logged at debug level.
A consumer never imports the emitter to name a payload: it writes `EventMap['gesture:release']`, with `EventMap` imported from `core/`. The merged map is a whole-program type, so this needs no upward import, but it typechecks only once the emitter's `events.ts` is in the program. `garden/GardenSystem.ts` consumes `gesture:*`, `hands:*` and `room:*` from the level above it. Two rules keep that from blocking anyone: (1) a module's `events.ts` holds declarations only, can be written straight from this table, and is the first file of the module to land, before any implementation; (2) garden's pure files never mention `EventMap`, so they build and test with `core/` alone.

| Event | Payload | Emitter → Consumers |
|---|---|---|
| `xr:sessionStart` / `xr:sessionEnd` / `xr:visibility` | `{ visible: boolean }`, all three: `true` on `xr:sessionStart`, `false` on `xr:sessionEnd` | `src/index.ts`, in its wiring half `src/app.ts` (§1.10; declared in core's `EventMap`) → audio, ui, room, hands, garden; for persistence the wiring itself calls `flush()` (below). `xr:visibility.visible` is `session.visibilityState !== 'hidden'`, emitted when that value changes, from the session's own `visibilitychange` event; a blurred session counts as seen (§1.10 rule 3). (In the garden window the same three events are emitted for the page: Enter click, close, `visibilitychange`; FR-SYS-07) |
| `settings:changed` | `{ settings: Settings }` | core (`settings.set`) → audio, access, render, ui, `src/index.ts` (it saves: below). Emitted only when a field really changed. `settings` is the new frozen value; a handler reads `settings.get()` when another handler may have called `set()` in between (v1.2.1) |
| `room:placementLevel` | `{ level }` | room → ui, log. Once for each level the chain tries, in order; the last one of a run is the level of its bed (for example 1, 3, 4), so a consumer must expect several. For a bed that comes back from an anchor RoomSystem emits it once (§1.3) |
| `room:bedPlaced` | `{ placement: BedPlacement, restored: boolean }` | room → garden, render, audio. `restored` = the pose came back from the saved anchor and the chain did not run. On `restored = false` garden drops any saved anchor pair (`setAnchor(null)`): it is stale (§1.3) |
| `room:anchored` | `{ handle: string, level: PlacementLevel }` | room → garden (stores the pair with `setAnchor`). Emitted when `AnchorStore.create()` resolves, any time after `room:bedPlaced`; never in a restored session; not at all when anchors are unsupported or creation fails (FR-ROOM-07) |
| `room:features` | `{ features: RoomFeatures, surfaces: RoomSurfaces }` | room → garden, render (the ripple's surfaces), log. Emitted by RoomSystem in the frame of `room:bedPlaced`, once per placement, so again after Re-place (§1.10 rule 4). That is within 3 s of session start when the bed lands on a plane or comes back from its anchor (FR-ROOM-10). At level 3 it follows the confirm or the end of the level-3 wait, so it can be as late as `PLANE_LEVELS_TIMEOUT_MS + HIT_TEST_TIMEOUT_MS` (13 s) after session start; the signature is Wanderer then, whatever was read |
| `room:signature` | `{ signature: RoomSignature, starterSeeds: boolean }` | garden → audio, render (TuningRipple, palette), onboarding, log (FR-ROOM-11/13). `starterSeeds` = this session issued the starter seeds from `signature.starterVoices` (a new garden); it picks the ripple's table caption (LLD §5.8) |
| `room:tuned` | `{}` | render (TuningRipple) → onboarding, ui (≤ 4 s after `room:signature`; FR-ROOM-12) |
| `room:wallsFound` | `{ walls }` | room → render (Could, C4; was Should, D-021) |
| `gesture:*` | see §1.4: the `GestureEvent` member of that name, `type` included. The object is reused by its emitter, so a handler copies what it keeps (v1.2.3) | hands/access → garden, onboarding, ui, render (`gesture:trackingLost` = the grace expired and the gesture was reverted: render lerps a dragged plant back over `REVERT_LERP_MS`) |
| `hands:lost` / `hands:found` | `{ hand: Hand }` | hands → render (hand-visibility tint), ui (hint): tint and hint only for a hand that holds a gesture (D-030, LLD §4); garden (listed per sheet 6.3; no action in v1: the model is not touched before a release). Once per loss and once per return, emitted at once, before the grace runs (FR-HND-15) |
| `target:hover` | `{ hand: Hand, target: TargetRef \| null, cell: Cell \| null }` | hands → render (cell ghost, plant glow), ui. `cell` = the cell a release would commit: the snapped cell resolved to the nearest free one; `null` off the bed or when the bed is full. On change only (FR-HND-16) |
| `garden:changed` | `{ state: GardenState, diff: { added, removed, changed } }` | garden → audio, render, ui, `src/index.ts` (it saves: below). `added`, `removed` and `changed` are each a `readonly string[]` of plant ids: planted or put back by undo, removed, moved or reshaped (v1.2.2, D-031) |
| `garden:removed` | `{ plantId, undoToken, expiresAt }` | garden → render (undo petal over the removed plant's own cell, UX §9.3), audio (`removeRev`), ui; `expiresAt = now + UNDO_LIFE_MS` (5000; FR-HND-11, FR-MUS-12) |
| `garden:grown` | `{ deltas }` | garden → render, audio. At most once per visit: at a session's signature and at a return from a pause (§1.10 rule 4) |
| `garden:seedArrived` | `{ seed }` | garden → render (the supply), onboarding. A seed joined the supply: one event per new seed of a visit. Not a seed reaching a hand: that is `garden:seedOut` |
| `garden:seedOut` | `{ seed, hand }` | garden → render (the seed on the palm, T-127), onboarding. The next seed of the supply rests on that hand after its palm-up (FR-HND-05); at most one seed is out, and it stays in `state.seeds` until planted (§1.10 rule 8). To build: T-128b |
| `garden:seedBack` | `{ seedId, reason }` | garden → render, audio (`bump`), onboarding, ui. The seed that was out is in the supply again; `reason` is `'offBed'` (released off the bed), `'full'` (released over a full bed), `'lost'` (the carrying hand was lost past its grace) or `'reset'` (the session ended, or New garden). To build: T-128b |
| `listen:enter` / `listen:exit` | `{}` | garden → audio, render, ui |
| `onboarding:step` | `{ step }` | onboarding → ui |
| `perf:sample` | `{ fps, draws, tris, jsMs, voices, maxFlashPerS }` | render (`PerfSampler`, once a second; the object is reused, so a handler copies what it keeps) → perf hud, tests. `fps` and the mean `jsMs` over the last second; `draws` and `tris` of the frame the sample was taken on; `voices` as the caller hands it in; `maxFlashPerS` = the peak since the previous sample: the most luminance changes any one element had inside one second. It must stay ≤ `FLASH_CAP_PER_S` = 3: FR-UI-11, TC-E2E-15; §1.8 |

**Settings and saving (v1.2.1, v1.2.5).** The `settings` store of `core/` is the live value, and it saves nothing. `PersistenceSystem` (§1.5) listens to no event: `src/index.ts` drives it. On `garden:changed`, and on `settings:changed` with the last state it saw, `src/index.ts` hands it the state with the live settings in it, `save({ ...state, settings: settings.get() })`; garden's reducers never change `GardenState.settings`, so without that step a settings change is never saved. It calls `flush()` on `xr:visibility { visible: false }`, on `xr:sessionEnd` and on the page's `visibilitychange` to hidden, and it raises the `E_SAVE_FAILED` caption from `onSaveFailed`. After `Store.load()`, `src/index.ts` seeds the store with `settings.set(validateSettings(state.settings))`.

## 3. URL flags (`core/flags.ts`) — dev/test only, ignored in prod builds unless `?dev=1`
`perfHud` · `fovGuide` · `eventLog` · `noAnchors` · `noPlanes` · `noMeshes` · `forceLevel=1..4` · `fakeDay=+N` · `seed=<int>` (deterministic variations) · `autoplant=N` (plants N random seeds for perf tests) · `skipOnboarding` · `forceSignature=wanderer` (skip room features; use `WANDERER`) · `pinchTest` · `capSpike` (*Cut (T-104, T-105):* still parsed, read by nothing; the test pages are opened by address, `/proto/pinch/` (TC-DEV-00) and `/proto/spike/` (TC-DEV-0A)) · `window` (forces the garden window even where `immersive-ar` is supported, e.g. under IWER; FR-SYS-07, TC-E2E-14).
**Syntax and bounds (v1.2.1).** One query parameter, `flags`, holds a comma-separated list, and a second one, `dev=1`, is the gate in a production build: `?dev=1&flags=perfHud,forceLevel=3,fakeDay=+1`. A production build without `dev=1` gets the defaults whatever else the URL says (Vite compiles `import.meta.env.DEV` to `false`); a dev build needs no `dev=1`. A repeated `flags` parameter adds to the list. A boolean flag is on when it is listed bare or as `name=1`, and off as `name=0`. A number is a whole number in plain digits with an optional sign: `forceLevel` 1..4, `fakeDay` −3650..+3650 days, `seed` 0..4294967295, `autoplant` 0..80. `forceSignature` takes `wanderer` only. An unknown name, a malformed value or a value out of bounds is ignored: the flag keeps its earlier value or its default, and parsing never throws. Defaults: every boolean false, `forceLevel` null, `fakeDay` 0, `seed` null, `autoplant` 0, `forceSignature` null. `Flags.dev` reports the gate.
**Reading flags (v1.2.1).** `flags` is frozen and built once per page load. A system or class outside `core/` takes `Flags` as an argument that defaults to the singleton and reads it when it runs, never at import time; a test passes `{ ...flags, noPlanes: true }`. Never use `vi.resetModules()` in a test that imports `core/`: the ECS component registry is global, and a second declaration of `BedAnchor` throws.

## 4. Storage schema (IndexedDB db `roomsong`, store `garden`, key `state`)
`GardenStateV1` as in §1.1 (`bedInner`/`bedOuter` are stored as constants for forward compatibility; `bedRadius` never shipped). The room signature is **not** stored; it is recomputed each session (FR-ROOM-13). Backup at key `state.backup.<timestamp>`; keep the latest 2.
`settings` is the `Settings` type of §1.0; `settings.dwellMs` joins version 1 (nothing has shipped): the validator fills a missing `dwellMs` with 900. `anchorHandle` and `anchorLevel` stay optional and travel together: the anchor is Must, its absence is the re-placement fallback (FR-ROOM-07). `anchorLevel` joins version 1 too; the validator drops a handle that has no valid level, and the bed is then re-placed.
Migration policy: `migrations.ts` has `migrate(v: unknown): GardenState | null`; unknown versions → null (new garden, backup kept).
**Backup (v1.2.5).** A state that is corrupt or of an unknown version is moved, not copied: it is written to `state.backup.<timestamp>` in the storage it was read from and the `state` key is deleted, so a second load makes no second backup. `<timestamp>` is ms on core's clock, all digits. Each storage keeps its own latest 2 backups.
**Fallback (v1.2.5; FR-PER-01, ADR-003).** localStorage holds the same keys under `roomsong.garden.` (`roomsong.garden.state`, `roomsong.garden.state.backup.<timestamp>`), each value as JSON; IndexedDB holds the object itself. A write goes to IndexedDB, and to localStorage only when IndexedDB refuses it or did not open within `IDB_OPEN_TIMEOUT_MS`; a write IndexedDB takes removes the localStorage copy. A localStorage copy is therefore the newer one, and `load()` reads it first. When both storages hold a valid state: with a different `createdAt` they are two gardens (a second one was started in a session in which IndexedDB did not open), and `load()` returns the older one, by `createdAt`, and moves the newer one to a backup key in its own storage (D-033), so that the grown garden stays in sight and no garden is ever overwritten or removed without a backup; with the same `createdAt` the copy with the later `lastVisitAt` is returned, the localStorage one on a tie.
**Validator (v1.2.5).** `load()` and `save()` both run it; it never throws. A value the app could not have written is refused whole: a `version` other than 1; a `bedInner` or `bedOuter` other than 0.12 and 0.30; a missing field or a wrong type; a number that is not finite; a `bedHeightOffset` beyond ±0.10; a plant `height`, or a `hue`, outside 0..1; a `cell` that is not a cell of the bed (ring 0..4, step 0..15, whole numbers); two plants in one cell; an id that is empty, longer than 64 characters, or used twice among the plants and seeds; a voice that is not a `VoiceType`; a `lastSeedDate` that is not `YYYY-MM-DD` with a month 01..12 and a day 01..31; `visits` that is not a whole number ≥ 0; more than 80 plants; more than 5 seeds (FR-MUS-08); a `codex.discovered` that repeats a voice. It repairs two things only: the settings (`validateSettings`, §1.0) and the anchor pair (kept when the handle is a string of 1..64 characters and the level is 1..4, else both are dropped). Keys that are not part of the schema are dropped at every level. The result is a new object, and its cells are garden's shared frozen ones (§1.1).

## 5. Error codes (for logs and captions)
`E_XR_UNSUPPORTED` (non-fatal once the garden window is built: FR-SYS-07), `E_HANDS_UNAVAILABLE`, `E_PLACEMENT_TIMEOUT` (non-fatal → L4, logged at warn), `E_ANCHOR_RESTORE` (non-fatal), `E_SAVE_FAILED`, `E_AUDIO_CONTEXT`.

## 6. Versioning
Module interface changes: note here under a "Changelog" entry with date, PR, and reason.

### Changelog
- 2026-10-09 — v1.0 initial contracts.
- 2026-10-10 — v1.1 (REPLAN_2026-10-10, D-010/D-011; no PR yet, pre-scaffold). garden: `Cell.ring` 0..4 (annulus, 5×16 = 80 cells); `GardenState.bedRadius` → `bedInner: 0.12; bedOuter: 0.30`; `snapToCell(bedLocal)` (no radius arg) returns `Cell | null`; added `bedZone`, `cellCentre`, `BED_*`/`RINGS`/`STEPS` constants; `prune`/`undoPrune` → `removePlant`/`undoRemove`; removed `setHue` (hue fixed at seed creation), `SeasonId`, `seasonFor`; added `RoomFeatures`, `RoomSignature`, `ModeId`, `WANDERER`, `roomSignature()`, `chordDegrees()`; `applyVisit` takes the signature for starter voices. audio: `setSeason` → `setSignature`; added `chordTone`; ui sound `pruneRev` → `removeRev`. room: `RoomSize` → `RoomFeatureExtractor`; added `RoomSurfaces`/`SurfaceRef`. hands: removed `wristRoll` and `gesture:twist`; `gesture:release.flick` → `zone: BedZone`; `gesture:drag` carries `zone`. events: added `room:features`, `room:signature`, `room:tuned`, `garden:removed`. flags: added `forceSignature=wanderer`, `pinchTest`, `capSpike`.
- 2026-10-10 — v1.2 (plan v2.1: PLAN_AMENDMENT_2026-10-10 §6.3, D-020/D-021/D-025; T-113 contract stage, no PR yet). **Structure:** dependency-direction paragraph added to §1; new §1.0 `core/` and §1.7 `window/`. **core:** `Settings` moved here from `garden/` (so `core/` imports no other module); `Settings.dwellMs: 600 | 900 | 1200` added (default 900, FR-HND-12); `Settings.tempo` comment no longer says it follows the signature; `Hand` type named; `Vec2`/`Vec3`/`Mat4` declared in `core/`; `EventMap` holds core's events and every other module merges its own in. **garden:** `ModeId` = `'majorPent' | 'minorPent' | 'susPent'` (`dorianHex`, `lydianHex` *Cut (D-025)*); `MODE_DEGREES` exported with the three degree sets; `chordDegrees(mode)` now returns a mode-specific ring-index triple (`[0,2,3]` / `[0,1,3]` / `[0,2,3]` = major triad / minor triad / sus4) instead of the fixed `[0, 2, 4]`; `RoomFeatures.roomVolume?` added; `RoomSignature.reverbRt60` added; `RoomSignature.tempo` kept, constant 84 in v1 (`SIGNATURE_TEMPO_BPM`); `RoomSignature.reverbSize` kept as a label derived from `reverbRt60`; constants `REVERB_RT60_MIN_S`, `REVERB_RT60_MAX_S`, `REVERB_RT60_STEPS_S`, `REVERB_RT60_DEFAULT_S`; `WANDERER` gains `reverbRt60: 0.9`; `roomSignature` returns `WANDERER` also when no feature is known. **audio:** `VOICE_CAP = 24` (bounds `stats.voices`); `setReverb(size)` → `setReverb(decay: number | 'auto' | 'off')` for the one shared reverb; `setSignature` drives the reverb decay from `reverbRt60` and no longer touches the tempo; `chordTone(degree: 0|2|4)` → `chordTone(note: 0|1|2)`; equal-power panning by default, no HRTF switch; `init` must run inside the Enter gesture. **room:** `BED_CENTRE_DEFAULT_M = 0.45` (was 0.40, D-020) with `BED_CENTRE_MIN_M`, `BED_CENTRE_MAX_M`, `BED_FAR_EDGE_MAX_M`; `AnchorStore` is Must (D-021); `WallFinder` is Could (D-021). **hands:** `InputSource` interface added (owned by `hands/`, FR-SYS-07); `HandFrame.hand` typed `Hand`; `gesture:release` gains `cell: Cell | null` and the commit-on-release rule for orb/undo/panel targets; `gesture:trackingLost` documented as "grace expired, gesture reverted"; thresholds exported as named constants (`PINCH_*`, `ONE_EURO_*`, `TARGET_VISIBLE_DIAMETER_M`, `HIT_RADIUS_M`, `HOVER_DEAD_BAND_M`, `TRACKING_GRACE_MS`, `REVERT_LERP_MS`, `DRAG_DEAD_ZONE_M`). **access:** dwell time read from `Settings.dwellMs`. **window:** new module (`PointerSource`, `WindowStage`). **events:** added `hands:lost`, `hands:found`, `target:hover`; `gesture:*` also consumed by render; `perf:sample` gains `maxFlashHz` (FR-UI-11); `xr:*` events also emitted in the garden window. `room:wallsFound` marked Could (vines, D-021). **flags:** added `window`. **storage:** `settings.dwellMs` joins schema version 1 (validator default 900). **errors:** `E_XR_UNSUPPORTED` non-fatal once the garden window exists.
- 2026-10-10 — v1.2, review round (two independent reviews of the v1.2 draft; same contract version: nothing had been built on the draft). **Structure:** shared ECS components are declared in `core/components.ts` (`BedAnchor`, `Interactable`, `Caption`); garden's pure files import plain core types only, and `GardenSystem.ts` may use core's bus, log and flags; the consumer side of the `EventMap` rule is written down. **core:** `Vec2`, `Vec3`, `Mat4` given their shapes, and the bed-local axis convention; `DEFAULT_TEMPO_BPM = 84` added, with the 60–80 research band and the T-103 note; `CAPTION_MIN_MS = 1200` added. **garden:** `PlacementLevel` moved here from `room/`; `GardenState.anchorLevel?` added beside `anchorHandle?`, with the reducer `setAnchor`; `UndoToken` and `GrowthDelta` defined; `PULL_RANGE_M` and `heightAfterPull` added; `nearestFreeCell` gains `ignorePlantId?`; `RoomSignature.tempo` is `number`; `SIGNATURE_TEMPO_BPM` *Cut*; unknown `RoomFeatures` fields are omitted, and a non-finite or non-positive value counts as unknown; `reverbSize` sets nothing in audio. The reverb formula's absorption constant changed (LLD §5.8): `SABINE_ALPHA` *Cut*, `SABINE_ABSORPTION_M2 = 10`; `WALL_COUNT_BOUNDS` is `[3, 6]`. **audio:** `setListenerPose(head)` added; `setReverb(mode: 'auto' | 'small' | 'off')` replaces the draft's numeric form; `Voice.trigger` gains `out`, and `Voice` is marked internal to `audio/`; one reverb send level. **room:** `room:bedPlaced` gains `restored`; new event `room:anchored`; the placement order with a saved anchor is written out; `WallPlane` = `SurfaceRef`; the extractor reads the planes itself. **hands:** `HandFrame` gains `select` and `palmPos`; `gesture:release` gains `gesture: HeldGesture` and `dy`, `cell` is non-null only for carry and drag, and the release table is added. **render:** new §1.8 with `FLASH_CAP_PER_S` and `FLASH_MIN_DELTA`. **events:** `room:signature` gains `starterSeeds`; `target:hover.cell` is the cell a release would commit; `perf:sample.maxFlashHz` → `maxFlashPerS` (`FLASH_CAP_HZ` → `FLASH_CAP_PER_S`); garden's part in `hands:*` reworded. **storage:** `anchorLevel` joins schema version 1.
- 2026-10-10 — v1.2.1 (T-106 review; additions only: no v1.2 signature changes). **core (§1.0):** the runtime surface as built: `bus`, `clock` / `createClock` (epoch ms plus the `fakeDay` offset), `flags` / `parseFlags` / `Flags`, `settings` (`get` / `set`), `DEFAULT_SETTINGS` with every default (volume 0.8, `beatRing` true, `hintsEnabled` true, `dominantHand` 'right', tempo 84, `dwellMs` 900, the other booleans false), `validateSettings`, `log` / `LogEntry` / `ErrorCode`, `Pool`, `STRINGS` / `StringKey`, and the three components; the log and bus rules. `BedAnchor` has no pose field: the pose is the entity's transform (LLD §3). **events (§2):** new event `settings:changed { settings }`; `src/index.ts` named as the emitter of the three `xr:*` events, all of which carry `{ visible }`; an `events.ts` must be a module and an empty payload is `Record<string, never>`; what happens during an emit; who writes `GardenState.settings` and who seeds the store. **flags (§3):** the syntax (`?dev=1&flags=a,b=1`), the bounds and defaults, and the rule that code outside `core/` takes `Flags` as an argument; no `vi.resetModules()` with `core/`.
- 2026-10-11 — T-113 consistency pass (no signature changes; no version change in this entry). **events (§2):** the `hands:lost` / `hands:found` row says the tint and the hint are shown only for a hand that holds a gesture (D-030); the events themselves are unchanged. **flags (§3):** `pinchTest` and `capSpike` marked *Cut (T-104, T-105)*: still parsed, read by nothing; the test pages are opened by address. **LLD, same pass:** §4 the tint and hint rule (D-030: a hand that held a gesture, until `hands:found`, at most 5 s); §5.8 the volume row is labelled as rounded (`raw` decides), the "Tuned by" read-out on the Sound tab is where the room is credited with the key and the echo, and `forceSignature=wanderer` gives the L3/L4 ripple with no caption; §9 the two flags.
- 2026-10-11 — D-029 (T-120; a clarification: no signature changes, still v1.2.1). **core (§1.0):** the Axes paragraph now says which way the bed faces: bed-local +x to the seated user's right, +y up, +z from the bed centre toward the user; step 0 at +x, steps advancing toward +z (clockwise seen from above), so step 4 is nearest the user, step 8 left, step 12 farthest. The LLD §5.1 formula `θ = atan2(z, x)` is unchanged; LLD §5.5 has the solver orient the bed that way.
- 2026-10-11 — v1.2.2 (2026-10-11, T-120 and D-029/D-031; the garden contract as built and reviewed; the bed frame of D-029 is the entry above). **garden (§1.1), changed:** `removePlant` returns `Result<{ state: GardenState; undo: UndoToken }>` with reason `notFound` (the old shape had no value for an unknown plant). **garden, decided (D-031):** `undoRemove` keeps the plant: its own cell when free, else the nearest free cell, and nothing on a full bed; the token's 5 s life stays with GardenSystem (T-128); a plant takes its seed's id and seed ids are never reused for the life of a garden. **garden, written down as built:** a new plant starts at height 0.55; a cell that is not on the bed is `notFound`; `full` = the bed has no free cell; `movePlant` onto the plant's own cell is ok; a call that changes nothing returns the same reference; `heightAfterPull` counts a NaN `dy` as 0; `setAnchor` does not validate the pair (the persistence validator does); a point that is not finite is zone `inner`; `snapToCell` and `nearestFreeCell` return shared frozen Cells; `nearestFreeCell` is `null` also for a cell that is not on the bed; `cellCentre` does not validate. **events (§2):** `garden:changed.diff` is `{ added, removed, changed }`, each a `readonly string[]` of plant ids. **LLD, same pass:** §1 the lines for `garden/config.ts` and `garden/model.ts`; §5.1 undo uses `nearestFreeCell`.
- 2026-10-11 — v1.2.3 (2026-10-11, T-124; the hands contract as built and reviewed; additions only, no v1.2.2 signature changed). **hands (§1.4), added:** `createHandFrame`; `HandSampler` with `attach` / `detach` / `setFrame` and its precondition (a frame every XR frame, `detach` on `xr:sessionEnd`; `sample` never throws); `PickCandidate`, `pickTarget` (each candidate's own radius, set to at least `HIT_RADIUS_M` by whoever builds the candidates), `toBedLocal`, `hoverCell`; `GestureContext` (`candidates`, `bedPose`, garden's `nearestFreeCell` bound to the latest state) and `GestureMachine` (one per hand); `PALM_UP_MAX_ANGLE_DEG = 35`, `PALM_UP_HOLD_MS = 400`. **hands, written down as built:** `palmNormal` is unit length and points out of the palm; `velocity` is the pinch point's, in m/s; an untracked sample keeps the last vectors and the held `pinch`; the `select = pinch` fallback is per session, as in LLD §4; `InputSource.sample` "creates no objects" replaces "allocation-free" (V8 may still box numbers); a release with no bed placed has zone `inner`; `gesture:palmUp` fires once per hold and again 400 ms after a pinch ends, and hands does not check the seed supply; `gesture:release.cell` is computed at the release until T-116 adds the hover. **events (§2):** a `gesture:*` payload carries its own `type` and is reused by its emitter. **LLD, same pass:** §1 `HandSampler` fills the caller's `HandFrame` in place (there is no pool).
- 2026-10-11 — v1.2.4 (2026-10-11, T-121; the audio contract as built and reviewed; additions only, no v1.2.3 signature changed). **audio (§1.2), added:** `createAudioEngine()`, the one way to get an engine: once per page, it starts from the `settings` store and follows `settings:changed` and the three `xr:*` events. **audio, written down as built:** `init` rejects when the context cannot be created or resumed (the caller logs `E_AUDIO_CONTEXT` and raises the caption), a later call only resumes and ignores its `ctx`, and an OfflineAudioContext is not resumed and gets no tick timer; `setTempo` clamps to 60..120 and `setVolume` to 0..1, both ignore a value that is not finite, and a tempo change does not move the tide phase; `setSignature` drops a signature with a bad key or mode whole, and a key change fades the sounding notes and cancels the scheduled ones, so one step can be silent; the decay is capped at 2.0 s until garden exports its bounds (T-141); `setListenerPose` is a no-op before `init()`; `syncPlants` keeps plants given before `init()`, leaves out a plant off the bed or with an unknown voice, ignores a pose that is not finite, treats the same array reference as unchanged, and is called on `garden:changed` and `room:bedPlaced`, not every frame; `suspend` fades for 0.2 s and then the tick suspends the context, `resume` cancels a pending suspend, and a suspend during a pending resume ends suspended; `stats.voices` counts the notes sounding or scheduled, once per tick, and `stats.cpuEstimate` is the main-thread milliseconds of one tick as a moving average; before the first signature the engine plays C major pentatonic with the default 0.9 s reverb; `chordTone`, `preview`, `ui` and Listen mode do nothing yet. **LLD, same pass:** §1 the real file list of `audio/`; §5.3 a step more than 100 ms late is skipped, and a step is counted before its listener runs; §7 the Pluck strings and the impulse response are rendered at once for now (spreading them over frames is T-143); §7.1 one send gain on the bus, and what is pooled and what is created per note.
- 2026-10-11 — v1.2.5 (2026-10-11, T-122; the persistence contract as built and reviewed). **persistence (§1.5), added:** `openStore()`, the one way to get a `Store` (IndexedDB, localStorage as the fallback, settles within `IDB_OPEN_TIMEOUT_MS`); the plain class `PersistenceSystem` (`save`, `flush`, `onSaveFailed` once per run of failed writes). **persistence, changed:** `Store.backupKey()` *Cut* (nothing called it); `load()` never rejects and returns a new, validated object; `save()` validates first and rejects for a state `load()` would refuse or when no storage took it. **storage (§4), added:** the backup is a move, per storage, latest 2 each; the localStorage keys, the write order and the load order; two gardens (a different `createdAt`) are never merged or overwritten: the older one loads and the newer one is backed up first (D-033); what the validator refuses (with the size bounds: 80 plants, 5 seeds, ids of 1..64 characters, a distinct `codex.discovered`) and the two things it repairs; unknown keys are dropped. **events (§2):** `PersistenceSystem` listens to no event; `src/index.ts` hands it the state with `settings.get()` in it on `garden:changed` and `settings:changed`, calls `flush()` on `xr:visibility { visible: false }`, `xr:sessionEnd` and the page's `visibilitychange`, and raises the save-failed caption from `onSaveFailed`. **LLD, SRS and SECURITY_PLAN, same pass:** LLD §1 the real file list of `persistence/`, §3 and §8 who raises the save-failed caption and the open timeout; SRS FR-PER-01 "a save starts within 500 ms of a change"; SECURITY_PLAN §3 the anchor handle may also be in localStorage.
- 2026-10-11 — v1.2.6 (2026-10-11, T-123 and D-034; the room contract as built and reviewed). **room (§1.3), added:** `PLANE_LEVELS_TIMEOUT_MS`, `RoomPlane`, `RoomMesh`, `PlaneAdapter`, `MeshAdapter`, `HitTestAdapter`, and `PlacementSolver` as a class (`run`, `cancel`, `update`, `confirm`) with what each call promises; forward is the level direction square to the head's right vector and distances are measured level. **Events (§2):** `room:placementLevel` fires once for each level the chain tries; the last one is the bed's level. **Errors (§1.0, §5):** `E_PLACEMENT_TIMEOUT` is non-fatal and logged at warn. **Rule (SRS FR-ROOM-01, D-034):** a plane counts by reach (its point nearest the default bed position is in front and at most 0.75 m away), not by its centre; a surface less than 0.25 m below the eyes is not used, nor a pinch-placed spot lower than 0.5 m above the floor.
- 2026-10-11 — v1.2.7 (2026-10-11, T-141; the room signature as built and reviewed; no signature changed). **garden (§1.1):** `roomSignature`, `chordDegrees`, `WANDERER` and the four reverb constants are built; `WANDERER` and every returned signature are frozen (`starterVoices` is a readonly tuple), and the Wanderer cases return `WANDERER` itself, also for a level that is not 1 or 2 and for a missing argument. **audio (§1.2):** audio imports `REVERB_RT60_MAX_S` and `REVERB_RT60_DEFAULT_S` from garden and has no floor of its own (0.3 s is the smallest step `roomSignature` returns); `REVERB_IR_MAX_S` is the buffer cap and may not be below garden's maximum.
- 2026-10-12 — v1.2.8 (2026-10-12, T-126; the ui contract as built and reviewed; additions only). **ui (new §1.9):** `FovElement`, `clampToFov` (the 25 by 20 degree view box, applied to an element's edges), `CaptionSystem` (registered by `src/index.ts` at priority 60), `Landing` (`ready`, `granted`, `failed`) and `mountLanding`, with the rules for raising and withdrawing a caption and for the Enter click. **core (§1.0):** `STRINGS` is the caption table (everything a `Caption.key` may name, at most six words each); the 2D page's copy lives in `ui/strings.ts`; no user-facing text anywhere else except the page title and the `<noscript>` line.
- 2026-10-12 — v1.2.9 (2026-10-12, T-125; the render contract as built and reviewed; additions only). **render (§1.8):** `FOVEATION_MEDIUM`, `FlashGuard` (`claim`, `reset`, `request`, `takePeak`: one request per element per frame; an element that has not swung yet may move less than half of `FLASH_MIN_DELTA`; a time that is not finite and an id that was never claimed are refused), `BedRenderer`, `PlantRenderer` (one InstancedMesh per silhouette; a plant with an unknown voice or a cell off the bed is left out), `TideRenderer` (takes the guard: its showing and hiding is a capped fade; its sweep relies on a continuous bar phase), `PerfSampler`, `PerfHud` and `createPerfHud`. **Events (§2):** what each field of `perf:sample` measures.
- 2026-10-12 — v1.2.10 (2026-10-12, T-161 and D-037; daily seed and growth as built and reviewed). **garden (§1.1), changed:** `applyVisit(s, now, sig, tzOffsetMin)` takes the zone offset as a required fourth argument (garden reads no clock and no zone). **Added:** `newGarden(now, settings)`, the one way to make a garden (`visits` 0 is what makes it new); `SEED_SUPPLY_MAX` (5), which persistence now imports; the rules of a visit (three starter seeds on the first, one seed per local day visited and not per day missed, a full supply keeps the day's seed, ids `seed-<date>`, the garden's time never goes back, a plant's age is `lastVisitAt − plantedAt`); `stageFor` boundaries at 1, 3 and 7 days belong to the higher stage. No `seeds.ts`: the supply lives in `growth.ts`.
- 2026-10-12 — v1.2.11 (2026-10-12, T-144; no signature changed). **audio (§1.2), as built:** Bass and Choir plants play their own voices; only Shimmer still rings as a bell.
- 2026-10-12 — v1.2.12 (2026-10-12, T-140; room feature extraction as built and reviewed). **room (§1.3), changed:** `RoomFeatureExtractor` is a class, `new RoomFeatureExtractor(planes, meshes)` over the two adapters, with `extract(placement)` and the member `surfaces` (of the last extract). It emits nothing; the caller emits `room:features`. `extract` reads the bed pose and level only: `BedPlacement.surfaceId` is no longer a hint, so a bed restored from an anchor finds the same table as the session that placed it. `RoomSurfaces` gives the ceiling and nearest wall at every level and the table at levels 1 and 2. The rules for each feature are in LLD §5.8.
- 2026-10-12 — v1.2.13 (2026-10-12, T-128 wiring contract; written and independently reviewed, nothing of it built yet). **New §1.10, app wiring:** `src/index.ts` is the boot and loads `src/app.ts`, which makes one of each (world, audio engine, FlashGuard, store and saver, garden holder) and registers the systems through `register()` in ascending priority; a session is `xr:sessionStart` to `xr:sessionEnd` on the bus; `GardenSystem` is a plain class that owns the garden state; no system saves. **Changed for it:** §1: only the boot and `src/app.ts` import across modules; `GardenSystem` is not an ECS system. §1.0: the three shared components are imported from `core/components.js` by every importer and are no longer re-exported by `core/index.ts`; `StringKey` gains `placeLook`, `placeLookGaze` and `E_AUDIO_CONTEXT`. §1.3: `PlacementSolver.preview()`; `confirm()` places where the preview is, and from a gaze dwell acts only at preview level 3; the level-3 wait is `HIT_TEST_TIMEOUT_MS` and then places at the preview. §1.4: a `none` release with no target confirms a level-3 placement. §1.8: `BedRenderer.setGhost(on)` and `dispose()`. §2: new events `garden:seedOut { seed, hand }` and `garden:seedBack { seedId, reason }`; `garden:seedArrived` means only "a seed joined the supply"; `room:features` timing at level 3; `xr:visibility` comes from the session's own `visibilitychange`. Each of these is built by the T-128 row named in LLD §3.5; until then the code is as the older sections say where they are marked "as built".
