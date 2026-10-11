// Public API of the `persistence` module (API_SPEC §1.5 and §4, LLD §1). Other modules import from here only,
// never from files inside the folder (CODING_GUIDELINES §3).
export { openStore } from './Store.js';
export type { Store } from './Store.js';
export { PersistenceSystem } from './PersistenceSystem.js';
