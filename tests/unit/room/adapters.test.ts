// The three room adapters on fake XR frames (CODING_GUIDELINES §6: every adapter has `supported()`, and nothing
// assumes planes, meshes or hit-test exist). Synthetic frames: nothing here shows what a headset or the emulator
// delivers; tests/e2e/06-room.spec.ts runs the same classes on the emulator's planes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flags, log } from '../../../src/core/index.js';
import { HitTestAdapter } from '../../../src/room/HitTestAdapter.js';
import { MeshAdapter } from '../../../src/room/MeshAdapter.js';
import { PlaneAdapter } from '../../../src/room/PlaneAdapter.js';
import { ROOMS } from '../../e2e/support/iwer';

import { FakeXR, NORMAL_DOWN, NORMAL_UP, poseOf, readRoom, sceneOf, yaw } from './fixtures.js';

import type { FakeScene } from './fixtures.js';
import type { RoomPlane } from '../../../src/room/types.js';

beforeEach(() => {
  vi.spyOn(log, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

/** Lets the promises an adapter started run to their end. */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

function readPlanes(scene: FakeScene, adapter = new PlaneAdapter()): RoomPlane[] {
  const xr = new FakeXR(scene);
  adapter.setFrame(xr.frame(), xr.space);
  return adapter.read();
}

const TABLE_TOP = { label: 'table', pose: poseOf([0, 0.74, -0.5], NORMAL_DOWN), size: [1.2, 0.8] } as const;
const NAN = Number.NaN;

/** Equal to within a picometre: sums of halves are not exact to the last bit. */
function expectClose(actual: readonly (number | undefined)[], expected: readonly number[]): void {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) expect(actual[i], `[${i}]`).toBeCloseTo(expected[i]!, 12);
}

describe('PlaneAdapter', () => {
  it('is unsupported before the first frame, with noPlanes, and without the session feature', () => {
    const table = new FakeXR({ planes: [TABLE_TOP] });
    const adapter = new PlaneAdapter();
    expect(adapter.supported()).toBe(false);
    expect(adapter.read()).toEqual([]);
    adapter.setFrame(table.frame(), table.space);
    expect(adapter.supported()).toBe(true);
    expect(adapter.read()).toHaveLength(1);

    const flagged = new PlaneAdapter({ ...flags, noPlanes: true });
    flagged.setFrame(table.frame(), table.space);
    expect(flagged.supported()).toBe(false);
    expect(flagged.read()).toEqual([]);

    for (const features of [['mesh-detection', 'hit-test'], [], undefined]) {
      const xr = new FakeXR({ planes: [TABLE_TOP], features });
      adapter.setFrame(xr.frame(), xr.space);
      expect(adapter.supported(), `${features?.join()}`).toBe(false);
      expect(adapter.read(), `${features?.join()}`).toEqual([]);
    }
  });

  it('reads every plane of every fixture room: its label, its centre and its size', () => {
    for (const name of ROOMS) {
      const room = readRoom(name);
      const planes = readPlanes(sceneOf(room));
      expect(
        planes.map(({ label, pose, extents }) => ({
          label,
          center: [pose[12], pose[13], pose[14]],
          size: [extents.x, extents.y],
        })),
        name,
      ).toEqual(room.planes.map(({ label, center, size }) => ({ label, center, size })));
      expect(
        planes.map((plane) => plane.id),
        name,
      ).toEqual(room.planes.map((_, i) => `plane-${i}`));
    }
  });

  it('keeps a plane its id from frame to frame, and gives a new plane a new one', () => {
    const xr = new FakeXR({ planes: [TABLE_TOP] });
    const adapter = new PlaneAdapter();
    adapter.setFrame(xr.frame(), xr.space);
    expect(adapter.read().map((plane) => plane.id)).toEqual(['plane-0']);
    adapter.setFrame(xr.frame(), xr.space);
    expect(adapter.read().map((plane) => plane.id)).toEqual(['plane-0']);
    xr.set({ planes: [TABLE_TOP] }); // the same table as a new platform object
    adapter.setFrame(xr.frame(), xr.space);
    expect(adapter.read().map((plane) => plane.id)).toEqual(['plane-1']);
  });

  it('puts the pose at the centre of the polygon, wherever the platform put the origin', () => {
    // Normal down and no turn: the plane's x is the room's x and its z is the room's -z.
    const [down] = readPlanes({ planes: [{ ...TABLE_TOP, offset: [0.3, -0.2] }] });
    expectClose([down!.pose[12], down!.pose[13], down!.pose[14]], [0.3, 0.74, -0.3]);
    expectClose([down!.extents.x, down!.extents.y], [1.2, 0.8]);
    expect(Array.from(down!.pose).slice(0, 12)).toEqual(poseOf([0, 0, 0], NORMAL_DOWN).slice(0, 12));
    // A quarter turn, normal up: the plane's x is the room's -z and its z is the room's x.
    const offCentre = { pose: poseOf([1, 0.9, 2], yaw(90)), size: [2, 1], offset: [0.5, 0.1] } as const;
    const [turned] = readPlanes({ planes: [offCentre] });
    expectClose([turned!.pose[12], turned!.pose[13], turned!.pose[14]], [1 + 0.1, 0.9, 2 - 0.5]);
    expect(turned!.label).toBe('');
  });

  it('reads the same rectangle whichever way the plane normal points', () => {
    const [down] = readPlanes({ planes: [{ ...TABLE_TOP, pose: poseOf([0, 0.74, -0.5], NORMAL_DOWN) }] });
    const [up] = readPlanes({ planes: [{ ...TABLE_TOP, pose: poseOf([0, 0.74, -0.5], NORMAL_UP) }] });
    expect(up!.extents).toEqual(down!.extents);
    expect(Array.from(up!.pose).slice(12)).toEqual(Array.from(down!.pose).slice(12));
    expect(up!.pose[5]).toBe(-down!.pose[5]!);
  });

  it('skips a plane with no pose, no area or a number that is not finite, and keeps the rest', () => {
    const nanPose = poseOf([0, 0.74, -0.5], NORMAL_DOWN);
    nanPose[13] = NAN;
    const planes = readPlanes({
      planes: [
        { ...TABLE_TOP, pose: undefined },
        { ...TABLE_TOP, size: [0, 0.8] },
        { ...TABLE_TOP, size: [1.2, NAN] },
        { ...TABLE_TOP, offset: [Infinity, 0] },
        { ...TABLE_TOP, pose: nanPose },
        { ...TABLE_TOP, pose: [1, 0, 0, 0] },
        { ...TABLE_TOP, label: 'kept' },
      ],
    });
    expect(planes.map((plane) => plane.label)).toEqual(['kept']);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('never throws on a frame that cannot be read: no planes, and one log line however often it happens', () => {
    const xr = new FakeXR({ planes: [TABLE_TOP] });
    xr.frameError = new Error('InvalidStateError');
    const adapter = new PlaneAdapter();
    adapter.setFrame(xr.frame(), xr.space);
    expect(adapter.read()).toEqual([]);
    expect(adapter.read()).toEqual([]);
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'plane read failed', xr.frameError);
    xr.frameError = null;
    expect(adapter.read()).toHaveLength(1);
  });
});

describe('MeshAdapter', () => {
  const TRIANGLE = { vertices: [0, 0, 0, 1, 0, 0, 0, 0, 1], indices: [0, 1, 2] };
  const FLOOR = { label: 'global mesh', pose: poseOf([0, 0, 0]), ...TRIANGLE };

  it('is unsupported before the first frame, with noMeshes, and without the session feature', () => {
    const xr = new FakeXR({ meshes: [FLOOR] });
    const adapter = new MeshAdapter();
    expect(adapter.supported()).toBe(false);
    expect(adapter.read()).toEqual([]);
    adapter.setFrame(xr.frame(), xr.space);
    expect(adapter.supported()).toBe(true);

    const flagged = new MeshAdapter({ ...flags, noMeshes: true });
    flagged.setFrame(xr.frame(), xr.space);
    expect(flagged.supported()).toBe(false);
    expect(flagged.read()).toEqual([]);

    const bare = new FakeXR({ meshes: [FLOOR], features: ['plane-detection'] });
    adapter.setFrame(bare.frame(), bare.space);
    expect(adapter.supported()).toBe(false);
    expect(adapter.read()).toEqual([]);
  });

  it('reads the meshes of the fixture rooms: the table room has its floor mesh, the others none', () => {
    for (const name of ROOMS) {
      const xr = new FakeXR(sceneOf(readRoom(name)));
      const adapter = new MeshAdapter();
      adapter.setFrame(xr.frame(), xr.space);
      const labels = adapter.read().map((mesh) => mesh.label);
      expect(labels, name).toEqual(name === 'table' ? ['global mesh'] : []);
    }
    const xr = new FakeXR(sceneOf(readRoom('table')));
    const adapter = new MeshAdapter();
    adapter.setFrame(xr.frame(), xr.space);
    const [floor] = adapter.read();
    expect(Array.from(floor!.vertices)).toEqual([-2, 0, -2.25, 2, 0, -2.25, 2, 0, 2.25, -2, 0, 2.25]);
    expect(Array.from(floor!.indices)).toEqual([0, 2, 1, 0, 3, 2]);
    expect(Array.from(floor!.pose)).toEqual(poseOf([0, 0, 0]));
  });

  it('skips a mesh with no pose, and never throws on a frame that cannot be read', () => {
    const kept = { ...FLOOR, label: 'kept' };
    const xr = new FakeXR({ meshes: [{ ...FLOOR, pose: undefined }, kept, { ...FLOOR, pose: [1] }] });
    const adapter = new MeshAdapter();
    adapter.setFrame(xr.frame(), xr.space);
    expect(adapter.read().map((mesh) => mesh.label)).toEqual(['kept']);
    xr.frameError = new Error('InvalidStateError');
    expect(adapter.read()).toEqual([]);
    expect(adapter.read()).toEqual([]);
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'mesh read failed', xr.frameError);
  });
});

describe('HitTestAdapter', () => {
  const ON_TABLE = { x: 0, y: 0.74, z: -0.5 };

  it('is unsupported before the first frame and without the session feature', () => {
    const adapter = new HitTestAdapter();
    expect(adapter.supported()).toBe(false);
    expect(adapter.hit()).toBeNull();
    const bare = new FakeXR({ hits: [ON_TABLE], features: ['plane-detection'] });
    adapter.setFrame(bare.frame(), bare.space);
    expect(adapter.supported()).toBe(false);
    expect(adapter.hit()).toBeNull();
  });

  it('gives the nearest hit of the gaze ray once its source is ready, and null when nothing is hit', async () => {
    const xr = new FakeXR({ hits: [ON_TABLE, { x: 0, y: 0, z: -2 }] });
    const adapter = new HitTestAdapter();
    adapter.setFrame(xr.frame(), xr.space);
    expect(adapter.supported()).toBe(true);
    expect(adapter.hit()).toBeNull(); // the source is still on its way
    await settle();
    expect(adapter.hit()).toBe(ON_TABLE);
    xr.set({ hits: [] });
    adapter.setFrame(xr.frame(), xr.space);
    expect(adapter.hit()).toBeNull();
    expect(adapter.supported()).toBe(true);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('is unsupported once the source cannot be made: the request fails, or the session has no such call', async () => {
    const failing = new FakeXR({ hits: [ON_TABLE] });
    failing.hitSourceError = new Error('NotSupportedError');
    const adapter = new HitTestAdapter();
    adapter.setFrame(failing.frame(), failing.space);
    await settle();
    expect(adapter.supported()).toBe(false);
    expect(adapter.hit()).toBeNull();
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'hit-test unavailable', failing.hitSourceError);

    const without = new FakeXR({ hits: [ON_TABLE] });
    without.session.requestHitTestSource = undefined;
    adapter.setFrame(without.frame(), without.space);
    expect(adapter.supported()).toBe(true); // a new session gets a new try
    await settle();
    expect(adapter.supported()).toBe(false);
    expect(adapter.hit()).toBeNull();
  });

  it('never throws on a frame that cannot be read: no hit, and level 3 is over for the session', async () => {
    const xr = new FakeXR({ hits: [ON_TABLE] });
    const adapter = new HitTestAdapter();
    adapter.setFrame(xr.frame(), xr.space);
    await settle();
    xr.frameError = new Error('InvalidStateError');
    expect(adapter.hit()).toBeNull();
    expect(adapter.supported()).toBe(false);
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'hit-test unavailable', xr.frameError);
  });

  it('a new session gets its own source, and a source that arrives late for an old session is dropped', async () => {
    let open = (): void => {};
    const first = new FakeXR({ hits: [{ x: 9, y: 9, z: 9 }] });
    first.hitSourceGate = new Promise((resolve) => (open = resolve));
    const second = new FakeXR({ hits: [ON_TABLE] });
    const adapter = new HitTestAdapter();
    adapter.setFrame(first.frame(), first.space);
    adapter.setFrame(second.frame(), second.space);
    await settle();
    expect(adapter.hit()).toBe(ON_TABLE);
    open(); // the first session's source arrives now
    await settle();
    expect(adapter.hit()).toBe(ON_TABLE);
    expect(adapter.supported()).toBe(true);
  });
});
