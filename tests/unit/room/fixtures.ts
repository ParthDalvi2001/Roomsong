/// <reference types="webxr" />
// Fake XR frames for room/ tests. A room fixture (tests/fixtures/rooms) becomes the frame the emulator would
// give: each plane a pose and a polygon, its +Y pointing away from the room (tests/e2e/README.md). Synthetic
// data: nothing here shows what a headset or the emulator delivers.
import { readRoom, type Room } from '../../e2e/support/iwer';

import type { Mat4, Vec3 } from '../../../src/core/index.js';

type Quat = readonly [x: number, y: number, z: number, w: number];

// The same table as tests/e2e/support/iwer.ts, which does not export it: plane orientation by the side it faces.
const S = Math.SQRT1_2;
const PLANE_ORIENTATION: Record<Room['planes'][number]['facing'], Quat> = {
  '+y': [1, 0, 0, 0],
  '-y': [0, 0, 0, 1],
  '+z': [0, S, -S, 0],
  '-z': [S, 0, 0, S],
  '+x': [0.5, -0.5, 0.5, 0.5],
  '-x': [0.5, 0.5, -0.5, 0.5],
};
/** A plane's +Y pointing up instead: the other way round from the emulator's table tops. */
export const NORMAL_UP: Quat = [0, 0, 0, 1];
export const NORMAL_DOWN: Quat = [1, 0, 0, 0];

/** A rigid pose as a column-major matrix. */
export function poseOf([px, py, pz]: readonly number[], [x, y, z, w]: Quat = NORMAL_UP): number[] {
  return [
    ...[1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0],
    ...[2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0],
    ...[2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0],
    ...[px!, py!, pz!, 1],
  ];
}

/** Yaw about the vertical, in degrees, as a quaternion: positive turns to the left. */
export function yaw(deg: number): Quat {
  const half = (deg * Math.PI) / 360;
  return [0, Math.sin(half), 0, Math.cos(half)];
}

/**
 * A head pose: where the eyes are and where they look. Yaw 0 looks down -z; positive pitch looks up; roll tips
 * the head about its own gaze, last. The rotation is yaw, then pitch, then roll.
 */
export function headAt(x: number, y: number, z: number, yawDeg = 0, pitchDeg = 0, rollDeg = 0): number[] {
  const rad = (deg: number): number => (deg * Math.PI) / 180;
  const [cy, sy] = [Math.cos(rad(yawDeg)), Math.sin(rad(yawDeg))];
  const [cp, sp] = [Math.cos(rad(pitchDeg)), Math.sin(rad(pitchDeg))];
  const [cr, sr] = [Math.cos(rad(rollDeg)), Math.sin(rad(rollDeg))];
  return [
    ...[cr * cy + sr * sp * sy, sr * cp, -cr * sy + sr * sp * cy, 0],
    ...[-sr * cy + cr * sp * sy, cr * cp, sr * sy + cr * sp * cy, 0],
    ...[sy * cp, -sp, cy * cp, 0],
    ...[x, y, z, 1],
  ];
}
/** Where the emulator's head starts: standing at the origin, looking down -z. */
export const HEAD = headAt(0, 1.6, 0);

export interface FakePlane {
  label?: string;
  /** The pose of the plane's own space. */
  pose: Mat4 | undefined;
  /** Width along the plane's x and depth along its z, centred on the pose unless `offset` moves the polygon. */
  size: readonly [number, number];
  offset?: readonly [number, number];
}

export interface FakeScene {
  planes?: FakePlane[];
  meshes?: { label?: string; pose: Mat4 | undefined; vertices: number[]; indices: number[] }[];
  /** What the gaze ray hits this frame, nearest first. */
  hits?: Vec3[];
  /** The session's granted features. */
  features?: string[] | undefined;
}

const ALL_FEATURES = ['plane-detection', 'mesh-detection', 'hit-test'];

/** One fake session. Its scene can be swapped between frames; `frame()` is what an adapter's setFrame takes. */
export class FakeXR {
  readonly space = {} as XRReferenceSpace;
  readonly hitSource = {} as XRHitTestSource;
  /** Set to make the hit-test source request fail. */
  hitSourceError: Error | null = null;
  /** Set to hold the hit-test source back until this resolves. */
  hitSourceGate: Promise<void> = Promise.resolve();
  /** Set to make every read of the frame throw, as a frame does outside its own callback. */
  frameError: Error | null = null;
  private planes = new Set<object>();
  private meshes = new Set<object>();
  private hits: Vec3[] = [];
  /** The fake XRSession: a test may change it, for example to take `requestHitTestSource` away. */
  readonly session: Record<string, unknown> = {
    requestReferenceSpace: () => Promise.resolve({}),
    requestHitTestSource: () =>
      this.hitSourceGate.then(() =>
        this.hitSourceError ? Promise.reject(this.hitSourceError) : this.hitSource,
      ),
  };

  constructor(scene: FakeScene = {}) {
    this.set(scene);
  }

  set(scene: FakeScene): void {
    this.session.enabledFeatures = 'features' in scene ? scene.features : ALL_FEATURES;
    this.hits = scene.hits ?? [];
    this.planes = new Set(
      (scene.planes ?? []).map(({ label, pose, size: [width, depth], offset: [ox, oz] = [0, 0] }) => ({
        planeSpace: { pose },
        semanticLabel: label,
        polygon: [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
          [-1, -1],
        ].map(([sx, sz]) => ({ x: ox + (sx! * width) / 2, y: 0, z: oz + (sz! * depth) / 2, w: 1 })),
      })),
    );
    this.meshes = new Set(
      (scene.meshes ?? []).map(({ label, pose, vertices, indices }) => ({
        meshSpace: { pose },
        semanticLabel: label,
        vertices: new Float32Array(vertices),
        indices: new Uint32Array(indices),
      })),
    );
  }

  frame(): XRFrame {
    const fail = (): never => {
      throw this.frameError!;
    };
    const live = <T>(value: T): T => (this.frameError ? fail() : value);
    const { planes, meshes, hits, session, hitSource, space } = this;
    return {
      session,
      get detectedPlanes() {
        return live(planes);
      },
      get detectedMeshes() {
        return live(meshes);
      },
      getPose: (from: { pose?: Mat4 }, to: unknown) =>
        live(from.pose && to === space ? { transform: { matrix: from.pose } } : undefined),
      getHitTestResults: (source: unknown) =>
        live(source === hitSource ? hits : []).map((position) => ({
          getPose: (to: unknown) => (to === space ? { transform: { position } } : undefined),
        })),
    } as unknown as XRFrame;
  }
}

/** A room fixture as a fake scene: what the emulator's plane and mesh detection would report for it. */
export function sceneOf(room: Room): FakeScene {
  return {
    planes: room.planes.map(({ label, facing, center, size }) => ({
      label,
      pose: poseOf(center, PLANE_ORIENTATION[facing]),
      size,
    })),
    meshes: (room.meshes ?? []).map((mesh) => ({ ...mesh, pose: poseOf([0, 0, 0]) })),
  };
}

export { readRoom };
