// Public API of the `room` module (API_SPEC §1.3, LLD §1). Other modules import from here only, never from
// files inside the folder (CODING_GUIDELINES §3). The module's events are declared in ./events.ts (API_SPEC §2).
export { AnchorStore } from './AnchorStore.js';
export {
  ANCHOR_RESTORE_TIMEOUT_MS,
  BED_CENTRE_DEFAULT_M,
  BED_CENTRE_MAX_M,
  BED_CENTRE_MIN_M,
  BED_FAR_EDGE_MAX_M,
  PLANE_LEVELS_TIMEOUT_MS,
} from './config.js';
export { HitTestAdapter } from './HitTestAdapter.js';
export { MeshAdapter } from './MeshAdapter.js';
export { PlacementSolver } from './PlacementSolver.js';
export { PlaneAdapter } from './PlaneAdapter.js';
export { RoomFeatureExtractor } from './RoomFeatures.js';
// The module's ECS system (LLD §3.2): the one file of room/ that imports @iwsdk/core.
export { RoomSystem } from './RoomSystem.js';
export type { BedPlacement, RoomMesh, RoomPlane, RoomSurfaces, SurfaceRef } from './types.js';
