/// <reference types="webxr" />
// WebXR plane detection → RoomPlane[] (LLD §1, FR-ROOM-01). Plane detection is an optional session feature:
// `supported()` is false without it and the placement chain goes on to the next level.
// Emulator facts this file obeys (tests/e2e/README.md): a plane's +Y may point either way, `plane.orientation`
// comes from the label, and `lastChangedTime` changes every frame; so only the pose and the polygon are read.
// Not seen on a headset: which planes and labels a Quest reports is unverified.
import { flags as pageFlags, log } from '../core/index.js';

import type { RoomPlane } from './types.js';
import type { Flags } from '../core/index.js';

export class PlaneAdapter {
  private frame: XRFrame | null = null;
  private space: XRReferenceSpace | null = null;
  private readonly ids = new WeakMap<XRPlane, string>();
  private idCount = 0;
  private hasLoggedReadFailure = false;

  constructor(private readonly flags: Flags = pageFlags) {}

  /** In every XR frame, before `read`: a frame can be read only inside its own callback. */
  setFrame(frame: XRFrame, space: XRReferenceSpace): void {
    this.frame = frame;
    this.space = space;
  }

  /** False before the first frame, with the `noPlanes` flag, and in a session without plane detection. */
  supported(): boolean {
    return !this.flags.noPlanes && this.frame?.session.enabledFeatures?.includes('plane-detection') === true;
  }

  /**
   * This frame's planes, each as the rectangle around its polygon; none when unsupported. Never throws. A plane
   * keeps its id for the session. Builds new objects on every call: not for every frame of a session.
   * shortcut: a plane is taken as the rectangle around its polygon, so a round or L-shaped table is read as
   * larger than it is; use the polygon itself if a headset reports such planes (T-129).
   */
  read(): RoomPlane[] {
    const planes: RoomPlane[] = [];
    if (!this.supported()) return planes;
    try {
      for (const plane of this.frame!.detectedPlanes ?? []) {
        const rectangle = this.rectangleOf(plane);
        if (rectangle !== null) planes.push(rectangle);
      }
    } catch (error) {
      // A frame read outside its own callback throws (WebXR). The chain goes on with the planes read so far.
      if (!this.hasLoggedReadFailure) log.warn('room', 'plane read failed', error);
      this.hasLoggedReadFailure = true;
    }
    return planes;
  }

  /** null for a plane with no pose this frame, no area, or a number that is not finite. */
  private rectangleOf(plane: XRPlane): RoomPlane | null {
    const matrix = this.frame!.getPose(plane.planeSpace, this.space!)?.transform.matrix;
    if (matrix?.length !== 16) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const point of plane.polygon) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }
    // The pose goes to the rectangle's centre: the platform need not put the plane's origin there.
    const pose = Array.from(matrix);
    const midX = (minX + maxX) / 2;
    const midZ = (minZ + maxZ) / 2;
    for (let i = 0; i < 3; i++) pose[12 + i]! += midX * pose[i]! + midZ * pose[8 + i]!;
    const extents = { x: maxX - minX, y: maxZ - minZ };
    if (!(extents.x > 0 && extents.y > 0) || !pose.every(Number.isFinite)) return null;
    let id = this.ids.get(plane);
    if (id === undefined) {
      id = `plane-${this.idCount++}`;
      this.ids.set(plane, id);
    }
    return { id, label: plane.semanticLabel ?? '', pose, extents };
  }
}
