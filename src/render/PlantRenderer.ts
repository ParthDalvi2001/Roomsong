// The plants (LLD §1, UX §5): one InstancedMesh per silhouette, 80 instances each at most, and one more for the
// leaf whorls that count a plant's age (UX §9.6), all with one shared unlit material: six draw calls at most,
// whatever grows. A plant's cell gives the instance its place, its height the stem, its hue the colour; the
// brightness of the colour is whatever the FlashGuard hands out.
// setState runs when the garden changes and rewrites the instances; update runs per frame and allocates nothing.
import {
  BufferAttribute,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  LatheGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three';

import { settings } from '../core/index.js';
import { cellCentre, heightAfterPull, stageFor, STEPS } from '../garden/index.js';
import { REVERT_LERP_MS } from '../hands/index.js';

import { onBed } from './BedRenderer.js';
import {
  CREAM,
  FLASH_MIN_DELTA,
  HOVER_CUE_MS,
  PLANT_BLOOM_MS,
  PLANT_BLOOM_WAIT_MS,
  PLANT_BLOSSOM_LIGHTNESS,
  PLANT_BLOSSOM_WIDTH,
  PLANT_CAPACITY,
  PLANT_FOOT_SHADE,
  PLANT_HOVER_LIFT,
  PLANT_LIGHTNESS,
  PLANT_LOBE_DEPTH,
  PLANT_OFF_BED_BRIGHTNESS,
  PLANT_OUTLINE_FROM,
  PLANT_OUTLINE_FULL,
  PLANT_PINCH_LIFT_M,
  PLANT_TURN_MIN_R_M,
  PLANT_REFERENCE_STEM_M,
  PLANT_REST_BRIGHTNESS,
  PLANT_RIM_GLOW,
  PLANT_SATURATION,
  PLANT_STEM_MAX_M,
  PLANT_STEM_MIN_M,
  PLANT_TINT_BACK_MS,
  PLANT_TINT_BRIGHTNESS,
  PLANT_WHORL_AT,
  PLANT_WHORL_LOBE_DEPTH,
} from './config.js';
import { ShapingGuides } from './ShapingGuides.js';
import { stepGlow } from './TideRenderer.js';

import type { FlashGuard } from './FlashGuard.js';
import type { EventMap, Hand, Vec3 } from '../core/index.js';
import type { GardenState, VoiceType } from '../garden/index.js';
import type { Object3D } from 'three';

/** One row of a silhouette's outline: radius in metres, height, and whether the row is part of the head. */
type ProfileRow = readonly [radiusM: number, y: number, head: 0 | 1];
interface Shape {
  /** Along the outline. A stem row's height is a share of the stem (0..1); a head row's is metres above its
   *  top, or below it when negative (the choir's canopy hangs). */
  profile: readonly ProfileRow[];
  segments: number;
  /** Petals pressed into the head's outline; 0 = round. */
  lobes: number;
  /** How far the outline is pressed in between two petals, as a share of its radius; PLANT_LOBE_DEPTH if not given. */
  lobeDepth?: number;
}

// The five silhouettes of LLD §7: three from T-125, the jug and the umbrella from UX §9.5. Every foot is 2.5 cm
// across (FR-HND-04) and no head is wider than the 4.5 cm between two rings (FR-MUS-01). These tables are the
// shapes themselves, data like a model file would be, so they stay here and not in config.ts (T-125 review).
const SHAPES: readonly Shape[] = [
  {
    // Bell: a tall bulb with a drooping cap.
    profile: [
      [0.0125, 0, 0],
      [0.004, 0.08, 0],
      [0.003, 1, 0],
      [0.007, 0.002, 1],
      [0.013, 0.01, 1],
      [0.014, 0.019, 1],
      [0.006, 0.03, 1],
      [0.017, 0.026, 1],
      [0.015, 0.034, 1],
      [0.009, 0.04, 1],
      [0, 0.043, 1],
    ],
    segments: 12,
    lobes: 0,
  },
  {
    // Pad: a wide soft fan of leaves, open at the top.
    profile: [
      [0.0125, 0, 0],
      [0.004, 0.08, 0],
      [0.004, 1, 0],
      [0.012, 0.003, 1],
      [0.019, 0.011, 1],
      [0.022, 0.022, 1],
    ],
    segments: 20,
    lobes: 5,
  },
  {
    // Pluck: a thin reed with a bead.
    profile: [
      [0.0125, 0, 0],
      [0.002, 0.05, 0],
      [0.0015, 1, 0],
      [0.0012, 0.03, 1],
      [0.0045, 0.032, 1],
      [0.006, 0.036, 1],
      [0.0045, 0.04, 1],
      [0, 0.042, 1],
    ],
    segments: 8,
    lobes: 0,
  },
  {
    // Bass: a jug. A low, broad bulb that sits on the bed and stretches with the stem, a thin neck, a small cap.
    profile: [
      [0.0125, 0, 0],
      [0.02, 0.06, 0],
      [0.02, 0.16, 0],
      [0.011, 0.24, 0],
      [0.005, 0.3, 0],
      [0.004, 1, 0],
      [0.009, 0.003, 1],
      [0.011, 0.008, 1],
      [0.008, 0.014, 1],
      [0, 0.017, 1],
    ],
    segments: 12,
    lobes: 0,
  },
  {
    // Choir: an umbrella. A canopy of three rounded petals that hangs over the top of the stem, open underneath.
    profile: [
      [0.0125, 0, 0],
      [0.004, 0.08, 0],
      [0.004, 1, 0],
      [0.004, 0.01, 1],
      [0.013, 0.006, 1],
      [0.02, -0.006, 1],
      [0.021, -0.016, 1],
      [0.019, -0.024, 1],
    ],
    segments: 18,
    lobes: 3,
  },
];
// A leaf whorl (UX §9.6): a flat ring of four leaves round the stem, 2.4 cm across and 0.3 cm thick, 32
// triangles. Its rows are head rows, so it rides at the top of its own instance's height and keeps its shape.
const WHORL: Shape = {
  profile: [
    [0.002, 0, 1],
    [0.012, 0.0015, 1],
    [0.002, 0.003, 1],
  ],
  segments: 8,
  lobes: 4,
  lobeDepth: PLANT_WHORL_LOBE_DEPTH,
};
/** FR-MUS-09: the stage at which the whorls are blossoms; and the mark of a slot whose plant was not drawn yet. */
const BLOSSOM_STAGE = 3;
const UNSEEN = 255;
const NO_WHORL = 255;
/** The mesh a voice is drawn in. Shimmer (Should, S5) borrows the pluck's until it has its own (UX §9.5). */
const SHAPE_OF: Readonly<Record<VoiceType, number>> = {
  bell: 0,
  pad: 1,
  pluck: 2,
  bass: 3,
  choir: 4,
  shimmer: 2,
};
const TALLEST_HEAD_M = Math.max(...SHAPES.map((shape) => shape.profile[shape.profile.length - 1]![1]));
/** A number as a GLSL float literal. */
const glsl = (value: number): string => value.toFixed(5);
/** UX §5 cream as the shader and the instance colours take it: linear. */
const CREAM_RGB = new Color(CREAM).toArray();

// No idle sway yet: it comes with the art pass (T-163), together with the reduced-motion switch.
const VERTEX = /* glsl */ `
attribute float aHead;
varying vec3 vColour;
varying vec3 vNormal;
varying vec3 vView;
varying float vUp;
void main() {
  float stem = length(instanceMatrix[1].xyz); // the instance's y scale is the stem's height in metres
  // The stem stretches with the plant; the head rides on its top and keeps its shape.
  float y = mix(position.y, 1.0 + position.y / stem, aHead);
  vec4 local = instanceMatrix * vec4(position.x, y, position.z, 1.0);
  vec4 view = modelViewMatrix * local;
  // The instance turns and stretches but never tilts, and the stretch does not reach the head: the normal
  // only needs the turn.
  vec3 turned = instanceMatrix[0].xyz * normal.x + vec3(0.0, normal.y, 0.0) + instanceMatrix[2].xyz * normal.z;
  vNormal = normalMatrix * turned;
  vView = -view.xyz;
  vUp = clamp((local.y - instanceMatrix[3].y) / (stem + ${glsl(TALLEST_HEAD_M)}), 0.0, 1.0);
  vColour = instanceColor;
  gl_Position = projectionMatrix * view;
}`;

// Unlit (NFR-PERF-09: no light at all): darker at the foot, brighter at the head, and a rim that reads as glass.
// In high contrast (FR-UI-05) the edge of the silhouette is cream, at one strength whatever the plant's own
// brightness does: an outline that never changes cannot flash.
const FRAGMENT = /* glsl */ `
uniform float uOutline;
varying vec3 vColour;
varying vec3 vNormal;
varying vec3 vView;
varying float vUp;
void main() {
  float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
  float shade = mix(${glsl(PLANT_FOOT_SHADE)}, 1.0, vUp) + ${glsl(PLANT_RIM_GLOW)} * rim * rim;
  float edge = uOutline * smoothstep(${glsl(PLANT_OUTLINE_FROM)}, ${glsl(PLANT_OUTLINE_FULL)}, rim);
  gl_FragColor = vec4(mix(vColour * shade, vec3(${CREAM_RGB.map(glsl).join(', ')}), edge), 1.0);
  #include <colorspace_fragment>
}`;

function silhouette({ profile, segments, lobes, lobeDepth = PLANT_LOBE_DEPTH }: Shape): LatheGeometry {
  const outline = profile.map(
    ([radius, y, head]) =>
      new Vector2(radius, head ? PLANT_REFERENCE_STEM_M + y : y * PLANT_REFERENCE_STEM_M),
  );
  const geometry = new LatheGeometry(outline, segments);
  const position = geometry.getAttribute('position');
  const head = new Float32Array(position.count);
  for (let v = 0; v < position.count; v++) {
    const [, y, isHead] = profile[v % profile.length]!; // the lathe lays the outline down once per segment
    head[v] = isHead;
    const petal = Math.abs(Math.cos((lobes / 2) * Math.atan2(position.getZ(v), position.getX(v))));
    const press = lobes && isHead ? 1 - lobeDepth * (1 - petal) : 1;
    position.setXYZ(v, position.getX(v) * press, y, position.getZ(v) * press);
  }
  geometry.setAttribute('aHead', new BufferAttribute(head, 1));
  return geometry;
}

const colour = new Color();
const centre = { x: 0, y: 0 };
const local = new Vector3();
// Places in `frame`: the last frame time that was finite, and the milliseconds from the frame before to it.
const NOW = 0;
const PASSED = 1;
/** What a hand does with the plant it holds (T-147): nothing, a pinch inside the dead zone, a pull, a drag. */
const FREE = 0;
const PINCHED = 1;
const PULLED = 2;
const DRAGGED = 3;
/** A pose is x, y, z of a plant's foot in the bed frame and the length of its stem, in metres. */
const POSE = 4;
/** The pose a slot is asked for this frame (scratch of `wanted`). */
const want = new Float64Array(POSE);
/** A glide that starts with the next frame, whatever time that frame has. */
const NEXT_FRAME = Number.POSITIVE_INFINITY;

type PinchStart = Pick<EventMap['gesture:pinchStart'], 'hand' | 'target' | 'pos'>;
type Pull = Pick<EventMap['gesture:pull'], 'hand' | 'dy'>;
type Drag = Pick<EventMap['gesture:drag'], 'hand' | 'pos' | 'zone'>;
const handIndex = (hand: Hand): number => (hand === 'left' ? 0 : 1);

export class PlantRenderer {
  /** One per silhouette: bell, pad, pluck, bass, choir. */
  readonly meshes: readonly InstancedMesh<LatheGeometry, ShaderMaterial>[];
  /** The leaf whorls and blossoms of every plant: two per plant at most (UX §9.6). */
  readonly whorls: InstancedMesh<LatheGeometry, ShaderMaterial>;
  private readonly material: ShaderMaterial;
  private readonly firstElement: number;
  // A slot is a plant's place in the arrays below and its FlashGuard element; it keeps it while it lives.
  private readonly slotOf = new Map<string, number>();
  private readonly freeSlots = Array.from({ length: PLANT_CAPACITY }, (_, i) => PLANT_CAPACITY - 1 - i);
  private readonly seen = new Uint8Array(PLANT_CAPACITY);
  private readonly step = new Uint8Array(PLANT_CAPACITY);
  private readonly tint = new Float32Array(PLANT_CAPACITY * 3);
  private readonly brightness = new Float64Array(PLANT_CAPACITY).fill(PLANT_REST_BRIGHTNESS);
  /** The brightness each step asks for this frame. */
  private readonly glow = new Float64Array(STEPS);
  /** The slot drawn at each instance index, mesh after mesh. */
  private readonly slotAt = new Uint8Array(SHAPES.length * PLANT_CAPACITY);
  private plants: GardenState['plants'] | null = null;
  private lastVisitAt = Number.NaN;
  // Growth (FR-MUS-09, UX §9.6), per slot. `stage` is the plant's stage by the state. A plant that grew since it
  // was last drawn stands as it did (`shown`) until its first note of the session: `waits` until the guard has
  // granted it a rise of FLASH_MIN_DELTA above `low`, the lowest it was since `waitFrom`. From `bloomFrom` on its
  // whorls unfurl (+Infinity: not yet; -Infinity: done). `lit`: it has a blossom's colours, its own from `pale`.
  // `busy`: it waits or unfurls, so `grow` looks at it every frame.
  private readonly stage = new Uint8Array(PLANT_CAPACITY).fill(UNSEEN);
  private readonly shown = new Uint8Array(PLANT_CAPACITY);
  private readonly waits = new Uint8Array(PLANT_CAPACITY);
  private readonly lit = new Uint8Array(PLANT_CAPACITY);
  private readonly busy = new Uint8Array(PLANT_CAPACITY);
  private readonly low = new Float64Array(PLANT_CAPACITY);
  private readonly waitFrom = new Float64Array(PLANT_CAPACITY);
  private readonly bloomFrom = new Float64Array(PLANT_CAPACITY).fill(Number.NEGATIVE_INFINITY);
  private readonly pale = new Float32Array(PLANT_CAPACITY * 3);
  /** The instance index of each slot's first whorl. */
  private readonly whorlOf = new Uint8Array(PLANT_CAPACITY).fill(NO_WHORL);
  private isWhorlPaintDue = false;
  // The frame's numbers live in an array, so the per-frame helpers take no fraction as an argument: V8 boxes
  // one that crosses a call (PlantRenderer.heap.test.ts).
  private readonly frame = new Float64Array([Number.NaN, 0]);
  /** FR-HND-15, per hand (left, right): the plant its tint dims, and until when. */
  private readonly tintId: (string | null)[] = [null, null];
  private readonly tintUntil = new Float64Array(2);
  /** Per slot: until when it is dimmed, and the share of its brightness it is drawn at now. */
  private readonly dimUntil = new Float64Array(PLANT_CAPACITY).fill(Number.NEGATIVE_INFINITY);
  private readonly dim = new Float64Array(PLANT_CAPACITY).fill(1);
  /** FR-HND-16, per hand (left, right): the plant it hovers with nothing in it. */
  private readonly hoverId: (string | null)[] = [null, null];
  /** Per slot: whether a hand hovers it, and how far its glow is in, 0..1. */
  private readonly hovered = new Uint8Array(PLANT_CAPACITY);
  private readonly lift = new Float64Array(PLANT_CAPACITY);
  /** Per slot: what the tide's glow is multiplied by before the one request: the dim times the hover's lift. */
  private readonly gain = new Float64Array(PLANT_CAPACITY).fill(1);
  /** FR-UI-05: 1 draws every plant's outline (high contrast), 0 none. */
  private readonly outline = { value: 0 };
  /** UX §3.4: the scale ladder of a pull and the dimmed rim of a drag off the bed. */
  readonly guides: ShapingGuides;
  // Shaping (T-147, UX §3.4), per hand (left, right): the plant it holds and what it does with it; its height at
  // the pinch and the pulled height; the offset from the pinch point to the plant's lifted foot, then the dragged
  // foot (bed frame, x y z); and the pose its plant was last drawn at (for heldAt).
  private readonly holdId: (string | null)[] = [null, null];
  private readonly holdMode = new Uint8Array(2);
  private readonly holdHeight = new Float64Array(4);
  private readonly grab = new Float64Array(6);
  private readonly dragFoot = new Float64Array(6);
  private readonly handPose = new Float64Array(2 * POSE);
  /** Per slot: its mesh and instance index, its cell centre (bed x, z) and its height by the state. */
  private readonly shapeOf = new Uint8Array(PLANT_CAPACITY);
  private readonly indexOf = new Uint8Array(PLANT_CAPACITY);
  private readonly rest = new Float64Array(PLANT_CAPACITY * 2);
  private readonly height = new Float64Array(PLANT_CAPACITY);
  /** Per hand: whether its drag is past the outer edge. Per slot: the hand that holds it (1 left, 2 right, 0
   *  none), whether that drag is past the edge, and how far its fade for that is in, 0..1. */
  private readonly holdOff = new Uint8Array(2);
  private readonly holder = new Uint8Array(PLANT_CAPACITY);
  private readonly offBed = new Uint8Array(PLANT_CAPACITY);
  private readonly away = new Float64Array(PLANT_CAPACITY);
  /** Per slot: the pose drawn last, and a glide's start: the pose it leaves from and when (UX §3.4). */
  private readonly pose = new Float64Array(PLANT_CAPACITY * POSE);
  private readonly from = new Float64Array(PLANT_CAPACITY * POSE);
  private readonly glideAt = new Float64Array(PLANT_CAPACITY).fill(Number.NEGATIVE_INFINITY);
  /** Per slot: held or gliding, so update places it every frame. */
  private readonly moving = new Uint8Array(PLANT_CAPACITY);

  constructor(
    private readonly parent: Object3D,
    private readonly guard: FlashGuard,
  ) {
    this.firstElement = guard.claim(PLANT_CAPACITY, PLANT_REST_BRIGHTNESS);
    this.material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uOutline: this.outline },
      side: DoubleSide, // the pad's fan is open: its inside shows
    });
    const instanced = (shape: Shape, capacity: number): InstancedMesh<LatheGeometry, ShaderMaterial> => {
      const mesh = new InstancedMesh(silhouette(shape), this.material, capacity);
      mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
      mesh.count = 0;
      mesh.frustumCulled = false; // its bounds are one plant's; the instances lie all over the bed
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      return mesh;
    };
    this.meshes = SHAPES.map((shape) => instanced(shape, PLANT_CAPACITY));
    this.whorls = instanced(WHORL, PLANT_WHORL_AT.length * PLANT_CAPACITY);
    this.guides = new ShapingGuides(parent, guard);
  }

  /**
   * Draws these plants (FR-MUS-01), each at the growth stage of its age, `lastVisitAt - plantedAt` (FR-MUS-09).
   * Call it when the garden changes, not per frame: it rewrites every instance. The same plants array with the
   * same `lastVisitAt` is no work; a visit keeps the array and moves the time, and is drawn.
   * A plant this renderer already draws whose stage rose keeps its look until its first note of the session,
   * then unfurls (UX §9.6); one that is new here, or younger than it was, is drawn at its stage at once.
   * Left out: a plant whose cell is not on the bed or whose voice is not a VoiceType.
   */
  setState(state: Pick<GardenState, 'plants' | 'lastVisitAt'>): void {
    const { plants, lastVisitAt } = state;
    if (plants === this.plants && Object.is(lastVisitAt, this.lastVisitAt)) return;
    this.freeSlotsOfGone(plants);
    this.aim(); // a held plant is placed as held: on a committing release this change comes first (API_SPEC §1.4)
    for (const mesh of this.meshes) mesh.count = 0;
    this.whorls.count = 0;
    for (const plant of plants) {
      const shape = SHAPE_OF[plant.voice];
      if (typeof shape !== 'number' || !onBed(plant.cell)) continue;
      const slot = this.slotFor(plant.id);
      if (slot === undefined) continue; // more plants than cells: the garden rules never produce that
      this.step[slot] = plant.cell.step;
      this.age(slot, stageFor(lastVisitAt - plant.plantedAt));
      // The palette is written in sRGB (UX §5), so the hue is read in sRGB too. A blossom's colour is lighter.
      colour
        .setHSL(plant.hue, PLANT_SATURATION, PLANT_BLOSSOM_LIGHTNESS, SRGBColorSpace)
        .toArray(this.pale, slot * 3);
      if (!this.lit[slot]) colour.setHSL(plant.hue, PLANT_SATURATION, PLANT_LIGHTNESS, SRGBColorSpace);
      colour.toArray(this.tint, slot * 3);

      const mesh = this.meshes[shape]!;
      const index = mesh.count++;
      this.slotAt[shape * PLANT_CAPACITY + index] = slot;
      this.shapeOf[slot] = shape;
      this.indexOf[slot] = index;
      this.height[slot] = Math.min(1, Math.max(0, plant.height)) || 0; // NaN stands at the minimum
      // Bed-local (x, y) is the bed's x and z (D-029).
      cellCentre(plant.cell, centre);
      this.rest[slot * 2] = centre.x;
      this.rest[slot * 2 + 1] = centre.y;
      this.place(slot);
      this.paint(mesh, index, slot);
    }
    for (const mesh of [...this.meshes, this.whorls]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
    }
    this.isWhorlPaintDue = false;
    this.aim();
    this.plants = plants; // last: a throw above leaves it unset, and the next call starts over
    this.lastVisitAt = lastVisitAt;
  }

  /**
   * FR-HND-15 (D-030): the plant a lost hand held is drawn at half its brightness until `update`'s `nowMs`
   * reaches `untilMs`: down in one step, back over PLANT_TINT_BACK_MS (UX §3.4). `plantId` null lifts the hand's
   * tint. One tint per hand; an id that is not drawn tints nothing. Reduced motion and high contrast: the same.
   */
  setTint(hand: Hand, plantId: string | null, untilMs: number): void {
    const index = hand === 'left' ? 0 : 1;
    this.tintId[index] = plantId;
    this.tintUntil[index] = untilMs;
    this.aim();
  }

  /**
   * FR-HND-16: the plant a pinch of this empty hand would act on glows: 20 % brighter, in and out over
   * HOVER_CUE_MS (UX §3.4, §5). `plantId` null is no glow. One per hand; two hands on one plant are one glow; an
   * id that is not drawn glows nothing. Reduced motion: the same. High contrast: the same, on outlined plants.
   */
  setHover(hand: Hand, plantId: string | null): void {
    this.hoverId[hand === 'left' ? 0 : 1] = plantId;
    this.aim();
  }

  /**
   * On `gesture:pinchStart` (UX §3.4): a pinch on a drawn plant holds it. It lifts PLANT_PINCH_LIFT_M and glows
   * like a hovered plant until that hand's `onRelease`. Any other target, or none, is not a hold. `pos` is world.
   */
  onPinchStart(event: PinchStart): void {
    const h = handIndex(event.hand);
    this.letGo(h);
    const target = event.target;
    const slot = target?.kind === 'plant' ? this.slotOfId(target.id) : undefined;
    if (slot === undefined || target === null) return;
    this.holdId[h] = target.id;
    this.holdMode[h] = PINCHED;
    this.holdHeight[h] = this.holdHeight[h + 2] = this.height[slot]!;
    // From the pinch point to the lifted foot, in the bed frame: a drag keeps the plant where the hand took it.
    this.toBed(event.pos);
    this.grab[h * 3] = this.rest[slot * 2]! - local.x;
    this.grab[h * 3 + 1] = PLANT_PINCH_LIFT_M - local.y;
    this.grab[h * 3 + 2] = this.rest[slot * 2 + 1]! - local.z;
    for (let i = 0; i < POSE; i++) this.handPose[h * POSE + i] = this.pose[slot * POSE + i]!;
    this.aim();
    this.syncOffBed(slot);
    this.startGlide(slot);
  }

  /**
   * On `gesture:pull`, each tracked frame (FR-HND-08): the held plant is drawn at heightAfterPull(its height at
   * the pinch, dy), the height a release commits, with the scale ladder round it. Per frame, creates nothing.
   */
  onPull(event: Pull): void {
    const h = handIndex(event.hand);
    const mode = this.holdMode[h];
    if (mode !== PINCHED && mode !== PULLED) return;
    this.holdHeight[h + 2] = heightAfterPull(this.holdHeight[h]!, event.dy);
    if (mode === PULLED) return;
    this.holdMode[h] = PULLED; // the sample that decided: the stem eases to the hand from where it stood
    const slot = this.slotOfId(this.holdId[h]);
    if (slot === undefined) return;
    this.startGlide(slot);
    centre.x = this.rest[slot * 2]!;
    centre.y = this.rest[slot * 2 + 1]!;
    this.guides.setLadder(h, centre);
  }

  /**
   * On `gesture:drag`, each tracked frame (FR-HND-10/11): the held plant is drawn under the hand, at `pos`
   * (world) as far from it as it was at the pinch, and stays at the last `pos` while no event comes. Zone
   * 'outer' fades it to PLANT_OFF_BED_BRIGHTNESS and dims the rim: removal ahead. Per frame, creates nothing.
   */
  onDrag(event: Drag): void {
    const h = handIndex(event.hand);
    const mode = this.holdMode[h];
    if (mode !== PINCHED && mode !== DRAGGED) return;
    this.toBed(event.pos);
    this.dragFoot[h * 3] = local.x + this.grab[h * 3]!;
    this.dragFoot[h * 3 + 1] = local.y + this.grab[h * 3 + 1]!;
    this.dragFoot[h * 3 + 2] = local.z + this.grab[h * 3 + 2]!;
    const slot = this.slotOfId(this.holdId[h]);
    if (mode === PINCHED) {
      this.holdMode[h] = DRAGGED;
      if (slot !== undefined) this.startGlide(slot);
    }
    const isOff = event.zone === 'outer' ? 1 : 0;
    if (this.holdOff[h] === isOff) return;
    this.holdOff[h] = isOff;
    if (slot !== undefined) this.syncOffBed(slot);
    this.guides.setRim(this.holdOff[0] === 1 || this.holdOff[1] === 1);
  }

  /**
   * On `gesture:release` and on `gesture:trackingLost` of that hand: the hold ends, and the plant glides over
   * REVERT_LERP_MS (ease-out) from where it was drawn to where the garden has it. A release that committed has
   * already changed the garden (its garden:changed comes first), so that is the new cell or height; otherwise it
   * is where the plant was (UX §3.4). A plant removed meanwhile is not drawn: nothing to glide.
   */
  onRelease(event: { hand: Hand }): void {
    this.letGo(handIndex(event.hand));
  }

  /**
   * On `garden:removed`: whether a hand still holds that plant, and if so, into `out`, the middle of where it
   * was last drawn, in the bed frame: where it dissolves into petals (UX §9.3; PetalRenderer.show's `from`).
   */
  heldAt(plantId: string, out: Vec3): boolean {
    // The right hand first: of two hands on one plant it is the one that places it (aim), so its pose is drawn.
    const h = this.holdId[1] === plantId ? 1 : this.holdId[0] === plantId ? 0 : -1;
    if (h < 0) return false;
    const p = h * POSE;
    out.x = this.handPose[p]!;
    out.y = this.handPose[p + 1]! + this.handPose[p + 3]! / 2;
    out.z = this.handPose[p + 2]!;
    return true;
  }

  /**
   * Per frame: each plant's glow as the tide passes its step (FR-UI-07), times the dim of a lost hand's tint and
   * the lift of a hover, as one request through the flash cap (FR-UI-11); and the unfurling of the plants that
   * grew (UX §9.6). `barPhase` is audio's clock.barPhase (0..1); one that is not finite means no tide, and every
   * plant rests. `nowMs` is the frame's time.
   */
  update(barPhase: number, nowMs: number): void {
    stepGlow(barPhase, this.glow);
    const outline = settings.get().highContrast ? 1 : 0;
    if (this.outline.value !== outline) this.outline.value = outline;
    const { frame } = this;
    // How long an ease may run this frame: not at all on the first one, or when the clock stood still or went back.
    const passedMs = nowMs - frame[NOW]!;
    frame[PASSED] = passedMs > 0 && Number.isFinite(nowMs) ? passedMs : 0;
    if (Number.isFinite(nowMs)) frame[NOW] = nowMs;
    this.ease();
    for (let shape = 0; shape < this.meshes.length; shape++) {
      const mesh = this.meshes[shape]!;
      let isDirty = false;
      for (let index = 0; index < mesh.count; index++) {
        const slot = this.slotAt[shape * PLANT_CAPACITY + index]!;
        if (this.moving[slot]) {
          if (this.glideAt[slot] === NEXT_FRAME) this.glideAt[slot] = frame[NOW]!;
          this.place(slot);
        }
        const asked = this.glow[this.step[slot]!]! * this.gain[slot]!;
        const granted = this.guard.request(this.firstElement + slot, asked, nowMs);
        const isSame = granted === this.brightness[slot];
        if (!isSame) this.brightness[slot] = granted;
        if (this.busy[slot]) this.grow(shape, index, slot); // after the brightness: its first note is a rise
        if (isSame) continue;
        this.paint(mesh, index, slot);
        isDirty = true;
      }
      if (isDirty) mesh.instanceColor!.needsUpdate = true;
    }
    this.guides.update(frame);
    if (!this.isWhorlPaintDue) return;
    this.whorls.instanceColor!.needsUpdate = true;
    this.isWhorlPaintDue = false;
  }

  dispose(): void {
    for (const mesh of [...this.meshes, this.whorls]) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.dispose();
    }
    this.material.dispose();
    this.guides.dispose();
  }

  /** Gives back the slots of the plants that are not in `plants`, so new plants can take them in the same call. */
  private freeSlotsOfGone(plants: GardenState['plants']): void {
    this.seen.fill(0);
    for (const plant of plants) {
      const slot = this.slotOf.get(plant.id);
      if (slot !== undefined) this.seen[slot] = 1;
    }
    for (const [id, slot] of this.slotOf) {
      if (this.seen[slot]) continue;
      this.slotOf.delete(id);
      this.freeSlots.push(slot);
    }
  }

  /** The plant's slot; a new plant takes a free one and starts at rest, whatever the slot's last plant left. */
  private slotFor(id: string): number | undefined {
    const kept = this.slotOf.get(id);
    if (kept !== undefined) return kept;
    const slot = this.freeSlots.pop();
    if (slot === undefined) return undefined;
    this.slotOf.set(id, slot);
    this.brightness[slot] = PLANT_REST_BRIGHTNESS;
    this.dim[slot] = 1;
    this.lift[slot] = 0;
    this.away[slot] = this.offBed[slot] = this.moving[slot] = 0;
    this.glideAt[slot] = Number.NEGATIVE_INFINITY;
    this.stage[slot] = UNSEEN;
    this.guard.reset(this.firstElement + slot, PLANT_REST_BRIGHTNESS);
    return slot;
  }

  /** Takes a plant's growth stage from the state (FR-MUS-09), and gives it the whorl instances of that stage. */
  private age(slot: number, stage: number): void {
    const was = this.stage[slot]!;
    if (was !== UNSEEN && stage > was) {
      // It grew since it was last drawn: it stands as it did until its first note (UX §9.6).
      if (this.bloomFrom[slot] !== Infinity) this.shown[slot] = was;
      this.bloomFrom[slot] = Infinity;
      this.waits[slot] = this.busy[slot] = 1;
      this.low[slot] = this.waitFrom[slot] = Number.NaN;
    } else if (stage !== was) {
      // New here, or younger than it was (another garden was restored): at its stage at once.
      this.shown[slot] = stage;
      this.bloomFrom[slot] = Number.NEGATIVE_INFINITY;
      this.waits[slot] = this.busy[slot] = 0;
      this.lit[slot] = stage === BLOSSOM_STAGE ? 1 : 0;
    }
    this.stage[slot] = stage;
    const count = Math.min(PLANT_WHORL_AT.length, stage);
    this.whorlOf[slot] = count > 0 ? this.whorls.count : NO_WHORL;
    this.whorls.count += count;
  }

  /**
   * Per frame, for a plant that grew (UX §9.6): it waits for its first note, then its whorls unfurl. The first
   * note is a rise of its brightness that the guard has counted, so a blossom's colours arrive inside that swing
   * and add no change of their own (FR-UI-11). A plant that no rise reaches in PLANT_BLOOM_WAIT_MS unfurls
   * then; a blossom's colours still wait for a rise. Reduced motion: the whorls appear at once, on the same note.
   */
  private grow(shape: number, index: number, slot: number): void {
    const now = this.frame[NOW]!;
    if (this.waits[slot]) {
      const granted = this.brightness[slot]!;
      if (!(granted >= this.low[slot]!)) this.low[slot] = granted; // also the first time, from NaN
      if (!(this.waitFrom[slot]! <= now)) this.waitFrom[slot] = now;
      const hasRisen = granted - this.low[slot]! >= FLASH_MIN_DELTA;
      const isBlossom = this.stage[slot] === BLOSSOM_STAGE;
      const isLate = now - this.waitFrom[slot]! >= PLANT_BLOOM_WAIT_MS;
      if ((hasRisen || isLate) && this.bloomFrom[slot] === Infinity) {
        this.bloomFrom[slot] = settings.get().reducedMotion ? Number.NEGATIVE_INFINITY : now;
      }
      if (hasRisen && isBlossom) {
        // A blossom's colours: the plant turns lighter and its whorls cream. The rise is this frame's, so the
        // caller paints both now.
        this.lit[slot] = 1;
        for (let channel = 0; channel < 3; channel++) {
          this.tint[slot * 3 + channel] = this.pale[slot * 3 + channel]!;
        }
      }
      if (hasRisen || (isLate && !isBlossom)) this.waits[slot] = 0;
    }
    // The whorls are placed while they unfurl, and one last time at their full size: that once is all a cut
    // gets. After it the plant stands at its stage, and one that still waits for its colours has nothing to
    // place (a late blossom uploaded the whorl matrices on every frame: T-119 review).
    if (this.bloomFrom[slot] !== Infinity && this.shown[slot] !== this.stage[slot]) {
      this.placeWhorls(shape, index, slot);
      if (!(now - this.bloomFrom[slot]! < PLANT_BLOOM_MS)) this.shown[slot] = this.stage[slot]!;
    }
    this.busy[slot] = this.waits[slot] || this.shown[slot] !== this.stage[slot] ? 1 : 0;
  }

  /** Writes the matrices of a plant's whorls: at their heights on its stem, as wide as its unfurling has got. */
  private placeWhorls(shape: number, index: number, slot: number): void {
    const first = this.whorlOf[slot]!;
    if (first === NO_WHORL) return;
    const elapsed = (this.frame[NOW]! - this.bloomFrom[slot]!) / PLANT_BLOOM_MS;
    const left = elapsed >= 1 ? 0 : elapsed > 0 ? 1 - elapsed : 1;
    const unfurled = 1 - left * left; // ease-out (UX §5)
    const from = this.shown[slot]!;
    const to = this.stage[slot]!;
    const plant = this.meshes[shape]!.instanceMatrix.array;
    const whorl = this.whorls.instanceMatrix.array;
    for (let k = 0; k < PLANT_WHORL_AT.length && k < to; k++) {
      // A blossom's own width on the `from` side is what a settled blossom is drawn with when it is placed
      // before the first frame: there is no time to measure from yet, so `unfurled` is 0 and this is all there is.
      const widthFrom = from > k ? (from === BLOSSOM_STAGE ? PLANT_BLOSSOM_WIDTH : 1) : 0;
      const width = widthFrom + ((to === BLOSSOM_STAGE ? PLANT_BLOSSOM_WIDTH : 1) - widthFrom) * unfurled;
      const at = PLANT_WHORL_AT[k]!;
      // The plant's own matrix, its x and z columns scaled to the whorl's width and its y column to its height:
      // the whorl's rows are head rows, so the shader sets it on top of that height (see WHORL).
      for (let e = 0; e < 16; e++) {
        const factor = e >= 12 ? 1 : e >= 4 && e < 8 ? at : width;
        whorl[(first + k) * 16 + e] = plant[index * 16 + e]! * factor;
      }
    }
    this.whorls.instanceMatrix.needsUpdate = true;
  }

  /** The slot of the plant with this id, when it is drawn. */
  private slotOfId(id: string | null | undefined): number | undefined {
    return typeof id === 'string' ? this.slotOf.get(id) : undefined;
  }

  /**
   * Works out, per slot, what the hands ask of it. Set-up only: when a tint, a hover, a hold or the garden
   * changes. A held plant glows like a hovered one (UX §3.4: the pinch's glow) and is placed every frame.
   */
  private aim(): void {
    this.dimUntil.fill(Number.NEGATIVE_INFINITY);
    this.hovered.fill(0);
    this.holder.fill(0);
    for (let hand = 0; hand < this.holdId.length; hand++) {
      const held = this.slotOfId(this.holdId[hand]);
      if (held === undefined) continue;
      this.holder[held] = hand + 1; // two hands on one plant (an edge case): the right one places it
      this.hovered[held] = this.moving[held] = 1;
    }
    for (let hand = 0; hand < this.tintId.length; hand++) {
      const tinted = this.slotOfId(this.tintId[hand]);
      // Two hands on one plant are one tint: the later end. An end that is not a number tints nothing, and is
      // later than nothing: Math.max would hand it on and lift the other hand's tint.
      if (tinted !== undefined && this.tintUntil[hand]! > this.dimUntil[tinted]!) {
        this.dimUntil[tinted] = this.tintUntil[hand]!;
      }
      const hovered = this.slotOfId(this.hoverId[hand]);
      if (hovered !== undefined) this.hovered[hovered] = 1;
    }
  }

  /**
   * Per frame: moves each plant's dim, lift and off-bed fade toward what its hands ask (the dim down at once and
   * back up as an ease, the other two as eases both ways) and writes their product into `gain`.
   */
  private ease(): void {
    const now = this.frame[NOW]!;
    const back = (this.frame[PASSED]! / PLANT_TINT_BACK_MS) * (1 - PLANT_TINT_BRIGHTNESS);
    const moved = this.frame[PASSED]! / HOVER_CUE_MS;
    // Every number is written to its array and read back from it. A value picked by a condition from two
    // constants (`dimmed ? 0.5 : 1`) was boxed by V8: 16 bytes a frame for a tinted plant, measured in T-119.
    for (let slot = 0; slot < PLANT_CAPACITY; slot++) {
      const dim = this.dim[slot]!;
      if (now < this.dimUntil[slot]!) this.dim[slot] = PLANT_TINT_BRIGHTNESS;
      else if (dim < 1) this.dim[slot] = Math.min(1, dim + back);
      const lift = this.lift[slot]!;
      if (this.hovered[slot]) {
        if (lift < 1) this.lift[slot] = Math.min(1, lift + moved);
      } else if (lift > 0) this.lift[slot] = Math.max(0, lift - moved);
      const away = this.away[slot]!;
      if (this.offBed[slot]) {
        if (away < 1) this.away[slot] = Math.min(1, away + moved);
      } else if (away > 0) this.away[slot] = Math.max(0, away - moved);
      this.gain[slot] =
        this.dim[slot]! *
        (1 + PLANT_HOVER_LIFT * this.lift[slot]!) *
        (1 - (1 - PLANT_OFF_BED_BRIGHTNESS) * this.away[slot]!);
    }
  }

  /** Ends hand `h`'s hold, if it has one: the plant glides from where it is drawn to where the garden has it. */
  private letGo(h: number): void {
    if (this.holdMode[h] === FREE) return;
    const slot = this.slotOfId(this.holdId[h]);
    if (this.holdMode[h] === PULLED) this.guides.setLadder(h, null);
    this.holdId[h] = null;
    this.holdMode[h] = this.holdOff[h] = 0;
    this.guides.setRim(this.holdOff[0] === 1 || this.holdOff[1] === 1);
    this.aim();
    if (slot === undefined) return; // removed while held (dragged off the bed): its petals take over
    this.syncOffBed(slot);
    this.startGlide(slot);
  }

  /** Off the bed or not as the hand that places the plant drags it (aim: the right one of two); none, not. */
  private syncOffBed(slot: number): void {
    const holder = this.holder[slot]!;
    this.offBed[slot] = holder === 0 ? 0 : this.holdOff[holder - 1]!;
  }

  /** A world point into the bed frame, written into `local`. */
  private toBed(pos: Vec3): void {
    // Field by field, not Vector3.set: three fractions handed to a call V8 may not inline are boxed.
    local.x = pos.x;
    local.y = pos.y;
    local.z = pos.z;
    this.parent.worldToLocal(local);
  }

  /** A glide from the pose drawn now to the one asked for, starting with the next frame (UX §3.4, §5). */
  private startGlide(slot: number): void {
    for (let i = slot * POSE; i < (slot + 1) * POSE; i++) this.from[i] = this.pose[i]!;
    this.glideAt[slot] = NEXT_FRAME;
    this.moving[slot] = 1;
  }

  /** Writes into `want` the pose a slot is asked for: its cell, or the lift, stretch or drag of its hand. */
  private wanted(slot: number): void {
    want[0] = this.rest[slot * 2]!;
    want[1] = 0;
    want[2] = this.rest[slot * 2 + 1]!;
    want[3] = PLANT_STEM_MIN_M + (PLANT_STEM_MAX_M - PLANT_STEM_MIN_M) * this.height[slot]!;
    const h = this.holder[slot]! - 1;
    if (h < 0) return;
    const mode = this.holdMode[h];
    want[1] = PLANT_PINCH_LIFT_M;
    if (mode === PULLED) {
      want[3] = PLANT_STEM_MIN_M + (PLANT_STEM_MAX_M - PLANT_STEM_MIN_M) * this.holdHeight[h + 2]!;
    } else if (mode === DRAGGED) {
      for (let i = 0; i < 3; i++) want[i] = this.dragFoot[h * 3 + i]!;
    }
  }

  /**
   * Writes a slot's instance matrix, and its whorls': the pose asked for, or on the way to it from where its glide
   * left (ease-out over REVERT_LERP_MS). A glide that has not had its first frame is still where it left. Turned
   * so the plant's own +x points out of the bed from where it is drawn; never tilted.
   */
  private place(slot: number): void {
    this.wanted(slot);
    const p = slot * POSE;
    const t = (this.frame[NOW]! - this.glideAt[slot]!) / REVERT_LERP_MS;
    const left = Math.min(1, Math.max(0, 1 - t)) || 0; // no frame time yet (NaN): no glide to show
    const k = left * left;
    for (let i = 0; i < POSE; i++) this.pose[p + i] = want[i]! + (this.from[p + i]! - want[i]!) * k;
    const mesh = this.meshes[this.shapeOf[slot]!]!;
    const e = mesh.instanceMatrix.array;
    const at = this.indexOf[slot]! * 16;
    // Its own +x points out of the bed from where it is drawn, so its turn glides with its place (T-147 review);
    // close over the bed's centre that way is not defined, and its cell's is kept.
    let x = this.pose[p]!;
    let z = this.pose[p + 2]!;
    if (x * x + z * z < PLANT_TURN_MIN_R_M * PLANT_TURN_MIN_R_M) {
      x = this.rest[slot * 2]!;
      z = this.rest[slot * 2 + 1]!;
    }
    const r = Math.sqrt(x * x + z * z);
    // A turn about y by -atan2(z, x), then the stem's stretch along y (the off-diagonal zeros never change).
    e[at] = e[at + 10] = x / r;
    e[at + 2] = z / r;
    e[at + 8] = -z / r;
    e[at + 5] = this.pose[p + 3]!;
    e[at + 12] = this.pose[p]!;
    e[at + 13] = this.pose[p + 1]!;
    e[at + 14] = this.pose[p + 2]!;
    mesh.instanceMatrix.needsUpdate = true;
    this.placeWhorls(this.shapeOf[slot]!, this.indexOf[slot]!, slot);
    const h = this.holder[slot]! - 1;
    if (h >= 0) for (let i = 0; i < POSE; i++) this.handPose[h * POSE + i] = this.pose[p + i]!;
    else if (k === 0) this.moving[slot] = 0;
  }

  /**
   * Writes an instance's colour, and its whorls': the plant's tint at the brightness the guard last handed out.
   * A whorl has no element of its own (UX §9.6): it takes its plant's brightness. A blossom is cream.
   */
  private paint(mesh: InstancedMesh, index: number, slot: number): void {
    // Straight into the buffer: Color.setRGB and setColorAt would box three numbers per plant per frame.
    const rgb = mesh.instanceColor!.array;
    const brightness = this.brightness[slot]!;
    for (let channel = 0; channel < 3; channel++) {
      rgb[index * 3 + channel] = this.tint[slot * 3 + channel]! * brightness;
    }
    const first = this.whorlOf[slot]!;
    if (first === NO_WHORL) return;
    const leaves = this.whorls.instanceColor!.array;
    const isCream = this.lit[slot] === 1;
    const end = (first + Math.min(PLANT_WHORL_AT.length, this.stage[slot]!)) * 3;
    for (let i = first * 3; i < end; i++) {
      leaves[i] = (isCream ? CREAM_RGB[i % 3]! : this.tint[slot * 3 + (i % 3)]!) * brightness;
    }
    this.isWhorlPaintDue = true;
  }
}
