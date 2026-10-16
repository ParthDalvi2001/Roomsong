// The gesture state machine (LLD §4): what one hand's pinch starts on, what it becomes, and the one event that
// commits. IDLE, CARRYING (a seed), PRESSED (orb, undo petal, panel control) and PINCHED (a plant, or nothing);
// a pinched plant becomes PULLING or DRAGGING once the hand leaves the dead zone (FR-HND-08/10). The hover
// (FR-HND-16) and the tracking-loss grace with its revert (FR-HND-15) hold for every one of them.
import { bus } from '../core/index.js';
import { bedZone } from '../garden/index.js';

import { DRAG_DEAD_ZONE_M, TRACKING_GRACE_MS } from './config.js';
import { PalmUpHold } from './poses/palmUp.js';
import { pickTarget, stickyCell, toBedLocal } from './TargetPicker.js';

import type { HandFrame } from './InputSource.js';
import type { PickCandidate, TargetRef } from './TargetPicker.js';
import type { EventMap, Hand, Mat4, Vec2, Vec3 } from '../core/index.js';
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
  /**
   * garden's `nearestFreeCell` on the state of the latest `garden:changed`. null = the bed is full.
   * `ignorePlantId`: the plant that is being dragged, whose own cell counts as free.
   */
  nearestFreeCell: (cell: Cell, ignorePlantId?: string) => Cell | null;
  /** `Settings.oneHand` (FR-UI-09): an idle hand with nothing at its fingertips may take the seed off its own palm. */
  oneHand: boolean;
}

type State = 'IDLE' | 'PRESSED' | 'PINCHED' | 'PULLING' | 'DRAGGING' | 'CARRYING';

/** What the release of each state is: the `gesture` column of the release table (API_SPEC §1.4). */
const ENDS_AS: Readonly<Record<State, HeldGesture>> = {
  IDLE: 'none',
  PRESSED: 'press',
  PINCHED: 'none',
  PULLING: 'pull',
  DRAGGING: 'drag',
  CARRYING: 'carry',
};

function copy(out: Vec3, from: Vec3): void {
  out.x = from.x;
  out.y = from.y;
  out.z = from.z;
}

function isSame(a: TargetRef | null, b: TargetRef | null): boolean {
  return a === null || b === null ? a === b : a.kind === b.kind && a.id === b.id;
}

/**
 * One hand's gestures. Emits `gesture:palmUp`, `gesture:pinchStart`, `gesture:pull`, `gesture:drag`,
 * `gesture:release`, `gesture:trackingLost`, `hands:lost`, `hands:found` and `target:hover` on the bus. The
 * payload objects are reused from one event to the next (API_SPEC §1.4): a handler copies what it keeps.
 */
export class GestureMachine {
  private state: State = 'IDLE';
  /**
   * True: the held pinch started on `pinch` (a plant) and ends on it. False: on `select` (everything else).
   * So a hand that is not idle holds a plant exactly when this is true.
   */
  private endsOnPinch = false;
  private wasPinch = false;
  private wasSelect = false;
  private holdsTarget = false;
  /** Our own copy of what the pinch started on: a candidate's ref is the caller's object and may be reused. */
  private readonly held: TargetRef = { kind: 'seed', id: '' };
  private wasTracked = false;
  /** When the hand was lost (FR-HND-15: the grace runs from here); NaN while it is not lost. */
  private lostAtMs = Number.NaN;
  /** Our own copy of the hovered target, for the same reason as `held`. `hoverEvent` is the hover itself. */
  private readonly hovered: TargetRef = { kind: 'seed', id: '' };
  /** The cell under a carried seed, as `stickyCell` returned it last: its memory. */
  private snapped: Cell | null = null;
  private readonly palmUp = new PalmUpHold();
  private readonly local: Vec2 = { x: 0, y: 0 };
  private readonly palmUpEvent: GesturePayload<'gesture:palmUp'>;
  private readonly startEvent: GesturePayload<'gesture:pinchStart'>;
  private readonly pullEvent: GesturePayload<'gesture:pull'>;
  private readonly dragEvent: GesturePayload<'gesture:drag'>;
  private readonly releaseEvent: GesturePayload<'gesture:release'>;
  private readonly trackingLostEvent: GesturePayload<'gesture:trackingLost'>;
  private readonly lostEvent: EventMap['hands:lost'];
  private readonly foundEvent: EventMap['hands:found'];
  private readonly hoverEvent: EventMap['target:hover'];

