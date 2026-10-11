// TC-PER-02 and TC-PER-04: the validator is the trust boundary for everything read from disk (API_SPEC §4).
import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../../src/core/index.js';
import { cellCentre, RINGS, setAnchor, snapToCell, STEPS } from '../../../src/garden/index.js';
import { migrate } from '../../../src/persistence/migrations.js';
import { validateState } from '../../../src/persistence/schema.js';
import { plant, seed } from '../garden/fixtures.js';

import { CORRUPT, omit, savedGarden } from './fixtures.js';

describe('persistence/schema validateState', () => {
  it('keeps a valid version-1 state whole, as a copy, and does not touch its input (it is deep-frozen)', () => {
    const saved = savedGarden();
    const state = validateState(saved);
    expect(state).toEqual(saved);
    expect(state).not.toBe(saved);
    expect(state).toMatchObject({ version: 1, bedInner: 0.12, bedOuter: 0.3 }); // TC-PER-04
    expect(state).not.toHaveProperty('bedRadius');
  });

  it('takes a plant in each of the 80 cells and hands back the shared frozen cells of garden/', () => {
    const plants = Array.from({ length: RINGS * STEPS }, (_, i) =>
      plant(`p${i}`, Math.floor(i / STEPS), i % STEPS),
    );
    const state = validateState(savedGarden({ plants, seeds: [] }));
    expect(state?.plants.map((p) => p.cell)).toEqual(plants.map((p) => p.cell));
    for (const p of state?.plants ?? []) expect(p.cell).toBe(snapToCell(cellCentre(p.cell, { x: 0, y: 0 })));
  });

  it.each(CORRUPT)('rejects %s', (_what, raw) => {
    expect(validateState(raw)).toBeNull();
  });

  it('accepts the limits: offset ±0.10 m, height and hue 0 and 1, an empty garden, visits 0', () => {
    const edge = plant('e', 4, 0, { height: 0, hue: 1 });
    expect(validateState(savedGarden({ bedHeightOffset: 0.1, plants: [edge] }))?.plants).toEqual([edge]);
    expect(validateState(savedGarden({ bedHeightOffset: -0.1 }))?.bedHeightOffset).toBe(-0.1);
    const empty = savedGarden({ plants: [], seeds: [], visits: 0, codex: { discovered: [] } });
    expect(validateState(empty)).toEqual(empty);
  });

  it('accepts the size limits: 5 seeds, ids of 64 characters, every voice discovered once', () => {
    const full = savedGarden({
      plants: [plant('p'.repeat(64), 0, 0)],
      seeds: [1, 2, 3, 4, 5].map((i) => seed(`${i}`.repeat(64))),
      codex: { discovered: ['bell', 'pad', 'pluck', 'bass', 'choir', 'shimmer'] },
    });
    expect(validateState(full)).toEqual(full);
  });

  it.each([
    ['81 plants', 'plants', 81],
    ['6 seeds', 'seeds', 6],
  ])('refuses %s before it reads one of them', (_what, field, count) => {
    let reads = 0;
    const item = {
      get id(): string {
        reads++;
        return 'x';
      },
    };
    const oversized = { ...savedGarden(), [field]: Array.from({ length: count }, () => item) };
    expect(validateState(oversized)).toBeNull();
    expect(reads).toBe(0);
  });

  it('refuses a codex.discovered longer than the list of voices before it reads an entry', () => {
    let reads = 0;
    const discovered = Object.defineProperty(new Array<string>(7).fill('bell'), 0, {
      get: () => {
        reads++;
        return 'bell';
      },
    });
    expect(validateState({ ...savedGarden(), codex: { discovered } })).toBeNull();
    expect(reads).toBe(0);
  });

  it('never throws, even on a value whose fields throw when read', () => {
    const hostile = Object.defineProperty({ ...savedGarden() }, 'plants', {
      get: () => {
        throw new Error('trap');
      },
    });
    expect(validateState(hostile)).toBeNull();
  });

  describe('settings are repaired, not rejected (core validateSettings, API_SPEC §4)', () => {
    it('fills a missing dwellMs with 900 and turns any other value into 900', () => {
      const noDwell = omit(savedGarden().settings, 'dwellMs');
      expect(validateState({ ...savedGarden(), settings: noDwell })?.settings.dwellMs).toBe(900);
      const odd = { ...savedGarden(), settings: { ...savedGarden().settings, dwellMs: 700 } };
      expect(validateState(odd)?.settings).toEqual({ ...savedGarden().settings, dwellMs: 900 });
    });

    it('gives a state with no settings the defaults and keeps its plants', () => {
      const state = validateState(omit(savedGarden(), 'settings'));
      expect(state?.settings).toEqual(DEFAULT_SETTINGS);
      expect(state?.plants).toHaveLength(2);
    });
  });

  describe('the anchor pair travels together (FR-ROOM-07)', () => {
    const anchored = (handle: unknown, level: unknown): unknown => ({
      ...savedGarden(),
      anchorHandle: handle,
      anchorLevel: level,
    });

    it.each([1, 2, 3, 4])('keeps a handle with level %d', (level) => {
      expect(validateState(anchored('h', level))).toMatchObject({ anchorHandle: 'h', anchorLevel: level });
    });

    it('a state with no pair, as setAnchor(null) leaves it, stays without one', () => {
      const state = validateState(setAnchor(savedGarden(), null));
      expect(state?.plants).toHaveLength(2);
      expect(state).not.toHaveProperty('anchorHandle');
      expect(state).not.toHaveProperty('anchorLevel');
    });

    it.each([
      ['a handle with no level', 'h', undefined],
      ['a handle with level 5', 'h', 5],
      ['a handle with level 0', 'h', 0],
      ['a handle with a level that is a string', 'h', '2'],
      ['a level with no handle', undefined, 2],
      ['an empty handle', '', 2],
      ['a handle that is not a string', 42, 2],
      ['a handle of 65 characters', 'h'.repeat(65), 2],
    ])('drops %s: both fields absent, the garden kept', (_what, handle, level) => {
      const state = validateState(anchored(handle, level));
      expect(state?.plants).toHaveLength(2);
      expect(state).not.toHaveProperty('anchorHandle');
      expect(state).not.toHaveProperty('anchorLevel');
    });
  });

  it('drops keys that are not part of the schema: the room signature is never stored (FR-ROOM-13)', () => {
    const extra = { ...savedGarden(), signature: { keyRoot: 0, mode: 'majorPent' }, bedRadius: 0.3 };
    expect(validateState(extra)).toEqual(savedGarden());
    const nested = { ...savedGarden(), plants: [{ ...plant('n', 1, 1), stage: 3 }] };
    expect(validateState(nested)?.plants).toEqual([plant('n', 1, 1)]);
  });

  it('copies every level: an extra key on a seed, on the codex or on a cell is dropped, and nothing of the input is handed back', () => {
    const raw = {
      ...savedGarden(),
      plants: [{ ...plant('n', 1, 1), cell: { ring: 1, step: 1, zone: 'bed' } }],
      seeds: [{ ...seed('m'), stage: 3 }],
      codex: { discovered: ['bell'], badges: 7 },
    };
    const state = validateState(raw);
    expect(state?.plants).toEqual([plant('n', 1, 1)]);
    expect(state?.seeds).toEqual([seed('m')]);
    expect(state?.codex).toEqual({ discovered: ['bell'] });
    expect(state?.seeds[0]).not.toBe(raw.seeds[0]);
    expect(state?.codex.discovered).not.toBe(raw.codex.discovered);
    expect(state?.settings).not.toBe(raw.settings);
  });
});

describe('persistence/migrations migrate', () => {
  it('returns a version-1 state validated', () => {
    expect(migrate(savedGarden())).toEqual(savedGarden());
  });

  it.each([0, 2, 99, '1', undefined])('returns null for the unknown version %s', (version) => {
    expect(migrate({ ...savedGarden(), version })).toBeNull();
  });

  it('returns null for a corrupt version-1 state', () => {
    expect(migrate({ ...savedGarden(), plants: [plant('p', 5, 0)] })).toBeNull();
  });
});
