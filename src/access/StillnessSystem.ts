// Stillness opens the garden (P-016, T-173, D-057): in a session, a head that holds still (not turning faster than
// 8 deg/s, UX §9.8) with the placed bed's centre inside the essential-UI box (FR-UI-03) for STILL_OPEN_MS opens
// the garden: `stillness:changed { isOpen: true }`. HaloSystem lifts the halo and the engine widens the reverb,
// each with its own slow ramp. While open, the plant the gaze line rests on (gazeTarget over the plant targets)
// goes with the event as `plantId`, and the engine plays it STILL_GAZE_DB louder. It closes at once on a head
// turn, a pinch or select of either hand, or the bed leaving, and the time starts again from nothing. Nothing
// here in the garden window (no session) and nothing drawn: no draw call. Creates nothing per frame.
import { createSystem, Types, Vector3, type Entity, type Object3D } from '@iwsdk/core';

import { BedAnchor, Interactable } from '../core/components.js';
import { bus, type EventMap, type Mat4 } from '../core/index.js';
import { HandState } from '../hands/index.js';
import { clampToFov, gazeTarget, isHeadTurning, PANEL_MAX_FRAME_MS, type FovElement } from '../ui/index.js';

import { STILL_OPEN_MS } from './config.js';

/** The bed's centre as a point: inside the box when the clamp has nothing to move. */
const POINT: FovElement = { distanceM: 1, halfWidthM: 0, halfHeightM: 0 };

/**
 * Priority 27 (after the gaze dwell and the beat ring). configData: `bed` (`RoomSystem.bed.object3D`, which carries
 * the bed's pose).
 */
export class StillnessSystem extends createSystem(
  { beds: { required: [BedAnchor] }, targets: { required: [Interactable] }, hands: { required: [HandState] } },
  { bed: { type: Types.Object, default: null } },
) {
  /** Time still and facing the bed so far, ms; the garden is open from STILL_OPEN_MS on. */
  readonly stillMs = new Float64Array(1);
  private bed!: Object3D;
  private isPlaced = false;
  private lastMs = -1;
  private readonly headTurn = new Float64Array(4);
  private readonly plants: Entity[] = [];
  private centres = new Float32Array(3 * 8);
  private kept = -1;
  private readonly handStates: Entity[] = [];
  private readonly centre = new Vector3();
  private readonly clamped = new Vector3();
  private readonly state: EventMap['stillness:changed'] = { isOpen: false, plantId: '' };

  override init(): void {
    this.bed = this.config.bed.value as Object3D;
    const { beds, targets, hands } = this.queries;
    this.cleanupFuncs.push(
      beds.subscribe('qualify', () => void (this.isPlaced = true), true),
      beds.subscribe('disqualify', () => void (this.isPlaced = false)),
      targets.subscribe('qualify', (entity) => this.addPlant(entity), true),
      targets.subscribe('disqualify', (entity) => {
        const i = this.plants.indexOf(entity);
        if (i >= 0) this.plants.splice(i, 1);
        this.kept = -1;
      }),
      hands.subscribe('qualify', (entity) => void this.handStates.push(entity), true),
      hands.subscribe('disqualify', (entity) => {
        const i = this.handStates.indexOf(entity);
        if (i >= 0) this.handStates.splice(i, 1);
      }),
      () => this.set(false, ''),
    );
  }

  /** `time`: IWSDK's frame time in seconds, taken in whole ms (a fraction handed on is boxed). */
  override update(_delta: number, time: number): void {
    const nowMs = Math.round(time * 1000);
    const dtMs = this.lastMs < 0 ? 0 : nowMs - this.lastMs;
    this.lastMs = nowMs;
    const head = this.player.head.matrixWorld.elements;
    const isTurning = isHeadTurning(head, dtMs, this.headTurn); // every frame: its speed is a smoothed memory
    const isStill =
      this.xrManager.isPresenting && this.isPlaced && !isTurning && !this.isHandBusy() && this.isFacingBed(head);
    const ms = this.stillMs;
    const stillMs = isStill ? ms[0]! + Math.min(dtMs, PANEL_MAX_FRAME_MS) : 0;
    ms[0] = stillMs;
    const isOpen = stillMs >= STILL_OPEN_MS;
    this.set(isOpen, isOpen ? this.gazedPlant(head) : '');
  }

  /** `stillness:changed` on a change only; the payload object is reused. */
  private set(isOpen: boolean, plantId: string): void {
    const s = this.state;
    if (s.isOpen === isOpen && s.plantId === plantId) return;
    s.isOpen = isOpen;
    s.plantId = plantId;
    bus.emit('stillness:changed', s);
  }

  /** FR-UI-03: the bed's centre is inside the ±25° by ±20° box round the forward gaze. */
  private isFacingBed(head: Mat4): boolean {
    this.centre.setFromMatrixPosition(this.bed.matrixWorld);
    return !clampToFov(head, this.centre, POINT, this.clamped);
  }

  /** The id of the plant the gaze line passes through (the gaze's own memory keeps it steady), '' for none. */
  private gazedPlant(head: Mat4): string {
    const plants = this.plants;
    for (let i = 0; i < plants.length; i++) {
      const at = plants[i]!.getVectorView(Interactable, 'worldPos');
      this.centres[3 * i] = at[0]!;
      this.centres[3 * i + 1] = at[1]!;
      this.centres[3 * i + 2] = at[2]!;
    }
    const i = (this.kept = gazeTarget(head, this.centres, plants.length, this.kept));
    return i < 0 ? '' : (plants[i]!.getValue(Interactable, 'id') ?? '');
  }

  /** A pinch or a select of either hand ends the stillness. */
  private isHandBusy(): boolean {
    for (let i = 0; i < this.handStates.length; i++) {
      const hand = this.handStates[i]!;
      if (hand.getValue(HandState, 'pinch') === true || hand.getValue(HandState, 'select') === true) return true;
    }
    return false;
  }

  /** Set-up only (a plant's target is added once): the plant targets, and room for their centres. */
  private addPlant(entity: Entity): void {
    if (entity.getValue(Interactable, 'kind') !== 'plant') return;
    this.plants.push(entity);
    if (this.centres.length < 3 * this.plants.length) this.centres = new Float32Array(6 * this.plants.length);
    this.kept = -1;
  }
}
