import { describe, expect, it } from 'vitest';

import { NEW_PLANT_HEIGHT } from '../../../src/garden/config.js';
import {
  cellCentre,
  heightAfterPull,
  movePlant,
  nearestFreeCell,
  plantSeed,
  removePlant,
  setAnchor,
  setBedHeightOffset,
  setHeight,
  snapToCell,
  undoRemove,
} from '../../../src/garden/index.js';

import { deepFreeze, fullBedExcept, garden, plant, seed } from './fixtures.js';

import type { Cell, GardenState, Result } from '../../../src/garden/index.js';

const NOW = 1_760_000_000_000;
// Not cells of the bed: rings 5 and 6 are the old 7-ring layout (TC-PER-04).
const BAD_CELLS: Cell[] = [
  { ring: 5, step: 0 },
  { ring: 6, step: 3 },
  { ring: -1, step: 0 },
  { ring: 0, step: 16 },
  { ring: 0, step: -1 },
  { ring: 1, step: -1 }, // index arithmetic alone would land on cell (0, 15)
  { ring: NaN, step: 0 },
  { ring: 0, step: NaN },
  { ring: 1.5, step: 2 },
  { ring: 2, step: 2.5 },
  { ring: Infinity, step: 0 },
];

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
  return result.value;
}
const cellsOf = (s: GardenState): Cell[] => s.plants.map((p) => p.cell);

describe('garden/rules plantSeed', () => {
  it('turns the seed into a plant in that cell', () => {
    const before = garden([plant('a', 0, 0)], [seed('s1', 'pluck'), seed('s2')]);
    const after = value(plantSeed(before, 's1', { ring: 3, step: 9 }, NOW));

    expect(after.plants).toEqual([
      plant('a', 0, 0),
      {
        id: 's1',
        voice: 'pluck',
        cell: { ring: 3, step: 9 },
        height: NEW_PLANT_HEIGHT,
        hue: 0.4,
        plantedAt: NOW,
      },
    ]);
    expect(after.seeds).toEqual([seed('s2')]);
    // Structural sharing: what did not change is the same object.
    expect(after.plants[0]).toBe(before.plants[0]);
    expect(after.settings).toBe(before.settings);
    expect(before.plants).toHaveLength(1);
    expect(before.seeds).toHaveLength(2);
  });

  it('an occupied cell is refused with occupied (TC-GAR-02)', () => {
    const before = garden([plant('a', 2, 5)], [seed('s1')]);
    expect(plantSeed(before, 's1', { ring: 2, step: 5 }, NOW)).toEqual({ ok: false, reason: 'occupied' });
  });

  it('a seed that is not in the supply is refused with noSeed', () => {
    const before = garden([plant('a', 2, 5)], [seed('s1')]);
    expect(plantSeed(before, 'nope', { ring: 0, step: 0 }, NOW)).toEqual({ ok: false, reason: 'noSeed' });
    expect(plantSeed(before, 'a', { ring: 0, step: 0 }, NOW)).toEqual({ ok: false, reason: 'noSeed' });
    expect(plantSeed(before, '', { ring: 0, step: 0 }, NOW)).toEqual({ ok: false, reason: 'noSeed' });
  });

  it('a full bed is refused with full', () => {
    const before = garden(fullBedExcept(), [seed('s1')]);
    expect(plantSeed(before, 's1', { ring: 1, step: 1 }, NOW)).toEqual({ ok: false, reason: 'full' });
  });

  it('a cell that is not on the bed is refused with notFound', () => {
    const before = garden([], [seed('s1')]);
    for (const cell of BAD_CELLS)
      expect(plantSeed(before, 's1', cell, NOW), JSON.stringify(cell)).toEqual({
        ok: false,
        reason: 'notFound',
      });
  });

  it('full means no free cell: a plant that is not on the bed takes none', () => {
    // 80 plants, 79 of them on the bed: only a corrupt save holds this, and the search must still agree.
    const before = garden([...fullBedExcept([37]), plant('stray', 5, 0)], [seed('s1')]);
    expect(nearestFreeCell(before, { ring: 0, step: 0 })).toEqual({ ring: 2, step: 5 });
    expect(value(plantSeed(before, 's1', { ring: 2, step: 5 }, NOW)).plants).toHaveLength(81);
    expect(plantSeed(before, 's1', { ring: 0, step: 0 }, NOW)).toEqual({ ok: false, reason: 'occupied' });
  });

  it('does not keep the cell object of the caller', () => {
    const cell = { ring: 1, step: 2 };
    const after = value(plantSeed(garden([], [seed('s1')]), 's1', cell, NOW));
    cell.ring = 4;
    expect(after.plants[0]?.cell).toEqual({ ring: 1, step: 2 });
  });
});

