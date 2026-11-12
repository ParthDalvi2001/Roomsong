// The plants' palette (UX §5, ART_PASS_T163 §0 option A, D-060, D-071): the arc gold → moss → ice → violet, turned
// by the room's decay step (−15° small … +15° hall) and nudged ±0.06 in saturation from its paletteSeed; Wanderer
// neither.
import { Color, SRGBColorSpace } from 'three';
import { describe, expect, it } from 'vitest';

import { REVERB_RT60_STEPS_S, SEED_KINDS } from '../../../src/garden/index.js';
import {
  KIND_HUE_DEG,
  NEW_KIND_SATURATION_DROP,
  PALETTE_TURN_DEG,
  PLANT_LIGHTNESS,
  PLANT_SATURATION,
} from '../../../src/render/config.js';
import { kindColour, kindSwatch, newPalette, plantColour, setPalette } from '../../../src/render/palette.js';

const hueDeg = (colour: Color): number => colour.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace).h * 360;
const ROOM_SEED = 0x0fe2778b; // the small desk's (LLD §5.8): the middle saturation

describe('the palette (D-060, D-071)', () => {
  it('Wanderer (seed 0), and a seed that is not a number, get no turn and the plain saturation, at any decay', () => {
    for (const seed of [0, Number.NaN, -5]) {
      for (const decay of [...REVERB_RT60_STEPS_S, Number.NaN]) {
        expect(setPalette(newPalette(), seed, decay)).toEqual({ shiftDeg: 0, saturation: PLANT_SATURATION });
      }
    }
    expect(newPalette()).toEqual({ shiftDeg: 0, saturation: PLANT_SATURATION });
  });

  it('the turn follows the decay step: 0.3 … 2.0 s turn −15, −9, −3, +3, +9, +15°, whatever the seed', () => {
    expect(PALETTE_TURN_DEG).toEqual([-15, -9, -3, 3, 9, 15]);
    expect(REVERB_RT60_STEPS_S).toEqual([0.3, 0.6, 0.9, 1.2, 1.6, 2.0]);
    for (const seed of [ROOM_SEED, 0xccfb3565, 0xadd04cf6, 1, 0xffffffff]) {
      expect(REVERB_RT60_STEPS_S.map((decay) => setPalette(newPalette(), seed, decay).shiftDeg)).toEqual([
        -15, -9, -3, 3, 9, 15,
      ]);
    }
    // A decay that is not a step (roomSignature never gives one): no turn.
    for (const decay of [0, 0.45, 2.5, Number.NaN])
      expect(setPalette(newPalette(), ROOM_SEED, decay).shiftDeg).toBe(0);
  });

  it('the saturation stays the hash: one step of 0.06 either way, the same at every decay', () => {
    const saturations = new Set<number>();
    for (let seed = 1; seed < 20_000; seed += 7) {
      const sat = setPalette(newPalette(), seed * 104_729, 0.3).saturation;
      expect(setPalette(newPalette(), seed * 104_729, 2.0).saturation).toBe(sat);
      saturations.add(Number(sat.toFixed(6)));
    }
    expect([...saturations].sort()).toEqual([0.66, 0.72, 0.78]);
    // The three signature rooms of LLD §5.8: the desk (0.3 s), the kitchen (0.6 s), the living room (2.0 s).
    expect(setPalette(newPalette(), ROOM_SEED, 0.3)).toEqual({ shiftDeg: -15, saturation: PLANT_SATURATION });
    expect(setPalette(newPalette(), 0xccfb3565, 0.6).shiftDeg).toBe(-9);
    expect(setPalette(newPalette(), 0xccfb3565, 0.6).saturation).toBeCloseTo(PLANT_SATURATION - 0.06, 12);
    expect(setPalette(newPalette(), 0xadd04cf6, 2.0).shiftDeg).toBe(15);
  });

  it('in every room, Wanderer and each of the six turns, every hue lies on 32°–282°: no pinks, no reds', () => {
    const colour = new Color();
    const rooms = [
      newPalette(),
      ...REVERB_RT60_STEPS_S.map((decay) => setPalette(newPalette(), ROOM_SEED, decay)),
    ];
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
    const small = setPalette(newPalette(), ROOM_SEED, 0.3); // −15°: gold toward amber
    expect(hueDeg(plantColour(colour, 0, PLANT_LIGHTNESS, small))).toBeCloseTo(32, 3);
    const hall = setPalette(newPalette(), ROOM_SEED, 2.0); // +15°: violet toward purple
    expect(hueDeg(plantColour(colour, 1, PLANT_LIGHTNESS, hall))).toBeCloseTo(282, 3);
    const room = setPalette(newPalette(), ROOM_SEED, 1.6); // +9°
    expect(hueDeg(plantColour(colour, 0.5, PLANT_LIGHTNESS, room))).toBeCloseTo(166, 3);
    const hsl = plantColour(colour, 0.5, PLANT_LIGHTNESS, room).getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
    expect(hsl.l).toBeCloseTo(PLANT_LIGHTNESS, 4);
  });

  it("the ten kinds are ten colours in every room, on 32°–282°, and a swatch is its kind's colour (T-193)", () => {
    const colour = new Color();
    const kinds = SEED_KINDS.map((row) => row.kind);
    // Wanderer, then the six rooms (one per decay step, so every turn) at each of the hash's three saturations.
    const rooms: [seed: number, decay: number][] = [[0, 0.9]];
    for (const decay of REVERB_RT60_STEPS_S)
      for (const seed of [ROOM_SEED, 0xccfb3565, 2 << 9]) rooms.push([seed, decay]);
    expect(new Set(rooms.map(([seed]) => setPalette(newPalette(), seed, 0.3).saturation.toFixed(2)))).toEqual(
      new Set(['0.72', '0.66', '0.78']),
    );
    for (const [seed, decay] of rooms) {
      const room = setPalette(newPalette(), seed, decay);
      const swatches = kinds.map((kind) => kindSwatch(kind, seed, decay));
      expect(new Set(swatches).size, `seed ${seed}, decay ${decay}`).toBe(10);
      for (const [i, kind] of kinds.entries()) {
        const drawn = kindColour(colour, kind, PLANT_LIGHTNESS, room);
        expect(swatches[i], kind).toBe(`#${drawn.getHexString(SRGBColorSpace)}`);
        expect(hueDeg(drawn), kind).toBeGreaterThanOrEqual(32 - 1e-3);
        expect(hueDeg(drawn), kind).toBeLessThanOrEqual(282 + 1e-3);
      }
    }
    // Wanderer: each kind at its own hue; the Old kinds at the plants' saturation, the New ones softer by the drop.
    const wanderer = newPalette();
    for (const row of SEED_KINDS) {
      const hsl = kindColour(colour, row.kind, PLANT_LIGHTNESS, wanderer).getHSL(
        { h: 0, s: 0, l: 0 },
        SRGBColorSpace,
      );
      expect(hsl.h * 360, row.kind).toBeCloseTo(KIND_HUE_DEG[row.kind], 3);
      const drop = row.family === 'new' ? NEW_KIND_SATURATION_DROP : 0;
      expect(hsl.s, row.kind).toBeCloseTo(PLANT_SATURATION - drop, 4);
      expect(hsl.l, row.kind).toBeCloseTo(PLANT_LIGHTNESS, 4);
    }
    expect(PLANT_SATURATION - NEW_KIND_SATURATION_DROP).toBeCloseTo(0.5, 12);
    // A room turns all ten together: the hall's +15° on every kind.
    const hall = setPalette(newPalette(), ROOM_SEED, 2.0);
    for (const kind of kinds)
      expect(hueDeg(kindColour(colour, kind, PLANT_LIGHTNESS, hall))).toBeCloseTo(KIND_HUE_DEG[kind] + 15, 3);
  });
});
