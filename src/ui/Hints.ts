// The hints (LLD §3, priority 61; T-150): what the player is shown instead of words (UX §1, D-027). From
// `onboarding:step`: in a headset the 3D ghost hand acting each step out, with a guide line from where to pinch to
// where to let go (D-087, GhostHand.ts); in the garden window a pointer's click over one glowing cell, the drag icon
// and the Listen click. The hint ring glows round the guide's cell, then round the newest plant. From
// hands: the remove arrow on the bed rim during a drag until the first removal (UX §3.4), and the hand hint, an open
// palm in a dashed ring where a hand that held something was lost (FR-HND-15). Every element is a level that fades
// in or out once, never a blink (FR-UI-11); every icon is outlined (UX §8), and in high contrast the remove arrow
// has a cream outline round that as well (FR-UI-05, BUG-008). Hidden in Listen.
import {
  CanvasTexture,
  Color,
  createSystem,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Types,
  Vector2,
  Vector3,
  type Entity,
  type Object3D,
} from '@iwsdk/core';

import { bus, log, settings, type EventMap, type Hand, type Settings } from '../core/index.js';
import { cellCentre, type Cell } from '../garden/index.js';
import { HAND_HINT_MAX_MS, HandState } from '../hands/index.js';

import {
  ATLAS_CELL_PX,
  ATLAS_GRID,
  GHOST_ACT_MS,
  GHOST_AHEAD_M,
  GHOST_BOTTOM_M,
  GHOST_CLOSE_AT,
  GHOST_LOOP_MS,
  GHOST_OPACITY,
  GHOST_OPEN_AT,
  GHOST_SIZE_M,
  GHOST_STILL_AT,
  GLOW_LOW,
  GLOW_PERIOD_MS,
  GUIDE_CELL,
  GUIDE_FLOW_MS,
  HAND_HINT_DISTANCE_M,
  HAND_HINT_FADE_IN_MS,
  HAND_HINT_LIFT_M,
  HAND_HINT_SIZE_M,
  HINT_FADE_MS,
  HINT_INK,
  HINT_OUTLINE,
  HINT_RENDER_ORDER,
  ICON_SIZE_M,
  LISTEN_ICON_LIFT_M,
  PANEL_ACCENT,
  PANEL_ACCENT_HIGH_CONTRAST,
  PANEL_MAX_FRAME_MS,
  REMOVE_ARROW_AT_M,
  REMOVE_ARROW_SIZE_M,
  RING_ICON_LIFT_M,
  RING_LIFT_M,
  RING_SIZE_M,
} from './config.js';
import { clampToFov, type FovElement } from './FovGuard.js';
import { GhostHands, GuideLine } from './GhostHand.js';

type Step = EventMap['onboarding:step']['step'];

/** The atlas cells, in drawing order (drawAtlas). */
const Frame = {
  Pointer: 0,
  PointerClick: 1,
  Drag: 2,
  Remove: 3,
  HandLost: 4,
  Ring: 5,
  RemoveOutlined: 6,
} as const;
const FRAMES = 7;

const HAND_HINT: Readonly<FovElement> = {
  distanceM: HAND_HINT_DISTANCE_M,
  halfWidthM: HAND_HINT_SIZE_M / 2,
  halfHeightM: HAND_HINT_SIZE_M / 2,
};
const ACCENT = new Color(PANEL_ACCENT);
const ACCENT_HIGH_CONTRAST = new Color(PANEL_ACCENT_HIGH_CONTRAST);

/**
 * D-084: the guide's neon glow (GLOW_*), as the colour of a material, `ms` into the pulse: the accent, from GLOW_LOW
 * of it to all of it and back once a GLOW_PERIOD_MS; steady at full with Reduce motion. Writes `out`; creates nothing.
 */
