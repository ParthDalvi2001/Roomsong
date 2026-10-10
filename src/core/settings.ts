// The Settings type (API_SPEC §1.0) and its store: validate, freeze, emit. The store saves nothing. persistence/
// listens to `settings:changed` and writes GardenState.settings; after a load, `src/index.ts` seeds the store with
// `settings.set(validateSettings(state.settings))` (API_SPEC §2).
import {
  DEFAULT_DWELL_MS,
  DEFAULT_TEMPO_BPM,
  DEFAULT_VOLUME,
  DWELL_MS_OPTIONS,
  TEMPO_MAX_BPM,
  TEMPO_MIN_BPM,
} from './config.js';
import { bus } from './events.js';

import type { Hand } from './types.js';

export interface Settings {
  /** BPM, TEMPO_MIN_BPM..TEMPO_MAX_BPM. The room does not set the tempo in v1 (D-021). */
  tempo: number;
  /** 0..1 */
  volume: number;
  reverb: 'auto' | 'small' | 'off';
  oneHand: boolean;
  gazeDwell: boolean;
  /** Gaze dwell time (FR-HND-12). */
  dwellMs: 600 | 900 | 1200;
  highContrast: boolean;
  reducedMotion: boolean;
  beatRing: boolean;
  dominantHand: Hand;
  hintsEnabled: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  tempo: DEFAULT_TEMPO_BPM,
  volume: DEFAULT_VOLUME,
  reverb: 'auto',
  oneHand: false,
  gazeDwell: false,
  dwellMs: DEFAULT_DWELL_MS,
  highContrast: false,
  reducedMotion: false,
  beatRing: true,
  dominantHand: 'right',
  hintsEnabled: true,
});
const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];
const REVERBS = ['auto', 'small', 'off'] as const;
const HANDS = ['left', 'right'] as const;

function num(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function oneOf<T>(v: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly unknown[]).includes(v) ? (v as T) : fallback;
}

/**
 * Turns anything into valid Settings. Never throws. Field by field: a valid value is kept, a finite number out of
 * range is clamped, anything else takes `fallback`'s value. Keys that are not settings (a newer version's) are dropped.
 */
export function validateSettings(raw: unknown, fallback: Readonly<Settings> = DEFAULT_SETTINGS): Settings {
  try {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<
      Record<keyof Settings, unknown>
    >;
    return {
      tempo: num(r.tempo, TEMPO_MIN_BPM, TEMPO_MAX_BPM, fallback.tempo),
      volume: num(r.volume, 0, 1, fallback.volume),
      reverb: oneOf(r.reverb, REVERBS, fallback.reverb),
      oneHand: bool(r.oneHand, fallback.oneHand),
      gazeDwell: bool(r.gazeDwell, fallback.gazeDwell),
      dwellMs: oneOf(r.dwellMs, DWELL_MS_OPTIONS, fallback.dwellMs),
      highContrast: bool(r.highContrast, fallback.highContrast),
      reducedMotion: bool(r.reducedMotion, fallback.reducedMotion),
      beatRing: bool(r.beatRing, fallback.beatRing),
      dominantHand: oneOf(r.dominantHand, HANDS, fallback.dominantHand),
      hintsEnabled: bool(r.hintsEnabled, fallback.hintsEnabled),
    };
  } catch {
    return { ...fallback }; // only a throwing getter or proxy gets here; stored data has neither
  }
}

export interface SettingsStore {
  /** The current settings: a frozen object, replaced (never mutated) on change. */
  get(): Readonly<Settings>;
  /**
   * Validates the patch against the current value; when a field really changed, emits `settings:changed`.
   * A handler of that event reads `settings.get()`: when another handler has called `set()` in the meantime,
   * the payload it was handed is already old.
   */
  set(patch: Partial<Settings>): void;
}

/** Starts at DEFAULT_SETTINGS. It stores nothing itself (see the note at the top). */
export function createSettingsStore(): SettingsStore {
  let current = DEFAULT_SETTINGS;
  return {
    get: () => current,
    set(patch) {
      const next = validateSettings({ ...current, ...patch }, current);
      if (KEYS.every((key) => next[key] === current[key])) return;
      current = Object.freeze(next);
      bus.emit('settings:changed', { settings: current });
    },
  };
}

/** The one settings store of the app. */
export const settings: SettingsStore = createSettingsStore();
