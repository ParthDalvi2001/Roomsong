/// <reference types="webxr" />
// Drives IWER, the WebXR emulator that @iwsdk/vite-plugin-dev injects into the dev page as window.IWER_DEVICE
// (iwer 2.5.0). Three jobs (T-107): open the app in a room fixture, play a hand path, and report what the
// emulator supports. Everything here is emulator behaviour; none of it says anything about a headset.
import { readFileSync } from 'node:fs';

import type { JSHandle, Page } from '@playwright/test';

type Vec3 = [x: number, y: number, z: number];
type Quat = [x: number, y: number, z: number, w: number];

// WebXR semantic label -> the label name in the emulator's room capture format. These are the labels the
// emulator can produce ("desk" is not one of them).
const SEM_LABEL = {
  table: 'TABLE',
  floor: 'FLOOR',
  ceiling: 'CEILING',
  wall: 'WALL_FACE',
  couch: 'COUCH',
  door: 'DOOR_FRAME',
  window: 'WINDOW_FRAME',
  shelf: 'STORAGE',
  bed: 'BED',
  screen: 'SCREEN',
  lamp: 'LAMP',
  plant: 'PLANT',
  'wall art': 'WALL_ART',
  'global mesh': 'GLOBAL_MESH',
  other: 'OTHER',
} as const;

// Plane-space orientation for each side a surface can face. In the emulator a plane can only be hit-tested
// from its local -Y side, and its own living_room capture points +Y away from the room on all 17 planes
// (a table top has +Y down), so the fixtures do the same. Whether a headset agrees is not known.
const S = Math.SQRT1_2;
const PLANE_ORIENTATION = {
  '+y': [1, 0, 0, 0],
  '-y': [0, 0, 0, 1],
  '+z': [0, S, -S, 0],
  '-z': [S, 0, 0, S],
  '+x': [0.5, -0.5, 0.5, 0.5],
  '-x': [0.5, 0.5, -0.5, 0.5],
} satisfies Record<string, Quat>;

/** tests/fixtures/rooms/*.json: metres, y up, floor at y = 0, the user at the origin looking down -z. */
export interface Room {
  description: string;
  /** `facing` is the side the room is on; `size` is width x depth (horizontal) or width x height (wall). */
  planes: {
    label: keyof typeof SEM_LABEL;
    facing: keyof typeof PLANE_ORIENTATION;
    center: Vec3;
    size: [number, number];
  }[];
  /** Triangle meshes in room coordinates: xyz triples and index triples. */
  meshes?: { label: keyof typeof SEM_LABEL; vertices: number[]; indices: number[] }[];
}

/** tests/fixtures/handPaths/*.json: where one emulated hand is at each time, in the app's reference space. */
export interface HandPath {
  description: string;
  hand: 'left' | 'right';
  /** The hand moves in a straight line to each frame and arrives at `t` ms; `pinch` (0..1) is set then. */
  frames: {
    t: number;
    /** IWER's hand origin. With no rotation the closed pinch is 2.5 cm below and 1.2 cm in front of it. */
    position: { x: number; y: number; z: number };
    /** Degrees. Roll 0 is palm down. */
    orientation: { pitch?: number; yaw?: number; roll?: number };
    pinch: number;
  }[];
}

/** What the XR session reported while a hand path played. */
export interface HandTrace {
  /** selectstart / selectend of the played hand, with ms since the path started. */
  events: { type: string; t: number }[];
  /** At the end: the up component of the palm normal (1 = palm up, -1 = palm down). */
  palmUp: number;
  /** At the end: thumb tip to index tip, mm. */
  pinchGapMm: number;
}

/** What the emulator supports, measured through WebXR in the running session. */
export interface Capabilities {
  iwer: string;
  features: string[];
  /** The detected planes, read back through WebXR in the fixture's own terms. */
  planes: Room['planes'];
  meshes: { label: string; triangles: number }[];
  /** Height (m) of the first hit of a ray from the head down onto the table room's table; null = no hit. */
  hitTestY: number | null;
  anchor: boolean;
  persistentHandle: boolean;
  handJoints: number;
  /** Session events for one emulated pinch, in the order they arrived. */
  pinchEvents: string[];
  /** Thumb tip to index tip, mm: [open, pinched]. */
  pinchGapMm: [number, number];
}

/** IWER's answer to get_session_status (the fields the tests read). */
export interface SessionStatus {
  sessionActive: boolean;
  sessionMode: 'immersive-ar' | 'immersive-vr' | 'inline' | null;
  visibilityState: string;
}