export function neon(out: Color, s: Readonly<Settings>, ms: number): void {
  const base = s.highContrast ? ACCENT_HIGH_CONTRAST : ACCENT;
  const wave = 0.5 + 0.5 * Math.cos((2 * Math.PI * (ms % GLOW_PERIOD_MS)) / GLOW_PERIOD_MS);
  const k = s.reducedMotion ? 1 : GLOW_LOW + (1 - GLOW_LOW) * wave;
  out.r = base.r * k;
  out.g = base.g * k;
  out.b = base.b * k;
}
const ORIGIN = new Vector3();
const UP = new Vector3(0, 1, 0);
/** Eased, in whole thousandths (clamped to 0..1000): slow at both ends. Integers in and out: a call boxes nothing. */
const ease = (permille: number): number => {
  const x = Math.min(1000, Math.max(0, permille)) / 1000;
  return Math.round(1000 * x * x * (3 - 2 * x));
};
const handIndex = (hand: Hand): number => (hand === 'left' ? 0 : 1);

export class HintSystem extends createSystem(
  { hands: { required: [HandState] } },
  { bed: { type: Types.Object, default: null } },
) {
  /** What each element shows now, for tests: the atlas frame, or -1 while it is hidden or fading out. */
  readonly shows = { icon: -1, ring: -1, arrow: -1, hands: [-1, -1], ghostHands: 0, line: false };

  private step: Step = 'off';
  private isListening = false;
  /** The newest plant's cell, from the latest `garden:changed`; null on an empty bed. */
  private newest: Cell | null = null;
  /** The hand dragging a plant while the remove arrow may show; null otherwise. */
  private dragHand: Hand | null = null;
  private hasRemoved = false;
  /** Per hand: the frame time its hint started, or -1 while it has none. */
  private readonly lostAtMs = [-1, -1];
  private readonly handStates: (Entity | null)[] = [null, null];
  private frameMs = 0;

  private texture!: CanvasTexture;
  private readonly frames: PlaneGeometry[] = [];
  private icon!: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private ring!: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private arrow!: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly handMeshes: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  // A Vector2, not a plain { x, y }: V8 boxes a fraction written to a plain object (ui/FovGuard.ts).
  private readonly at = new Vector2();
  private readonly wanted = new Vector3();
  private readonly bedTurn = new Quaternion();
  /** The glowing cell's centre, bed-local: it never moves. */
  private readonly guide = cellCentre(GUIDE_CELL, new Vector2());
  /** D-087: the ghost hands and the guide line, in world space; how many hands were drawn last, and the line. */
  private ghostHands!: GhostHands;
  private line!: GuideLine;
  private ghosts = 0;
  private isLined = false;
  /** The hand a seed rests on (`garden:seedOut`), as handIndex; -1 for none. */
  private seedHand = -1;
  private readonly from = new Vector3();
  private readonly to = new Vector3();
  private readonly point = new Vector3();
  private readonly wrist = new Vector3();
  private readonly forward = new Vector3();
  private readonly gaze = new Vector3();
  private readonly right = new Vector3();
  private readonly turn = new Quaternion();
  private readonly basis = new Matrix4();
  private readonly nextCell: Cell = { ring: 0, step: 0 };

  override init(): void {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_GRID * ATLAS_CELL_PX;
    canvas.height = ATLAS_GRID * ATLAS_CELL_PX;
    const ctx = canvas.getContext('2d');
    if (ctx === null) log.error('ui', 'no 2D canvas: hints cannot be drawn');
    else drawAtlas(ctx);
    this.texture = new CanvasTexture(canvas);
    this.texture.colorSpace = SRGBColorSpace;
    for (let i = 0; i < FRAMES; i++) this.frames.push(frameGeometry(i));

    const bed = this.config.bed.value as Object3D;
    this.icon = this.makeMesh('hint-icon', Frame.Pointer, bed);
    this.ring = this.makeMesh('hint-ring', Frame.Ring, bed);
    this.ring.rotation.x = -Math.PI / 2; // flat on the bed
    this.ring.scale.setScalar(RING_SIZE_M);
    this.arrow = this.makeMesh('hint-remove', Frame.Remove, bed);
    this.arrow.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 2; i++) {
      const mesh = this.makeMesh('hint-hand', Frame.HandLost, this.scene);
      mesh.scale.setScalar(HAND_HINT_SIZE_M);
      this.handMeshes.push(mesh);
    }
    this.ghostHands = new GhostHands(this.scene);
    this.line = new GuideLine(this.scene);

    const { hands } = this.queries;
    this.cleanupFuncs.push(
      hands.subscribe(
        'qualify',
        (entity) => void (this.handStates[handIndex(entity.getValue(HandState, 'hand') as Hand)] = entity),
        true,
      ),
      hands.subscribe('disqualify', (entity) => {
        const i = this.handStates.indexOf(entity);
        if (i >= 0) this.handStates[i] = null;
      }),
      bus.on('onboarding:step', ({ step }) => void (this.step = step)),
      bus.on('garden:changed', ({ state }) => {
        this.newest = state.plants[state.plants.length - 1]?.cell ?? null;
      }),
      bus.on('garden:seedOut', ({ hand }) => void (this.seedHand = handIndex(hand))),
      bus.on('garden:seedBack', () => void (this.seedHand = -1)),
      bus.on('garden:removed', () => {
        this.hasRemoved = true; // UX §3.4: shown until the first removal
        this.dragHand = null;
      }),
      bus.on('gesture:drag', ({ hand }) => {
        if (!this.hasRemoved) this.dragHand = hand;
      }),
      bus.on('gesture:release', ({ hand }) => this.endDrag(hand)),
      bus.on('gesture:trackingLost', ({ hand }) => this.endDrag(hand)),
      // D-030: a hint only for a hand that held something; it goes when the hand is back, at most 5 s later.
      bus.on('hands:lost', ({ hand, held }) => {
        if (held !== null) this.lostAtMs[handIndex(hand)] = this.frameMs;
      }),
      bus.on('hands:found', ({ hand }) => void (this.lostAtMs[handIndex(hand)] = -1)),
      bus.on('listen:enter', () => void (this.isListening = true)),
      bus.on('listen:exit', () => void (this.isListening = false)),
      bus.on('xr:sessionEnd', () => {
        this.isListening = false;
        this.dragHand = null;
        this.lostAtMs[0] = -1;
        this.lostAtMs[1] = -1;
      }),
      () => {
        for (const mesh of [this.icon, this.ring, this.arrow, ...this.handMeshes]) {
          mesh.removeFromParent();
          mesh.material.dispose();
        }
        for (const geometry of this.frames) geometry.dispose();
        this.texture.dispose();
        this.ghostHands.dispose();
        this.line.dispose();
      },
    );
  }

  override update(delta: number, time: number): void {
    this.frameMs = Math.round(time * 1000);
    // Whole ms, at most PANEL_MAX_FRAME_MS (a pause must not jump a fade): a fraction handed to fade() is boxed by V8.
    const dtMs = Math.round(Math.min(PANEL_MAX_FRAME_MS, delta * 1000));
    const isXr = this.xrManager.isPresenting;
    const head = isXr ? this.player.head.matrixWorld : this.camera.matrixWorld;
    const now = settings.get();
    const isShown = now.hintsEnabled && !this.isListening;

    // The step's ring, and in the garden window its icon, a pointer's (bed-local, turned to face the head). In a
    // headset the ghost hand acts the step out instead (D-087).
    const step = this.step;
    let icon = -1;
    let ring: Cell | null = null;
    let iconSize = ICON_SIZE_M;
    if (step === 'plant') {
      ring = GUIDE_CELL;
      const phase = (this.frameMs % GHOST_LOOP_MS) / GHOST_LOOP_MS;
      icon = phase >= GHOST_CLOSE_AT && phase < GHOST_OPEN_AT ? Frame.PointerClick : Frame.Pointer;
      iconSize = GHOST_SIZE_M;
      // Positions are written field by field here and below, never through set(): a fraction handed to a call
      // that V8 does not inline is boxed, and this update is long enough to run out of inlining budget (48 bytes a
      // frame in the full suite). Measured by onboarding.heap.test.ts.
      const at = this.icon.position;
      at.x = this.guide.x;
      at.y = GHOST_BOTTOM_M;
      at.z = this.guide.y;
    } else if ((step === 'grow' || step === 'move') && this.newest !== null) {
      ring = this.newest;
      cellCentre(this.newest, this.at);
      icon = Frame.Drag; // the garden window has the move step only: a pointer cannot pull (LLD §11)
      const at = this.icon.position;
      at.x = this.at.x;
      at.y = RING_ICON_LIFT_M;
      at.z = this.at.y;
    } else if (step === 'listen') {
      icon = Frame.PointerClick;
      const at = this.icon.position;
      at.x = at.z = 0;
      at.y = LISTEN_ICON_LIFT_M;
    }
    // D-087: in a headset the ghost hand acts the step out, with its guide line, instead of the icon
    const acts = isXr && isShown ? this.actOut(step, head, now) : 0;
    if (!isShown || isXr) icon = -1;
    this.drawGhost(acts, dtMs, now);
    if (icon >= 0) {
      if (this.icon.geometry !== this.frames[icon]) this.icon.geometry = this.frames[icon]!;
      this.icon.scale.setScalar(iconSize);
      // Local turn = the bed's turn undone, then the head's: the quad faces the eyes wherever the bed points.
      const bed = this.icon.parent;
      if (bed !== null) this.bedTurn.setFromRotationMatrix(bed.matrixWorld).invert();
      this.icon.quaternion.setFromRotationMatrix(head).premultiply(this.bedTurn);
    }
    this.shows.icon = icon;
    fade(this.icon, icon >= 0, dtMs, HINT_FADE_MS);

    const isRing = isShown && ring !== null;
    if (isRing) {
      cellCentre(ring!, this.at);
      const at = this.ring.position;
      at.x = this.at.x;
      at.y = RING_LIFT_M;
      at.z = this.at.y;
      neon(this.ring.material.color, now, this.frameMs); // D-084: the cream ring, tinted to the glowing accent
    }
    this.shows.ring = isRing ? Frame.Ring : -1;
    fade(this.ring, isRing, dtMs, HINT_FADE_MS);

    // The remove arrow: sideways on the dragging hand's side, pointing away from the bed (UX §3.4).
    const isArrow = isShown && this.dragHand !== null;
    if (isArrow) {
      const side = this.dragHand === 'left' ? -1 : 1;
      const at = this.arrow.position;
      at.x = side * REMOVE_ARROW_AT_M;
      at.y = RING_LIFT_M;
      at.z = 0;
      const scale = this.arrow.scale;
      scale.x = side * REMOVE_ARROW_SIZE_M;
      scale.y = scale.z = REMOVE_ARROW_SIZE_M;
    }
    // FR-UI-05: in high contrast the arrow drawn with a cream outline; one quad either way, no draw call more.
    const arrowFrame = now.highContrast ? Frame.RemoveOutlined : Frame.Remove;
    this.arrow.geometry = this.frames[arrowFrame]!;
    this.shows.arrow = isArrow ? arrowFrame : -1;
    fade(this.arrow, isArrow, dtMs, HINT_FADE_MS);

    for (let i = 0; i < 2; i++) this.updateHand(i, head, dtMs);
  }

  /**
   * D-087: poses the ghost hands for `step` (and the guide line, `isLined`) and says how many it drew: 0 for a step
   * with no act. Each act loops once a GHOST_ACT_MS; with Reduce motion it holds still. Creates nothing: whole
   * thousandths of the act are handed on, never a fraction (a fraction handed to a call is boxed, see update()), and
   * each act is its own small method, which V8 optimises soon (one long one stayed slow and boxed, 12 Nov).
   */
  private actOut(step: Step, head: Matrix4, s: Readonly<Settings>): number {
    const bed = this.icon.parent;
    this.isLined = false;
    if (bed === null) return 0;
    const isLeft = s.dominantHand === 'left';
    const act = s.reducedMotion
      ? GHOST_STILL_AT
      : Math.floor((1000 * (this.frameMs % GHOST_ACT_MS)) / GHOST_ACT_MS);
    // The head's forward on the level, its right, and the eyes: `wrist` holds them until an act places a wrist
    const e = head.elements;
    const forward = this.forward;
    forward.x = -e[8];
    forward.y = 0;
    forward.z = -e[10];
    forward.normalize();
    this.right.crossVectors(forward, UP);
    const gaze = this.gaze; // the head's own forward: the acts in the air stand on it, inside the FoV box (FR-UI-03)
    gaze.x = -e[8];
    gaze.y = -e[9];
    gaze.z = -e[10];
    const eyes = this.wrist;
    eyes.x = e[12];
    eyes.y = e[13];
    eyes.z = e[14];
    if (step === 'palm') return this.actPalm(act, isLeft);
    if (step === 'plant') return this.actPlant(act, isLeft, bed, s);
    if ((step === 'grow' || step === 'move') && this.newest !== null)
      return this.actShape(act, isLeft, step === 'grow', bed, s);
    if (step === 'listen') return this.actListen(act, s);
    if (step === 'orb' && !s.oneHand && !s.gazeDwell) return this.actOrb(act, isLeft, s);
    return 0;
  }

  /** Where the gaze looks, a little low, on the main hand's side: a hand turning palm up. Positions field by field. */
  private actPalm(act: number, isLeft: boolean): number {
    const { from, gaze, right, wrist: eyes } = this;
    const side = isLeft ? -1 : 1;
    from.x = eyes.x + GHOST_AHEAD_M * gaze.x + 0.06 * side * right.x;
    from.y = eyes.y + GHOST_AHEAD_M * gaze.y - 0.05;
    from.z = eyes.z + GHOST_AHEAD_M * gaze.z + 0.06 * side * right.z;
    const turned = ease(Math.round((act * 20) / 9)); // over the first 45 % of the act
    this.aim(0.26, isLeft ? 0 - turned : turned); // the back turns out, the thumb up (0 - x: never a boxed -0)
    this.ghostHands.pose(0, 0, isLeft, from, this.turn);
    return 1;
  }

  /** From the seed on the hand that holds it (or above the cell) to the glowing cell: pinch, carry, let go. */
  private actPlant(act: number, isLeft: boolean, bed: Object3D, s: Readonly<Settings>): number {
    const state = this.seedHand >= 0 ? this.handStates[this.seedHand] : null;
    if (state && state.getValue(HandState, 'tracked') === true) {
      const palm = state.getVectorView(HandState, 'palmPos');
      this.from.x = palm[0]!;
      this.from.y = palm[1]! + 0.035; // the seed rests on the palm
      this.from.z = palm[2]!;
    } else this.cellAt(GUIDE_CELL, 0.15, bed, this.from);
    this.cellAt(GUIDE_CELL, 0.02, bed, this.to);
    return this.carry(act, isLeft, 60, s);
  }

  /** The newest plant: pinched and lifted (grow), or slid two cells along its ring (move). */
  private actShape(
    act: number,
    isLeft: boolean,
    isGrow: boolean,
    bed: Object3D,
    s: Readonly<Settings>,
  ): number {
    const newest = this.newest!;
    this.cellAt(newest, 0.05, bed, this.from);
    if (isGrow) {
      this.to.copy(this.from);
      this.to.y += 0.1;
      return this.carry(act, isLeft, 0, s);
    }
    // shortcut: the act slides to two cells on whether that cell is free or not; it shows the gesture, not a spot
    this.nextCell.ring = newest.ring;
    this.nextCell.step = (newest.step + 2) % 16;
    this.cellAt(this.nextCell, 0.05, bed, this.to);
    return this.carry(act, isLeft, 30, s);
  }

  /** Both palms out towards the garden where the gaze looks, a little push forward. */
  private actListen(act: number, s: Readonly<Settings>): number {
    const { from, forward, gaze, right, wrist: eyes } = this;
    const push = s.reducedMotion ? 0 : 0.025 * (0.5 - 0.5 * Math.cos((2 * Math.PI * act) / 1000));
    this.basis.lookAt(ORIGIN, UP, this.point.copy(forward).negate()); // fingers up, the palms facing ahead
    this.turn.setFromRotationMatrix(this.basis);
    for (let h = 0; h < 2; h++) {
      const out = h === 0 ? -0.1 : 0.1;
      from.x = eyes.x + GHOST_AHEAD_M * gaze.x + push * forward.x + out * right.x;
      from.y = eyes.y + GHOST_AHEAD_M * gaze.y - 0.08; // the wrists low: the open hands stand up into the view
      from.z = eyes.z + GHOST_AHEAD_M * gaze.z + push * forward.z + out * right.z;
      this.ghostHands.pose(h, 0, h === 0, from, this.turn);
    }
    return 2;
  }

  /** The other hand turns palm down, where the orb rides its back; the main hand comes and pinches it there. */
  private actOrb(act: number, isLeft: boolean, s: Readonly<Settings>): number {
    const { from, gaze, right, wrist: eyes } = this;
    const side = isLeft ? -1 : 1;
    from.x = eyes.x + GHOST_AHEAD_M * gaze.x - 0.08 * side * right.x;
    from.y = eyes.y + GHOST_AHEAD_M * gaze.y - 0.05;
    from.z = eyes.z + GHOST_AHEAD_M * gaze.z - 0.08 * side * right.z;
    const turned = ease(Math.round(act * 2.5)); // palm up to palm down over the first 40 %, that hand's own way
    this.aim(0.26, isLeft ? 1000 - turned : turned - 1000);
    this.ghostHands.pose(1, 0, !isLeft, from, this.turn);
    this.to.set(0, 0.03, -0.05).applyQuaternion(this.turn).add(from); // over the back of that hand
    from.x = this.to.x + 0.1 * side * right.x;
    from.y = this.to.y + 0.05;
    from.z = this.to.z + 0.1 * side * right.z;
    this.line.set(from, this.to, 20);
    this.isLined = true;
    this.line.draw(this.flow(s));
    this.line.at(act < 400 ? 0 : ease(Math.round((act - 400) / 0.35)), this.point);
    this.place(this.point, isLeft);
    this.ghostHands.pose(0, act < 750 ? 0 : Math.min(1000, 10 * (act - 750)), isLeft, this.wrist, this.turn);
    return 2;
  }

  /**
   * The main ghost hand pinches at `from`, carries along the guide line to `to`, lets go there; `act` thousandths
   * into its act. Creates nothing.
   */
  private carry(act: number, isLeft: boolean, liftMm: number, s: Readonly<Settings>): number {
    const line = this.line;
    line.set(this.from, this.to, liftMm);
    line.draw(this.flow(s));
    this.isLined = true;
    line.at(act < 200 ? 0 : ease(2 * (act - 200)), this.point);
    const pinch =
      act < 200 ? 5 * act : act < 750 ? 1000 : act < 900 ? Math.round((1000 * (900 - act)) / 150) : 0;
    this.place(this.point, isLeft);
    this.ghostHands.pose(0, pinch, isLeft, this.wrist, this.turn);
    return 1;
  }

  /**
   * `turn`: fingers ahead and `down` (sine of the tilt) below the level, the back of the hand up, rolled `roll`
   * thousandths of a half turn about the fingers (+ towards the right; 1000 or -1000: palm up). Creates nothing.
   */
  private aim(down: number, roll = 0): void {
    const level = Math.sqrt(1 - down * down);
    const ahead = this.point;
    ahead.x = this.forward.x * level;
    ahead.y = -down;
    ahead.z = this.forward.z * level;
    // The back of the hand, rolled: up turned towards the right about the fingers (lookAt keeps it square to them)
    const angle = (Math.PI * roll) / 1000;
    const c = Math.cos(angle);
    const k = Math.sin(angle);
    const back = this.to;
    back.x = this.right.x * k;
    back.y = c;
    back.z = this.right.z * k;
    this.turn.setFromRotationMatrix(this.basis.lookAt(ORIGIN, ahead, back));
  }

  /** `wrist`: where a main ghost hand, aimed down at the bed, has its wrist to pinch at `at`. */
  private place(at: Vector3, isLeft: boolean): void {
    this.wrist.copy(at); // aim() writes `point` and `to`; `at` is one of them
    this.aim(0.57);
    this.wrist.sub(this.from.copy(this.ghostHands.pinchAt[isLeft ? 1 : 0]).applyQuaternion(this.turn));
  }

  /** The guide line's dots, thousandths of a gap on: still with Reduce motion. */
  private flow(s: Readonly<Settings>): number {
    return s.reducedMotion ? 0 : Math.floor((1000 * (this.frameMs % GUIDE_FLOW_MS)) / GUIDE_FLOW_MS);
  }

  /** A cell's centre `lift` above the bed, in world space, into `out`. */
  private cellAt(cell: Cell, lift: number, bed: Object3D, out: Vector3): Vector3 {
    cellCentre(cell, this.at);
    out.x = this.at.x;
    out.y = lift;
    out.z = this.at.y;
    return out.applyMatrix4(bed.matrixWorld);
  }

  /** The ghost and its line in the guide's neon, fading in and out like the icons (HINT_FADE_MS). */
  private drawGhost(hands: number, dtMs: number, s: Readonly<Settings>): void {
    if (hands > 0) this.ghosts = hands;
    const ghost = this.ghostHands.material;
    neon(ghost.color, s, this.frameMs);
    this.line.material.color.copy(ghost.color);
    const isGhost = fadeTo(ghost, hands > 0, dtMs, GHOST_OPACITY);
    this.ghostHands.show(isGhost ? this.ghosts : 0);
    this.line.show(fadeTo(this.line.material, hands > 0 && this.isLined, dtMs, 1));
    this.shows.ghostHands = hands;
    this.shows.line = hands > 0 && this.isLined;
  }

  private updateHand(i: number, head: Matrix4, dtMs: number): void {
    const mesh = this.handMeshes[i]!;
    const since = this.lostAtMs[i]!;
    if (since >= 0 && this.frameMs - since >= HAND_HINT_MAX_MS) this.lostAtMs[i] = -1;
    const state = this.handStates[i] ?? null;
    const isOn = this.lostAtMs[i]! >= 0 && state !== null;
    if (isOn) {
      const palm = state.getVectorView(HandState, 'palmPos');
      const wanted = this.wanted;
      wanted.x = palm[0]!;
      wanted.y = palm[1]! + HAND_HINT_LIFT_M;
      wanted.z = palm[2]!;
      clampToFov(head.elements, this.wanted, HAND_HINT, mesh.position);
      mesh.quaternion.setFromRotationMatrix(head);
    }
    this.shows.hands[i] = isOn ? Frame.HandLost : -1;
    fade(mesh, isOn, dtMs, isOn ? HAND_HINT_FADE_IN_MS : HINT_FADE_MS);
  }

  private endDrag(hand: Hand): void {
    if (this.dragHand === hand) this.dragHand = null;
  }

  private makeMesh(name: string, frame: number, parent: Object3D): Mesh<PlaneGeometry, MeshBasicMaterial> {
    const mesh = new Mesh(
      this.frames[frame],
      new MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    mesh.name = name;
    mesh.visible = false;
    mesh.renderOrder = HINT_RENDER_ORDER;
    parent.add(mesh);
    return mesh;
  }
}

