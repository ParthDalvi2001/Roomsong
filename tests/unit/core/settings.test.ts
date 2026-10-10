import { describe, expect, it, vi } from 'vitest';

import { bus } from '../../../src/core/events.js';
import {
  createSettingsStore,
  DEFAULT_SETTINGS,
  validateSettings,
  type Settings,
} from '../../../src/core/settings.js';

function inRange(s: Settings): boolean {
  return (
    s.tempo >= 60 &&
    s.tempo <= 120 &&
    s.volume >= 0 &&
    s.volume <= 1 &&
    ['auto', 'small', 'off'].includes(s.reverb) &&
    [600, 900, 1200].includes(s.dwellMs) &&
    ['left', 'right'].includes(s.dominantHand) &&
    [s.oneHand, s.gazeDwell, s.highContrast, s.reducedMotion, s.beatRing, s.hintsEnabled].every(
      (v) => typeof v === 'boolean',
    )
  );
}

describe('core/settings validateSettings', () => {
  it('has the defaults of API_SPEC §1.0', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ tempo: 84, reverb: 'auto', dwellMs: 900 });
    expect(inRange(DEFAULT_SETTINGS)).toBe(true);
  });

  it('corrupt data falls back to the defaults and never throws', () => {
    const corrupt: unknown[] = [undefined, null, 42, 'settings', true, [], [1, 2], () => 0, Symbol('s'), NaN];
    for (const raw of corrupt) expect(validateSettings(raw)).toEqual(DEFAULT_SETTINGS);

    const wrongTypes = {
      tempo: '84',
      volume: NaN,
      reverb: 'cathedral',
      oneHand: 1,
      gazeDwell: 'yes',
      dwellMs: 700,
      highContrast: null,
      reducedMotion: {},
      beatRing: [],
      dominantHand: 'both',
      hintsEnabled: undefined,
    };
    expect(validateSettings(wrongTypes)).toEqual(DEFAULT_SETTINGS);

    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error('trap');
        },
      },
    );
    expect(validateSettings(hostile)).toEqual(DEFAULT_SETTINGS);
  });

  it('partial data keeps its valid fields and fills the rest, field by field', () => {
    const result = validateSettings({ tempo: 100, reverb: 'off', dwellMs: 'slow', dominantHand: 'left' });
    expect(result).toEqual({ ...DEFAULT_SETTINGS, tempo: 100, reverb: 'off', dominantHand: 'left' });
    // API_SPEC §4: a stored garden from before dwellMs gets 900.
    expect(validateSettings({ gazeDwell: true }).dwellMs).toBe(900);
  });

  it('future-version data: known fields are kept, unknown keys and values are dropped', () => {
    const future = {
      version: 99,
      tempo: 96,
      reverb: 'huge',
      dwellMs: 1200,
      spatialMode: 'hrtf',
      nested: { a: 1 },
    };
    const result = validateSettings(future);
    expect(result).toEqual({ ...DEFAULT_SETTINGS, tempo: 96, dwellMs: 1200 });
    expect(Object.keys(result).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
  });

  it('never yields a value outside its range', () => {
    const extremes = [-Infinity, -1, 0, 59.9, 121, 1e308, Infinity, NaN];
    for (const n of extremes)
      expect(inRange(validateSettings({ tempo: n, volume: n, dwellMs: n }))).toBe(true);
    expect(validateSettings({ tempo: 500, volume: -2 })).toMatchObject({ tempo: 120, volume: 0 });
  });
});

describe('core/settings store', () => {
  it('starts at the defaults; a loaded garden seeds it through set(validateSettings(raw))', () => {
    const store = createSettingsStore();
    expect(store.get()).toBe(DEFAULT_SETTINGS);
    store.set(validateSettings({ tempo: 'fast', volume: 0.5, version: 9 }));
    expect(store.get()).toEqual({ ...DEFAULT_SETTINGS, volume: 0.5 });
  });

  it('set emits settings:changed once, with a new frozen value', () => {
    const store = createSettingsStore();
    const before = store.get();
    const changed = vi.fn();
    const off = bus.on('settings:changed', changed);

    store.set({ tempo: 96, oneHand: true });
    off();

    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledWith({ settings: store.get() });
    expect(store.get()).toEqual({ ...DEFAULT_SETTINGS, tempo: 96, oneHand: true });
    expect(store.get()).not.toBe(before);
    expect(before.tempo).toBe(84);
    expect(Object.isFrozen(store.get())).toBe(true);
  });

  it('set with nothing new, or with only invalid values, changes and emits nothing', () => {
    const store = createSettingsStore();
    const changed = vi.fn();
    const off = bus.on('settings:changed', changed);
    const before = store.get();

    store.set({});
    store.set({ tempo: 84 });
    store.set({ reverb: 'cathedral', dwellMs: 700, volume: NaN } as unknown as Partial<Settings>);
    off();

    expect(changed).not.toHaveBeenCalled();
    expect(store.get()).toBe(before);
  });

  it('a handler that calls set again: later handlers get an old payload, and the truth from get()', () => {
    const store = createSettingsStore();
    const seen: number[] = [];
    const offFirst = bus.on('settings:changed', () => store.set({ tempo: 100 }));
    const offSecond = bus.on('settings:changed', (payload) => {
      seen.push(payload.settings.tempo, store.get().tempo);
    });

    store.set({ tempo: 90 });
    offFirst();
    offSecond();

    // The inner emit (tempo 100) reaches the second handler first; the outer one then hands it the old 90.
    expect(seen).toEqual([100, 100, 90, 100]);
  });
});
