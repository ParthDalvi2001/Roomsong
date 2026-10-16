// The Listen orb (UX §2, FR-UI-09): a small cream pearl in the bed's centre hole. Pinched, or dwelt on, it
// toggles Listen; its target is HaloSystem's. It is at a plant's rest brightness, lifted as a plant is while a
// hand hovers it (FR-HND-16), and full in Listen, each a level that moves over HOVER_CUE_MS through the flash
// cap (one FlashGuard element). Nothing here listens to the bus or reads a clock; update allocates nothing.
import { Color, IcosahedronGeometry, Mesh, ShaderMaterial } from 'three';

import { TARGET_VISIBLE_DIAMETER_M } from '../hands/index.js';

import {
  CREAM,
  HOVER_CUE_MS,
  LISTEN_ORB_DETAIL,
  LISTEN_ORB_LIFT_M,
  PLANT_HOVER_LIFT,
  PLANT_REST_BRIGHTNESS,
} from './config.js';

import type { FlashGuard } from './FlashGuard.js';
import type { Object3D } from 'three';

const VERTEX = /* glsl */ `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// x: brightness. The colour is the canvas's own encoded value, as the tide's is.
const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform vec4 uOrb;
void main() {
  gl_FragColor = vec4(uColour * uOrb.x, 1.0);
}`;

export class OrbRenderer {
  readonly mesh: Mesh<IcosahedronGeometry, ShaderMaterial>;
  private readonly element: number;
  private readonly state = new Float32Array(4);
  private isHovered = false;
  private isListening = false;
  /** The brightness on its way to the wanted one, before the guard. */
  private level = PLANT_REST_BRIGHTNESS;
  private lastMs = Number.NaN;

  constructor(
    parent: Object3D,
    private readonly guard: FlashGuard,
  ) {
    this.element = guard.claim(1, PLANT_REST_BRIGHTNESS);
    this.state[0] = PLANT_REST_BRIGHTNESS;
    this.mesh = new Mesh(
      new IcosahedronGeometry(TARGET_VISIBLE_DIAMETER_M / 2, LISTEN_ORB_DETAIL),
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uColour: { value: new Color(CREAM).convertLinearToSRGB() },
          uOrb: { value: this.state },
        },
      }),
    );
    this.mesh.position.y = LISTEN_ORB_LIFT_M;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrix();
    this.mesh.visible = false; // until a bed is placed
    parent.add(this.mesh);
  }

  /** On `target:hover`: a hand would press it now. */
  setHovered(isHovered: boolean): void {
    this.isHovered = isHovered;
  }

  setListening(isListening: boolean): void {
    this.isListening = isListening;
  }

  /** Per frame; `nowMs` is the frame's time. */
  update(nowMs: number): void {
    const wanted = this.isListening
      ? 1
      : this.isHovered
        ? PLANT_REST_BRIGHTNESS + PLANT_HOVER_LIFT
        : PLANT_REST_BRIGHTNESS;
    const elapsed = nowMs - this.lastMs;
    if (Number.isFinite(nowMs)) this.lastMs = nowMs;
    const was = this.level;
    if (was !== wanted && elapsed > 0) {
      const step = (PLANT_HOVER_LIFT * elapsed) / HOVER_CUE_MS;
      this.level = was < wanted ? Math.min(wanted, was + step) : Math.max(wanted, was - step);
    }
    this.state[0] = this.guard.request(this.element, this.level, nowMs);
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
