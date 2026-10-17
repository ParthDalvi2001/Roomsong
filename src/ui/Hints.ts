// The hints (LLD §3, priority 61; T-150): what the player is shown instead of words (UX §1, D-027). From
// `onboarding:step`: the palm icon over the seed supply, the looping ghost pinch (a click in the garden window) over
// one glowing cell, the hint ring with the pull or the drag icon round the newest plant, the Listen icon. From
// hands: the remove arrow on the bed rim during a drag until the first removal (UX §3.4), and the hand hint, an open
// palm in a dashed ring where a hand that held something was lost (FR-HND-15). Every element is a level that fades
// in or out once, never a blink (FR-UI-11); every icon is outlined (UX §8), and in high contrast the remove arrow
// has a cream outline round that as well (FR-UI-05, BUG-008). Hidden in Listen.
import {
  CanvasTexture,
  createSystem,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Types,
  Vector2,
  Vector3,
  type Entity,
  type Matrix4,
  type Object3D,
} from '@iwsdk/core';

import { bus, log, settings, type EventMap, type Hand } from '../core/index.js';
import { cellCentre, type Cell } from '../garden/index.js';
import { HAND_HINT_MAX_MS, HandState } from '../hands/index.js';

import {
  ATLAS_CELL_PX,
  ATLAS_GRID,
  GHOST_BOTTOM_M,
  GHOST_CLOSE_AT,
  GHOST_LOOP_MS,
  GHOST_OPEN_AT,
  GHOST_SIZE_M,
  GHOST_TOP_M,
  GUIDE_CELL,
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
  PALM_ICON_LIFT_M,
  PANEL_MAX_FRAME_MS,
  REMOVE_ARROW_AT_M,
  REMOVE_ARROW_SIZE_M,
  RING_ICON_LIFT_M,
  RING_LIFT_M,
  RING_SIZE_M,
} from './config.js';
import { clampToFov, type FovElement } from './FovGuard.js';

type Step = EventMap['onboarding:step']['step'];

/** The atlas cells, in drawing order (drawAtlas). */
const Frame = {
  PinchOpen: 0,
  PinchClosed: 1,
  Pointer: 2,
  PointerClick: 3,
  Palm: 4,
  PalmsOut: 5,
  Pull: 6,
  Drag: 7,
  Remove: 8,
  HandLost: 9,
  Ring: 10,
  RemoveOutlined: 11,
} as const;
const FRAMES = 12;

const HAND_HINT: Readonly<FovElement> = {
  distanceM: HAND_HINT_DISTANCE_M,
  halfWidthM: HAND_HINT_SIZE_M / 2,
  halfHeightM: HAND_HINT_SIZE_M / 2,
};
const GHOST_TRAVEL_M = GHOST_BOTTOM_M - GHOST_TOP_M; // negative: the loop goes down first
const handIndex = (hand: Hand): number => (hand === 'left' ? 0 : 1);

export class HintSystem extends createSystem(
  { hands: { required: [HandState] } },
  { bed: { type: Types.Object, default: null } },
) {
  /** What each element shows now, for tests: the atlas frame, or -1 while it is hidden or fading out. */
  readonly shows = { icon: -1, ring: -1, arrow: -1, hands: [-1, -1] };

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
    this.icon = this.makeMesh('hint-icon', Frame.Palm, bed);
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
    const mirror = now.dominantHand === 'left' ? -1 : 1; // FR-HND-13: the icons mirror for the dominant hand

    // The step's icon and ring. Bed-local: the icon is turned to face the head.
    const step = this.step;
    let icon = -1;
    let ring: Cell | null = null;
    let iconSize = ICON_SIZE_M;
    let iconMirror = mirror;
    if (step === 'palm' && isXr) {
      // A pointer is always palm up (LLD §11): the garden window has no hand to open.
      icon = Frame.Palm;
      const at = this.icon.position;
      at.x = at.z = 0;
      at.y = PALM_ICON_LIFT_M;
    } else if (step === 'plant') {
      ring = GUIDE_CELL;
      const phase = (this.frameMs % GHOST_LOOP_MS) / GHOST_LOOP_MS;
      const isClosed = phase >= GHOST_CLOSE_AT && phase < GHOST_OPEN_AT;
      // The garden window shows a click (FR-SYS-07); reduced motion keeps the hand still (UX §8).
      const still = !isXr || now.reducedMotion;
      icon = isXr
        ? isClosed
          ? Frame.PinchClosed
          : Frame.PinchOpen
        : isClosed
          ? Frame.PointerClick
          : Frame.Pointer;
      iconSize = GHOST_SIZE_M;
      if (!isXr) iconMirror = 1; // a pointer is not a hand
      // Positions are written field by field here and below, never through set(): a fraction handed to a call
      // that V8 does not inline is boxed, and this update is long enough to run out of inlining budget (48 bytes a
      // frame in the full suite). The height is written in each branch: a fraction merged from branches into one
      // local was boxed too (16 bytes a frame). Both measured by onboarding.heap.test.ts.
      const at = this.icon.position;
      at.x = this.guide.x;
      at.z = this.guide.y;
      if (still || isClosed) at.y = GHOST_BOTTOM_M;
      else if (phase < GHOST_CLOSE_AT) at.y = GHOST_TOP_M + GHOST_TRAVEL_M * (phase / GHOST_CLOSE_AT);
      else at.y = GHOST_TOP_M + GHOST_TRAVEL_M * ((1 - phase) / (1 - GHOST_OPEN_AT));
    } else if ((step === 'grow' || step === 'move') && this.newest !== null) {
      ring = this.newest;
      cellCentre(this.newest, this.at);
      icon = step === 'grow' ? Frame.Pull : Frame.Drag;
      const at = this.icon.position;
      at.x = this.at.x;
      at.y = RING_ICON_LIFT_M;
      at.z = this.at.y;
    } else if (step === 'listen') {
      icon = isXr ? Frame.PalmsOut : Frame.PointerClick;
      if (!isXr) iconMirror = 1;
      const at = this.icon.position;
      at.x = at.z = 0;
      at.y = LISTEN_ICON_LIFT_M;
    }
    if (!isShown) icon = -1;
    if (icon >= 0) {
      if (this.icon.geometry !== this.frames[icon]) this.icon.geometry = this.frames[icon]!;
      const scale = this.icon.scale;
      scale.x = iconSize * iconMirror;
      scale.y = scale.z = iconSize;
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
    (c) => pinch(c, false),
    (c) => pinch(c, true),
    (c) => pointer(c, false),
    (c) => pointer(c, true),
    (c) => palm(c, 64, 66, 1),
    (c) => {
      palm(c, 34, 66, 0.55);
      palm(c, 94, 66, 0.55);
    },
    (c) =>
      arrows(c, [
        [0, -1],
        [0, 1],
      ]),
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

/** A thumb and an index finger, seen from the side: apart, or tip to tip with the pinch point. */
function pinch(ctx: CanvasRenderingContext2D, isClosed: boolean): void {
  const tipY = isClosed ? 68 : 56;
  ink(ctx, 12, () => {
    ctx.moveTo(24, 22);
    ctx.quadraticCurveTo(72, 22, 90, tipY);
  });
  ink(ctx, 12, () => {
    ctx.moveTo(22, 106);
    ctx.quadraticCurveTo(64, 104, 90, isClosed ? 72 : 84);
  });
  if (isClosed) ink(ctx, 10, () => ctx.arc(96, 70, 5, 0, 2 * Math.PI));
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
