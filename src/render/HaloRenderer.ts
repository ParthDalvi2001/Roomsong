// Listen mode's light (FR-ROOM-04, UX §3.5): the dim dome and the aurora halo. The dome is a dark see-through
// sphere round the bed, drawn before the garden, so passthrough is seen at 40 % behind it: the dimming is a
// material, not a pass over the frame (NFR-PERF-09). The halo is a curtain of light round the bed's rim that
// rises as Listen fades in and breathes with the beat. High contrast dims the background with the same dome, at
// all times (FR-UI-05); in Listen the deeper dim holds. Each is one FlashGuard element (LLD §5.9); the curtain's
// folds drift too slowly to count. Nothing here listens to the bus or reads a clock: HaloSystem calls it.
// update allocates nothing: what changes every frame goes into typed arrays the shaders read as vec4s.
import {
  BackSide,
  Color,
  CustomBlending,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
} from 'three';

import { BED_OUTER } from '../garden/index.js';

import {
  BED_RIM_M,
  CONTRAST_DIM,
  DOME_DETAIL,
  DOME_DIM,
  DOME_RADIUS_M,
  DOME_RENDER_ORDER,
  HALO_BEATS_PER_BREATH,
  HALO_DRIFT_MS,
  HALO_HEIGHT_M,
  HALO_LIFT_M,
  HALO_LOW,
  HALO_PEAK,
  HALO_SEGMENTS,
  ICE,
  LISTEN_ENTER_MS,
  LISTEN_EXIT_MS,
  MOSS,
  STILL_HALO,
  STILL_RAMP_MS,
  VIOLET,
} from './config.js';

import type { FlashGuard } from './FlashGuard.js';
import type { Object3D } from 'three';

/** FR-MUS-03: 4 beats a bar. */
const BREATHS_PER_BAR = 4 / HALO_BEATS_PER_BREATH;

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// x: brightness 0..1 (the guarded one), y: additive strength, z: drift 0..1 of HALO_DRIFT_MS. uv.y is 0 at the
// foot. Whole cycles of the drift only, so its wrap shows no seam; the fastest is 6 a minute (0.1 Hz). The
// colours are the canvas's own encoded values, added to what is behind, as the tide's light is: alpha 0 under
// the blend below, so passthrough is never covered (an alpha of 1 drew the curtain as a black wall over it).
const HALO_FRAGMENT = /* glsl */ `
uniform vec4 uHalo;
uniform vec3 uMoss;
uniform vec3 uIce;
uniform vec3 uViolet;
varying vec2 vUv;
void main() {
  float a = vUv.x * 6.2831853;
  float d = uHalo.z * 6.2831853;
  float folds = 0.65 + 0.35 * sin(a * 7.0 + d * 6.0) * sin(a * 3.0 - d * 4.0);
  vec3 colour = mix(mix(uMoss, uIce, 0.5 + 0.5 * sin(a * 2.0 + d * 2.0)), uViolet, vUv.y);
  float fall = (1.0 - vUv.y) * (1.0 - vUv.y) * smoothstep(0.0, 0.1, vUv.y);
  gl_FragColor = vec4(colour * (uHalo.y * uHalo.x * folds * fall), 0.0);
}`;

