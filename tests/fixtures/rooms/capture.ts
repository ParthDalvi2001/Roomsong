// A room fixture (the JSON files beside this file) in the emulator's own room capture format, the one IWER's
// `sem` loads (read from the @iwer/sem 2.5.0 code inside @iwsdk/vite-plugin-dev 1.0.1, a version package.json
// pins exactly). Two readers: tests/e2e/support/iwer.ts gives each test its room, and the dev plugin in
// vite.config.ts serves the emulator's room from here instead of from unpkg.com (BUG-002). No browser code.
import { Buffer } from 'node:buffer';

type Vec3 = [x: number, y: number, z: number];
type Quat = [x: number, y: number, z: number, w: number];

// WebXR semantic label -> the label name in the emulator's room capture format. These are the labels the
// emulator can produce ("desk" is not one of them).
export const SEM_LABEL = {
  table: 'TABLE',
  floor: 'FLOOR',
  ceiling: 'CEILING',
  wall: 'WALL_FACE',
  couch: 'COUCH',
  door: 'DOOR_FRAME',
  window: 'WINDOW_FRAME',
  shelf: 'STORAGE',
  bed: 'BED',
  screen: 'SCREEN',
  lamp: 'LAMP',
  plant: 'PLANT',
  'wall art': 'WALL_ART',
  'global mesh': 'GLOBAL_MESH',
  other: 'OTHER',
} as const;

// Plane-space orientation for each side a surface can face. In the emulator a plane can only be hit-tested
// from its local -Y side, and its own living_room capture points +Y away from the room on all 17 planes
// (a table top has +Y down), so the fixtures do the same. Whether a headset agrees is not known.
const S = Math.SQRT1_2;
export const PLANE_ORIENTATION = {
  '+y': [1, 0, 0, 0],
  '-y': [0, 0, 0, 1],
  '+z': [0, S, -S, 0],
  '-z': [S, 0, 0, S],
  '+x': [0.5, -0.5, 0.5, 0.5],
  '-x': [0.5, 0.5, -0.5, 0.5],
} satisfies Record<string, Quat>;

export interface Room {
  description: string;
  /** `facing` is the side the room is on; `size` is width x depth (horizontal) or width x height (wall). */
  planes: {
    label: keyof typeof SEM_LABEL;
    facing: keyof typeof PLANE_ORIENTATION;
    center: Vec3;
    size: [number, number];
  }[];
  /** Triangle meshes in room coordinates: xyz triples and index triples. */
  meshes?: { label: keyof typeof SEM_LABEL; vertices: number[]; indices: number[] }[];
}

export function roomCapture(room: Room) {
  const base64 = (data: Float32Array | Uint32Array) => Buffer.from(data.buffer).toString('base64');
  const at = ([x, y, z]: Vec3, [qx, qy, qz, qw]: Quat) => ({
    position: { x, y, z },
    orientation: { x: qx, y: qy, z: qz, w: qw },
  });
  return {
    spatialEntities: [
      ...room.planes.map(({ label, facing, center, size: [width, height] }, i) => ({
        uuid: `plane-${i}`,
        semanticLabel_META: SEM_LABEL[label],
        locatable_META: at(center, PLANE_ORIENTATION[facing]),
        bounded2D_META: { offset: { x: -width / 2, y: -height / 2 }, extent: { width, height } },
      })),
      ...(room.meshes ?? []).map(({ label, vertices, indices }, i) => ({
        uuid: `mesh-${i}`,
        semanticLabel_META: SEM_LABEL[label],
        locatable_META: at([0, 0, 0], [0, 0, 0, 1]),
        triangleMesh_META: {
          vertices: base64(new Float32Array(vertices)),
          indices: base64(new Uint32Array(indices)),
        },
      })),
    ],
  };
}
