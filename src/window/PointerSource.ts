// The garden window's input (FR-SYS-07, LLD §11): a mouse, pen or touch contact as one hand's pinch, behind the
// InputSource seam that hands/ owns (API_SPEC §1.4). No filter and no hysteresis: a button is already clean.
// A pointer cannot pull: it has no travel off the bed plane.
import { Vector3 } from 'three';

import { bus, settings } from '../core/index.js';

import { POINTER_QUEUE_SIZE } from './config.js';

import type { WindowStage } from './WindowStage.js';
import type { Hand, Vec3 } from '../core/index.js';
import type { HandFrame, InputSource, PickCandidate } from '../hands/index.js';

/** LLD §11: the targets a seed resting on the pointer steps aside for. Not the seed itself, not the settings orb. */
const STEP_ASIDE_FOR: readonly PickCandidate['target']['kind'][] = ['plant', 'orb', 'undo'];

export class PointerSource implements InputSource {
  /** The dominant hand alone, as the settings have it now (a restored or changed setting follows). */
  hands: readonly Hand[];
  private hand: Hand;
  /** The events not sampled yet, a ring: each one's screen point (NDC) and button. */
  private readonly queueX = new Float64Array(POINTER_QUEUE_SIZE);
  private readonly queueY = new Float64Array(POINTER_QUEUE_SIZE);
  private readonly queueDown = new Uint8Array(POINTER_QUEUE_SIZE);
  private head = 0;
  private count = 0;
  /** The button after the last queued event, and whether that event was a move (the next move replaces it). */
  private queuedDown = false;
  private isLastMove = false;
  /** What the samples have handed out so far: the screen point (once there is one) and the button. */
  private ndcX = 0;
  private ndcY = 0;
  private hasPointer = false;
  private isDown = false;
  private inSession = false;
  private isSeen = false;
  private readonly pos = new Vector3();
  private readonly lastPos = new Vector3();
  /** The previous sample's time, ms; -1 before the first one. */
  private lastMs = -1;
  private readonly offs: (() => void)[];

  /**
   * `element` is the canvas; `stage` maps its points onto the bed plane; `targets` is HandSystem's own candidate
   * list, read live in every sample (the seed's palm steps aside for them).
   */
  constructor(
    private readonly element: HTMLElement,
    private readonly stage: WindowStage,
    private readonly targets: readonly PickCandidate[],
  ) {
    this.hand = settings.get().dominantHand;
    this.hands = [this.hand];
    element.style.touchAction = 'none'; // a touch drag moves a plant, not the page
    element.addEventListener('pointerdown', this.onDown);
    element.addEventListener('pointermove', this.onMove);
    element.addEventListener('pointerup', this.onUp);
    element.addEventListener('pointercancel', this.onCancel);
    // Tracked from Enter on while the page is seen: the same xr:* events the window emits for the page.
    this.offs = [
      bus.on('xr:sessionStart', ({ visible }) => {
        this.inSession = true;
        this.isSeen = visible;
      }),
      bus.on('xr:visibility', ({ visible }) => void (this.isSeen = visible)),
      bus.on('xr:sessionEnd', () => this.forget()),
      bus.on('settings:changed', ({ settings: now }) => {
        if (now.dominantHand === this.hand) return;
        this.hand = now.dominantHand;
        this.hands = [this.hand];
      }),
    ];
  }

  /** LLD §11. Creates nothing (hot path). An untracked sample leaves `out` as it was, `pinch` held. */
  sample(hand: Hand, timeMs: number, out: HandFrame): void {
    out.tracked = this.inSession && this.isSeen && hand === this.hand;
    if (!out.tracked) return;
    this.takeOne();
    out.pinch = out.select = this.isDown; // no platform classifier: select = pinch
    const pos = this.pos;
    // Sticky: a pointer that has left the bed plane (above the horizon) is reported where it last was on it.
    if (!this.hasPointer) this.stage.restPoint(pos);
    else this.stage.project(this.ndcX, this.ndcY, pos);
    copy(out.pinchPos, pos);
    if (this.isNearTarget(pos)) this.stage.restPoint(out.palmPos);
    else copy(out.palmPos, pos);
    // A pointer has no palm: up keeps the palm-up pose true, so the next seed comes (LLD §11, §4).
    out.palmNormal.x = 0;
    out.palmNormal.y = 1;
    out.palmNormal.z = 0;
    const dtS = (timeMs - this.lastMs) / 1000;
    const isFirst = this.lastMs < 0 || dtS <= 0;
    out.velocity.x = isFirst ? 0 : (pos.x - this.lastPos.x) / dtS;
    out.velocity.y = isFirst ? 0 : (pos.y - this.lastPos.y) / dtS;
    out.velocity.z = isFirst ? 0 : (pos.z - this.lastPos.z) / dtS;
    this.lastPos.copy(pos);
    this.lastMs = timeMs;
  }

