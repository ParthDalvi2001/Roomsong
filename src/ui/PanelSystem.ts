// The settings panel in the scene (UX §3.6, T-151): one quad with the open tab drawn on a canvas, the way a caption
// is drawn (the system font: no font file and no UIKit), the orb that opens it, and one Interactable per control, so
// hands/ picks a control like any other target (LLD §3). The rules are in ui/Panel.ts; this file draws, places and
// listens.
import {
  CanvasTexture,
  Color,
  createSystem,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  Types,
  Vector3,
  type Entity,
  type Matrix4,
  type MeshBasicMaterialParameters,
} from '@iwsdk/core';

import { Interactable } from '../core/components.js';
import { bus, log, settings } from '../core/index.js';
import { HandState, HIT_RADIUS_M } from '../hands/index.js';
import { kindSwatch } from '../render/index.js';

import {
  CAPTION_BACKDROP,
  CAPTION_BACKDROP_HIGH_CONTRAST,
  CAPTION_TEXT_COLOUR,
  CUE_FILL_COLOUR,
  CUE_RING_INNER_M,
  CUE_RING_OUTER_M,
  CUE_SEGMENTS,
  GLOW_GROW,
  GLOW_PERIOD_MS,
  ORB_CANVAS_PX,
  ORB_DIAMETER_M,
  PANEL_ACCENT,
  PANEL_ACCENT_HIGH_CONTRAST,
  PANEL_BOLD_FONT,
  PANEL_DANGER,
  PANEL_DANGER_HIGH_CONTRAST,
  PANEL_DESCRIBE_ALPHA,
  PANEL_DIM_ALPHA,
  PANEL_DIM_ALPHA_HIGH_CONTRAST,
  PANEL_DISTANCE_M,
  PANEL_FONT,
  PANEL_HEIGHT_M,
  PANEL_INK,
  PANEL_OUTLINE_HIGH_CONTRAST_PX,
  PANEL_OUTLINE_PX,
  PANEL_PX_PER_M,
  PANEL_RENDER_ORDER,
  PANEL_RULE_ALPHA,
  PANEL_SYMBOL_FONT,
  PANEL_TARGET_FILL,
  PANEL_TARGET_M,
  PANEL_WIDE_TARGET_M,
  PANEL_WIDTH_M,
  SKIP_REST_OPACITY,
} from './config.js';
import { clampToFov, fovBoundsDeg, type FovBounds, type FovElement } from './FovGuard.js';
import { neon } from './Hints.js';
import {
  ArrayVec3,
  EDGE_X,
  gazeTarget,
  hasPose,
  isHeadTurning,
  NEW_GARDEN_ID,
  ORB_ELEMENT,
  ORB_ID,
  orbHome,
  orbOnHand,
  Panel,
  PANEL_ELEMENT,
  placePanel,
  RULE_Y,
  SEEDS_ID,
  SKIP_AT_X,
  SKIP_AT_Y,
  SKIP_ELEMENT,
  SKIP_ID,
  skipHome,
  type Palm,
  type PanelControl,
  type PanelText,
} from './Panel.js';
import { PANEL } from './strings.js';

import type { EventMap, Hand, Mat4, Settings } from '../core/index.js';
import type { SeedKind } from '../garden/index.js';
import type { TargetRef } from '../hands/index.js';

const W = Math.round(PANEL_WIDTH_M * PANEL_PX_PER_M);
const H = Math.round(PANEL_HEIGHT_M * PANEL_PX_PER_M);
const TARGET_PX = PANEL_TARGET_M * PANEL_PX_PER_M;
/** A slot per target: the orb first, then the controls on show, then "Skip guide". No tab has more than 14 controls. */
const MAX_CONTROLS = 16;
const SKIP = 1 + MAX_CONTROLS;
const SLOTS = SKIP + 1;
const CREAM = new Color(CAPTION_TEXT_COLOUR);
/** The panel's centre as the FoV guard sees it, for the look-away check. */
const PANEL_CENTRE: Readonly<FovElement> = { distanceM: PANEL_DISTANCE_M, halfWidthM: 0, halfHeightM: 0 };
/** Indices of one of the fill ring's steps: two triangles. */
const INDICES_PER_SEGMENT = 6;
// The orb's sign, three sliders, in canvas pixels from its centre: where each line is, and where its knob sits on it.
const SLIDER_Y_PX = [-24, 0, 24] as const;
const SLIDER_KNOB_X_PX = [-12, 14, -2] as const;
const SLIDER_HALF_PX = 30;
const SLIDER_KNOB_PX = 9;
const SLIDER_LINE_PX = 6;
/** A switch's knob, in canvas pixels: inside its pill's end with 14 px to spare. */
const KNOB_PX = TARGET_PX / 2 - 14;

