// PerfSystem (LLD §3.2, priority -100; NFR-PERF-03/04/05) on a fake world: the frame is timed from its update to
// the scene's onAfterRender, and a throw inside the render callback never reaches the frame loop.
// BedRenderSystem (priority 50; T-128c): the bed's drawing follows BedAnchor, markers and all or the ghost alone.
import { Group, type InstancedMesh, type Mesh } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bus, flags } from '../../../src/core/index.js';
import { BedRenderer } from '../../../src/render/BedRenderer.js';
import { MARKER_ALPHA, PERF_HUD_HEAD_OFFSET_M } from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import * as perfHud from '../../../src/render/PerfHud.js';
import { BedRenderSystem, PerfSystem } from '../../../src/render/RenderSystems.js';

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

/** As much of an ECS query as BedRenderSystem uses: who is told when an entity gets or loses BedAnchor. */
class FakeQuery {
  readonly entities = new Set<object>();
  private readonly told = { qualify: new Set<() => void>(), disqualify: new Set<() => void>() };

  subscribe(event: 'qualify' | 'disqualify', callback: () => void, replay = false): () => void {
    this.told[event].add(callback);
    if (replay) this.entities.forEach(callback);
    return () => this.told[event].delete(callback);
  }
  /** RoomSystem's `addComponent(BedAnchor)`: the callbacks run inside it. */
  place(): void {
    this.entities.add(this);
    this.told.qualify.forEach((callback) => callback());
  }
  unplace(): void {
    this.entities.delete(this);
    this.told.disqualify.forEach((callback) => callback());
  }
}

/** BedRenderSystem on the bed's Object3D, as `register(world, BedRenderSystem, 50, { guard, bed })` makes it. */
function bedRig(beds = new FakeQuery()) {
  const bed = new Group();
  const guard = new FlashGuard();
  const system = new BedRenderSystem({} as never, {} as never, 50);
  system.queries = { beds } as never;
  system.config.guard.value = guard;
  system.config.bed.value = bed;
  system.init();
  stop = () => system.destroy();
  const [glass, markers] = bed.children as [Mesh, InstancedMesh];
  let timeS = 12_345.678;
  /** `count` frames at 72 Hz. */
  const frames = (count = 20): void => {
    for (let i = 0; i < count; i++) system.update(1 / 72, (timeS += 1 / 72));
  };
  const strength = (marker: number): number => markers.geometry.getAttribute('aStrength').getX(marker);
  return { bed, beds, guard, system, glass, markers, frames, strength };
}

describe('BedRenderSystem: the bed and its ghost (LLD §3.2, priority 50; UX §9.2)', () => {
  it('draws the bed on the Object3D it is given, and starts as not placed: the glass alone once its frames ran', () => {
    const { bed, glass, markers, frames, strength } = bedRig();
    expect(bed.children).toHaveLength(2); // the glass with its ring lines, and the 80 markers: 2 draw calls
    frames();
    expect(glass.visible).toBe(true);
    expect(markers.visible).toBe(false); // faded out, and no longer drawn: 1 draw call
    expect(strength(0)).toBe(0);
    // Whether the bed shows at all is RoomSystem's: this system never touches the bed's own Object3D.
    expect(bed.visible).toBe(true);
  });

  it('BedAnchor on: the markers are drawn at once and fade in. Off (Re-place, the session end): they fade out', () => {
    const { beds, glass, markers, frames, strength, guard } = bedRig();
    frames(80); // past the second in which the start-up fade-out still counts
    guard.takePeak();
    beds.place();
    expect(markers.visible).toBe(true); // in the frame of room:bedPlaced
    frames();
    expect(strength(0)).toBeCloseTo(MARKER_ALPHA);
    beds.unplace();
    expect(markers.visible).toBe(true); // a fade, not a cut
    frames();
    expect(markers.visible).toBe(false);
    expect(strength(79)).toBe(0);
    expect(glass.visible).toBe(true);
    expect(guard.takePeak()).toBe(2); // the page's guard: one change in, one out
  });

  it('a bed that was placed before the system was registered counts as placed', () => {
    const beds = new FakeQuery();
    beds.place();
    const { markers, frames, strength } = bedRig(beds);
    frames();
    expect(markers.visible).toBe(true);
    expect(strength(0)).toBeCloseTo(MARKER_ALPHA);
  });

  it('a throw in a query callback is caught and logged: it runs inside the placed step of RoomSystem', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { beds } = bedRig();
    vi.spyOn(BedRenderer.prototype, 'setGhost').mockImplementation(() => {
      throw new Error('planted');
    });
    expect(() => beds.place()).not.toThrow();
    expect(() => beds.unplace()).not.toThrow();
    expect(errors).toHaveBeenCalledTimes(2);
    expect(errors.mock.calls[0]?.[0]).toBe('[render] the bed could not be drawn as placed or as a ghost');
  });

  it('destroy() takes the bed out of the scene and stops following BedAnchor', () => {
    const { bed, beds, system, markers, frames } = bedRig();
    frames();
    system.destroy();
    expect(bed.children).toEqual([]);
    beds.place();
    expect(markers.visible).toBe(false);
  });
});
