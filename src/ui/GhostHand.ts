// D-087 (Parth, 12 Nov: "advance tutorial with ghost hand and guiding lines/arrows"): the guide's ghost hands and its
// guide line. Procedural and original (Golden Rule 8): a hand of the 25 WebXR joints by forward kinematics from a
// few lengths of an adult hand, no model file, no captured pose. Both hands in two instanced draws (joints, bones),
// the line in two more (its dots, its arrowhead). Per frame only matrices are written: nothing is created.
import {
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
  type Object3D,
} from '@iwsdk/core';

import { GUIDE_DOT_M, GUIDE_DOTS, GUIDE_HEAD_M, HINT_RENDER_ORDER } from './config.js';

const JOINTS = 25;
/** The bones as pairs of joint indices, in the WebXR order: wrist, thumb 1..4, then index, middle, ring, pinky 5 each. */
const BONES: readonly number[] = [1, 5, 10, 15, 20].flatMap((root) => {
  const pairs = [0, root];
  for (let j = root; j < (root === 1 ? 4 : root + 4); j++) pairs.push(j, j + 1);
  return pairs;
});
/**
 * A right hand, palm down, fingers along -Z, the thumb towards -X, in metres from the wrist. Per finger (index to
 * pinky): the metacarpal joint (x, z), the knuckle (x, z), the three phalanges' lengths.
 */
const FINGERS = [
  [-0.022, -0.025, -0.026, -0.092, 0.04, 0.024, 0.021],
  [-0.004, -0.025, -0.006, -0.095, 0.044, 0.027, 0.023],
  [0.012, -0.024, 0.013, -0.09, 0.041, 0.025, 0.022],
  [0.026, -0.022, 0.031, -0.081, 0.032, 0.02, 0.019],
] as const;
/** The curl of each finger joint at a full pinch, radians: the index meets the thumb, the others rest half closed. */
const CURL_INDEX = [0.9, 0.9, 0.5] as const;
const CURL_REST = [0.35, 0.4, 0.3] as const;
/** The thumb's metacarpal, proximal, distal and tip joints, open; and the proximal joint at a full pinch. */
const THUMB = [
  -0.024, -0.008, -0.03, -0.045, -0.014, -0.052, -0.058, -0.016, -0.083, -0.064, -0.017, -0.106,
] as const;
const THUMB_PINCHED = [-0.04, -0.03, -0.06] as const;
/** A joint's radius: the wrist, a joint, a fingertip; and a bone's. */
const WRIST_M = 0.012;
const JOINT_M = 0.0075;
const TIP_M = 0.006;
const BONE_M = 0.0055;
const isTip = (j: number): boolean => j === 4 || (j > 4 && (j - 4) % 5 === 0);
const UP = new Vector3(0, 1, 0);

/**
 * The 25 joints of a hand `permille` thousandths of the way to a pinch (0 open, 1000 the thumb tip on the index
 * tip), hand-local, into `out` (x, y, z each); the left hand is the right one mirrored. Creates nothing. Whole
 * thousandths, not a fraction: a fraction handed to a call that V8 does not inline is boxed (Hints.ts).
 */
