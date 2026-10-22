/// <reference types="webxr" />
// WebXR hand joints and select events → HandFrame (LLD §4, API_SPEC §1.4). Raw joints only: no IWSDK grab, no
// controller path (FR-HND-01). IWER's emulated hands arrive through the same API and need no adapter.
// Not seen on a headset: whether Quest Browser sends selectstart/selectend for a hand pinch is unverified
// (FR-HND-02), so a session that has sent none for a hand reports select = pinch (LLD §4).
import { Vector3 } from '@iwsdk/core';

import { log } from '../core/index.js';

import {
  ONE_EURO_BETA,
  ONE_EURO_D_CUTOFF_HZ,
  ONE_EURO_MIN_CUTOFF_HZ,
  PALM_REST_OFFSET_M,
  PINCH_LOCKOUT_MS,
} from './config.js';
import { OneEuroFilter } from './OneEuroFilter.js';
import { PinchMachine } from './poses/pinch.js';

import type { HandFrame, InputSource } from './InputSource.js';
import type { Hand, Vec3 } from '../core/index.js';

declare global {
  interface XRFrame {
    /** WebXR Hand Input: each space's pose as a 4 x 4 matrix in one call; false if one has none. Not in @types/webxr. */
    fillPoses?(spaces: XRSpace[], baseSpace: XRSpace, transforms: Float32Array): boolean;
  }
}

const axisFilter = () => new OneEuroFilter(ONE_EURO_MIN_CUTOFF_HZ, ONE_EURO_BETA, ONE_EURO_D_CUTOFF_HZ);

/** The joints read each frame, in the order of their matrices in `Track.poses`. */
const JOINTS: readonly XRHandJoint[] = [
  'thumb-tip',
  'index-finger-tip',
  'wrist',
  'index-finger-phalanx-proximal',
  'pinky-finger-phalanx-proximal',
];
/** A column-major 4 x 4 matrix keeps its translation at 12..14. */
const POSITION = 12;
// Scratch for one read: `sample` runs to the end before the next one starts.
const thumb = new Vector3();
const index = new Vector3();
const wrist = new Vector3();
const indexKnuckle = new Vector3();
const pinkyKnuckle = new Vector3();

/** One hand between frames. `detach` replaces it, so nothing held in one session reaches the next. */
class Track {
  /** The XRHand last read, and its JOINTS spaces (fewer if it lacks one): fetched again only for a new XRHand. */
  joints: XRHand | null = null;
  readonly spaces: XRJointSpace[] = [];
  /** This frame's JOINTS poses: one matrix each, written by fillPoses or, without it, by getJointPose. */
  readonly poses = new Float32Array(16 * JOINTS.length);
  tracked = false;
  lastMs = 0;
  readonly pinch = new PinchMachine();
  readonly x = axisFilter();
  readonly y = axisFilter();
  readonly z = axisFilter();
  /** Between selectstart and selectend. */
  down = false;
  /** A selectstart since the last sample: a tap that starts and ends between two frames is still reported. */
  tapped = false;
  select = false;
  selectReleasedAt = -Infinity;
}

/**
 * Palm normal and rest point from three joints that move with the palm: the normal is (wrist → index knuckle) x
 * (wrist → pinky knuckle), mirrored for the left hand, so it points out of the palm on both. Positions only: no
 * joint-orientation convention is relied on. False, with nothing written, for a flat or non-finite triangle.
 */