describe('garden/rules movePlant', () => {
  it('moves the plant and changes nothing else about it', () => {
    const before = garden([plant('a', 0, 0), plant('b', 1, 1, { height: 0.9, hue: 0.7 })]);
    const after = value(movePlant(before, 'b', { ring: 4, step: 15 }));
    expect(after.plants).toEqual([plant('a', 0, 0), plant('b', 4, 15, { height: 0.9, hue: 0.7 })]);
    expect(after.plants[0]).toBe(before.plants[0]);
    expect(before.plants[1]?.cell).toEqual({ ring: 1, step: 1 });
  });

  it('a cell another plant holds is refused with occupied', () => {
    const before = garden([plant('a', 0, 0), plant('b', 1, 1)]);
    expect(movePlant(before, 'b', { ring: 0, step: 0 })).toEqual({ ok: false, reason: 'occupied' });
  });

  it('its own cell is a move that changes nothing: the same state comes back', () => {
    const before = garden([plant('a', 0, 0), plant('b', 1, 1)]);
    expect(value(movePlant(before, 'b', { ring: 1, step: 1 }))).toBe(before);
  });

  it('an unknown plant or a cell that is not on the bed is refused with notFound', () => {
    const before = garden([plant('a', 0, 0)]);
    expect(movePlant(before, 'ghost', { ring: 1, step: 1 })).toEqual({ ok: false, reason: 'notFound' });
    for (const cell of BAD_CELLS)
      expect(movePlant(before, 'a', cell), JSON.stringify(cell)).toEqual({ ok: false, reason: 'notFound' });
  });

  it('works on a full bed only towards its own cell', () => {
    const before = garden(fullBedExcept());
    expect(movePlant(before, 'p17', { ring: 1, step: 2 })).toEqual({ ok: false, reason: 'occupied' });
    expect(value(movePlant(before, 'p17', { ring: 1, step: 1 }))).toBe(before);
  });
});

describe('garden/rules setHeight and heightAfterPull (FR-HND-08)', () => {
  it('sets the height of one plant', () => {
    const before = garden([plant('a', 0, 0), plant('b', 1, 1)]);
    const after = setHeight(before, 'b', 0.8);
    expect(after.plants).toEqual([plant('a', 0, 0), plant('b', 1, 1, { height: 0.8 })]);
    expect(after.plants[0]).toBe(before.plants[0]);
  });

  it('clamps to 0..1', () => {
    const before = garden([plant('a', 0, 0)]);
    expect(setHeight(before, 'a', 7).plants[0]?.height).toBe(1);
    expect(setHeight(before, 'a', -0.2).plants[0]?.height).toBe(0);
    expect(setHeight(before, 'a', Infinity).plants[0]?.height).toBe(1);
  });

  it('gives the same state back for an unknown plant, a NaN and an unchanged height', () => {
    const before = garden([plant('a', 0, 0, { height: 0.5 })]);
    expect(setHeight(before, 'ghost', 0.8)).toBe(before);
    expect(setHeight(before, 'a', NaN)).toBe(before);
    expect(setHeight(before, 'a', 0.5)).toBe(before);
  });

  it('heightAfterPull adds dy / 0.25 m and clamps to 0..1', () => {
    expect(heightAfterPull(0.5, 0.05)).toBeCloseTo(0.7, 12);
    expect(heightAfterPull(0.5, -0.05)).toBeCloseTo(0.3, 12);
    expect(heightAfterPull(0, 0.25)).toBe(1);
    expect(heightAfterPull(0.5, 3)).toBe(1);
    expect(heightAfterPull(0.5, -3)).toBe(0);
    expect(heightAfterPull(0.5, 0)).toBe(0.5);
  });

  it('heightAfterPull counts a NaN travel as none: the height comes back, clamped', () => {
    expect(heightAfterPull(0.4, NaN)).toBe(0.4);
    expect(heightAfterPull(1.7, NaN)).toBe(1);
    expect(heightAfterPull(-0.3, NaN)).toBe(0);
  });
});

