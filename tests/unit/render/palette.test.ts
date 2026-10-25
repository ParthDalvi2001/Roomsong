// The plants' palette (UX §5, ART_PASS_T163 §0 option A, D-060): the arc gold → moss → ice → violet, turned by
// up to ±15° and nudged ±0.06 in saturation per room from the signature's paletteSeed; Wanderer neither.
import { Color, SRGBColorSpace } from 'three';
import { describe, expect, it } from 'vitest';

import { PALETTE_SHIFT_MAX_DEG, PLANT_LIGHTNESS, PLANT_SATURATION } from '../../../src/render/config.js';
import { newPalette, plantColour, setPalette } from '../../../src/render/palette.js';

const hueDeg = (colour: Color): number => colour.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace).h * 360;

describe('the palette (D-060)', () => {
  it('Wanderer (seed 0), and a seed that is not a number, get no shift and the plain saturation', () => {
    for (const seed of [0, Number.NaN, -5]) {
      expect(setPalette(newPalette(), seed)).toEqual({ shiftDeg: 0, saturation: PLANT_SATURATION });
    }
    expect(newPalette()).toEqual({ shiftDeg: 0, saturation: PLANT_SATURATION });
  });

  it('a room turns the arc by a whole number of degrees within ±15 and nudges the saturation by one step of 0.06', () => {
    expect(PALETTE_SHIFT_MAX_DEG).toBe(15);
    const shifts = new Set<number>();
    const saturations = new Set<number>();
    for (let seed = 1; seed < 20_000; seed += 7) {
      const { shiftDeg, saturation } = setPalette(newPalette(), seed * 104_729);
      expect(Number.isInteger(shiftDeg)).toBe(true);
      shifts.add(shiftDeg);
      saturations.add(Number(saturation.toFixed(6)));
    }
    expect([...shifts].sort((a, b) => a - b)).toEqual(Array.from({ length: 31 }, (_, i) => i - 15));
    expect([...saturations].sort()).toEqual([0.66, 0.72, 0.78]);
    // The two measured rooms of LLD §5.8's sheet: the living table and the small desk.
    expect(setPalette(newPalette(), 0x0fe2778b)).toEqual({ shiftDeg: 1, saturation: PLANT_SATURATION });
    expect(setPalette(newPalette(), 0xccfb3565).shiftDeg).toBe(-2);
    expect(setPalette(newPalette(), 0xccfb3565).saturation).toBeCloseTo(PLANT_SATURATION - 0.06, 12);
  });

  it('in every room, Wanderer and each of the 31 turns, every hue lies on 32°–282°: no pinks, no reds', () => {
    const colour = new Color();
    // A seed of each turn: seed % 31 is the turn + 15 (and a nudge of saturation for some).
    const rooms = [
      newPalette(),
      ...Array.from({ length: 31 }, (_, i) => setPalette(newPalette(), 31 * 1000 + i)),
    ];
    expect(rooms.slice(1).map((room) => room.shiftDeg)).toEqual(Array.from({ length: 31 }, (_, i) => i - 15));
    for (const room of rooms) {
      for (let k = 0; k <= 100; k++) {
        const deg = hueDeg(plantColour(colour, k / 100, PLANT_LIGHTNESS, room));
        expect(deg).toBeGreaterThanOrEqual(32 - 1e-3);
        expect(deg).toBeLessThanOrEqual(282 + 1e-3);
      }
    }
    // Wanderer's arc runs 47° to 267°; a room moves every hue by its turn, at the plants' own lightness.
    const wanderer = newPalette();
    expect(hueDeg(plantColour(colour, 0, PLANT_LIGHTNESS, wanderer))).toBeCloseTo(47, 3);
    expect(hueDeg(plantColour(colour, 0.5, PLANT_LIGHTNESS, wanderer))).toBeCloseTo(157, 3);
    expect(hueDeg(plantColour(colour, 1, PLANT_LIGHTNESS, wanderer))).toBeCloseTo(267, 3);
    const room = setPalette(newPalette(), 31 + 25); // +10°
    expect(hueDeg(plantColour(colour, 0.5, PLANT_LIGHTNESS, room))).toBeCloseTo(167, 3);
    const hsl = plantColour(colour, 0.5, PLANT_LIGHTNESS, room).getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
    expect(hsl.l).toBeCloseTo(PLANT_LIGHTNESS, 4);
  });
});