function writePalm(out: HandFrame, wrist: Vec3, index: Vec3, pinky: Vec3): boolean {
  const ax = index.x - wrist.x;
  const ay = index.y - wrist.y;
  const az = index.z - wrist.z;
  const bx = pinky.x - wrist.x;
  const by = pinky.y - wrist.y;
  const bz = pinky.z - wrist.z;
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;
  // Math.sqrt, not Math.hypot: hypot allocates on every call in V8 (HandSampler.test.ts measures it)
  const length = Math.sqrt(nx * nx + ny * ny + nz * nz) * (out.hand === 'right' ? 1 : -1);
  if (!Number.isFinite(length) || length === 0) return false;
  const normal = out.palmNormal;
  normal.x = nx / length;
  normal.y = ny / length;
  normal.z = nz / length;
  out.palmPos.x = (wrist.x + index.x + pinky.x) / 3 + normal.x * PALM_REST_OFFSET_M;
  out.palmPos.y = (wrist.y + index.y + pinky.y) / 3 + normal.y * PALM_REST_OFFSET_M;
  out.palmPos.z = (wrist.z + index.z + pinky.z) / 3 + normal.z * PALM_REST_OFFSET_M;
  return true;
}

export class HandSampler implements InputSource {
  readonly hands: readonly Hand[] = ['left', 'right'];
  private left = new Track();
  private right = new Track();
  private session: XRSession | null = null;
  private frame: XRFrame | null = null;
  private space: XRReferenceSpace | null = null;
  /**
   * This session has sent a selectstart for a hand, so `select` follows the platform for both hands. Until
   * then `select` = `pinch` (LLD §4: the fallback is per session, not per hand).
   */
  private hasPlatformSelect = false;
  private hasLoggedReadFailure = false;

  private readonly onSelect = (event: XRInputSourceEvent): void => {
    const source = event.inputSource;
    if (!source.hand) return; // hands only (FR-HND-01)
    const track =
      source.handedness === 'left' ? this.left : source.handedness === 'right' ? this.right : null;
    if (track === null) return;
    this.hasPlatformSelect = true;
    track.down = event.type === 'selectstart';
    if (track.down) track.tapped = true;
  };

  /** On `xr:sessionStart`: listens for the session's select events. */
  attach(session: XRSession): void {
    this.detach();
    this.session = session;
    session.addEventListener('selectstart', this.onSelect);
    session.addEventListener('selectend', this.onSelect);
  }

  /**
   * On `xr:sessionEnd`. Forgets all it held: a pinch or a select that never ended, the filters and the select
   * fallback must not reach the next session.
   */
  detach(): void {
    this.session?.removeEventListener('selectstart', this.onSelect);
    this.session?.removeEventListener('selectend', this.onSelect);
    this.session = null;
    this.frame = null;
    this.space = null;
    this.left = new Track();
    this.right = new Track();
    this.hasPlatformSelect = false;
    this.hasLoggedReadFailure = false;
  }

  /** In every XR frame, before `sample`: a frame can be read only inside its own callback. */
  setFrame(frame: XRFrame, space: XRReferenceSpace): void {
    this.frame = frame;
    this.space = space;
  }

  /**
   * Fills `out` for this frame and never throws. Creates no objects; V8 may still box numbers (measured in
   * HandSampler.test.ts). An untracked sample leaves the four vectors as they were and keeps `pinch` and `select`
   * as held; the select events that arrive meanwhile count at the first tracked sample.
   */
  sample(hand: Hand, timeMs: number, out: HandFrame): void {
    const track = hand === 'left' ? this.left : this.right;
    out.hand = hand;
    let tracked = false;
    try {
      const joints = this.jointsOf(hand);
      tracked = joints !== null && this.read(joints, track, timeMs, out);
    } catch (error) {
      // A frame read outside its own callback throws (WebXR). The frame loop goes on with an untracked hand.
      if (!this.hasLoggedReadFailure) log.error('hands', 'E_HANDS_UNAVAILABLE', error);
      this.hasLoggedReadFailure = true;
    }
    if (track.tracked && !tracked) track.pinch.lost();
    track.tracked = tracked;
    out.tracked = tracked;
    out.pinch = track.pinch.isPinching;
    // Held while untracked, as `pinch` is: a platform that ends the select when the input source drops for a
    // frame must not release what the hand still holds when it is back (FR-HND-15). Not seen on a headset.
    out.select = tracked ? this.selectOf(track, timeMs) : track.select;
  }

