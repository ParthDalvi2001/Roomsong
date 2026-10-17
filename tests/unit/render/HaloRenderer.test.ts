// Listen mode's light (T-148; FR-ROOM-04, UX §3.5, TC-E2E-05's halo at unit level): the dim dome and the aurora
// halo. The fades of UX §3.5, the dome as a material drawn before the garden (no pass over the frame), and the
// flash cap (FR-UI-11) counted on what was drawn, by the rule of LLD §5.9 written again in changes.ts.
import { BackSide, CustomBlending, Group, InstancedMesh, OneFactor, OneMinusSrcAlphaFactor } from 'three';
import { describe, expect, it } from 'vitest';

import { BED_OUTER } from '../../../src/garden/index.js';
import {
  BED_RIM_M,
  CONTRAST_DIM,
  DOME_DIM,
  DOME_RENDER_ORDER,
  FLASH_CAP_PER_S,
  HALO_DRIFT_MS,
  HALO_LOW,
  LISTEN_ENTER_MS,
  LISTEN_EXIT_MS,
} from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { HaloRenderer } from '../../../src/render/HaloRenderer.js';

import { mostInAnyClip, type Drawn } from './changes.js';

const FRAME_MS = 1000 / 72;

function make() {
  const parent = new Group();
  const guard = new FlashGuard();
  const halo = new HaloRenderer(parent, guard);
  /** The halo's guarded brightness, its rise (y scale), its drift, and what passthrough is seen at. */
  const read = () => ({
    lit: (halo.halo.material.uniforms.uHalo!.value as Float32Array)[0]!,
    rise: halo.halo.matrix.elements[5],
    drift: (halo.halo.material.uniforms.uHalo!.value as Float32Array)[2]!,
    seen: 1 - (halo.dome.material.uniforms.uDome!.value as Float32Array)[0]!,
  });
  let t = 10_000;
  /** Frames at 72 Hz for `ms`, with the bar phase of `bpm` (NaN: no tide). Returns what each frame drew. */
  const run = (ms: number, bpm = Number.NaN) => {
    const drawn: { t: number; lit: number; seen: number }[] = [];
    const barMs = (4 * 60_000) / bpm; // NaN with no tide, and so is the phase
    for (const end = t + ms; t < end; t += FRAME_MS) {
      halo.update((t / barMs) % 1, Math.round(t));
      const now = read();
      drawn.push({ t, lit: now.lit, seen: now.seen });
    }
    return drawn;
  };
  return { parent, guard, halo, read, run };
}

const series = (drawn: { t: number; lit: number; seen: number }[], key: 'lit' | 'seen'): Drawn[] =>
  drawn.map((frame) => ({ t: frame.t, value: frame[key] }));