/** Canvas pixels of a point of the panel's plane (metres from its centre, y up). */
const px = (x: number): number => W / 2 + x * PANEL_PX_PER_M;
const py = (y: number): number => H / 2 - y * PANEL_PX_PER_M;

/** The path of a pill `w` canvas pixels wide round (x, y): the targets' height and corner radius, as everywhere. */
function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - TARGET_PX / 2, w, TARGET_PX, TARGET_PX / 2);
}

/**
 * One control, by its look (10 Nov). A segment or a stepper's button lies on its group's track: the chosen segment is
 * filled with the accent and written bold in charcoal. A switch is a pill whose knob sits right and fills with the
 * accent when on, left and faint when off, its word on the other half. Seeds is the primary button (filled), New
 * garden the destructive one (a red outline); the rest are outlined pills, a seed swatch filled with its colour.
 */
function drawControl(ctx: CanvasRenderingContext2D, control: PanelControl, highContrast: boolean): void {
  const w = control.w * PANEL_PX_PER_M;
  const x = px(control.x);
  const y = py(control.y);
  const accent = highContrast ? PANEL_ACCENT_HIGH_CONTRAST : PANEL_ACCENT;
  const filled = control.on || control.look === 'primary';
  let textX = x;
  let textW = w - TARGET_PX / 4;
  ctx.globalAlpha = control.dim ? (highContrast ? PANEL_DIM_ALPHA_HIGH_CONTRAST : PANEL_DIM_ALPHA) : 1;
  pill(ctx, x, y, w);
  if (control.look === 'segment' || control.look === 'step') {
    // on the track: a stepper's button is a faint disc, the chosen segment is filled
    ctx.fillStyle = control.on ? accent : PANEL_TARGET_FILL;
    if (control.on || control.look === 'step') ctx.fill();
    if (highContrast) ctx.stroke(); // FR-UI-05: in high contrast every target shows its edge (T-168 review)
  } else if (control.look === 'danger') {
    const stroke = ctx.strokeStyle;
    ctx.strokeStyle = highContrast ? PANEL_DANGER_HIGH_CONTRAST : PANEL_DANGER;
    ctx.stroke();
    ctx.strokeStyle = stroke;
  } else {
    ctx.fillStyle = control.fill ?? (filled ? accent : PANEL_TARGET_FILL);
    ctx.fill();
    ctx.stroke(); // every target has an outline; high contrast makes it heavier (FR-UI-05)
    if (control.fill !== undefined && control.on) {
      // T-193: a picked swatch keeps its colour and is lit by a heavier outline
      const width = ctx.lineWidth;
      ctx.lineWidth = 3 * width;
      ctx.stroke();
      ctx.lineWidth = width;
    }
  }
  if (control.look === 'switch') {
    const side = (control.on ? 1 : -1) * ((w - TARGET_PX) / 2);
    ctx.beginPath();
    ctx.arc(x + side, y, KNOB_PX, 0, 2 * Math.PI);
    ctx.fillStyle = control.on ? PANEL_INK : CAPTION_TEXT_COLOUR;
    ctx.fill();
    textX = x - side;
    textW = TARGET_PX - TARGET_PX / 4;
  }
  ctx.fillStyle = filled ? PANEL_INK : CAPTION_TEXT_COLOUR;
  ctx.font = control.text.length === 1 ? PANEL_SYMBOL_FONT : filled ? PANEL_BOLD_FONT : PANEL_FONT;
  ctx.fillText(control.text, textX, y, textW);
}

/**
 * Draws the panel on its canvas: the backdrop, the rule under the header, the track of each stepper and segmented
 * control, each control with its word or sign, each label and read-out (UX §3.6). High contrast is cream on opaque
 * black with heavier outlines, a frame and its own accent (FR-UI-05). Once per change, not per frame.
 */
