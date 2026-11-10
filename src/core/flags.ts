// URL flags (API_SPEC §3, LLD §9): dev and test only. Syntax: `?flags=perfHud,forceLevel=3,fakeDay=+1`.
// A production build ignores all of them unless the URL also carries `dev=1`.
import { AUTOPLANT_MAX, FAKE_DAY_MAX, FORCE_LEVEL_MAX, SEED_MAX } from './config.js';

const BOOLEAN_FLAGS = [
  'perfHud',
  'fovGuide',
  'eventLog',
  'noAnchors',
  'noPlanes',
  'noMeshes',
  'skipOnboarding',
  'pinchTest',
  'capSpike',
  'window',
  'timeLapse',
  'handCue', // T-175: read only by dev-build code (render's loadHandCue), so a production build draws nothing
] as const;
type BooleanFlag = (typeof BOOLEAN_FLAGS)[number];

export type Flags = Readonly<
  Record<BooleanFlag, boolean> & {
    /** The gate itself: a dev build, or `dev=1` in the URL. When false every flag below has its default. */
    dev: boolean;
    forceLevel: 1 | 2 | 3 | 4 | null;
    /** Days added to the clock, either sign. */
    fakeDay: number;
    seed: number | null;
    autoplant: number;
    forceSignature: 'wanderer' | null;
  }
>;
type MutableFlags = { -readonly [K in keyof Flags]: Flags[K] };

export const DEFAULT_FLAGS: Flags = Object.freeze({
  dev: false,
  perfHud: false,
  fovGuide: false,
  eventLog: false,
  noAnchors: false,
  noPlanes: false,
  noMeshes: false,
  skipOnboarding: false,
  pinchTest: false,
  capSpike: false,
  window: false,
  timeLapse: false,
  handCue: false,
  forceLevel: null,
  fakeDay: 0,
  seed: null,
  autoplant: 0,
  forceSignature: null,
});

function isBooleanFlag(name: string): name is BooleanFlag {
  return (BOOLEAN_FLAGS as readonly string[]).includes(name);
}

/** A whole number written in plain digits and inside [min, max], else null. */
function intIn(text: string, min: number, max: number): number | null {
  if (!/^[+-]?\d+$/.test(text)) return null;
  const n = Number(text);
  return n >= min && n <= max ? n + 0 : null; // + 0: `-0` parses to -0, and a flag is 0
}

/** Applies one `name` or `name=value` item. An unknown name or a malformed value changes nothing. */
function applyFlag(flags: MutableFlags, name: string, value: string | null): void {
  if (isBooleanFlag(name)) {
    if (value === null || value === '1') flags[name] = true;
    else if (value === '0') flags[name] = false;
    return;
  }
  if (value === null) return;
  if (name === 'forceLevel') {
    flags.forceLevel = (intIn(value, 1, FORCE_LEVEL_MAX) as Flags['forceLevel']) ?? flags.forceLevel;
  } else if (name === 'fakeDay') {
    flags.fakeDay = intIn(value, -FAKE_DAY_MAX, FAKE_DAY_MAX) ?? flags.fakeDay;
  } else if (name === 'seed') {
    flags.seed = intIn(value, 0, SEED_MAX) ?? flags.seed;
  } else if (name === 'autoplant') {
    flags.autoplant = intIn(value, 0, AUTOPLANT_MAX) ?? flags.autoplant;
  } else if (name === 'forceSignature' && value === 'wanderer') {
    flags.forceSignature = value;
  }
}

/** Parses a query string. Never throws. `isDevBuild` false and no `dev=1` → DEFAULT_FLAGS, whatever else the URL says. */
export function parseFlags(search: string, isDevBuild: boolean): Flags {
  const params = new URLSearchParams(search);
  if (!isDevBuild && params.get('dev') !== '1') return DEFAULT_FLAGS;

  const flags: MutableFlags = { ...DEFAULT_FLAGS, dev: true };
  // A repeated `flags` key adds to the list. In a query string `+` means a space, so `fakeDay=+1` arrives as ` 1`: trim.
  for (const item of params.getAll('flags').join(',').split(',')) {
    const eq = item.indexOf('=');
    if (eq < 0) applyFlag(flags, item.trim(), null);
    else applyFlag(flags, item.slice(0, eq).trim(), item.slice(eq + 1).trim());
  }
  return Object.freeze(flags);
}

/**
 * The flags of this page load, frozen. Vite replaces `import.meta.env.DEV` with `false` in a production build.
 * Outside core/, a system or class takes `Flags` as an argument that defaults to this object, and reads it when
 * it runs, never at import time: a test then passes `{ ...flags, noPlanes: true }` (API_SPEC §3).
 */
export const flags: Flags = parseFlags(
  typeof location === 'undefined' ? '' : location.search,
  import.meta.env.DEV,
);
