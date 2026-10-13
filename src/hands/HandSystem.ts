/// <reference types="webxr" />
// The per-frame wiring of hands/ (LLD §4, API_SPEC §1.4). Each XR frame: the sampler gets the frame, the gesture
// context is refreshed, and each hand's sample goes to its machine and into its HandState. It also raises the
// hand hint for a hand that held something when it was lost (FR-HND-15, D-030).
import { createSystem, Vector3, type Entity } from '@iwsdk/core';

import { BedAnchor, Caption, Interactable } from '../core/components.js';
import { bus, clock } from '../core/index.js';
import { nearestFreeCell } from '../garden/index.js';

import { HAND_HINT_KEY, HAND_HINT_MAX_MS, HIT_RADIUS_M } from './config.js';
import { GestureMachine } from './GestureMachine.js';
import { HandSampler } from './HandSampler.js';
import { HandState } from './HandState.js';
import { createHandFrame } from './InputSource.js';

import type { GestureContext } from './GestureMachine.js';
import type { HandFrame } from './InputSource.js';
import type { PickCandidate, TargetRef } from './TargetPicker.js';
import type { Hand, Vec3 } from '../core/index.js';
import type { GardenState } from '../garden/index.js';

interface Slot {
  hand: Hand;
  frame: HandFrame;
  machine: GestureMachine;
  /** Carries the hand's HandState, and its hint while that shows. */
  entity: Entity;
  /** When the hint is taken back at the latest, on the frame time; 0 while there is none. */
  hintUntilMs: number;
}

/** `view` is a vector field's typed array (`entity.getVectorView`). */
function put(view: Record<number, number>, from: Vec3): void {
  view[0] = from.x;
  view[1] = from.y;
  view[2] = from.z;
}

