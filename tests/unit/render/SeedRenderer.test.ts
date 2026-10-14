// The seeds (T-127, UX §3.3, §7): the supply orb over the bed, the glide to a hand and back, the brightness
// through the guard. A plain Group for the scene and the page's kind of FlashGuard; no WebGL: what would be drawn
// is read from the instances. The per-frame heap cost is in SeedSystem.heap.test.ts.
import { Color, Group, Matrix4, SRGBColorSpace, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, settings } from '../../../src/core/index.js';
import { SEED_SUPPLY_MAX } from '../../../src/garden/index.js';
import {
  PLANT_LIGHTNESS,
  PLANT_REST_BRIGHTNESS,
  PLANT_SATURATION,
  SEED_BUMP_M,
  SEED_BUMP_REDUCED_M,
  SEED_DIAMETER_M,
  SEED_GLIDE_MS,
  SEED_HOP_MS,
  SEED_OUT_BRIGHTNESS,
  SUPPLY_ORB_LIFT_M,
  SUPPLY_ORB_RADIUS_M,
} from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { SeedRenderer } from '../../../src/render/SeedRenderer.js';

import { mostInAnyClip, type Drawn } from './changes.js';

const T0 = 12_345_678; // a frame time of real size, in ms
const FRAME_MS = 14;
const CENTRE = new Vector3(0, 0.74, -0.45);
const BED = new Matrix4().makeTranslation(CENTRE.x, CENTRE.y, CENTRE.z); // flat, its centre 0.45 m ahead
const seed = (id: string, hue = 0.4) => ({ id, hue });
const SIZE = Math.fround(SEED_DIAMETER_M); // as the instance matrix holds it

afterEach(() => settings.set(DEFAULT_SETTINGS));

function make() {
  const parent = new Group();
  const guard = new FlashGuard();
  return { seeds: new SeedRenderer(parent, guard), guard, parent };
}

/** Place `k` of the orb's ring, in world space over the bed above (place 0 nearest the user). */
function orbPlace(k: number): Vector3 {
  const angle = Math.PI / 2 + (k * 2 * Math.PI) / SEED_SUPPLY_MAX;
  return new Vector3(
    SUPPLY_ORB_RADIUS_M * Math.cos(angle),
    SUPPLY_ORB_LIFT_M,
    SUPPLY_ORB_RADIUS_M * Math.sin(angle),
  ).add(CENTRE);
}

/** Where that seed is drawn, or null. */
function at(seeds: SeedRenderer, id: string): Vector3 | null {
  const out = new Vector3();
  return seeds.positionOf(id, out) ? out : null;
}

/** How many instances have a size, and the size each has. */
function sizes(seeds: SeedRenderer): number[] {
  const m = seeds.mesh.instanceMatrix.array;
  const out: number[] = [];
  for (let i = 0; i < SEED_SUPPLY_MAX; i++) if (m[i * 16] !== 0) out.push(m[i * 16]!);
  return seeds.mesh.visible ? out : [];
}

/** The brightness instance `slot` is drawn at, read back from its colour against its hue's full colour. */
function brightnessOf(seeds: SeedRenderer, slot: number, hue = 0.4): number {
  const full = new Color().setHSL(hue, PLANT_SATURATION, PLANT_LIGHTNESS, SRGBColorSpace);
  return seeds.mesh.instanceColor!.getX(slot) / full.r;
}

const expectNear = (actual: Vector3 | null, expected: Vector3, digits = 6): void => {
  expect(actual).not.toBeNull();
  expect(actual!.x).toBeCloseTo(expected.x, digits);
  expect(actual!.y).toBeCloseTo(expected.y, digits);
  expect(actual!.z).toBeCloseTo(expected.z, digits);
};

