// The undo petal (UX §9.3, FR-MUS-12): after a plant is removed, one petal in its colour waits 3 cm above the
// cell it stood on and shrinks while the undo lasts. One InstancedMesh: one draw call while any petal is up, none
// otherwise. A cell holds one petal at most, so an instance is a cell, and so is a FlashGuard element.
// Nothing here listens to the bus or reads a clock: the wiring calls show, hide and clear from the garden's
// events and update once per frame (API_SPEC §1.8). update allocates nothing.
import {
  CircleGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three';

import { cellCentre, RINGS, STEPS, UNDO_LIFE_MS } from '../garden/index.js';

import {
  FLASH_MIN_DELTA,
  PETAL_ASPECT,
  PETAL_END_DIAMETER_M,
  PETAL_FADE_MS,
  PETAL_LIFT_M,
  PETAL_SEGMENTS,
  PETAL_START_DIAMETER_M,
  PLANT_CAPACITY,
  PLANT_LIGHTNESS,
  PLANT_REST_BRIGHTNESS,
  PLANT_SATURATION,
} from './config.js';

import type { FlashGuard } from './FlashGuard.js';
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

const colour = new Color();
const centre = { x: 0, y: 0 };

export class PetalRenderer {
  readonly mesh: InstancedMesh<CircleGeometry, ShaderMaterial>;
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

  constructor(
    parent: Object3D,
    private readonly guard: FlashGuard,
  ) {
    this.firstElement = guard.claim(PLANT_CAPACITY);
    // One unit long, so an instance's scale is its width in metres; flat on the bed's plane.
    const geometry = new CircleGeometry(0.5, PETAL_SEGMENTS).rotateX(-Math.PI / 2).scale(1, 1, PETAL_ASPECT);
    this.colours = new InstancedBufferAttribute(new Float32Array(PLANT_CAPACITY * 4), 4);
    geometry.setAttribute('aColour', this.colours);
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new InstancedMesh(geometry, material, PLANT_CAPACITY);
    this.mesh.instanceMatrix.array.fill(0); // every slot starts with no size: nothing of it is drawn
    this.mesh.visible = false;
    this.mesh.frustumCulled = false; // its bounds are one petal's; the instances lie all over the bed
    this.mesh.renderOrder = 3; // after the bed's glass, its markers and the tide
    this.mesh.matrixAutoUpdate = false;
    parent.add(this.mesh);
  }

  /**
   * A petal for a removed plant, over the cell it stood on, until `update`'s `nowMs` reaches `untilMs`. Set-up
   * only, on `garden:removed`: `untilMs` is on the clock of `update`, so the caller converts the event's
   * `expiresAt`, which is on core's clock. One petal per cell (UX §9.3: never two on one spot): a petal already
   * over that cell goes, and so does an older one of the same plant. A cell that is not on the bed shows none.
   */
  show(plantId: string, plant: Pick<Plant, 'cell' | 'hue'>, untilMs: number): void {
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
    matrix[slot * 16 + 12] = centre.x;
    matrix[slot * 16 + 13] = PETAL_LIFT_M;
    matrix[slot * 16 + 14] = centre.y;
    matrix[slot * 16 + 15] = 1;
    this.widthM[slot] = PETAL_START_DIAMETER_M;
    this.resize(slot);
    // The plant's own colour at a plant's rest brightness (the palette is written in sRGB, UX §5), fully there.
    colour
      .setHSL(plant.hue, PLANT_SATURATION, PLANT_LIGHTNESS, SRGBColorSpace)
      .multiplyScalar(PLANT_REST_BRIGHTNESS)
      .toArray(this.colours.array, slot * 4);
    this.colours.array[slot * 4 + 3] = 1;
    this.colours.needsUpdate = true;
    // A new thing on a reused element: at rest, with no swing in progress, whatever the last petal here left.
    this.guard.reset(this.firstElement + slot, PLANT_REST_BRIGHTNESS);
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
    this.mesh.visible = this.liveCount > 0;
  }

  /** Takes every petal away: New garden drops every undo token, and no event says so. */
  clear(): void {
    while (this.liveCount > 0) this.hide(this.plantAt[this.live[0]!]!);
  }

  /** Whether that plant's petal is up. Its pinch target lives exactly as long (API_SPEC §1.10 rule 7). */
  has(plantId: string): boolean {
    return this.slotOf.has(plantId);
  }

  /**
   * Per frame, creates nothing. Each petal shrinks in a straight line over the undo's life, fades out over its
   * last PETAL_FADE_MS through the flash cap (FR-UI-11), and goes when `nowMs` reaches its time. `nowMs` is the
   * frame's time; one that is not finite changes nothing.
   */
  update(nowMs: number): void {
    if (this.liveCount === 0 || !Number.isFinite(nowMs)) return;
    const alpha = this.colours.array;
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
      // Until its fade is a luminance change (half of FLASH_MIN_DELTA, where the guard starts a swing), a petal
      // keeps the brightness show() drew it at and the guard is not asked: asked for an element that has not
      // swung yet, it cost a boxed number per call (16 bytes, measured). That is the first 21 ms of the fade.
      const wanted = (PLANT_REST_BRIGHTNESS * leftMs) / PETAL_FADE_MS;
      if (wanted > PLANT_REST_BRIGHTNESS - FLASH_MIN_DELTA / 2) continue;
      alpha[slot * 4 + 3] =
        this.guard.request(this.firstElement + slot, wanted, nowMs) / PLANT_REST_BRIGHTNESS;
      this.colours.needsUpdate = true;
    }
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
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
