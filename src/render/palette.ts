// The plants' colours (UX §5, ART_PASS_T163 §0 option A, D-060). A plant's hue (0..1, from its seed; it also sets
// its sound, FR-MUS-05) is a place on one arc: gold (47°) → moss (123°) → ice (190°) → violet (267°), so no pinks or
// reds. The room turns the whole arc by ((paletteSeed % 31) − 15)°, so every room stays on 32°–282°, and nudges the
// saturation by ±0.06 from its signature (LLD §5.8); Wanderer (paletteSeed 0) does neither. Set-up only.
import { SRGBColorSpace, type Color } from 'three';

import {
  PALETTE_ARC_SPAN_DEG,
  PALETTE_ARC_START_DEG,
  PALETTE_SAT_STEP,
  PALETTE_SHIFT_MAX_DEG,
  PLANT_SATURATION,
} from './config.js';

/** A room's palette: the arc's turn in degrees and the plants' saturation. */
export interface Palette {
  shiftDeg: number;
  saturation: number;
}

/** Wanderer's, and every renderer's until its room is known. */
export const newPalette = (): Palette => ({ shiftDeg: 0, saturation: PLANT_SATURATION });

/** Writes the palette of `paletteSeed` (room:signature) into `out`. Seed 0 (Wanderer) or not a number: no tint. */
export function setPalette(out: Palette, paletteSeed: number): Palette {
  if (!(paletteSeed > 0)) {
    out.shiftDeg = 0;
    out.saturation = PLANT_SATURATION;
    return out;
  }
  out.shiftDeg = (paletteSeed % (2 * PALETTE_SHIFT_MAX_DEG + 1)) - PALETTE_SHIFT_MAX_DEG;
  out.saturation = PLANT_SATURATION + PALETTE_SAT_STEP * (((paletteSeed >>> 9) % 3) - 1);
  return out;
}

/** A plant hue's colour at `lightness`, in the room's palette, written in sRGB (UX §5) into `out`. */
export function plantColour(out: Color, hue: number, lightness: number, palette: Readonly<Palette>): Color {
  const degrees = PALETTE_ARC_START_DEG + hue * PALETTE_ARC_SPAN_DEG + palette.shiftDeg;
  return out.setHSL(degrees / 360, palette.saturation, lightness, SRGBColorSpace);
}
