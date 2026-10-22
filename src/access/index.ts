// Public API of the `access` module (HLD §3, LLD §1; API_SPEC §1.6). Other modules import from here only, never
// from files inside the folder (CODING_GUIDELINES §3).
// Gaze dwell (T-160): an ECS system for priority 25 that takes `room` and `guard` (API_SPEC §1.10).
export { Dwell, GazeDwellSystem } from './GazeDwell.js';
export type { GazeRoom } from './GazeDwell.js';
// The beat ring (T-160, FR-UI-07): an ECS system for priority 26 that takes `guard`, `engine` and `bed`.
export { BeatRingSystem } from './BeatRing.js';
// Stillness opens the garden (P-016, T-173): an ECS system for priority 27 that takes `bed`; its event is in ./events.ts.
export { StillnessSystem } from './StillnessSystem.js';