/** Opacity towards 1 or 0 over `ms`; hidden at 0, so a hint that shows nothing draws nothing. */
function fade(mesh: Mesh<PlaneGeometry, MeshBasicMaterial>, on: boolean, dtMs: number, ms: number): void {
  const material = mesh.material;
  const to = on ? 1 : 0;
  if (material.opacity === to) {
    mesh.visible = on;
    return;
  }
  const step = dtMs / ms;
  material.opacity = on ? Math.min(1, material.opacity + step) : Math.max(0, material.opacity - step);
  mesh.visible = material.opacity > 0;
}

/** A material's opacity towards `max` or 0 over HINT_FADE_MS; whether it shows at all. */
function fadeTo(material: MeshBasicMaterial, on: boolean, dtMs: number, max: number): boolean {
  const step = (dtMs / HINT_FADE_MS) * max;
  material.opacity = on ? Math.min(max, material.opacity + step) : Math.max(0, material.opacity - step);
  return material.opacity > 0;
}

/** A unit quad showing atlas cell `frame` (row by row from the top; the texture is flipped, so v = 1 is the top). */
function frameGeometry(frame: number): PlaneGeometry {
  const geometry = new PlaneGeometry(1, 1);
  const u0 = (frame % ATLAS_GRID) / ATLAS_GRID;
  const u1 = u0 + 1 / ATLAS_GRID;
  const v1 = 1 - Math.floor(frame / ATLAS_GRID) / ATLAS_GRID;
  const v0 = v1 - 1 / ATLAS_GRID;
  geometry.setAttribute('uv', new Float32BufferAttribute([u0, v1, u1, v1, u0, v0, u1, v0], 2));
  return geometry;
}

