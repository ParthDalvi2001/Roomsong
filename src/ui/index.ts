// Public API of the `ui` module (HLD §3, LLD §1). Other modules import from here only, never from files inside
// the folder (CODING_GUIDELINES §3).
export { clampToFov } from './FovGuard.js';
export type { FovElement } from './FovGuard.js';
export { CaptionSystem } from './Captions.js';
// The hints (T-150): an ECS system for priority 61 that takes `bed`, drawing the onboarding steps and the hand hint.
export { HintSystem } from './Hints.js';
export { mountLanding } from './Landing.js';
export { LANDING } from './strings.js';
export type { Landing } from './Landing.js';
// The settings panel and its orb (T-151): an ECS system for priority 62 that takes `garden` and `room` (API_SPEC §1.10).
export { PanelSystem } from './PanelSystem.js';
export type { PanelGarden, PanelRoom } from './PanelSystem.js';
