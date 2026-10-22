// VineSystem (LLD §3.2, priority 53; T-149) on a fake world: the vine is laid on the nearest wall of room:features
// in the next update, grows with the garden of garden:changed, and goes at a Re-place (BedAnchor leaving the bed)
// and at xr:sessionEnd.
import { Group, Object3D, type InstancedMesh } from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { bus, DEFAULT_SETTINGS, settings } from '../../../src/core/index.js';
import { PLANT_CAPACITY, VINE_GROW_MS, VINE_SEGMENTS } from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { VineSystem } from '../../../src/render/RenderSystems.js';

import type { Plant } from '../../../src/garden/index.js';
import type { RoomSurfaces } from '../../../src/room/index.js';

const FRAME_S = 0.01;
const SURFACES: RoomSurfaces = {
  nearestWall: { id: 'w', pose: [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1.25, -1, 1], extents: { x: 4, y: 2.5 } },
};
const PLANTS: Plant[] = Array.from({ length: PLANT_CAPACITY }, (_, i) => ({
  id: `p${i}`,
  voice: 'bell',
  cell: { ring: i % 5, step: i % 16 },
  height: 0.5,
  hue: i / PLANT_CAPACITY,
  plantedAt: 0,
}));

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  settings.set(DEFAULT_SETTINGS);
});

function rig() {
  let timeS = 2000;
  const scene = new Group();
  const bed = new Object3D();
  bed.position.set(0, 0.74, -0.45);
  bed.updateMatrixWorld();
  const system = new VineSystem({ scene } as never, {} as never, 53);
  const unplaced = new Set<() => void>();
  const beds = {
    subscribe: (event: string, callback: () => void) => {
      if (event === 'disqualify') unplaced.add(callback);
      return () => unplaced.delete(callback);
    },
  };
  system.queries = { beds } as never;
  system.config.guard.value = new FlashGuard();
  system.config.bed.value = bed;
  system.init();
  stop = () => system.destroy();
  const runFor = (seconds: number): void => {
    for (const until = timeS + seconds; timeS < until - 1e-9; ) {
      timeS = Math.round((timeS + FRAME_S) * 1000) / 1000;
      system.update(FRAME_S, timeS);
    }
  };
  const vine = scene.getObjectByName('vine') as InstancedMesh;
  const changed = (plants: Plant[]): void =>
    bus.emit('garden:changed', { state: { plants }, diff: { added: [], removed: [], changed: [] } } as never);
  return { vine, runFor, changed, replace: () => unplaced.forEach((callback) => callback()) };
}

describe('VineSystem (T-149)', () => {
  it('lays the vine on the wall of room:features, as long as the garden, and takes it away at a Re-place', () => {
    const { vine, runFor, changed, replace } = rig();
    changed(PLANTS);
    runFor(2 * (VINE_GROW_MS / 1000));
    expect(vine.count).toBe(0); // no wall yet
    bus.emit('room:features', { features: { level: 1 }, surfaces: SURFACES });
    runFor(2 * (VINE_GROW_MS / 1000));
    expect(vine.count).toBe(VINE_SEGMENTS);
    replace();
    runFor(2 * (VINE_GROW_MS / 1000));
    expect(vine.count).toBe(0);
    bus.emit('room:features', { features: { level: 1 }, surfaces: SURFACES });
    runFor(2 * (VINE_GROW_MS / 1000));
    expect(vine.count).toBe(VINE_SEGMENTS);
    bus.emit('xr:sessionEnd', { visible: false });
    runFor(2 * (VINE_GROW_MS / 1000));
    expect(vine.count).toBe(0);
    // A room without a wall near, or a Wanderer session with none: nothing.
    bus.emit('room:features', { features: { level: 3 }, surfaces: {} });
    runFor(2 * (VINE_GROW_MS / 1000));
    expect(vine.count).toBe(0);
  });
});