describe('garden/rules removePlant and undoRemove (TC-GAR-03, FR-MUS-12)', () => {
  it('removes the plant and hands it back in the undo token', () => {
    const before = garden([plant('a', 0, 0), plant('b', 1, 1)]);
    const { state, undo } = value(removePlant(before, 'a'));
    expect(state.plants).toEqual([plant('b', 1, 1)]);
    expect(undo.plant).toBe(before.plants[0]);
    expect(before.plants).toHaveLength(2);
  });

  it('an unknown plant is refused with notFound', () => {
    expect(removePlant(garden([plant('a', 0, 0)]), 'ghost')).toEqual({ ok: false, reason: 'notFound' });
    expect(removePlant(garden(), '')).toEqual({ ok: false, reason: 'notFound' });
  });

  it('undo brings back the identical plant: same cell, height, hue, voice and age', () => {
    const original = plant('a', 3, 7, { height: 0.83, hue: 0.61, voice: 'choir', plantedAt: 42 });
    const before = garden([original, plant('b', 1, 1)]);
    const { state, undo } = value(removePlant(before, 'a'));
    const restored = undoRemove(state, undo);
    expect(restored.plants.find((p) => p.id === 'a')).toBe(original);
    expect(restored.plants).toHaveLength(2);
    expect(restored.plants).toEqual(expect.arrayContaining(before.plants));
  });

  it('a second undo with the same token changes nothing', () => {
    const { state, undo } = value(removePlant(garden([plant('a', 3, 7)]), 'a'));
    const restored = undoRemove(state, undo);
    expect(undoRemove(restored, undo)).toBe(restored);
  });

  it('when the cell was taken in the meantime the plant comes back on the nearest free cell', () => {
    const { state, undo } = value(removePlant(garden([plant('a', 3, 7)], [seed('s1')]), 'a'));
    const taken = value(plantSeed(state, 's1', { ring: 3, step: 7 }, NOW));
    const restored = undoRemove(taken, undo);
    expect(restored.plants.find((p) => p.id === 'a')).toEqual(plant('a', 4, 7));
    expect(restored.plants).toHaveLength(2);
  });

  it('gives the same state back when the bed is full or the token holds no cell of the bed', () => {
    const full = garden(fullBedExcept());
    expect(undoRemove(full, { plant: plant('extra', 2, 2) })).toBe(full);
    const empty = garden();
    for (const cell of BAD_CELLS)
      expect(undoRemove(empty, { plant: { ...plant('x', 0, 0), cell } })).toBe(empty);
  });
});

describe('garden/rules setAnchor (TC-PER-04, FR-ROOM-07)', () => {
  it('sets the handle and the level together', () => {
    const before = garden();
    const after = setAnchor(before, { handle: 'anchor-1', level: 2 });
    expect(after).toEqual({ ...before, anchorHandle: 'anchor-1', anchorLevel: 2 });
    expect(before).not.toHaveProperty('anchorHandle');
  });

  it('null removes both', () => {
    const before = garden([], [], { anchorHandle: 'anchor-1', anchorLevel: 1 });
    const after = setAnchor(before, null);
    expect(after).not.toHaveProperty('anchorHandle');
    expect(after).not.toHaveProperty('anchorLevel');
    expect(after).toEqual(garden());
    expect(before.anchorHandle).toBe('anchor-1');
  });

  it('gives the same state back when there is nothing to remove or the pair is already stored', () => {
    const before = garden();
    expect(setAnchor(before, null)).toBe(before);
    const stored = garden([], [], { anchorHandle: 'anchor-1', anchorLevel: 1 });
    expect(setAnchor(stored, { handle: 'anchor-1', level: 1 })).toBe(stored);
    expect(setAnchor(stored, { handle: 'anchor-1', level: 2 })).not.toBe(stored);
  });
});

