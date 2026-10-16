// The garden window's stage (FR-SYS-07, LLD §11): the fixed camera over the floating bed, the pointer's ray onto
// the bed plane, the table, and the page's own xr:* events. Three.js in node, no WebGL. The gate: gate.test.ts.
import { Group, Mesh, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bus } from '../../../src/core/index.js';
import { BED_OUTER } from '../../../src/garden/index.js';
import { BED_CENTRE_DEFAULT_M } from '../../../src/room/index.js';
import { LANDING } from '../../../src/ui/index.js';
import { REST_SPOT_X_M, WINDOW_EYE_HEIGHT_M, WINDOW_FOV_DEG } from '../../../src/window/config.js';
import { WindowStage } from '../../../src/window/index.js';

/** room/'s FLOATING_DROP_M (FR-ROOM-01 level 4), which room/ does not export: the floating bed is this far below the eyes. */
const FLOATING_DROP_M = 0.25;

/** A camera under a player at the origin, as IWSDK has it, and a bed where level 4 puts it from that camera. */
function rig(aspect = 16 / 9) {
  const player = new Group();
  const camera = new PerspectiveCamera(50, aspect, 0.001, 200);
  camera.position.set(0, 1, 0.5); // iwsdk.config.json's, which the stage replaces
  player.add(camera);
  const bed = new Object3D();
  const stage = new WindowStage(camera, bed);
  const head = new Vector3().setFromMatrixPosition(camera.matrixWorld);
  bed.position.set(head.x, head.y - FLOATING_DROP_M, head.z - BED_CENTRE_DEFAULT_M);
  bed.updateMatrixWorld();
  return { camera, bed, stage };
}

/** Where a world point is on the screen, in NDC, and whether it is in front of the camera. */
function onScreen(camera: PerspectiveCamera, point: Vector3) {
  const ndc = point.clone().project(camera);
  return { ndc, isInView: Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z < 1 };
}

/** The floating bed's outer ring, 16 points, and the rest spot: what must be on screen. */
function mustSee(bed: Object3D, stage: WindowStage): Vector3[] {
  const points: Vector3[] = [stage.restPoint(new Vector3())];
  for (let step = 0; step < 16; step++) {
    const rad = (step / 16) * 2 * Math.PI;
    points.push(
      new Vector3(BED_OUTER * Math.cos(rad), 0, BED_OUTER * Math.sin(rad)).applyMatrix4(bed.matrixWorld),
    );
  }
  return points;
}

describe('WindowStage: the camera and the table (LLD §11)', () => {
  it('stands the camera at the seated eye point, its world matrix current for the placement that reads it', () => {
    const { camera } = rig();
    expect(camera.fov).toBe(WINDOW_FOV_DEG);
    expect(new Vector3().setFromMatrixPosition(camera.matrixWorld)).toEqual(
      new Vector3(0, WINDOW_EYE_HEIGHT_M, 0),
    );
  });

  for (const [name, aspect] of [
    ['16:9', 16 / 9],
    ['4:3', 4 / 3],
    ['3:4', 3 / 4],
    ['9:16', 9 / 16],
    ['9:19.5', 9 / 19.5],
  ] as const) {
    it(`shows the whole floating bed and the rest spot in a ${name} tab`, () => {
      const { camera, bed, stage } = rig(aspect);
      for (const point of mustSee(bed, stage)) {
        expect(onScreen(camera, point).isInView, point.toArray().join()).toBe(true);
      }
    });
  }

  it("draws a table under the bed, as the bed's child, its top just below the bed plane", () => {
    const { bed } = rig();
    const table = bed.children[0] as Mesh;
    expect(table).toBeInstanceOf(Mesh);
    table.geometry.computeBoundingBox();
    const top = table.geometry.boundingBox!.max.y + table.position.y;
    expect(top).toBeLessThan(0);
    expect(top).toBeGreaterThan(-0.005);
    expect(table.matrixAutoUpdate).toBe(false);
  });
});