export function drawPanel(
  ctx: CanvasRenderingContext2D,
  controls: readonly PanelControl[],
  texts: readonly PanelText[],
  highContrast: boolean,
): void {
  const outline = highContrast ? PANEL_OUTLINE_HIGH_CONTRAST_PX : PANEL_OUTLINE_PX;
  const dimAlpha = highContrast ? PANEL_DIM_ALPHA_HIGH_CONTRAST : PANEL_DIM_ALPHA;
  ctx.clearRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.lineWidth = outline;
  ctx.strokeStyle = CAPTION_TEXT_COLOUR;
  ctx.textBaseline = 'middle';
  ctx.beginPath();
  // The frame is drawn half inside and half outside this path, so the path keeps clear of the canvas edge.
  ctx.roundRect(outline, outline, W - 2 * outline, H - 2 * outline, TARGET_PX / 2);
  ctx.fillStyle = highContrast ? CAPTION_BACKDROP_HIGH_CONTRAST : CAPTION_BACKDROP;
  ctx.fill();
  if (highContrast) ctx.stroke();
  ctx.globalAlpha = highContrast ? 1 : PANEL_RULE_ALPHA;
  ctx.fillStyle = CAPTION_TEXT_COLOUR;
  ctx.fillRect(px(-EDGE_X), py(RULE_Y) - outline / 2, 2 * EDGE_X * PANEL_PX_PER_M, outline);

  ctx.globalAlpha = 1;
  const group = (control: PanelControl | undefined): string =>
    control?.look === 'segment' || control?.look === 'step'
      ? control.id.slice(0, control.id.indexOf(':'))
      : '';
  for (let i = 0; i < controls.length; i++) {
    const first = controls[i] as PanelControl;
    const name = group(first);
    if (name === '') continue;
    while (group(controls[i + 1]) === name) i++;
    const last = controls[i] as PanelControl;
    const left = px(first.x - first.w / 2);
    const right = px(last.x + last.w / 2);
    pill(ctx, (left + right) / 2, py(first.y), right - left);
    ctx.fillStyle = PANEL_TARGET_FILL;
    ctx.fill();
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  for (const control of controls) drawControl(ctx, control, highContrast);
  ctx.fillStyle = CAPTION_TEXT_COLOUR;
  for (const text of texts) {
    ctx.globalAlpha = text.dim ? dimAlpha : text.note === true && !highContrast ? PANEL_DESCRIBE_ALPHA : 1;
    ctx.textAlign = text.value === true ? 'center' : 'left';
    ctx.font = text.value === true ? PANEL_BOLD_FONT : PANEL_FONT;
    const x = text.value === true ? text.x + text.w / 2 : text.x;
    ctx.fillText(text.text, px(x), py(text.y), text.w * PANEL_PX_PER_M);
  }
  ctx.globalAlpha = 1;
}

/**
 * Draws the settings orb: a dark disc with a cream rim, so it reads against any room, and three sliders as its
 * sign (UX §2). Our own drawing: no icon file (Golden Rule 8).
 */
export function drawOrb(ctx: CanvasRenderingContext2D, highContrast: boolean): void {
  const outline = 2 * (highContrast ? PANEL_OUTLINE_HIGH_CONTRAST_PX : PANEL_OUTLINE_PX);
  const centre = ORB_CANVAS_PX / 2;
  ctx.clearRect(0, 0, ORB_CANVAS_PX, ORB_CANVAS_PX);
  ctx.strokeStyle = CAPTION_TEXT_COLOUR;
  ctx.lineCap = 'round';
  ctx.lineWidth = outline;
  ctx.beginPath();
  ctx.arc(centre, centre, centre - outline, 0, 2 * Math.PI);
  ctx.fillStyle = highContrast ? CAPTION_BACKDROP_HIGH_CONTRAST : CAPTION_BACKDROP;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = CAPTION_TEXT_COLOUR;
  ctx.lineWidth = SLIDER_LINE_PX;
  SLIDER_Y_PX.forEach((y, i) => {
    ctx.beginPath();
    ctx.moveTo(centre - SLIDER_HALF_PX, centre + y);
    ctx.lineTo(centre + SLIDER_HALF_PX, centre + y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centre + (SLIDER_KNOB_X_PX[i] ?? 0), centre + y, SLIDER_KNOB_PX, 0, 2 * Math.PI);
    ctx.fill();
  });
}

/** D-084: the "Skip guide" pill: a cream-outlined button on the caption backdrop, its word in the panel font. */
export function drawSkip(ctx: CanvasRenderingContext2D, highContrast: boolean): void {
  const outline = highContrast ? PANEL_OUTLINE_HIGH_CONTRAST_PX : PANEL_OUTLINE_PX;
  const w = PANEL_WIDE_TARGET_M * PANEL_PX_PER_M;
  ctx.clearRect(0, 0, w, TARGET_PX);
  ctx.globalAlpha = 1;
  ctx.lineWidth = outline;
  ctx.strokeStyle = CAPTION_TEXT_COLOUR;
  ctx.beginPath();
  ctx.roundRect(outline, outline, w - 2 * outline, TARGET_PX - 2 * outline, TARGET_PX / 2 - outline);
  ctx.fillStyle = highContrast ? CAPTION_BACKDROP_HIGH_CONTRAST : CAPTION_BACKDROP;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = CAPTION_TEXT_COLOUR;
  ctx.font = PANEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(PANEL.skipGuide, w / 2, TARGET_PX / 2, w - TARGET_PX / 2); // squeezed to fit, never cut
}

/** Drawn over the garden with no depth test, like a caption. */
const overlay = (parameters: MeshBasicMaterialParameters): MeshBasicMaterial =>
  new MeshBasicMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    ...parameters,
  });

interface Quad {
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  texture: CanvasTexture;
  ctx: CanvasRenderingContext2D | null;
}

