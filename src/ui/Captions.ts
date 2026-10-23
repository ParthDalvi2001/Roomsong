// Captions (FR-UI-01, LLD §5.8): one short text at a time, drawn inside the scene (the projection layer, not a
// WebXR quad layer) and kept inside the FoV box. A module raises one by creating an entity with core's `Caption`
// component; this file is the only reader (LLD §3).
import {
  CanvasTexture,
  createSystem,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
  type Entity,
} from '@iwsdk/core';

import { Caption } from '../core/components.js';
import { bus, CAPTION_MIN_MS, clock, log, settings, STRINGS, type StringKey } from '../core/index.js';

import {
  CAPTION_BACKDROP,
  CAPTION_BACKDROP_HIGH_CONTRAST,
  CAPTION_BELOW_CAMERA_WINDOW_DEG,
  CAPTION_BELOW_GAZE_DEG,
  CAPTION_CANVAS_H,
  CAPTION_CANVAS_W,
  CAPTION_DISTANCE_M,
  CAPTION_FONT,
  CAPTION_FONT_PX,
  CAPTION_HEIGHT_M,
  CAPTION_OUTLINE_PX,
  CAPTION_RENDER_ORDER,
  CAPTION_TEXT_COLOUR,
  CAPTION_WIDTH_M,
} from './config.js';
import { clampToFov, fovBoundsDeg, type FovBounds, type FovElement } from './FovGuard.js';

function isStringKey(key: string): key is StringKey {
  return Object.prototype.hasOwnProperty.call(STRINGS, key);
}

interface Entry<T> {
  owner: T;
  key: StringKey;
  expiresAt: number;
  /** False once the raiser took the caption back: there is then nothing to hand back to it. */
  live: boolean;
}

/**
 * The line of raised captions: first raised, first shown, one at a time. A caption is on screen from the moment
 * its turn comes until its `expiresAt` (ms on core's clock), and never for less than CAPTION_MIN_MS; a caption that
 * waited past its `expiresAt` is still shown, for that minimum. `T` is whatever stands for the raiser (an entity).
 * The line has no cap and merges nothing: a raiser keeps at most one live caption per key (API_SPEC §1.9).
 */
export class CaptionQueue<T> {
  private readonly entries: Entry<T>[] = [];
  /** When the first entry came on screen; NaN while it has not. */
  private shownAt = Number.NaN;

  /** `done` is called once for each caption that was shown to its end and not taken back. */
  constructor(private readonly done: (owner: T) => void) {}

  /** Adds a caption to the back of the line. False, with a warning, for a key that is not in STRINGS. */
  raise(owner: T, key: string, expiresAt: number): boolean {
    if (!isStringKey(key)) {
      log.warn('ui', 'caption key is not in STRINGS: not shown', key);
      return false;
    }
    this.entries.push({ owner, key, expiresAt: Number.isNaN(expiresAt) ? 0 : expiresAt, live: true });
    return true;
  }

  /** The raiser took its caption back. One that is on screen stays until its minimum time; one that waits is dropped. */
  withdraw(owner: T): void {
    // `live`: an owner's earlier caption, taken back while on screen, is still in the line and is not this one.
    const i = this.entries.findIndex((entry) => entry.owner === owner && entry.live);
    const entry = this.entries[i];
    if (entry === undefined) return;
    if (i === 0 && !Number.isNaN(this.shownAt)) {
      entry.expiresAt = 0;
      entry.live = false;
    } else {
      this.entries.splice(i, 1);
    }
  }

  /** The key of the caption on screen at `now` (ms), or null. Called once per frame: allocates nothing. */
  current(now: number): StringKey | null {
    for (;;) {
      const head = this.entries[0];
      if (head === undefined) return null;
      if (Number.isNaN(this.shownAt)) this.shownAt = now;
      if (now < Math.max(this.shownAt + CAPTION_MIN_MS, head.expiresAt)) return head.key;
      this.entries.shift();
      this.shownAt = Number.NaN;
      if (head.live) this.done(head.owner);
    }
  }
}

const CAPTION_ELEMENT: Readonly<FovElement> = {
  distanceM: CAPTION_DISTANCE_M,
  halfWidthM: CAPTION_WIDTH_M / 2,
  halfHeightM: CAPTION_HEIGHT_M / 2,
};
/**
 * How far below the gaze line a caption appears, in metres at CAPTION_DISTANCE_M: UX §3.3's angle in a session, the
 * garden window's own outside one (CAPTION_BELOW_CAMERA_WINDOW_DEG). Called when a caption comes on, not per frame.
 */
export function captionDropM(inSession: boolean): number {
  const degrees = inSession ? CAPTION_BELOW_GAZE_DEG : CAPTION_BELOW_CAMERA_WINDOW_DEG;
  return CAPTION_DISTANCE_M * Math.tan((degrees * Math.PI) / 180);
}
/** D-058 polish: the text starts past the pill's rounded end (its radius is half the pill's height) plus a quarter
 *  font, so no letter sits in the curve; 876 px are left for the words, and the longest caption (29 characters at
 *  56 px semibold) takes about 810. */
const PAD_PX = (CAPTION_CANVAS_H - 2 * CAPTION_OUTLINE_PX) / 2 + CAPTION_FONT_PX / 4;
const TEXT_MAX_PX = CAPTION_CANVAS_W - 2 * PAD_PX;

/**
 * Draws the caption on screen (LLD §3, priority 60; API_SPEC §1.9). The caption appears a little below the gaze,
 * stays where it appeared, and is pushed along by the FoV guard when the head turns away from it. When a caption
 * has been shown, its `Caption` component is removed; the entity stays its raiser's.
 */