describe('SeedRenderer: the supply orb (UX §7, FR-MUS-08)', () => {
  it('is one mesh in the parent, drawn only once it has seeds and a bed', () => {
    const { seeds, parent } = make();
    expect(parent.children).toEqual([seeds.mesh]);
    seeds.update(BED, T0);
    expect(seeds.mesh.visible).toBe(false); // no seed: no draw call
    seeds.setSupply([seed('a')]);
    seeds.update(null, T0 + FRAME_MS);
    expect(seeds.mesh.visible).toBe(false); // no bed: the orb is not drawn
    expect(at(seeds, 'a')).toBeNull();
    seeds.update(BED, T0 + 2 * FRAME_MS);
    expect(sizes(seeds)).toEqual([SIZE]);
  });

  it('shows the count: one seed per place on a ring over the centre hole, each in its hue at rest', () => {
    const { seeds } = make();
    seeds.setSupply([seed('a', 0.1), seed('b', 0.4), seed('c', 0.7)]);
    seeds.update(BED, T0);
    expect(sizes(seeds)).toEqual([SIZE, SIZE, SIZE]);
    expectNear(at(seeds, 'a'), orbPlace(0));
    expectNear(at(seeds, 'b'), orbPlace(1));
    expectNear(at(seeds, 'c'), orbPlace(2));
    expect(at(seeds, 'a')!.z).toBeCloseTo(CENTRE.z + SUPPLY_ORB_RADIUS_M, 6); // place 0 nearest the user (D-029)
    expect(brightnessOf(seeds, 0, 0.1)).toBeCloseTo(PLANT_REST_BRIGHTNESS, 5);
    expect(brightnessOf(seeds, 2, 0.7)).toBeCloseTo(PLANT_REST_BRIGHTNESS, 5);
  });

  it('a seed gone from the supply goes at once; the others keep their places; a new one takes a free place', () => {
    const { seeds } = make();
    seeds.setSupply([seed('a'), seed('b'), seed('c')]);
    seeds.update(BED, T0);
    seeds.setSupply([seed('b'), seed('c'), seed('d')]); // a was planted, d arrived
    expect(seeds.has('a')).toBe(false);
    seeds.update(BED, T0 + FRAME_MS);
    expect(at(seeds, 'a')).toBeNull();
    expectNear(at(seeds, 'b'), orbPlace(1));
    expectNear(at(seeds, 'd'), orbPlace(0));
    expect(sizes(seeds)).toHaveLength(3);
    seeds.setSupply([]);
    seeds.update(BED, T0 + 2 * FRAME_MS);
    expect(seeds.mesh.visible).toBe(false);
  });

  it('draws at most the five a supply holds, and follows the bed when it moves', () => {
    const { seeds } = make();
    seeds.setSupply(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => seed(id)));
    seeds.update(BED, T0);
    expect(sizes(seeds)).toHaveLength(SEED_SUPPLY_MAX);
    expect(seeds.has('f')).toBe(false);
    const raised = new Matrix4().makeTranslation(CENTRE.x, CENTRE.y + 0.05, CENTRE.z);
    seeds.update(raised, T0 + FRAME_MS);
    expectNear(at(seeds, 'a'), orbPlace(0).add(new Vector3(0, 0.05, 0)));
  });
});

