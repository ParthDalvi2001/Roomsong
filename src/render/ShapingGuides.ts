// The guides of a plant being shaped (UX §3.4): the scale ladder of a pull, five faint rings round the plant at
// the heights of its range, and the dimmed rim of a drag past the bed's outer edge. One InstancedMesh of a flat
// ring whose inner edge each instance sets: one draw call while any of it shows, none otherwise. PlantRenderer
// owns it and drives it; it reads no clock and listens to nothing. update allocates nothing.
import { Color, InstancedBufferAttribute, InstancedMesh, Matrix4, RingGeometry, ShaderMaterial } from 'three';

import { BED_OUTER } from '../garden/index.js';

import {
  BED_BASE_COLOUR,
  BED_LAYER_M,
  BED_RIM_M,
  CREAM,
  GUIDE_SEGMENTS,
  HOVER_CUE_MS,
  LADDER_ALPHA,
  LADDER_LINE_M,
  LADDER_MARKS,
  LADDER_RADIUS_M,
  PLANT_PINCH_LIFT_M,
  PLANT_STEM_MAX_M,
  PLANT_STEM_MIN_M,
  RIM_WARN_ALPHA,
  RIM_WARN_WIDTH_M,
} from './config.js';

import type { FlashGuard } from './FlashGuard.js';
import type { Vec2 } from '../core/index.js';
import type { Object3D } from 'three';

// The geometry's inner edge lies at half its radius; each instance moves it to its own share of the outer one.
const VERTEX = /* glsl */ `
attribute vec4 aColour;
attribute float aInner;
varying vec4 vColour;
void main() {
  vec3 p = position;
  if (length(p.xz) < 0.75) p.xz *= 2.0 * aInner;
  vColour = aColour;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
}`;
const FRAGMENT = /* glsl */ `
varying vec4 vColour;
void main() {
  gl_FragColor = vColour;
  #include <colorspace_fragment>
}`;

/** The elements are the left ladder, the right ladder and the rim; element e's first instance is e * LADDER_MARKS. */
const RIM = 2;
/** Outside the glass's edge, round the bed's centre (UX §3.4: the rim dims). */
const RIM_INNER_M = BED_OUTER + BED_RIM_M;
const RIM_OUTER_M = RIM_INNER_M + RIM_WARN_WIDTH_M;
// Places in the frame array PlantRenderer hands to update: the frame time, and the milliseconds since the last.
const NOW = 0;
const PASSED = 1;
const matrix = new Matrix4();

export class ShapingGuides {
  readonly mesh: InstancedMesh<RingGeometry, ShaderMaterial>;
  private readonly firstElement: number;
  private readonly colours: InstancedBufferAttribute;
  /** Per element: wanted (1) or not (0); how far in it is, 0..1; the brightness the guard granted last. */
  private readonly wanted = new Uint8Array(3);
  private readonly level = new Float64Array(3);
  private readonly granted = new Float64Array(3);
  private readonly alphaOf = new Float64Array([LADDER_ALPHA, LADDER_ALPHA, RIM_WARN_ALPHA]);

  constructor(
    parent: Object3D,
    private readonly guard: FlashGuard,
  ) {
    this.firstElement = guard.claim(3);
    const geometry = new RingGeometry(0.5, 1, GUIDE_SEGMENTS, 1).rotateX(-Math.PI / 2);
    const count = 2 * LADDER_MARKS + 1;
    this.colours = new InstancedBufferAttribute(new Float32Array(count * 4), 4);
    const inner = new InstancedBufferAttribute(new Float32Array(count), 1);
    geometry.setAttribute('aColour', this.colours);
    geometry.setAttribute('aInner', inner);
    // Faint cream rings (UX §5 palette); the rim in the bed's own charcoal, so it reads as the glass going dark.
    for (let i = 0; i < count; i++) {
      const isRim = i === RIM * LADDER_MARKS;
      new Color(isRim ? BED_BASE_COLOUR : CREAM).toArray(this.colours.array, i * 4);
      inner.array[i] = isRim ? RIM_INNER_M / RIM_OUTER_M : 1 - LADDER_LINE_M / LADDER_RADIUS_M;
    }
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
    });
    material.depthWrite = false;
    this.mesh = new InstancedMesh(geometry, material, count);
    matrix.makeScale(RIM_OUTER_M, 1, RIM_OUTER_M).setPosition(0, 2 * BED_LAYER_M, 0); // over the markers
    this.mesh.setMatrixAt(RIM * LADDER_MARKS, matrix);
    this.mesh.visible = false;
    this.mesh.frustumCulled = false; // its bounds are one unit ring at the bed centre
    this.mesh.renderOrder = 3; // after the bed's glass, its markers and the tide, like the petals
    this.mesh.matrixAutoUpdate = false;
    parent.add(this.mesh);
  }

  /**
   * Set-up, when a pull starts and when it ends: the ladder of that hand (0 left, 1 right) round the cell centre
   * `at` (bed-local, D-029), a ring where the stem would end at each step of its height; null fades it out where
   * it stands.
   */
  setLadder(hand: number, at: Vec2 | null): void {
    this.wanted[hand] = at === null ? 0 : 1;
    if (at === null) return;
    // Straight into the buffer, whose instances start as identity: a fraction handed to a Matrix4 setter is boxed
    // when V8 does not inline the setter, 240 bytes a pull in a loaded full-suite run (T-147 review).
    const e = this.mesh.instanceMatrix.array;
    for (let k = 0; k < LADDER_MARKS; k++) {
      const i = (hand * LADDER_MARKS + k) * 16;
      e[i] = e[i + 10] = LADDER_RADIUS_M; // a flat ring, scaled in its own plane
      e[i + 12] = at.x;
      e[i + 13] =
        PLANT_PINCH_LIFT_M +
        PLANT_STEM_MIN_M +
        ((PLANT_STEM_MAX_M - PLANT_STEM_MIN_M) * k) / (LADDER_MARKS - 1);
      e[i + 14] = at.y;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Set-up, when a dragged plant crosses the outer edge (UX §3.4): the rim dims while `isOn`. */
  setRim(isOn: boolean): void {
    this.wanted[RIM] = isOn ? 1 : 0;
  }

  /**
   * Per frame, creates nothing: each guide fades in or out over HOVER_CUE_MS through the flash cap (FR-UI-11), a
   * level, never a blink. `frame` is PlantRenderer's: the frame time and the milliseconds since the last frame.
   */
  update(frame: Float64Array): void {
    const moved = frame[PASSED]! / HOVER_CUE_MS;
    let isShown = false;
    for (let e = 0; e < 3; e++) {
      const level = this.level[e]!;
      if (this.wanted[e]) {
        if (level < 1) this.level[e] = Math.min(1, level + moved);
      } else if (level > 0) this.level[e] = Math.max(0, level - moved);
      if (this.level[e] === 0 && this.granted[e] === 0) continue; // at rest and off: the guard is not asked
      this.granted[e] = this.guard.request(this.firstElement + e, this.level[e]!, frame[NOW]!);
      this.paint(e);
      if (this.granted[e]! > 0) isShown = true;
    }
    if (this.mesh.visible !== isShown) this.mesh.visible = isShown;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }

  /** Writes an element's opacity into its instances: a ladder's rings, or the rim. */
  private paint(element: number): void {
    const alpha = this.colours.array;
    const first = element * LADDER_MARKS;
    const end = element === RIM ? first + 1 : first + LADDER_MARKS;
    for (let i = first; i < end; i++) alpha[i * 4 + 3] = this.granted[element]! * this.alphaOf[element]!;
    this.colours.needsUpdate = true;
  }
}