export class CaptionSystem extends createSystem({ captions: { required: [Caption] } }) {
  /** Where the caption's edges were on the last frame it was shown: the FoV self-report (TC-E2E-11). */
  readonly fov: FovBounds = { leftDeg: 0, rightDeg: 0, downDeg: 0, upDeg: 0 };

  private key: StringKey | null = null;
  private queue!: CaptionQueue<Entity>;
  private mesh!: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private texture!: CanvasTexture;
  private ctx: CanvasRenderingContext2D | null = null;
  /** Where the caption appeared, in world space. */
  private readonly wanted = new Vector3();
  /** The canvas no longer shows the caption as it should look (a new text, or high contrast changed). */
  private stale = false;
  /** How the canvas was last drawn (FR-UI-05). */
  private drawnHighContrast = false;

  /** The key of the caption on screen, or null. */
  get shown(): StringKey | null {
    return this.key;
  }

  override init(): void {
    const canvas = document.createElement('canvas');
    canvas.width = CAPTION_CANVAS_W;
    canvas.height = CAPTION_CANVAS_H;
    this.ctx = canvas.getContext('2d');
    if (this.ctx === null) log.error('ui', 'no 2D canvas: captions cannot be drawn');
    this.texture = new CanvasTexture(canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(
      new PlaneGeometry(CAPTION_WIDTH_M, CAPTION_HEIGHT_M),
      new MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.mesh.name = 'caption';
    this.mesh.visible = false;
    this.mesh.renderOrder = CAPTION_RENDER_ORDER;
    this.scene.add(this.mesh);

    this.queue = new CaptionQueue<Entity>((entity) => entity.removeComponent(Caption));
    const { captions } = this.queries;
    this.cleanupFuncs.push(
      // `true`: a caption raised before this system was registered is shown too
      captions.subscribe('qualify', (entity) => this.raise(entity), true),
      captions.subscribe('disqualify', (entity) => this.queue.withdraw(entity)),
      // Only high contrast changes how a caption looks: a tempo or volume step must not redraw the canvas.
      bus.on('settings:changed', ({ settings: next }) => {
        if (next.highContrast !== this.drawnHighContrast) this.stale = true;
      }),
      () => {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.texture.dispose();
      },
    );
  }

  override update(): void {
    const key = this.queue.current(clock.now());
    // In a session, this frame's head pose: IWSDK's input system (priority -4) has moved `player.head` and updated
    // its world matrix before this system runs. The camera gets the pose only when the frame is rendered, so it is
    // one frame late (about 1.25 degrees at 90 degrees per second and 72 Hz), and a caption riding the edge of the
    // box would trail by that much. The emulator cannot show the difference: device check. Outside a session
    // there is no head pose, and the camera is the view.
    const inSession = this.xrManager.isPresenting;
    const head = inSession ? this.player.head.matrixWorld : this.camera.matrixWorld;
    if (key !== this.key) {
      this.key = key;
      this.mesh.visible = key !== null;
      if (key !== null) {
        this.wanted.set(0, -captionDropM(inSession), -CAPTION_DISTANCE_M).applyMatrix4(head);
        this.stale = true;
      }
    }
    if (key === null) return;
    if (this.stale) {
      this.draw(key);
      this.stale = false;
    }
    clampToFov(head.elements, this.wanted, CAPTION_ELEMENT, this.mesh.position);
    this.mesh.quaternion.setFromRotationMatrix(head);
    fovBoundsDeg(head.elements, this.mesh.position, CAPTION_ELEMENT, this.fov);
  }

  private raise(entity: Entity): void {
    const expiresAt = entity.getValue(Caption, 'expiresAt') ?? 0;
    this.queue.raise(entity, entity.getValue(Caption, 'key') ?? '', expiresAt);
  }

  /** Redraws the canvas: the text on a rounded backdrop no wider than it needs. Once per caption, not per frame. */
  private draw(key: StringKey): void {
    const ctx = this.ctx;
    if (ctx === null) return;
    const highContrast = settings.get().highContrast; // FR-UI-05
    this.drawnHighContrast = highContrast;
    const text = STRINGS[key];
    ctx.clearRect(0, 0, CAPTION_CANVAS_W, CAPTION_CANVAS_H);
    ctx.font = CAPTION_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // The outline is drawn half inside and half outside the backdrop, so the backdrop keeps clear of the canvas edge.
    const textWidth = Math.min(ctx.measureText(text).width, TEXT_MAX_PX);
    const width = textWidth + 2 * (PAD_PX - CAPTION_OUTLINE_PX);
    const height = CAPTION_CANVAS_H - 2 * CAPTION_OUTLINE_PX;
    ctx.beginPath();
    ctx.roundRect((CAPTION_CANVAS_W - width) / 2, CAPTION_OUTLINE_PX, width, height, height / 2);
    ctx.fillStyle = highContrast ? CAPTION_BACKDROP_HIGH_CONTRAST : CAPTION_BACKDROP;
    ctx.fill();
    if (highContrast) {
      ctx.lineWidth = CAPTION_OUTLINE_PX;
      ctx.strokeStyle = CAPTION_TEXT_COLOUR;
      ctx.stroke();
    }
    ctx.fillStyle = CAPTION_TEXT_COLOUR;
    ctx.fillText(text, CAPTION_CANVAS_W / 2, CAPTION_CANVAS_H / 2, TEXT_MAX_PX);
    this.texture.needsUpdate = true;
  }
}