  constructor(hand: Hand) {
    this.palmUpEvent = { type: 'gesture:palmUp', hand };
    this.startEvent = { type: 'gesture:pinchStart', hand, target: null, pos: { x: 0, y: 0, z: 0 } };
    this.pullEvent = { type: 'gesture:pull', hand, target: this.held, dy: 0 };
    const pos = { x: 0, y: 0, z: 0 };
    this.dragEvent = { type: 'gesture:drag', hand, target: this.held, pos, zone: 'inner' };
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
    this.trackingLostEvent = { type: 'gesture:trackingLost', hand };
    this.lostEvent = { hand, held: null };
    this.foundEvent = { hand };
    this.hoverEvent = { hand, target: null, cell: null };
  }

  /**
   * One sample of this machine's hand; `timeMs` never goes back. Nothing starts, ends or commits on an untracked
   * sample. On a tracked one a held plant's travel is read first (while the pinch is closed), then the hover is
   * worked out, so a pinch starts and ends on what was shown; a held plant that is not released is previewed.
   */
  update(frame: HandFrame, timeMs: number, context: GestureContext): void {
    if (!frame.tracked) {
      if (this.wasTracked) this.lose(timeMs);
      else if (this.isGraceOver(timeMs)) this.revert();
      return;
    }
    if (!this.wasTracked) this.find(timeMs);
    // Not on the sample where the pinch opens: opening moves the pinch point, and what commits is what was shown.
    if (this.state !== 'IDLE' && this.endsOnPinch && frame.pinch) this.shape(frame, context.bedPose);
    this.hover(frame, context);
    if (this.state === 'IDLE') this.idle(frame, timeMs);
    else if (!(this.endsOnPinch ? frame.pinch : frame.select)) this.release(frame, context);
    else this.preview(frame, context.bedPose);
    this.wasPinch = frame.pinch;
    this.wasSelect = frame.select;
  }

  /**
   * On `xr:sessionEnd`: a held gesture is reverted as if its grace had run out, so no consumer keeps a preview,
   * then everything is forgotten. A lost hand gets no `hands:found`: it was not seen again.
   */
  reset(): void {
    if (this.state !== 'IDLE') this.revert();
    this.setHover(null, null);
    this.wasTracked = this.wasPinch = this.wasSelect = false;
    this.lostAtMs = Number.NaN;
    this.palmUp.reset();
  }

  /** FR-HND-15: the first untracked sample. A held gesture freezes with its hover; an idle hand's hover clears. */
  private lose(timeMs: number): void {
    this.wasTracked = false;
    this.lostAtMs = timeMs;
    this.palmUp.reset(); // LLD §4: pose timers restart when a hand is lost
    this.lostEvent.held = this.state !== 'IDLE' && this.holdsTarget ? this.held : null;
    bus.emit('hands:lost', this.lostEvent);
    if (this.state === 'IDLE') this.setHover(null, null);
  }

  /** The first tracked sample. A first sighting is not a return: `hands:found` only answers a `hands:lost`. */
  private find(timeMs: number): void {
    if (this.isGraceOver(timeMs)) this.revert(); // no sample came in time to end the grace (a paused page)
    this.wasTracked = true;
    if (Number.isNaN(this.lostAtMs)) return;
    this.lostAtMs = Number.NaN;
    bus.emit('hands:found', this.foundEvent);
  }

  private isGraceOver(timeMs: number): boolean {
    return this.state !== 'IDLE' && timeMs - this.lostAtMs >= TRACKING_GRACE_MS;
  }

  /**
   * FR-HND-15: the held gesture ends with no release, so nothing is committed. What reverts the preview hangs
   * on this event: a carried seed's way back to the supply (garden), a dragged plant's glide to its cell and a
   * pulled plant's way back to its height (render, T-147).
   */
  private revert(): void {
    this.state = 'IDLE';
    bus.emit('gesture:trackingLost', this.trackingLostEvent);
    this.setHover(null, null);
  }

  /**
   * FR-HND-08/10, a held plant: its travel since the pinch began, and on the first sample outside the dead zone
   * the larger part of that travel decides what the pinch is, for good. A tie is a pull, the one that cannot
   * remove a plant.
   */
  private shape(frame: HandFrame, bedPose: Mat4 | null): void {
    const from = this.startEvent.pos; // where the pinch began: start() wrote it, and nothing does before the next
    const dx = frame.pinchPos.x - from.x;
    const dy = frame.pinchPos.y - from.y;
    const dz = frame.pinchPos.z - from.z;
    // LLD §4: the travel is read in the bed's frame, whose up is the second column of its pose (a restored
    // anchor may not be level). With no bed it is the world's up.
    const up = bedPose === null ? dy : dx * bedPose[4]! + dy * bedPose[5]! + dz * bedPose[6]!;
    this.pullEvent.dy = up; // kept in the preview's own payload: the release reads it there too
    if (this.state !== 'PINCHED') return;
    const travelSq = dx * dx + dy * dy + dz * dz;
    if (travelSq < DRAG_DEAD_ZONE_M * DRAG_DEAD_ZONE_M) return;
    this.state = up * up >= travelSq - up * up ? 'PULLING' : 'DRAGGING'; // |dy| >= |dxz|, both squared
  }

