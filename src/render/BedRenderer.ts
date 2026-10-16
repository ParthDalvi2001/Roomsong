// The bed (FR-MUS-01, UX §2 and §5): an annulus of charcoal glass with its five pitch rings drawn as lines, and
// a marker on each of the 80 cells. Two draw calls: the glass and its ring lines are one shader on one mesh,
// the markers are one InstancedMesh. The glass never changes. A marker is drawn stronger while a hand hovers its
// cell (FR-HND-16): that is the cue for where a release will land, a per-instance strength through the flash cap.
import {
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  RingGeometry,
  ShaderMaterial,
} from 'three';

import { BED_INNER, BED_OUTER, cellCentre, RINGS, STEPS } from '../garden/index.js';

import {
  BED_BASE_ALPHA,
  BED_BASE_COLOUR,
  BED_LAYER_M,
  BED_RIM_M,
  BED_SEGMENTS,
  CREAM,
  GUIDE_LINE_ALPHA,
  GUIDE_LINE_M,
  HOVER_CUE_MS,
  ICE,
  MARKER_ALPHA,
  MARKER_HOVER_ALPHA,
  MARKER_LINE_M,
  MARKER_RADIUS_M,
  MARKER_SEGMENTS,
} from './config.js';
import { FlashGuard } from './FlashGuard.js';

import type { Hand } from '../core/index.js';
import type { Cell } from '../garden/index.js';
import type { Object3D } from 'three';

/** A number as a GLSL float literal. */
const glsl = (value: number): string => value.toFixed(5);

/** The rule of audio's syncPlants (API_SPEC §1.2), so what is drawn is what sounds. */
export function onBed({ ring, step }: Cell): boolean {
  return (
    Number.isInteger(ring) && Number.isInteger(step) && ring >= 0 && ring < RINGS && step >= 0 && step < STEPS
  );
}

const VERTEX = /* glsl */ `
varying vec2 vBed;
void main() {
  vBed = position.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// The ring lines are drawn from the radius alone, so they stay sharp at any distance and cost no geometry.
const FRAGMENT = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uLine;
varying vec2 vBed;
void main() {
  float r = length(vBed);
  float ring = (r - ${glsl(BED_INNER)}) / ${glsl((BED_OUTER - BED_INNER) / (RINGS - 1))};
  float nearest = clamp(floor(ring + 0.5), 0.0, ${glsl(RINGS - 1)});
  float off = abs(ring - nearest) * ${glsl((BED_OUTER - BED_INNER) / (RINGS - 1))};
  float line = 1.0 - smoothstep(0.0, fwidth(r), off - ${glsl(GUIDE_LINE_M / 2)});
  float rim = smoothstep(${glsl(BED_INNER - BED_RIM_M)}, ${glsl(BED_INNER - BED_RIM_M / 2)}, r)
    * (1.0 - smoothstep(${glsl(BED_OUTER + BED_RIM_M / 2)}, ${glsl(BED_OUTER + BED_RIM_M)}, r));
  float alpha = mix(${glsl(BED_BASE_ALPHA)}, ${glsl(GUIDE_LINE_ALPHA)}, line) * rim;
  gl_FragColor = vec4(mix(uBase, uLine, line), alpha);
  #include <colorspace_fragment>
}`;

// A marker's strength is its alpha, one number per instance: what the FlashGuard last handed out for it.
const MARKER_VERTEX = /* glsl */ `
attribute float aStrength;
varying float vStrength;
void main() {
  vStrength = aStrength;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;

const MARKER_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
varying float vStrength;
void main() {
  gl_FragColor = vec4(uColour, vStrength);
  #include <colorspace_fragment>
}`;

const NO_CELL = -1;

export class BedRenderer {
  readonly base: Mesh<RingGeometry, ShaderMaterial>;
  readonly markers: InstancedMesh<RingGeometry, ShaderMaterial>;
  private readonly firstElement: number;
  /** Each marker's strength as drawn, and the same numbers as the shader gets them. */
  private readonly strength = new Float64Array(RINGS * STEPS).fill(MARKER_ALPHA);
  private readonly drawn = new InstancedBufferAttribute(
    new Float32Array(RINGS * STEPS).fill(MARKER_ALPHA),
    1,
  );
  /** The marker each hand hovers: left, right. */
  private readonly hovered = new Int8Array([NO_CELL, NO_CELL]);
  private lastMs = Number.NaN;
  private isAtRest = true;
  /** The level-3 ghost: every marker's target is 0 (UX §9.2). */
  private isGhost = false;

