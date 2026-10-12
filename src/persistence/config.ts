// Named constants of persistence/ (CODING_GUIDELINES §4). Each cites the requirement it comes from.

/** API_SPEC §4: IndexedDB database `roomsong`, object store `garden`, the state at key `state`. */
export const DB_NAME = 'roomsong';
export const DB_VERSION = 1; // of the IndexedDB database, not of the state: that one is GardenState.version
export const STORE_NAME = 'garden';
export const STATE_KEY = 'state';
/** FR-PER-01: the same keys in localStorage, the fallback, under the database and store names. */
export const WEB_STORAGE_PREFIX = 'roomsong.garden.';

/** API_SPEC §4, FR-PER-02: a corrupt state is kept at `state.backup.<timestamp>`; the latest 2 stay. */
export const BACKUP_KEY_PREFIX = 'state.backup.';
export const BACKUPS_KEPT = 2;

/** FR-PER-01, HLD §4.3: a change is handed to the store at most this long after it happened. */
export const SAVE_DEBOUNCE_MS = 500;
/** Golden Rule 4 (cold start ≤ 5 s): how long openStore waits for IndexedDB before it goes on with localStorage alone. */
export const IDB_OPEN_TIMEOUT_MS = 1500;

/** API_SPEC §1.1 (GardenState.bedHeightOffset), FR-UI-10: metres, either way. */
export const BED_HEIGHT_OFFSET_MAX_M = 0.1;
/** API_SPEC §4: size bounds of a stored state. A bed holds RINGS * STEPS plants; that bound needs no constant here. */
export { SEED_SUPPLY_MAX } from '../garden/index.js'; // FR-MUS-08: garden's cap, so that 5 is defined once
export const ID_MAX_LENGTH = 64; // plant and seed ids, the anchor handle (a UUID has 36 characters)
