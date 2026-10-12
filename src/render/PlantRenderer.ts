// The plants (LLD §1, UX §5): one InstancedMesh per silhouette, 80 instances each at most, one shared unlit
// material, so the garden is three draw calls whatever grows in it. A plant's cell gives the instance its place,
// its height the stem, its hue the colour; the brightness of the colour is whatever the FlashGuard hands out.
// setState runs when the garden changes and rewrites the instances; update runs per frame and allocates nothing.
import {
  BufferAttribute,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three';

import { cellCentre, RINGS, STEPS } from '../garden/index.js';

import {
  PLANT_CAPACITY,
  PLANT_FOOT_SHADE,
  PLANT_LIGHTNESS,
  PLANT_LOBE_DEPTH,
  PLANT_REFERENCE_STEM_M,
  PLANT_REST_BRIGHTNESS,
  PLANT_RIM_GLOW,
  PLANT_SATURATION,
  PLANT_STEM_MAX_M,
  PLANT_STEM_MIN_M,
} from './config.js';
import { stepGlow } from './TideRenderer.js';

import type { FlashGuard } from './FlashGuard.js';
import type { Cell, GardenState, VoiceType } from '../garden/index.js';
import type { BufferGeometry, Object3D } from 'three';

/** One row of a silhouette's outline: radius in metres, height, and whether the row is part of the head. */
type ProfileRow = readonly [radiusM: number, y: number, head: 0 | 1];
interface Shape {
  /** Bottom to top. A stem row's height is a share of the stem (0..1); a head row's is metres above its top. */
  profile: readonly ProfileRow[];
  segments: number;
  /** Petals pressed into the head's outline; 0 = round. */
  lobes: number;
}

// The three silhouettes of LLD §7 that T-125 draws. Every foot is 2.5 cm across (FR-HND-04) and no head is
// wider than the 4.5 cm between two rings (FR-MUS-01). These tables are the shapes themselves, data like a
// model file would be, so they stay here and not in config.ts (T-125 review).
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
];
/** The mesh a voice is drawn in. Bass, choir and shimmer borrow the nearest shape until theirs are drawn. */
const SHAPE_OF: Readonly<Record<VoiceType, number>> = {
  bell: 0,
  pad: 1,
  pluck: 2,
  bass: 0,
  choir: 1,
  shimmer: 2,
};
const TALLEST_HEAD_M = Math.max(...SHAPES.map((shape) => shape.profile[shape.profile.length - 1]![1]));
/** A number as a GLSL float literal. */
const glsl = (value: number): string => value.toFixed(5);

/** The rule of audio's syncPlants (API_SPEC §1.2), so what is drawn is what sounds. */
function onBed({ ring, step }: Cell): boolean {
  return (
    Number.isInteger(ring) && Number.isInteger(step) && ring >= 0 && ring < RINGS && step >= 0 && step < STEPS
  );
}

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
const FRAGMENT = /* glsl */ `
varying vec3 vColour;
varying vec3 vNormal;
varying vec3 vView;
varying float vUp;
void main() {
  float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
  float shade = mix(${glsl(PLANT_FOOT_SHADE)}, 1.0, vUp) + ${glsl(PLANT_RIM_GLOW)} * rim * rim;
  gl_FragColor = vec4(vColour * shade, 1.0);
  #include <colorspace_fragment>
}`;

function silhouette({ profile, segments, lobes }: Shape): BufferGeometry {
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
    const press = lobes && isHead ? 1 - PLANT_LOBE_DEPTH * (1 - petal) : 1;
    position.setXYZ(v, position.getX(v) * press, y, position.getZ(v) * press);
  }
  geometry.setAttribute('aHead', new BufferAttribute(head, 1));
  return geometry;
}

const matrix = new Matrix4();
const scale = new Vector3();
const colour = new Color();
const centre = { x: 0, y: 0 };

export class PlantRenderer {
  /** One per silhouette: bell, pad, pluck. */
  readonly meshes: readonly InstancedMesh<BufferGeometry, ShaderMaterial>[];
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

