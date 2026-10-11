/// <reference types="webxr" />
// T-123: the real PlacementSolver and room adapters (src/room/) on IWER's emulated planes and hit-test. Part of
// TC-E2E-02: each level yields a placed bed. Nothing wires room/ into the app before T-128, so the page loads
// the classes from the dev server and drives them once per XR frame; `room:bedPlaced` is RoomSystem's event and
// is not checked here. Emulator result (E): IWER's planes are not a real room, and this says nothing about a headset.
import { expect, test, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, ROOMS } from './support/iwer';

/** One placement, as the solver gave it. */
interface Placed {
  level: number;
  surfaceId: string | null;
  /** The bed pose, column-major, rounded to a millimetre. */
  pose: number[];
  /** Every `room:placementLevel` of the run, in order. */
  levels: number[];
  /** From `run()` to the bed. */
  ms: number;
  /** The label of the plane the bed is on. */
  surfaceLabel: string | null;
}

type Point = { x: number; y: number; z: number };
interface Emulator {
  activeSession?: XRSession;
  remote: { dispatch(method: string, params?: object): Promise<unknown> };
}

/**
 * Runs the chain in the page's XR session, pinching on every frame as a user who confirms level 3 at once.
 * `lookAt` turns the emulated head to that point first; without it the head looks level down -z.
 */
function placeBed(page: Page, lookAt?: Point): Promise<Placed> {
  return page.evaluate(async (lookAt) => {
    const roomUrl = '/src/room/index.ts';
    const coreUrl = '/src/core/index.ts';
    const { HitTestAdapter, PlaneAdapter, PlacementSolver, PLANE_LEVELS_TIMEOUT_MS } = (await import(
      /* @vite-ignore */ roomUrl
    )) as typeof import('../../src/room/index');
    const { bus } = (await import(/* @vite-ignore */ coreUrl)) as typeof import('../../src/core/index');
    const device = (window as unknown as { IWER_DEVICE: Emulator }).IWER_DEVICE;
    const session = device.activeSession;
    if (!session) throw new Error('placeBed needs an active XR session');
    if (lookAt) await device.remote.dispatch('look_at', { device: 'headset', target: lookAt });
    const space = await session.requestReferenceSpace('local-floor');
    const planes = new PlaneAdapter();
    const hits = new HitTestAdapter();
    const solver = new PlacementSolver(planes, hits); // the page's own flags: forceLevel comes from the URL
    const levels: number[] = [];
    const stopListening = bus.on('room:placementLevel', ({ level }) => levels.push(level));
    const labels = new Map<string, string>();

    const started = performance.now();
    let isPlaced = false;
    const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    const onFrame = (time: number, frame: XRFrame) => {
      if (isPlaced) return;
      planes.setFrame(frame, space);
      hits.setFrame(frame, space);
      for (const plane of planes.read()) labels.set(plane.id, plane.label);
      const head = frame.getViewerPose(space)?.transform.matrix;
      solver.confirm();
      if (head) solver.update(head, time);
      session.requestAnimationFrame(onFrame);
    };
    session.requestAnimationFrame(onFrame);
    const placement = await run;
    isPlaced = true;
    stopListening();
    return {
      level: placement.level,
      surfaceId: placement.surfaceId ?? null,
      pose: Array.from(placement.pose, (value) => Math.round(value * 1000) / 1000 + 0),
      levels,
      ms: Math.round(performance.now() - started),
      surfaceLabel: labels.get(placement.surfaceId ?? '') ?? null,
    };
  }, lookAt);
}

/** A bed straight ahead of the emulator's head (0, 1.6, 0; looking down -z): no turn, 0.45 m forward. */
const aheadAt = (heightM: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, heightM, -0.45, 1];
const EYE_HEIGHT_M = 1.6;
const FLOATING_M = EYE_HEIGHT_M - 0.25; // FR-ROOM-01 level 4

const TABLE_CENTRE = { x: 0, y: 0.74, z: -0.5 }; // of the table room

interface Case {
  room: (typeof ROOMS)[number];
  flags?: string;
  lookAt?: Point;
  level: number;
  levels: number[];
  heightM: number;
  surfaceLabel: string | null;
}

const CASES: Case[] = [
  // The chain as it runs for a user: the six rooms.
  { room: 'table', level: 1, levels: [1], heightM: 0.74, surfaceLabel: 'table' },
  { room: 'tiny', level: 1, levels: [1], heightM: 0.72, surfaceLabel: 'table' },
  { room: 'large', level: 1, levels: [1], heightM: 0.75, surfaceLabel: 'table' },
  { room: 'no-walls', level: 1, levels: [1], heightM: 0.74, surfaceLabel: 'table' },
  { room: 'counter', level: 2, levels: [1, 2], heightM: 0.92, surfaceLabel: 'other' },
  // No planes and nothing for the gaze to hit: 3 s for a plane, 10 s for a pinch on a hit, then the floating bed.
  { room: 'none', level: 4, levels: [1, 3, 4], heightM: FLOATING_M, surfaceLabel: null },
  // forceLevel=N starts the chain at level N (TC-E2E-02).
  { room: 'table', flags: 'forceLevel=1', level: 1, levels: [1], heightM: 0.74, surfaceLabel: 'table' },
  { room: 'table', flags: 'forceLevel=2', level: 2, levels: [2], heightM: 0.74, surfaceLabel: 'table' },
  // Level 3: the head looks down at the table and the pinch confirms where the gaze meets it, 0.5 m away.
  {
    room: 'table',
    flags: 'forceLevel=3',
    lookAt: TABLE_CENTRE,
    level: 3,
    levels: [3],
    heightM: 0.74,
    surfaceLabel: null,
  },
  { room: 'table', flags: 'forceLevel=4', level: 4, levels: [4], heightM: FLOATING_M, surfaceLabel: null },
  // No planes and a level gaze: it meets the far wall at eye height, where a pinch is no confirm. 10 s, then the
  // floating bed.
  { room: 'table', flags: 'noPlanes', level: 4, levels: [3, 4], heightM: FLOATING_M, surfaceLabel: null },
];

for (const { room, flags, lookAt, level, levels, heightM, surfaceLabel } of CASES) {
  const title = flags === undefined ? `the ${room} room` : `the ${room} room with ${flags}`;
  test(`T-123 placement in ${title}: level ${level}, bed 0.45 m ahead at ${heightM} m`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    const offHost = await openApp(page, readRoom(room), flags === undefined ? '/' : `/?flags=${flags}`);
    await enterXR(page);

    const placed = await placeBed(page, lookAt);
    console.log(`T-123 ${title}: ${JSON.stringify(placed)} (emulator)`);
    expect(placed.level).toBe(level);
    expect(placed.levels).toEqual(levels);
    expect(placed.pose).toEqual(aheadAt(heightM));
    expect(placed.surfaceLabel).toBe(surfaceLabel);
    expect(placed.surfaceId === null).toBe(level > 2);
    if (level <= 2) expect(placed.ms).toBeLessThan(3000); // FR-ROOM-01: levels 1 and 2 within 3 s
    // Each wait that ran out took its full time: 3 s for a plane, 10 s for a pinch on a usable hit.
    const planeWaitMs = levels.includes(1) && level > 2 ? 3000 : 0;
    const pinchWaitMs = levels.includes(3) && level === 4 ? 10_000 : 0;
    expect(placed.ms).toBeGreaterThanOrEqual(planeWaitMs + pinchWaitMs);

    expect(pageErrors).toEqual([]);
    expect(offHost).toEqual([]);
  });
}
