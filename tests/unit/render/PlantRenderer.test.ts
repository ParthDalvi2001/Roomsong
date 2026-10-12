import { Color, Group, Matrix4, SRGBColorSpace, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { cellCentre, STEPS } from '../../../src/garden/index.js';
import {
  FLASH_CAP_PER_S,
  PLANT_CAPACITY,
  PLANT_FLASH_BRIGHTNESS,
  PLANT_LIGHTNESS,
  PLANT_REST_BRIGHTNESS,
  PLANT_SATURATION,
  PLANT_STEM_MAX_M,
  PLANT_STEM_MIN_M,
} from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { PlantRenderer } from '../../../src/render/PlantRenderer.js';
import { fullBedExcept, plant } from '../garden/fixtures.js';

import type { Plant } from '../../../src/garden/index.js';

const SHAPES = ['bell', 'pad', 'pluck'] as const;

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

function make(plants: Plant[] = []): { renderer: PlantRenderer; guard: FlashGuard; parent: Group } {
  const parent = new Group();
  const guard = new FlashGuard();
  const renderer = new PlantRenderer(parent, guard);
  renderer.setState({ plants });
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

  it('one mesh per silhouette; the six voices share the three shapes', () => {
    const { renderer, parent } = make([
      plant('a', 0, 0, { voice: 'bell' }),
      plant('b', 0, 1, { voice: 'pad' }),
      plant('c', 0, 2, { voice: 'pluck' }),
      plant('d', 0, 3, { voice: 'bass' }),
      plant('e', 0, 4, { voice: 'choir' }),
      plant('f', 0, 5, { voice: 'shimmer' }),
    ]);
    expect(parent.children).toEqual(renderer.meshes);
    expect(renderer.meshes).toHaveLength(3);
    expect(renderer.meshes.map((mesh) => mesh.count)).toEqual([2, 2, 2]);
    expect([0, 1, 2, 3, 4, 5].map((step) => at(renderer, 0, step)!.shape)).toEqual([
      'bell',
      'pad',
      'pluck',
      'bell',
      'pad',
      'pluck',
    ]);
    // Three different outlines, each with the head marked for the shader, and one shared material.
    const vertexCounts = renderer.meshes.map((mesh) => mesh.geometry.getAttribute('position').count);
    expect(new Set(vertexCounts).size).toBe(3);
    for (const mesh of renderer.meshes) {
      expect(mesh.geometry.getAttribute('aHead').count).toBe(mesh.geometry.getAttribute('position').count);
      expect(mesh.material).toBe(renderer.meshes[0]!.material);
    }
  });

  it('add, move, reshape and remove change the right instance and leave the others as they were', () => {
    const a = plant('a', 0, 0, { hue: 0.1 });
    const b = plant('b', 1, 5, { hue: 0.5, voice: 'pad' });
    const c = plant('c', 2, 9, { hue: 0.9 });
    const { renderer } = make([a, b]);
    const before = { a: at(renderer, 0, 0), b: at(renderer, 1, 5) };

    renderer.setState({ plants: [a, b, c] }); // add
    expect(drawn(renderer)).toHaveLength(3);
    expectRgb(at(renderer, 2, 9)?.rgb, tint(0.9));
    expect(at(renderer, 0, 0)).toEqual(before.a);
    expect(at(renderer, 1, 5)).toEqual(before.b);

    renderer.setState({ plants: [a, { ...b, cell: { ring: 4, step: 13 } }, c] }); // move
    expect(drawn(renderer)).toHaveLength(3);
    expect(at(renderer, 1, 5)).toBeUndefined();
    expect(at(renderer, 4, 13)).toMatchObject({ shape: 'pad', stemM: before.b!.stemM, rgb: before.b!.rgb });
    expect(at(renderer, 0, 0)).toEqual(before.a);

    renderer.setState({ plants: [{ ...a, height: 1 }, { ...b, cell: { ring: 4, step: 13 } }, c] }); // reshape
    expect(at(renderer, 0, 0)!.stemM).toBeCloseTo(PLANT_STEM_MAX_M);

    renderer.setState({ plants: [c] }); // remove two, the first of its mesh among them
    expect(drawn(renderer)).toHaveLength(1);
    expect(at(renderer, 0, 0)).toBeUndefined();
    expect(at(renderer, 4, 13)).toBeUndefined();
    expectRgb(at(renderer, 2, 9)?.rgb, tint(0.9));

    renderer.setState({ plants: [] });
    expect(renderer.meshes.map((mesh) => mesh.count)).toEqual([0, 0, 0]);
  });

  it('a full bed is 80 instances, and a bed filled again after it was emptied still is', () => {
    const { renderer } = make(fullBedExcept());
    expect(drawn(renderer)).toHaveLength(PLANT_CAPACITY);
    renderer.setState({ plants: [] });
    renderer.setState({ plants: fullBedExcept().map((p) => ({ ...p, id: `again-${p.id}` })) });
    expect(drawn(renderer)).toHaveLength(PLANT_CAPACITY);
    expect(at(renderer, 4, 15)).toBeDefined();
  });

  it('a full bed replaced by a full bed of new ids in one call draws all 80 (a restore over a planted bed)', () => {
    const { renderer } = make(fullBedExcept());
    renderer.setState({ plants: fullBedExcept().map((p) => ({ ...p, id: `new-${p.id}`, hue: 0.9 })) });
    expect(drawn(renderer)).toHaveLength(PLANT_CAPACITY);
    for (const instance of drawn(renderer)) expectRgb(instance.rgb, tint(0.9));
    // And half of a bed swapped: the 40 that stay keep theirs, the 40 new ones are all drawn.
    const half = fullBedExcept().map((p, i) => (i % 2 ? p : { ...p, id: `swap-${p.id}` }));
    renderer.setState({ plants: half });
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
    expect(() => renderer.setState({ plants })).toThrow();
    plants[1] = plant('b', 0, 1);
    renderer.setState({ plants });
    expect(drawn(renderer)).toHaveLength(2);
  });

  it('the same plants array again uploads nothing (dirty flag)', () => {
    const plants = [plant('a', 0, 0)];
    const { renderer } = make(plants);
    const version = (): number[] =>
      renderer.meshes.flatMap((mesh) => [mesh.instanceMatrix.version, mesh.instanceColor!.version]);
    const before = version();
    renderer.setState({ plants });
    expect(version()).toEqual(before);
    renderer.setState({ plants: [...plants] });
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
    renderer.setState({ plants: [lit] });
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
    renderer.setState({ plants: [plant('new', 2, 13, { hue: 0.6 })] }); // gone, and its slot taken at once
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

describe('PlantRenderer.dispose', () => {
  it('takes its meshes out of the scene and frees their geometry and the shared material', () => {
    const { renderer, parent } = make([plant('a', 0, 0)]);
    const freed: string[] = [];
    const [mesh] = renderer.meshes;
    mesh!.geometry.addEventListener('dispose', () => freed.push('geometry'));
    mesh!.material.addEventListener('dispose', () => freed.push('material'));
    renderer.dispose();
    expect(parent.children).toEqual([]);
    expect(freed).toEqual(['geometry', 'material']);
  });
});