export function ghostJoints(permille: number, isLeft: boolean, out: Float32Array): Float32Array {
  const pinch = permille / 1000;
  out[0] = out[1] = out[2] = 0; // the wrist
  for (let f = 0; f < 4; f++) {
    const finger = FINGERS[f]!; // indexed, not destructured: destructuring makes an iterator a call
    const curl = f === 0 ? CURL_INDEX : CURL_REST;
    const at = 3 * (5 + 5 * f);
    out[at] = finger[0];
    out[at + 1] = 0;
    out[at + 2] = finger[1];
    out[at + 3] = finger[2];
    out[at + 4] = 0;
    out[at + 5] = finger[3];
    let angle = 0;
    for (let k = 0; k < 3; k++) {
      angle += pinch * curl[k]!;
      const length = finger[4 + k]!;
      const from = at + 3 * (k + 1);
      out[from + 3] = out[from]!;
      out[from + 4] = out[from + 1]! - length * Math.sin(angle);
      out[from + 5] = out[from + 2]! - length * Math.cos(angle);
    }
  }
  // The thumb: its base still, its proximal joint lowered, its tip to the index tip, its distal joint between.
  for (let i = 0; i < 12; i++) out[3 + i] = THUMB[i]!;
  for (let i = 0; i < 3; i++) {
    out[6 + i] = THUMB[3 + i]! + pinch * (THUMB_PINCHED[i]! - THUMB[3 + i]!);
    out[12 + i] = THUMB[9 + i]! + pinch * (out[3 * 9 + i]! - THUMB[9 + i]!);
    const middle = 0.5 * (out[6 + i]! + out[12 + i]!) + (i === 0 ? -0.008 : 0); // bowed out, away from the palm
    out[9 + i] = THUMB[6 + i]! + pinch * (middle - THUMB[6 + i]!);
  }
  if (isLeft) for (let j = 0; j < JOINTS; j++) out[3 * j] = -out[3 * j]!;
  return out;
}

/** Where a full pinch holds things, hand-local: the index tip at pinch 1. Writes `out`. */
export function pinchPoint(isLeft: boolean, out: Vector3): Vector3 {
  const joints = ghostJoints(1000, isLeft, new Float32Array(3 * JOINTS));
  return out.set(joints[27]!, joints[28]!, joints[29]!);
}

/** The guide's two ghost hands: one shared material, its colour and opacity set by Hints. */
export class GhostHands {
  readonly material = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  readonly joints: InstancedMesh;
  readonly bones: InstancedMesh;
  /** Where each hand pinches, hand-local (right, left): a hand is placed by it. */
  readonly pinchAt = [pinchPoint(false, new Vector3()), pinchPoint(true, new Vector3())] as const;
  private readonly local = new Float32Array(3 * JOINTS);
  private readonly world = Array.from({ length: JOINTS }, () => new Vector3());
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly v = new Vector3();
  private readonly s = new Vector3(BONE_M, 1, BONE_M);
  /** A joint's size: the wrist's, a fingertip's, any other's. */
  private readonly wristSize = new Vector3(WRIST_M, WRIST_M, WRIST_M);
  private readonly tipSize = new Vector3(TIP_M, TIP_M, TIP_M);
  private readonly jointSize = new Vector3(JOINT_M, JOINT_M, JOINT_M);

  constructor(parent: Object3D) {
    this.joints = new InstancedMesh(new IcosahedronGeometry(1, 1), this.material, 2 * JOINTS);
    this.bones = new InstancedMesh(new CylinderGeometry(1, 1, 1, 8, 1, true), this.material, BONES.length); // 2 x 24
    for (const mesh of [this.joints, this.bones]) {
      mesh.name = 'guide-ghost';
      mesh.visible = false;
      mesh.frustumCulled = false; // drawn wherever the guide puts it
      mesh.matrixAutoUpdate = false; // in world space: the parent is the scene
      mesh.renderOrder = HINT_RENDER_ORDER;
      parent.add(mesh);
    }
  }

  /** Hand `slot` (0 or 1), `permille` of the way to a pinch, its wrist at `at` (world), turned by `turn`. */
  pose(slot: number, permille: number, isLeft: boolean, at: Vector3, turn: Quaternion): void {
    ghostJoints(permille, isLeft, this.local);
    const world = this.world;
    for (let j = 0; j < JOINTS; j++) {
      const p = world[j]!.set(this.local[3 * j]!, this.local[3 * j + 1]!, this.local[3 * j + 2]!);
      p.applyQuaternion(turn).add(at);
      const size = j === 0 ? this.wristSize : isTip(j) ? this.tipSize : this.jointSize;
      this.joints.setMatrixAt(slot * JOINTS + j, this.m.compose(p, this.q.identity(), size));
    }
    const bones = BONES.length / 2; // a hand's: BONES holds two joints a bone
    for (let b = 0; b < bones; b++) {
      const from = world[BONES[2 * b]!]!;
      const dir = this.v.subVectors(world[BONES[2 * b + 1]!]!, from);
      // Fields written one by one: a fraction handed to a call that V8 does not inline is boxed (Hints.ts)
      const length = dir.length();
      const k = 1 / (length || 1);
      dir.x *= k;
      dir.y *= k;
      dir.z *= k;
      this.q.setFromUnitVectors(UP, dir);
      const half = length / 2;
      dir.x = from.x + dir.x * half;
      dir.y = from.y + dir.y * half;
      dir.z = from.z + dir.z * half;
      this.s.y = length;
      this.bones.setMatrixAt(slot * bones + b, this.m.compose(dir, this.q, this.s));
    }
  }