  /** Stops listening to the canvas and the bus. */
  dispose(): void {
    this.element.removeEventListener('pointerdown', this.onDown);
    this.element.removeEventListener('pointermove', this.onMove);
    this.element.removeEventListener('pointerup', this.onUp);
    this.element.removeEventListener('pointercancel', this.onCancel);
    for (const off of this.offs) off();
  }

  /**
   * Hands out the queue up to its next button change (LLD §11, latched). Moves are taken at once. A change is
   * taken alone, in a sample whose point has not moved, so a click is three samples and the hover is worked out
   * at the new point before the pinch starts.
   */
  private takeOne(): void {
    let hasMoved = false;
    while (this.count > 0) {
      const i = this.head;
      const x = this.queueX[i]!;
      const y = this.queueY[i]!;
      const isDown = this.queueDown[i] === 1;
      const isSamePoint = this.hasPointer && x === this.ndcX && y === this.ndcY;
      if (isDown === this.isDown || (isSamePoint && !hasMoved)) {
        // A move, or a change at the point already handed out: taken. A change ends the sample.
        hasMoved ||= !isSamePoint;
        this.ndcX = x;
        this.ndcY = y;
        this.hasPointer = true;
        this.count--;
        this.head = (i + 1) % POINTER_QUEUE_SIZE;
        if (isDown === this.isDown) continue;
        this.isDown = isDown;
        return;
      }
      // A change somewhere new, or after a move: the point now, the change in the next sample.
      this.ndcX = x;
      this.ndcY = y;
      this.hasPointer = true;
      return;
    }
  }

  /** Whether a target the seed steps aside for has `pos` within its own radius, as the picker counts it. */
  private isNearTarget(pos: Vec3): boolean {
    for (let i = 0; i < this.targets.length; i++) {
      const { target, radius, pos: at } = this.targets[i]!;
      if (!STEP_ASIDE_FOR.includes(target.kind)) continue;
      const dx = at.x - pos.x;
      const dy = at.y - pos.y;
      const dz = at.z - pos.z;
      if (dx * dx + dy * dy + dz * dz <= radius * radius) return true;
    }
    return false;
  }

  /** xr:sessionEnd: nothing of one window reaches the next. */
  private forget(): void {
    this.inSession = false;
    this.count = this.head = 0;
    this.queuedDown = this.isLastMove = this.isDown = this.hasPointer = false;
    this.lastMs = -1;
  }

  /** Queues one event: its point in NDC and the button after it. Outside the window nothing is kept. */
  private push(event: PointerEvent, isDown: boolean): void {
    if (!this.inSession || !event.isPrimary) return;
    const rect = this.element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = 1 - ((event.clientY - rect.top) / rect.height) * 2;
    const isMove = isDown === this.queuedDown;
    let i = (this.head + this.count - 1) % POINTER_QUEUE_SIZE;
    if (!(isMove && this.isLastMove && this.count > 0)) {
      // shortcut: a full queue drops the event (16 clicks between two frames); grow POINTER_QUEUE_SIZE if seen
      if (this.count === POINTER_QUEUE_SIZE) return;
      i = (this.head + this.count) % POINTER_QUEUE_SIZE;
      this.count++;
    }
    this.queueX[i] = x;
    this.queueY[i] = y;
    this.queueDown[i] = isDown ? 1 : 0;
    this.queuedDown = isDown;
    this.isLastMove = isMove;
  }

  private readonly onDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.push(event, true);
    // A drag that leaves the canvas still ends here, not on whatever is under the pointer.
    if (this.inSession && event.isPrimary) this.element.setPointerCapture(event.pointerId);
  };
  // The button as the move has it, not as the queue does: a release that never came as a pointerup (the main
  // button let go while another is held, outside the window, or dropped from a full queue) is a release here.
  private readonly onMove = (event: PointerEvent): void => this.push(event, (event.buttons & 1) === 1);
  private readonly onUp = (event: PointerEvent): void => {
    if (event.button === 0) this.push(event, false);
  };
  private readonly onCancel = (event: PointerEvent): void => this.push(event, false);
}

function copy(out: Vec3, from: Vec3): void {
  out.x = from.x;
  out.y = from.y;
  out.z = from.z;
}
