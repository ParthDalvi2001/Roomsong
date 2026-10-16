/// <reference types="webxr" />
// The per-frame wiring of hands/ (LLD §4, API_SPEC §1.4). Each XR frame: the sampler gets the frame, the gesture
// context is refreshed, and each hand's sample goes to its machine and into its HandState. The hand hint of
// FR-HND-15 is ui/Hints' icon, from `hands:lost` (T-150). The two Listen poses need both
// hands and the head, so they are read here, after the machines: palms out outside Listen, the wake inside it.
import { createSystem, Vector3, type Entity } from '@iwsdk/core';

import { BedAnchor, Interactable } from '../core/components.js';
import { bus, settings } from '../core/index.js';
import { nearestFreeCell } from '../garden/index.js';

import { HIT_RADIUS_M, PALMS_OUT_HOLD_MS, WAKE_HOLD_MS } from './config.js';
import { GestureMachine } from './GestureMachine.js';
import { HandSampler } from './HandSampler.js';
import { HandState } from './HandState.js';
import { createHandFrame } from './InputSource.js';
import { isPalmOut, PoseHold } from './poses/palmsOut.js';
import { isPalmToFace } from './poses/wake.js';

import type { GestureContext } from './GestureMachine.js';
import type { HandFrame, InputSource } from './InputSource.js';
import type { PickCandidate, TargetRef } from './TargetPicker.js';
import type { EventMap, Hand, Vec3 } from '../core/index.js';
import type { GardenState } from '../garden/index.js';

interface Slot {
  hand: Hand;
  frame: HandFrame;
  machine: GestureMachine;
  /** Carries the hand's HandState. */
  entity: Entity;
}

const PALMS_OUT: EventMap['gesture:palmsOut'] = Object.freeze({ type: 'gesture:palmsOut' });
const WAKE: EventMap['gesture:wake'] = Object.freeze({ type: 'gesture:wake' });

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
  /** Where the samples come from: the sampler, or the garden window's pointer (`useSource`, LLD §11). */
  private source: InputSource = this.sampler;
  private slots: Slot[] = [];
  /** The state of the latest `garden:changed`; null until there is one. */
  private garden: GardenState | null = null;
  /**
   * One per Interactable, made when its entity appears. Its `radius` is read then, once: read every frame it cost
   * a boxed number per target (16 bytes, measured). `kind`, `id` and the position are read every frame. Public
   * for the garden window's PointerSource, which reads it live (LLD §11).
   */
  readonly candidates: { target: TargetRef; radius: number; pos: Vec3 }[] = [];
  /** The entity of each candidate, at the same index. */
  private readonly targets: Entity[] = [];
  /** The BedAnchor entity: the one added last of those there are. */
  private bed: Entity | null = null;
  /** Between `listen:enter` and `listen:exit`: the wake is looked for, palms out is not (LLD §4). */
  private isListening = false;
  private readonly palmsOut = new PoseHold(PALMS_OUT_HOLD_MS);
  private readonly wake = new PoseHold(WAKE_HOLD_MS);
  /** The head's position and forward this frame. Vector3s for the reason `addTarget` gives. */
  private readonly headAt = new Vector3();
  private readonly headForward = new Vector3();
  private readonly context: GestureContext & { candidates: PickCandidate[] } = {
    candidates: this.candidates,
    bedPose: null,
    oneHand: false, // written every frame from the settings store
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
      bus.on('listen:enter', () => this.setListening(true)),
      bus.on('listen:exit', () => this.setListening(false)),
      () => this.sampler.detach(),
    );
  }

  /** `time`: IWSDK's frame time in seconds, which never goes back (the render loop's clock). */
  override update(_delta: number, time: number): void {
    // IWSDK types the frame as always there; outside a session the renderer has none.
    const frame = this.xrFrame as XRFrame | null;
    const space = this.xrManager.getReferenceSpace();
    // The garden window's source runs with no XR frame (LLD §11); the sampler has nothing to read without one.
    if (frame !== null && space !== null) this.sampler.setFrame(frame, space);
    else if (this.source === this.sampler) return;
    // Everything here runs on the frame time. Core's clock is wall time and can step back.
    // Whole milliseconds: a fraction handed to the sampler and the machines was boxed, 32 bytes a frame
    // (measured), and a whole number is not. The filter's time step is then a millisecond coarse.
    const timeMs = Math.round(time * 1000);
    this.fillContext();
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i]!;
      this.source.sample(slot.hand, timeMs, slot.frame);
      slot.machine.update(slot.frame, timeMs, this.context);
      this.write(slot);
    }
    // A pointer has no palm: the window's Listen is the orb, and a click's pinchStart is its wake (LLD §11).
    if (this.source === this.sampler) this.listenPoses(timeMs);
  }

  /** The garden window (API_SPEC §1.7): `source` gives the samples from the next frame on, with or without XR. */
  useSource(source: InputSource): void {
    this.source = source;
  }

  /**
   * FR-HND-06/07, after the machines: outside Listen, both palms out (one in one-hand mode) held 1.5 s emits
   * `gesture:palmsOut`; in it, either palm to the face held 600 ms emits `gesture:wake`. A pinch's own wake is
   * its `gesture:pinchStart`. The head is the viewer's (API_SPEC §1.10 rule 3; this runs only in a session).
   */
  private listenPoses(timeMs: number): void {
    const head = this.player.head.matrixWorld.elements;
    const slots = this.slots;
    if (this.isListening) {
      const at = this.headAt;
      at.x = head[12];
      at.y = head[13];
      at.z = head[14];
      let isFacing = false;
      for (let i = 0; i < slots.length; i++) isFacing = isFacing || isPalmToFace(slots[i]!.frame, at);
      if (this.wake.update(isFacing, timeMs)) bus.emit('gesture:wake', WAKE);
      return;
    }
    const forward = this.headForward; // the head's -Z axis; its matrix has no scale
    forward.x = -head[8];
    forward.y = -head[9];
    forward.z = -head[10];
    let out = 0;
    for (let i = 0; i < slots.length; i++) if (isPalmOut(slots[i]!.frame, forward)) out++;
    const isPosed = out > 0 && (settings.get().oneHand || out === slots.length);
    if (this.palmsOut.update(isPosed, timeMs)) bus.emit('gesture:palmsOut', PALMS_OUT);
  }

  /** Each Listen pose is timed from the moment it is looked for. */
  private setListening(isListening: boolean): void {
    this.isListening = isListening;
    this.palmsOut.reset();
    this.wake.reset();
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
    this.context.oneHand = settings.get().oneHand; // UX §9.1: the palm pick
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

  /** Nothing of one session reaches the next: the sampler, a held gesture (reverted), the hand's state. */
  private endSession(): void {
    this.sampler.detach();
    this.palmsOut.reset();
    this.wake.reset();
    for (const slot of this.slots) {
      slot.machine.reset();
      slot.frame.tracked = slot.frame.pinch = slot.frame.select = false;
      this.write(slot);
    }
  }
}
