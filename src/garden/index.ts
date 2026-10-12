// Public API of the `garden` module (API_SPEC §1.1, LLD §1). Other modules import from here only, never from
// files inside the folder (CODING_GUIDELINES §3). The pure files import nothing but plain types from core/.
export {
  BED_INNER,
  BED_OUTER,
  PULL_RANGE_M,
  REVERB_RT60_DEFAULT_S,
  REVERB_RT60_MAX_S,
  REVERB_RT60_MIN_S,
  REVERB_RT60_STEPS_S,
  RINGS,
  SEED_SUPPLY_MAX,
  STEPS,
} from './config.js';
export { applyVisit, newGarden, stageFor } from './growth.js';
export { MODE_DEGREES } from './model.js';
export type {
  BedZone,
  Cell,
  GardenState,
  GrowthDelta,
  ModeId,
  PlacementLevel,
  Plant,
  Result,
  RoomFeatures,
  RoomSignature,
  Seed,
  UndoToken,
  VoiceType,
} from './model.js';
export {
  heightAfterPull,
  movePlant,
  nearestFreeCell,
  plantSeed,
  removePlant,
  setAnchor,
  setHeight,
  undoRemove,
} from './rules.js';
export { chordDegrees, roomSignature, WANDERER } from './signature.js';
export { bedZone, cellCentre, snapToCell } from './snap.js';
