// The seeds (T-127, UX §3.3, §7): the waiting ones in the supply orb, a small ring over the bed's centre hole with
// one place per seed of the supply, and the one that is out, on a hand. One InstancedMesh: one draw call while any
// seed is drawn, none otherwise. A seed glides (ease-out) to the point it is sent to and then follows it; it is
// lit full while it is out, through the guard (FR-UI-11). A seed keeps its place in the orb while it is out.
// Nothing here listens to the bus or reads a clock: SeedSystem calls it (API_SPEC §1.8). update allocates nothing.
import {
  Color,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';

import { settings } from '../core/index.js';
import { SEED_SUPPLY_MAX } from '../garden/index.js';

import {
  PLANT_LIGHTNESS,
  PLANT_REST_BRIGHTNESS,
  PLANT_SATURATION,
  SEED_BUMP_M,
  SEED_BUMP_REDUCED_M,
  SEED_DETAIL,
  SEED_DIAMETER_M,
  SEED_GLIDE_MS,
  SEED_HOP_MS,
  SEED_OUT_BRIGHTNESS,
  SUPPLY_ORB_LIFT_M,
  SUPPLY_ORB_RADIUS_M,
} from './config.js';

import type { FlashGuard } from './FlashGuard.js';
import type { Seed } from '../garden/index.js';
import type { Matrix4, Object3D } from 'three';

/** How a seed goes to its point: the orb glide, the hop from palm to pinch, the glide with a hop up, or at once. */
export type SeedMove = 'glide' | 'hop' | 'bump' | 'jump';

// FR-MUS-08: the seed that is out is still in the supply (API_SPEC §1.10 rule 8), so five places are all there is.
const CAPACITY = SEED_SUPPLY_MAX;
const colour = new Color();

export class SeedRenderer {
  readonly mesh: InstancedMesh<IcosahedronGeometry, MeshBasicMaterial>;
  private readonly firstElement: number;
  private readonly slotOf = new Map<string, number>();
  private readonly ids: (string | null)[] = new Array<string | null>(CAPACITY).fill(null);
  /** Per slot: the point it follows, which its caller moves (a hand's), or null: its own place in the orb. */
  private readonly follows: (Vector3 | null)[] = new Array<Vector3 | null>(CAPACITY).fill(null);
  /** Per slot: its place in the orb, world space, as of the last update with a bed. */
  private readonly orbAt = Array.from({ length: CAPACITY }, () => new Vector3());
  /** Per slot: drawn on the last update (1) or not, where (x, y, z), and where its glide began. */
  private readonly isDrawn = new Uint8Array(CAPACITY);
  private readonly at = new Float32Array(CAPACITY * 3);
  private readonly from = new Float32Array(CAPACITY * 3);
  /** Per slot: when its glide began (update's clock), how long it takes (0 = it is there) and how high it hops. */
  private readonly startMs = new Float64Array(CAPACITY);
  private readonly glideMs = new Float64Array(CAPACITY);
  private readonly bumpM = new Float64Array(CAPACITY);
  /**
   * Per slot, this frame: how far along its glide is (eased, 0..1) and how high its hop is. Handed to `place`
   * through these arrays, not as arguments: a fraction handed to a method was boxed, 16 bytes each per frame of
   * a glide (measured, as PetalRenderer found for its width).
   */
  private readonly eased = new Float64Array(CAPACITY);
  private readonly lift = new Float64Array(CAPACITY);
  /** Per slot: the brightness the guard last handed out, and its colour at full brightness (linear). */
  private readonly brightness = new Float64Array(CAPACITY);
  private readonly rgb = new Float32Array(CAPACITY * 3);

  constructor(
    parent: Object3D,
    private readonly guard: FlashGuard,
  ) {
    this.firstElement = guard.claim(CAPACITY, PLANT_REST_BRIGHTNESS);
    const material = new MeshBasicMaterial({ toneMapped: false }); // unlit, as the plants are (NFR-PERF-09)
    this.mesh = new InstancedMesh(new IcosahedronGeometry(0.5, SEED_DETAIL), material, CAPACITY);
    this.mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(CAPACITY * 3), 3);
    this.mesh.instanceMatrix.array.fill(0); // every slot starts with no size: nothing of it is drawn
    this.mesh.visible = false;
    this.mesh.frustumCulled = false; // its bounds are one seed's at the origin; the seeds are anywhere
    this.mesh.matrixAutoUpdate = false; // drawn in world space: the parent is the scene
    parent.add(this.mesh);
  }

  /**
   * On `garden:changed`: the seeds of the supply (FR-MUS-08). A new one appears in its place in the orb at rest,
   * one that is gone (planted, or another garden's) goes at once. Set-up only, not per frame.
   */
  setSupply(seeds: readonly Pick<Seed, 'id' | 'hue'>[]): void {
    for (let slot = 0; slot < CAPACITY; slot++) {
      const id = this.ids[slot];
      if (typeof id === 'string' && !seeds.some((seed) => seed.id === id)) this.free(slot);
    }
    for (const seed of seeds) {
      let slot = this.slotOf.get(seed.id);
      if (slot === undefined) {
        slot = this.ids.indexOf(null);
        if (slot < 0) continue; // more than the supply holds: not drawn
        this.take(slot, seed.id);
      }
      // A seed's hue tints it (UX §5), in the plants' palette, written in sRGB.
      colour.setHSL(seed.hue, PLANT_SATURATION, PLANT_LIGHTNESS, SRGBColorSpace).toArray(this.rgb, slot * 3);
      this.paint(slot);
    }
  }

  /** Whether that seed is in the supply as this renderer last heard it. */
  has(seedId: string): boolean {
    return this.slotOf.has(seedId);
  }

  /**
   * Sends a seed from where it is drawn to `point`, which it then follows: a point its caller moves every frame
   * (a hand's palm or pinch point), or null for its place in the orb. A seed not drawn yet is there at once.
   * Returns false for a seed this renderer does not hold. `nowMs` is on update's clock.
   */
  follow(seedId: string, point: Vector3 | null, nowMs: number, move: SeedMove): boolean {
    const slot = this.slotOf.get(seedId);
    if (slot === undefined) return false;
    this.follows[slot] = point;
    this.startMs[slot] = nowMs;
    const isThere = this.isDrawn[slot] === 0 || move === 'jump';
    this.glideMs[slot] = isThere ? 0 : move === 'hop' ? SEED_HOP_MS : SEED_GLIDE_MS;
    this.bumpM[slot] = move !== 'bump' ? 0 : settings.get().reducedMotion ? SEED_BUMP_REDUCED_M : SEED_BUMP_M;
    for (let axis = 0; axis < 3; axis++) this.from[slot * 3 + axis] = this.at[slot * 3 + axis]!;
    return true;
  }

  /** Where that seed is drawn, into `out`; false (and `out` untouched) when it is not drawn. */
  positionOf(seedId: string, out: Vector3): boolean {
    const slot = this.slotOf.get(seedId);
    if (slot === undefined || this.isDrawn[slot] === 0) return false;
    out.fromArray(this.at, slot * 3);
    return true;
  }

  /**
   * Per frame, creates nothing. `bed`: the bed's world matrix, or null while no bed is placed, when the seeds in
   * the orb are not drawn. Each seed glides toward its point and then follows it; its brightness follows the
   * glide through the guard. `nowMs` is the frame's time and never goes back; one that is not finite moves nothing.
   */
  update(bed: Matrix4 | null, nowMs: number): void {
    if (!Number.isFinite(nowMs)) return;
    let drawn = 0;
    for (let slot = 0; slot < CAPACITY; slot++) {
      const point = this.ids[slot] === null ? null : (this.follows[slot] ?? this.orbPlace(slot, bed));
      if (point === null) {
        this.hide(slot);
        continue;
      }
      const glideMs = this.glideMs[slot]!;
      const t = glideMs > 0 ? Math.min(1, Math.max(0, (nowMs - this.startMs[slot]!) / glideMs)) : 1;
      const left = 1 - t;
      this.eased[slot] = 1 - left * left * left; // ease-out (UX §5)
      this.lift[slot] = this.bumpM[slot]! * Math.sin(Math.PI * t);
      this.place(slot, point);
      // Brightness: at rest in the orb, full from the moment it is sent out, one step each way through the guard
      // (FR-UI-11), asked only until the guard grants it. Not a ramp along the glide: the guard's call boxed the
      // fraction it took and the one it returned, 32 bytes every frame of a glide (measured); a step costs that
      // once per seed sent.
      const wanted = this.follows[slot] === null ? PLANT_REST_BRIGHTNESS : SEED_OUT_BRIGHTNESS;
      if (this.brightness[slot] !== wanted) {
        this.brightness[slot] = this.guard.request(this.firstElement + slot, wanted, nowMs);
        this.paint(slot);
      }
      drawn++;
    }
    this.mesh.visible = drawn > 0;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }

  /** The slot's place in the orb in world space, worked out from the bed's pose; null with no bed. */
  private orbPlace(slot: number, bed: Matrix4 | null): Vector3 | null {
    if (bed === null) return null;
    // The ring lies level in the bed's frame, place 0 nearest the user (+z, D-029), the others round from it.
    const angle = Math.PI / 2 + (slot * 2 * Math.PI) / CAPACITY;
    const radius = SUPPLY_ORB_RADIUS_M;
    return this.orbAt[slot]!.set(
      radius * Math.cos(angle),
      SUPPLY_ORB_LIFT_M,
      radius * Math.sin(angle),
    ).applyMatrix4(bed);
  }

  /** Writes where the slot is drawn: its eased share of the way from its glide's start to `point`, plus its hop. */
  private place(slot: number, point: Vector3): void {
    const at = this.at;
    const from = this.from;
    const ease = this.eased[slot]!;
    const i = slot * 3;
    const x = from[i]! + (point.x - from[i]!) * ease;
    const y = from[i + 1]! + (point.y - from[i + 1]!) * ease + this.lift[slot]!;
    const z = from[i + 2]! + (point.z - from[i + 2]!) * ease;
    // Dirty flag: a seed resting in the orb over a bed that stays put uploads nothing.
    const isMoved =
      this.isDrawn[slot] === 0 ||
      at[i] !== Math.fround(x) ||
      at[i + 1] !== Math.fround(y) ||
      at[i + 2] !== Math.fround(z);
    if (!isMoved) return;
    at[i] = x;
    at[i + 1] = y;
    at[i + 2] = z;
    this.isDrawn[slot] = 1;
    const matrix = this.mesh.instanceMatrix.array;
    const m = slot * 16;
    matrix[m] = matrix[m + 5] = matrix[m + 10] = SEED_DIAMETER_M;
    matrix[m + 12] = x;
    matrix[m + 13] = y;
    matrix[m + 14] = z;
    matrix[m + 15] = 1;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private hide(slot: number): void {
    this.isDrawn[slot] = 0;
    const matrix = this.mesh.instanceMatrix.array;
    if (matrix[slot * 16] === 0) return;
    matrix[slot * 16] = matrix[slot * 16 + 5] = matrix[slot * 16 + 10] = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** A new seed in a free slot: at rest in the orb, a new thing on its element (no swing in progress). */
  private take(slot: number, seedId: string): void {
    this.ids[slot] = seedId;
    this.slotOf.set(seedId, slot);
    this.follows[slot] = null;
    this.glideMs[slot] = 0;
    this.bumpM[slot] = 0;
    this.isDrawn[slot] = 0;
    this.brightness[slot] = PLANT_REST_BRIGHTNESS;
    this.guard.reset(this.firstElement + slot, PLANT_REST_BRIGHTNESS);
  }

  private free(slot: number): void {
    this.slotOf.delete(this.ids[slot]!);
    this.ids[slot] = null;
    this.follows[slot] = null;
    this.hide(slot);
  }

  /** The slot's colour at the brightness the guard last handed out, straight into the buffer. */
  private paint(slot: number): void {
    const rgb = this.mesh.instanceColor!.array;
    const brightness = this.brightness[slot]!;
    for (let channel = 0; channel < 3; channel++) {
      rgb[slot * 3 + channel] = this.rgb[slot * 3 + channel]! * brightness;
    }
    this.mesh.instanceColor!.needsUpdate = true;
  }
}
