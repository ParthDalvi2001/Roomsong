// The gesture state machine, v1 (LLD §4): what one hand's pinch starts on, and the one event that commits.
// Built: IDLE, CARRYING (a seed), PINCHED (a plant, or nothing) and PRESSED (orb, undo petal, panel control);
// PLANT is the release of a carried seed over the bed. Pull, drag and remove are T-146; the tracking-loss grace,
// the revert and the hover cue are T-116.
import { bus } from '../core/index.js';
import { bedZone } from '../garden/index.js';

import { PalmUpHold } from './poses/palmUp.js';
import { hoverCell, pickTarget, toBedLocal } from './TargetPicker.js';

import type { HandFrame } from './InputSource.js';
import type { PickCandidate, TargetRef } from './TargetPicker.js';
import type { Hand, Mat4, Vec2, Vec3 } from '../core/index.js';
import type { BedZone, Cell } from '../garden/index.js';

/** What the pinch had become when it ended. 'none' = it never left the dead zone, or it started on nothing. */
export type HeldGesture = 'press' | 'carry' | 'drag' | 'pull' | 'none';

export type GestureEvent =
  | { type: 'gesture:palmUp'; hand: Hand }
  | { type: 'gesture:pinchStart'; hand: Hand; target: TargetRef | null; pos: Vec3 }
  | { type: 'gesture:pull'; hand: Hand; target: TargetRef; dy: number } // preview only; commits nothing
  | { type: 'gesture:drag'; hand: Hand; target: TargetRef; pos: Vec3; zone: BedZone } // preview only
  | {
      // the one event that commits (FR-HND-16); who does what: the table in API_SPEC §1.4
      type: 'gesture:release';
      hand: Hand;
      gesture: HeldGesture;
      target: TargetRef | null;
      pos: Vec3;
      zone: BedZone;
      cell: Cell | null;
      dy: number | null;
    }
  | { type: 'gesture:palmsOut' }
  | { type: 'gesture:wake' }
  | { type: 'gesture:trackingLost'; hand: Hand }; // the FR-HND-15 grace expired and the held gesture was reverted

/** The payload of one gesture event. */
export type GesturePayload<K extends GestureEvent['type']> = Extract<GestureEvent, { type: K }>;

/** What the machine reads when a pinch starts or ends. HandSystem keeps one and refreshes it every frame. */
export interface GestureContext {
  /** Every Interactable there is this frame. */
  candidates: readonly PickCandidate[];
  /** The BedAnchor entity's `matrixWorld.elements` (LLD §3); null while no bed is placed. */
  bedPose: Mat4 | null;
  /** garden's `nearestFreeCell` on the state of the latest `garden:changed`. null = the bed is full. */
  nearestFreeCell: (cell: Cell) => Cell | null;
}

type State = 'IDLE' | 'PRESSED' | 'PINCHED' | 'CARRYING';

function copy(out: Vec3, from: Vec3): void {
  out.x = from.x;
  out.y = from.y;
  out.z = from.z;
}

/**
 * One hand's gestures. Emits `gesture:palmUp`, `gesture:pinchStart` and `gesture:release` on the bus. The
 * payload objects are reused from one event to the next (API_SPEC §1.4): a handler copies what it keeps.
 */
export class GestureMachine {
  private state: State = 'IDLE';
  /** True: the held pinch started on `pinch` (a plant) and ends on it. False: on `select` (everything else). */
  private endsOnPinch = false;
  private wasPinch = false;
  private wasSelect = false;
  private holdsTarget = false;
  /** Our own copy of what the pinch started on: a candidate's ref is the caller's object and may be reused. */
  private readonly held: TargetRef = { kind: 'seed', id: '' };
  private readonly palmUp = new PalmUpHold();
  private readonly local: Vec2 = { x: 0, y: 0 };
  private readonly palmUpEvent: GesturePayload<'gesture:palmUp'>;
  private readonly startEvent: GesturePayload<'gesture:pinchStart'>;
  private readonly releaseEvent: GesturePayload<'gesture:release'>;

