// The tide (FR-MUS-03): a wedge of light that turns over the bed once per bar and passes the 16 steps in order.
// It is told where it is by audio's bar phase (API_SPEC §1.2) and reads no clock itself.
// The light travels with its own shade (UX §9.4): a band of the bed's charcoal directly ahead of the crest, so
// the crest has a dark edge on a bright table. On a dark table the band cannot be seen.
// Flash cap (LLD §5.9): the wedge is one FlashGuard element for its showing and hiding, which are fades, so it
// cannot blink. Its sweep keeps one brightness and is not guarded: it relies on a continuous phase. What the
// crest lights counts on the plant it lights, which is why stepGlow is here: a plant glows by the light on it.
import {
  BufferAttribute,
  Color,
  CustomBlending,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  RingGeometry,
  ShaderMaterial,
} from 'three';

import { BED_INNER, BED_OUTER, STEPS } from '../garden/index.js';

import {
  BED_BASE_COLOUR,
  BED_LAYER_M,
  BED_RIM_M,
  CREAM,
  PLANT_FLASH_BRIGHTNESS,
  PLANT_REST_BRIGHTNESS,
  STEP_RAD,
  TIDE_FADE_MS,
  TIDE_FALLOFF_POWER,
  TIDE_LEAD_STEPS,
  TIDE_PEAK,
  TIDE_SEGMENTS_PER_STEP,
  TIDE_SHADE_COVER,
  TIDE_SHADE_STEPS,
  TIDE_TRAIL_STEPS,
} from './config.js';

import type { FlashGuard } from './FlashGuard.js';
import type { Object3D } from 'three';

// A whole number of segments per step, so one row of vertices lies exactly on the crest.
const ARC_SEGMENTS = (TIDE_SHADE_STEPS + TIDE_TRAIL_STEPS) * TIDE_SEGMENTS_PER_STEP;
// Across the bed: dark at both glass edges, full between ring 0 and ring 4.
const ROW_RADIUS_M = [BED_INNER - BED_RIM_M, BED_INNER, BED_OUTER, BED_OUTER + BED_RIM_M];
const ROW_LEVEL = [0, 1, 1, 0];

/** The tide's light `past` steps behind its crest (negative: ahead of it): 1 on the crest, 0 outside. */
function light(past: number): number {
  return Math.max(0, past < 0 ? 1 + past / TIDE_LEAD_STEPS : 1 - past / TIDE_TRAIL_STEPS);
}

/** UX §9.4: the shade `ahead` steps before the crest: 1 where the light begins, 0 at its far end and on the crest. */
function shade(ahead: number): number {
  const rising = (TIDE_SHADE_STEPS - ahead) / (TIDE_SHADE_STEPS - TIDE_LEAD_STEPS);
  return Math.max(0, Math.min(rising, ahead / TIDE_LEAD_STEPS));
}

/**
 * FR-UI-07: writes into `out` the brightness a plant on each of the 16 steps asks for with the tide at `phase`:
 * full under the crest, at rest away from it. No tide (a phase that is not finite): all at rest. Runs per
 * frame. It fills an array and calls nothing, because V8 boxes a fraction that a function returns (16 bytes a
 * call, measured in T-125).
 */
export function stepGlow(phase: number, out: Float64Array): void {
  for (let step = 0; step < STEPS; step++) {
    let past = (((phase * STEPS - step) % STEPS) + STEPS) % STEPS; // 0..16 steps since the crest passed
    if (past > STEPS / 2) past -= STEPS; // the crest is on its way
    const lit = past < 0 ? 1 + past / TIDE_LEAD_STEPS : 1 - past / TIDE_TRAIL_STEPS; // light(past), written out
    out[step] =
      PLANT_REST_BRIGHTNESS + (PLANT_FLASH_BRIGHTNESS - PLANT_REST_BRIGHTNESS) * (lit > 0 ? lit : 0);
  }
}

