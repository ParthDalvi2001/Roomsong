// Public API of the `render` module (API_SPEC §1.8, LLD §1). Other modules import from here only, never from
// files inside the folder (CODING_GUIDELINES §3). The module's event is declared in ./events.ts (API_SPEC §2).
// The renderers are plain classes: each takes the Object3D that carries the bed's pose and adds its meshes to
// it, in the bed frame of D-029. Nothing here adds a light, casts a shadow or uses a render target (NFR-PERF-09).
export { FLASH_CAP_PER_S, FLASH_MIN_DELTA, FOVEATION_MEDIUM } from './config.js';
export { FlashGuard } from './FlashGuard.js';
export { BedRenderer } from './BedRenderer.js';
export { PlantRenderer } from './PlantRenderer.js';
export { TideRenderer } from './TideRenderer.js';
export { PetalRenderer } from './PetalRenderer.js';
export { createPerfHud, PerfSampler } from './PerfHud.js';
export type { PerfHud } from './PerfHud.js';
// The module's ECS systems (LLD §3.2): the one file of render/ that imports @iwsdk/core.
export { BedRenderSystem, PerfSystem } from './RenderSystems.js';