const DOME_VERTEX = /* glsl */ `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// x: how much of what is behind it the dome covers.
const DOME_FRAGMENT = /* glsl */ `
uniform vec4 uDome;
void main() {
  gl_FragColor = vec4(0.0, 0.0, 0.0, uDome.x);
}`;

const encoded = (hex: number): Color => new Color(hex).convertLinearToSRGB();

export class HaloRenderer {
  readonly halo: Mesh<CylinderGeometry, ShaderMaterial>;
  /** An InstancedMesh of one, switched by its count and hidden at 0. Its program is compiled in the session's first
   *  frame (src/app.ts, T-165), not on its first dim, which a high-contrast switch can bring mid-session. */
  readonly dome: InstancedMesh<IcosahedronGeometry, ShaderMaterial>;
  private readonly haloElement: number;
  private readonly domeElement: number;
  /** The halo's vec4 (HALO_FRAGMENT) and the dome's (x: its cover). */
  private readonly haloState = new Float32Array(4);
  private readonly domeState = new Float32Array(4);
  private isListening = false;
  /** How far the scene is into Listen, 0..1, before easing. */
  private progress = 0;
  /** P-016: the garden is open (a still head), and how far the halo is into it, 0..1, over STILL_RAMP_MS. */
  private isOpen = false;
  private open = 0;
  private lastMs = Number.NaN;
  private isReducedMotion = false;
  /** What of the background the dome covers outside Listen: CONTRAST_DIM in high contrast, else 0. */
  private contrastCover = 0;

  constructor(
    parent: Object3D,
    private readonly guard: FlashGuard,
  ) {
    const radius = BED_OUTER + BED_RIM_M;
    // Open, from 0 up to its height: the mesh's matrix lifts it and scales it as it rises.
    const curtain = new CylinderGeometry(radius, radius, HALO_HEIGHT_M, HALO_SEGMENTS, 1, true);
    curtain.translate(0, HALO_HEIGHT_M / 2, 0);
    this.haloState[1] = HALO_PEAK;
    this.halo = new Mesh(
      curtain,
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: HALO_FRAGMENT,
        uniforms: {
          uHalo: { value: this.haloState },
          uMoss: { value: encoded(MOSS) },
          uIce: { value: encoded(ICE) },
          uViolet: { value: encoded(VIOLET) },
        },
        blending: CustomBlending,
        blendSrc: OneFactor,
        blendDst: OneMinusSrcAlphaFactor,
        side: DoubleSide,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.halo.renderOrder = 4; // after the bed's glass, markers, tide and petals
    this.halo.position.y = HALO_LIFT_M;
    this.halo.matrixAutoUpdate = false;
    this.halo.updateMatrix();
    this.halo.visible = false;

    this.dome = new InstancedMesh(
      new IcosahedronGeometry(DOME_RADIUS_M, DOME_DETAIL),
      new ShaderMaterial({
        vertexShader: DOME_VERTEX,
        fragmentShader: DOME_FRAGMENT,
        uniforms: { uDome: { value: this.domeState } },
        side: BackSide, // seen from inside
        transparent: true,
        depthWrite: false,
      }),
      1,
    );
    this.dome.count = 0;
    this.dome.visible = false;
    this.dome.frustumCulled = false;
    this.dome.renderOrder = DOME_RENDER_ORDER;
    this.dome.matrixAutoUpdate = false;

    // The halo starts dark; the dome's element is what passthrough is seen at, which starts whole.
    this.haloElement = guard.claim(1, 0);
    this.domeElement = guard.claim(1, 1);
    parent.add(this.dome, this.halo);
  }

  /** On `listen:enter` and `listen:exit`: the fade in (LISTEN_ENTER_MS) or out (LISTEN_EXIT_MS) starts. */
  setListening(isListening: boolean): void {
    this.isListening = isListening;
  }

  /** P-016: on `stillness:changed`: the halo glides up STILL_HALO over STILL_RAMP_MS, or back down. */
  setOpen(isOpen: boolean): void {
    this.isOpen = isOpen;
  }

  /** UX §5, FR-UI-06: no rise and no drift; the fades and the breath stay. */
  setReducedMotion(isReduced: boolean): void {
    this.isReducedMotion = isReduced;
  }

  /** FR-UI-05: high contrast dims the background to 60 %, through the guard like Listen's dim. */
  setHighContrast(isOn: boolean): void {
    this.contrastCover = isOn ? CONTRAST_DIM : 0;
  }

  /**
   * Per frame. `barPhase` (0..1, audio's clock.barPhase, or NaN with no tide: API_SPEC §1.10 rule 11) times the
   * breath; with none the halo holds full. `nowMs` is the frame's time. Out of Listen and faded out, and out of
   * high contrast with the dome gone, it returns.
   */
  update(barPhase: number, nowMs: number): void {
    const elapsed = nowMs - this.lastMs;
    if (Number.isFinite(nowMs)) this.lastMs = nowMs;
    const was = this.progress;
    // Nothing on the first frame, or when the clock stood still or went back.
    const step = elapsed > 0 ? elapsed / (this.isListening ? LISTEN_ENTER_MS : LISTEN_EXIT_MS) : 0;
    const progress = this.isListening ? Math.min(1, was + step) : Math.max(0, was - step);
    if (progress !== was) this.progress = progress;
    const wasOpen = this.open;
    const openStep = elapsed > 0 ? elapsed / STILL_RAMP_MS : 0;
    const open = this.isOpen ? Math.min(1, wasOpen + openStep) : Math.max(0, wasOpen - openStep);
    if (open !== wasOpen) this.open = open;
    // High contrast's dim lives on the bed, which RoomSystem hides while it places it. Asked for as gone while the
    // bed is hidden, so the guard counts its going and holds its coming back like any change (BUG-008 review).
    const contrastCover = this.dome.parent?.visible === false ? 0 : this.contrastCover;
    const isAtRest = this.haloState[0] === 0 && this.domeState[0] === 0 && contrastCover === 0;
    if (progress === 0 && open === 0 && isAtRest) return;
    const eased = progress * progress * (3 - 2 * progress);

    // The deeper of the two dims, never their product: high contrast in Listen is Listen's 40 %, not 24 %.
    const seen = this.guard.request(this.domeElement, 1 - Math.max(contrastCover, DOME_DIM * eased), nowMs);
    this.domeState[0] = 1 - seen;
    this.dome.count = seen < 1 ? 1 : 0;
    this.dome.visible = this.dome.count > 0;

    const breath = Number.isFinite(barPhase)
      ? 0.5 + 0.5 * Math.cos(2 * Math.PI * barPhase * BREATHS_PER_BAR)
      : 1;
    // P-016: the open garden lifts the halo STILL_HALO of the way from Listen's level to 1, so in Listen the
    // breath stays (0.81 to 1 instead of 0.75 to 1) and nothing is asked past the guard's 1.
    const listening = eased * (HALO_LOW + (1 - HALO_LOW) * breath);
    const wanted = listening + (1 - listening) * STILL_HALO * open * open * (3 - 2 * open);
    const lit = this.guard.request(this.haloElement, wanted, nowMs);
    this.haloState[0] = lit;
    this.haloState[2] = this.isReducedMotion ? 0 : (nowMs % HALO_DRIFT_MS) / HALO_DRIFT_MS;
    this.halo.visible = lit > 0;
    // The rise goes straight into the matrix's y scale (matrixAutoUpdate is off): a setter would box it.
    this.halo.matrix.elements[5] = this.isReducedMotion ? 1 : Math.max(eased, open);
    this.halo.matrixWorldNeedsUpdate = true;
  }

  dispose(): void {
    for (const mesh of [this.halo, this.dome]) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.dome.dispose(); // its instance buffer
  }
}
