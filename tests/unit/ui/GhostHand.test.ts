// D-087: the guide's ghost hand by forward kinematics, and its guide line's arc.
import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { ghostJoints, GuideLine, pinchPoint } from '../../../src/ui/GhostHand.js';

const joint = (joints: Float32Array, j: number) =>
  new Vector3(joints[3 * j], joints[3 * j + 1], joints[3 * j + 2]);
const THUMB_TIP = 4;
const INDEX_TIP = 9;
const MIDDLE_TIP = 14;

describe('ghostJoints', () => {
  it('a full pinch puts the thumb tip on the index tip; an open hand holds them apart', () => {
    const pinched = ghostJoints(1000, false, new Float32Array(75));
    expect(joint(pinched, THUMB_TIP).distanceTo(joint(pinched, INDEX_TIP))).toBeLessThan(0.01);
    const open = ghostJoints(0, false, new Float32Array(75));
    expect(joint(open, THUMB_TIP).distanceTo(joint(open, INDEX_TIP))).toBeGreaterThan(0.04);
  });

  it('is a hand: fingertips 7 to 20 cm from the wrist, ahead of it; the left hand mirrors the right', () => {
    const right = ghostJoints(0, false, new Float32Array(75));
    const left = ghostJoints(0, true, new Float32Array(75));
    for (const tip of [INDEX_TIP, MIDDLE_TIP, 19, 24]) {
      const at = joint(right, tip);
      expect(at.length()).toBeGreaterThan(0.07);
      expect(at.length()).toBeLessThan(0.2);
      expect(at.z).toBeLessThan(0); // fingers along -Z
      expect(joint(left, tip).x).toBeCloseTo(-at.x, 6);
    }
    expect(joint(right, THUMB_TIP).x).toBeLessThan(0); // the right thumb towards -X
  });

  it('pinchPoint is the index tip at a full pinch', () => {
    const pinched = ghostJoints(1000, true, new Float32Array(75));
    expect(pinchPoint(true, new Vector3()).distanceTo(joint(pinched, INDEX_TIP))).toBe(0);
  });
});

describe('GuideLine', () => {
  it('arcs from a to b, lift millimetres over the middle, and points its head along the arc at b', () => {
    const line = new GuideLine(new Group());
    const a = new Vector3(0, 1, -0.3);
    const b = new Vector3(0.1, 0.8, -0.4);
    line.set(a, b, 60);
    expect(line.at(0, new Vector3()).distanceTo(a)).toBeLessThan(1e-9);
    expect(line.at(1000, new Vector3()).distanceTo(b)).toBeLessThan(1e-9);
    expect(line.at(500, new Vector3()).y).toBeCloseTo(0.9 + 0.03, 9); // half the lift at the middle of a quadratic arc
    line.draw(0);
    expect(line.head.position.distanceTo(b)).toBe(0);
    line.dispose();
  });
});