/** A flat quad with its own canvas as its picture. */
function makeQuad(name: string, widthM: number, heightM: number, pxPerM: number): Quad {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(widthM * pxPerM);
  canvas.height = Math.round(heightM * pxPerM);
  const ctx = canvas.getContext('2d');
  if (ctx === null) log.error('ui', `no 2D canvas: ${name} cannot be drawn`);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const mesh = new Mesh(new PlaneGeometry(widthM, heightM), overlay({ map: texture }));
  mesh.name = name;
  return { mesh, texture, ctx };
}

/** The id of a panel control or of the orb, or '' for any other target and for none. */
const panelId = (target: TargetRef | null): string =>
  target !== null && target.kind === 'panel' ? target.id : '';

/** What the panel needs of the app's GardenSystem (API_SPEC §1.10). */
export interface PanelGarden {
  newGarden(): void;
  readonly canRestore: boolean;
  restoreReplaced(): void;
  setBedHeightOffset(metres: number): void;
  readonly timeLapse: boolean;
  setTimeLapse(on: boolean): void;
  /** T-193: the Seeds page's answer (API_SPEC §1.10). */
  pick(kind: SeedKind): void;
}
/** What the panel needs of the app's RoomSystem (API_SPEC §1.10). */
export interface PanelRoom {
  replace(): void;
}
/** What the panel needs of the app's audio engine (API_SPEC §1.10): its two sounds (T-164 §6). */
export interface PanelSounds {
  ui(sound: 'tick' | 'confirm'): void;
}

/**
 * Owns the settings panel and its orb (UX §3.6): creates them, places them, redraws the panel when something it
 * shows has changed, and disposes of them. Priority 62 (API_SPEC §1.10), with the app's `garden` and `room` as
 * `configData`: the Garden tab calls `garden.newGarden()`, `garden.setBedHeightOffset(metres)` and `room.replace()`,
 * and its Exit the world's `exitXR()` (D-067);
 * every press or dwell that acts is `engine.ui('tick')`, New garden's hold `ui('confirm')` (T-164 §6).
 * A press arrives as `gesture:release` with the control as its target (API_SPEC §1.4); a gaze dwell is worked out
 * here, from the head pose, while `Settings.gazeDwell` is on. The orb rides the hand that is not the dominant one,
 * read from that hand's `HandState` (hands/).
 */
