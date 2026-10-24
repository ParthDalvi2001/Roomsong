// GardenAudioSystem (LLD §3.2, priority 40; API_SPEC §1.10 rules 4 and 11, T-128d): the engine is tuned at the
// session's room:signature and only then given the plants; it follows garden:changed and room:bedPlaced, a bed
// moved with no event, and the session's end; each frame the listener is the head; a seed let go off the bed
// bumps. A stand-in engine that notes each call; fake entities and queries (render's seedRig.ts); the real bus.
import { Matrix4, Object3D } from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { GardenAudioSystem } from '../../../src/audio/AudioSystem.js';
import { bus, settings } from '../../../src/core/index.js';
import { WANDERER } from '../../../src/garden/index.js';
import { garden, plant, seed } from '../garden/fixtures.js';
import { FakeEntity, FakeQuery } from '../render/seedRig.js';

import type { GardenState } from '../../../src/garden/index.js';

const NO_DIFF = { added: [], removed: [], changed: [] };
const PLACEMENT = { pose: new Matrix4().elements, level: 1 as const };

let stop: (() => void) | undefined;
afterEach(() => stop?.());

function rig() {
  const calls: string[] = [];
  const synced: { plants: readonly unknown[]; pose: number[] }[] = [];
  const listener: number[][] = [];
  const engine = {
    setSignature: () => calls.push('setSignature'),
    syncPlants: (plants: readonly unknown[], pose: ArrayLike<number>) => {
      calls.push('syncPlants');
      synced.push({ plants, pose: Array.from(pose) });
    },
    setListenerPose: (head: ArrayLike<number>) => listener.push(Array.from(head)),
    ui: (sound: string, plantId?: string) => calls.push(['ui', sound, plantId].filter(Boolean).join(' ')),
  };
  const head = new Object3D();
  head.matrixWorld.makeTranslation(0, 1.2, 0);
  const camera = new Object3D();
  camera.matrixWorld.makeTranslation(0, 1.6, 0.3);
  const xr = { isPresenting: true };
  const world = { renderer: { xr }, player: { head }, camera };
  const beds = new FakeQuery();
  const bed = new FakeEntity();
  bed.object3D = { matrixWorld: new Matrix4().makeTranslation(0, 0.74, -0.45) };
  const system = new GardenAudioSystem(world as never, {} as never, 40);
  system.queries = { beds } as never;
  system.config.engine.value = engine;
  system.init();
  stop = () => system.destroy();
  const changed = (state: GardenState): void => bus.emit('garden:changed', { state, diff: NO_DIFF });
  const signature = (): void => bus.emit('room:signature', { signature: WANDERER, starterSeeds: false });
  const placed = (): void => bus.emit('room:bedPlaced', { placement: PLACEMENT, restored: false });
  return { system, calls, synced, listener, xr, head, camera, bed, beds, changed, signature, placed };
}

