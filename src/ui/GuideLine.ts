// D-089 (Parth, 12 Nov: "show all the tutorial with dotted navigation arrows"): the guide's navigation arrow, a row
// of dots along an arc from where to act to where to let go, flowing that way, an arrowhead there. Procedural, two
// draw calls (the dots, the head). Per frame only matrices and fields are written: nothing is created. Whole
// thousandths and millimetres are handed in, never fractions: a fraction handed to a call that V8 does not inline
// is boxed (Hints.ts, onboarding.heap.test.ts).
import {
  ConeGeometry,
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

const UP = new Vector3(0, 1, 0);

/** The navigation arrow: one material, its colour and opacity set by Hints. */
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
