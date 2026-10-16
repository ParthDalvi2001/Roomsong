// The Listen orb (T-148; UX §2, FR-HND-16): where it sits, its three levels (rest, hovered, Listen) moved over
// HOVER_CUE_MS, and the flash cap on a hover that flickers (FR-UI-11).
import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import { TARGET_VISIBLE_DIAMETER_M } from '../../../src/hands/index.js';
import {
  FLASH_CAP_PER_S,
  HOVER_CUE_MS,
  LISTEN_ORB_LIFT_M,
  PLANT_HOVER_LIFT,
  PLANT_REST_BRIGHTNESS,
} from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { OrbRenderer } from '../../../src/render/OrbRenderer.js';

import { mostInAnyClip, type Drawn } from './changes.js';

const FRAME_MS = 1000 / 72;

function make() {
  const parent = new Group();
  const orb = new OrbRenderer(parent, new FlashGuard());
  const brightness = () => (orb.mesh.material.uniforms.uOrb!.value as Float32Array)[0]!;
  let t = 5_000;
  const run = (ms: number): Drawn[] => {
    const drawn: Drawn[] = [];
    for (const end = t + ms; t < end; t += FRAME_MS) {
      orb.update(Math.round(t));
      drawn.push({ t, value: brightness() });
    }
    return drawn;
  };
  return { parent, orb, brightness, run };
}

describe('OrbRenderer: the Listen orb (T-148)', () => {
  it('a pearl as wide as a target in the centre hole, LISTEN_ORB_LIFT_M over the glass, hidden until a bed is placed', () => {
    const { parent, orb } = make();
    expect(parent.children).toEqual([orb.mesh]);
    expect(orb.mesh.position.toArray()).toEqual([0, LISTEN_ORB_LIFT_M, 0]);
    orb.mesh.geometry.computeBoundingSphere();
    expect(orb.mesh.geometry.boundingSphere!.radius).toBeCloseTo(TARGET_VISIBLE_DIAMETER_M / 2, 6);
    expect(orb.mesh.visible).toBe(false);
  });

  it("rests at a plant's rest brightness; a hover lifts it over 100 ms; Listen lights it full; back to rest after", () => {
    const { orb, brightness, run } = make();
    run(100);
    expect(brightness()).toBeCloseTo(PLANT_REST_BRIGHTNESS, 6);
    orb.setHovered(true);
    run(HOVER_CUE_MS / 2);
    expect(brightness()).toBeGreaterThan(PLANT_REST_BRIGHTNESS);
    expect(brightness()).toBeLessThan(PLANT_REST_BRIGHTNESS + PLANT_HOVER_LIFT);
    run(HOVER_CUE_MS);
    expect(brightness()).toBeCloseTo(PLANT_REST_BRIGHTNESS + PLANT_HOVER_LIFT, 6);
    orb.setListening(true);
    run(500);
    expect(brightness()).toBe(1);
    orb.setListening(false);
    orb.setHovered(false);
    run(500);
    expect(brightness()).toBeCloseTo(PLANT_REST_BRIGHTNESS, 6);
  });

  it('a hover that flickers ten times a second still changes the orb at most 3 times a second', () => {
    const { orb, run } = make();
    const drawn: Drawn[] = [];
    for (let i = 0; i < 30; i++) {
      orb.setHovered(i % 2 === 0);
      drawn.push(...run(100));
    }
    expect(mostInAnyClip(drawn)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
  });

  it('dispose() takes it away', () => {
    const { parent, orb } = make();
    orb.dispose();
    expect(parent.children).toEqual([]);
  });
});
