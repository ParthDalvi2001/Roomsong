// Public API of the `window` module (API_SPEC §1.7, LLD §11): the garden window, the same garden in a plain browser
// tab. The wiring (src/app.ts) imports it; the boot (src/index.ts) may take `shouldOpenWindow` from ./gate.js
// only, because this file loads three (API_SPEC §1.10 rule 1). Never the judged path.
export { shouldOpenWindow } from './gate.js';
export { PointerSource } from './PointerSource.js';
export { WindowStage } from './WindowStage.js';