  constructor(
    parent: Object3D,
    private readonly guard: FlashGuard,
  ) {
    this.firstElement = guard.claim(PLANT_CAPACITY, PLANT_REST_BRIGHTNESS);
    this.material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: DoubleSide, // the pad's fan is open: its inside shows
    });
    this.meshes = SHAPES.map((shape) => {
      const mesh = new InstancedMesh(silhouette(shape), this.material, PLANT_CAPACITY);
      mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(PLANT_CAPACITY * 3), 3);
      mesh.count = 0;
      mesh.frustumCulled = false; // its bounds are one plant's; the instances lie all over the bed
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      return mesh;
    });
  }

  /**
   * Draws these plants (FR-MUS-01). Call it when the garden changes, not per frame: it rewrites every instance.
   * Left out: a plant whose cell is not on the bed or whose voice is not a VoiceType.
   */
  setState(state: Pick<GardenState, 'plants'>): void {
    const { plants } = state;
    if (plants === this.plants) return;
    this.freeSlotsOfGone(plants);
    for (const mesh of this.meshes) mesh.count = 0;
    for (const plant of plants) {
      const shape = SHAPE_OF[plant.voice];
      if (typeof shape !== 'number' || !onBed(plant.cell)) continue;
      const slot = this.slotFor(plant.id);
      if (slot === undefined) continue; // more plants than cells: the garden rules never produce that
      this.step[slot] = plant.cell.step;
      // The palette is written in sRGB (UX §5), so the hue is read in sRGB too.
      colour
        .setHSL(plant.hue, PLANT_SATURATION, PLANT_LIGHTNESS, SRGBColorSpace)
        .toArray(this.tint, slot * 3);

      const mesh = this.meshes[shape]!;
      const index = mesh.count++;
      this.slotAt[shape * PLANT_CAPACITY + index] = slot;
      const height = Math.min(1, Math.max(0, plant.height)) || 0; // NaN stands at the minimum
      cellCentre(plant.cell, centre);
      // Bed-local (x, y) is the bed's x and z (D-029). The plant's own +x points out of the bed.
      matrix.makeRotationY(-Math.atan2(centre.y, centre.x));
      matrix.scale(scale.set(1, PLANT_STEM_MIN_M + (PLANT_STEM_MAX_M - PLANT_STEM_MIN_M) * height, 1));
      mesh.setMatrixAt(index, matrix.setPosition(centre.x, 0, centre.y));
      this.paint(mesh, index, slot);
    }
    for (const mesh of this.meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
    }
    this.plants = plants; // last: a throw above leaves it unset, and the next call starts over
  }

  /**
   * Per frame: each plant's glow as the tide passes its step (FR-UI-07), through the flash cap (FR-UI-11).
   * `barPhase` is audio's clock.barPhase (0..1); one that is not finite means no tide, and every plant rests.
   * `nowMs` is the frame's time.
   */
  update(barPhase: number, nowMs: number): void {
    stepGlow(barPhase, this.glow);
    for (let shape = 0; shape < this.meshes.length; shape++) {
      const mesh = this.meshes[shape]!;
      let isDirty = false;
      for (let index = 0; index < mesh.count; index++) {
        const slot = this.slotAt[shape * PLANT_CAPACITY + index]!;
        const granted = this.guard.request(this.firstElement + slot, this.glow[this.step[slot]!]!, nowMs);
        if (granted === this.brightness[slot]) continue;
        this.brightness[slot] = granted;
        this.paint(mesh, index, slot);
        isDirty = true;
      }
      if (isDirty) mesh.instanceColor!.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.dispose();
    }
    this.material.dispose();
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
    this.guard.reset(this.firstElement + slot, PLANT_REST_BRIGHTNESS);
    return slot;
  }

  /** Writes an instance's colour: its plant's tint at the brightness the guard last handed out. */
  private paint(mesh: InstancedMesh, index: number, slot: number): void {
    // Straight into the buffer: Color.setRGB and setColorAt would box three numbers per plant per frame.
    const rgb = mesh.instanceColor!.array;
    const brightness = this.brightness[slot]!;
    for (let channel = 0; channel < 3; channel++) {
      rgb[index * 3 + channel] = this.tint[slot * 3 + channel]! * brightness;
    }
  }
}
