/// <reference types="webxr" />
// WebXR mesh detection → RoomMesh[] (LLD §1). An optional session feature: `supported()` is false without it.
// Placement does not use meshes; the room features (T-141) read the global mesh for the room volume.
// Not seen on a headset: which meshes and labels a Quest reports is unverified.
import { flags as pageFlags, log } from '../core/index.js';

import type { RoomMesh } from './types.js';
import type { Flags } from '../core/index.js';

export class MeshAdapter {
  private frame: XRFrame | null = null;
  private space: XRReferenceSpace | null = null;
  private hasLoggedReadFailure = false;

  constructor(private readonly flags: Flags = pageFlags) {}

  /** In every XR frame, before `read`: a frame can be read only inside its own callback. */
  setFrame(frame: XRFrame, space: XRReferenceSpace): void {
    this.frame = frame;
    this.space = space;
  }

  /** False before the first frame, with the `noMeshes` flag, and in a session without mesh detection. */
  supported(): boolean {
    return !this.flags.noMeshes && this.frame?.session.enabledFeatures?.includes('mesh-detection') === true;
  }

  /**
   * This frame's meshes that have a pose; none when unsupported. Never throws. `vertices` and `indices` are the
   * platform's own arrays, not copies, and their numbers are not checked here. Not for every frame of a session.
   */
  read(): RoomMesh[] {
    const meshes: RoomMesh[] = [];
    if (!this.supported()) return meshes;
    try {
      for (const mesh of this.frame!.detectedMeshes ?? []) {
        const { semanticLabel: label = '', vertices, indices } = mesh;
        const pose = this.frame!.getPose(mesh.meshSpace, this.space!)?.transform.matrix;
        if (pose?.length === 16) meshes.push({ label, pose, vertices, indices });
      }
    } catch (error) {
      // A frame read outside its own callback throws (WebXR).
      if (!this.hasLoggedReadFailure) log.warn('room', 'mesh read failed', error);
      this.hasLoggedReadFailure = true;
    }
    return meshes;
  }
}