  private jointsOf(hand: Hand): XRHand | null {
    const sources = this.session?.inputSources;
    if (sources === undefined || this.frame === null || this.space === null) return null;
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i]!;
      if (source.hand && source.handedness === hand) return source.hand; // a controller has no joints
    }
    return null;
  }

  /**
   * This frame's JOINTS poses into `track.poses`: one fillPoses call, which creates nothing (a getJointPose per
   * joint makes a new pose each). False: a joint has no pose, or the hand lacks one. Unverified on a headset (T-129).
   */
  private fill(joints: XRHand, track: Track): boolean {
    if (track.joints !== joints) {
      track.joints = joints;
      track.spaces.length = 0;
      for (const joint of JOINTS) {
        const space = joints.get(joint);
        if (space) track.spaces.push(space);
      }
    }
    if (track.spaces.length < JOINTS.length) return false;
    const frame = this.frame!;
    if (frame.fillPoses) return frame.fillPoses(track.spaces, this.space!, track.poses);
    // shortcut: no browser we know lacks fillPoses (Quest Browser and Chromium ship it); drop this fallback after the device run (T-129).
    for (let k = 0; k < JOINTS.length; k++) {
      const position = frame.getJointPose?.(track.spaces[k]!, this.space!)?.transform.position;
      if (!position) return false;
      track.poses[16 * k + POSITION] = position.x;
      track.poses[16 * k + POSITION + 1] = position.y;
      track.poses[16 * k + POSITION + 2] = position.z;
    }
    return true;
  }

  /**
   * The pinch point, the pinch and the palm from this frame's joints. False = not tracked, nothing written. All
   * five joints are read before anything is written, so a read that throws leaves `out` untouched too.
   */
  private read(joints: XRHand, track: Track, timeMs: number, out: HandFrame): boolean {
    if (!this.fill(joints, track)) return false;
    const poses = track.poses;
    thumb.fromArray(poses, POSITION);
    index.fromArray(poses, 16 + POSITION);
    wrist.fromArray(poses, 32 + POSITION);
    indexKnuckle.fromArray(poses, 48 + POSITION);
    pinkyKnuckle.fromArray(poses, 64 + POSITION);
    // The pinch point is midway between the two tips. A pose with NaN in it counts as no pose.
    const x = (thumb.x + index.x) / 2;
    const y = (thumb.y + index.y) / 2;
    const z = (thumb.z + index.z) / 2;
    if (!Number.isFinite(x + y + z) || !writePalm(out, wrist, indexKnuckle, pinkyKnuckle)) return false;
    if (!track.tracked) {
      // FR-HND-03: a hand that was lost starts from where it is now, not from where it was.
      track.x.reset();
      track.y.reset();
      track.z.reset();
    }
    const dtS = (timeMs - track.lastMs) / 1000;
    track.lastMs = timeMs;
    out.pinchPos.x = track.x.filter(x, dtS);
    out.pinchPos.y = track.y.filter(y, dtS);
    out.pinchPos.z = track.z.filter(z, dtS);
    out.velocity.x = track.x.speed;
    out.velocity.y = track.y.speed;
    out.velocity.z = track.z.speed;
    const gx = thumb.x - index.x;
    const gy = thumb.y - index.y;
    const gz = thumb.z - index.z;
    track.pinch.update(Math.sqrt(gx * gx + gy * gy + gz * gz), timeMs);
    return true;
  }

  /** The tap signal (FR-HND-02): the platform's select with our lockout, and no hysteresis or debounce of ours. */
  private selectOf(track: Track, timeMs: number): boolean {
    const down = this.hasPlatformSelect ? track.down || track.tapped : track.pinch.isPinching;
    track.tapped = false;
    if (track.select && !down) track.selectReleasedAt = timeMs;
    track.select = down && (track.select || timeMs - track.selectReleasedAt >= PINCH_LOCKOUT_MS);
    return track.select;
  }
}