describe('HaloRenderer: the dome and the halo (T-148, UX §3.5)', () => {
  it('two meshes on the bed: the dome first, a dark see-through sphere seen from inside; the halo after, added light', () => {
    const { parent, halo } = make();
    expect(parent.children).toEqual([halo.dome, halo.halo]); // no render target, no pass: two draws
    const dome = halo.dome.material;
    expect([dome.side, dome.transparent, dome.depthWrite, halo.dome.renderOrder]).toEqual([
      BackSide,
      true,
      false,
      DOME_RENDER_ORDER,
    ]);
    expect(DOME_RENDER_ORDER).toBeLessThan(0); // before the bed's glass (0) and all that is drawn on it
    // Light added to what is behind, with alpha 0: in passthrough it never covers the room. With an alpha of 1
    // the emulator drew the curtain as a black wall (T-148), as a headset's compositor would.
    const light = halo.halo.material;
    expect([light.blending, light.blendSrc, light.blendDst, light.transparent, light.depthWrite]).toEqual([
      CustomBlending,
      OneFactor,
      OneMinusSrcAlphaFactor,
      true,
      false,
    ]);
    expect(light.fragmentShader).toMatch(/gl_FragColor = vec4\([^;]*, 0\.0\);/);
    // A curtain round the bed's rim: open, with the radius of the glass's edge.
    halo.halo.geometry.computeBoundingBox();
    expect(halo.halo.geometry.boundingBox!.max.x).toBeCloseTo(BED_OUTER + BED_RIM_M, 6);
    expect(halo.halo.geometry.index!.count / 3).toBeLessThanOrEqual(100);
    expect(halo.dome.geometry.getAttribute('position').count / 3).toBeLessThanOrEqual(100);
    // BUG-008 review: drawn from the start, switched by its count (0: no draw call), so its program compiles when
    // the bed is first drawn and not on the first dim, which a high-contrast switch can bring mid-session.
    expect(halo.dome).toBeInstanceOf(InstancedMesh);
    expect([halo.dome.visible, halo.dome.frustumCulled, halo.dome.count]).toEqual([true, false, 0]);
  });

  it('out of Listen nothing is drawn, whatever the frames', () => {
    const { halo, run } = make();
    run(2000, 84);
    expect([halo.halo.visible, halo.dome.count]).toEqual([false, 0]);
  });

  it('in: passthrough dims to 40 % and the halo rises over 1.2 s; out: both are gone 0.8 s later', () => {
    const { halo, read, run } = make();
    run(100);
    halo.setListening(true);
    run(LISTEN_ENTER_MS / 2);
    const half = read();
    expect(half.rise).toBeGreaterThan(0.4);
    expect(half.rise).toBeLessThan(0.6);
    run(LISTEN_ENTER_MS / 2 + 2 * FRAME_MS);
    expect(read()).toMatchObject({ rise: 1, lit: 1 }); // no tide: the halo holds full
    expect(read().seen).toBeCloseTo(0.4, 6); // the cover is a 32-bit float
    expect(DOME_DIM).toBe(0.6);
    expect([halo.halo.visible, halo.dome.count]).toEqual([true, 1]);
    halo.setListening(false);
    run(LISTEN_EXIT_MS - 4 * FRAME_MS);
    expect(read().seen).toBeLessThan(1);
    run(6 * FRAME_MS);
    expect(read()).toMatchObject({ lit: 0, seen: 1 });
    expect([halo.halo.visible, halo.dome.count]).toEqual([false, 0]);
  });

  it('breathes with the beat on every second beat: two breaths a bar, between full and HALO_LOW', () => {
    const { halo, run } = make();
    halo.setListening(true);
    run(2000, 84);
    const barMs = (4 * 60_000) / 84;
    const lit = run(barMs, 84).map((frame) => frame.lit);
    const peaks = lit.filter((v, i) => i > 0 && i < lit.length - 1 && v >= lit[i - 1]! && v > lit[i + 1]!);
    expect(peaks).toHaveLength(2);
    expect(Math.max(...lit)).toBeCloseTo(1, 3);
    expect(Math.min(...lit)).toBeCloseTo(HALO_LOW, 3);
  });

  for (const bpm of [60, 84, 90, 120]) {
    it(`flash cap at ${bpm} BPM: no more than 3 changes in any second, and the guard never had to hold the halo`, () => {
      const { halo, guard, run } = make();
      halo.setListening(true);
      const drawn = run(8000, bpm);
      expect(mostInAnyClip(series(drawn, 'lit'))).toBeLessThanOrEqual(FLASH_CAP_PER_S);
      expect(mostInAnyClip(series(drawn, 'seen'))).toBeLessThanOrEqual(FLASH_CAP_PER_S);
      expect(guard.takePeak()).toBeLessThanOrEqual(FLASH_CAP_PER_S);
      // Held = the same brightness two frames running while the breath moves: a breath the guard cut short.
      const steady = drawn.slice(Math.ceil(LISTEN_ENTER_MS / FRAME_MS) + 2);
      const held = steady.filter((frame, i) => i > 0 && frame.lit === steady[i - 1]!.lit).length;
      expect(held).toBe(0);
    });
  }

  it('Listen toggled on for 360 ms and off for 240 ms, for 6 s: the dome and the halo still change at most 3 times a second', () => {
    // Each half is a swing of the dome of more than FLASH_MIN_DELTA (0.13 in, back to none out): 3.3 a second,
    // and 4 inside some seconds, unless the guard holds them back.
    const { halo, run } = make();
    const drawn: { t: number; lit: number; seen: number }[] = [];
    for (let i = 0; i < 20; i++) {
      halo.setListening(i % 2 === 0);
      drawn.push(...run(i % 2 === 0 ? 360 : 240, 84));
    }
    expect(mostInAnyClip(series(drawn, 'seen'))).toBeLessThanOrEqual(FLASH_CAP_PER_S);
    expect(mostInAnyClip(series(drawn, 'lit'))).toBeLessThanOrEqual(FLASH_CAP_PER_S);
  });

  it('reduced motion: no rise and no drift; the fades and the breath stay', () => {
    const { halo, read, run } = make();
    halo.setReducedMotion(true);
    halo.setListening(true);
    run(5 * FRAME_MS);
    expect(read().rise).toBe(1);
    expect(read().lit).toBeGreaterThan(0);
    expect(read().lit).toBeLessThan(0.1);
    run(3000, 84);
    expect(read().drift).toBe(0);
  });

  it('the folds drift once round in HALO_DRIFT_MS, as a share 0..1 the shader turns into whole cycles', () => {
    const { halo, read, run } = make();
    halo.setListening(true);
    const drifts: number[] = [];
    for (let i = 0; i < 70; i++) {
      run(1000);
      drifts.push(read().drift);
    }
    expect(Math.max(...drifts)).toBeLessThan(1);
    expect(Math.min(...drifts)).toBeGreaterThanOrEqual(0);
    expect(HALO_DRIFT_MS).toBe(60_000);
  });

  it('dispose() takes both meshes away', () => {
    const { parent, halo } = make();
    halo.dispose();
    expect(parent.children).toEqual([]);
  });
});