// The icons, drawn once into a 128 px cell each: cream strokes over a wider charcoal outline. Procedural, original
// (Golden Rule 8): no font glyph, no image file.
const C = ATLAS_CELL_PX;

function drawAtlas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, ATLAS_GRID * C, ATLAS_GRID * C);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const draw: ((ctx: CanvasRenderingContext2D) => void)[] = [
    (c) => pointer(c, false),
    (c) => pointer(c, true),
    (c) =>
      arrows(c, [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ]),
    (c) => arrows(c, [[1, 0]], true),
    (c) => {
      c.setLineDash([12, 10]);
      ink(c, 8, () => c.arc(64, 64, 52, 0, 2 * Math.PI));
      c.setLineDash([]);
      palm(c, 64, 68, 0.6);
    },
    (c) => {
      c.globalAlpha = 0.35; // the glow, under the line
      ink(c, 24, () => c.arc(64, 64, 50, 0, 2 * Math.PI), false);
      c.globalAlpha = 1;
      ink(c, 8, () => c.arc(64, 64, 50, 0, 2 * Math.PI));
    },
    (c) => arrows(c, [[1, 0]], true, true),
  ];
  draw.forEach((icon, frame) => {
    ctx.save();
    ctx.translate((frame % ATLAS_GRID) * C, Math.floor(frame / ATLAS_GRID) * C);
    icon(ctx);
    ctx.restore();
  });
}

