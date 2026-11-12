// The gesture state machine (LLD §4): what one hand's pinch starts on, what it becomes, and the one event that
// commits. IDLE, CARRYING (a seed), PRESSED (orb, undo petal, panel control) and PINCHED (a plant, or nothing);
// a pinched plant becomes PULLING or DRAGGING once the hand leaves the dead zone (FR-HND-08/10). The hover
// (FR-HND-16) and the tracking-loss grace with its revert (FR-HND-15) hold for every one of them.
import { Vector3 } from '@iwsdk/core';

import { bus, guide } from '../core/index.js';
import { bedZone } from '../garden/index.js';

import { DRAG_DEAD_ZONE_M, TRACKING_GRACE_MS } from './config.js';
import { isPalmUp, PalmUpHold } from './poses/palmUp.js';
import { pickPastHand, pickTarget, stickyCell, toBedLocal } from './TargetPicker.js';

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
  /** Where the eyes are (D-066): a panel control, plant or petal is picked along the line through the fingers. */
  eye?: Vec3;
  /**
   * garden's `nearestFreeCell` on the state of the latest `garden:changed`. null = the bed is full.
   * `ignorePlantId`: the plant that is being dragged, whose own cell counts as free.
   */
  nearestFreeCell: (cell: Cell, ignorePlantId?: string) => Cell | null;
}