describe('HaloRenderer: the high-contrast dim (FR-UI-05, BUG-008)', () => {
  it('dims passthrough to 60 % only in high contrast, with the same dome; in Listen the deeper dim, never both', () => {
    const { halo, read, run } = make();
    run(500);
    expect(halo.dome.count).toBe(0);
    halo.setHighContrast(true);
    run(100);
    expect([halo.dome.count, halo.halo.visible]).toEqual([1, false]); // the dim alone
    expect(read().seen).toBeCloseTo(1 - CONTRAST_DIM, 5);
    halo.setListening(true);
    run(LISTEN_ENTER_MS + 100);
    expect(read().seen).toBeCloseTo(1 - DOME_DIM, 5); // 40 %, as in Listen alone: not 0.6 * 0.4
    halo.setListening(false);
    run(LISTEN_EXIT_MS + 100);
    expect(read().seen).toBeCloseTo(1 - CONTRAST_DIM, 5);
    halo.setHighContrast(false);
    run(1100); // the guard may hold that step a moment
    expect(halo.dome.count).toBe(0);
  });

  it('the bed hidden while it is placed again takes the dim with it through the guard: at most 3 changes a second', () => {
    const { parent, halo, run } = make();
    // What the eye gets: nothing of the dome while the bed (its parent) is hidden.
    const drawn: Drawn[] = [];
    const watch = (ms: number): void => {
      for (const frame of run(ms)) drawn.push({ t: frame.t, value: parent.visible ? frame.seen : 1 });
    };
    watch(500);
    halo.setHighContrast(true);
    watch(100); // the dim comes: 1
    parent.visible = false; // Re-place: RoomSystem hides the bed
    watch(200); // the dim goes with it: 2
    parent.visible = true; // placed again at once
    watch(100); // the dim comes back: 3
    expect(drawn[drawn.length - 1]!.value).toBeCloseTo(1 - CONTRAST_DIM, 5);
    halo.setHighContrast(false); // and is switched off: held until a second after the first
    watch(2000);
    expect(drawn[drawn.length - 1]!.value).toBe(1);
    expect(mostInAnyClip(drawn)).toBeLessThanOrEqual(FLASH_CAP_PER_S);
  });

  it('through the guard: high contrast switched 4 times a second changes passthrough at most 3 times (FR-UI-11)', () => {
    const { halo, run } = make();
    const drawn: { t: number; lit: number; seen: number }[] = [];
    for (let i = 0; i < 12; i++) {
      halo.setHighContrast(i % 2 === 0);
      drawn.push(...run(250));
    }
    expect(Math.min(...drawn.map((frame) => frame.seen))).toBeCloseTo(1 - CONTRAST_DIM, 5); // it did dim
    expect(mostInAnyClip(series(drawn, 'seen'))).toBeLessThanOrEqual(FLASH_CAP_PER_S);
  });
});
