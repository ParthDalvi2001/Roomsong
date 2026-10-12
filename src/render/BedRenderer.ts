// The bed (FR-MUS-01, UX §2 and §5): an annulus of charcoal glass with its five pitch rings drawn as lines, and
// a marker on each of the 80 cells. Two draw calls: the glass and its ring lines are one shader on one mesh,
// the markers are one InstancedMesh. Nothing here changes after it is built.
import { Color, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, RingGeometry, ShaderMaterial } from 'three';

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
  ICE,
  MARKER_ALPHA,
  MARKER_LINE_M,
  MARKER_RADIUS_M,
  MARKER_SEGMENTS,
} from './config.js';

import type { Object3D } from 'three';

/** A number as a GLSL float literal. */
const glsl = (value: number): string => value.toFixed(5);

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

export class BedRenderer {
  readonly base: Mesh<RingGeometry, ShaderMaterial>;
  readonly markers: InstancedMesh<RingGeometry, MeshBasicMaterial>;

  constructor(parent: Object3D) {
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
      new MeshBasicMaterial({
        color: CREAM,
        transparent: true,
        opacity: MARKER_ALPHA,
        depthWrite: false,
        toneMapped: false,
      }),
      RINGS * STEPS,
    );
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

  dispose(): void {
    for (const mesh of [this.base, this.markers]) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.markers.dispose();
  }
}