type State = 'IDLE' | 'PRESSED' | 'PINCHED' | 'PULLING' | 'DRAGGING' | 'CARRYING';
/** The signal a held pinch started on and ends on (FR-HND-02). */
type HeldOn = 'pinch' | 'select' | 'either';

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
   * 'pinch': the held pinch started on the joint distance (a plant) and ends on it, so a hand that is not idle
   * holds a plant exactly then. 'select': on the platform's select (a press, or nothing). 'either' (a seed,
   * BUG-055): Quest sends no select for a hand whose palm faces down, the pose over the bed (9 Nov recorder: 285
   * samples of closed fingers on a seed that started nothing), so a seed is taken on whichever signal closes
   * first and is held until both are open.
   */
  private heldOn: HeldOn = 'select';
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
  /** The eye-line pick's `along` for this sample's hover (D-066); 0 when the hover was not picked by sight. */
  private readonly sight = { along: 0 };
  /**
   * BUG-033: a plant taken by sight is held on the line from the eyes through the fingers, this many eye-to-fingers
   * lengths out (as far out as it was picked), so it goes where the player looks; 0 = held at the fingers.
   */
  private heldAlong = 0;
  private readonly heldAt = new Vector3();
  /** Where the fingers were when the pinch began: a hold's travel is the hand's own, wherever its plant is held. */
  private readonly pinchedAt = new Vector3();
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
    // Vector3 payload positions, as the HandFrame's (InputSource.ts): the copies into them box nothing.
    this.startEvent = { type: 'gesture:pinchStart', hand, target: null, pos: new Vector3() };
    this.pullEvent = { type: 'gesture:pull', hand, target: this.held, dy: 0 };
    this.dragEvent = { type: 'gesture:drag', hand, target: this.held, pos: new Vector3(), zone: 'inner' };
    this.releaseEvent = {
      type: 'gesture:release',
      hand,
      gesture: 'none',
      target: null,
      pos: new Vector3(),
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
    if (this.state !== 'IDLE' && this.heldOn === 'pinch' && frame.pinch) this.shape(frame, context.bedPose);
    this.hover(frame, context);
    if (this.state === 'IDLE') this.idle(frame, timeMs, context.eye);
    else if (!this.isDown(frame)) this.release(frame, context);
    else this.preview(frame, context);
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
    this.lostEvent.held = this.state !== 'IDLE' && this.holdsTarget ? this.held : null;
    bus.emit('hands:lost', this.lostEvent);
    if (this.state === 'IDLE') this.setHover(null, null);
  }

  /** The first tracked sample. A first sighting is not a return: `hands:found` only answers a `hands:lost`. */
  private find(timeMs: number): void {
    if (this.isGraceOver(timeMs)) this.revert(); // no sample came in time to end the grace (a paused page)
    this.wasTracked = true;
    if (Number.isNaN(this.lostAtMs)) return;
    // Real hands drop out for tens of ms many times a second (first device run): only a longer loss restarts the pose.
    if (timeMs - this.lostAtMs >= TRACKING_GRACE_MS) this.palmUp.reset();
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
    const from = this.pinchedAt; // start() wrote it, and nothing does before the next
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
    const isPull = up * up >= travelSq - up * up; // |dy| >= |dxz|, both squared
    // D-087: the strict guide's step teaches one shape; the other is not taken, the plant stays pinched until it is
    const only = guide.lock === null ? null : guide.lock.shape;
    if (only !== null && isPull !== (only === 'pull')) return;
    this.state = isPull ? 'PULLING' : 'DRAGGING';
  }

  /** FR-HND-16: what a pinch, or the release of this one, would act on. */
  private hover(frame: HandFrame, context: GestureContext): void {
    const state = this.state;
    if (state !== 'CARRYING' && state !== 'DRAGGING') {
      this.snapped = null;
      // A pinched or pulled plant is its own hover wherever the hand goes: its release acts on it and on no cell.
      const isHeldPlant = state !== 'IDLE' && this.heldOn === 'pinch';
      const kept = this.hoverEvent.target;
      this.sight.along = 0;
      let picked = isHeldPlant ? this.held : pickTarget(frame.pinchPos, context.candidates, kept);
      if (picked === null) {
        const eye = state === 'IDLE' || state === 'PRESSED' ? context.eye : undefined;
        const seen =
          eye === undefined ? null : pickPastHand(eye, frame.pinchPos, context.candidates, kept, this.sight);
        // D-062, first device run: nothing at the fingertips: the seed resting on this palm is the hover, for everyone.
        // Players pinch with the hand that holds the seed and carry it down to the bed. BUG-042: a panel control seen
        // past the hand comes first (Exit, in one-hand mode); a plant or petal seen there does not.
        const seed =
          state === 'IDLE' && (seen === null || seen.kind !== 'panel')
            ? pickTarget(frame.palmPos, context.candidates, kept, 'seed') // a plant by the palm does not block it
            : null;
        if (seed !== null) this.sight.along = 0;
        picked = seed ?? seen;
      }
      this.setHover(picked, null);
      return;
    }
    this.snapped =
      context.bedPose === null
        ? null
        : stickyCell(
            toBedLocal(context.bedPose, this.point(frame, context.eye), this.local),
            this.snapped,
            state === 'CARRYING', // BUG-055: a seed over the hole or just outside the ring gets a cell; a plant does not
          );
    // Garden is asked on every sample: the other hand may fill the cell while this one hovers it. A dragged
    // plant's own cell counts as free: it may be put back where it stands.
    const dragged = state === 'DRAGGING' ? this.held.id : undefined;
    this.setHover(null, this.snapped === null ? null : context.nearestFreeCell(this.snapped, dragged));
  }

  /** No bed placed: 'inner', the zone where a release commits nothing (API_SPEC §1.4). */
  private zone(at: Vec3, bedPose: Mat4 | null): BedZone {
    return bedPose === null ? 'inner' : bedZone(toBedLocal(bedPose, at, this.local));
  }

  /** Where the hold is this sample: the fingers, or for a plant taken by sight its point on the eye line (BUG-033). */
  private point(frame: HandFrame, eye: Vec3 | undefined): Vec3 {
    const k = this.heldAlong;
    const fingers = frame.pinchPos;
    if (k === 0 || eye === undefined) return fingers;
    const at = this.heldAt;
    at.x = eye.x + k * (fingers.x - eye.x);
    at.y = eye.y + k * (fingers.y - eye.y);
    at.z = eye.z + k * (fingers.z - eye.z);
    return at;
  }

  /**
   * The previews of a held plant (LLD §4): one per tracked sample, from the sample that decided to the one
   * before the release. They commit nothing (FR-HND-16).
   */
  private preview(frame: HandFrame, context: GestureContext): void {
    if (this.state === 'PULLING') {
      bus.emit('gesture:pull', this.pullEvent); // shape() wrote its travel on this same sample
    } else if (this.state === 'DRAGGING') {
      const event = this.dragEvent;
      const at = this.point(frame, context.eye);
      copy(event.pos, at);
      event.zone = this.zone(at, context.bedPose);
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

  private idle(frame: HandFrame, timeMs: number, eye: Vec3 | undefined): void {
    // Edges, not levels: a signal that is still down from the last pinch starts nothing.
    const pinchRose = frame.pinch && !this.wasPinch;
    const selectRose = frame.select && !this.wasSelect;
    if (pinchRose || selectRose) {
      const target = this.hoverEvent.target;
      // FR-HND-02: a plant is held on the joint distance and a press is tapped on the platform's select. What
      // is under the hand picks the signal; the other one's edge does nothing. A seed (BUG-055) takes either: a
      // select edge always, and a joint edge while no select is down (one still down from the last pinch starts
      // nothing) and the palm is not up. An open palm that holds the seed up brushes thumb on index: on the
      // 10 Nov run that took the seed off its own palm and dropped it at once, eleven times in a minute.
      const kind = target === null ? null : target.kind;
      const on: HeldOn = kind === 'plant' ? 'pinch' : kind === 'seed' ? 'either' : 'select';
      const rose =
        on === 'pinch'
          ? pinchRose
          : on === 'select'
            ? selectRose
            : selectRose || (pinchRose && !frame.select && !isPalmUp(frame.palmNormal));
      if (rose) {
        this.start(frame, target, on, eye);
        return;
      }
    }
    // D-087: the hold is timed always; the strict guide lets it ask for a seed only at its palm and plant steps
    if (this.palmUp.update(frame, timeMs) && guide.lock?.palmUp !== false)
      bus.emit('gesture:palmUp', this.palmUpEvent);
  }

  /** The held pinch is still closed, on the signal it started on. */
  private isDown(frame: HandFrame): boolean {
    const on = this.heldOn;
    return on === 'pinch' ? frame.pinch : on === 'select' ? frame.select : frame.pinch || frame.select;
  }

  private start(frame: HandFrame, target: TargetRef | null, on: HeldOn, eye: Vec3 | undefined): void {
    this.heldOn = on;
    this.heldAlong = on === 'pinch' ? this.sight.along : 0; // this same sample's hover picked the target
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
    copy(this.pinchedAt, frame.pinchPos);
    copy(event.pos, this.point(frame, eye));
    bus.emit('gesture:pinchStart', event);
  }

  private release(frame: HandFrame, context: GestureContext): void {
    const event = this.releaseEvent;
    const state = this.state;
    const at = this.point(frame, context.eye);
    copy(event.pos, at);
    event.zone = this.zone(at, context.bedPose);
    event.gesture = ENDS_AS[state];
    // PLANT and a drag (FR-HND-16): the hovered cell of this same sample, not a fresh snap; null off the bed.
    // Every other hover has no cell, so a pull cannot move its plant.
    event.cell = this.hoverEvent.cell;
    event.target = this.holdsTarget ? this.held : null;
    // A press counts only when the hover is still on what was pressed; moving off it first cancels.
    if (state === 'PRESSED' && !isSame(this.hoverEvent.target, this.held)) event.target = null;
    event.dy = state === 'PULLING' ? this.pullEvent.dy : null; // FR-HND-08: a pull always carries its travel
    this.state = 'IDLE';
    bus.emit('gesture:release', event);
  }
}
