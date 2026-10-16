// The garden window's stage (FR-SYS-07, Should S6, LLD §11): one fixed camera at a seated eye point over a
// virtual table, the pointer's ray onto the bed plane, and the page's lifecycle as the xr:* events a session
// would give (API_SPEC §1.10 rule 3). The headset-free bench and demo; never the judged path.
import { BoxGeometry, MathUtils, Mesh, MeshBasicMaterial, Plane, Raycaster, Vector2, Vector3 } from 'three';

import { bus } from '../core/index.js';
import { LANDING } from '../ui/index.js';

import {
  REST_SPOT_X_M,
  TABLE_COLOUR,
  TABLE_DEPTH_M,
  TABLE_GAP_M,
  TABLE_THICKNESS_M,
  TABLE_WIDTH_M,
  WINDOW_EYE_HEIGHT_M,
  WINDOW_FOV_DEG,
  WINDOW_MIN_HFOV_DEG,
  WINDOW_PITCH_RAD,
} from './config.js';

import type { Vec3 } from '../core/index.js';
import type { Object3D, PerspectiveCamera } from 'three';

export class WindowStage {
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly plane = new Plane();
  private readonly up = new Vector3();
  private readonly point = new Vector3();
  private isOpen = false;
  /** What the last xr:* event said of the page: seen or hidden. */
  private isSeen = true;
  /** The way out on touch, which has no Escape: a page button over the canvas while the window is open. */
  private closeButton: HTMLButtonElement | null = null;

  /**
   * Stands `camera` (IWSDK's, under the player at the origin) at the eye point, so that the floating bed is placed
   * from it, and puts the table under `bed`, the bed entity's Object3D (RoomSystem.bed.object3D), as its child.
   */
  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly bed: Object3D,
  ) {
    camera.position.set(0, WINDOW_EYE_HEIGHT_M, 0);
    camera.rotation.set(-WINDOW_PITCH_RAD, 0, 0);
    this.fit();
    // RoomSystem reads the head from this matrix in the first frame, before anything has been drawn.
    camera.updateMatrixWorld();
    const table = new Mesh(
      new BoxGeometry(TABLE_WIDTH_M, TABLE_THICKNESS_M, TABLE_DEPTH_M),
      new MeshBasicMaterial({ color: TABLE_COLOUR }),
    );
    table.position.y = -TABLE_THICKNESS_M / 2 - TABLE_GAP_M;
    table.matrixAutoUpdate = false;
    table.updateMatrix();
    bed.add(table);
  }

  /**
   * Where the camera ray through the screen point (NDC, -1..1, +y up) meets the bed plane, written into `out`.
   * False, and `out` untouched, when it never does (a point above the horizon). Creates nothing (hot path).
   */
  project(ndcX: number, ndcY: number, out: Vec3): boolean {
    const pose = this.bed.matrixWorld.elements;
    // The bed's up is the second column of its pose, unit length: a bed has no scale (API_SPEC §1.4 toBedLocal).
    this.up.set(pose[4], pose[5], pose[6]);
    this.point.set(pose[12], pose[13], pose[14]);
    this.plane.setFromNormalAndCoplanarPoint(this.up, this.point);
    this.raycaster.setFromCamera(this.ndc.set(ndcX, ndcY), this.camera);
    if (this.raycaster.ray.intersectPlane(this.plane, this.point) === null) return false;
    out.x = this.point.x;
    out.y = this.point.y;
    out.z = this.point.z;
    return true;
  }

  /** The fixed spot beside the bed where the pointer's seed waits (LLD §11), world, written into `out`. */
  restPoint<T extends Vec3>(out: T): T {
    this.point.set(REST_SPOT_X_M, 0, 0).applyMatrix4(this.bed.matrixWorld);
    out.x = this.point.x;
    out.y = this.point.y;
    out.z = this.point.z;
    return out;
  }

  /** The page's Enter, inside its click: the window opens, as a session would start (`xr:sessionStart`). */
  enter(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.isSeen = true; // the click that opens it was on a page that is seen
    this.fit();
    document.addEventListener('visibilitychange', this.onVisibility);
    document.addEventListener('keydown', this.onKey);
    // After IWSDK's own resize listener, added at World.create: the camera's aspect is the new one here.
    window.addEventListener('resize', this.onResize);
    const close = (this.closeButton ??= this.makeCloseButton());
    close.hidden = false;
    close.focus(); // the landing page's Enter, which held the focus, is hidden now
    bus.emit('xr:sessionStart', { visible: true });
  }

  /** The window closes, as a session would end (`xr:sessionEnd`): Escape, the close button, or the wiring. */
  exit(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('keydown', this.onKey);
    window.removeEventListener('resize', this.onResize);
    this.closeButton!.hidden = true; // made by the enter() that opened the window
    bus.emit('xr:sessionEnd', { visible: false });
  }

  /**
   * The vertical field of view for the camera's aspect: WINDOW_FOV_DEG, widened on a narrow (portrait) tab until
   * the horizontal one is WINDOW_MIN_HFOV_DEG, so the bed and the rest spot stay on screen.
   */
  private fit(): void {
    const camera = this.camera;
    const halfHRad = MathUtils.degToRad(WINDOW_MIN_HFOV_DEG) / 2;
    const forWidthDeg = MathUtils.radToDeg(2 * Math.atan(Math.tan(halfHRad) / camera.aspect));
    camera.fov = Math.max(WINDOW_FOV_DEG, forWidthDeg);
    camera.updateProjectionMatrix();
  }

  /** At the first enter(), not in the constructor: the unit tests make stages in node, which has no DOM. */
  private makeCloseButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = 'window-close'; // styled in ui/landing.css
    button.type = 'button';
    button.textContent = LANDING.close;
    button.addEventListener('click', () => this.exit());
    document.body.append(button);
    return button;
  }

  private readonly onResize = (): void => this.fit();

  /** `xr:visibility` on a change only, as a session's `visibilitychange` gives it. */
  private readonly onVisibility = (): void => {
    const isSeen = document.visibilityState !== 'hidden';
    if (isSeen === this.isSeen) return;
    this.isSeen = isSeen;
    bus.emit('xr:visibility', { visible: isSeen });
  };

  // choice: LLD §11 names "close" and no key for it. Escape is the browser's way out of a mode, and it gives the
  // landing page back, whose access toggles are the window's settings.
  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.exit();
  };
}