export class HandSystem extends createSystem({
  targets: { required: [Interactable] },
  beds: { required: [BedAnchor] },
}) {
  readonly sampler = new HandSampler();
  private slots: Slot[] = [];
  /** The state of the latest `garden:changed`; null until there is one. */
  private garden: GardenState | null = null;
  /**
   * One per Interactable, made when its entity appears. Its `radius` is read then, once: read every frame it cost
   * a boxed number per target (16 bytes, measured). `kind`, `id` and the position are read every frame.
   */
  private readonly candidates: { target: TargetRef; radius: number; pos: Vec3 }[] = [];
  /** The entity of each candidate, at the same index. */
  private readonly targets: Entity[] = [];
  /** The BedAnchor entity: the one added last of those there are. */
  private bed: Entity | null = null;
  /** This frame's time, for a hint raised from inside it (`hands:lost` arrives while the machines run). */
  private timeMs = 0;
  private readonly context: GestureContext & { candidates: PickCandidate[] } = {
    candidates: this.candidates,
    bedPose: null,
    // With no garden yet every cell is free. A dragged plant's own cell counts as free (FR-HND-10).
    nearestFreeCell: (cell, ignorePlantId) =>
      this.garden === null ? cell : nearestFreeCell(this.garden, cell, ignorePlantId),
  };

  override init(): void {
    this.slots = this.sampler.hands.map((hand) => ({
      hand,
      frame: createHandFrame(hand),
      machine: new GestureMachine(hand),
      entity: this.createEntity().addComponent(HandState, { hand }),
      hintUntilMs: 0,
    }));
    const { targets, beds } = this.queries;
    this.cleanupFuncs.push(
      // `true`: what was attached before this system was registered counts too
      targets.subscribe('qualify', (entity) => this.addTarget(entity), true),
      targets.subscribe('disqualify', (entity) => this.removeTarget(entity)),
      beds.subscribe('qualify', (entity) => void (this.bed = entity), true),
      beds.subscribe('disqualify', (gone) => {
        if (this.bed !== gone) return;
        this.bed = null;
        // A Set keeps the order of arrival, so the last one left is the newest.
        for (const entity of beds.entities) if (entity !== gone) this.bed = entity;
      }),
      bus.on('xr:sessionStart', () => {
        // From the renderer: IWSDK sets `world.session` only after this event (API_SPEC §1.9).
        const session = this.xrManager.getSession();
        if (session !== null) this.sampler.attach(session);
      }),
      bus.on('xr:sessionEnd', () => this.endSession()),
      bus.on('garden:changed', ({ state }) => {
        this.garden = state;
      }),
      bus.on('hands:lost', ({ hand, held }) => {
        if (held !== null) this.setHint(hand, true); // an empty hand shows no hint (D-030)
      }),
      bus.on('hands:found', ({ hand }) => this.setHint(hand, false)),
      () => this.sampler.detach(),
    );
  }

  /** `time`: IWSDK's frame time in seconds, which never goes back (the render loop's clock). */
  override update(_delta: number, time: number): void {
    // IWSDK types the frame as always there; outside a session the renderer has none.
    const frame = this.xrFrame as XRFrame | null;
    const space = this.xrManager.getReferenceSpace();
    if (frame === null || space === null) return;
    // Everything here runs on the frame time. Core's clock is wall time and can step back; it is read once per
    // hint, for the caption's expiry, which is on it.
    // Whole milliseconds: a fraction handed to the sampler and the machines was boxed, 32 bytes a frame
    // (measured), and a whole number is not. The filter's time step is then a millisecond coarse.
    const timeMs = (this.timeMs = Math.round(time * 1000));
    this.sampler.setFrame(frame, space);
    this.fillContext();
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i]!;
      this.sampler.sample(slot.hand, timeMs, slot.frame);
      slot.machine.update(slot.frame, timeMs, this.context);
      this.write(slot);
      if (slot.hintUntilMs !== 0 && timeMs >= slot.hintUntilMs) this.setHint(slot.hand, false);
    }
  }

  private addTarget(entity: Entity): void {
    this.targets.push(entity);
    this.candidates.push({
      target: { kind: 'plant', id: '' }, // filled in by every frame, before a machine reads it
      // FR-HND-04: nothing is harder to pinch than the hit radius, whatever its attacher wrote.
      radius: Math.max(entity.getValue(Interactable, 'radius') ?? 0, HIT_RADIUS_M),
      // A Vector3, not a plain { x, y, z }: every fraction written into the plain object cost a boxed number,
      // 16 bytes each, per frame (measured in HandSystem.test.ts; API_SPEC §1.9 notes the same of clampToFov).
      pos: new Vector3(),
    });
  }

  private removeTarget(entity: Entity): void {
    const i = this.targets.indexOf(entity);
    if (i < 0) return;
    this.targets.splice(i, 1);
    this.candidates.splice(i, 1);
  }

  /** What the machines read this frame: what and where every Interactable is, and the bed's pose. */
  private fillContext(): void {
    for (let i = 0; i < this.targets.length; i++) {
      const entity = this.targets[i]!;
      const { target, pos } = this.candidates[i]!;
      // Every frame: an entity that is reused for another plant gets its new id with no qualify to tell of it.
      target.kind = (entity.getValue(Interactable, 'kind') ?? 'plant') as TargetRef['kind'];
      target.id = entity.getValue(Interactable, 'id') ?? '';
      const at = entity.getVectorView(Interactable, 'worldPos');
      pos.x = at[0]!;
      pos.y = at[1]!;
      pos.z = at[2]!;
    }

    // The pose is the entity's own transform (LLD §3); an entity without one is not a placed bed.
    this.context.bedPose = this.bed?.object3D?.matrixWorld.elements ?? null;
  }

  private write({ entity, frame }: Slot): void {
    entity.setValue(HandState, 'tracked', frame.tracked);
    entity.setValue(HandState, 'pinch', frame.pinch);
    entity.setValue(HandState, 'select', frame.select);
    put(entity.getVectorView(HandState, 'pinchPos'), frame.pinchPos);
    put(entity.getVectorView(HandState, 'palmPos'), frame.palmPos);
    put(entity.getVectorView(HandState, 'palmNormal'), frame.palmNormal);
    put(entity.getVectorView(HandState, 'velocity'), frame.velocity);
  }

  /**
   * Raises the hint as a caption on the hand's own entity (API_SPEC §1.9), or takes it back. A caption that is
   * still there is taken back first, so the one raised is always a new one.
   */
  private setHint(hand: Hand, on: boolean): void {
    // shortcut: a caption stands in for the icon of UX section 7 ("no caption"), T-119 settles which
    const slot = this.slots.find((each) => each.hand === hand);
    if (slot === undefined) return;
    if (slot.entity.hasComponent(Caption)) slot.entity.removeComponent(Caption);
    slot.hintUntilMs = on ? this.timeMs + HAND_HINT_MAX_MS : 0;
    if (!on) return;
    slot.entity.addComponent(Caption, { key: HAND_HINT_KEY, expiresAt: clock.now() + HAND_HINT_MAX_MS });
  }

  /** Nothing of one session reaches the next: the sampler, a held gesture (reverted), the hint, the hand's state. */
  private endSession(): void {
    this.sampler.detach();
    for (const slot of this.slots) {
      slot.machine.reset();
      this.setHint(slot.hand, false);
      slot.frame.tracked = slot.frame.pinch = slot.frame.select = false;
      this.write(slot);
    }
  }
}