  /** `hands` of them are drawn this frame (0 hides both): the first `hands` posed. */
  show(hands: number): void {
    this.joints.count = hands * JOINTS;
    this.bones.count = (hands * BONES.length) / 2;
    this.joints.visible = this.bones.visible = hands > 0;
    if (hands === 0) return;
    this.joints.instanceMatrix.needsUpdate = true;
    this.bones.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const mesh of [this.joints, this.bones]) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.dispose();
    }
    this.material.dispose();
  }
}

/** The guide line: dots along an arc from where to pinch to where to let go, flowing that way, an arrowhead there. */
export class GuideLine {
  readonly material = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  readonly dots: InstancedMesh;
  readonly head: Mesh;
  private readonly a = new Vector3();
  private readonly b = new Vector3();
  /** The arc's control point: above the middle of a to b. */
  private readonly c = new Vector3();
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3(GUIDE_DOT_M, GUIDE_DOT_M, GUIDE_DOT_M);

  constructor(parent: Object3D) {
    this.dots = new InstancedMesh(new IcosahedronGeometry(1, 0), this.material, GUIDE_DOTS);
    this.head = new Mesh(new ConeGeometry(GUIDE_HEAD_M / 2.4, GUIDE_HEAD_M, 10), this.material);
    for (const mesh of [this.dots, this.head]) {
      mesh.name = 'guide-line';
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = HINT_RENDER_ORDER;
      parent.add(mesh);
    }
    this.dots.matrixAutoUpdate = false;
  }

  /** The arc from `a` to `b` (world), `liftMm` millimetres high at its middle. Creates nothing. */
  set(a: Vector3, b: Vector3, liftMm: number): void {
    this.a.copy(a);
    this.b.copy(b);
    this.c.addVectors(a, b).multiplyScalar(0.5);
    this.c.y += liftMm / 1000;
  }

  /** The point `permille` thousandths of the way along the arc, into `out`. */
  at(permille: number, out: Vector3): Vector3 {
    const t = permille / 1000;
    const u = 1 - t;
    const ka = u * u;
    const kc = 2 * u * t;
    const kb = t * t;
    const { a, b, c } = this;
    out.x = a.x * ka + c.x * kc + b.x * kb;
    out.y = a.y * ka + c.y * kc + b.y * kb;
    out.z = a.z * ka + c.z * kc + b.z * kb;
    return out;
  }

  /** Draws the dots `flow` thousandths of a gap on towards `b`, and the arrowhead at `b` along the arc. */
  draw(flow: number): void {
    for (let i = 0; i < GUIDE_DOTS; i++) {
      this.at(Math.round((1000 * i + flow) / (GUIDE_DOTS + 1)), this.p);
      this.dots.setMatrixAt(i, this.m.compose(this.p, this.q.identity(), this.s));
    }
    this.dots.instanceMatrix.needsUpdate = true;
    this.head.position.copy(this.b);
    this.head.quaternion.setFromUnitVectors(UP, this.p.subVectors(this.b, this.c).normalize());
  }

  show(on: boolean): void {
    this.dots.visible = this.head.visible = on;
  }

  dispose(): void {
    for (const mesh of [this.dots, this.head]) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    this.dots.dispose();
    this.material.dispose();
  }
}
