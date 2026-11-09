// BUG-041 hunt (Quest 3S, 7 Nov): on a page open for hours the tide and the glow it lights were gone; a reload
// brought them back. The systems that draw the beat as the app wires them (one FlashGuard; the bar phase from the
// real Scheduler on a stand-in audio clock), on a frame clock hours into the page, through exits and re-entries
// with the headset off in between. Each must still sweep and pulse; the 32-bit uniforms that run on the frame
// clock must still move.
import { Group, type Mesh, type ShaderMaterial } from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { BeatRingSystem } from '../../../src/access/index.js';
import { Scheduler } from '../../../src/audio/Scheduler.js';
import { bus, DEFAULT_SETTINGS, DEFAULT_TEMPO_BPM, settings } from '../../../src/core/index.js';
import { BedRenderSystem, FlashGuard, HaloSystem } from '../../../src/render/index.js';
import { garden, plant } from '../garden/fixtures.js';

import { FakeEntity, FakeQuery } from './seedRig.js';

const FRAME_S = 1 / 72;
const BAR_S = (4 * 60) / DEFAULT_TEMPO_BPM;
const HOUR_S = 3600;

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  settings.set({ ...DEFAULT_SETTINGS });
});

function rig(uptimeS: number) {
  const world = { scene: new Group(), createEntity: () => new FakeEntity() };
  const bed = new Group();
  bed.position.set(0, 0.74, -0.45);
  bed.updateMatrixWorld(true);
  const beds = new FakeQuery();
  const bedEntity = new FakeEntity();
  // The context came with the first Enter and ran in every session since: hours on its clock too.
  const audio = { nowS: uptimeS - HOUR_S / 2 };
  const scheduler = new Scheduler({ now: () => audio.nowS }, () => undefined, DEFAULT_TEMPO_BPM);
  scheduler.start(0.08);
  const engine = { clock: { now: () => audio.nowS, barPhase: () => scheduler.barPhase() } };
  const guard = new FlashGuard();
  const make = <S extends { init(): void; destroy(): void }>(system: S): S => {
    Object.assign(system, { queries: { beds } });
    const config = (system as unknown as { config: Record<string, { value: unknown }> }).config;
    config.guard!.value = guard;
    config.engine!.value = engine;
    config.bed!.value = bed;
    system.init();
    return system;
  };
  const ring = make(new BeatRingSystem(world as never, {} as never, 26));
  const render = make(new BedRenderSystem(world as never, {} as never, 50));
  const halo = make(new HaloSystem(world as never, {} as never, 52));
  stop = () => [ring, render, halo].forEach((s) => s.destroy());
  bus.emit('garden:changed', {
    state: garden([plant('a', 2, 4)]),
    diff: { added: ['a'], removed: [], changed: [] },
  });
  const find = (uniform: string): Mesh<never, ShaderMaterial> =>
    bed.children.find((c) => (c as Mesh<never, ShaderMaterial>).material?.uniforms?.[uniform]) as never;
  const tide = find('uShown');
  const curtain = find('uHalo');
  const sway = find('uSway').material.uniforms.uSway!.value as Float32Array;
  let timeS = uptimeS;
  /** One frame on every system, in priority order; the audio clock runs only in a session. */
  const frame = (isInSession: boolean, seconds = FRAME_S): void => {
    timeS += seconds;
    if (isInSession) audio.nowS += seconds;
    for (const system of [ring, render, halo]) system.update(seconds, timeS);
  };
  const enter = (): void => {
    bus.emit('xr:sessionStart', { visible: true });
    beds.add(bedEntity);
    bus.emit('room:signature', { signature: { paletteSeed: 1234 } as never, starterSeeds: false });
  };
  const exit = (): void => {
    bus.emit('xr:sessionEnd', { visible: false });
    beds.remove(bedEntity);
  };
  return { ring, tide, curtain, sway, frame, enter, exit };
}

/** The tide's turn from its matrix (TideRenderer writes cos and sin straight in). */
const angleOf = (tide: Mesh): number => Math.atan2(tide.matrix.elements[2], tide.matrix.elements[0]);

describe('BUG-041: the beat on a page open for hours, through exits and re-entries', () => {
  it.each([4, 8, 24])('at %i h: each session sweeps the tide and pulses the ticks and the halo', (hours) => {
    const r = rig(hours * HOUR_S);
    for (let session = 0; session < 5; session++) {
      r.enter();
      if (session % 2 === 1) bus.emit('listen:enter', {});
      for (let t = 0; t < BAR_S; t += FRAME_S) r.frame(true); // the tide fades in, the halo rises
      let turned = 0;
      let last = angleOf(r.tide);
      let isAlwaysShown = true;
      const low = new Float64Array(16).fill(1);
      const high = new Float64Array(16);
      let haloLow = 1;
      let haloHigh = 0;
      for (let t = 0; t < BAR_S; t += FRAME_S) {
        r.frame(true);
        isAlwaysShown &&= r.tide.visible && (r.tide.material.uniforms.uShown!.value as number) === 1;
        const angle = angleOf(r.tide);
        turned += ((((angle - last + 3 * Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
        last = angle;
        for (let step = 0; step < 16; step++) {
          low[step] = Math.min(low[step]!, r.ring.brightness[step]!);
          high[step] = Math.max(high[step]!, r.ring.brightness[step]!);
        }
        const lit = (r.curtain.material.uniforms.uHalo!.value as Float32Array)[0]!;
        haloLow = Math.min(haloLow, lit);
        haloHigh = Math.max(haloHigh, lit);
      }
      expect(isAlwaysShown).toBe(true);
      expect(Math.abs(turned)).toBeGreaterThan(1.9 * Math.PI); // one turn a bar
      for (let step = 0; step < 16; step++) expect(high[step]! - low[step]!).toBeGreaterThan(0.15);
      if (session % 2 === 1) {
        expect(haloLow).toBeLessThan(0.8); // Listen's breath: 0.75 to 1
        expect(haloHigh).toBeGreaterThan(0.95);
        bus.emit('listen:exit', { timedOut: false });
      }
      r.exit();
      for (let t = 0; t < 3; t += FRAME_S) r.frame(false); // the landing page, the context suspended
      r.frame(false, 20 * 60); // the headset off for 20 minutes: no frame at all
    }
  });

  it.each([4, 8, 24])(
    'at %i h: the sway and the halo drift, 32-bit uniforms, still move each frame',
    (hours) => {
      const r = rig(hours * HOUR_S);
      r.enter();
      bus.emit('listen:enter', {});
      for (let t = 0; t < 2; t += FRAME_S) r.frame(true);
      const drift = r.curtain.material.uniforms.uHalo!.value as Float32Array;
      const before = [r.sway[0]!, drift[2]!];
      r.frame(true);
      expect(r.sway[0]).not.toBe(before[0]);
      expect(drift[2]).not.toBe(before[1]);
      expect(Math.abs(r.sway[0]! - before[0]!)).toBeLessThan(0.1); // one frame's step, not a jump
      // Within one cycle: a GPU's sin() of hours of radians, or a 32-bit float of hours of ms, would lose the motion.
      expect(r.sway[0]).toBeLessThan(2 * Math.PI);
      expect(drift[2]).toBeLessThan(1);
      bus.emit('listen:exit', { timedOut: false });
    },
  );
});
