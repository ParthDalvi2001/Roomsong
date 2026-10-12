// Public API of the `core` module (API_SPEC §1.0, LLD §1). Other modules import from here only, never from files
// inside the folder (CODING_GUIDELINES §3). core/ imports no other Roomsong module.
export type { Hand, Mat4, Vec2, Vec3 } from './types.js';
export { CAPTION_MIN_MS, DEFAULT_TEMPO_BPM, MS_PER_DAY } from './config.js';
export { bus } from './events.js';
export type { EventMap } from './events.js';
export { clock, createClock } from './clock.js';
export type { Clock } from './clock.js';
export { flags, parseFlags } from './flags.js';
export type { Flags } from './flags.js';
export { DEFAULT_SETTINGS, settings, validateSettings } from './settings.js';
export type { Settings, SettingsStore } from './settings.js';
export { STRINGS } from './strings.js';
export type { StringKey } from './strings.js';
export { log } from './log.js';
export type { ErrorCode, LogEntry } from './log.js';
export { Pool } from './pool.js';
export { BedAnchor, Caption, Interactable } from './components.js';