  /** FR-HND-16: what a pinch, or the release of this one, would act on. */
  private hover(frame: HandFrame, context: GestureContext): void {
    const state = this.state;
    if (state !== 'CARRYING' && state !== 'DRAGGING') {
      this.snapped = null;
      // A pinched or pulled plant is its own hover wherever the hand goes: its release acts on it and on no cell.
      const isHeldPlant = state !== 'IDLE' && this.endsOnPinch;
      const kept = this.hoverEvent.target;
      let picked = isHeldPlant ? this.held : pickTarget(frame.pinchPos, context.candidates, kept);
      // UX §9.1 (D-048): one-hand mode, nothing at the fingertips: the seed resting on this palm is the hover.
      if (picked === null && state === 'IDLE' && context.oneHand) {
        picked = pickTarget(frame.palmPos, context.candidates, kept, 'seed'); // a plant by the palm does not block it
      }
      this.setHover(picked, null);
      return;
    }
    this.snapped =
      context.bedPose === null
        ? null
        : stickyCell(toBedLocal(context.bedPose, frame.pinchPos, this.local), this.snapped);
    // Garden is asked on every sample: the other hand may fill the cell while this one hovers it. A dragged
    // plant's own cell counts as free: it may be put back where it stands.
    const dragged = state === 'DRAGGING' ? this.held.id : undefined;
    this.setHover(null, this.snapped === null ? null : context.nearestFreeCell(this.snapped, dragged));
  }

  /** No bed placed: 'inner', the zone where a release commits nothing (API_SPEC §1.4). */
  private zone(frame: HandFrame, bedPose: Mat4 | null): BedZone {
    return bedPose === null ? 'inner' : bedZone(toBedLocal(bedPose, frame.pinchPos, this.local));
  }

  /**
   * The previews of a held plant (LLD §4): one per tracked sample, from the sample that decided to the one
   * before the release. They commit nothing (FR-HND-16).
   */
  private preview(frame: HandFrame, bedPose: Mat4 | null): void {
    if (this.state === 'PULLING') {
      bus.emit('gesture:pull', this.pullEvent); // shape() wrote its travel on this same sample
    } else if (this.state === 'DRAGGING') {
      const event = this.dragEvent;
      copy(event.pos, frame.pinchPos);
      event.zone = this.zone(frame, bedPose);
      bus.emit('gesture:drag', event);
    }
  }

  /** Stores the hover and emits `target:hover`, on a change only. */
  private setHover(target: TargetRef | null, cell: Cell | null): void {
    const event = this.hoverEvent;
    const sameCell =
      cell === null
        ? event.cell === null
        : event.cell !== null && event.cell.ring === cell.ring && event.cell.step === cell.step;
    if (isSame(event.target, target) && sameCell) return;
    if (target === null) event.target = null;
    else {
      this.hovered.kind = target.kind;
      this.hovered.id = target.id;
      event.target = this.hovered;
    }
    event.cell = cell;
    bus.emit('target:hover', event);
  }

  private idle(frame: HandFrame, timeMs: number): void {
    // Edges, not levels: a signal that is still down from the last pinch starts nothing.
    const pinchRose = frame.pinch && !this.wasPinch;
    const selectRose = frame.select && !this.wasSelect;
    if (pinchRose || selectRose) {
      const target = this.hoverEvent.target;
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
    event.zone = this.zone(frame, context.bedPose);
    event.gesture = ENDS_AS[state];
    // PLANT and a drag (FR-HND-16): the hovered cell of this same sample, not a fresh snap; null off the bed.
    // Every other hover has no cell, so a pull cannot move its plant.
    event.cell = this.hoverEvent.cell;
    event.target = this.holdsTarget ? this.held : null;
    // A press counts only when the hover is still on what was pressed; moving off it first cancels.
    if (state === 'PRESSED' && !isSame(this.hoverEvent.target, this.held)) event.target = null;
    event.dy = state === 'PULLING' ? this.pullEvent.dy : null; // FR-HND-08: a pull always carries its travel
    copy(event.pos, frame.pinchPos);
    this.state = 'IDLE';
    bus.emit('gesture:release', event);
  }
}
