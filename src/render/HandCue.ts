/// <reference types="webxr" />
// The capture rig's hand cue (T-175; VIDEO_SCRIPT_V0 §3.2 item 1; API_SPEC §3 `handCue`). The app draws no hand
// (D-027: passthrough shows the real one), so an emulator take shows seeds moving on their own. With the flag, the
// hands' 25 joints are drawn as plain dots and the bones between them as lines, for the judge video only.
// Dev builds only: app.ts loads this file through render's `loadHandCue` under import.meta.env.DEV, so a production
// build holds none of it (scripts/check-dist.mjs fails one that does). Procedural, nothing fetched. One InstancedMesh
// and one LineSegments, made at once; per frame it writes positions and creates nothing. One constant colour: a level
// that never swings, so no FlashGuard element (FR-UI-11 counts luminance changes; a dot is there or not with its hand).
import { createSystem } from '@iwsdk/core';
import {
  BufferAttribute,
  BufferGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  MeshBasicMaterial,
} from 'three';

import { flags as appFlags } from '../core/index.js';

import {
  CREAM,
  HAND_CUE_BONE_OPACITY,
  HAND_CUE_DOT_DETAIL,
  HAND_CUE_DOT_RADIUS_M,
  HAND_CUE_HANDS,
} from './config.js';

import type { Flags } from '../core/index.js';
import type { Object3D } from 'three';

/** The 25 joints of WebXR Hand Input, in its order: the wrist, then each finger from its root to its tip. */
const FINGERS = ['thumb', 'index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'] as const;
export const JOINTS: readonly XRHandJoint[] = [
  'wrist',
  'thumb-metacarpal',
  'thumb-phalanx-proximal',
  'thumb-phalanx-distal',
  'thumb-tip',
  ...FINGERS.slice(1).flatMap((finger) =>
    ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'].map(
      (bone) => `${finger}-${bone}` as XRHandJoint,
    ),
  ),
];
/** The 24 bones, as pairs of indices into JOINTS: the wrist to each finger's root, then along the finger. */
const CHAINS = [
  [1, 4],
  [5, 9],
  [10, 14],
  [15, 19],
  [20, 24],
] as const;
export const BONES: readonly number[] = CHAINS.flatMap(([root, tip]) => {
  const pairs = [0, root];
  for (let joint = root; joint < tip; joint++) pairs.push(joint, joint + 1);
  return pairs;
});
/** A column-major 4 x 4 matrix keeps its translation at 12..14. */
const POSITION = 12;

/** One hand between frames: the XRHand last read and its joint spaces, fetched again only for a new XRHand. */
class Track {
  hand: XRHand | null = null;
  readonly spaces: XRJointSpace[] = [];
  readonly poses = new Float32Array(16 * JOINTS.length);
}

export class HandCue {
  readonly dots: InstancedMesh<IcosahedronGeometry, MeshBasicMaterial>;
  readonly bones: LineSegments<BufferGeometry, LineBasicMaterial>;
  private readonly positions: BufferAttribute;
  private readonly left = new Track();
  private readonly right = new Track();

  constructor(parent: Object3D) {
    const material = new MeshBasicMaterial({ color: CREAM, toneMapped: false });
    this.dots = new InstancedMesh(
      new IcosahedronGeometry(HAND_CUE_DOT_RADIUS_M, HAND_CUE_DOT_DETAIL),
      material,
      HAND_CUE_HANDS * JOINTS.length,
    );
    this.dots.name = 'hand-cue'; // scripts/check-dist.mjs looks for this name: a production build must not hold it
    this.positions = new BufferAttribute(new Float32Array(HAND_CUE_HANDS * BONES.length * 3), 3);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.positions);
    this.bones = new LineSegments(
      geometry,
      new LineBasicMaterial({
        color: CREAM,
        transparent: true,
        opacity: HAND_CUE_BONE_OPACITY,
        toneMapped: false,
      }),
    );
    for (const mesh of [this.dots, this.bones]) {
      mesh.visible = false;
      mesh.frustumCulled = false; // drawn wherever the hands are
      mesh.matrixAutoUpdate = false; // in world space: the parent is the scene
      parent.add(mesh);
    }
  }

  /**
   * Per frame, creates nothing: each tracked hand's joints by one fillPoses into its dots and bones. No frame, no
   * reference space, no hand or a hand without all 25 poses draws nothing for it.
   */
  update(
    frame: XRFrame | null,
    space: XRReferenceSpace | null,
    sources: ArrayLike<XRInputSource> | undefined,
  ): void {
    let drawn = 0;
    // shortcut: fillPoses only (IWER, Chromium and Quest Browser ship it; HandSampler keeps a getJointPose fallback).
    if (frame !== null && space !== null && sources !== undefined && frame.fillPoses !== undefined) {
      for (let i = 0; i < sources.length && drawn < HAND_CUE_HANDS; i++) {
        const source = sources[i]!;
        const hand = source.hand;
        if (!hand) continue; // a controller has no joints
        const track = source.handedness === 'left' ? this.left : this.right;
        if (track.hand !== hand) this.refetch(track, hand);
        if (track.spaces.length < JOINTS.length || !frame.fillPoses(track.spaces, space, track.poses))
          continue;
        this.write(drawn, track.poses);
        drawn++;
      }
    }
    this.dots.count = drawn * JOINTS.length;
    this.bones.geometry.setDrawRange(0, drawn * BONES.length);
    this.dots.visible = this.bones.visible = drawn > 0;
    if (drawn === 0) return;
    this.dots.instanceMatrix.needsUpdate = true;
    this.positions.needsUpdate = true;
  }

  dispose(): void {
    for (const mesh of [this.dots, this.bones]) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.dots.dispose();
  }

  private refetch(track: Track, hand: XRHand): void {
    track.hand = hand;
    track.spaces.length = 0;
    for (const joint of JOINTS) {
      const jointSpace = hand.get(joint);
      if (jointSpace) track.spaces.push(jointSpace);
    }
  }

  /** Hand `slot`'s joints from `poses` into its dots (a translation each) and its bones (two points each). */
  private write(slot: number, poses: Float32Array): void {
    const matrices = this.dots.instanceMatrix.array;
    for (let joint = 0; joint < JOINTS.length; joint++) {
      const at = 16 * (slot * JOINTS.length + joint); // InstancedMesh starts each at identity: only its place moves
      matrices[at + POSITION] = poses[16 * joint + POSITION]!;
      matrices[at + POSITION + 1] = poses[16 * joint + POSITION + 1]!;
      matrices[at + POSITION + 2] = poses[16 * joint + POSITION + 2]!;
    }
    const points = this.positions.array;
    for (let end = 0; end < BONES.length; end++) {
      const from = 16 * BONES[end]! + POSITION;
      const to = 3 * (slot * BONES.length + end);
      points[to] = poses[from]!;
      points[to + 1] = poses[from + 1]!;
      points[to + 2] = poses[from + 2]!;
    }
  }
}

/** The cue when Flags.handCue is on (API_SPEC §3), else null and nothing added to `parent`. */
export function createHandCue(parent: Object3D, f: Flags = appFlags): HandCue | null {
  return f.handCue ? new HandCue(parent) : null;
}

/** T-175: draws the cue in world space every frame of a session; app.ts registers it in dev builds only. */
export class HandCueSystem extends createSystem({}) {
  private cue: HandCue | null = null;

  override init(): void {
    this.cue = createHandCue(this.scene);
  }

  override update(): void {
    this.cue?.update(
      this.xrFrame,
      this.xrManager.getReferenceSpace(),
      this.xrManager.getSession()?.inputSources,
    );
  }
}
