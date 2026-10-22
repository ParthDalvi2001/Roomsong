// The undo petal (UX §9.3, FR-MUS-12): after a plant is removed, one petal in its colour waits 3 cm above the
// cell it stood on and shrinks while the undo lasts. One InstancedMesh: one draw call while any petal is up, none
// otherwise. A cell holds one petal at most, so an instance is a cell, and so is a FlashGuard element.
// Its arrival (T-147): the removed plant dissolves into a burst of petals at the release point, which drift to
// the cell, where the undo petal is the one that stays; the others are a small pool of instances after the 80.
// Nothing here listens to the bus or reads a clock: the wiring calls show, hide and clear from the garden's
// events and update once per frame (API_SPEC §1.8). High contrast: a cream outline (FR-UI-05). A fingertip or the
// gaze on a petal lifts it 20 % brighter through the guard, as a hovered seed (FR-HND-16): an accidental removal
// shows its way back. update allocates nothing.
import {
  CircleGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three';

import { settings } from '../core/index.js';
import { cellCentre, RINGS, STEPS, UNDO_LIFE_MS } from '../garden/index.js';

import {
  BURST_MS,
  BURST_PETAL_DIAMETER_M,
  BURST_PETALS,
  BURST_POOL,
  BURST_SPREAD_M,
  FLASH_MIN_DELTA,
  HOVER_CUE_MS,
  PETAL_ASPECT,
  PETAL_END_DIAMETER_M,
  PETAL_FADE_IN_MS,
  PETAL_FADE_MS,
  PETAL_LIFT_M,
  PETAL_SEGMENTS,
  PETAL_START_DIAMETER_M,
  PLANT_CAPACITY,
  PLANT_HOVER_LIFT,
  PLANT_LIGHTNESS,
  PLANT_OUTLINE_M,
  PLANT_REST_BRIGHTNESS,
  PLANT_SATURATION,
} from './config.js';
import { CREAM_RGB, glsl } from './outline.js';

import type { FlashGuard } from './FlashGuard.js';
import type { Hand, Vec3 } from '../core/index.js';
import type { Plant } from '../garden/index.js';
import type { Object3D } from 'three';

// Unlit, with its own opacity per instance: a petal that only grew darker would end as a black shape over
// passthrough, so its fade is a fade of the alpha.
const VERTEX = /* glsl */ `
attribute vec4 aColour;
varying vec4 vColour;
void main() {
  vColour = aColour;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;
const FRAGMENT = /* glsl */ `
varying vec4 vColour;
void main() {
  gl_FragColor = vColour;
  #include <colorspace_fragment>
}`;

// FR-UI-05 (BUG-008): in high contrast a cream band PLANT_OUTLINE_M wide round each undo petal, in its own plane:
// the petal again, every point of its rim pushed that far outward (a flat petal has no silhouette for the push
// away from the eye of outline.ts), with all of it that lies under the petal discarded. Under a petal that fades
// a whole cream disc would show through and brighten it past the guard. vRim.x is the share of the way from the
// centre to the band's outer edge and vRim.y that share times where the petal's edge lies on it, so x < (edge
// share) is x * x < y, with no division of interpolated values. At the petal's own opacity: it fades with it and
// makes no change of its own for the flash cap.
const OUTLINE_VERTEX = /* glsl */ `
attribute vec4 aColour;
varying float vAlpha;
varying vec2 vRim;
void main() {
  vAlpha = aColour.a;
  vec4 local = instanceMatrix * vec4(position, 1.0);
  vec3 away = local.xyz - instanceMatrix[3].xyz;
  float size = length(away); // 0 at a petal's centre, and for an instance with no size
  vRim = size > 0.0 ? vec2(1.0, size / (size + ${glsl(PLANT_OUTLINE_M)})) : vec2(0.0);
  if (size > 0.0) local.xyz += away * (${glsl(PLANT_OUTLINE_M)} / size);
  gl_Position = projectionMatrix * modelViewMatrix * local;
}`;
const OUTLINE_FRAGMENT = /* glsl */ `
varying float vAlpha;
varying vec2 vRim;
void main() {
  if (vRim.x * vRim.x < vRim.y) discard; // under the petal
  gl_FragColor = vec4(${CREAM_RGB.map(glsl).join(', ')}, vAlpha);
  #include <colorspace_fragment>
}`;

const colour = new Color();
const centre = { x: 0, y: 0 };
/** An arrival or a particle that starts with the next frame, and one that is over (or never was). */
const NEXT_FRAME = Number.POSITIVE_INFINITY;
const NONE = Number.NEGATIVE_INFINITY;
/** How a petal arrives (UX §9.3): at once, drifting from the release point, or fading in (reduced motion). */
const AT_ONCE = 0;
const DRIFT = 1;
const FADE_IN = 2;

export class PetalRenderer {
  readonly mesh: InstancedMesh<CircleGeometry, ShaderMaterial>;
  /** FR-UI-05: the petals' cream band, a child of `mesh` sharing its instances; drawn in high contrast only, for
   *  the undo petals (not the burst's), switched by its count and hidden at 0 (T-163). Its program is compiled in
   *  the session's first frame (src/app.ts, T-165). */
  readonly outline: InstancedMesh<CircleGeometry, ShaderMaterial>;
  private readonly firstElement: number;
  /** Per instance: the colour, and the opacity that is the petal's brightness over its rest brightness. */
  private readonly colours: InstancedBufferAttribute;
  /** The slot, which is the cell `ring * STEPS + step`, of each plant that has a petal. */
  private readonly slotOf = new Map<string, number>();
  private readonly plantAt: (string | null)[] = new Array<string | null>(PLANT_CAPACITY).fill(null);
  /** The slots that hold a petal, in no order: the first `liveCount` entries. */
  private readonly live = new Uint8Array(PLANT_CAPACITY);
  private liveCount = 0;
  /** Per slot: when its petal goes, on the clock of `update`. */
  private readonly untilMs = new Float64Array(PLANT_CAPACITY);
  /** Per slot: the way out of the bed from its cell, as a unit vector (x, z). The petal's long side lies on it. */
  private readonly outward = new Float32Array(PLANT_CAPACITY * 2);
  /** Per slot: how wide its petal is drawn, in metres; 0 = none. `resize` writes it into the instance. */
  private readonly widthM = new Float32Array(PLANT_CAPACITY);
  /** Per slot: its place over the cell (x, y, z); how it arrives, from where (x, y, z) and since when. */
  private readonly home = new Float64Array(PLANT_CAPACITY * 3);
  private readonly arrival = new Uint8Array(PLANT_CAPACITY);
  private readonly arriveFrom = new Float64Array(PLANT_CAPACITY * 3);
  private readonly arriveAt = new Float64Array(PLANT_CAPACITY).fill(NONE);
  // The burst's other petals, per particle of the pool: where it starts and ends (x, y, z each), the way out of
  // the bed its long side lies on (x, z), and when it started (NONE: not flying). The next one a burst takes is
  // `nextParticle`, so a burst that finds the pool busy takes the oldest; `flying` counts the ones in the air.
  private readonly particleFrom = new Float64Array(BURST_POOL * 3);
  private readonly particleTo = new Float64Array(BURST_POOL * 3);
  private readonly particleOut = new Float64Array(BURST_POOL * 2);
  private readonly particleAt = new Float64Array(BURST_POOL).fill(NONE);
  private nextParticle = 0;
  private flying = 0;
  /** The frame time, kept for `fly`: a fraction handed to a method is boxed (see resize). */
  private readonly now = new Float64Array(1);
  // FR-HND-16, the hover cue: per hand (left, right), the slot of the petal it hovers (-1: none); per slot, the
  // plant's colour at full, how far the hover's glow is in (0..1), its lift (1 + PLANT_HOVER_LIFT × glow), and
  // whether it is drawn above its rest brightness (then the guard is asked until it is back); the last frame's
  // time, for the glow's ease.
  private readonly hoverSlot = new Int16Array(2).fill(-1);
  private readonly unit = new Float32Array(PLANT_CAPACITY * 3);
  private readonly glow = new Float32Array(PLANT_CAPACITY);
  private readonly lift = new Float32Array(PLANT_CAPACITY).fill(1);
  private readonly lit = new Uint8Array(PLANT_CAPACITY);
  private readonly lastMs = new Float64Array([Number.NaN, 0]); // and the ease's step this frame

  constructor(
    parent: Object3D,
    private readonly guard: FlashGuard,
  ) {
    this.firstElement = guard.claim(PLANT_CAPACITY);
    // One unit long, so an instance's scale is its width in metres; flat on the bed's plane.
    const geometry = new CircleGeometry(0.5, PETAL_SEGMENTS).rotateX(-Math.PI / 2).scale(1, 1, PETAL_ASPECT);
    const count = PLANT_CAPACITY + BURST_POOL;
    this.colours = new InstancedBufferAttribute(new Float32Array(count * 4), 4);
    geometry.setAttribute('aColour', this.colours);
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new InstancedMesh(geometry, material, count);
    this.mesh.instanceMatrix.array.fill(0); // every slot starts with no size: nothing of it is drawn
    this.mesh.count = PLANT_CAPACITY; // the pool's instances are drawn only while a burst flies
    this.mesh.visible = false;
    this.mesh.frustumCulled = false; // its bounds are one petal's; the instances lie all over the bed
    this.mesh.renderOrder = 3; // after the bed's glass, its markers and the tide
    this.mesh.matrixAutoUpdate = false;
    parent.add(this.mesh);
    const outline = new ShaderMaterial({
      vertexShader: OUTLINE_VERTEX,
      fragmentShader: OUTLINE_FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    this.outline = new InstancedMesh(geometry, outline, count);
    this.outline.instanceMatrix = this.mesh.instanceMatrix;
    this.outline.count = 0;
    this.outline.visible = false;
    this.outline.frustumCulled = false;
    this.outline.renderOrder = 2.5; // just before the petals, though it draws nothing under them
    this.outline.matrixAutoUpdate = false;
    this.mesh.add(this.outline);
  }

  /**
   * A petal for a removed plant, over the cell it stood on, until `update`'s `nowMs` reaches `untilMs`. Set-up
   * only, on `garden:removed`: `untilMs` is on the clock of `update`, so the caller converts the event's
   * `expiresAt`, which is on core's clock. One petal per cell (UX §9.3: never two on one spot): a petal already
   * over that cell goes, and so does an older one of the same plant. A cell that is not on the bed shows none.
   * `from` (T-147), the bed-frame point where the plant dissolved (PlantRenderer.heldAt): the petal and
   * BURST_PETALS - 1 more drift from around it to the cell over BURST_MS, and only the petal stays. Without it the
   * petal is there at once. Reduced motion: no burst and no drift; the petal fades in over PETAL_FADE_IN_MS.
   */
  show(plantId: string, plant: Pick<Plant, 'cell' | 'hue'>, untilMs: number, from: Vec3 | null = null): void {
    const { ring, step } = plant.cell;
    const isOnBed =
      Number.isInteger(ring) &&
      Number.isInteger(step) &&
      ring >= 0 &&
      ring < RINGS &&
      step >= 0 &&
      step < STEPS;
    this.hide(plantId);
    if (!isOnBed) return;
    const slot = ring * STEPS + step;
    const older = this.plantAt[slot];
    if (typeof older === 'string') this.hide(older);

    this.slotOf.set(plantId, slot);
    this.plantAt[slot] = plantId;
    this.live[this.liveCount++] = slot;
    this.untilMs[slot] = untilMs;
    // Bed-local (x, y) is the bed's x and z (D-029).
    cellCentre(plant.cell, centre);
    const radius = Math.sqrt(centre.x * centre.x + centre.y * centre.y);
    this.outward[slot * 2] = centre.x / radius;
    this.outward[slot * 2 + 1] = centre.y / radius;
    const matrix = this.mesh.instanceMatrix.array;
    this.home[slot * 3] = matrix[slot * 16 + 12] = centre.x;
    this.home[slot * 3 + 1] = matrix[slot * 16 + 13] = PETAL_LIFT_M;
    this.home[slot * 3 + 2] = matrix[slot * 16 + 14] = centre.y;
    matrix[slot * 16 + 15] = 1;
    this.widthM[slot] = PETAL_START_DIAMETER_M;
    this.resize(slot);
    // The plant's own colour at a plant's rest brightness (the palette is written in sRGB, UX §5), fully there.
    colour.setHSL(plant.hue, PLANT_SATURATION, PLANT_LIGHTNESS, SRGBColorSpace).toArray(this.unit, slot * 3);
    colour.multiplyScalar(PLANT_REST_BRIGHTNESS).toArray(this.colours.array, slot * 4);
    this.colours.array[slot * 4 + 3] = 1;
    this.colours.needsUpdate = true;
    this.glow[slot] = this.lit[slot] = 0;
    this.lift[slot] = 1;
    // A new thing on a reused element: at rest, with no swing in progress, whatever the last petal here left.
    this.guard.reset(this.firstElement + slot, PLANT_REST_BRIGHTNESS);
    this.arrive(slot, from);
    this.mesh.visible = true;
  }

  /** Takes a plant's petal away at once: on `garden:changed` with its id in `diff.added` (the undo). */
  hide(plantId: string): void {
    const slot = this.slotOf.get(plantId);
    if (slot === undefined) return;
    this.slotOf.delete(plantId);
    this.plantAt[slot] = null;
    const index = this.live.indexOf(slot);
    this.live[index] = this.live[--this.liveCount]!;
    this.widthM[slot] = 0;
    this.resize(slot);
    this.arrival[slot] = AT_ONCE; // the rest of its burst, if it is still in the air, lands by itself
    if (this.hoverSlot[0] === slot) this.hoverSlot[0] = -1;
    if (this.hoverSlot[1] === slot) this.hoverSlot[1] = -1;
    this.mesh.visible = this.liveCount > 0 || this.flying > 0;
  }

  /**
   * FR-HND-16, UX §9.3: the petal that hand (or the gaze, named for the dominant hand) would take now, the id of
   * `target:hover` of kind `undo`, or null. It glows PLANT_HOVER_LIFT brighter, in and out over HOVER_CUE_MS, as a
   * hovered seed does. One per hand; two hands on one petal are one glow; an id with no petal glows nothing.
   */
  setHover(hand: Hand, plantId: string | null): void {
    this.hoverSlot[hand === 'left' ? 0 : 1] = plantId === null ? -1 : (this.slotOf.get(plantId) ?? -1);
  }

  /** Takes every petal away, and every petal of a burst still in the air: New garden drops every undo token. */
  clear(): void {
    while (this.liveCount > 0) this.hide(this.plantAt[this.live[0]!]!);
    const matrix = this.mesh.instanceMatrix.array;
    for (let i = 0; i < BURST_POOL; i++) {
      this.particleAt[i] = NONE;
      for (const e of [0, 2, 5, 8, 10]) matrix[(PLANT_CAPACITY + i) * 16 + e] = 0;
    }
    this.flying = 0;
    this.mesh.count = PLANT_CAPACITY;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = false;
  }

  /** Whether that plant's petal is up. Its pinch target lives exactly as long (API_SPEC §1.10 rule 7). */
  has(plantId: string): boolean {
    return this.slotOf.has(plantId);
  }

  /**
   * Per frame, creates nothing. Each petal shrinks in a straight line over the undo's life, fades out over its
   * last PETAL_FADE_MS through the flash cap (FR-UI-11), and goes when `nowMs` reaches its time. A petal that
   * arrives drifts in from the release point, or fades in, from this frame on; a burst's other petals drift and
   * shrink to nothing at one brightness, so they change no luminance. `nowMs` is the frame's time; one that is
   * not finite changes nothing.
   */
  update(nowMs: number): void {
    // FR-UI-05, the undo petals only: a burst's petals are not targets. Hidden with the mesh.
    this.outline.count = settings.get().highContrast ? PLANT_CAPACITY : 0;
    this.outline.visible = this.outline.count > 0;
    if ((this.liveCount === 0 && this.flying === 0) || !Number.isFinite(nowMs)) return;
    this.now[0] = nowMs;
    const passedMs = nowMs - this.lastMs[0]!; // NaN on the first frame: no ease then
    this.lastMs[0] = nowMs;
    if (passedMs > 0) this.lastMs[1] = passedMs / HOVER_CUE_MS;
    else this.lastMs[1] = 0; // two stores, not one `? :`: see the loop below
    this.easeHover();
    if (this.flying > 0) this.fly();
    const alpha = this.colours.array;
    const matrix = this.mesh.instanceMatrix.array;
    for (let i = this.liveCount - 1; i >= 0; i--) {
      const slot = this.live[i]!;
      const leftMs = this.untilMs[slot]! - nowMs;
      if (!(leftMs > 0)) {
        this.hide(this.plantAt[slot]!); // also a time that is not a number: no end to wait for
        continue;
      }
      const life = leftMs < UNDO_LIFE_MS ? leftMs / UNDO_LIFE_MS : 1;
      this.widthM[slot] = PETAL_END_DIAMETER_M + (PETAL_START_DIAMETER_M - PETAL_END_DIAMETER_M) * life;
      this.resize(slot);
      const arrival = this.arrival[slot];
      if (this.arriveAt[slot] === NEXT_FRAME) this.arriveAt[slot] = nowMs;
      const sinceMs = nowMs - this.arriveAt[slot]!;
      if (arrival === DRIFT) {
        // UX §9.3: from the release point to the cell over BURST_MS, ease-out.
        const left = Math.max(0, 1 - sinceMs / BURST_MS);
        for (let c = 0; c < 3; c++) {
          const home = this.home[slot * 3 + c]!;
          matrix[slot * 16 + 12 + c] = home + (this.arriveFrom[slot * 3 + c]! - home) * left * left;
        }
        if (left === 0) this.arrival[slot] = AT_ONCE;
      }
      // Until its fade is a luminance change (half of FLASH_MIN_DELTA, where the guard starts a swing), a petal
      // keeps the brightness show() drew it at and the guard is not asked: asked for an element that has not
      // swung yet, it cost a boxed number per call (16 bytes, measured). That is the first 21 ms of the fade.
      // A petal that fades in (reduced motion) asks for the lower of its fade in and its fade out. A hovered
      // petal (FR-HND-16) asks for its brightness times the lift easeHover set, and one lifted asks until it is
      // back at rest, as the guard may hold it lit.
      // Math.min, never `wanted = PLANT_REST_BRIGHTNESS` in a branch: a value that is a constant on one path and
      // a fraction on the other is boxed per call (16 bytes, measured; FlashGuard.request notes the same).
      const lift = this.lift[slot]!;
      let wanted = (PLANT_REST_BRIGHTNESS * leftMs) / PETAL_FADE_MS;
      if (arrival === FADE_IN)
        wanted = Math.min(wanted, (PLANT_REST_BRIGHTNESS * sinceMs) / PETAL_FADE_IN_MS);
      else if (wanted > PLANT_REST_BRIGHTNESS - FLASH_MIN_DELTA / 2 && lift === 1 && this.lit[slot] === 0)
        continue;
      wanted = Math.min(wanted, PLANT_REST_BRIGHTNESS) * lift;
      const granted = this.guard.request(this.firstElement + slot, Math.min(1, wanted), nowMs);
      // The fade is a fade of the alpha; the lift above rest is in the colour, which the alpha cannot exceed.
      alpha[slot * 4 + 3] = Math.min(1, granted / PLANT_REST_BRIGHTNESS);
      const level = Math.max(granted, PLANT_REST_BRIGHTNESS);
      alpha[slot * 4] = this.unit[slot * 3]! * level;
      alpha[slot * 4 + 1] = this.unit[slot * 3 + 1]! * level;
      alpha[slot * 4 + 2] = this.unit[slot * 3 + 2]! * level;
      this.lit[slot] = granted > PLANT_REST_BRIGHTNESS ? 1 : 0;
      this.colours.needsUpdate = true;
      if (arrival === FADE_IN && granted >= PLANT_REST_BRIGHTNESS) this.arrival[slot] = AT_ONCE;
    }
    this.mesh.visible = this.liveCount > 0 || this.flying > 0;
  }

  /**
   * The hover cue's ease (FR-HND-16), per frame before the main loop: the glow of a hovered petal goes in, and
   * of one no longer hovered out, over HOVER_CUE_MS; each one's lift, 1 + PLANT_HOVER_LIFT × glow, is what the
   * loop asks the guard for. The guard is asked in the loop only, once per petal: a second call site here would
   * not be inlined (measured: 16 bytes per call, the fraction it returns, boxed). Creates nothing.
   */
  private easeHover(): void {
    const moved = this.lastMs[1]!;
    const hover0 = this.hoverSlot[0];
    const hover1 = this.hoverSlot[1];
    for (let i = 0; i < this.liveCount; i++) {
      const slot = this.live[i]!;
      const glow = this.glow[slot]!;
      if (slot === hover0 || slot === hover1) {
        if (glow < 1) this.lift[slot] = 1 + PLANT_HOVER_LIFT * (this.glow[slot] = Math.min(1, glow + moved));
      } else if (glow > 0) this.lift[slot] = 1 + PLANT_HOVER_LIFT * (this.glow[slot] = Math.max(0, glow - moved));
    }
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.outline.material.dispose();
    this.mesh.dispose();
  }

  /**
   * How a petal just shown arrives (UX §9.3): fading in under reduced motion; else, with a release point, as one
   * of a burst that drifts from there to its cell; else at once.
   */
  private arrive(slot: number, from: Vec3 | null): void {
    this.arrival[slot] = AT_ONCE;
    this.arriveAt[slot] = NEXT_FRAME;
    if (settings.get().reducedMotion) {
      this.arrival[slot] = FADE_IN;
      this.colours.array[slot * 4 + 3] = 0;
      this.guard.reset(this.firstElement + slot, 0);
      return;
    }
    if (from === null) return;
    this.arrival[slot] = DRIFT;
    const matrix = this.mesh.instanceMatrix.array;
    this.arriveFrom[slot * 3] = matrix[slot * 16 + 12] = from.x;
    this.arriveFrom[slot * 3 + 1] = matrix[slot * 16 + 13] = from.y;
    this.arriveFrom[slot * 3 + 2] = matrix[slot * 16 + 14] = from.z;
    // The rest of the burst: a ring round the release point, each on its way to the same cell, in its colour.
    for (let k = 0; k < BURST_PETALS - 1; k++) {
      const i = this.nextParticle;
      this.nextParticle = (i + 1) % BURST_POOL;
      if (this.particleAt[i] === NONE) this.flying++;
      this.mesh.count = PLANT_CAPACITY + BURST_POOL;
      this.particleAt[i] = NEXT_FRAME;
      const angle = (2 * Math.PI * k) / (BURST_PETALS - 1);
      this.particleFrom[i * 3] = from.x + BURST_SPREAD_M * Math.cos(angle);
      this.particleFrom[i * 3 + 1] = from.y;
      this.particleFrom[i * 3 + 2] = from.z + BURST_SPREAD_M * Math.sin(angle);
      for (let c = 0; c < 3; c++) this.particleTo[i * 3 + c] = this.home[slot * 3 + c]!;
      this.particleOut[i * 2] = this.outward[slot * 2]!;
      this.particleOut[i * 2 + 1] = this.outward[slot * 2 + 1]!;
      for (let c = 0; c < 4; c++) {
        this.colours.array[(PLANT_CAPACITY + i) * 4 + c] = this.colours.array[slot * 4 + c]!;
      }
    }
  }

  /**
   * Per frame while a burst is in the air: each of its petals moves toward its cell (ease-out over BURST_MS) and
   * shrinks in a straight line to nothing on arrival, at one brightness. Nothing is created.
   */
  private fly(): void {
    const now = this.now[0]!;
    const matrix = this.mesh.instanceMatrix.array;
    for (let i = 0; i < BURST_POOL; i++) {
      if (this.particleAt[i] === NONE) continue;
      if (this.particleAt[i] === NEXT_FRAME) this.particleAt[i] = now;
      const left = Math.max(0, 1 - (now - this.particleAt[i]!) / BURST_MS);
      const at = (PLANT_CAPACITY + i) * 16;
      for (let c = 0; c < 3; c++) {
        const to = this.particleTo[i * 3 + c]!;
        matrix[at + 12 + c] = to + (this.particleFrom[i * 3 + c]! - to) * left * left;
      }
      const widthM = BURST_PETAL_DIAMETER_M * left;
      const x = this.particleOut[i * 2]! * widthM;
      const z = this.particleOut[i * 2 + 1]! * widthM;
      matrix[at] = matrix[at + 10] = x;
      matrix[at + 2] = z;
      matrix[at + 8] = -z;
      matrix[at + 5] = widthM;
      matrix[at + 15] = 1;
      if (left > 0) continue;
      this.particleAt[i] = NONE;
      this.flying--;
    }
    if (this.flying === 0) this.mesh.count = PLANT_CAPACITY;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Writes a slot's width into its instance: the turn that lays its long side outward, times `widthM`. The
   * width comes in through the array, not as an argument: a fraction handed to a method was boxed, 16 bytes per
   * petal per frame (measured), and so would be the ones a Matrix4's setters take.
   */
  private resize(slot: number): void {
    const matrix = this.mesh.instanceMatrix.array;
    const widthM = this.widthM[slot]!;
    const x = this.outward[slot * 2]! * widthM;
    const z = this.outward[slot * 2 + 1]! * widthM;
    const at = slot * 16;
    matrix[at] = matrix[at + 10] = x;
    matrix[at + 2] = z;
    matrix[at + 8] = -z;
    matrix[at + 5] = widthM;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
