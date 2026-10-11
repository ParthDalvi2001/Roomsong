/// <reference types="webxr" />
// WebXR hit-test along the gaze → the point it meets (FR-ROOM-01 level 3). An optional session feature:
// `supported()` is false without it, and when the source cannot be made. The source is asked for once per
// session, on that session's first frame.
// Not seen on a headset: what a Quest's hit-test meets in a room without Space Setup is unverified.
import { log } from '../core/index.js';

import type { Vec3 } from '../core/index.js';

export class HitTestAdapter {
  private frame: XRFrame | null = null;
  private space: XRReferenceSpace | null = null;
  private session: XRSession | null = null;
  private source: XRHitTestSource | null = null;
  private hasFailed = false;

  /** In every XR frame, before `hit`: a frame can be read only inside its own callback. */
  setFrame(frame: XRFrame, space: XRReferenceSpace): void {
    this.frame = frame;
    this.space = space;
    if (frame.session === this.session) return;
    this.session = frame.session;
    this.source = null;
    this.hasFailed = false;
    if (this.supported()) void this.requestSource(frame.session);
  }

  /** False before the first frame, in a session without hit-test, and after the source could not be made. */
  supported(): boolean {
    return !this.hasFailed && this.session?.enabledFeatures?.includes('hit-test') === true;
  }

  /**
   * Where the gaze ray first meets the room this frame, in the reference space; null when it meets nothing or
   * the source is not ready. Never throws. The point is the platform's own object: copy what you keep.
   */
  hit(): Vec3 | null {
    if (this.source === null || this.frame === null || this.space === null) return null;
    try {
      return this.frame.getHitTestResults(this.source)[0]?.getPose(this.space)?.transform.position ?? null;
    } catch (error) {
      // A frame read outside its own callback throws (WebXR). One failure ends level 3 for the session.
      this.fail(error);
      return null;
    }
  }

  /** The ray is the viewer's own -z: where the head points. */
  private async requestSource(session: XRSession): Promise<void> {
    try {
      const viewer = await session.requestReferenceSpace('viewer');
      const source = await session.requestHitTestSource?.({ space: viewer });
      if (session !== this.session) return; // another session began meanwhile
      if (source === undefined) this.fail('no hit-test source');
      else this.source = source;
    } catch (error) {
      if (session === this.session) this.fail(error);
    }
  }

  private fail(reason: unknown): void {
    this.hasFailed = true;
    this.source = null;
    log.warn('room', 'hit-test unavailable', reason);
  }
}