/** The part of IWER's XRDevice this file uses. */
interface IwerDevice {
  version: string;
  primaryInputMode: 'controller' | 'hand';
  sessionOffered: boolean;
  activeSession?: XRSession;
  /** The emulated room (present when dev.emulator.environment is set in iwsdk.config.json). */
  sem?: { trackedPlanes: Set<{ semanticLabel: string }>; trackedMeshes: Set<{ semanticLabel: string }> };
  remote: { dispatch(method: string, params?: object): Promise<unknown> };
}

export const ROOMS = ['table', 'counter', 'none', 'tiny', 'large', 'no-walls'] as const;

/** FR-SYS-01: load to an active session in at most 5 s. enterXR also waits this long for the session. */
export const SESSION_ENTRY_LIMIT_MS = 5_000;

const readFixture = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../fixtures/${path}.json`, import.meta.url), 'utf8'));
export const readRoom = (name: string) => readFixture(`rooms/${name}`) as Room;
export const readHandPath = (name: string) => readFixture(`handPaths/${name}`) as HandPath;

const iwer = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { IWER_DEVICE?: IwerDevice }).IWER_DEVICE) as Promise<
    JSHandle<IwerDevice>
  >;

// The emulator downloads its room (dev.emulator.environment in iwsdk.config.json) from this address on every
// page load. openApp answers that request with the fixture instead, in the emulator's capture format (read
// from the @iwer/sem 2.5.0 code inside @iwsdk/vite-plugin-dev 1.0.1, a version package.json pins exactly).
const ROOM_REQUEST = /^https:\/\/www\.unpkg\.com\/@iwer\/sem@[^/]+\/captures\/\w+\.json$/;

function roomCapture(room: Room) {
  const base64 = (data: Float32Array | Uint32Array) => Buffer.from(data.buffer).toString('base64');
  const at = ([x, y, z]: Vec3, [qx, qy, qz, qw]: Quat) => ({
    position: { x, y, z },
    orientation: { x: qx, y: qy, z: qz, w: qw },
  });
  return {
    spatialEntities: [
      ...room.planes.map(({ label, facing, center, size: [width, height] }, i) => ({
        uuid: `plane-${i}`,
        semanticLabel_META: SEM_LABEL[label],
        locatable_META: at(center, PLANE_ORIENTATION[facing]),
        bounded2D_META: { offset: { x: -width / 2, y: -height / 2 }, extent: { width, height } },
      })),
      ...(room.meshes ?? []).map(({ label, vertices, indices }, i) => ({
        uuid: `mesh-${i}`,
        semanticLabel_META: SEM_LABEL[label],
        locatable_META: at([0, 0, 0], [0, 0, 0, 1]),
        triangleMesh_META: {
          vertices: base64(new Float32Array(vertices)),
          indices: base64(new Uint32Array(indices)),
        },
      })),
    ],
  };
}

/**
 * (a) Open the app with `room` as the emulated room. Resolves once the emulator holds exactly the fixture's
 * planes and meshes, which is always before a session can start. Nothing leaves localhost: the emulator's
 * room request is answered from the fixture; every other HTTP(S) request is aborted, every WebSocket to
 * another host is closed unconnected, and their URLs are returned (the array keeps filling while the page lives).
 * `path` opens another page of the same site, for example '/proto/spike/'.
 */
export async function openApp(page: Page, room: Room, path = '/'): Promise<string[]> {
  const offHost: string[] = [];
  const leavesLocalhost = (url: URL) => url.hostname !== 'localhost';
  // page.route does not see WebSockets. A routed socket is never connected to its server.
  await page.routeWebSocket(leavesLocalhost, (socket) => {
    offHost.push(socket.url());
    return socket.close();
  });
  await page.route(leavesLocalhost, (route) => {
    const url = route.request().url();
    if (ROOM_REQUEST.test(url)) {
      return route.fulfill({ json: roomCapture(room), headers: { 'access-control-allow-origin': '*' } });
    }
    offHost.push(url);
    return route.abort();
  });
  await page.goto(path);
  const want = [
    ...room.planes.map((plane) => `plane:${plane.label}`),
    ...(room.meshes ?? []).map((mesh) => `mesh:${mesh.label}`),
  ];
  await page
    .waitForFunction(
      // Not async: waitForFunction takes a returned promise as "true".
      ([device, want]) =>
        device.sem !== undefined &&
        [
          ...[...device.sem.trackedPlanes].map((plane) => `plane:${plane.semanticLabel}`),
          ...[...device.sem.trackedMeshes].map((mesh) => `mesh:${mesh.semanticLabel}`),
        ].join() === want,
      [await iwer(page), want.join()] as const,
      { timeout: 10_000 },
    )
    .catch((cause: unknown) => {
      throw new Error(`The emulator did not load the room fixture as written: ${String(cause)}`);
    });
  return offHost;
}

/** Resolves after `count` more XR frames of the running session: time for the app to react, with no sleep. */
export async function xrFrames(page: Page, count: number): Promise<void> {
  const device = await iwer(page);
  await device.evaluate((d, count) => {
    return new Promise<void>((done, fail) => {
      const next = (left: number) => {
        if (left === 0) done();
        else if (!d.activeSession) fail(new Error('xrFrames needs an active XR session'));
        else d.activeSession.requestAnimationFrame(() => next(left - 1));
      };
      next(count);
    });
  }, count);
}

/**
 * Enter the immersive session the way a user does in the emulator: press its "Enter XR" button, the
 * stand-in for the browser's own prompt for the session the app offers. Hands are selected first by default
 * because the app is hands-only; 'controller' is how IWER starts, and what a user holding controllers gets.
 * Resolves on the first XR frame with IWER's session status; fails if the session is not active
 * SESSION_ENTRY_LIMIT_MS after the press.
 */
export async function enterXR(
  page: Page,
  input: IwerDevice['primaryInputMode'] = 'hand',
): Promise<SessionStatus> {
  const device = await iwer(page);
  await page.waitForFunction((d) => d.sessionOffered, device);
  await device.evaluate((d, input) => {
    d.primaryInputMode = input;
  }, input);
  await page.getByRole('button', { name: 'Enter XR' }).click();
  await page.waitForFunction((d) => d.activeSession !== undefined, device, {
    timeout: SESSION_ENTRY_LIMIT_MS,
  });
  await xrFrames(page, 1);
  return device.evaluate((d) => d.remote.dispatch('get_session_status') as Promise<SessionStatus>);
}

/** (b) Play a hand path in the running session through IWER's remote control; resolves when it has ended. */
export async function playHandPath(page: Page, path: HandPath): Promise<HandTrace> {
  const device = await iwer(page);
  return device.evaluate(async (d, { hand, frames }) => {
    const session = d.activeSession;
    if (!session) throw new Error('playHandPath needs an active XR session');
    const space = await session.requestReferenceSpace('local-floor');
    const started = performance.now();
    const events: HandTrace['events'] = [];
    const onSelect = (event: XRInputSourceEvent) => {
      if (event.inputSource.handedness === hand) {
        events.push({ type: event.type, t: Math.round(performance.now() - started) });
      }
    };
    session.addEventListener('selectstart', onSelect);
    session.addEventListener('selectend', onSelect);

    let last = 0;
    for (const { t, position, orientation, pinch } of frames) {
      const target = { device: `hand-${hand}`, position, orientation, duration: (t - last) / 1000 };
      await d.remote.dispatch('animate_to', target);
      await d.remote.dispatch('set_select_value', { device: target.device, value: pinch });
      last = t;
    }

    // The last pinch value reaches the session on the frame after it was set; read the hand one frame later.
    const end = await new Promise<Pick<HandTrace, 'palmUp' | 'pinchGapMm'>>((resolve, reject) => {
      session.requestAnimationFrame(() =>
        session.requestAnimationFrame((_time, frame) => {
          const joints = [...session.inputSources].find((source) => source.handedness === hand)?.hand;
          const at = (joint: XRHandJoint) => {
            const jointSpace = joints?.get(joint);
            return (jointSpace && frame.getJointPose?.(jointSpace, space))?.transform.position;
          };
          const [wrist, index, pinky] = [
            at('wrist'),
            at('index-finger-metacarpal'),
            at('pinky-finger-metacarpal'),
          ];
          const [thumbTip, indexTip] = [at('thumb-tip'), at('index-finger-tip')];
          if (!wrist || !index || !pinky || !thumbTip || !indexTip) {
            reject(new Error(`the ${hand} hand has no joint poses`));
            return;
          }
          // Palm normal = (wrist -> index knuckle) x (wrist -> pinky knuckle), mirrored for the left hand.
          const [ax, ay, az] = [index.x - wrist.x, index.y - wrist.y, index.z - wrist.z];
          const [bx, by, bz] = [pinky.x - wrist.x, pinky.y - wrist.y, pinky.z - wrist.z];
          const normal = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx] as const;
          const side = hand === 'right' ? 1 : -1;
          resolve({
            palmUp: Math.round((side * normal[1] * 100) / Math.hypot(...normal)) / 100,
            pinchGapMm: Math.round(
              1000 * Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y, thumbTip.z - indexTip.z),
            ),
          });
        }),
      );
    });
    session.removeEventListener('selectstart', onSelect);
    session.removeEventListener('selectend', onSelect);
    return { events, ...end };
  }, path);
}

/** (c) Report what the emulator supports. Needs the session of enterXR; written for the table room. */
export async function probeCapabilities(page: Page): Promise<Capabilities> {
  const device = await iwer(page);
  return device.evaluate(async (d) => {
    const session = d.activeSession;
    if (!session) throw new Error('probeCapabilities needs an active XR session');
    const floor = await session.requestReferenceSpace('local-floor');
    const viewer = await session.requestReferenceSpace('viewer');
    // An XRFrame is only valid inside its callback, so every reading goes through here.
    const onFrame = <T>(read: (frame: XRFrame) => T) =>
      new Promise<T>((resolve, reject) => {
        session.requestAnimationFrame((_time, frame) => {
          try {
            resolve(read(frame));
          } catch (error) {
            reject(new Error(String(error)));
          }
        });
      });

    const scene = await onFrame((frame) => ({
      planes: [...(frame.detectedPlanes ?? [])].map((plane) => {
        const matrix = frame.getPose(plane.planeSpace, floor)?.transform.matrix;
        const at = (index: number) => Math.round((matrix?.[index] ?? NaN) * 1000) / 1000;
        const span = (values: number[]) =>
          Math.round((Math.max(...values) - Math.min(...values)) * 1000) / 1000;
        // The room is on the plane's local -Y side: matrix column 1, negated, is the way the surface faces.
        const axis = [0, 1, 2].find((i) => Math.abs(at(4 + i)) === 1) ?? 0;
        return {
          label: plane.semanticLabel,
          facing: `${at(4 + axis) < 0 ? '+' : '-'}${'xyz'.charAt(axis)}`,
          center: [at(12), at(13), at(14)],
          size: [span(plane.polygon.map((point) => point.x)), span(plane.polygon.map((point) => point.z))],
        };
      }) as Room['planes'],
      meshes: [...(frame.detectedMeshes ?? [])].map((mesh) => ({
        label: mesh.semanticLabel ?? '',
        triangles: mesh.indices.length / 3,
      })),
    }));

    // From the head (0, 1.6, 0) this ray meets the table top of the table room at its centre.
    const ray = new XRRay({ x: 0, y: 0, z: 0 }, { x: 0, y: -0.86, z: -0.5 });
    const hitSource = await session.requestHitTestSource?.({ space: viewer, offsetRay: ray });
    await onFrame(() => undefined); // results exist from the frame after the request
    const hitTestY = await onFrame((frame) => {
      const y = hitSource && frame.getHitTestResults(hitSource)[0]?.getPose(floor)?.transform.position.y;
      return y === undefined ? null : Math.round(y * 100) / 100;
    });

    const anchor = await onFrame((frame) =>
      frame.createAnchor?.(new XRRigidTransform({ x: 0, y: 1, z: -0.5 }), floor),
    );
    const anchorTracked = await onFrame((frame) => anchor !== undefined && frame.trackedAnchors?.has(anchor));
    const handle = await anchor?.requestPersistentHandle?.();
    const restored = handle === undefined ? undefined : await session.restorePersistentAnchor?.(handle);
    if (handle !== undefined) await session.deletePersistentAnchor?.(handle);

    const hand = [...session.inputSources].find((source) => source.handedness === 'right')?.hand;
    const tip = (frame: XRFrame, joint: XRHandJoint) => {
      const jointSpace = hand?.get(joint);
      return (jointSpace && frame.getJointPose?.(jointSpace, floor))?.transform.position;
    };
    const handJoints = await onFrame(
      (frame) => [...(hand?.values() ?? [])].filter((joint) => frame.getJointPose?.(joint, floor)).length,
    );
    const pinchGapMm = () =>
      onFrame((frame) => {
        const [a, b] = [tip(frame, 'thumb-tip'), tip(frame, 'index-finger-tip')];
        return a && b ? Math.round(1000 * Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)) : NaN;
      });
    const pinchEvents: string[] = [];
    const onSelect = (event: XRInputSourceEvent) => pinchEvents.push(event.type);
    const selectEvents = ['selectstart', 'select', 'selectend'] as const;
    selectEvents.forEach((type) => session.addEventListener(type, onSelect));
    const open = await pinchGapMm();
    await d.remote.dispatch('set_select_value', { device: 'hand-right', value: 1 });
    const pinched = await pinchGapMm();
    await d.remote.dispatch('set_select_value', { device: 'hand-right', value: 0 });
    await onFrame(() => undefined); // selectend arrives on the frame after the release
    selectEvents.forEach((type) => session.removeEventListener(type, onSelect));

    return {
      iwer: d.version,
      features: [...(session.enabledFeatures ?? [])].sort(),
      ...scene,
      hitTestY,
      anchor: anchorTracked === true,
      persistentHandle: restored !== undefined,
      handJoints,
      pinchEvents,
      pinchGapMm: [open, pinched],
    };
  });
}