describe('GardenAudioSystem', () => {
  it('nothing is synced before the signature; at it the engine is tuned first, then given the plants at the bed', () => {
    const r = rig();
    const restored = garden([plant('a', 1, 2), plant('b', 3, 9)]);
    r.changed(restored); // garden.load(), before any session
    r.beds.add(r.bed);
    r.placed();
    r.system.update();
    // The bed landed: its chord (§6) from the bed, which the engine gets with no plant: a restored garden must not
    // be heard in the engine's default key.
    expect(r.calls).toEqual(['syncPlants', 'ui confirm']);
    expect(r.synced[0]!.plants).toEqual([]);
    expect(r.synced[0]!.pose).toEqual(r.bed.object3D!.matrixWorld.elements);
    r.calls.length = 0;
    r.signature();
    expect(r.calls).toEqual(['setSignature', 'syncPlants']);
    expect(r.synced[1]!.plants).toBe(restored.plants);
    expect(r.synced[1]!.pose).toEqual(r.bed.object3D!.matrixWorld.elements);
  });

  it('tuned: every garden:changed and room:bedPlaced syncs; a still bed is not synced again frame after frame', () => {
    const r = rig();
    r.beds.add(r.bed);
    r.signature();
    const next = garden([plant('c', 0, 4)]);
    r.changed(next);
    expect(r.synced[r.synced.length - 1]!.plants).toBe(next.plants);
    r.placed();
    const count = r.synced.length;
    for (let i = 0; i < 10; i++) r.system.update();
    expect(r.synced).toHaveLength(count);
  });

  it('a bed moved with no event is synced at its new pose in the next frame; during Re-place it is not followed', () => {
    const r = rig();
    r.beds.add(r.bed);
    r.signature();
    r.bed.object3D!.matrixWorld.makeTranslation(0.2, 0.74, -0.45); // an anchor re-read after a recentre
    r.system.update();
    expect(r.synced[r.synced.length - 1]!.pose[12]).toBeCloseTo(0.2);
    // Re-place: BedAnchor off, the ghost moves the bed's object; the garden sounds from its old place meanwhile
    r.beds.remove(r.bed);
    r.bed.object3D!.matrixWorld.makeTranslation(-0.3, 0.74, -0.45);
    const count = r.synced.length;
    r.system.update();
    expect(r.synced).toHaveLength(count);
    r.beds.add(r.bed);
    r.placed();
    expect(r.synced[r.synced.length - 1]!.pose[12]).toBeCloseTo(-0.3);
  });

  it('the session end empties the engine at the kept pose and untunes it: nothing more until the next signature', () => {
    const r = rig();
    r.beds.add(r.bed);
    r.changed(garden([plant('a', 1, 2)]));
    r.signature();
    r.beds.remove(r.bed); // RoomSystem's handler runs first: BedAnchor has gone
    bus.emit('xr:sessionEnd', { visible: false });
    const last = r.synced[r.synced.length - 1]!;
    expect(last.plants).toEqual([]);
    expect(last.pose).toEqual(r.synced[0]!.pose);
    const count = r.synced.length;
    r.changed(garden([plant('b', 2, 2)]));
    expect(r.synced).toHaveLength(count);
  });

  it('each frame the listener is the head in a session and the camera outside one', () => {
    const r = rig();
    r.system.update();
    expect(r.listener[0]).toEqual(r.head.matrixWorld.elements);
    r.xr.isPresenting = false;
    r.system.update();
    expect(r.listener[1]).toEqual(r.camera.matrixWorld.elements);
  });

  it('a seed set into a cell sounds at once (P-012): synced first, then named; a load, an undo, a seed sent back do not', () => {
    const r = rig();
    r.beds.add(r.bed);
    r.signature();
    const add = (state: GardenState, id: string): void =>
      bus.emit('garden:changed', { state, diff: { added: [id], removed: [], changed: [] } });
    bus.emit('garden:seedOut', { seed: seed('s1'), hand: 'right' });
    const planted = garden([plant('s1', 2, 5)]);
    r.calls.length = 0;
    add(planted, 's1');
    expect(r.calls).toEqual(['syncPlants', 'ui placed s1']);
    add(planted, 's1'); // the same plant back by its undo petal: no seed was out
    add(garden([plant('s1', 2, 5), plant('auto-0', 0, 0)]), 'auto-0'); // added with no seed out (a load)
    bus.emit('garden:seedOut', { seed: seed('s2'), hand: 'left' });
    bus.emit('garden:seedBack', { seedId: 's2', reason: 'full' });
    add(garden([plant('s2', 1, 1)]), 's2'); // a seed that went back is out no more
    // the 'full' seedBack bumps (§6)
    expect(r.calls).toEqual([
      'syncPlants',
      'ui placed s1',
      'syncPlants',
      'syncPlants',
      'ui bump',
      'syncPlants',
    ]);
  });

  it('a seed let go off the bed, over a full bed or by a lost hand bumps (UX §7, §6); a reset makes no sound', () => {
    const r = rig();
    for (const reason of ['full', 'lost', 'reset', 'offBed'] as const)
      bus.emit('garden:seedBack', { seedId: 's', reason });
    expect(r.calls).toEqual(['ui bump', 'ui bump', 'ui bump']);
  });
});

describe('the UI sounds of the garden (T-164 §6)', () => {
  it('a removal plays removeRev; the plant back by its petal plays undoFwd, not placed; a load of it later plays nothing', () => {
    const r = rig();
    r.signature();
    r.calls.length = 0;
    const a = plant('a', 1, 2);
    bus.emit('garden:removed', { plantId: 'a', undoToken: { plant: a }, expiresAt: 5000 });
    const add = (id: string): void =>
      bus.emit('garden:changed', { state: garden([a]), diff: { added: [id], removed: [], changed: [] } });
    add('a');
    add('a');
    expect(r.calls).toEqual(['ui removeRev', 'syncPlants', 'ui undoFwd', 'syncPlants']);
  });

  it('a carried seed or a dragged plant ticks at each new cell it would land in, per hand; a hover over a plant never', () => {
    const r = rig();
    const hover = (
      hand: 'left' | 'right',
      cell: { ring: number; step: number } | null,
      target = null as never,
    ) => bus.emit('target:hover', { hand, target, cell });
    hover('right', { ring: 1, step: 2 });
    hover('right', { ring: 1, step: 2 });
    hover('right', { ring: 1, step: 3 });
    hover('left', { ring: 1, step: 3 }); // the other hand's first cell
    hover('right', null);
    hover('right', { ring: 1, step: 3 }); // back over the bed
    hover('right', { ring: 2, step: 0 }, { kind: 'plant', id: 'p' } as never); // a hover, not a drag
    expect(r.calls).toEqual(['ui tick', 'ui tick', 'ui tick', 'ui tick']);
  });

  it('with the gaze mode on, a cell the gaze crosses does not tick: its dwell ring is the cue there (FR-HND-12)', () => {
    const r = rig();
    settings.set({ gazeDwell: true });
    try {
      bus.emit('target:hover', { hand: 'right', target: null, cell: { ring: 1, step: 2 } });
      bus.emit('target:hover', { hand: 'right', target: null, cell: { ring: 1, step: 3 } });
      expect(r.calls).toEqual([]);
    } finally {
      settings.set({ gazeDwell: false });
    }
  });

  it('the bed landed (room:bedPlaced, a restore too) plays confirm after the sync, so it sounds from the bed', () => {
    const r = rig();
    r.beds.add(r.bed);
    r.signature();
    r.calls.length = 0;
    r.placed();
    bus.emit('room:bedPlaced', { placement: PLACEMENT, restored: true });
    expect(r.calls).toEqual(['syncPlants', 'ui confirm', 'syncPlants', 'ui confirm']);
  });
});
