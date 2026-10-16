// The beat ring (FR-UI-07, US-17; UX §8): 16 ticks just outside the bed, one per step. The tide's crest lifts each
// tick as it passes (the tide position) and flashes the tick of a step that holds a plant (its trigger), so with
// the sound off the ring still shows which plant plays when. Shown while `Settings.beatRing` is on, and always in
// Listen. One InstancedMesh, one draw call, on the bed; each tick's brightness goes through the FlashGuard
// (FR-UI-11). Not built: the voices' silhouette icons on the ring (UX §8): the plants are shape-coded on the bed
// already (FR-UI-08) and light under the same crest.
import {
  AdditiveBlending,
  Color,
  createSystem,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Types,
  type Object3D,
} from '@iwsdk/core';

import { BedAnchor } from '../core/components.js';
import { bus, settings } from '../core/index.js';
import { STEPS } from '../garden/index.js';
import { PLANT_FLASH_BRIGHTNESS, PLANT_REST_BRIGHTNESS, stepGlow } from '../render/index.js';
import { CAPTION_TEXT_COLOUR } from '../ui/index.js';

import {
  BEAT_TICK_FLASH_LIFT,
  BEAT_TICK_LENGTH_M,
  BEAT_TICK_LIFT_M,
  BEAT_TICK_RADIUS_M,
  BEAT_TICK_REST,
  BEAT_TICK_TIDE_LIFT,
  BEAT_TICK_WIDTH_M,
} from './config.js';

import type { AudioEngine } from '../audio/index.js';
import type { FlashGuard } from '../render/index.js';

const STEP_RAD = (2 * Math.PI) / STEPS; // garden's cellCentre: step 0 at bed-local +x

/**
 * Priority 26 (LLD §3.2). configData: `guard` (the page's FlashGuard), `engine` (the AudioEngine, for the tide's
 * phase) and `bed` (`RoomSystem.bed.object3D`; the ring is its child). The tide follows API_SPEC §1.10 rule 11.
 */
export class BeatRingSystem extends createSystem(
  { beds: { required: [BedAnchor] } },
  {
    guard: { type: Types.Object, default: null },
    engine: { type: Types.Object, default: null },
    bed: { type: Types.Object, default: null },
  },
) {
  mesh!: InstancedMesh<PlaneGeometry, MeshBasicMaterial>;
  /** Per step: the brightness the guard handed out last (0..1 of cream). */
  readonly brightness = new Float64Array(STEPS);
  private guard!: FlashGuard;
  private engine!: AudioEngine;
  private firstElement = 0;
  private readonly glow = new Float64Array(STEPS);
  private readonly planted = new Uint8Array(STEPS);
  private readonly cream = new Color(CAPTION_TEXT_COLOUR);
  private isPlaced = false;
  private isTuned = false;
  private isListening = false;

  override init(): void {
    const bed = this.config.bed.value as Object3D;
    this.engine = this.config.engine.value as AudioEngine;
    this.guard = this.config.guard.value as FlashGuard;
    this.firstElement = this.guard.claim(STEPS, 0);
    const geometry = new PlaneGeometry(BEAT_TICK_LENGTH_M, BEAT_TICK_WIDTH_M).rotateX(-Math.PI / 2); // flat, along x
    const material = new MeshBasicMaterial({
      transparent: true,
      blending: AdditiveBlending, // light added to the view: brightness 0 is no tick at all
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new InstancedMesh(geometry, material, STEPS);
    this.mesh.name = 'beat-ring';
    this.mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(3 * STEPS), 3);
    const m = new Matrix4();
    for (let step = 0; step < STEPS; step++) {
      const rad = step * STEP_RAD; // pointing out from the centre (a turn about y by -rad takes +x there)
      m.makeRotationY(-rad).setPosition(
        BEAT_TICK_RADIUS_M * Math.cos(rad),
        BEAT_TICK_LIFT_M,
        BEAT_TICK_RADIUS_M * Math.sin(rad),
      );
      this.mesh.setMatrixAt(step, m);
    }
    this.mesh.visible = false;
    bed.add(this.mesh);
    const { beds } = this.queries;
    this.cleanupFuncs.push(
      beds.subscribe('qualify', () => void (this.isPlaced = true), true),
      beds.subscribe('disqualify', () => void (this.isPlaced = false)),
      bus.on('garden:changed', ({ state }) => {
        this.planted.fill(0);
        for (const plant of state.plants) this.planted[plant.cell.step] = 1;
      }),
      bus.on('room:signature', () => void (this.isTuned = true)),
      bus.on('xr:sessionEnd', () => void (this.isTuned = false)),
      bus.on('listen:enter', () => void (this.isListening = true)),
      bus.on('listen:exit', () => void (this.isListening = false)),
      () => {
        bed.remove(this.mesh);
        this.mesh.dispose();
        geometry.dispose();
        material.dispose();
      },
    );
  }

  /** `time`: IWSDK's frame time in seconds, taken in whole ms. Creates nothing. */
  override update(_delta: number, time: number): void {
    const nowMs = Math.round(time * 1000);
    const isShown = this.isPlaced && (settings.get().beatRing || this.isListening);
    const audioClock = this.engine.clock;
    // API_SPEC §1.10 rule 11: the beat only with a bed, a signature and an audio clock that runs; else all at rest.
    stepGlow(
      this.isPlaced && this.isTuned && audioClock.now() > 0 ? audioClock.barPhase() : Number.NaN,
      this.glow,
    );
    const colours = this.mesh.instanceColor!.array as Float32Array;
    let isLit = false;
    for (let step = 0; step < STEPS; step++) {
      const lit =
        ((this.glow[step] as number) - PLANT_REST_BRIGHTNESS) /
        (PLANT_FLASH_BRIGHTNESS - PLANT_REST_BRIGHTNESS);
      const lift = this.planted[step] === 1 ? BEAT_TICK_FLASH_LIFT : BEAT_TICK_TIDE_LIFT;
      this.brightness[step] = this.guard.request(
        this.firstElement + step,
        isShown ? BEAT_TICK_REST + lit * lift : 0,
        nowMs,
      );
      const b = this.brightness[step] as number;
      if (b > 0) isLit = true;
      colours[3 * step] = this.cream.r * b;
      colours[3 * step + 1] = this.cream.g * b;
      colours[3 * step + 2] = this.cream.b * b;
    }
    this.mesh.instanceColor!.needsUpdate = true;
    this.mesh.visible = isLit;
  }
}