const VERTEX = /* glsl */ `
attribute vec2 aTide;
varying vec2 vTide;
void main() {
  vTide = aTide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// What is drawn = the light + what lies under it × (1 − cover) (UX §9.4): x is the light, y the shade's cover,
// and the blend below does the rest in one draw. Alpha carries the cover only, so in passthrough the light is
// added to the real table and the shade covers it. Both colours are the canvas's own encoded values and are
// weighted there, as T-125's additive light was: no colour-space step.
const FRAGMENT = /* glsl */ `
uniform vec3 uCrest;
uniform vec3 uShade;
uniform float uShown;
varying vec2 vTide;
void main() {
  gl_FragColor = uShown * vec4(uCrest * vTide.x + uShade * vTide.y, vTide.y);
}`;

export class TideRenderer {
  readonly mesh: Mesh<RingGeometry, ShaderMaterial>;
  private readonly element: number;
  /** How far the wedge is faded in, 0..1: what the guard last handed out. */
  private readonly shown = { value: 0 };
  private lastMs = Number.NaN;

  constructor(
    parent: Object3D,
    private readonly guard: FlashGuard,
  ) {
    const ahead = TIDE_SHADE_STEPS * STEP_RAD;
    const arc = ahead + TIDE_TRAIL_STEPS * STEP_RAD;
    // RingGeometry lies in xy, its angle running from +x toward +y. Laid flat, +y becomes -z: the angle runs
    // against the bed's (D-029), so the positive side is behind the crest. Its radii are set per row below.
    const geometry = new RingGeometry(1, 2, ARC_SEGMENTS, ROW_RADIUS_M.length - 1, -ahead, arc);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.getAttribute('position');
    const carried = new Float32Array(position.count * 2);
    for (let v = 0; v < position.count; v++) {
      const row = Math.floor(v / (ARC_SEGMENTS + 1));
      const angle = Math.atan2(position.getZ(v), position.getX(v));
      const radius = ROW_RADIUS_M[row]!;
      position.setXYZ(v, radius * Math.cos(angle), 0, radius * Math.sin(angle));
      const past = -angle / STEP_RAD;
      carried[v * 2] = TIDE_PEAK * ROW_LEVEL[row]! * light(past) ** TIDE_FALLOFF_POWER;
      carried[v * 2 + 1] = TIDE_SHADE_COVER * ROW_LEVEL[row]! * shade(-past);
    }
    geometry.setAttribute('aTide', new BufferAttribute(carried, 2));
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uCrest: { value: new Color(CREAM).convertLinearToSRGB() },
        uShade: { value: new Color(BED_BASE_COLOUR).convertLinearToSRGB() },
        uShown: this.shown, // dark until a tide runs
      },
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      transparent: true,
      depthWrite: false,
    });
    this.element = guard.claim(1, this.shown.value);
    this.mesh = new Mesh(geometry, material);
    this.mesh.visible = false;
    this.mesh.position.y = 2 * BED_LAYER_M;
    this.mesh.renderOrder = 2; // after the bed's glass and its markers
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrix();
    parent.add(this.mesh);
  }

  /**
   * Per frame. A finite `barPhase` (0..1, audio's clock.barPhase) shows the wedge with its crest there; one that
   * is not finite hides it and leaves it where it was. Showing and hiding fade light and shade together over
   * TIDE_FADE_MS, through the flash cap. `nowMs` is the frame's time.
   */
  update(barPhase: number, nowMs: number): void {
    const { mesh } = this;
    const isRunning = Number.isFinite(barPhase);
    // How far the fade may go this frame: nothing on the first frame, or when the clock stood still or went back.
    const elapsed = (nowMs - this.lastMs) / TIDE_FADE_MS;
    const step = elapsed > 0 ? elapsed : 0;
    if (Number.isFinite(nowMs)) this.lastMs = nowMs;
    const shown = this.shown.value;
    const granted = this.guard.request(this.element, isRunning ? shown + step : shown - step, nowMs);
    if (granted !== shown) this.shown.value = granted; // only on a change: a fraction stored here is boxed
    mesh.visible = granted > 0;
    if (!isRunning) return;
    // The turn goes straight into the matrix (matrixAutoUpdate is off; rotation is not used): setting
    // rotation.y would hand a fraction to a setter, which V8 boxes. Step s is at +x turned toward +z (D-029).
    const angle = barPhase * 2 * Math.PI;
    const elements = mesh.matrix.elements;
    elements[0] = elements[10] = Math.cos(angle);
    elements[2] = Math.sin(angle);
    elements[8] = -elements[2];
    mesh.matrixWorldNeedsUpdate = true;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
