// The tuning ripple (FR-ROOM-12, LLD §5.8, UX §5): a crest of light runs over the table, then up the nearest wall,
// then across the ceiling, and leaves a short afterglow in the room's tint. In a Wanderer session one ripple runs
// over the bed and nothing else: no surface set anything. One quad per surface (3 draw calls at most, 6
// triangles), made once and aimed at each start; a quad with nothing to show is not drawn.
// The quads lie on real surfaces seen through passthrough, so the crest travels with its own shade, as the tide
// does (UX §9.4): a band of the bed's charcoal leads it, the dark edge it stands against on a light surface, and
// the afterglow carries a little cover, so it tints a light surface too.
// Flash cap (LLD §5.9): each quad is one FlashGuard element for its showing and hiding. Its crest moves at one
// brightness and is not guarded. Under reduced motion each quad glows once instead, up and down through the guard.
// Nothing here listens to the bus or reads a clock: TuningRippleSystem calls start, stop and update.
import {
  Color,
  CustomBlending,
  DoubleSide,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three';

import { BED_OUTER } from '../garden/index.js';

import {
  BED_BASE_COLOUR,
  BED_RIM_M,
  CREAM,
  ICE,
  RIPPLE_AFTERGLOW,
  RIPPLE_AFTERGLOW_COVER,
  RIPPLE_AFTERGLOW_MS,
  RIPPLE_CREST_M,
  RIPPLE_GLOW_MS,
  RIPPLE_SHADE_M,
  RIPPLE_SWEEP_AT_MS,
  RIPPLE_SWEEP_MS,
  TIDE_SHADE_COVER,
} from './config.js';

import type { FlashGuard } from './FlashGuard.js';
import type { Mat4 } from '../core/index.js';
import type { RoomSurfaces, SurfaceRef } from '../room/index.js';
import type { Object3D } from 'three';

/** What one ripple runs over (LLD §5.8). */
export interface RipplePlan {
  /** room:features.surfaces. A missing surface has no sweep. */
  surfaces: RoomSurfaces;
  /** The bed as drawn (`bed.object3D.matrixWorld.elements`): the table's ripple spreads from under it. */
  bedPose: Mat4;
  /** The signature is Wanderer: one ripple on the bed, none on the surfaces, whatever `surfaces` names. */
  isWanderer: boolean;
  /** room:signature's paletteSeed: the afterglow is ICE turned by `paletteSeed % 360` degrees (LLD §5.8, Signature
   *  v1: the palette; UX §5). The saturation nudge `((h >>> 9) % 3) − 1` is left out: no document gives its step. */
  paletteSeed: number;
  isReducedMotion: boolean;
}

const SLOTS = RIPPLE_SWEEP_AT_MS.length; // table (or bed), wall, ceiling
const BED_RADIUS_M = BED_OUTER + BED_RIM_M;
const ICE_HSL = new Color(ICE).getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
// The canvas's own encoded values, as the tide's: no colour-space step in the shader.
const CREST_COLOUR = new Color(CREAM).convertLinearToSRGB();
const SHADE_COLOUR = new Color(BED_BASE_COLOUR).convertLinearToSRGB();
const glsl = (n: number): string => n.toFixed(4);

// vAt: where a fragment lies in the surface's own x and z, in metres, from the sweep's origin.
const VERTEX = /* glsl */ `
uniform vec4 uPlace; // the quad's size along x and z, then the origin, in metres
varying vec2 vAt;
void main() {
  vAt = position.xz * uPlace.xy - uPlace.zw;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// uSweep: the direction ((0, 0) = radial), how far the sweep reaches, and the afterglow's fall-off per metre behind
// the crest (0 = none: the reduced-motion glow). uNow: how far the crest is from the origin, and the brightness
// the guard handed out. What is drawn = the light + what lies under it × (1 − cover), as the tide (UX §9.4).
const FRAGMENT = /* glsl */ `
uniform vec4 uSweep;
uniform vec2 uNow;
uniform vec3 uCrest;
uniform vec3 uTrail;
uniform vec3 uShade;
varying vec2 vAt;
void main() {
  float radial = step(dot(uSweep.xy, uSweep.xy), 0.0);
  float d = mix(dot(vAt, uSweep.xy), length(vAt), radial);
  if (d < 0.0 || d > uSweep.z) discard;
  float behind = uNow.x - d;
  float crest = max(0.0, 1.0 - abs(behind) / ${glsl(RIPPLE_CREST_M / 2)});
  float glow = step(0.0, behind) * max(0.0, 1.0 - behind * uSweep.w);
  float shade = ${glsl(TIDE_SHADE_COVER)} * clamp(min((${glsl(RIPPLE_SHADE_M)} + behind) / ${glsl(RIPPLE_SHADE_M - RIPPLE_CREST_M / 2)},
    -behind / ${glsl(RIPPLE_CREST_M / 2)}), 0.0, 1.0);
  vec3 light = uCrest * crest + uTrail * (${glsl(RIPPLE_AFTERGLOW)} * glow) + uShade * shade;
  gl_FragColor = uNow.y * vec4(light, shade + ${glsl(RIPPLE_AFTERGLOW_COVER)} * glow);
}`;

/** A point in a pose's own x and z (its plane), from world space. Set-up only. */
function inPlane(pose: Mat4, x: number, y: number, z: number, out: { x: number; z: number }): void {
  const dx = x - pose[12]!;
  const dy = y - pose[13]!;
  const dz = z - pose[14]!;
  out.x = dx * pose[0]! + dy * pose[1]! + dz * pose[2]!;
  out.z = dx * pose[8]! + dy * pose[9]! + dz * pose[10]!;
}

export class TuningRipple {
  /** Table (in a Wanderer session: the bed), wall, ceiling. */
  readonly meshes: readonly Mesh<PlaneGeometry, ShaderMaterial>[];
  private readonly firstElement: number;
  /** The room's tint, shared by the three quads. */
  private readonly trail = new Color();
  /** Per quad: when its sweep starts (ms on update's clock; NaN = no sweep), how long it is drawn, its crest's speed. */
  private readonly startMs = new Float64Array(SLOTS).fill(Number.NaN);
  private readonly drawnMs = new Float64Array(SLOTS);
  private readonly metresPerMs = new Float64Array(SLOTS);
  private isGlow = false;
  /** Something is drawn or still to come: update has work. */
  private isBusy = false;
  private readonly at = { x: 0, z: 0 };

  constructor(
    parent: Object3D,
    private readonly guard: FlashGuard,
  ) {
    this.firstElement = guard.claim(SLOTS);
    const geometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2); // in its own x-z plane, as a SurfaceRef
    const meshes: Mesh<PlaneGeometry, ShaderMaterial>[] = [];
    for (let i = 0; i < SLOTS; i++) {
      const material = new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          // Typed arrays, which three.js uploads as vectors: a fraction written into one is not boxed per frame.
          uPlace: { value: new Float32Array(4) },
          uSweep: { value: new Float32Array(4) },
          uNow: { value: new Float32Array(2) },
          uCrest: { value: CREST_COLOUR },
          uTrail: { value: this.trail },
          uShade: { value: SHADE_COLOUR },
        },
        blending: CustomBlending,
        blendSrc: OneFactor,
        blendDst: OneMinusSrcAlphaFactor,
        transparent: true,
        depthWrite: false,
        side: DoubleSide, // a plane's normal may face either way (room/types.ts)
      });
      const mesh = new Mesh(geometry, material);
      mesh.visible = false;
      mesh.renderOrder = 2; // after the bed's glass and its markers, as the tide
      mesh.matrixAutoUpdate = false;
      mesh.frustumCulled = false; // never culled, as API_SPEC §1.8 has it (its program links at session start)
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.meshes = meshes;
  }

  /** Aims the quads and starts a ripple whose timeline counts from `nowMs` (the frame of room:features). Set-up. */
  start(plan: RipplePlan, nowMs: number): void {
    const { table, nearestWall, ceiling } = plan.surfaces;
    const bed = plan.bedPose;
    this.isGlow = plan.isReducedMotion;
    this.trail
      .setHSL(ICE_HSL.h + (plan.paletteSeed % 360) / 360, ICE_HSL.s, ICE_HSL.l, SRGBColorSpace)
      .convertLinearToSRGB();
    this.startMs.fill(Number.NaN);
    this.isBusy = true;
    if (!plan.isWanderer) {
      if (table !== undefined) this.aimTable(table, bed, nowMs);
      if (nearestWall !== undefined) this.aimWall(nearestWall, nowMs);
      if (ceiling !== undefined) this.aimCeiling(ceiling, bed, nowMs);
    }
    // Wanderer, or a room with no surface to sweep: one ripple on the bed only (UX §3.2).
    if (this.startMs.every(Number.isNaN)) {
      this.lay(0, bed, 2 * BED_RADIUS_M, 2 * BED_RADIUS_M);
      this.aim(0, 0, 0, BED_RADIUS_M, nowMs);
    }
  }

  /** Ends the ripple: no sweep starts after this, and what is lit is taken away through the guard. */
  stop(): void {
    // shortcut: at 3 or more Re-places in a second the guard refuses the fade, and a lit quad holds, its crest
    // frozen, until the window has room; draw it dark at once instead if a headset shows that.
    this.startMs.fill(Number.NaN);
  }

  /** Per frame, creates nothing. `nowMs` is the frame's time; one that is not finite changes nothing. */
  update(nowMs: number): void {
    if (!this.isBusy || !Number.isFinite(nowMs)) return;
    let isBusy = false;
    for (let i = 0; i < SLOTS; i++) {
      const mesh = this.meshes[i]!;
      const state = mesh.material.uniforms.uNow!.value as Float32Array;
      const elapsed = nowMs - this.startMs[i]!; // NaN with no sweep
      const isOn = elapsed >= 0 && elapsed < this.drawnMs[i]!;
      let target = 0;
      if (isOn && this.isGlow) target = Math.sin((Math.PI * elapsed) / RIPPLE_GLOW_MS);
      else if (isOn) {
        target = 1;
        state[0] = elapsed * this.metresPerMs[i]!;
      }
      if (isOn || state[1] !== 0) {
        const granted = this.guard.request(this.firstElement + i, target, nowMs);
        state[1] = granted;
        mesh.visible = granted > 0;
      } else mesh.visible = false;
      if (isOn || state[1] !== 0 || elapsed < 0) isBusy = true;
    }
    this.isBusy = isBusy;
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.removeFromParent();
      mesh.material.dispose();
    }
    this.meshes[0]?.geometry.dispose();
  }

  /** The table: a radial ripple from the bed's centre out to the table's farthest corner. */
  private aimTable(table: SurfaceRef, bed: Mat4, nowMs: number): void {
    const { x: width, y: depth } = table.extents;
    this.lay(0, table.pose, width, depth);
    inPlane(table.pose, bed[12]!, bed[13]!, bed[14]!, this.at);
    const reach = Math.hypot(Math.abs(this.at.x) + width / 2, Math.abs(this.at.z) + depth / 2);
    this.aim(0, 0, 0, reach, nowMs);
  }

  /** The nearest wall: up from its base. Of its own x and z, up is the share of each that points up. */
  private aimWall(wall: SurfaceRef, nowMs: number): void {
    const { pose, extents } = wall;
    this.lay(1, pose, extents.x, extents.y);
    const norm = Math.hypot(pose[1]!, pose[9]!) || 1;
    const upX = pose[1]! / norm;
    const upZ = pose[9]! / norm;
    const height = Math.abs(upX) * extents.x + Math.abs(upZ) * extents.y;
    this.at.x = (-upX * height) / 2;
    this.at.z = (-upZ * height) / 2;
    this.aim(1, upX, upZ, height, nowMs);
  }

  /** The ceiling: across, from straight above the bed to the far edge ahead of the user (the bed's −z, D-029). */
  private aimCeiling(ceiling: SurfaceRef, bed: Mat4, nowMs: number): void {
    const { pose, extents } = ceiling;
    this.lay(2, pose, extents.x, extents.y);
    const aheadX = -(bed[8]! * pose[0]! + bed[10]! * pose[2]!);
    const aheadZ = -(bed[8]! * pose[8]! + bed[10]! * pose[10]!);
    const norm = Math.hypot(aheadX, aheadZ) || 1;
    const dirX = aheadX / norm;
    const dirZ = aheadZ / norm;
    inPlane(pose, bed[12]!, bed[13]!, bed[14]!, this.at);
    // The far edge: the corner that lies furthest along the direction.
    const reach =
      (Math.abs(dirX) * extents.x + Math.abs(dirZ) * extents.y) / 2 - (this.at.x * dirX + this.at.z * dirZ);
    this.aim(2, dirX, dirZ, reach, nowMs);
  }

  /** Puts quad `slot` on a surface: the pose, its own x and z scaled to the surface's size. */
  private lay(slot: number, pose: Mat4, sizeX: number, sizeZ: number): void {
    const mesh = this.meshes[slot]!;
    const m = mesh.matrix.elements;
    for (let k = 0; k < 16; k++) m[k] = pose[k]!;
    for (let k = 0; k < 3; k++) {
      m[k] = m[k]! * sizeX;
      m[8 + k] = m[8 + k]! * sizeZ;
    }
    mesh.matrixWorldNeedsUpdate = true;
    const place = mesh.material.uniforms.uPlace!.value as Float32Array;
    place[0] = sizeX;
    place[1] = sizeZ;
    this.at.x = this.at.z = 0;
  }

  /** Sets quad `slot`'s sweep from the origin in `this.at`, along (dirX, dirZ) or radial for (0, 0). */
  private aim(slot: number, dirX: number, dirZ: number, reachM: number, nowMs: number): void {
    const { uPlace, uSweep, uNow } = this.meshes[slot]!.material.uniforms;
    const place = uPlace!.value as Float32Array;
    const sweep = uSweep!.value as Float32Array;
    const state = uNow!.value as Float32Array;
    place[2] = this.at.x;
    place[3] = this.at.z;
    const durationMs = RIPPLE_SWEEP_MS[slot]!;
    sweep[0] = dirX;
    sweep[1] = dirZ;
    sweep[2] = reachM;
    // Each point the crest passed glows for RIPPLE_AFTERGLOW_MS; under reduced motion the whole surface glows evenly.
    sweep[3] = this.isGlow ? 0 : durationMs / (reachM * RIPPLE_AFTERGLOW_MS);
    state[0] = this.isGlow ? reachM + RIPPLE_CREST_M : 0; // the glow: the crest stands past the far edge
    this.metresPerMs[slot] = reachM / durationMs;
    this.drawnMs[slot] = this.isGlow ? RIPPLE_GLOW_MS : durationMs + RIPPLE_AFTERGLOW_MS;
    this.startMs[slot] = nowMs + RIPPLE_SWEEP_AT_MS[slot]!;
  }
}
