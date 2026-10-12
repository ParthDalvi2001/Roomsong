// PerfSystem (LLD §3.2, priority -100; NFR-PERF-03/04/05) on a fake world: the frame is timed from its update to
// the scene's onAfterRender, and a throw inside the render callback never reaches the frame loop.
import { Group } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bus, flags } from '../../../src/core/index.js';
import { PERF_HUD_HEAD_OFFSET_M } from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import * as perfHud from '../../../src/render/PerfHud.js';
import { PerfSystem } from '../../../src/render/RenderSystems.js';

import type { EventMap } from '../../../src/core/index.js';

const FRAME_S = 0.01; // a second is exactly 100 frames
const SCRIPT_MS = 2.5; // what each frame's script takes, on the page's clock

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  vi.restoreAllMocks();
});

/** The system as IWSDK would make it, on as much of a world as it reads. `guard` may be a broken one. */
function rig(guard: unknown = new FlashGuard()) {
  const world = {
    renderer: { info: { render: { calls: 9, triangles: 1234 } } },
    scene: { onAfterRender: (): void => {} },
    player: { head: new Group() },
  };
  const engine = { stats: { voices: 5, cpuEstimate: 0 } };
  const system = new PerfSystem(world as never, {} as never, -100);
  system.config.guard.value = guard;
  system.config.engine.value = engine;
  system.init();
  const samples: EventMap['perf:sample'][] = [];
  stop = bus.on('perf:sample', (sample) => samples.push({ ...sample }));
  // The page's clock: each frame's script starts on a whole millisecond and the render ends SCRIPT_MS later.
  let pageMs = 50_000;
  vi.spyOn(performance, 'now').mockImplementation(() => pageMs);
  /** One frame: the system's update (first of the frame), the script, then the render's callback. */
  const frame = (index: number): void => {
    pageMs = 50_000 + index * 10;
    system.update(FRAME_S, index * FRAME_S);
    pageMs += SCRIPT_MS;
    world.scene.onAfterRender();
  };
  return { world, engine, system, samples, frame };
}

describe('PerfSystem', () => {
  it('emits perf:sample once a second: fps on the frame time, the script time on the page clock, the voices', () => {
    const { samples, frame, engine } = rig();
    for (let i = 0; i <= 100; i++) frame(i);
    expect(samples).toHaveLength(1);
    expect(samples[0]).toMatchObject({ draws: 9, tris: 1234, voices: 5, maxFlashPerS: 0 });
    expect(samples[0]?.fps).toBeCloseTo(100, 6);
    expect(samples[0]?.jsMs).toBeCloseTo(SCRIPT_MS, 6);
    engine.stats.voices = 11;
    for (let i = 101; i <= 200; i++) frame(i);
    expect(samples).toHaveLength(2);
    expect(samples[1]?.voices).toBe(11);
  });

  it('a throw inside the render callback is caught, logged once, and sampling stops: the frames go on', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = { takePeak: () => (undefined as unknown as { peak: number }).peak };
    const { samples, frame } = rig(broken);
    expect(() => {
      for (let i = 0; i <= 300; i++) frame(i);
    }).not.toThrow();
    expect(samples).toEqual([]);
    expect(errors).toHaveBeenCalledTimes(1);
    expect(errors.mock.calls[0]?.[0]).toBe('[render] the perf sample threw: sampling has stopped');
  });

  it('destroy() takes its callback off the scene', () => {
    const { world, system, samples, frame } = rig();
    system.destroy();
    for (let i = 0; i <= 200; i++) frame(i);
    expect(samples).toEqual([]);
    expect(world.player.head.children).toEqual([]); // no read-out without the perfHud flag
  });

  it('with the perfHud flag the read-out rides the head at PERF_HUD_HEAD_OFFSET_M, until destroy()', () => {
    // core's `flags` is frozen and off here, so the system's one call is answered as if the flag were on. The
    // unit tests have no page: the canvas is a stand-in, as in PerfHud.test.ts.
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }) });
    const create = perfHud.createPerfHud;
    const asked = vi
      .spyOn(perfHud, 'createPerfHud')
      .mockImplementation((parent) => create(parent, { ...flags, perfHud: true }));
    const { world, system } = rig();
    const head = world.player.head;

    expect(asked).toHaveBeenCalledWith(head);
    expect(head.children).toHaveLength(1);
    expect(head.children[0]?.position.toArray()).toEqual([...PERF_HUD_HEAD_OFFSET_M]);
    system.destroy();
    expect(head.children).toEqual([]);
    vi.unstubAllGlobals();
  });
});
