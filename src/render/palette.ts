// The plants' colours (UX §5, ART_PASS_T163 §0 option A, D-060). A plant's hue (0..1, from its seed; it also sets
// its sound, FR-MUS-05) is a place on one arc: gold (47°) → moss (123°) → ice (190°) → violet (267°), so no pinks or
// reds. The room's size turns the whole arc (D-071): its decay step 0–5 (small to hall) by PALETTE_TURN_DEG, −15° to
// +15°, so every room stays on 32°–282°, and its hash nudges the saturation by ±0.06 (LLD §5.8); Wanderer (paletteSeed
// 0) does neither. Set-up only.
// Since T-193 (D-076) what is drawn takes its colour from its seed kind (kindColour): ten fixed hues on the same arc,
// turned and nudged by the room in the same way, the New kinds softer. The hue still varies the sound.
import { Color, SRGBColorSpace } from 'three';

import { REVERB_RT60_STEPS_S, SEED_KINDS } from '../garden/index.js';

import {
  KIND_HUE_DEG,
  NEW_KIND_SATURATION_DROP,
  PALETTE_ARC_SPAN_DEG,
  PALETTE_ARC_START_DEG,
  PALETTE_SAT_STEP,
  PALETTE_TURN_DEG,
  PLANT_LIGHTNESS,
  PLANT_SATURATION,
} from './config.js';

import type { SeedKind } from '../garden/index.js';

/** A room's palette: the arc's turn in degrees and the plants' saturation. */
export interface Palette {
  shiftDeg: number;
  saturation: number;
}

/** Wanderer's, and every renderer's until its room is known. */
export const newPalette = (): Palette => ({ shiftDeg: 0, saturation: PLANT_SATURATION });

/** Writes the palette of room:signature's `paletteSeed` and `reverbRt60` into `out`. Seed 0 (Wanderer) or not a number:
 *  no tint; a decay that is not one of REVERB_RT60_STEPS_S: no turn. */
export function setPalette(out: Palette, paletteSeed: number, reverbRt60: number): Palette {
  if (!(paletteSeed > 0)) {
    out.shiftDeg = 0;
    out.saturation = PLANT_SATURATION;
    return out;
  }
  out.shiftDeg = PALETTE_TURN_DEG[REVERB_RT60_STEPS_S.indexOf(reverbRt60)] ?? 0;
  out.saturation = PLANT_SATURATION + PALETTE_SAT_STEP * (((paletteSeed >>> 9) % 3) - 1);
  return out;
}

/** A plant hue's colour at `lightness`, in the room's palette, written in sRGB (UX §5) into `out`. */
export function plantColour(out: Color, hue: number, lightness: number, palette: Readonly<Palette>): Color {
  const degrees = PALETTE_ARC_START_DEG + hue * PALETTE_ARC_SPAN_DEG + palette.shiftDeg;
  return out.setHSL(degrees / 360, palette.saturation, lightness, SRGBColorSpace);
}

const NEW_KINDS: ReadonlySet<SeedKind> = new Set(
  SEED_KINDS.filter((r) => r.family === 'new').map((r) => r.kind),
);

/** A seed kind's colour at `lightness`, in the room's palette, written in sRGB (UX §5) into `out`: KIND_HUE_DEG plus
 *  the room's turn, at the room's saturation, less NEW_KIND_SATURATION_DROP for a New kind. Creates nothing. */
export function kindColour(out: Color, kind: SeedKind, lightness: number, palette: Readonly<Palette>): Color {
  const saturation = palette.saturation - (NEW_KINDS.has(kind) ? NEW_KIND_SATURATION_DROP : 0);
  return out.setHSL((KIND_HUE_DEG[kind] + palette.shiftDeg) / 360, saturation, lightness, SRGBColorSpace);
}

const swatch = new Color();
const swatchPalette = newPalette();
/** kindColour at the plants' lightness in the room of `paletteSeed` and `reverbRt60` (setPalette), as CSS `#rrggbb`:
 *  the seed picker's swatch, the colour of that kind's plants. It makes a string: on a redraw of the board only. */
export function kindSwatch(kind: SeedKind, paletteSeed: number, reverbRt60: number): string {
  setPalette(swatchPalette, paletteSeed, reverbRt60);
  return `#${kindColour(swatch, kind, PLANT_LIGHTNESS, swatchPalette).getHexString(SRGBColorSpace)}`;
}