describe('garden/rules nearestFreeCell (TC-GAR-02)', () => {
  it('a free cell is its own answer', () => {
    const s = garden([plant('a', 2, 5)]);
    expect(nearestFreeCell(s, { ring: 2, step: 6 })).toEqual({ ring: 2, step: 6 });
    expect(nearestFreeCell(garden(), { ring: 0, step: 0 })).toEqual({ ring: 0, step: 0 });
  });

  it('prefers ring+1, then ring-1, then step+1, then step-1', () => {
    const order: Cell[] = [
      { ring: 3, step: 5 },
      { ring: 1, step: 5 },
      { ring: 2, step: 6 },
      { ring: 2, step: 4 },
    ];
    const plants = [plant('a', 2, 5)];
    for (const expected of order) {
      expect(nearestFreeCell(garden([...plants]), { ring: 2, step: 5 })).toEqual(expected);
      plants.push(plant(`n${plants.length}`, expected.ring, expected.step));
    }
    // All four neighbours taken: the answer is two cells away, and still on the bed.
    expect(nearestFreeCell(garden(plants), { ring: 2, step: 5 })).toEqual({ ring: 4, step: 5 });
  });

  it('stays within rings 0..4', () => {
    const outer = garden([plant('a', 4, 3)]);
    expect(nearestFreeCell(outer, { ring: 4, step: 3 })).toEqual({ ring: 3, step: 3 });
    const inner = garden([plant('a', 0, 3), plant('b', 1, 3)]);
    expect(nearestFreeCell(inner, { ring: 0, step: 3 })).toEqual({ ring: 0, step: 4 });
  });

  it('wraps the steps: 15 and 0 are neighbours', () => {
    const s = garden([plant('a', 0, 15), plant('b', 1, 15)]);
    expect(nearestFreeCell(s, { ring: 0, step: 15 })).toEqual({ ring: 0, step: 0 });
    const t = garden([plant('a', 0, 0), plant('b', 1, 0), plant('c', 0, 1)]);
    expect(nearestFreeCell(t, { ring: 0, step: 0 })).toEqual({ ring: 0, step: 15 });
  });

  it('finds the last free cell from anywhere, and null when the bed is full', () => {
    const lastFree = 4 * 16 + 8;
    const s = garden(fullBedExcept([lastFree]));
    expect(nearestFreeCell(s, { ring: 0, step: 0 })).toEqual({ ring: 4, step: 8 });
    expect(nearestFreeCell(garden(fullBedExcept()), { ring: 0, step: 0 })).toBeNull();
  });

  it('ignorePlantId: the own cell of that plant counts as free (a drag)', () => {
    const s = garden([plant('a', 2, 5), plant('b', 3, 5)]);
    expect(nearestFreeCell(s, { ring: 2, step: 5 }, 'a')).toEqual({ ring: 2, step: 5 });
    expect(nearestFreeCell(s, { ring: 3, step: 5 }, 'a')).toEqual({ ring: 4, step: 5 });
    expect(nearestFreeCell(s, { ring: 2, step: 5 }, 'ghost')).toEqual({ ring: 1, step: 5 });
    const full = garden(fullBedExcept());
    expect(nearestFreeCell(full, { ring: 0, step: 0 }, 'p40')).toEqual({ ring: 2, step: 8 });
  });

  it('a cell that is not on the bed has no answer', () => {
    for (const cell of BAD_CELLS) expect(nearestFreeCell(garden(), cell), JSON.stringify(cell)).toBeNull();
  });

  it('on seeded random beds the answer is free and no free cell is nearer on the grid', () => {
    let seedState = 20261011;
    const random = (): number => {
      // mulberry32
      seedState = (seedState + 0x6d2b79f5) | 0;
      let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const distance = (a: Cell, b: Cell): number => {
      const d = Math.abs(a.step - b.step);
      return Math.abs(a.ring - b.ring) + Math.min(d, 16 - d);
    };
    for (let round = 0; round < 40; round++) {
      const fill = 0.3 + 0.69 * random();
      const free: number[] = [];
      for (let i = 0; i < 80; i++) if (random() > fill) free.push(i);
      const s = garden(fullBedExcept(free));
      const freeCells = free.map((i) => ({ ring: Math.floor(i / 16), step: i % 16 }));
      for (let i = 0; i < 80; i++) {
        const from = { ring: Math.floor(i / 16), step: i % 16 };
        const found = nearestFreeCell(s, from);
        if (free.length === 0) {
          expect(found).toBeNull();
          continue;
        }
        if (found === null) throw new Error(`no answer from cell ${i} with ${free.length} cells free`);
        expect(free).toContain(found.ring * 16 + found.step);
        expect(distance(from, found)).toBe(Math.min(...freeCells.map((c) => distance(from, c))));
      }
    }
  });

  it('answers with the shared frozen cell that snapToCell returns, not a new object', () => {
    const s = garden([plant('a', 2, 5)]);
    const shared = snapToCell(cellCentre({ ring: 3, step: 5 }, { x: 0, y: 0 }));
    expect(nearestFreeCell(s, { ring: 2, step: 5 })).toBe(shared);
    expect(nearestFreeCell(s, { ring: 3, step: 5 })).toBe(shared);
  });
});

describe('garden/rules never mutate their input (TC-GAR-07)', () => {
  it('a deep-frozen state, cell and token go through every reducer unchanged', () => {
    const before = garden(
      [plant('a', 0, 0), plant('b', 1, 1), plant('c', 4, 15)],
      [seed('s1'), seed('s2', 'bass')],
      { anchorHandle: 'h', anchorLevel: 3 },
    );
    const snapshot = structuredClone(before);
    const cell = deepFreeze({ ring: 2, step: 2 });
    const token = deepFreeze(value(removePlant(before, 'b')).undo);

    expect(plantSeed(before, 's1', cell, NOW).ok).toBe(true);
    expect(plantSeed(before, 's1', before.plants[0]?.cell ?? cell, NOW).ok).toBe(false);
    expect(movePlant(before, 'a', cell).ok).toBe(true);
    expect(movePlant(before, 'a', { ring: 1, step: 1 }).ok).toBe(false);
    expect(setHeight(before, 'c', 0.1)).not.toBe(before);
    expect(removePlant(before, 'c').ok).toBe(true);
    expect(undoRemove(value(removePlant(before, 'b')).state, token).plants).toHaveLength(3);
    expect(undoRemove(before, token)).toBe(before);
    expect(setAnchor(before, null)).not.toBe(before);
    expect(setAnchor(before, deepFreeze({ handle: 'n', level: 1 as const })).anchorHandle).toBe('n');
    expect(nearestFreeCell(before, cell, 'a')).toEqual(cell);

    expect(before).toEqual(snapshot);
    expect(cell).toEqual({ ring: 2, step: 2 });
    expect(token.plant).toEqual(plant('b', 1, 1));
  });

  it('a state a reducer returns can be fed to the next one', () => {
    let s = garden([], [seed('s1'), seed('s2'), seed('s3')]);
    s = value(plantSeed(s, 's1', { ring: 0, step: 0 }, NOW));
    s = value(plantSeed(s, 's2', { ring: 0, step: 1 }, NOW + 1));
    s = value(movePlant(s, 's1', { ring: 4, step: 4 }));
    s = setHeight(s, 's2', 1);
    const removed = value(removePlant(s, 's1'));
    s = undoRemove(removed.state, removed.undo);
    s = setAnchor(s, { handle: 'h', level: 4 });
    expect(cellsOf(s)).toEqual([
      { ring: 0, step: 1 },
      { ring: 4, step: 4 },
    ]);
    expect(s.seeds).toEqual([seed('s3')]);
    expect(s).toMatchObject({ anchorHandle: 'h', anchorLevel: 4, version: 1 });
  });
});

describe('garden/rules and the bed height (TC-GAR-08, FR-UI-10)', () => {
  it('setBedHeightOffset stores the offset and leaves the plants, their cells and the radii alone', () => {
    const before = garden([plant('a', 0, 0), plant('b', 4, 15)], [seed('s1')]);
    const after = setBedHeightOffset(before, 0.04);
    expect(after.bedHeightOffset).toBe(0.04);
    expect(after).toEqual({ ...before, bedHeightOffset: 0.04 });
    expect(after.plants).toBe(before.plants); // the same array: every plant keeps its cell
    expect(before.bedHeightOffset).toBe(0);
    expect(setBedHeightOffset(after, -0.06).bedHeightOffset).toBe(-0.06);
  });

  it('setBedHeightOffset clamps to 10 cm up or down', () => {
    const s = garden();
    expect(setBedHeightOffset(s, 0.1).bedHeightOffset).toBe(0.1);
    expect(setBedHeightOffset(s, 0.11).bedHeightOffset).toBe(0.1);
    expect(setBedHeightOffset(s, 3).bedHeightOffset).toBe(0.1);
    expect(setBedHeightOffset(s, -0.1).bedHeightOffset).toBe(-0.1);
    expect(setBedHeightOffset(s, -0.25).bedHeightOffset).toBe(-0.1);
  });

  it('setBedHeightOffset hands back the same state when nothing changes, or the value is not finite', () => {
    const s = garden([plant('a', 0, 0)], [], { bedHeightOffset: 0.1 });
    expect(setBedHeightOffset(s, 0.1)).toBe(s);
    expect(setBedHeightOffset(s, 0.5)).toBe(s); // clamps to the 0.1 it already has
    for (const bad of [NaN, Infinity, -Infinity]) expect(setBedHeightOffset(s, bad)).toBe(s);
    expect(setBedHeightOffset(s, -0).bedHeightOffset).toBe(0); // toBe tells -0 from 0: a new garden has 0
  });

  it('every reducer copies the bed height offset and the radii through', () => {
    const s = garden([plant('a', 0, 0)], [seed('s1')], { bedHeightOffset: -0.1 });
    const removed = value(removePlant(s, 'a'));
    const results = [
      value(plantSeed(s, 's1', { ring: 1, step: 1 }, NOW)),
      value(movePlant(s, 'a', { ring: 2, step: 5 })),
      setHeight(s, 'a', 1),
      removed.state,
      undoRemove(removed.state, removed.undo),
      setAnchor(s, { handle: 'h', level: 1 }),
    ];
    for (const next of results)
      expect(next).toMatchObject({ bedHeightOffset: -0.1, bedInner: 0.12, bedOuter: 0.3 });
  });
});
