import { Color, DoubleSide, Group, Matrix4, SRGBColorSpace, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { MS_PER_DAY, settings } from '../../../src/core/index.js';
import { cellCentre, STEPS } from '../../../src/garden/index.js';
import {
  CREAM,
  FLASH_CAP_PER_S,
  FLASH_MIN_DELTA,
  HOVER_CUE_MS,
  PLANT_BLOOM_MS,
  PLANT_BLOOM_WAIT_MS,
  PLANT_BLOSSOM_LIGHTNESS,
  PLANT_BLOSSOM_WIDTH,
  PLANT_CAPACITY,
  PLANT_FLASH_BRIGHTNESS,
  PLANT_HOVER_LIFT,
  PLANT_LIGHTNESS,
  PLANT_REST_BRIGHTNESS,
  PLANT_SATURATION,
  PLANT_STEM_MAX_M,
  PLANT_STEM_MIN_M,
  PLANT_TINT_BACK_MS,
  PLANT_TINT_BRIGHTNESS,
  PLANT_WHORL_AT,
  PLANT_WHORL_LOBE_DEPTH,
} from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { PlantRenderer } from '../../../src/render/PlantRenderer.js';
import { mulberry32 } from '../audio/prng.js';
import { fullBedExcept, plant } from '../garden/fixtures.js';

import { changeTimes, mostInAnyClip, mostInOneSecond, type Drawn as Sample } from './changes.js';

import type { Plant } from '../../../src/garden/index.js';

const FRAME_MS = 1000 / 72;

const SHAPES = ['bell', 'pad', 'pluck', 'bass', 'choir'] as const;
type ShapeName = (typeof SHAPES)[number];

/** A silhouette's side outline on a stem of `stemM`, read back from its mesh: radius and height of each row. */
function outline(renderer: PlantRenderer, shape: ShapeName, stemM: number): { r: number; y: number }[] {
  const { geometry } = renderer.meshes[SHAPES.indexOf(shape)]!;
  const position = geometry.getAttribute('position');
  const head = geometry.getAttribute('aHead');
  const rows = position.count / (geometry.parameters.segments + 1); // the lathe lays the outline down once per segment
  return Array.from({ length: rows }, (_, row) => {
    let r = 0; // the widest the row gets, so the tip of a petal
    for (let v = row; v < position.count; v += rows) {
      r = Math.max(r, Math.hypot(position.getX(v), position.getZ(v)));
    }
    return { r, y: head.getX(row) ? stemM + position.getY(row) : position.getY(row) * stemM };
  });
}

/** Half the width of a side outline at a height: the widest of its rows' edges there, 0 where it has none. */
function halfWidth(rows: { r: number; y: number }[], y: number): number {
  let widest = 0;
  for (let i = 1; i < rows.length; i++) {
    const [a, b] = [rows[i - 1]!, rows[i]!];
    if ((y - a.y) * (y - b.y) > 0) continue;
    widest = Math.max(
      widest,
      a.y === b.y ? Math.max(a.r, b.r) : a.r + ((b.r - a.r) * (y - a.y)) / (b.y - a.y),
    );
  }
  return widest;
}

/** The share of two side outlines that coincides (1 = the same outline), the worst of three stems (UX §9.5). */
function coincides(renderer: PlantRenderer, one: ShapeName, other: ShapeName): number {
  const SLICES = 400;
  return Math.max(
    ...[PLANT_STEM_MIN_M, 0.09, PLANT_STEM_MAX_M].map((stemM) => {
      const [a, b] = [outline(renderer, one, stemM), outline(renderer, other, stemM)];
      const top = Math.max(...a.map((row) => row.y), ...b.map((row) => row.y));
      let shared = 0;
      let either = 0;
      for (let i = 0; i <= SLICES; i++) {
        const [wa, wb] = [halfWidth(a, (top * i) / SLICES), halfWidth(b, (top * i) / SLICES)];
        shared += Math.min(wa, wb);
        either += Math.max(wa, wb);
      }
      return shared / either;
    }),
  );
}

interface Drawn {
  shape: (typeof SHAPES)[number];
  x: number;
  y: number;
  z: number;
  stemM: number;
  /** The instance's own +x in the bed's plane. */
  out: { x: number; z: number };
  rgb: number[];
}

/** Every instance the renderer would draw, read back from the instance buffers. */
function drawn(renderer: PlantRenderer): Drawn[] {
  const matrix = new Matrix4();
  const colour = new Color();
  const axis = new Vector3();
  return renderer.meshes.flatMap((mesh, shape) =>
    Array.from({ length: mesh.count }, (_, index) => {
      mesh.getMatrixAt(index, matrix);
      mesh.getColorAt(index, colour);
      const { x, y, z } = new Vector3().setFromMatrixPosition(matrix);
      const out = axis.setFromMatrixColumn(matrix, 0);
      return {
        shape: SHAPES[shape]!,
        x,
        y,
        z,
        stemM: new Vector3().setFromMatrixColumn(matrix, 1).length(),
        out: { x: out.x, z: out.z },
        rgb: colour.toArray(),
      };
    }),
  );
}

/** The instance standing on a cell. */
function at(renderer: PlantRenderer, ring: number, step: number): Drawn | undefined {
  const centre = cellCentre({ ring, step }, { x: 0, y: 0 });
  return drawn(renderer).find((d) => Math.hypot(d.x - centre.x, d.z - centre.y) < 1e-6);
}

/** A plant's colour at a brightness, as the renderer should write it: the hue read in sRGB, like the palette. */
function tint(hue: number, brightness = PLANT_REST_BRIGHTNESS): number[] {
  return new Color()
    .setHSL(hue, PLANT_SATURATION, PLANT_LIGHTNESS, SRGBColorSpace)
    .multiplyScalar(brightness)
    .toArray();
}

function expectRgb(actual: number[] | undefined, expected: number[]): void {
  expect(actual).toBeDefined();
  expected.forEach((channel, i) => expect(actual![i]).toBeCloseTo(channel, 5));
}

/** Hands the renderer a garden as it was at a visit: with the fixture's plants (planted at 1000) one of age 0. */
function show(renderer: PlantRenderer, plants: Plant[], lastVisitAt = 1000): void {
  renderer.setState({ plants, lastVisitAt });
}

function make(plants: Plant[] = []): { renderer: PlantRenderer; guard: FlashGuard; parent: Group } {
  const parent = new Group();
  const guard = new FlashGuard();
  const renderer = new PlantRenderer(parent, guard);
  show(renderer, plants);
  return { renderer, guard, parent };
}

describe('PlantRenderer.setState (FR-MUS-01, UX §5)', () => {
  it('stands each plant on its cell centre in the bed frame of D-029, turned to face out of the bed', () => {
    const { renderer } = make([
      plant('right', 0, 0),
      plant('near', 2, 4),
      plant('left', 4, 8),
      plant('far', 1, 12),
      plant('between', 3, 2),
    ]);
    expect(drawn(renderer)).toHaveLength(5);
    // Step 0 is on the user's right (+x), step 4 nearest the user (+z), step 8 left, step 12 farthest.
    expect(at(renderer, 0, 0)!.x).toBeCloseTo(0.12);
    expect(at(renderer, 0, 0)!.y).toBe(0);
    expect(at(renderer, 2, 4)!.z).toBeCloseTo(0.21);
    expect(at(renderer, 4, 8)!.x).toBeCloseTo(-0.3);
    expect(at(renderer, 1, 12)!.z).toBeCloseTo(-0.165);
    for (const [ring, step] of [
      [0, 0],
      [2, 4],
      [4, 8],
      [1, 12],
      [3, 2],
    ] as const) {
      const centre = cellCentre({ ring, step }, { x: 0, y: 0 });
      const radius = Math.hypot(centre.x, centre.y);
      const instance = at(renderer, ring, step)!;
      expect(instance.out.x).toBeCloseTo(centre.x / radius);
      expect(instance.out.z).toBeCloseTo(centre.y / radius);
    }
  });

  it('a plant height of 0..1 is the stem between its two lengths; anything else is clamped', () => {
    const { renderer } = make([
      plant('low', 0, 0, { height: 0 }),
      plant('mid', 0, 1, { height: 0.5 }),
      plant('high', 0, 2, { height: 1 }),
      plant('over', 0, 3, { height: 7 }),
      plant('nan', 0, 4, { height: Number.NaN }),
    ]);
    expect(at(renderer, 0, 0)!.stemM).toBeCloseTo(PLANT_STEM_MIN_M);
    expect(at(renderer, 0, 1)!.stemM).toBeCloseTo((PLANT_STEM_MIN_M + PLANT_STEM_MAX_M) / 2);
    expect(at(renderer, 0, 2)!.stemM).toBeCloseTo(PLANT_STEM_MAX_M);
    expect(at(renderer, 0, 3)!.stemM).toBeCloseTo(PLANT_STEM_MAX_M);
    expect(at(renderer, 0, 4)!.stemM).toBeCloseTo(PLANT_STEM_MIN_M);
  });

  it("the colour is the plant's hue at the palette's saturation and lightness, at rest brightness", () => {
    const { renderer } = make([plant('gold', 0, 0, { hue: 0.13 }), plant('violet', 0, 8, { hue: 0.74 })]);
    expectRgb(at(renderer, 0, 0)?.rgb, tint(0.13));
    expectRgb(at(renderer, 0, 8)?.rgb, tint(0.74));
    expect(at(renderer, 0, 0)!.rgb).not.toEqual(at(renderer, 0, 8)!.rgb);
    // On screen, at full brightness, that is close to the palette's own gold and violet (UX §5): #e5c75d and
    // #985de5, within 16 of 255 a channel. Read as linear, the hue came out pale (#f3e4a2 and #cba2f3: up to 69 off).
    const onScreen = (hue: number): number[] =>
      new Color()
        .fromArray(tint(hue, 1))
        .getHexString()
        .match(/../g)!
        .map((pair) => parseInt(pair, 16));
    const near = (actual: number[], palette: number[]): void =>
      palette.forEach((channel, i) => expect(Math.abs(actual[i]! - channel)).toBeLessThanOrEqual(16));
    near(onScreen(0.13), [0xf4, 0xd3, 0x5e]);
    near(onScreen(0.74), [0x9b, 0x5d, 0xe5]);
  });

  it('one mesh per silhouette; the five Must voices each have their own, shimmer borrows the pluck', () => {
    const { renderer, parent } = make([
      plant('a', 0, 0, { voice: 'bell' }),
      plant('b', 0, 1, { voice: 'pad' }),
      plant('c', 0, 2, { voice: 'pluck' }),
      plant('d', 0, 3, { voice: 'bass' }),
      plant('e', 0, 4, { voice: 'choir' }),
      plant('f', 0, 5, { voice: 'shimmer' }),
    ]);
    expect(parent.children).toEqual([...renderer.meshes, renderer.whorls]);
    expect(renderer.meshes).toHaveLength(5);
    expect(renderer.meshes.map((mesh) => mesh.count)).toEqual([1, 1, 2, 1, 1]);
    expect([0, 1, 2, 3, 4, 5].map((step) => at(renderer, 0, step)!.shape)).toEqual([
      'bell',
      'pad',
      'pluck',
      'bass',
      'choir',
      'pluck',
    ]);
    // Five different outlines, each with the head marked for the shader, and one shared material.
    const vertexCounts = renderer.meshes.map((mesh) => mesh.geometry.getAttribute('position').count);
    expect(new Set(vertexCounts).size).toBe(5);
    for (const mesh of renderer.meshes) {
      expect(mesh.geometry.getAttribute('aHead').count).toBe(mesh.geometry.getAttribute('position').count);
      expect(mesh.material).toBe(renderer.meshes[0]!.material);
    }
  });

  it('no plant mesh is culled by the bounds of one plant, and open shapes show their inside', () => {
    const { renderer } = make([plant('a', 0, 0)]);
    // A mesh's bounds are those of its one outline at the bed's centre; its instances stand all over the bed.
    for (const mesh of [...renderer.meshes, renderer.whorls]) expect(mesh.frustumCulled).toBe(false);
    // The pad's fan and the choir's canopy are open: without both sides they have a hole where the inside is.
    expect(renderer.meshes[0]!.material.side).toBe(DoubleSide);
    expect(renderer.whorls.material.side).toBe(DoubleSide);
  });

  it('Bass is a jug on the ground and Choir an umbrella, as UX §9.5 draws them', () => {
    const { renderer } = make();
    const triangles = (shape: ShapeName): number =>
      renderer.meshes[SHAPES.indexOf(shape)]!.geometry.index!.count / 3;
    expect(SHAPES.map(triangles)).toEqual([240, 200, 112, 216, 252]);
    const across = (shape: ShapeName): number =>
      2 * Math.max(...outline(renderer, shape, 0.09).map((row) => row.r));
    expect(across('bass')).toBeCloseTo(0.04);
    expect(across('choir')).toBeCloseTo(0.042);
    for (const shape of SHAPES) {
      expect(2 * outline(renderer, shape, 0.09)[0]!.r, shape).toBeCloseTo(0.025); // the foot: FR-HND-04
      expect(across(shape), shape).toBeLessThanOrEqual(0.045); // the gap between two rings: FR-MUS-01
    }
    // The jug's weight is at the ground: its widest rows are in the lowest 30 % of the stem, and stretch with it.
    for (const stemM of [PLANT_STEM_MIN_M, PLANT_STEM_MAX_M]) {
      const bulb = outline(renderer, 'bass', stemM).filter((row) => row.r > 0.0199);
      expect(bulb.length).toBe(2);
      for (const row of bulb) expect(row.y).toBeLessThan(0.3 * stemM);
    }
    // The umbrella's canopy hangs over the top of the stem and keeps its shape: the rim is 2.4 cm below the top.
    for (const stemM of [PLANT_STEM_MIN_M, PLANT_STEM_MAX_M]) {
      const rows = outline(renderer, 'choir', stemM);
      expect(rows[rows.length - 1]!.y).toBeCloseTo(stemM - 0.024);
      expect(Math.max(...rows.map((row) => row.y))).toBeCloseTo(stemM + 0.01);
    }
  });

  it('by outline alone, neither new shape is closer to another than Bell and Pad already are (FR-UI-08)', () => {
    const { renderer } = make();
    // The figures of UX §9.5, worked from the tables as drawn.
    const figures = [
      ['bell', 'pad', 0.64],
      ['bass', 'bell', 0.42],
      ['bass', 'pad', 0.51],
      ['bass', 'pluck', 0.24],
      ['bass', 'choir', 0.42],
      ['choir', 'bell', 0.4],
      ['choir', 'pad', 0.51],
      ['choir', 'pluck', 0.25],
    ] as const;
    for (const [one, other, share] of figures) {
      expect(coincides(renderer, one, other), `${one} and ${other}`).toBeCloseTo(share, 2);
      if (one !== 'bell') expect(share).toBeLessThan(figures[0][2]);
    }
    expect(coincides(renderer, 'bell', 'bell')).toBeCloseTo(1);
  });

  it('add, move, reshape and remove change the right instance and leave the others as they were', () => {
    const a = plant('a', 0, 0, { hue: 0.1 });
    const b = plant('b', 1, 5, { hue: 0.5, voice: 'pad' });
    const c = plant('c', 2, 9, { hue: 0.9 });
    const { renderer } = make([a, b]);
    const before = { a: at(renderer, 0, 0), b: at(renderer, 1, 5) };

    show(renderer, [a, b, c]); // add
    expect(drawn(renderer)).toHaveLength(3);
    expectRgb(at(renderer, 2, 9)?.rgb, tint(0.9));
    expect(at(renderer, 0, 0)).toEqual(before.a);
    expect(at(renderer, 1, 5)).toEqual(before.b);

    show(renderer, [a, { ...b, cell: { ring: 4, step: 13 } }, c]); // move
    expect(drawn(renderer)).toHaveLength(3);
    expect(at(renderer, 1, 5)).toBeUndefined();
    expect(at(renderer, 4, 13)).toMatchObject({ shape: 'pad', stemM: before.b!.stemM, rgb: before.b!.rgb });
    expect(at(renderer, 0, 0)).toEqual(before.a);

    show(renderer, [{ ...a, height: 1 }, { ...b, cell: { ring: 4, step: 13 } }, c]); // reshape
    expect(at(renderer, 0, 0)!.stemM).toBeCloseTo(PLANT_STEM_MAX_M);

    show(renderer, [c]); // remove two, the first of its mesh among them
    expect(drawn(renderer)).toHaveLength(1);
    expect(at(renderer, 0, 0)).toBeUndefined();
    expect(at(renderer, 4, 13)).toBeUndefined();
    expectRgb(at(renderer, 2, 9)?.rgb, tint(0.9));

    show(renderer, []);
    expect(renderer.meshes.map((mesh) => mesh.count)).toEqual([0, 0, 0, 0, 0]);
  });

  it('a full bed is 80 instances, and a bed filled again after it was emptied still is', () => {
    const { renderer } = make(fullBedExcept());
    expect(drawn(renderer)).toHaveLength(PLANT_CAPACITY);
    show(renderer, []);
    show(
      renderer,
      fullBedExcept().map((p) => ({ ...p, id: `again-${p.id}` })),
    );
    expect(drawn(renderer)).toHaveLength(PLANT_CAPACITY);
    expect(at(renderer, 4, 15)).toBeDefined();
  });

  it('a full bed replaced by a full bed of new ids in one call draws all 80 (a restore over a planted bed)', () => {
    const { renderer } = make(fullBedExcept());
    show(
      renderer,
      fullBedExcept().map((p) => ({ ...p, id: `new-${p.id}`, hue: 0.9 })),
    );
    expect(drawn(renderer)).toHaveLength(PLANT_CAPACITY);
    for (const instance of drawn(renderer)) expectRgb(instance.rgb, tint(0.9));
    // And half of a bed swapped: the 40 that stay keep theirs, the 40 new ones are all drawn.
    const half = fullBedExcept().map((p, i) => (i % 2 ? p : { ...p, id: `swap-${p.id}` }));
    show(renderer, half);
    expect(drawn(renderer)).toHaveLength(PLANT_CAPACITY);
  });

  it('leaves out a plant whose voice is unknown or whose cell is not on the bed, and draws the rest', () => {
    const odd = (id: string, over: object): Plant => ({ ...plant(id, 0, 1), ...over });
    const { renderer } = make([
      plant('good', 0, 0),
      odd('voice', { voice: 'kazoo' }),
      odd('inherited', { voice: 'toString' }),
      odd('ring', { cell: { ring: 5, step: 1 } }),
      odd('step', { cell: { ring: 0, step: 16 } }),
      odd('negative', { cell: { ring: 0, step: -1 } }),
      odd('between', { cell: { ring: 0.5, step: 1 } }),
      odd('nan', { cell: { ring: Number.NaN, step: 1 } }),
      plant('also good', 4, 15),
    ]);
    expect(drawn(renderer)).toHaveLength(2);
    expect(at(renderer, 0, 0)).toBeDefined();
    expect(at(renderer, 4, 15)).toBeDefined();
    // Nothing that is not a number reached the buffers, and a frame goes by cleanly.
    renderer.update(1 / STEPS, 0);
    for (const instance of drawn(renderer)) expect(instance.rgb.every(Number.isFinite)).toBe(true);
  });

  it('a state that makes it throw is not remembered: the same array, put right, is drawn', () => {
    const { renderer } = make();
    const plants = [plant('a', 0, 0), { ...plant('b', 0, 1), cell: undefined } as unknown as Plant];
    expect(() => show(renderer, plants)).toThrow();
    plants[1] = plant('b', 0, 1);
    show(renderer, plants);
    expect(drawn(renderer)).toHaveLength(2);
  });

  it('the same plants array again uploads nothing (dirty flag)', () => {
    const plants = [plant('a', 0, 0)];
    const { renderer } = make(plants);
    const version = (): number[] =>
      renderer.meshes.flatMap((mesh) => [mesh.instanceMatrix.version, mesh.instanceColor!.version]);
    const before = version();
    show(renderer, plants);
    expect(version()).toEqual(before);
    show(renderer, [...plants]);
    expect(version()).not.toEqual(before);
  });
});

describe('PlantRenderer.update (FR-UI-07, FR-UI-11)', () => {
  it('the plant under the crest glows, the others stay at rest, and only a change is uploaded', () => {
    const { renderer } = make([plant('lit', 0, 5, { hue: 0.3 }), plant('dark', 0, 13, { hue: 0.3 })]);
    const [bells] = renderer.meshes;
    const uploads = (): number => bells!.instanceColor!.version;
    const before = uploads();

    renderer.update(9.5 / STEPS, 0); // the crest is far from both
    expect(uploads()).toBe(before);

    renderer.update(5 / STEPS, 100);
    expectRgb(at(renderer, 0, 5)?.rgb, tint(0.3, PLANT_FLASH_BRIGHTNESS));
    expectRgb(at(renderer, 0, 13)?.rgb, tint(0.3));
    expect(uploads()).toBe(before + 1);

    renderer.update(5 / STEPS, 110); // nothing moved
    expect(uploads()).toBe(before + 1);

    renderer.update(Number.NaN, 2000); // the tide stopped: back to rest
    expectRgb(at(renderer, 0, 5)?.rgb, tint(0.3));
  });

  it('a plant keeps its glow and its guard element through setState, also when the plant before it is removed', () => {
    const first = plant('first', 0, 0);
    const lit = plant('lit', 0, 5, { hue: 0.3 });
    const { renderer, guard } = make([first, lit]);
    renderer.update(5 / STEPS, 0); // `lit` glows: one change on its element, which is 1 (the second plant)
    // Use up element 0, the first plant's, for this second: three changes, asked for here and not drawn.
    for (const [i, level] of [1, PLANT_REST_BRIGHTNESS, 1].entries()) guard.request(0, level, 1 + i);
    show(renderer, [lit]);
    expectRgb(at(renderer, 0, 5)?.rgb, tint(0.3, PLANT_FLASH_BRIGHTNESS));
    // `lit` is now the first instance of its mesh. Its fade is granted, so it was asked of element 1, its own:
    // asked of element 0, its place in the buffer, it would be refused and the plant would stay bright.
    // (No spy on the guard here: a second kind of guard at update's call site stops V8 inlining it, and the
    // heap test in PlantRenderer.heap.test.ts would then count boxed numbers.)
    renderer.update(Number.NaN, 100);
    expectRgb(at(renderer, 0, 5)?.rgb, tint(0.3));
  });

  it('a new plant on a slot another plant left starts at rest, whatever that plant was doing', () => {
    const { renderer, guard } = make([plant('old', 0, 5, { hue: 0.3 })]);
    renderer.update(5 / STEPS, 0); // the old plant is at full glow
    show(renderer, [plant('new', 2, 13, { hue: 0.6 })]); // gone, and its slot taken at once
    expectRgb(at(renderer, 2, 13)?.rgb, tint(0.6));
    const uploads = renderer.meshes[0]!.instanceColor!.version;
    renderer.update(5 / STEPS, 10); // the crest is far from step 13: nothing to change, nothing to upload
    expectRgb(at(renderer, 2, 13)?.rgb, tint(0.6));
    expect(renderer.meshes[0]!.instanceColor!.version).toBe(uploads);
    expect(guard.takePeak()).toBe(1); // only the old plant's rise
  });

  it('every glow goes through the flash cap: a tide that jumps on and off a plant is held at 3 changes', () => {
    const { renderer, guard } = make([plant('p', 0, 5, { hue: 0.3 })]);
    const seen: number[] = [];
    for (let i = 0; i < 20; i++) {
      renderer.update((i % 2 ? 5 : 13) / STEPS, i * 100); // on, off, on, off … ten changes a second
      seen.push(at(renderer, 0, 5)!.rgb[0]!);
    }
    const changes = seen.filter((value, i) => i > 0 && value !== seen[i - 1]).length;
    expect(changes).toBeLessThanOrEqual(2 * FLASH_CAP_PER_S); // 2 s of it
    expect(changes).toBeGreaterThan(0);
    expect(guard.takePeak()).toBe(FLASH_CAP_PER_S);
  });
});

/** The brightness a plant is drawn at, 0..1: its colour over its colour at full brightness. */
function level(renderer: PlantRenderer, ring: number, step: number, hue = 0.25): number {
  return at(renderer, ring, step)!.rgb[0]! / tint(hue, 1)[0]!;
}

/** Calls update on every frame of `durationMs` (no tide unless `phase` says so); returns one plant's level per frame. */
function watch(
  renderer: PlantRenderer,
  [ring, step]: readonly [number, number],
  fromMs: number,
  durationMs: number,
  each?: (frame: number) => number | void,
): Sample[] {
  const series: Sample[] = [];
  for (let frame = 0; frame * FRAME_MS < durationMs; frame++) {
    const phase = each?.(frame) ?? Number.NaN;
    renderer.update(phase, fromMs + frame * FRAME_MS);
    series.push({ t: fromMs + frame * FRAME_MS, value: level(renderer, ring, step) });
  }
  return series;
}

describe('PlantRenderer.setTint (FR-HND-15, D-030)', () => {
  const HELD = [1, 5] as const;
  const OTHER = [3, 9] as const;
  const held = (): Plant[] => [plant('held', ...HELD), plant('other', ...OTHER)];

  it('the plant a lost hand held dims to half in one step, and is back at full 100 ms after the hand is found', () => {
    const { renderer, guard } = make(held());
    renderer.update(Number.NaN, 0);
    renderer.setTint('right', 'held', 5000);
    const down = watch(renderer, HELD, FRAME_MS, 300);
    expect(down[0]!.value).toBeCloseTo(PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS); // at once
    expect(changeTimes([{ t: 0, value: PLANT_REST_BRIGHTNESS }, ...down])).toHaveLength(1);
    expect(level(renderer, ...OTHER)).toBeCloseTo(PLANT_REST_BRIGHTNESS);

    renderer.setTint('right', null, 0); // hands:found
    const back = watch(renderer, HELD, down[down.length - 1]!.t + FRAME_MS, 300);
    expect(back[0]!.value).toBeGreaterThan(PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS);
    expect(back[0]!.value).toBeLessThan(PLANT_REST_BRIGHTNESS * 0.7); // not a step: it eases
    const fullAtMs =
      back.find((drawn) => Math.abs(drawn.value - PLANT_REST_BRIGHTNESS) < 1e-6)!.t - back[0]!.t;
    expect(fullAtMs + FRAME_MS).toBeGreaterThanOrEqual(PLANT_TINT_BACK_MS);
    expect(fullAtMs).toBeLessThan(PLANT_TINT_BACK_MS + FRAME_MS);
    expect(changeTimes(back)).toHaveLength(1);
    expect(guard.takePeak()).toBe(2); // both went through the guard
  });

  it('ends by itself when the frame time reaches untilMs', () => {
    const { renderer } = make(held());
    renderer.update(Number.NaN, 0);
    renderer.setTint('left', 'held', 1000);
    renderer.update(Number.NaN, 999);
    expect(level(renderer, ...HELD)).toBeCloseTo(PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS);
    const after = watch(renderer, HELD, 1000, 300);
    expect(after[0]!.value).toBeLessThan(PLANT_REST_BRIGHTNESS); // easing back from 1000 on
    expect(after[after.length - 1]!.value).toBeCloseTo(PLANT_REST_BRIGHTNESS);
  });

  it('one tint per hand; an id that is not drawn tints nothing; a tint outlives a change of the garden', () => {
    const { renderer } = make(held());
    renderer.update(Number.NaN, 0);
    renderer.setTint('left', 'held', 9000);
    renderer.setTint('right', 'nobody', 9000);
    renderer.update(Number.NaN, 100);
    expect(level(renderer, ...HELD)).toBeCloseTo(PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS);
    expect(level(renderer, ...OTHER)).toBeCloseTo(PLANT_REST_BRIGHTNESS);

    renderer.setTint('right', 'other', 250); // the other hand's own tint, with its own end
    show(renderer, [...held(), plant('new', 0, 0)]); // and the garden changes under both
    renderer.update(Number.NaN, 200);
    expect(level(renderer, ...HELD)).toBeCloseTo(PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS);
    expect(level(renderer, ...OTHER)).toBeCloseTo(PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS);
    expect(level(renderer, 0, 0)).toBeCloseTo(PLANT_REST_BRIGHTNESS);
    watch(renderer, OTHER, 250, 300); // the right hand's time is up, the left hand's is not
    expect(level(renderer, ...OTHER)).toBeCloseTo(PLANT_REST_BRIGHTNESS);
    expect(level(renderer, ...HELD)).toBeCloseTo(PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS);

    renderer.setTint('left', 'other', 9000); // `held` is let go; both hands on one plant are one tint,
    renderer.setTint('right', 'other', 700); // which lasts as long as the later of the two
    watch(renderer, HELD, 600, 300);
    expect(level(renderer, ...HELD)).toBeCloseTo(PLANT_REST_BRIGHTNESS);
    expect(level(renderer, ...OTHER)).toBeCloseTo(PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS);
    renderer.setTint('right', null, 0);
    watch(renderer, OTHER, 900, 300);
    expect(level(renderer, ...OTHER)).toBeCloseTo(PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS); // the left still holds it

    // The tinted plant is removed and a new one takes its slot: the new one is not dimmed.
    show(renderer, [plant('held', ...HELD), plant('new', 0, 0), plant('fresh', 4, 4)]);
    renderer.update(Number.NaN, 1000);
    expect(level(renderer, 4, 4)).toBeCloseTo(PLANT_REST_BRIGHTNESS);
  });

  it('an end that is not a number tints nothing, and does not lift the other hand’s tint of the same plant', () => {
    const { renderer } = make(held());
    renderer.update(Number.NaN, 0);
    renderer.setTint('right', 'other', Number.NaN);
    renderer.setTint('left', 'held', 9000);
    renderer.update(Number.NaN, 100);
    expect(level(renderer, ...OTHER)).toBeCloseTo(PLANT_REST_BRIGHTNESS);
    expect(level(renderer, ...HELD)).toBeCloseTo(PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS);
    renderer.setTint('right', 'held', Number.NaN); // the second hand on the same plant, with no end to give
    watch(renderer, HELD, 200, 300);
    expect(level(renderer, ...HELD)).toBeCloseTo(PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS);
  });

  it('the dim and the glow of the tide are one request: the glow times the dim, inside the flash cap', () => {
    const { renderer, guard } = make(held());
    renderer.update(Number.NaN, 0);
    // The whole of what was drawn, from rest on: the count below needs every swing from its start.
    const history: Sample[] = [{ t: 0, value: level(renderer, ...HELD) }];
    renderer.setTint('right', 'held', 60_000);
    renderer.update(HELD[1] / STEPS, FRAME_MS); // the crest is on the dimmed plant
    history.push({ t: FRAME_MS, value: level(renderer, ...HELD) });
    expect(level(renderer, ...HELD)).toBeCloseTo(PLANT_FLASH_BRIGHTNESS * PLANT_TINT_BRIGHTNESS);
    // A hand lost and found five times a second under a running tide at 120 BPM: never more than 3 changes.
    const flicker = watch(renderer, HELD, 1000, 6000, (frame) => {
      const t = frame * FRAME_MS;
      renderer.setTint('right', Math.floor(t / 100) % 2 ? null : 'held', 60_000);
      return (t / 2000) % 1;
    });
    history.push(...flicker);
    expect(changeTimes(flicker).length).toBeGreaterThan(2 * FLASH_CAP_PER_S); // it did keep changing
    expect(mostInOneSecond(history)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(mostInAnyClip(history)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(guard.takePeak()).toBeLessThanOrEqual(FLASH_CAP_PER_S);
  });
});

describe('PlantRenderer.setHover (FR-HND-16)', () => {
  const NEAR = [1, 5] as const;
  const FAR = [3, 9] as const;
  const pair = (): Plant[] => [plant('near', ...NEAR), plant('far', ...FAR)];
  const GLOWING = PLANT_REST_BRIGHTNESS * (1 + PLANT_HOVER_LIFT);
  afterEach(() => settings.set({ highContrast: false }));

  it('the plant an empty hand hovers brightens by 20 % over 100 ms, and eases back when the hand moves off', () => {
    const { renderer, guard } = make(pair());
    renderer.update(Number.NaN, 0);
    renderer.setHover('right', 'near');
    const up = watch(renderer, NEAR, FRAME_MS, 300);
    expect(up[0]!.value).toBeGreaterThan(PLANT_REST_BRIGHTNESS);
    expect(up[0]!.value).toBeLessThan(PLANT_REST_BRIGHTNESS * 1.05); // an ease, not a step
    const fullAtMs = up.find((drawn) => Math.abs(drawn.value - GLOWING) < 1e-6)!.t;
    expect(fullAtMs).toBeGreaterThanOrEqual(HOVER_CUE_MS);
    expect(fullAtMs).toBeLessThan(HOVER_CUE_MS + 2 * FRAME_MS);
    expect(changeTimes([{ t: 0, value: PLANT_REST_BRIGHTNESS }, ...up])).toHaveLength(1); // a level, not a blink
    expect(level(renderer, ...FAR)).toBeCloseTo(PLANT_REST_BRIGHTNESS);

    renderer.setHover('right', null);
    const down = watch(renderer, NEAR, up[up.length - 1]!.t + FRAME_MS, 300);
    expect(down[0]!.value).toBeGreaterThan(PLANT_REST_BRIGHTNESS * 1.15);
    expect(down[down.length - 1]!.value).toBeCloseTo(PLANT_REST_BRIGHTNESS);
    expect(changeTimes(down)).toHaveLength(1);
    expect(guard.takePeak()).toBe(2);
  });

  it('one glow per hand; two hands on one plant are one glow; an id that is not drawn glows nothing', () => {
    const { renderer } = make(pair());
    renderer.update(Number.NaN, 0);
    renderer.setHover('left', 'near');
    renderer.setHover('right', 'nobody');
    watch(renderer, NEAR, FRAME_MS, 300);
    expect(level(renderer, ...NEAR)).toBeCloseTo(GLOWING);
    expect(level(renderer, ...FAR)).toBeCloseTo(PLANT_REST_BRIGHTNESS);

    renderer.setHover('right', 'far');
    show(renderer, [...pair(), plant('new', 0, 0)]); // the garden changes under both
    watch(renderer, FAR, 400, 300);
    expect(level(renderer, ...NEAR)).toBeCloseTo(GLOWING);
    expect(level(renderer, ...FAR)).toBeCloseTo(GLOWING);
    expect(level(renderer, 0, 0)).toBeCloseTo(PLANT_REST_BRIGHTNESS);

    renderer.setHover('right', 'near'); // both on `near`: no brighter than one
    watch(renderer, NEAR, 800, 300);
    expect(level(renderer, ...NEAR)).toBeCloseTo(GLOWING);
    expect(level(renderer, ...FAR)).toBeCloseTo(PLANT_REST_BRIGHTNESS);
    renderer.setHover('left', null); // one of the two leaves: still hovered
    const still = watch(renderer, NEAR, 1200, 300);
    expect(level(renderer, ...NEAR)).toBeCloseTo(GLOWING);

    // The hovered plant is removed and a new one takes its slot: the new one does not glow, from its first frame.
    show(renderer, [plant('far', ...FAR), plant('new', 0, 0), plant('fresh', 4, 4)]);
    renderer.update(Number.NaN, still[still.length - 1]!.t + FRAME_MS);
    expect(level(renderer, 4, 4)).toBeCloseTo(PLANT_REST_BRIGHTNESS);
  });

  it('glow, tint and tide are one request to the guard: their product, inside the flash cap', () => {
    const { renderer, guard } = make(pair());
    renderer.update(Number.NaN, 0);
    // The whole of what was drawn, from rest on: the count below needs every swing from its start.
    const history: Sample[] = [{ t: 0, value: level(renderer, ...NEAR) }];
    renderer.setHover('left', 'near');
    renderer.setTint('right', 'near', 60_000);
    history.push(...watch(renderer, NEAR, FRAME_MS, 300));
    expect(level(renderer, ...NEAR)).toBeCloseTo(GLOWING * PLANT_TINT_BRIGHTNESS);
    renderer.setTint('right', null, 0);
    history.push(...watch(renderer, NEAR, 400, 300, () => NEAR[1] / STEPS)); // the crest stands on the hovered plant
    expect(level(renderer, ...NEAR)).toBeCloseTo(1, 6); // 1.0 × 1.2, and no brighter than full
    // The worst a pair of hands can do under a tide at 120 BPM: the hover flickers every 50 ms, the tint every 130.
    const flicker = watch(renderer, NEAR, 2000, 8000, (frame) => {
      const t = frame * FRAME_MS;
      renderer.setHover('left', Math.floor(t / 50) % 2 ? null : 'near');
      renderer.setTint('right', Math.floor(t / 130) % 2 ? null : 'near', 60_000);
      return (t / 2000) % 1;
    });
    history.push(...flicker);
    expect(changeTimes(flicker).length).toBeGreaterThan(2 * FLASH_CAP_PER_S); // it did keep changing
    expect(mostInOneSecond(history)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(mostInAnyClip(history)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(guard.takePeak()).toBeLessThanOrEqual(FLASH_CAP_PER_S);
  });

  it('high contrast outlines every plant, from the next frame on (FR-UI-05)', () => {
    const { renderer } = make(pair());
    const outline = (): unknown => renderer.meshes[0]!.material.uniforms.uOutline!.value;
    renderer.update(Number.NaN, 0);
    expect(outline()).toBe(0);
    settings.set({ highContrast: true });
    renderer.update(Number.NaN, FRAME_MS);
    expect(outline()).toBe(1);
    expect(level(renderer, ...NEAR)).toBeCloseTo(PLANT_REST_BRIGHTNESS); // the plants' own brightness is not touched
    settings.set({ highContrast: false });
    renderer.update(Number.NaN, 2 * FRAME_MS);
    expect(outline()).toBe(0);
    // With the uniform at 0 the shader draws what it drew before: the outline is a mix by it.
    expect(renderer.meshes[0]!.material.fragmentShader).toMatch(/mix\(vColour \* shade, [^;]+, edge\)/);
    expect(renderer.meshes[0]!.material.fragmentShader).toMatch(/float edge = uOutline \* /);
  });
});

describe('PlantRenderer growth (FR-MUS-09, UX §9.6)', () => {
  const DAY = MS_PER_DAY;
  const HUE = 0.74; // violet: the hue a lighter colour changes most
  /** A plant of the test's hue, planted at time 0, on ring 2. */
  const aged = (id: string, step: number, over: Partial<Plant> = {}): Plant =>
    plant(id, 2, step, { plantedAt: 0, hue: HUE, ...over });
  const STEM_M = (PLANT_STEM_MIN_M + PLANT_STEM_MAX_M) / 2; // the fixture's height is 0.5
  const colourAt = (lightness: number, brightness: number, hue = HUE): number[] =>
    new Color().setHSL(hue, PLANT_SATURATION, lightness, SRGBColorSpace).multiplyScalar(brightness).toArray();
  const cream = (brightness: number): number[] => new Color(CREAM).multiplyScalar(brightness).toArray();
  const luminance = (rgb: ArrayLike<number>, from = 0): number =>
    0.2126 * rgb[from]! + 0.7152 * rgb[from + 1]! + 0.0722 * rgb[from + 2]!;
  /** The brightness a colour is drawn at, given the colour it has at full brightness. */
  const brightnessOf = (rgb: number[], atFull: number[]): number => luminance(rgb) / luminance(atFull);
  afterEach(() => settings.set({ reducedMotion: false }));

  interface Whorl {
    heightM: number;
    width: number;
    rgb: number[];
  }
  /** The whorls drawn on the plant of a cell, lowest first: where on the stem, how wide (1 = 2.4 cm), what colour. */
  function whorlsAt(renderer: PlantRenderer, ring: number, step: number): Whorl[] {
    const centre = cellCentre({ ring, step }, { x: 0, y: 0 });
    const matrix = new Matrix4();
    const colour = new Color();
    const found: Whorl[] = [];
    for (let index = 0; index < renderer.whorls.count; index++) {
      renderer.whorls.getMatrixAt(index, matrix);
      const { x, z } = new Vector3().setFromMatrixPosition(matrix);
      if (Math.hypot(x - centre.x, z - centre.y) > 1e-6) continue;
      renderer.whorls.getColorAt(index, colour);
      found.push({
        heightM: new Vector3().setFromMatrixColumn(matrix, 1).length(),
        width: new Vector3().setFromMatrixColumn(matrix, 0).length(),
        rgb: colour.toArray(),
      });
    }
    return found.sort((a, b) => a.heightM - b.heightM);
  }
  const widths = (renderer: PlantRenderer, step: number): number[] =>
    whorlsAt(renderer, 2, step).map((whorl) => Number(whorl.width.toFixed(4)));

  /** Runs frames from `fromMs` for `durationMs` with the crest standing on `step` (no tide when it is null). */
  function run(renderer: PlantRenderer, fromMs: number, durationMs: number, step: number | null): number {
    let t = fromMs;
    for (; t < fromMs + durationMs; t += FRAME_MS) {
      renderer.update(step === null ? Number.NaN : step / STEPS, t);
    }
    return t;
  }

  it('age is counted in whorls: none on the first day, one after a day, two after three, blossoms after a week', () => {
    const { renderer, parent } = make();
    const visit = 10 * DAY;
    show(
      renderer,
      [
        aged('seedling', 0, { plantedAt: visit - 0.5 * DAY }),
        aged('one', 1, { plantedAt: visit - DAY }),
        aged('three', 2, { plantedAt: visit - 3 * DAY }),
        aged('week', 3, { plantedAt: visit - 7 * DAY }),
      ],
      visit,
    );
    // New to the renderer: each is drawn at its stage at once.
    expect(whorlsAt(renderer, 2, 0)).toEqual([]);
    expect(widths(renderer, 1)).toEqual([1]);
    expect(widths(renderer, 2)).toEqual([1, 1]);
    expect(widths(renderer, 3)).toEqual([PLANT_BLOSSOM_WIDTH, PLANT_BLOSSOM_WIDTH]);
    expect(renderer.whorls.count).toBe(5);
    // On the stem at 0.40 and 0.60 of its height, whatever that is.
    expect(whorlsAt(renderer, 2, 1)[0]!.heightM).toBeCloseTo(PLANT_WHORL_AT[0] * STEM_M);
    expect(whorlsAt(renderer, 2, 2).map((whorl) => whorl.heightM / STEM_M)).toEqual([
      expect.closeTo(PLANT_WHORL_AT[0]),
      expect.closeTo(PLANT_WHORL_AT[1]),
    ]);
    // Leaves take the plant's colour and brightness; blossoms are cream, and their plant is lighter.
    expectRgb(whorlsAt(renderer, 2, 2)[1]!.rgb, colourAt(PLANT_LIGHTNESS, PLANT_REST_BRIGHTNESS));
    expectRgb(at(renderer, 2, 2)!.rgb, colourAt(PLANT_LIGHTNESS, PLANT_REST_BRIGHTNESS));
    expectRgb(whorlsAt(renderer, 2, 3)[0]!.rgb, cream(PLANT_REST_BRIGHTNESS));
    expectRgb(at(renderer, 2, 3)!.rgb, colourAt(PLANT_BLOSSOM_LIGHTNESS, PLANT_REST_BRIGHTNESS));
    // One more mesh for all whorls of all voices: a ring of four leaves, 2.4 cm across, 32 triangles.
    expect(parent.children).toEqual([...renderer.meshes, renderer.whorls]);
    const { geometry } = renderer.whorls;
    expect(geometry.index!.count / 3).toBe(32);
    const position = geometry.getAttribute('position');
    const radii = Array.from({ length: position.count }, (_, v) =>
      Math.hypot(position.getX(v), position.getZ(v)),
    );
    expect(2 * Math.max(...radii)).toBeCloseTo(0.024);
    // Four leaves, not a square plate: between two tips its edge (the middle of its three rows) comes well in.
    const edge = radii.filter((_, v) => v % 3 === 1).slice(0, 8);
    expect(edge.map((radius) => Number((radius / 0.012).toFixed(2)))).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 7].map((corner) => (corner % 2 ? 1 - PLANT_WHORL_LOBE_DEPTH : 1)),
    );
    expect(renderer.whorls.material).toBe(renderer.meshes[0]!.material);
  });

  it('a visit keeps the plants array and is still drawn: the early return follows lastVisitAt too', () => {
    const plants = [aged('p', 5)];
    const { renderer } = make();
    show(renderer, plants, 0.5 * DAY);
    expect(renderer.whorls.count).toBe(0);
    const uploads = (): number => renderer.whorls.instanceMatrix.version;
    const before = uploads();
    show(renderer, plants, 0.5 * DAY); // the same array at the same time: no work
    expect(uploads()).toBe(before);
    show(renderer, plants, 3.5 * DAY); // the same array, a visit later
    expect(renderer.whorls.count).toBe(2);
    expect(uploads()).toBeGreaterThan(before);
  });

  it('a plant that grew waits for its first note, then its whorls unfurl over 600 ms, ease-out', () => {
    const plants = [aged('grew', 5), aged('young', 9, { plantedAt: 3 * DAY })];
    const { renderer } = make();
    show(renderer, plants, 0.5 * DAY);
    renderer.update(Number.NaN, 0);
    show(renderer, plants, 3.5 * DAY); // `grew` is 3.5 days old now: stage 2. `young` is half a day old.
    expect(widths(renderer, 5)).toEqual([0, 0]); // as it stood, until its note
    let t = run(renderer, FRAME_MS, 1000, 9); // the crest stands on another step for a second
    expect(widths(renderer, 5)).toEqual([0, 0]);

    t = run(renderer, t, 60, 5); // its first note: the flash rises
    const started = whorlsAt(renderer, 2, 5)[0]!.width;
    expect(started).toBeGreaterThan(0);
    expect(started).toBeLessThan(0.3);
    t = run(renderer, t, 240, 5); // 300 ms in: an ease-out is three quarters there at half time
    expect(whorlsAt(renderer, 2, 5)[0]!.width).toBeGreaterThan(0.65);
    expect(whorlsAt(renderer, 2, 5)[0]!.width).toBeLessThan(0.85);
    expect(whorlsAt(renderer, 2, 5)[1]!.width).toBeCloseTo(whorlsAt(renderer, 2, 5)[0]!.width);
    // One frame, long after the 600 ms: the whorls are placed a last time, at their full size and no less.
    t += 5000;
    renderer.update(Number.NaN, t);
    for (const whorl of whorlsAt(renderer, 2, 5)) expect(whorl.width).toBeCloseTo(1, 6);
    expect(whorlsAt(renderer, 2, 5)).toHaveLength(2);
    expect(whorlsAt(renderer, 2, 9)).toEqual([]);
    // Settled: nothing more is uploaded for it.
    const uploads = renderer.whorls.instanceMatrix.version;
    run(renderer, t, 300, null);
    expect(renderer.whorls.instanceMatrix.version).toBe(uploads);
  });

  it('a week: the whorls open into cream blossoms and the plant turns lighter, inside the rise of its own flash', () => {
    const plants = [aged('old', 5)];
    const { renderer, guard } = make();
    show(renderer, plants, 3.5 * DAY);
    renderer.update(Number.NaN, 0);
    show(renderer, plants, 7.5 * DAY);
    expect(widths(renderer, 5)).toEqual([1, 1]); // two leaf whorls, as before the visit
    expectRgb(at(renderer, 2, 5)!.rgb, colourAt(PLANT_LIGHTNESS, PLANT_REST_BRIGHTNESS));
    expectRgb(whorlsAt(renderer, 2, 5)[0]!.rgb, colourAt(PLANT_LIGHTNESS, PLANT_REST_BRIGHTNESS));

    // What the eye gets of the plant and of a whorl, frame by frame, as a share of each one's lightest colour.
    const pale = colourAt(PLANT_BLOSSOM_LIGHTNESS, 1);
    const seen = { plant: [] as Sample[], whorl: [] as Sample[] };
    const look = (t: number): void => {
      seen.plant.push({ t, value: brightnessOf(at(renderer, 2, 5)!.rgb, pale) });
      seen.whorl.push({ t, value: brightnessOf(whorlsAt(renderer, 2, 5)[0]!.rgb, cream(1)) });
    };
    look(0);
    const bar = 2000; // 120 BPM
    for (let t = FRAME_MS; t < 3 * bar; t += FRAME_MS) {
      renderer.update(((t + bar / 2) / bar) % 1, t); // the crest starts half a bar away: three notes in three bars
      look(t);
    }
    expectRgb(
      at(renderer, 2, 5)!.rgb,
      colourAt(PLANT_BLOSSOM_LIGHTNESS, brightnessOf(at(renderer, 2, 5)!.rgb, pale)),
    );
    expect(widths(renderer, 5)).toEqual([PLANT_BLOSSOM_WIDTH, PLANT_BLOSSOM_WIDTH]);
    // Up and down once a bar, the bar of the bloom included: the colours add no change of their own.
    expect(changeTimes(seen.plant)).toHaveLength(6);
    expect(changeTimes(seen.whorl)).toHaveLength(6);
    expect(mostInOneSecond(seen.plant)).toBeLessThanOrEqual(2);
    expect(guard.takePeak()).toBe(2);
    // The colours arrive with the first note and never go back.
    expect(Math.max(...seen.plant.map((drawn) => drawn.value))).toBeGreaterThan(0.95);
    expect(seen.plant[seen.plant.length - 1]!.value).toBeGreaterThan(PLANT_REST_BRIGHTNESS - 0.01);
    expect(seen.whorl[seen.whorl.length - 1]!.value).toBeGreaterThan(PLANT_REST_BRIGHTNESS - 0.01);
  });

  it('reduced motion: no unfurling, the new stage is there at once on the same note', () => {
    const plants = [aged('grew', 5)];
    const { renderer } = make();
    show(renderer, plants, 0.5 * DAY);
    renderer.update(Number.NaN, 0);
    settings.set({ reducedMotion: true });
    show(renderer, plants, 7.5 * DAY);
    const t = run(renderer, FRAME_MS, 500, null);
    expect(widths(renderer, 5)).toEqual([0, 0]); // it still waits for its note
    expectRgb(at(renderer, 2, 5)!.rgb, colourAt(PLANT_LIGHTNESS, PLANT_REST_BRIGHTNESS));
    run(renderer, t, 60, 5);
    expect(widths(renderer, 5)).toEqual([PLANT_BLOSSOM_WIDTH, PLANT_BLOSSOM_WIDTH]); // a cut
    const flash = brightnessOf(at(renderer, 2, 5)!.rgb, colourAt(PLANT_BLOSSOM_LIGHTNESS, 1));
    expect(flash).toBeGreaterThan(PLANT_REST_BRIGHTNESS + 0.1);
    expectRgb(at(renderer, 2, 5)!.rgb, colourAt(PLANT_BLOSSOM_LIGHTNESS, flash));
    expectRgb(whorlsAt(renderer, 2, 5)[0]!.rgb, cream(flash));
  });

  it('no note for 10 s: the whorls unfurl anyway; a blossom keeps its colours for the first rise the guard grants', () => {
    const plants = [aged('leafy', 5), aged('old', 9, { plantedAt: -4 * DAY })];
    const { renderer } = make();
    show(renderer, plants, 0.5 * DAY);
    renderer.update(Number.NaN, 0);
    show(renderer, plants, 3.5 * DAY); // `leafy` is at stage 2 now, `old` at stage 3
    let t = run(renderer, FRAME_MS, PLANT_BLOOM_WAIT_MS - 100, null);
    expect(widths(renderer, 5)).toEqual([0, 0]);
    expect(widths(renderer, 9)).toEqual([1, 1]);
    t = run(renderer, t, 100 + PLANT_BLOOM_MS + 2 * FRAME_MS, null);
    expect(widths(renderer, 5)).toEqual([1, 1]);
    expect(widths(renderer, 9)).toEqual([PLANT_BLOSSOM_WIDTH, PLANT_BLOSSOM_WIDTH]);
    // No rise was granted, so no colour moved: that would be a change the guard never counted.
    expectRgb(at(renderer, 2, 9)!.rgb, colourAt(PLANT_LIGHTNESS, PLANT_REST_BRIGHTNESS));
    expectRgb(whorlsAt(renderer, 2, 9)[0]!.rgb, colourAt(PLANT_LIGHTNESS, PLANT_REST_BRIGHTNESS));
    renderer.setHover('right', 'old'); // a hover's glow is a rise too
    run(renderer, t, 300, null);
    const glowing = PLANT_REST_BRIGHTNESS * (1 + PLANT_HOVER_LIFT);
    expectRgb(at(renderer, 2, 9)!.rgb, colourAt(PLANT_BLOSSOM_LIGHTNESS, glowing));
    expectRgb(whorlsAt(renderer, 2, 9)[0]!.rgb, cream(glowing));
  });

  it('a plant that grows again while it still waits keeps the look it had, and unfurls all of it on its note', () => {
    const plants = [aged('p', 5)];
    const { renderer } = make();
    show(renderer, plants, 0.5 * DAY);
    renderer.update(Number.NaN, 0);
    show(renderer, plants, 1.5 * DAY); // one whorl to come; no tide runs
    let t = run(renderer, FRAME_MS, 300, null);
    expect(widths(renderer, 5)).toEqual([0]);
    show(renderer, plants, 3.5 * DAY); // and now two, before the first was ever shown
    t = run(renderer, t, 300, null);
    expect(widths(renderer, 5)).toEqual([0, 0]); // as it stood when it was last seen: no whorl at all
    t = run(renderer, t, 100, 5); // its note
    t += 5000;
    renderer.update(Number.NaN, t);
    expect(widths(renderer, 5)).toEqual([1, 1]);
  });

  it('a rise smaller than a counted change is not a note: the plant goes on waiting', () => {
    const plants = [aged('p', 5)];
    const { renderer } = make();
    show(renderer, plants, 0.5 * DAY);
    renderer.update(Number.NaN, 0);
    show(renderer, plants, 3.5 * DAY);
    renderer.update(Number.NaN, FRAME_MS); // the wait begins at rest
    // Then the crest stands 2.1 steps past the plant: 30 % of its light is left, a rise of 0.09.
    const faint = (5 + 2.1) / STEPS;
    let t = 2 * FRAME_MS;
    for (; t < 500; t += FRAME_MS) renderer.update(faint, t);
    const risen = level(renderer, 2, 5, HUE) - PLANT_REST_BRIGHTNESS;
    expect(risen).toBeGreaterThan(0.08);
    expect(risen).toBeLessThan(FLASH_MIN_DELTA);
    expect(widths(renderer, 5)).toEqual([0, 0]);
    run(renderer, t, 100, 5); // the crest itself: a note
    expect(whorlsAt(renderer, 2, 5)[0]!.width).toBeGreaterThan(0);
  });

  it('a second wait starts from where the plant stands, not from the lowest it was during the first', () => {
    const plants = [aged('p', 5)];
    const { renderer } = make();
    show(renderer, plants, 0.5 * DAY);
    renderer.update(Number.NaN, 0);
    show(renderer, plants, 1.5 * DAY); // the first wait
    renderer.setTint('left', 'p', 60_000); // during it the plant is dimmed to 0.35 ...
    let t = run(renderer, FRAME_MS, 300, null);
    expect(widths(renderer, 5)).toEqual([0]);
    renderer.setTint('left', null, 0); // ... and its way back to 0.70 is a rise the guard counts: it unfurls
    t = run(renderer, t, 300, null);
    t += 5000;
    renderer.update(Number.NaN, t);
    expect(widths(renderer, 5)).toEqual([1]);
    show(renderer, plants, 3.5 * DAY); // the second wait, at rest: 0.70 is 0.35 above the first wait's lowest
    t = run(renderer, t + FRAME_MS, 500, null);
    expect(widths(renderer, 5)).toEqual([1, 0]); // nothing rose, so the second whorl waits
  });

  it('a late blossom that has unfurled uploads no more matrices while it waits for its colours', () => {
    const plants = [aged('old', 9, { plantedAt: -4 * DAY })];
    const { renderer } = make();
    show(renderer, plants, 0.5 * DAY);
    renderer.update(Number.NaN, 0);
    show(renderer, plants, 3.5 * DAY); // a blossom now, and no tide comes
    let t = run(renderer, FRAME_MS, PLANT_BLOOM_WAIT_MS + PLANT_BLOOM_MS + 100, null);
    expect(widths(renderer, 9)).toEqual([PLANT_BLOSSOM_WIDTH, PLANT_BLOSSOM_WIDTH]); // unfurled by the 10 s net
    const uploads = renderer.whorls.instanceMatrix.version;
    t = run(renderer, t, 10_000, null); // 720 settled frames: it still waits for a rise, and has nothing to place
    expect(renderer.whorls.instanceMatrix.version).toBe(uploads);
    // It was not forgotten: the first rise the guard grants still brings its colours.
    renderer.setHover('right', 'old');
    run(renderer, t, 300, null);
    expectRgb(whorlsAt(renderer, 2, 9)[0]!.rgb, cream(PLANT_REST_BRIGHTNESS * (1 + PLANT_HOVER_LIFT)));
  });

  it('whorls follow their plant: its glow, its tint, its move and its removal; a younger garden is a cut', () => {
    const { renderer } = make();
    const old = aged('old', 5, { plantedAt: -7 * DAY });
    show(renderer, [old, aged('leafy', 9, { plantedAt: -DAY })], 0);
    renderer.update(5 / STEPS, 0); // the crest on the blossomed plant
    expectRgb(whorlsAt(renderer, 2, 5)[1]!.rgb, cream(PLANT_FLASH_BRIGHTNESS));
    expectRgb(whorlsAt(renderer, 2, 9)[0]!.rgb, colourAt(PLANT_LIGHTNESS, PLANT_REST_BRIGHTNESS));
    renderer.setTint('left', 'leafy', 60_000);
    renderer.update(Number.NaN, 2000);
    expectRgb(
      whorlsAt(renderer, 2, 9)[0]!.rgb,
      colourAt(PLANT_LIGHTNESS, PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS),
    );

    show(renderer, [{ ...old, cell: { ring: 4, step: 1 }, height: 1 }], 0); // moved and stretched; `leafy` removed
    expect(renderer.whorls.count).toBe(2);
    expect(whorlsAt(renderer, 2, 5)).toEqual([]);
    expect(whorlsAt(renderer, 4, 1).map((whorl) => whorl.heightM)).toEqual([
      expect.closeTo(PLANT_WHORL_AT[0] * PLANT_STEM_MAX_M),
      expect.closeTo(PLANT_WHORL_AT[1] * PLANT_STEM_MAX_M),
    ]);
    // Another garden is restored in which this plant is two days old: one leaf whorl, at once, its own colour.
    show(renderer, [{ ...old, plantedAt: -2 * DAY }], 0);
    expect(widths(renderer, 5)).toEqual([1]);
    expectRgb(at(renderer, 2, 5)!.rgb, colourAt(PLANT_LIGHTNESS, level(renderer, 2, 5, HUE)));
  });

  it('a full bed blooming at once, with a hover and a tint flickering: no plant and no whorl over the cap (FR-UI-11)', () => {
    const bed = fullBedExcept().map((p, i) => ({ ...p, plantedAt: 0, hue: i / 80 }));
    const { renderer, guard } = make();
    show(renderer, bed, 3.5 * DAY);
    renderer.update(Number.NaN, 0);
    show(renderer, bed, 7.5 * DAY); // every one of the 80 grew to a blossom
    expect(renderer.whorls.count).toBe(160);
    // What the eye gets of each plant and each whorl, as a share of its own lightest colour. The fixture's plants
    // are all bells, so instance i is plant i and its whorls are instances 2i and 2i + 1.
    const plantColours = renderer.meshes[0]!.instanceColor!.array;
    const whorlColours = renderer.whorls.instanceColor!.array;
    const fullOf = bed.map((p) => luminance(colourAt(PLANT_BLOSSOM_LIGHTNESS, 1, p.hue)));
    const seen = Array.from({ length: 80 + 160 }, (): Sample[] => []);
    const look = (t: number): void => {
      for (let i = 0; i < 80; i++) seen[i]!.push({ t, value: luminance(plantColours, i * 3) / fullOf[i]! });
      for (let i = 0; i < 160; i++) {
        seen[80 + i]!.push({ t, value: luminance(whorlColours, i * 3) / luminance(cream(1)) });
      }
    };
    look(0); // at rest: every swing is counted from its start
    const bar = 2000; // 120 BPM, the fastest
    for (let t = FRAME_MS; t < 4 * bar; t += FRAME_MS) {
      // Hands at their worst on two plants: the hover flickers every 50 ms, the tint every 130.
      renderer.setHover('left', Math.floor(t / 50) % 2 ? null : 'p37');
      renderer.setTint('right', Math.floor(t / 130) % 2 ? null : 'p37', 60_000);
      renderer.setHover('right', Math.floor(t / 70) % 2 ? null : 'p2');
      renderer.update((t / bar) % 1, t);
      look(t);
    }
    expect(Math.max(...seen.map(mostInOneSecond))).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(Math.max(...seen.map(mostInAnyClip))).toBeLessThanOrEqual(FLASH_CAP_PER_S); // each second by itself
    expect(Math.min(...seen.map((series) => changeTimes(series).length))).toBeGreaterThanOrEqual(2); // all did flash
    expect(guard.takePeak()).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    // All 80 have bloomed within the first bar, in the order they play.
    expect(new Set(widths(renderer, 0).concat(widths(renderer, 15)))).toEqual(new Set([PLANT_BLOSSOM_WIDTH]));
  });
});

describe('the flash cap, counted second by second from what is drawn (FR-UI-11, T-119 review)', () => {
  const DAY = MS_PER_DAY;
  const BAR_MS = 2000; // 120 BPM, the fastest
  const STEP_MS = BAR_MS / STEPS;
  /** A tide that starts at `fromMs` with its crest on step 0. */
  const tideFrom = (fromMs: number, t: number): number =>
    t < fromMs ? Number.NaN : ((t - fromMs) / BAR_MS) % 1;

  it('a crest that lifts a plant already lit by a hover is a change of that second (sequence A)', () => {
    const { renderer, guard } = make([plant('p', 2, 1)]);
    renderer.update(Number.NaN, 0);
    const drawn: Sample[] = [{ t: 0, value: level(renderer, 2, 1) }];
    // A hand hovers the plant and holds: up to 0.84. Two seconds on a tide starts; its crest reaches the plant
    // 125 ms later and lifts it to 1.00, a second step up after a pause. As the crest passes the hand leaves,
    // comes back and leaves again: down, up, down.
    const hovers: readonly (readonly [number, boolean])[] = [
      [0, true],
      [2000 + STEP_MS + 320, false],
      [2000 + STEP_MS + 440, true],
      [2000 + STEP_MS + 560, false],
    ];
    for (let t = FRAME_MS; t < 5000; t += FRAME_MS) {
      const isOn = hovers.filter(([atMs]) => atMs <= t).pop()?.[1] ?? false;
      renderer.setHover('right', isOn ? 'p' : null);
      renderer.update(tideFrom(2000, t), t);
      drawn.push({ t, value: level(renderer, 2, 1) });
    }
    expect(Math.max(...drawn.map((each) => each.value))).toBeCloseTo(1, 5); // the crest did lift it
    expect(changeTimes(drawn).length).toBeGreaterThanOrEqual(4); // and the hand's coming and going was drawn
    expect(mostInAnyClip(drawn)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(guard.takePeak()).toBeLessThanOrEqual(FLASH_CAP_PER_S);
  });

  it('a tint that dims a plant after its glow has gone is a change of that second (sequence B)', () => {
    const { renderer, guard } = make([plant('p', 2, 2)]);
    renderer.update(Number.NaN, 0);
    const drawn: Sample[] = [{ t: 0, value: level(renderer, 2, 2) }];
    // A hover comes and goes: up, and down to rest. After a pause a tint steps the plant down again, to 0.35.
    // Then the hand is found as a crest arrives (up to 1.00), lost again on the way down (down), and found
    // with a hover on (up).
    const crestMs = 3000 + 2 * STEP_MS;
    for (let t = FRAME_MS; t < 6000; t += FRAME_MS) {
      renderer.setHover('right', t < 1000 || t >= crestMs + 370 ? 'p' : null);
      const isTinted = (t >= 2778 && t < crestMs - 130) || (t >= crestMs + 278 && t < crestMs + 370);
      renderer.setTint('left', isTinted ? 'p' : null, 60_000);
      renderer.update(tideFrom(3000, t), t);
      drawn.push({ t, value: level(renderer, 2, 2) });
    }
    const lowest = Math.min(...drawn.map((each) => each.value));
    expect(lowest).toBeCloseTo(PLANT_REST_BRIGHTNESS * PLANT_TINT_BRIGHTNESS, 5); // the tint did step it down
    expect(changeTimes(drawn).length).toBeGreaterThanOrEqual(4);
    expect(mostInAnyClip(drawn)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(guard.takePeak()).toBeLessThanOrEqual(FLASH_CAP_PER_S);
  });

  it('48 seeded runs of 8 s: a hover, a tint, a visit to a blossom and a tide at random on one plant', () => {
    const luminance = (rgb: number[]): number => 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
    const worst: number[] = [];
    let changes = 0;
    for (let seed = 1; seed <= 48; seed++) {
      const random = mulberry32(seed);
      const hue = random();
      const plants = [plant('p', 2, Math.floor(random() * STEPS), { plantedAt: 0, hue })];
      const { renderer, guard } = make();
      show(renderer, plants, 3.5 * DAY);
      renderer.update(Number.NaN, 0);
      // The eye's share of the plant's lightest colour: a blossom's colours are part of what is counted.
      const full = luminance(
        new Color().setHSL(hue, PLANT_SATURATION, PLANT_BLOSSOM_LIGHTNESS, SRGBColorSpace).toArray(),
      );
      const drawn: Sample[] = [{ t: 0, value: luminance(at(renderer, 2, plants[0]!.cell.step)!.rgb) / full }];
      const visitMs = random() * 8000;
      const tideFromMs = random() * 4000;
      let isHovered = false;
      let isTinted = false;
      for (let t = FRAME_MS; t < 8000; t += FRAME_MS) {
        // Each hand changes its mind about three times a second on average, at any frame.
        if (random() < 0.04) isHovered = !isHovered;
        if (random() < 0.04) isTinted = !isTinted;
        renderer.setHover('right', isHovered ? 'p' : null);
        renderer.setTint('left', isTinted ? 'p' : null, 60_000);
        if (t >= visitMs) show(renderer, plants, 7.5 * DAY);
        renderer.update(tideFrom(tideFromMs, t), t);
        drawn.push({ t, value: luminance(at(renderer, 2, plants[0]!.cell.step)!.rgb) / full });
      }
      worst.push(mostInAnyClip(drawn));
      changes += changeTimes(drawn).length;
      expect(guard.takePeak(), `seed ${seed}`).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    }
    expect(changes).toBeGreaterThan(48 * 8); // the runs were busy: more than a change a second
    expect(worst.filter((count) => count > FLASH_CAP_PER_S)).toEqual([]); // no run over the cap
    expect(Math.max(...worst)).toBe(FLASH_CAP_PER_S); // and the cap was reached: the runs press on it
  });
});

describe('PlantRenderer.dispose', () => {
  it('takes its meshes out of the scene and frees their geometry and the shared material', () => {
    const { renderer, parent } = make([plant('a', 0, 0)]);
    const freed: string[] = [];
    const [mesh] = renderer.meshes;
    mesh!.geometry.addEventListener('dispose', () => freed.push('geometry'));
    mesh!.material.addEventListener('dispose', () => freed.push('material'));
    renderer.whorls.geometry.addEventListener('dispose', () => freed.push('whorl geometry'));
    renderer.dispose();
    expect(parent.children).toEqual([]);
    expect(freed).toEqual(['geometry', 'whorl geometry', 'material']);
  });
});
