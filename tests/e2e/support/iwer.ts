/// <reference types="webxr" />
// Drives IWER, the WebXR emulator that @iwsdk/vite-plugin-dev injects into the dev page as window.IWER_DEVICE
// (iwer 2.5.0). Three jobs (T-107): open the app in a room fixture, play a hand path, and report what the
// emulator supports. Everything here is emulator behaviour; none of it says anything about a headset.
import { readFileSync } from 'node:fs';

import { roomCapture, type Room } from '../../fixtures/rooms/capture';

import type { JSHandle, Page } from '@playwright/test';

export type { Room };

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

/**
 * Emulator limit for load to an active session; enterXR also waits this long. The product limit is 5 s on a
 * Quest (FR-SYS-06, checked on device by TC-DEV-01). Here software rendering measures the host: 2.6 s when
 * quiet, 5.3 s with other jobs running (BUG-003), so the emulator only guards against a gross regression.
 */
export const SESSION_ENTRY_LIMIT_MS = 10_000;

const readFixture = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../fixtures/${path}.json`, import.meta.url), 'utf8'));
export const readRoom = (name: string) => readFixture(`rooms/${name}`) as Room;
export const readHandPath = (name: string) => readFixture(`handPaths/${name}`) as HandPath;

const iwer = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { IWER_DEVICE?: IwerDevice }).IWER_DEVICE) as Promise<
    JSHandle<IwerDevice>
  >;

// The emulator asks for its room (dev.emulator.environment in iwsdk.config.json) at this path of the dev server,
// where the dev plugin of vite.config.ts serves a fixture (BUG-002: nothing comes from unpkg.com). openApp answers
// it with the test's own fixture instead.
const ROOM_REQUEST = /^https:\/\/localhost:\d+\/__emulator\/rooms\/\w+\.json$/;

/**
 * `E2E_FRAME_MS=250 npx playwright test 12-settings`: while an XR session runs, every animation frame of the page,
 * the emulator's XR frames among them, comes at least that many ms late. A slow host without loading this one
 * (BUG-004); the page loads at full speed, and unset nothing changes.
 */
const FRAME_MS = Number(process.env.E2E_FRAME_MS ?? 0);

/** In the page, before its own scripts: holds each requestAnimationFrame of a session back by `ms`. Cancel works. */
function slowFrames(ms: number): void {
  const request = window.requestAnimationFrame.bind(window);
  const cancel = window.cancelAnimationFrame.bind(window);
  const inSession = () =>
    (window as unknown as { IWER_DEVICE?: IwerDevice }).IWER_DEVICE?.activeSession !== undefined;
  // Held-back frames have negative ids, so they never meet the browser's own.
  const waiting = new Map<number, { timer: number; frame?: number }>();
  let last = 0;
  window.requestAnimationFrame = (callback) => {
    if (!inSession()) return request(callback);
    const id = --last;
    const entry: { timer: number; frame?: number } = { timer: 0 };
    entry.timer = window.setTimeout(() => {
      entry.frame = request((time) => {
        waiting.delete(id);
        callback(time);
      });
    }, ms);
    waiting.set(id, entry);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    const entry = waiting.get(id);
    waiting.delete(id);
    if (entry === undefined) return cancel(id);
    clearTimeout(entry.timer);
    if (entry.frame !== undefined) cancel(entry.frame);
  };
}

/**
 * (a) Open the app with `room` as the emulated room. Resolves once the emulator holds exactly the fixture's
 * planes and meshes, which is always before a session can start. Nothing leaves localhost: the emulator's
 * room request (to the dev server) is answered from the fixture; every HTTP(S) request to another host is aborted,
 * every WebSocket to another host is closed unconnected, and their URLs are returned (the array keeps filling
 * while the page lives).
 * `path` opens another page of the same site, for example '/proto/spike/'.
 * The app itself ('/') opens with the `skipOnboarding` flag added (T-150): a spec about something else is not held
 * up by the tutorial's captions and icons, which wait for the player. `onboarding: true` keeps the tutorial.
 */
export async function openApp(
  page: Page,
  room: Room,
  path = '/',
  { onboarding = false }: { onboarding?: boolean } = {},
): Promise<string[]> {
  if (FRAME_MS > 0) await page.addInitScript(slowFrames, FRAME_MS);
  const offHost: string[] = [];
  const leavesLocalhost = (url: URL) => url.hostname !== 'localhost';
  // page.route does not see WebSockets. A routed socket is never connected to its server.
  await page.routeWebSocket(leavesLocalhost, (socket) => {
    offHost.push(socket.url());
    return socket.close();
  });
  await page.route(leavesLocalhost, (route) => {
    offHost.push(route.request().url());
    return route.abort();
  });
  await page.route(ROOM_REQUEST, (route) => route.fulfill({ json: roomCapture(room) }));
  await page.goto(onboarding ? path : withoutOnboarding(path));
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

/** The app's own page with `skipOnboarding` among its flags; any other page as it is. */
function withoutOnboarding(path: string): string {
  const url = new URL(path, 'http://localhost');
  if (url.pathname !== '/') return path;
  const flags = url.searchParams.get('flags');
  url.searchParams.set(
    'flags',
    flags === null || flags === '' ? 'skipOnboarding' : `${flags},skipOnboarding`,
  );
  return url.pathname + url.search;
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

/** The page's Enter button waits for the world; on software rendering that takes a few seconds. */
export const WORLD_READY_MS = 15_000;

/**
 * Enter the immersive session the way a user does: press the page's own "Enter the garden" button. It is the
 * only way in (`xr.offer` is "none", API_SPEC §1.10 rule 2: no session is offered, so the emulator's own
 * "Enter XR" button has nothing to grant), and the click is what starts the sound. Hands are selected first by
 * default because the app is hands-only; 'controller' is how IWER starts, and what a user holding controllers
 * gets. The press waits for the world (WORLD_READY_MS). Resolves on the first XR frame with IWER's session
 * status; fails if the session is not active SESSION_ENTRY_LIMIT_MS after the press.
 */
export async function enterXR(
  page: Page,
  input: IwerDevice['primaryInputMode'] = 'hand',
): Promise<SessionStatus> {
  const device = await iwer(page);
  await device.evaluate((d, input) => {
    d.primaryInputMode = input;
  }, input);
  const enter = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await enter.click({ timeout: WORLD_READY_MS });
  await page.waitForFunction((d) => d.activeSession !== undefined, device, {
    timeout: SESSION_ENTRY_LIMIT_MS,
  });
  // Checked at every entry (LLD §3.5 a2): with the world ready and a session up, an offer would be pending.
  if (await device.evaluate((d) => d.sessionOffered)) {
    throw new Error('the app offered a session: xr.offer must be "none" in iwsdk.config.json');
  }
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
