// E0, the IWER feature report of PLAN_AMENDMENT_2026-10-10: what the emulator supports, measured. Also the
// self-test of support/iwer.ts. tests/e2e/README.md carries the same facts in a table: change both together.
import { expect, test } from '@playwright/test';

import {
  enterXR,
  openApp,
  playHandPath,
  probeCapabilities,
  readHandPath,
  readRoom,
  ROOMS,
} from './support/iwer';

test('E0 every room fixture loads into the emulator', async ({ page }) => {
  for (const name of ROOMS) {
    // openApp resolves only when the emulator holds exactly the fixture's planes and meshes, labels included.
    await openApp(page, readRoom(name));
  }
});

test('E0 the emulator supports planes, labels, meshes, hit-test, anchors, hand joints and pinch', async ({
  page,
}) => {
  const room = readRoom('table');
  await openApp(page, room);
  await enterXR(page);

  const capabilities = await probeCapabilities(page);
  console.log(`E0 capabilities ${JSON.stringify(capabilities)}`);

  expect(capabilities).toEqual({
    iwer: '2.5.0',
    features: [
      'anchors',
      'bounded-floor',
      'hand-tracking',
      'hit-test',
      'local',
      'local-floor',
      'mesh-detection',
      'plane-detection',
      'viewer',
    ],
    planes: room.planes, // every label, centre, size and facing comes back as the fixture wrote it
    meshes: [{ label: 'global mesh', triangles: 2 }],
    hitTestY: 0.74, // the table top: fixture planes are hittable from the room side
    anchor: true,
    persistentHandle: true,
    handJoints: 25,
    pinchEvents: ['select', 'selectstart', 'selectend'], // IWER sends select at pinch start, not at release
    pinchGapMm: [94, 2], // spec thresholds: enter < 20 mm, release > 32 mm
  });
});

test('E0 hand paths: pinch selects once, palm-up ends within 35 degrees of up', async ({ page }) => {
  await openApp(page, readRoom('table'));
  await enterXR(page);

  const pinch = await playHandPath(page, readHandPath('pinch'));
  console.log(`E0 pinch path ${JSON.stringify(pinch)}`);
  expect(pinch.events.map((event) => event.type)).toEqual(['selectstart', 'selectend']);
  const [start, end] = pinch.events;
  expect(end!.t - start!.t).toBeGreaterThanOrEqual(200); // nominal hold 300 ms, less one frame either side
  expect(pinch.pinchGapMm).toBeGreaterThan(32); // released again
  expect(pinch.palmUp).toBeLessThan(0); // palm stays down

  const palmUp = await playHandPath(page, readHandPath('palm-up'));
  console.log(`E0 palm-up path ${JSON.stringify(palmUp)}`);
  expect(palmUp.events).toEqual([]);
  expect(palmUp.palmUp).toBeGreaterThanOrEqual(Math.cos((35 * Math.PI) / 180)); // FR-HND-05
});
