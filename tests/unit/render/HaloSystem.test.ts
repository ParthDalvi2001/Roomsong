// HaloSystem (T-148; LLD §3.2 priority 52, API_SPEC §1.10 "Listen mode"): it follows listen:* and the bed, owns
// the Listen orb's pinch target (rule 7), times the breath on the tide only when rule 11 allows, and raises
// "Goodnight" when Listen ran its 10 minutes. On a fake world: the renderers are the real ones.
import { Group } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Caption, Interactable } from '../../../src/core/components.js';
import { bus, clock, DEFAULT_SETTINGS, settings } from '../../../src/core/index.js';
import { HIT_RADIUS_M } from '../../../src/hands/index.js';
import { GOODNIGHT_CAPTION_MS, LISTEN_ORB_ID, LISTEN_ORB_LIFT_M } from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { HaloRenderer } from '../../../src/render/HaloRenderer.js';
import { HaloSystem } from '../../../src/render/HaloSystem.js';

import type { Mesh } from 'three';

/** As much of an ECS entity as HaloSystem uses. */
class FakeEntity {
  readonly data = new Map<unknown, Record<string, unknown>>();
  private readonly views = new Map<string, Float32Array>();
  addComponent(component: unknown, values: Record<string, unknown> = {}): this {
    this.data.set(component, { ...values });
    return this;
  }
  removeComponent(component: unknown): this {
    this.data.delete(component);
    return this;
  }
  hasComponent(component: unknown): boolean {
    return this.data.has(component);
  }
  getVectorView(_component: unknown, key: string): Float32Array {
    let view = this.views.get(key);
    if (view === undefined) this.views.set(key, (view = new Float32Array(3)));
    return view;
  }
  isDestroyed = false;
  destroy(): void {
    this.isDestroyed = true;
    this.data.clear();
  }
}

/** Who is told when the bed gets or loses BedAnchor (as in RenderSystems.test.ts). */
class FakeQuery {
  readonly entities = new Set<object>();
  private readonly told = { qualify: new Set<() => void>(), disqualify: new Set<() => void>() };
  subscribe(event: 'qualify' | 'disqualify', callback: () => void, replay = false): () => void {
    this.told[event].add(callback);
    if (replay) this.entities.forEach(callback);
    return () => this.told[event].delete(callback);
  }
  place(): void {
    this.entities.add(this);
    this.told.qualify.forEach((callback) => callback());
  }
  unplace(): void {
    this.entities.delete(this);
    this.told.disqualify.forEach((callback) => callback());
  }
}

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  settings.set(DEFAULT_SETTINGS);
  clock.setSource(() => Date.now());
  vi.restoreAllMocks();
});

/** HaloSystem as `register(world, HaloSystem, 52, { guard, engine, bed })` makes it. */
function rig() {
  const created: FakeEntity[] = [];
  const world = {
    createEntity: () => {
      const entity = new FakeEntity();
      created.push(entity);
      return entity;
    },
  };
  // The bed 0.45 m ahead on a 0.74 m desk, turned a quarter round its up axis: its own y is still up.
  const bed = new Group();
  bed.position.set(0, 0.74, -0.45);
  bed.rotation.y = Math.PI / 2;
  bed.updateMatrixWorld(true);
  const audio = { now: 0, phase: 0.25 };
  const engine = { clock: { now: () => audio.now, barPhase: () => audio.phase } };
  const beds = new FakeQuery();
  const system = new HaloSystem(world as never, {} as never, 52);
  system.queries = { beds } as never;
  system.config.guard.value = new FlashGuard();
  system.config.engine.value = engine;
  system.config.bed.value = bed;
  system.init();
  stop = () => system.destroy();
  const [target, caption] = created as [FakeEntity, FakeEntity];
  const [dome, halo, orb] = bed.children as [Mesh, Mesh, Mesh];
  let timeS = 1000;
  const frames = (count = 10): void => {
    for (let i = 0; i < count; i++) system.update(1 / 72, (timeS += 1 / 72));
  };
  return { system, bed, beds, audio, target, caption, dome, halo, orb, frames };
}