describe('WindowStage: the pointer ray and the rest spot (LLD §11)', () => {
  it('a screen point lands on the bed plane where that point of the bed is drawn', () => {
    const { camera, bed, stage } = rig();
    const cell = new Vector3(0.21, 0, 0.1).applyMatrix4(bed.matrixWorld);
    const { ndc } = onScreen(camera, cell);
    const out = { x: 0, y: 0, z: 0 };
    expect(stage.project(ndc.x, ndc.y, out)).toBe(true);
    expect(out.x).toBeCloseTo(cell.x, 6);
    expect(out.y).toBeCloseTo(cell.y, 6);
    expect(out.z).toBeCloseTo(cell.z, 6);
  });

  it('follows the bed: a bed that is turned and tilted is hit in its own plane', () => {
    const { camera, bed, stage } = rig();
    bed.rotation.set(0.1, 0.7, 0);
    bed.updateMatrixWorld();
    const point = new Vector3(-0.15, 0, -0.2).applyMatrix4(bed.matrixWorld);
    const { ndc } = onScreen(camera, point);
    const out = new Vector3();
    expect(stage.project(ndc.x, ndc.y, out)).toBe(true);
    expect(out.distanceTo(point)).toBeLessThan(1e-6);
    expect(
      stage
        .restPoint(new Vector3())
        .distanceTo(new Vector3(REST_SPOT_X_M, 0, 0).applyMatrix4(bed.matrixWorld)),
    ).toBeLessThan(1e-9);
  });

  it('a ray that never meets the bed plane changes nothing and says so', () => {
    const { bed, stage } = rig();
    bed.position.y = WINDOW_EYE_HEIGHT_M + 1; // the plane above the eyes: a ray down never meets it
    bed.updateMatrixWorld();
    const out = { x: 7, y: 7, z: 7 };
    expect(stage.project(0, 0, out)).toBe(false);
    expect(out).toEqual({ x: 7, y: 7, z: 7 });
  });
});

describe('WindowStage: the page lifecycle as xr:* events (LLD §11, API_SPEC §1.10 rule 3)', () => {
  let page: EventTarget & { visibilityState: DocumentVisibilityState };
  let tab: EventTarget;
  /** The close button the stage makes, as much of one as it uses; `appended` once it is in the page. */
  let closeButton: EventTarget & { hidden: boolean; textContent: string; appended: number; focused: number };
  let seen: string[];
  let offs: (() => void)[];
  beforeEach(() => {
    closeButton = Object.assign(new EventTarget(), {
      hidden: false,
      textContent: '',
      appended: 0,
      focused: 0,
      focus: () => void closeButton.focused++,
    });
    page = Object.assign(new EventTarget(), {
      visibilityState: 'visible' as const,
      createElement: () => closeButton,
      body: { append: () => void closeButton.appended++ },
    });
    tab = new EventTarget();
    vi.stubGlobal('document', page);
    vi.stubGlobal('window', tab);
    seen = [];
    offs = (['xr:sessionStart', 'xr:sessionEnd', 'xr:visibility'] as const).map((type) =>
      bus.on(type, ({ visible }) => void seen.push(`${type} ${visible}`)),
    );
  });
  afterEach(() => {
    for (const off of offs) off();
    vi.unstubAllGlobals();
  });
  const show = (state: DocumentVisibilityState) => {
    page.visibilityState = state;
    page.dispatchEvent(new Event('visibilitychange'));
  };
  const key = (name: string) => page.dispatchEvent(Object.assign(new Event('keydown'), { key: name }));

  it('Enter starts, a hidden page and its return are visibility changes, Escape ends', () => {
    const { stage } = rig();
    stage.enter();
    show('hidden');
    show('hidden');
    show('visible');
    key('a');
    key('Escape');
    expect(seen).toEqual([
      'xr:sessionStart true',
      'xr:visibility false',
      'xr:visibility true',
      'xr:sessionEnd false',
    ]);
  });

  it('a second Enter or a second exit says nothing; after the end the page is not followed', () => {
    const { stage } = rig();
    stage.enter();
    stage.enter();
    stage.exit();
    stage.exit();
    show('hidden');
    key('Escape');
    expect(seen).toEqual(['xr:sessionStart true', 'xr:sessionEnd false']);
    stage.enter();
    expect(seen[seen.length - 1]).toBe('xr:sessionStart true');
  });

  it('touch has no Escape: a close button shown and focused while the window is open, made once, whose click ends it', () => {
    const { stage } = rig();
    stage.enter();
    expect(closeButton).toMatchObject({ hidden: false, textContent: LANDING.close, appended: 1, focused: 1 });
    closeButton.dispatchEvent(new Event('click'));
    expect(closeButton.hidden).toBe(true);
    stage.enter();
    expect(closeButton).toMatchObject({ hidden: false, appended: 1 });
    expect(seen).toEqual(['xr:sessionStart true', 'xr:sessionEnd false', 'xr:sessionStart true']);
  });

  it('a tab turned to portrait while open widens the view, so the bed stays on screen; closed, it does not', () => {
    const { camera, bed, stage } = rig();
    stage.enter();
    camera.aspect = 9 / 19.5; // IWSDK's own resize listener sets it first (World.create adds it earlier)
    tab.dispatchEvent(new Event('resize'));
    expect(camera.fov).toBeGreaterThan(WINDOW_FOV_DEG);
    for (const point of mustSee(bed, stage)) expect(onScreen(camera, point).isInView).toBe(true);
    stage.exit();
    camera.aspect = 16 / 9;
    tab.dispatchEvent(new Event('resize'));
    expect(camera.fov).toBeGreaterThan(WINDOW_FOV_DEG);
    stage.enter();
    expect(camera.fov).toBe(WINDOW_FOV_DEG);
  });
});