/**
 * One path, stroked in cream `width` wide over a charcoal outline 6 px wider (none when `outline` is false), and
 * with `rim` over a cream outline 6 px wider again (high contrast, FR-UI-05).
 */
function ink(
  ctx: CanvasRenderingContext2D,
  width: number,
  path: () => void,
  outline = true,
  rim = false,
): void {
  ctx.beginPath();
  path();
  if (rim) {
    ctx.lineWidth = width + 12;
    ctx.strokeStyle = HINT_INK;
    ctx.stroke();
  }
  if (outline) {
    ctx.lineWidth = width + 6;
    ctx.strokeStyle = HINT_OUTLINE;
    ctx.stroke();
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = HINT_INK;
  ctx.stroke();
}

/** A mouse pointer; with a ring round its tip for the click. */
function pointer(ctx: CanvasRenderingContext2D, isClick: boolean): void {
  ctx.beginPath();
  ctx.moveTo(48, 40);
  ctx.lineTo(48, 104);
  ctx.lineTo(63, 90);
  ctx.lineTo(74, 114);
  ctx.lineTo(86, 108);
  ctx.lineTo(75, 85);
  ctx.lineTo(95, 85);
  ctx.closePath();
  ctx.lineWidth = 8;
  ctx.strokeStyle = HINT_OUTLINE;
  ctx.stroke();
  ctx.fillStyle = HINT_INK;
  ctx.fill();
  if (isClick) ink(ctx, 6, () => ctx.arc(48, 40, 24, 0, 2 * Math.PI));
}

/** An open hand, palm towards the viewer, centred at (x, y), `scale` of a cell. */
function palm(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ink(ctx, 14, () => {
    for (const [fx, top] of [
      [-21, -50],
      [-7, -58],
      [7, -56],
      [21, -46],
    ] as const) {
      ctx.moveTo(fx, -10);
      ctx.lineTo(fx, top);
    }
    ctx.moveTo(-26, 14);
    ctx.lineTo(-44, -10); // the thumb
  });
  ink(ctx, 8, () => ctx.roundRect(-28, -14, 56, 50, 16));
  ctx.restore();
}

/**
 * Arrows from the centre of the cell, one per direction (x right, y down); `long` for the one remove arrow, `rim`
 * for its high-contrast outline.
 */
function arrows(
  ctx: CanvasRenderingContext2D,
  directions: readonly (readonly [number, number])[],
  long = false,
  rim = false,
): void {
  const reach = long ? 50 : 44;
  ink(
    ctx,
    10,
    () => {
      for (const [dx, dy] of directions) {
        const tipX = 64 + dx * reach;
        const tipY = 64 + dy * reach;
        ctx.moveTo(long ? 64 - dx * reach : 64, long ? 64 - dy * reach : 64);
        ctx.lineTo(tipX, tipY);
        // the head: two strokes back from the tip, at 45 degrees
        ctx.moveTo(tipX - dx * 16 - dy * 16, tipY - dy * 16 + dx * 16);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(tipX - dx * 16 + dy * 16, tipY - dy * 16 - dx * 16);
      }
    },
    true,
    rim,
  );
}