describe('SeedRenderer: to a hand and back (UX §3.3, §7, §9.1)', () => {
  /** One seed in the orb, drawn; then sent to `palm` at T0. */
  function out(palm: Vector3) {
    const made = make();
    made.seeds.setSupply([seed('a')]);
    made.seeds.update(BED, T0 - FRAME_MS);
    expect(made.seeds.follow('a', palm, T0, 'glide')).toBe(true);
    return made;
  }

  it('glides to the palm over SEED_GLIDE_MS, ease-out, then rides it with no smoothing; lit full as it leaves', () => {
    const palm = new Vector3(-0.2, 0.95, -0.3);
    const { seeds } = out(palm);
    const start = orbPlace(0);
    seeds.update(BED, T0);
    expectNear(at(seeds, 'a'), start);
    expect(brightnessOf(seeds, 0)).toBeCloseTo(SEED_OUT_BRIGHTNESS, 5); // one step, through the guard
    seeds.update(BED, T0 + SEED_GLIDE_MS / 2);
    const eased = 1 - 0.5 ** 3; // ease-out: 7/8 of the way at half time
    expectNear(at(seeds, 'a'), start.clone().lerp(palm, eased), 5);
    seeds.update(BED, T0 + SEED_GLIDE_MS);
    expectNear(at(seeds, 'a'), palm, 5);
    palm.set(0.1, 1.0, -0.2); // the hand moves: the seed is there in the same frame
    seeds.update(null, T0 + SEED_GLIDE_MS + FRAME_MS); // and with no bed too: it is on the hand, not in the orb
    expectNear(at(seeds, 'a'), palm, 5);
  });

  it('hops to the pinch point that took it over SEED_HOP_MS', () => {
    const palm = new Vector3(-0.2, 0.95, -0.3);
    const pinch = new Vector3(-0.15, 0.97, -0.3);
    const { seeds } = out(palm);
    seeds.update(BED, T0 + SEED_GLIDE_MS);
    seeds.follow('a', pinch, T0 + SEED_GLIDE_MS, 'hop');
    seeds.update(BED, T0 + SEED_GLIDE_MS + SEED_HOP_MS / 2);
    expect(at(seeds, 'a')!.distanceTo(pinch)).toBeGreaterThan(0.001);
    seeds.update(BED, T0 + SEED_GLIDE_MS + SEED_HOP_MS);
    expectNear(at(seeds, 'a'), pinch, 5);
  });

  it('sent back off the bed it glides home with a hop up (SEED_BUMP_M at half way), back at rest', () => {
    const hand = new Vector3(0.4, 0.8, -0.45);
    const { seeds } = out(hand);
    seeds.update(BED, T0 + SEED_GLIDE_MS);
    const back = T0 + 1000;
    seeds.follow('a', null, back, 'bump');
    seeds.update(BED, back + SEED_GLIDE_MS / 2);
    expect(brightnessOf(seeds, 0)).toBeCloseTo(PLANT_REST_BRIGHTNESS, 5);
    const straight = hand.clone().lerp(orbPlace(0), 1 - 0.5 ** 3);
    expectNear(at(seeds, 'a'), straight.add(new Vector3(0, SEED_BUMP_M, 0)), 5);
    seeds.update(BED, back + SEED_GLIDE_MS);
    expectNear(at(seeds, 'a'), orbPlace(0), 5);
  });

  it('with reduced motion the hop is half as high (UX §5)', () => {
    settings.set({ ...DEFAULT_SETTINGS, reducedMotion: true });
    const hand = new Vector3(0.4, 0.8, -0.45);
    const { seeds } = out(hand);
    seeds.update(BED, T0 + SEED_GLIDE_MS);
    seeds.follow('a', null, T0 + 1000, 'bump');
    seeds.update(BED, T0 + 1000 + SEED_GLIDE_MS / 2);
    const straight = hand.clone().lerp(orbPlace(0), 1 - 0.5 ** 3);
    expectNear(at(seeds, 'a'), straight.add(new Vector3(0, SEED_BUMP_REDUCED_M, 0)), 5);
  });

  it('a jump is home at once (a lost hand, a session that ended)', () => {
    const { seeds } = out(new Vector3(0.4, 0.8, -0.45));
    seeds.update(BED, T0 + SEED_GLIDE_MS);
    seeds.follow('a', null, T0 + 1000, 'jump');
    seeds.update(BED, T0 + 1000);
    expectNear(at(seeds, 'a'), orbPlace(0), 5);
  });

  it('a seed not drawn yet is on the hand at once; a seed it does not hold is refused', () => {
    const { seeds } = make();
    seeds.setSupply([seed('a')]);
    const palm = new Vector3(-0.2, 0.95, -0.3);
    seeds.follow('a', palm, T0, 'glide'); // garden:seedOut in the frame the seed arrived
    seeds.update(BED, T0);
    expectNear(at(seeds, 'a'), palm, 5);
    expect(seeds.follow('nope', palm, T0, 'glide')).toBe(false);
    expect(seeds.positionOf('nope', new Vector3())).toBe(false);
  });

  it('a time that is not finite moves nothing', () => {
    const palm = new Vector3(-0.2, 0.95, -0.3);
    const { seeds } = out(palm);
    seeds.update(BED, Number.NaN);
    expectNear(at(seeds, 'a'), orbPlace(0));
  });

  it('a new seed in the place a planted (lit) seed left starts at rest: its step up is counted (FR-UI-11)', () => {
    const palm = new Vector3(-0.2, 0.95, -0.3);
    const { seeds, guard } = out(palm); // 'a' is out and lit full
    seeds.update(BED, T0);
    expect(brightnessOf(seeds, 0)).toBeCloseTo(SEED_OUT_BRIGHTNESS, 5);
    seeds.setSupply([]); // planted: its place is free, its element still at full
    seeds.setSupply([seed('b')]); // a new seed takes that place
    seeds.update(BED, T0 + 2000);
    expect(brightnessOf(seeds, 0)).toBeCloseTo(PLANT_REST_BRIGHTNESS, 5);
    guard.takePeak(); // forget a's change
    seeds.follow('b', palm, T0 + 2000, 'glide');
    seeds.update(BED, T0 + 2000 + FRAME_MS);
    expect(brightnessOf(seeds, 0)).toBeCloseTo(SEED_OUT_BRIGHTNESS, 5);
    expect(guard.takePeak()).toBe(1); // the guard saw the step, so it can cap it
  });

  it('keeps the flash cap: out and back four times a second changes it at most three times (FR-UI-11)', () => {
    const palm = new Vector3(-0.2, 0.95, -0.3);
    const { seeds, guard } = out(palm);
    const series: Drawn[] = [];
    for (let t = T0; t < T0 + 3000; t += FRAME_MS) {
      const round = Math.floor((t - T0) / 125); // a new move every 125 ms: out, back, out, back ...
      if ((t - T0) % 125 < FRAME_MS && t > T0) seeds.follow('a', round % 2 === 0 ? palm : null, t, 'jump');
      seeds.update(BED, t);
      series.push({ t, value: brightnessOf(seeds, 0) });
    }
    expect(mostInAnyClip(series)).toBeLessThanOrEqual(3);
    expect(guard.takePeak()).toBeLessThanOrEqual(3);
    expect(Math.max(...series.map((d) => d.value))).toBeCloseTo(SEED_OUT_BRIGHTNESS, 5); // it did light up
  });
});
