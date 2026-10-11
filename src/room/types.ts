// Plain data types of room/ (API_SPEC §1.3, LLD §1). No methods, no runtime code.
import type { Mat4, Vec2 } from '../core/index.js';
import type { PlacementLevel } from '../garden/index.js';

/**
 * A flat rectangle in the room. `pose` sits at its centre: the rectangle lies in the pose's own x-z plane,
 * `extents.x` wide along x and `extents.y` along z, and the pose's y axis is the normal. Which way that normal
 * points is not defined (the emulator's table tops face down): never read its sign.
 */
export interface SurfaceRef {
  id: string;
  pose: Mat4;
  extents: Vec2;
}

/** A detected plane: its rectangle and the platform's label ('' when it gives none). */
export interface RoomPlane extends SurfaceRef {
  label: string;
}

/** A detected mesh as the platform holds it: `vertices` are xyz triples in the space of `pose`. */
export interface RoomMesh {
  label: string;
  pose: Mat4;
  vertices: Float32Array;
  indices: Uint32Array;
}

/** For the tuning ripple (LLD §5.8). */
export interface RoomSurfaces {
  table?: SurfaceRef;
  nearestWall?: SurfaceRef;
  ceiling?: SurfaceRef;
}

/** Where the bed goes. `pose` is level and faces the user (API_SPEC §1.0 Axes); `surfaceId` only at levels 1 and 2. */
export interface BedPlacement {
  pose: Mat4;
  level: PlacementLevel;
  surfaceId?: string;
}