  constructor(hand: Hand) {
    this.palmUpEvent = { type: 'gesture:palmUp', hand };
    this.startEvent = { type: 'gesture:pinchStart', hand, target: null, pos: { x: 0, y: 0, z: 0 } };
    this.releaseEvent = {
      type: 'gesture:release',
      hand,
      gesture: 'none',
      target: null,
      pos: { x: 0, y: 0, z: 0 },
      zone: 'inner',
      cell: null,
      dy: null,
    };
  }

  /** One sample of this machine's hand. Nothing starts, ends or commits on an untracked sample. */
  update(frame: HandFrame, timeMs: number, context: GestureContext): void {
    if (!frame.tracked) {
      // shortcut: a held gesture waits for the hand with no time limit; the 200 ms grace and the revert of
      // FR-HND-15 are T-116
      this.palmUp.reset(); // LLD §4: pose timers restart when a hand is lost
      return;
    }
    if (this.state === 'IDLE') this.idle(frame, timeMs, context);
    else if (!(this.endsOnPinch ? frame.pinch : frame.select)) this.release(frame, context);
    this.wasPinch = frame.pinch;
    this.wasSelect = frame.select;
  }

  private idle(frame: HandFrame, timeMs: number, context: GestureContext): void {
    // Edges, not levels: a signal that is still down from the last pinch starts nothing.
    const pinchRose = frame.pinch && !this.wasPinch;
    const selectRose = frame.select && !this.wasSelect;
    if (pinchRose || selectRose) {
      const target = pickTarget(frame.pinchPos, context.candidates);
      // FR-HND-02: a plant is held on the joint distance and everything else is tapped on the platform's
      // select. What is under the hand picks the signal; the other one's edge does nothing (never OR-ed).
      const usesPinch = target !== null && target.kind === 'plant';
      if (usesPinch ? pinchRose : selectRose) {
        this.start(frame, target, usesPinch);
        return;
      }
    }
    if (this.palmUp.update(frame, timeMs)) bus.emit('gesture:palmUp', this.palmUpEvent);
  }

  private start(frame: HandFrame, target: TargetRef | null, usesPinch: boolean): void {
    this.endsOnPinch = usesPinch;
    this.holdsTarget = target !== null;
    this.state = 'PINCHED'; // a plant, or nothing
    if (target !== null) {
      this.held.kind = target.kind;
      this.held.id = target.id;
      if (target.kind === 'seed') this.state = 'CARRYING';
      else if (target.kind !== 'plant') this.state = 'PRESSED';
    }
    this.palmUp.reset(); // the hold starts over once the hand is idle again (LLD §11: the next seed)
    const event = this.startEvent;
    event.target = target === null ? null : this.held;
    copy(event.pos, frame.pinchPos);
    bus.emit('gesture:pinchStart', event);
  }

  private release(frame: HandFrame, context: GestureContext): void {
    const event = this.releaseEvent;
    const state = this.state;
    const local = context.bedPose === null ? null : toBedLocal(context.bedPose, frame.pinchPos, this.local);
    // No bed placed: 'inner', the zone where a release commits nothing (API_SPEC §1.4).
    event.zone = local === null ? 'inner' : bedZone(local);
    event.gesture = state === 'CARRYING' ? 'carry' : state === 'PRESSED' ? 'press' : 'none';
    // PLANT (FR-HND-16): the snapped cell resolved to a free one, worked out here until T-116 adds the hover.
    const plants = state === 'CARRYING' && local !== null && event.zone === 'bed';
    event.cell = plants ? hoverCell(local, context.nearestFreeCell) : null;
    event.target = this.holdsTarget ? this.held : null;
    // A press counts only when the hand is still on what it pressed; moving off it first cancels.
    if (state === 'PRESSED' && !this.isHeld(pickTarget(frame.pinchPos, context.candidates)))
      event.target = null;
    event.dy = null;
    copy(event.pos, frame.pinchPos);
    this.state = 'IDLE';
    bus.emit('gesture:release', event);
  }

  private isHeld(target: TargetRef | null): boolean {
    return target !== null && target.kind === this.held.kind && target.id === this.held.id;
  }
}
