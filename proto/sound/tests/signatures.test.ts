// Three fixed room signatures for the "Next room" button; switching re-tunes plants in place.
// Signature v1 (D-021, PLAN_AMENDMENT §6.3): only key root, mode and reverb decay follow the room; tempo does not.
import { describe, expect, it } from 'vitest';

import { DEFAULT_TEMPO, REVERB_RT60_MAX_S, REVERB_RT60_MIN_S, TEMPO_OPTIONS } from '../src/config';
import { FIXED_PLANTS } from '../src/garden';
import { PRESETS, nextPresetIndex } from '../src/signatures';
import { hzForRing } from '../src/theory';
import { WANDERER } from '../src/types';

describe('signature presets', () => {
  it('has exactly three presets with the Wanderer default first', () => {
    expect(PRESETS).toHaveLength(3);
    expect(PRESETS[0]?.signature).toEqual(WANDERER);
    expect(PRESETS[0]?.name).toMatch(/wanderer/i);
  });

  it('are Wanderer (C majorPent, 0.9 s), Small room (E minorPent, 0.3 s) and Hall (A below C, susPent, 2.0 s)', () => {
    const byName = Object.fromEntries(PRESETS.map((p) => [p.name, p.signature]));
    expect(byName['Wanderer']).toMatchObject({
      keyRoot: 0,
      mode: 'majorPent',
      reverbRt60: 0.9,
      reverbSize: 'medium',
    });
    expect(byName['Small room']).toMatchObject({
      keyRoot: 4,
      mode: 'minorPent',
      reverbRt60: 0.3,
      reverbSize: 'small',
    });
    expect(byName['Hall']).toMatchObject({
      keyRoot: -3,
      mode: 'susPent',
      reverbRt60: 2.0,
      reverbSize: 'large',
    });
  });

  it('every preset is a valid v1 RoomSignature (RT60 inside the 0.3–2.0 s clamp, FR-ROOM-06)', () => {
    for (const p of PRESETS) {
      const s = p.signature;
      expect([-3, 0, 2, 4]).toContain(s.keyRoot);
      expect(['majorPent', 'minorPent', 'susPent']).toContain(s.mode);
      expect(s.reverbRt60).toBeGreaterThanOrEqual(REVERB_RT60_MIN_S);
      expect(s.reverbRt60).toBeLessThanOrEqual(REVERB_RT60_MAX_S);
      expect(['small', 'medium', 'large']).toContain(s.reverbSize);
      expect(s.starterVoices).toHaveLength(3);
      expect(Number.isInteger(s.paletteSeed)).toBe(true);
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it('the room changes key, mode and reverb decay, and never the tempo', () => {
    for (let i = 0; i < PRESETS.length; i++) {
      const a = (PRESETS[i] as (typeof PRESETS)[number]).signature;
      expect(a.tempo).toBe(DEFAULT_TEMPO);
      for (let j = i + 1; j < PRESETS.length; j++) {
        const b = (PRESETS[j] as (typeof PRESETS)[number]).signature;
        expect(a.keyRoot).not.toBe(b.keyRoot);
        expect(a.mode).not.toBe(b.mode);
        expect(a.reverbRt60).not.toBe(b.reverbRt60);
      }
    }
  });

  it('tempo is its own control: 72 / 84 / 96 BPM, default 84 (FR-MUS-03)', () => {
    expect(TEMPO_OPTIONS).toEqual([72, 84, 96]);
    expect(DEFAULT_TEMPO).toBe(84);
  });

  it('nextPresetIndex cycles 0 → 1 → 2 → 0', () => {
    expect(nextPresetIndex(0)).toBe(1);
    expect(nextPresetIndex(1)).toBe(2);
    expect(nextPresetIndex(2)).toBe(0);
  });

  it('WANDERER is C majorPent, 84 BPM, RT60 0.9 s (medium), Bell/Pad/Pluck, seed 0 (REPLAN §4)', () => {
    expect(WANDERER).toEqual({
      keyRoot: 0,
      mode: 'majorPent',
      tempo: 84,
      reverbRt60: 0.9,
      reverbSize: 'medium',
      starterVoices: ['bell', 'pad', 'pluck'],
      paletteSeed: 0,
    });
  });
});

describe('re-tune in place (FR-ROOM-13)', () => {
  it('switching between any two presets changes pitches (≥ 4 of 6 plants) and never a cell (TC-SIG-03 wording)', () => {
    for (let i = 0; i < PRESETS.length; i++) {
      for (let j = 0; j < PRESETS.length; j++) {
        if (i === j) continue;
        const a = (PRESETS[i] as (typeof PRESETS)[number]).signature;
        const b = (PRESETS[j] as (typeof PRESETS)[number]).signature;
        let changed = 0;
        for (const plant of FIXED_PLANTS) {
          const cellBefore = { ...plant.cell };
          const hzA = hzForRing(a, plant.cell.ring, plant.voice);
          const hzB = hzForRing(b, plant.cell.ring, plant.voice);
          if (Math.abs(hzA - hzB) > 0.01) changed++;
          expect(plant.cell).toEqual(cellBefore);
        }
        expect(changed).toBeGreaterThanOrEqual(4);
      }
    }
  });
});

describe('fixed garden', () => {
  it('has 6 plants covering rings 0..4, all three voices, unique cells and unique ids', () => {
    expect(FIXED_PLANTS).toHaveLength(6);
    const rings = new Set(FIXED_PLANTS.map((p) => p.cell.ring));
    expect([...rings].sort()).toEqual([0, 1, 2, 3, 4]);
    const voices = new Set(FIXED_PLANTS.map((p) => p.voice));
    expect(voices).toEqual(new Set(['bell', 'pad', 'pluck']));
    const cells = new Set(FIXED_PLANTS.map((p) => `${p.cell.ring}:${p.cell.step}`));
    expect(cells.size).toBe(6);
    const ids = new Set(FIXED_PLANTS.map((p) => p.id));
    expect(ids.size).toBe(6);
    for (const p of FIXED_PLANTS) {
      expect(p.cell.step).toBeGreaterThanOrEqual(0);
      expect(p.cell.step).toBeLessThan(16);
      expect(p.height).toBeGreaterThanOrEqual(0);
      expect(p.height).toBeLessThanOrEqual(1);
      expect(p.hue).toBeGreaterThanOrEqual(0);
      expect(p.hue).toBeLessThanOrEqual(1);
    }
  });
});