  /** `guard` is the page's FlashGuard; a page that passes none gets one of the bed's own (API_SPEC §1.8). */
  constructor(
    parent: Object3D,
    private readonly guard: FlashGuard = new FlashGuard(),
  ) {
    this.firstElement = guard.claim(RINGS * STEPS, MARKER_ALPHA);
    this.base = new Mesh(
      new RingGeometry(BED_INNER - BED_RIM_M, BED_OUTER + BED_RIM_M, BED_SEGMENTS).rotateX(-Math.PI / 2),
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: { uBase: { value: new Color(BED_BASE_COLOUR) }, uLine: { value: new Color(ICE) } },
        transparent: true,
        depthWrite: false,
      }),
    );

    // FR-HND-04: a cell marker is drawn 2.5 cm across, the size of a plant's foot, which covers it.
    this.markers = new InstancedMesh(
      new RingGeometry(MARKER_RADIUS_M - MARKER_LINE_M, MARKER_RADIUS_M, MARKER_SEGMENTS).rotateX(
        -Math.PI / 2,
      ),
      new ShaderMaterial({
        vertexShader: MARKER_VERTEX,
        fragmentShader: MARKER_FRAGMENT,
        uniforms: { uColour: { value: new Color(CREAM) } },
        transparent: true,
        depthWrite: false,
      }),
      RINGS * STEPS,
    );
    this.markers.name = 'bed-markers'; // tests find the markers by name: the beat ring is an instanced child of the bed too
    this.markers.geometry.setAttribute('aStrength', this.drawn);
    const matrix = new Matrix4();
    const centre = { x: 0, y: 0 };
    for (let ring = 0; ring < RINGS; ring++) {
      for (let step = 0; step < STEPS; step++) {
        cellCentre({ ring, step }, centre);
        // Bed-local (x, y) is the bed's x and z (D-029).
        this.markers.setMatrixAt(
          ring * STEPS + step,
          matrix.makeTranslation(centre.x, BED_LAYER_M, centre.y),
        );
      }
    }
    this.markers.frustumCulled = false; // its bounds are one marker's; the instances lie all over the bed
    this.markers.renderOrder = 1; // over the glass, under the tide
    for (const mesh of [this.base, this.markers]) {
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
  }

  /**
   * The level-3 ghost of UX §9.2: `true` fades the cell markers out, through the flash cap, and then stops
   * drawing them, which leaves the glass with its ring lines (1 draw call). `false` draws them again at once and
   * fades them in. The fades are `update`'s.
   */
  setGhost(on: boolean): void {
    this.isGhost = on;
    this.isAtRest = false;
    if (!on) this.markers.visible = true;
    if (!on || !Number.isNaN(this.lastMs)) return;
    // No frame has come, so nothing was drawn: the ghost starts at 0 at once, and there is no change to count.
    for (let marker = 0; marker < this.strength.length; marker++) {
      this.guard.reset(this.firstElement + marker, 0);
      this.strength[marker] = this.drawn.array[marker] = 0;
    }
    this.drawn.needsUpdate = true;
  }

  /**
   * FR-HND-16: the cell a release of this hand will land on, as `target:hover` gives it; its marker is the cue.
   * null, or a cell that is not on the bed, is no cue. One cue per hand; two hands on one cell are one cue.
   */
  setHover(hand: Hand, cell: Cell | null): void {
    this.hovered[hand === 'left' ? 0 : 1] =
      cell !== null && onBed(cell) ? cell.ring * STEPS + cell.step : NO_CELL;
    this.isAtRest = false;
  }

  /**
   * Per frame, creates no objects: a hovered marker fades up over HOVER_CUE_MS and one that was left fades back,
   * each through the flash cap (FR-UI-11), so a hover that flickers cannot make a marker blink. `nowMs` is the
   * frame's time. Reduced motion and high contrast: the same cue (UX §8).
   */
  update(nowMs: number): void {
    // How far a fade may go this frame: nothing on the first frame, or when the clock stood still or went back.
    const elapsed = ((nowMs - this.lastMs) / HOVER_CUE_MS) * (MARKER_HOVER_ALPHA - MARKER_ALPHA);
    const step = elapsed > 0 ? elapsed : 0;
    if (Number.isFinite(nowMs)) this.lastMs = nowMs;
    if (this.isAtRest) return;
    const left = this.hovered[0]!;
    const right = this.hovered[1]!;
    const drawn = this.drawn.array;
    let isDirty = false;
    let isAtRest = true;
    for (let marker = 0; marker < drawn.length; marker++) {
      const hovered = marker === left || marker === right ? MARKER_HOVER_ALPHA : MARKER_ALPHA;
      const target = this.isGhost ? 0 : hovered;
      const shown = this.strength[marker]!;
      if (shown === target) continue;
      isAtRest = false;
      const asked = target > shown ? Math.min(target, shown + step) : Math.max(target, shown - step);
      const granted = this.guard.request(this.firstElement + marker, asked, nowMs);
      if (granted === shown) continue;
      this.strength[marker] = drawn[marker] = granted;
      isDirty = true;
    }
    if (isDirty) this.drawn.needsUpdate = true;
    this.isAtRest = isAtRest;
    // A ghost whose markers have faded out costs no draw call for them.
    if (this.isGhost && isAtRest) this.markers.visible = false;
  }

  dispose(): void {
    for (const mesh of [this.base, this.markers]) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.markers.dispose();
  }
}
