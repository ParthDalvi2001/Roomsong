// NFR-PERF-08 for the FoV guard (FR-UI-03): clampToFov creates nothing per call when every caller of the app calls
// it in the same frames, as they do since T-128d (the garden tunes the room, so CaptionSystem draws the ripple's
// captions while the panel is open). The callers, by their argument shapes: CaptionSystem (a THREE.Vector3 in and
// out, the head's matrix), PanelSystem (the board's Vector3 and a scratch Vector3; the orb's home into a Vector3,
// then copied into its control centres), and placePanel (a plain point, once per opening). Node, not the headset.
import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { clampToFov } from '../../../src/ui/FovGuard.js';
import { ORB_ELEMENT, PANEL_ELEMENT, placePanel } from '../../../src/ui/Panel.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

const FRAMES = 20_000;
const MOST_ROUNDS = 20;
const CAPTION = { distanceM: 0.6, halfWidthM: 0.2, halfHeightM: 0.05 };

describe('clampToFov per frame, every caller alternating (NFR-PERF-08)', () => {
  it('the caption, the panel board and the orb each frame, a panel opening now and then: nothing allocated', () => {
    const head = new Matrix4();
    const wanted = new Vector3();
    const captionAt = new Vector3();
    const board = new Vector3(0.1, 1.5, -0.55);
    const scratch = new Vector3();
    const orbHome = new Vector3(-0.2, 1.3, -0.4);
    const orbAt = new Vector3(); // PanelSystem clamps into a Vector3, then copies into its control centres
    const pose = new Float64Array(16);
    const WOBBLE = new Float64Array(97).map((_, i) => 0.3 * Math.sin(i * 0.37));
    let frames = 0;
    const run = (): void => {
      for (let i = 0; i < FRAMES; i++) {
        const k = ++frames;
        // The head turns a little, on fractions written in place, as the XR input system writes it.
        const e = head.elements;
        e[0] = e[10] = Math.cos(WOBBLE[k % 97]!);
        e[2] = Math.sin(WOBBLE[k % 97]!);
        e[8] = -e[2];
        e[13] = 1.6;
        wanted.set(0, 1.5, -0.6);
        clampToFov(e, wanted, CAPTION, captionAt); // CaptionSystem
        clampToFov(e, board, PANEL_ELEMENT, scratch); // PanelSystem: is the board in view
        clampToFov(e, orbHome, ORB_ELEMENT, orbAt); // PanelSystem: the orb in the view box
        if (k % 500 === 0) placePanel(e, pose); // an opening
      }
    };
    const isClean = (cost: { gcs: number; grewBytes: number }): boolean =>
      cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < PROBE_BYTES;

    run(); // warm up
    const rounds: { gcs: number; grewBytes: number }[] = [];
    for (let i = 0; i < MOST_ROUNDS; i++) {
      const cost = heapCost(run);
      rounds.push(cost);
      if (isClean(cost)) break;
    }
    console.log(
      `T-128d clampToFov, three callers a frame: heap ${JSON.stringify(rounds[rounds.length - 1])} per ` +
        `${FRAMES} frames, after ${rounds.length} rounds (Node)`,
    );
    expect(isClean(rounds[rounds.length - 1]!), JSON.stringify(rounds)).toBe(true);
    expect(Number.isFinite(captionAt.x + scratch.y + orbAt.z + pose[12]!)).toBe(true); // and it did the work
  }, 60_000);
});
