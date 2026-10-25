import { Color, CustomBlending, Group, OneFactor, OneMinusSrcAlphaFactor, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { BED_INNER, BED_OUTER, cellCentre, STEPS } from '../../../src/garden/index.js';
import {
  BED_BASE_COLOUR,
  CREAM,
  FLASH_CAP_PER_S,
  PLANT_FLASH_BRIGHTNESS,
  PLANT_REST_BRIGHTNESS,
  TIDE_FADE_MS,
  TIDE_LEAD_STEPS,
  TIDE_PEAK,
  TIDE_SHADE_COVER,
  TIDE_SHADE_STEPS,
  TIDE_TRAIL_STEPS,
} from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { stepGlow, TideRenderer } from '../../../src/render/TideRenderer.js';

import { changeTimes, mostInOneSecond, type Drawn } from './changes.js';

const FRAME_MS = 1000 / 72;

/** The brightness a plant on `step` asks for with the tide at `phase`. */
function triggerGlow(phase: number, step: number): number {
  const glow = new Float64Array(STEPS);
  stepGlow(phase, glow);
  return glow[step]!;
}

/** Where the crest points in the bed's plane, as the unit vector of the tide's own +x after its turn. */
function crest(tide: TideRenderer): { x: number; z: number } {
  const { x, z } = new Vector3(1, 0, 0).applyMatrix4(tide.mesh.matrix).setY(0).normalize();
  return { x, z };
}

/** The unit vector from the bed centre to a step (D-029), from garden's own cellCentre. */
function toStep(step: number): { x: number; z: number } {
  const centre = cellCentre({ ring: 0, step }, { x: 0, y: 0 });
  const length = Math.hypot(centre.x, centre.y);
  return { x: centre.x / length, z: centre.y / length };
}

function make(): { tide: TideRenderer; guard: FlashGuard; parent: Group } {
  const parent = new Group();
  const guard = new FlashGuard();
  return { tide: new TideRenderer(parent, guard), guard, parent };
}

/** How far the wedge is faded in, 0..1: the one number that scales its light and its shade. */
function shown(tide: TideRenderer): number {
  return tide.mesh.material.uniforms.uShown!.value as number;
}

/** Every vertex of the wedge: where it is and what it carries. */
function vertices(
  tide: TideRenderer,
): { stepsAhead: number; radius: number; light: number; cover: number }[] {
  const position = tide.mesh.geometry.getAttribute('position');
  const carried = tide.mesh.geometry.getAttribute('aTide');
  return Array.from({ length: position.count }, (_, v) => ({
    stepsAhead: Math.atan2(position.getZ(v), position.getX(v)) / ((2 * Math.PI) / STEPS),
    radius: Math.hypot(position.getX(v), position.getZ(v)),
    light: carried.getX(v),
    cover: carried.getY(v),
  }));
}

/** Calls update on every frame of `durationMs` with `phase(frame)`, and returns the wedge's brightness per frame. */
function run(
  tide: TideRenderer,
  fromMs: number,
  durationMs: number,
  phase: (frame: number) => number,
): Drawn[] {
  const series: Drawn[] = [];
  for (let frame = 0; frame * FRAME_MS < durationMs; frame++) {
    const t = fromMs + frame * FRAME_MS;
    tide.update(phase(frame), t);
    series.push({ t, value: tide.mesh.visible ? shown(tide) : 0 });
  }
  return series;
}

describe('TideRenderer (FR-MUS-03)', () => {
  it('the crest is on step s at phase s/16, for all 16 steps and across the wrap (D-029)', () => {
    const { tide } = make();
    for (let step = 0; step < STEPS; step++) {
      tide.update(step / STEPS, step * 100);
      expect(crest(tide).x, `step ${step}`).toBeCloseTo(toStep(step).x);
      expect(crest(tide).z, `step ${step}`).toBeCloseTo(toStep(step).z);
    }
    // Step 4 is nearest the user: +z.
    tide.update(4 / STEPS, 2000);
    expect(crest(tide).z).toBeCloseTo(1);
    // Half a step before the bar ends the crest is between step 15 and step 0; then it is on step 0 again.
    tide.update(15.5 / STEPS, 2100);
    expect(crest(tide).z).toBeLessThan(0);
    expect(crest(tide).x).toBeGreaterThan(toStep(15).x);
    tide.update(0, 2200);
    expect(crest(tide).x).toBeCloseTo(1);
    expect(crest(tide).z).toBeCloseTo(0);
  });

  it('is one mesh, dark until a tide runs, and gone after dispose', () => {
    const { tide, parent } = make();
    expect(parent.children).toEqual([tide.mesh]);
    expect(tide.mesh.visible).toBe(false);
    expect(shown(tide)).toBe(0);
    tide.dispose();
    expect(parent.children).toEqual([]);
  });

  it('fades in when a tide starts and out when it stops, each one change through the guard', () => {
    const { tide, guard } = make();
    const fadeIn = run(tide, 0, 2 * TIDE_FADE_MS, () => 0.25);
    expect(fadeIn[0]!.value).toBe(0); // no jump on the first frame
    expect(fadeIn[fadeIn.length - 1]!.value).toBe(1);
    expect(Math.max(...fadeIn.slice(1).map((drawn, i) => drawn.value - fadeIn[i]!.value))).toBeLessThan(0.1);
    expect(changeTimes(fadeIn)).toHaveLength(1);
    expect(guard.takePeak()).toBe(1);

    const fadeOut = run(tide, 2 * TIDE_FADE_MS, 2 * TIDE_FADE_MS, () => Number.NaN); // the frames carry on
    expect(fadeOut[0]!.value).toBeGreaterThan(0.9); // no jump on its first frame either
    expect(fadeOut[fadeOut.length - 1]!.value).toBe(0);
    expect(tide.mesh.visible).toBe(false);
    expect(changeTimes(fadeOut)).toHaveLength(1);
    expect(guard.takePeak()).toBe(2); // the one in, and the one out: both inside this second
  });

  it('a phase that flips between a number and NaN every frame for a second cannot make it blink (FR-UI-11)', () => {
    const { tide, guard } = make();
    const everyFrame = run(tide, 0, 1000, (frame) => (frame % 2 ? Number.NaN : 0.25));
    expect(mostInOneSecond(everyFrame)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    // On and off every 150 ms is the worst a caller can do to it: half a fade each way, 6.7 times a second.
    const onOff = (frame: number): number => (Math.floor((frame * FRAME_MS) / 150) % 2 ? Number.NaN : 0.25);
    const slower = run(tide, 1000, 4000, onOff);
    expect(changeTimes(slower).length).toBeGreaterThan(FLASH_CAP_PER_S); // it did keep changing
    expect(mostInOneSecond(slower)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(guard.takePeak()).toBe(FLASH_CAP_PER_S);
  });

  it('a phase or a time that is not finite never reaches the matrix, and the wedge stays where it was', () => {
    const { tide } = make();
    const { matrix } = tide.mesh;
    run(tide, 0, 2 * TIDE_FADE_MS, () => 0.25); // shown, the crest on step 4
    const onStep8 = (): void => {
      expect(matrix.elements.every(Number.isFinite)).toBe(true);
      expect(crest(tide).x).toBeCloseTo(toStep(8).x);
      expect(crest(tide).z).toBeCloseTo(toStep(8).z);
    };
    // A real phase with a time that is not finite: the wedge turns, its brightness stays.
    tide.update(0.5, Number.NaN);
    onStep8();
    expect(shown(tide)).toBe(1);
    // No phase and no usable time: nothing at all.
    tide.update(Number.NaN, Number.POSITIVE_INFINITY);
    onStep8();
    expect(shown(tide)).toBe(1);
    // No phase, real time: it stays on step 8 and starts to fade.
    const phases = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    phases.forEach((phase, i) => {
      tide.update(phase, 2 * TIDE_FADE_MS + i * FRAME_MS);
      onStep8();
    });
    expect(shown(tide)).toBeLessThan(1);
    expect(shown(tide)).toBeGreaterThan(0.8);
  });

  it('its light is behind the crest and a little ahead of it, and fades to nothing at both ends', () => {
    const all = vertices(make().tide);
    const brightest = Math.max(...all.map((vertex) => vertex.light));
    expect(brightest).toBeCloseTo(TIDE_PEAK);
    for (const { stepsAhead, light } of all) {
      expect(stepsAhead).toBeGreaterThan(-TIDE_TRAIL_STEPS - 1e-4);
      expect(stepsAhead).toBeLessThan(TIDE_SHADE_STEPS + 1e-4);
      if (light === brightest) expect(Math.abs(stepsAhead)).toBeLessThan(1e-4); // only on the crest
      const atAnEnd = stepsAhead > TIDE_LEAD_STEPS - 1e-4 || stepsAhead < -TIDE_TRAIL_STEPS + 1e-4;
      if (atAnEnd) expect(light).toBeCloseTo(0);
    }
  });

  it('a charcoal shade leads the crest: none 1.5 steps ahead, 0.6 where the light begins a step ahead, none on the crest (UX §9.4)', () => {
    const { tide } = make();
    const onTheBed = vertices(tide).filter(
      ({ radius }) => radius > BED_INNER - 1e-6 && radius < BED_OUTER + 1e-6,
    );
    const coverAt = (ahead: number): number[] =>
      onTheBed.filter(({ stepsAhead }) => Math.abs(stepsAhead - ahead) < 1e-4).map(({ cover }) => cover);
    // D-060 (8): the light leads by one step (TIDE_LEAD_STEPS), the shade half a step beyond it.
    expect([TIDE_LEAD_STEPS, TIDE_SHADE_STEPS]).toEqual([1, 1.5]);
    for (const [ahead, cover] of [
      [1.5, 0],
      [1.25, TIDE_SHADE_COVER / 2],
      [1, TIDE_SHADE_COVER],
      [0.5, TIDE_SHADE_COVER / 2],
      [0, 0],
      [-1, 0],
    ] as const) {
      expect(coverAt(ahead).length, `${ahead} steps ahead`).toBeGreaterThan(0);
      for (const found of coverAt(ahead)) expect(found, `${ahead} steps ahead`).toBeCloseTo(cover);
    }
    // Across the bed it has the light's own profile: nothing at the two glass edges.
    for (const { radius, cover } of vertices(tide)) {
      if (radius < BED_INNER - 1e-6 || radius > BED_OUTER + 1e-6) expect(cover).toBe(0);
    }
    // Where it is darkest no light has begun: the crest stands against it.
    for (const { cover, light } of onTheBed) {
      if (cover > TIDE_SHADE_COVER - 1e-6) expect(light).toBeCloseTo(0);
    }
    expect(tide.mesh.geometry.index!.count / 3).toBe(108); // 4.5 steps of arc (was 4, 96), still one mesh
  });

  it('light and shade are one draw: the light adds, the shade covers what lies under it (UX §9.4)', () => {
    const { material } = make().tide.mesh;
    // What is drawn = the light + what lies under it × (1 − cover), in one blend.
    expect(material.blending).toBe(CustomBlending);
    expect(material.blendSrc).toBe(OneFactor);
    expect(material.blendDst).toBe(OneMinusSrcAlphaFactor);
    expect(material.fragmentShader).toContain('uShown * vec4(uCrest * vTide.x + uShade * vTide.y, vTide.y)');
    expect(material.depthWrite).toBe(false);
    // The colours as the canvas encodes them: cream for the light, the bed's own charcoal for the shade.
    const encoded = (hex: number): number[] => new Color(hex).convertLinearToSRGB().toArray();
    expect((material.uniforms.uCrest!.value as Color).toArray()).toEqual(encoded(CREAM));
    expect((material.uniforms.uShade!.value as Color).toArray()).toEqual(encoded(BED_BASE_COLOUR));
  });
});

describe('stepGlow (FR-UI-07)', () => {
  it('a plant is brightest when the crest is on its step and at rest away from it', () => {
    expect(triggerGlow(5 / STEPS, 5)).toBeCloseTo(PLANT_FLASH_BRIGHTNESS);
    expect(triggerGlow(5 / STEPS, 13)).toBe(PLANT_REST_BRIGHTNESS);
    expect(triggerGlow((5 + TIDE_TRAIL_STEPS) / STEPS, 5)).toBeCloseTo(PLANT_REST_BRIGHTNESS);
    expect(triggerGlow((5 - TIDE_LEAD_STEPS) / STEPS, 5)).toBeCloseTo(PLANT_REST_BRIGHTNESS);
    for (const none of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(triggerGlow(none, 5)).toBe(PLANT_REST_BRIGHTNESS);
    }
  });

  it('wraps: the crest on step 15 is already lighting step 0, and step 15 still glows when it is on step 0', () => {
    const between = (PLANT_REST_BRIGHTNESS + PLANT_FLASH_BRIGHTNESS) / 2;
    expect(triggerGlow((16 - TIDE_LEAD_STEPS / 2) / STEPS, 0)).toBeCloseTo(between);
    expect(triggerGlow(0, 15)).toBeGreaterThan(PLANT_REST_BRIGHTNESS);
    expect(triggerGlow(0, 15)).toBeLessThan(PLANT_FLASH_BRIGHTNESS);
    expect(triggerGlow(1, 0)).toBeCloseTo(PLANT_FLASH_BRIGHTNESS); // phase 1 is phase 0
  });

  it('over a bar a plant goes up once and down once: two luminance changes (LLD §5.9)', () => {
    const bar: Drawn[] = Array.from({ length: 1601 }, (_, i) => ({
      t: i,
      value: triggerGlow((i / 1600) % 1, 9),
    }));
    expect(changeTimes(bar)).toHaveLength(2);
  });
});