export class PanelSystem extends createSystem(
  { hands: { required: [HandState] } },
  {
    garden: { type: Types.Object, default: null },
    room: { type: Types.Object, default: null },
    engine: { type: Types.Object, default: null },
  },
) {
  /** The panel's state and rules: open or not, the tab, what is on show. */
  panel!: Panel;
  /** Where the panel's edges were when it last opened, in degrees from the gaze: its FoV self-report. */
  readonly fov: FovBounds = { leftDeg: 0, rightDeg: 0, downDeg: 0, upDeg: 0 };

  private board!: Quad;
  private orb!: Quad;
  /** D-084: "Skip guide", shown while the guide runs (any step but off and done). One draw call, only then. */
  private skip!: Quad;
  private step: EventMap['onboarding:step']['step'] = 'off';
  private skipView: { [index: number]: number } | null = null;
  /** Where "Skip guide" waits while the board is closed, and for which dominant hand; null = to be worked out. */
  private readonly skipAt = new Vector3();
  private skipFor: Hand | null = null;
  private skipHighContrast: boolean | null = null;
  /** The guide's tip step whose Garden tab the open board was last turned to ('' = none yet). */
  private tipFor = '';
  /** Whole ms into the glow's pulse (GLOW_PERIOD_MS): an integer, so it stays off the heap. */
  private glowMs = 0;
  private ring!: Mesh<RingGeometry, MeshBasicMaterial>;
  private fill!: Mesh<RingGeometry, MeshBasicMaterial>;
  /** The fill ring's colour now: New garden's hold fills in the warm red, any other hold or dwell in the violet. */
  private fillColour = CUE_FILL_COLOUR;
  /** Each hand's HandState entity and the views of its palm, kept while the entity has the component. */
  private readonly palms: Record<Hand, (Palm & { entity: Entity }) | null> = { left: null, right: null };
  // Per slot: its entity, the id of the control it stands for ('' = none: the entity has no Interactable then),
  // that control's centre (world) and its drawn width.
  private readonly entities: Entity[] = [];
  private readonly ids: string[] = [];
  private readonly centres = new Float32Array(3 * SLOTS).fill(Number.NaN); // NaN: never on the gaze line
  private readonly widths = new Float32Array(SLOTS).fill(PANEL_TARGET_M);
  /** Where the orb waits when no hand carries it, and for which dominant hand that was worked out. */
  private readonly home = new Vector3();
  private homeFor: Hand | null = null;
  /** The orb's place: slot 0 of `centres`. And its Interactable's worldPos while it shows. */
  private readonly orbAt = new ArrayVec3(this.centres, 0);
  private orbView: { [index: number]: number } | null = null;
  /** The id the gaze was on in the last frame: the gaze's memory (`gazeTarget`). */
  private gazedId = '';
  private readonly scratch = new Vector3();
  /** The part of a millisecond of frame time not yet handed to the panel. */
  private readonly carryMs = new Float64Array(1);
  /** The head's last forward and its turn speed (`isHeadTurning`, UX §9.8). */
  private readonly headTurn = new Float64Array(4);
  /** How the orb's canvas was last drawn; null = not yet. */
  private orbHighContrast: boolean | null = null;

  override init(): void {
    const garden = this.config.garden.value as PanelGarden | null;
    const room = this.config.room.value as PanelRoom | null;
    const engine = this.config.engine.value as PanelSounds | null;
    if (garden === null || room === null)
      log.error('ui', 'the settings panel has no garden or no room: its Garden tab will do nothing');
    this.panel = new Panel({
      newGarden: () => garden?.newGarden(),
      canRestore: () => garden?.canRestore ?? false,
      restoreGarden: () => garden?.restoreReplaced(),
      replaceBed: () => room?.replace(),
      setBedHeightOffset: (metres) => garden?.setBedHeightOffset(metres),
      isTimeLapse: () => garden?.timeLapse ?? false,
      setTimeLapse: (on) => garden?.setTimeLapse(on),
      // D-067: IWSDK's own exit, `session.end()`; the wiring saves at `xr:sessionEnd` and the landing page returns.
      exit: () => this.world.exitXR(),
      // Place the garden again is a plain press: its confirm sounds when the bed lands (room:bedPlaced, GardenAudioSystem).
      pressed: (id) => {
        engine?.ui(id === NEW_GARDEN_ID ? 'confirm' : 'tick');
        if (id === SKIP_ID && this.skip.mesh.visible) {
          this.step = 'done'; // the button goes at once, whatever the guide says next
          bus.emit('onboarding:skip', {});
        }
      },
      pickSeed: (kind) => garden?.pick(kind),
      swatch: (kind, signature) => kindSwatch(kind, signature.paletteSeed, signature.reverbRt60),
    });
    this.board = makeQuad('settings-panel', PANEL_WIDTH_M, PANEL_HEIGHT_M, PANEL_PX_PER_M);
    this.orb = makeQuad('settings-orb', ORB_DIAMETER_M, ORB_DIAMETER_M, ORB_CANVAS_PX / ORB_DIAMETER_M);
    this.skip = makeQuad('guide-skip', PANEL_WIDE_TARGET_M, PANEL_TARGET_M, PANEL_PX_PER_M);
    this.widths[SKIP] = PANEL_WIDE_TARGET_M;
    this.ring = new Mesh(
      new RingGeometry(CUE_RING_INNER_M, CUE_RING_OUTER_M, CUE_SEGMENTS),
      overlay({ color: CAPTION_TEXT_COLOUR }),
    );
    // The same ring again, starting at the top: a hold or a dwell shows as the part of it that is drawn (UX §8).
    this.fill = new Mesh(
      new RingGeometry(CUE_RING_INNER_M, CUE_RING_OUTER_M, CUE_SEGMENTS, 1, Math.PI / 2),
      overlay({ color: CUE_FILL_COLOUR }),
    );
    this.ring.name = 'settings-cue';
    this.fill.name = 'settings-fill';
    // In this order: the orb and "Skip guide" over the panel, the ring over them, the fill over the ring.
    [this.board.mesh, this.orb.mesh, this.skip.mesh, this.ring, this.fill].forEach((mesh, i) => {
      mesh.visible = false;
      mesh.renderOrder = PANEL_RENDER_ORDER + i;
      // The panel stays where it opened. The other three move every frame, and their matrices are written
      // directly: a position or a turn set through Three.js puts 12 bytes on the heap for each number, every
      // frame (Chromium's allocation sampler, tests/e2e/12-settings.spec.ts).
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
    });
    // An entity per slot. It carries an Interactable only while its control, or the orb, is on show: hands/ reads
    // kind, id and radius once, when the component is added, and drops the target when it goes (§1.10 rule 7).
    for (let i = 0; i < SLOTS; i++) {
      this.entities.push(this.createEntity());
      this.ids.push('');
    }
    this.listen();
  }

  override update(delta: number): void {
    const head = (this.xrManager.isPresenting ? this.player.head : this.camera).matrixWorld;
    const s = settings.get();
    const panel = this.panel;
    this.placeOrb(head, s);
    this.placeSkip(head, s);
    const kept = this.gazedId === '' ? -1 : this.ids.indexOf(this.gazedId);
    const gazed = s.gazeDwell ? gazeTarget(head.elements, this.centres, SLOTS, kept) : -1;
    this.gazedId = gazed < 0 ? '' : (this.ids[gazed] as string);
    const board = this.board.mesh;
    const away = panel.open && clampToFov(head.elements, board.position, PANEL_CENTRE, this.scratch);
    // Whole milliseconds, the rest carried to the next frame: a fraction handed to another function costs a heap
    // number. A frame time that is not a number counts as 0.
    const carry = this.carryMs;
    carry[0] = (carry[0] as number) + (delta > 0 ? delta * 1000 : 0);
    const wholeMs = Math.floor(carry[0]);
    carry[0] -= wholeMs;
    this.glowMs = (this.glowMs + wholeMs) % GLOW_PERIOD_MS;
    panel.frame(wholeMs, this.gazedId, away, isHeadTurning(head.elements, wholeMs, this.headTurn));
    if (panel.open !== board.visible) this.show(panel.open, head);
    // D-084: a tip of the guide turns the open board to the Garden tab once, where Seeds and Move glow
    const tip = panel.open && (this.step === 'seedsTip' || this.step === 'moveTip') ? this.step : '';
    if (tip !== '' && tip !== this.tipFor) panel.showGarden();
    this.tipFor = tip;
    if (panel.stale) this.redraw();
    this.placeCue();
  }

  private listen(): void {
    const panel = this.panel;
    const { hands } = this.queries;
    this.cleanupFuncs.push(
      // `true`: a hand that was there before this system was registered counts too
      hands.subscribe('qualify', (entity) => this.setPalm(entity, true), true),
      hands.subscribe('disqualify', (entity) => this.setPalm(entity, false)),
      bus.on('settings:changed', () => {
        panel.stale = true;
      }),
      bus.on('garden:changed', ({ state }) => panel.setGarden(state)),
      bus.on('room:signature', ({ signature }) => panel.setSignature(signature)),
      bus.on('room:features', ({ features }) => panel.setFeatures(features)),
      bus.on('target:hover', (event) => panel.hover(event.hand, panelId(event.target))),
      bus.on('gesture:pinchStart', (event) => panel.down(event.hand, panelId(event.target))),
      bus.on('gesture:release', (event) =>
        panel.up(
          event.hand,
          event.gesture === 'press' ? panelId(event.target) || panel.heldBy(event.hand) : '',
        ),
      ),
      bus.on('gesture:trackingLost', (event) => panel.up(event.hand, '')),
      bus.on('xr:sessionStart', () => {
        this.homeFor = null; // the orb's place in the view box is worked out again from where the head is now
      }),
      bus.on('xr:sessionEnd', () => panel.close()),
      bus.on('onboarding:step', ({ step }) => {
        this.step = step;
        if (step === 'palm') panel.close(); // D-090: the strict guide begins again (New garden on the board): nothing over it
      }),
      () => this.dispose(),
    );
  }

  /** A hand's HandState came or went: its palm is read from the views of that component from now on, or no more. */
  private setPalm(entity: Entity, there: boolean): void {
    const hand = entity.getValue(HandState, 'hand') as Hand;
    this.palms[hand] = there
      ? {
          entity,
          palmPos: entity.getVectorView(HandState, 'palmPos'),
          palmNormal: entity.getVectorView(HandState, 'palmNormal'),
        }
      : null;
  }

  /** The panel opened or closed. It opens in the FoV box, facing the head, and stays there (UX §3.6, FR-UI-04). */
  private show(open: boolean, head: Matrix4): void {
    const mesh = this.board.mesh;
    mesh.visible = open;
    for (let i = 1; i < SKIP; i++) this.target(i, '', null); // a panel that opens again has its controls elsewhere
    this.skipFor = null; // "Skip guide" moves to the header, or back into the view box from where the head is now
    bus.emit('panel:open', { open });
    if (!open) return;
    placePanel(head.elements, mesh.matrix.elements);
    mesh.matrixWorld.copy(mesh.matrix); // a child of the scene: its own matrix is its world matrix
    mesh.position.setFromMatrixPosition(mesh.matrix);
    fovBoundsDeg(head.elements, mesh.position, PANEL_ELEMENT, this.fov);
  }

  /** Something on show changed: the targets of hands/ and of the gaze follow, and the canvas is drawn again. */
  private redraw(): void {
    const panel = this.panel;
    panel.stale = false;
    const controls = panel.controls();
    if (controls.length > MAX_CONTROLS) log.error('ui', 'more panel controls than slots', controls.length);
    const world = this.board.mesh.matrixWorld;
    for (let i = 1; i < SKIP; i++) {
      const control = controls[i - 1];
      if (control === undefined) {
        this.target(i, '', null);
        continue;
      }
      this.widths[i] = control.w;
      this.target(i, control.id, this.scratch.set(control.x, control.y, 0).applyMatrix4(world));
    }
    const highContrast = settings.get().highContrast;
    if (this.board.ctx !== null && controls.length > 0) {
      drawPanel(this.board.ctx, controls, panel.texts(), highContrast);
      this.board.texture.needsUpdate = true;
    }
    if (this.orb.ctx !== null && highContrast !== this.orbHighContrast) {
      drawOrb(this.orb.ctx, highContrast);
      this.orb.texture.needsUpdate = true;
      this.orbHighContrast = highContrast;
    }
  }

  /** The orb: on the hand that is not the dominant one, or in the view box when no hand can carry it. */
  private placeOrb(head: Matrix4, s: Readonly<Settings>): void {
    const mesh = this.orb.mesh;
    const shown = this.orbPlace(head.elements, s);
    const entity = this.entities[0];
    if (shown !== mesh.visible && entity !== undefined) {
      mesh.visible = shown;
      this.ids[0] = shown ? ORB_ID : '';
      if (shown) entity.addComponent(Interactable, { kind: 'panel', id: ORB_ID, radius: HIT_RADIUS_M });
      else entity.removeComponent(Interactable);
      this.orbView = shown ? entity.getVectorView(Interactable, 'worldPos') : null;
    }
    const centres = this.centres;
    const view = this.orbView;
    if (view === null) {
      centres[0] = Number.NaN; // never on the gaze line
      return;
    }
    // It faces the head: the head's own turn, at the orb's place.
    const matrix = mesh.matrix.copy(head).elements;
    for (let axis = 0; axis < 3; axis++) {
      matrix[12 + axis] = centres[axis] as number;
      view[axis] = centres[axis] as number;
    }
    mesh.matrixWorldNeedsUpdate = true;
  }

  /**
   * Makes a slot stand for the control `id`, centred on `at` (world), or for nothing (''). Its entity gets a new
   * Interactable when what it stands for changes, and has none while it stands for nothing.
   */
  private target(slot: number, id: string, at: Vector3 | null): void {
    const entity = this.entities[slot];
    if (entity === undefined || id === this.ids[slot]) return;
    if (this.ids[slot] !== '') entity.removeComponent(Interactable);
    this.ids[slot] = id;
    if (at === null) {
      this.centres.fill(Number.NaN, 3 * slot, 3 * slot + 3); // off the gaze line, as the slot stands for nothing
      return;
    }
    at.toArray(this.centres, 3 * slot);
    entity.addComponent(Interactable, {
      kind: 'panel',
      id,
      radius: HIT_RADIUS_M,
      worldPos: [at.x, at.y, at.z],
    });
  }

  /**
   * D-084: "Skip guide" while the guide runs, in a session. On the open board it sits in the header's gap; else it
   * waits low on the dominant side (skipHome), clamped into the FoV box every frame, as the orb waits (FR-UI-03).
   */
  private placeSkip(head: Matrix4, s: Readonly<Settings>): void {
    const mesh = this.skip.mesh;
    const step = this.step;
    const shown = this.xrManager.isPresenting && step !== 'off' && step !== 'done' && hasPose(head.elements);
    const entity = this.entities[SKIP];
    if (shown !== mesh.visible && entity !== undefined) {
      mesh.visible = shown;
      this.ids[SKIP] = shown ? SKIP_ID : '';
      if (shown) entity.addComponent(Interactable, { kind: 'panel', id: SKIP_ID, radius: HIT_RADIUS_M });
      else entity.removeComponent(Interactable);
      this.skipView = shown ? entity.getVectorView(Interactable, 'worldPos') : null;
      this.skipFor = null;
    }
    const view = this.skipView;
    if (view === null) {
      this.centres.fill(Number.NaN, 3 * SKIP, 3 * SKIP + 3);
      return;
    }
    if (this.skip.ctx !== null && s.highContrast !== this.skipHighContrast) {
      drawSkip(this.skip.ctx, s.highContrast);
      this.skip.texture.needsUpdate = true;
      this.skipHighContrast = s.highContrast;
    }
    const at = this.scratch;
    if (this.board.mesh.visible) {
      mesh.matrix.copy(this.board.mesh.matrix);
      at.set(SKIP_AT_X, SKIP_AT_Y, 0).applyMatrix4(this.board.mesh.matrix);
    } else {
      if (this.skipFor !== s.dominantHand) {
        skipHome(head.elements, s.dominantHand, this.skipAt);
        this.skipFor = s.dominantHand;
      }
      clampToFov(head.elements, this.skipAt, SKIP_ELEMENT, at);
      mesh.matrix.copy(head); // it faces the head
    }
    const matrix = mesh.matrix.elements;
    const centres = this.centres;
    matrix[12] = centres[3 * SKIP] = view[0] = at.x;
    matrix[13] = centres[3 * SKIP + 1] = view[1] = at.y;
    matrix[14] = centres[3 * SKIP + 2] = view[2] = at.z;
    mesh.matrixWorldNeedsUpdate = true;
    const opacity = s.highContrast || this.panel.cue() === SKIP_ID ? 1 : SKIP_REST_OPACITY;
    if (mesh.material.opacity !== opacity) mesh.material.opacity = opacity; // on a change only
  }

  /** Writes the orb's place to `orbAt`. False when it has none: outside a session, or no hand to ride. */
  private orbPlace(head: Mat4, s: Readonly<Settings>): boolean {
    if (!this.xrManager.isPresenting) return false; // the garden window has no settings orb (UX §3.7)
    if (s.oneHand || s.gazeDwell) {
      // FR-UI-09, FR-HND-12: one hand cannot press an orb it carries, and the gaze needs it in view. The panel
      // opens where the user was looking, which is at this orb: it steps aside until the panel's own Close shuts it.
      if (this.panel.open) return false;
      if (this.homeFor !== s.dominantHand) {
        // A session's first frames can come before its first head pose: a place worked out from no pose would
        // be near the floor, and it is kept for the session.
        if (!hasPose(head)) return false;
        orbHome(head, s.dominantHand, this.home);
        this.homeFor = s.dominantHand;
      }
      // Into a Vector3, then copied: clampToFov gets plain fields from every caller (an accessor object at one
      // call site made V8 box its numbers at all of them, T-128d review).
      clampToFov(head, this.home, ORB_ELEMENT, this.scratch);
      this.orbAt.x = this.scratch.x;
      this.orbAt.y = this.scratch.y;
      this.orbAt.z = this.scratch.z;
      return true;
    }
    this.homeFor = null;
    const palm = this.palms[s.dominantHand === 'right' ? 'left' : 'right'];
    if (palm === null || palm.entity.getValue(HandState, 'tracked') !== true) return false;
    return orbOnHand(palm, head, this.orb.mesh.visible, this.orbAt);
  }

  /** The ring round the control or orb that is held, gazed at or hovered, and the fill of a hold or a dwell. */
  private placeCue(): void {
    // D-084: with nothing held, gazed at or hovered, the ring glows round what the guide points at
    const step = this.step;
    const guided =
      step === 'orb' ? ORB_ID : step === 'seedsTip' ? SEEDS_ID : step === 'moveTip' ? 'replaceBed' : '';
    const id = this.panel.cue() || guided;
    const i = id === '' ? -1 : this.ids.indexOf(id);
    // How much of the fill ring is drawn: whole steps of it, from the top round (UX §8: the ring fills).
    const steps = Math.round((this.panel.fill[0] as number) * CUE_SEGMENTS);
    this.ring.visible = i >= 0;
    this.fill.visible = i >= 0 && steps > 0;
    if (i < 0) return;
    const s = settings.get();
    // 10 Nov: round the guide's target the ring stays neon, hovered or not: a flip to cream at each hover flickered
    const glowing = id === guided;
    if (glowing) neon(this.ring.material.color, s, this.glowMs);
    else this.ring.material.color.copy(CREAM);
    // ...and breathes with it, GLOW_GROW larger at its brightest (neon's cosine); its own size with Reduce motion
    const grow =
      glowing && !s.reducedMotion
        ? 1 + GLOW_GROW * (0.5 + 0.5 * Math.cos((2 * Math.PI * this.glowMs) / GLOW_PERIOD_MS))
        : 1;
    const danger = s.highContrast ? PANEL_DANGER_HIGH_CONTRAST : PANEL_DANGER;
    const colour = id === NEW_GARDEN_ID ? danger : CUE_FILL_COLOUR;
    if (colour !== this.fillColour) {
      this.fill.material.color.set(colour); // on a change only: a colour parsed from a string costs heap
      this.fillColour = colour;
    }
    this.fill.geometry.setDrawRange(0, steps * INDICES_PER_SEGMENT);
    // Both rings face the way their target does (the orb's or the panel's matrix), at the target's centre, and are
    // as wide as it: a control that holds a word is twice as wide as it is tall.
    const facing = (i === 0 ? this.orb : i === SKIP ? this.skip : this.board).mesh.matrix.elements;
    const stretch = ((this.widths[i] as number) / PANEL_TARGET_M) * grow;
    for (let k = 0; k < 2; k++) {
      const mesh = k === 0 ? this.ring : this.fill;
      const matrix = mesh.matrix.elements;
      for (let axis = 0; axis < 3; axis++) {
        matrix[axis] = (facing[axis] as number) * stretch;
        matrix[4 + axis] = (facing[4 + axis] as number) * grow;
        matrix[8 + axis] = facing[8 + axis] as number;
        matrix[12 + axis] = this.centres[3 * i + axis] as number;
      }
      mesh.matrixWorldNeedsUpdate = true;
    }
  }

  private dispose(): void {
    for (const mesh of [this.board.mesh, this.orb.mesh, this.skip.mesh, this.ring, this.fill]) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.board.texture.dispose();
    this.orb.texture.dispose();
    this.skip.texture.dispose();
    for (const entity of this.entities) entity.destroy();
  }
}