describe('HaloSystem (T-148, priority 52)', () => {
  it('draws the dome, the halo and the orb on the bed it is given', () => {
    const { bed, orb } = rig();
    expect(bed.children).toHaveLength(3);
    expect(orb.position.y).toBe(LISTEN_ORB_LIFT_M);
  });

  it("the orb and its target are there exactly while the bed is placed: kind 'orb', its id, the hit radius", () => {
    const { beds, target, orb, frames } = rig();
    frames();
    expect(orb.visible).toBe(false);
    expect(target.hasComponent(Interactable)).toBe(false);
    beds.place();
    expect(orb.visible).toBe(true);
    expect(target.data.get(Interactable)).toEqual({ kind: 'orb', id: LISTEN_ORB_ID, radius: HIT_RADIUS_M });
    // In the world: LISTEN_ORB_LIFT_M over the bed's centre, along the bed's own up.
    expect([...target.getVectorView(Interactable, 'worldPos')].map((v) => +v.toFixed(5))).toEqual([
      0,
      +(0.74 + LISTEN_ORB_LIFT_M).toFixed(5),
      -0.45,
    ]);
    beds.unplace();
    expect(orb.visible).toBe(false);
    expect(target.hasComponent(Interactable)).toBe(false);
  });

  it('a bed placed before the system was registered counts; the target follows the bed when it moves', () => {
    const { beds, bed, target, frames } = rig();
    beds.place();
    bed.position.x = 0.2;
    bed.updateMatrixWorld(true);
    frames(1);
    expect(target.getVectorView(Interactable, 'worldPos')[0]).toBeCloseTo(0.2, 6);
  });

  it('listen:enter shows the halo and the dome; listen:exit takes them away', () => {
    const { beds, dome, halo, frames } = rig();
    beds.place();
    bus.emit('listen:enter', {});
    frames(100);
    expect([halo.visible, dome.visible]).toEqual([true, true]);
    bus.emit('listen:exit', { timedOut: false });
    frames(100);
    expect([halo.visible, dome.visible]).toEqual([false, false]);
  });

  it('rule 11: the breath is timed on the tide only with a bed, a signature and a running audio clock', () => {
    const update = vi.spyOn(HaloRenderer.prototype, 'update');
    const { beds, audio, frames } = rig();
    const lastPhase = (): number => update.mock.lastCall![0];
    frames(1);
    expect(lastPhase()).toBeNaN(); // no bed
    beds.place();
    frames(1);
    expect(lastPhase()).toBeNaN(); // no signature
    bus.emit('room:signature', { signature: {} as never, starterSeeds: false });
    frames(1);
    expect(lastPhase()).toBeNaN(); // the audio clock stands at 0
    audio.now = 3;
    frames(1);
    expect(lastPhase()).toBe(0.25);
    bus.emit('xr:sessionEnd', { visible: false });
    frames(1);
    expect(lastPhase()).toBeNaN();
  });

  it('a hover of either hand on the orb lifts it; a hover on anything else does not', () => {
    const { beds, orb, frames } = rig();
    beds.place();
    const brightness = () =>
      (orb as Mesh & { material: { uniforms: Record<string, { value: Float32Array }> } }).material.uniforms
        .uOrb!.value[0]!;
    frames(20);
    const rest = brightness();
    bus.emit('target:hover', { hand: 'left', target: { kind: 'orb', id: LISTEN_ORB_ID }, cell: null });
    bus.emit('target:hover', { hand: 'right', target: { kind: 'plant', id: 'p' }, cell: null });
    frames(20);
    expect(brightness()).toBeGreaterThan(rest);
    bus.emit('target:hover', { hand: 'left', target: null, cell: null });
    frames(20);
    expect(brightness()).toBeCloseTo(rest, 6);
  });

  it('the 10-minute end raises "Goodnight" on its own entity; a wake raises nothing', () => {
    let nowMs = 1_790_000_000_000;
    clock.setSource(() => nowMs);
    const { caption } = rig();
    bus.emit('listen:enter', {});
    bus.emit('listen:exit', { timedOut: false });
    expect(caption.hasComponent(Caption)).toBe(false);
    bus.emit('listen:enter', {});
    bus.emit('listen:exit', { timedOut: true });
    expect(caption.data.get(Caption)).toEqual({ key: 'goodnight', expiresAt: nowMs + GOODNIGHT_CAPTION_MS });
    nowMs += 1000;
    bus.emit('listen:exit', { timedOut: true }); // a second one replaces the first
    expect(caption.data.get(Caption)).toEqual({ key: 'goodnight', expiresAt: nowMs + GOODNIGHT_CAPTION_MS });
  });

  it('reduced motion reaches the halo, at start and on a change', () => {
    const set = vi.spyOn(HaloRenderer.prototype, 'setReducedMotion');
    settings.set({ reducedMotion: true });
    rig();
    expect(set).toHaveBeenLastCalledWith(true);
    settings.set({ reducedMotion: false });
    expect(set).toHaveBeenLastCalledWith(false);
  });

  it('a throw in a query callback is caught and logged: it runs inside the placed step of RoomSystem', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { beds, target } = rig();
    vi.spyOn(target, 'addComponent').mockImplementation(() => {
      throw new Error('planted');
    });
    expect(() => beds.place()).not.toThrow();
    expect(errors.mock.calls[0]?.[0]).toBe('[render] the Listen orb could not be placed or taken away');
  });

  it("destroy() takes all three meshes off the bed, and destroys the orb's target and the caption's entity", () => {
    const { system, bed, beds, target, caption } = rig();
    beds.place();
    bus.emit('listen:exit', { timedOut: true });
    system.destroy();
    stop = undefined;
    expect(bed.children).toEqual([]);
    expect([target.isDestroyed, caption.isDestroyed]).toEqual([true, true]);
  });
});
