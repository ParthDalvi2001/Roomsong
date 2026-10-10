// TC-DEV-0A in the emulator (T-104): the device capability spike page (proto/spike/) fills every result field,
// and no failure of the browser can hold it: a promise that never settles, a declined room, no pinch, a silent
// audio context, a person who leaves. Emulator values: they show that the page works, nothing about a headset.
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { BUILT_PAGE_URL } from '../../playwright.config';
import { ANCHOR_KEY, FEATURES, RUN_LIMIT_MS, VOICE_STEPS } from '../../proto/spike/src/config';

import { openApp, readRoom, xrFrames } from './support/iwer';

import type { Results } from '../../proto/spike/src/probe';

const SPIKE = 'proto/spike/';
const IWER_BUILD = fileURLToPath(new URL('../../node_modules/iwer/build/iwer.min.js', import.meta.url));
// What the emulator grants of FEATURES (tests/e2e/README.md, E0): everything but `layers`.
const GRANTED = [
  'anchors',
  'bounded-floor',
  'hand-tracking',
  'hit-test',
  'local',
  'local-floor',
  'mesh-detection',
  'plane-detection',
  'viewer',
];
const NO_PINCH = 'no pinch in the 8 s window';

/** The part of IWER's XRDevice this spec uses (iwer 2.5.0). */
interface Emulator {
  primaryInputMode: 'controller' | 'hand';
  activeSession?: { end(): Promise<void> };
  remote: { dispatch(method: string, params?: object): Promise<unknown> };
  installRuntime(options: { forceInstall: boolean }): void;
}
type EmulatedPage = {
  IWER: { XRDevice: new (config: unknown) => Emulator; metaQuest3: unknown };
  IWER_DEVICE: Emulator;
  policyViolations: string[];
  /** The suspended-audio test counts the page's calls of AudioContext.resume here. */
  AudioContext: typeof AudioContext;
  resumeCalls: number;
};

const status = (page: Page) => page.getByRole('status');
const startButton = (page: Page) => page.getByRole('button', { name: 'Start' });
const shownRuns = async (page: Page) =>
  JSON.parse(await page.getByLabel('Results JSON').inputValue()) as Results[];
const sessionActive = (page: Page) =>
  page.evaluate(() => (window as unknown as EmulatedPage).IWER_DEVICE.activeSession !== undefined);
/** The person leaves the session by hand. */
const leave = (page: Page) =>
  page.evaluate(() => (window as unknown as EmulatedPage).IWER_DEVICE.activeSession?.end());
const useHands = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as EmulatedPage).IWER_DEVICE.primaryInputMode = 'hand'; // IWER starts on controllers
  });

/** Tap Start and wait until the probe asks for the pinch: by then this visit's anchor handle is stored. */
async function startProbe(page: Page) {
  await startButton(page).click();
  await expect(status(page)).toContainText('Pinch once', { timeout: 20_000 });
}

async function pinchOnce(page: Page) {
  const pinch = (value: number) =>
    page.evaluate(
      (value) =>
        (window as unknown as EmulatedPage).IWER_DEVICE.remote.dispatch('set_select_value', {
          device: 'hand-right',
          value,
        }),
      value,
    );
  await pinch(1);
  await xrFrames(page, 3);
  await pinch(0);
}

test('TC-DEV-0A (emulator) the spike fills every result field and restores its anchor after a reload', async ({
  page,
}) => {
  const room = readRoom('table');

  // First visit: leave as soon as the anchor's handle is stored, as the device script's reload does.
  const firstVisit = await openApp(page, room, `/${SPIKE}`);
  await useHands(page);
  await startProbe(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), ANCHOR_KEY)).not.toBeNull();

  // Second visit. The run that the reload cut short was saved step by step and shows on load.
  const offHost = await openApp(page, room, `/${SPIKE}`);
  expect(await shownRuns(page)).toMatchObject([
    {
      completed: false,
      planes: { count: room.planes.length },
      anchors: { created: true },
      hands: null,
      reasons: { session: 'the run did not finish: the page was closed or reloaded' },
    },
  ]);
  await useHands(page);
  await startProbe(page);
  await pinchOnce(page);
  await expect(status(page)).toHaveText('Done. The results are below.', { timeout: 30_000 });
  expect(await sessionActive(page)).toBe(false); // the probe ended the session itself
  await expect(startButton(page)).toBeEnabled();

  // The answers only a person can give, then Copy: the clipboard holds the JSON of every run.
  await page.getByLabel('Which run was this').selectOption('reload');
  await page.getByLabel('The sound started to crackle at').selectOption('32');
  await page.getByLabel('Room permission on this run').selectOption('allowed');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy JSON' }).click();
  await expect(status(page)).toHaveText('Copied.');
  const runs = JSON.parse(await page.evaluate(() => navigator.clipboard.readText())) as Results[];
  expect(runs).toHaveLength(2);
  const results = runs[1]!;
  console.log(`TC-DEV-0A emulator results ${JSON.stringify(results)}`);

  expect(Object.keys(results)).toEqual([
    'page',
    'startedAt',
    'durationMs',
    'completed',
    'emulator',
    'basics',
    'features',
    'frameRate',
    'planes',
    'meshes',
    'permission',
    'hitTest',
    'anchors',
    'hands',
    'audio',
    'human',
    'reasons',
  ]);
  expect(results).toMatchObject({ completed: true, emulator: 'IWER 2.5.0' });
  expect(results.durationMs).toBeLessThan(RUN_LIMIT_MS);
  expect(results.basics).toMatchObject({ xr: true, immersiveAr: true, immersiveVr: true });
  expect(results.features).toMatchObject({ requested: FEATURES, granted: GRANTED, posesIn: 'local-floor' });
  expect(results.permission).toEqual({
    granted: GRANTED,
    notGranted: FEATURES.filter((feature) => !GRANTED.includes(feature)),
    detectedPlanes: 'populated',
    detectedPlanesAtEnd: 'populated',
    detectedMeshes: 'populated',
    detectedMeshesAtEnd: 'populated',
  });
  expect(results.planes).toMatchObject({
    count: room.planes.length, // about 7 s in
    countAtEnd: room.planes.length,
    labels: [...new Set(room.planes.map((plane) => plane.label))].sort(),
    desk: false, // the emulator has no `desk` label
  });
  // README quirk 2: an emulated table top has +Y pointing down. What a headset does is what the page is for.
  expect(results.planes?.samples.find((sample) => sample.label === 'table')).toEqual({
    label: 'table',
    orientation: 'horizontal',
    plusY: [0, -1, 0],
    position: [0, 0.74, -0.5],
    size: [1.2, 0.8],
  });
  expect(results.meshes).toEqual({ count: 1, countAtEnd: 1, labels: ['global mesh'] });
  expect(results.hitTest).toMatchObject({ height: 0.74 }); // the table top
  expect(results.anchors).toMatchObject({
    created: true,
    tracked: true,
    persistentHandle: true,
    restore: { restored: true, tracked: true, error: null }, // the first visit's handle survived the reload
  });
  expect(results.hands?.sources.map((source) => [source.handedness, source.jointsWithPose])).toEqual([
    ['left', 25],
    ['right', 25],
  ]);
  // README quirk 1: the emulator sends `select` first.
  expect(results.hands?.pinchEvents?.map((event) => event.type)).toEqual([
    'select',
    'selectstart',
    'selectend',
  ]);
  expect(results.frameRate).toMatchObject({ supported: [72, 80, 90, 120], updateTargetFrameRate: true });
  expect(results.frameRate?.measuredFps).toBeGreaterThan(0);
  expect(results.audio).toMatchObject({ state: 'running' });
  expect(results.audio.sampleRate).toBeGreaterThan(0);
  expect(results.audio.pinchToSound?.handlerToOutputMs).toBeGreaterThan(0); // measured, with a running context
  expect(results.audio.polyphony?.map((step) => step.voices)).toEqual(VOICE_STEPS);
  for (const step of results.audio.polyphony ?? []) expect(step.audioMs).toBeGreaterThan(0);
  expect(results.human).toEqual({ run: 'reload', crackleFromVoices: 32, spacePermission: 'allowed' });
  // The one thing the emulator does not have: its XRWebGLLayer has no fixedFoveation.
  expect(results.reasons).toEqual({
    'frameRate.fixedFoveation': 'undefined on the layer',
    'frameRate.fixedFoveationSettable': 'no fixedFoveation on the layer',
  });
  expect([...firstVisit, ...offHost]).toEqual([]); // Golden Rule 9: nothing left localhost
});

test('TC-DEV-0A (emulator) a session that ends early still shows what was measured', async ({ page }) => {
  const room = readRoom('table');
  await openApp(page, room, `/${SPIKE}`);
  await startProbe(page);
  await leave(page);

  await expect(status(page)).toHaveText('Stopped early: the session ended before the probe did');
  await expect(startButton(page)).toBeEnabled();
  const [results] = await shownRuns(page);
  expect(results).toMatchObject({ completed: false, hands: null, planes: { count: room.planes.length } });
  expect(results?.audio.polyphony).toBeNull();
});

test('TC-DEV-0A (emulator) a browser promise that never settles and no pinch: the run still ends by itself', async ({
  page,
}) => {
  await openApp(page, readRoom('table'), `/${SPIKE}`); // IWER starts on controllers: no hand, nobody pinches
  await page.evaluate(() => {
    XRSession.prototype.requestHitTestSource = () => new Promise(() => undefined);
  });
  await startButton(page).click();

  await expect(status(page)).toHaveText('Done. The results are below.', { timeout: 50_000 });
  expect(await sessionActive(page)).toBe(false);
  await expect(startButton(page)).toBeEnabled();
  const [results] = await shownRuns(page);
  expect(results).toMatchObject({
    completed: true,
    hitTest: null,
    anchors: { created: true, tracked: true }, // the steps after the stalled one ran
    hands: { pinchEvents: null },
    audio: { pinchToSound: null },
  });
  expect(results?.audio.polyphony).toHaveLength(VOICE_STEPS.length);
  expect(results?.durationMs).toBeLessThan(RUN_LIMIT_MS);
  expect(results?.reasons).toMatchObject({
    hitTest: 'session.requestHitTestSource timed out after 3 s',
    'hands.pinchEvents': NO_PINCH,
    'audio.pinchToSound': NO_PINCH,
    'hands.sources.0.joints': 'this input source has no hand', // a controller
  });
});

test('TC-DEV-0A (emulator) the run limit ends the session whatever the probe is doing', async ({ page }) => {
  await page.clock.install(); // the page's timers, so that 45 s need not be waited out
  await openApp(page, readRoom('table'), `/${SPIKE}`);
  await startProbe(page);
  await page.clock.fastForward(RUN_LIMIT_MS);

  await expect(status(page)).toHaveText('Stopped early: the probe hit its 45 s limit');
  expect(await sessionActive(page)).toBe(false);
  await expect(startButton(page)).toBeEnabled();
  const [results] = await shownRuns(page);
  expect(results).toMatchObject({ completed: false, frameRate: { updateTargetFrameRate: true } });
});

test('TC-DEV-0A (emulator) no WebGL layer: the frame steps say why and the sound sweep still runs', async ({
  page,
}) => {
  await openApp(page, readRoom('table'), `/${SPIKE}`);
  await page.evaluate(() => {
    (window as unknown as { XRWebGLLayer: unknown }).XRWebGLLayer = class {
      constructor() {
        throw new DOMException('no layer', 'InvalidStateError');
      }
    };
  });
  await startButton(page).click();
  // The sweep's second step: its first ran for 2 s with no frame at all. The other four add nothing here.
  await expect(status(page)).toContainText(`Sound: ${VOICE_STEPS[1]} voices`);
  await leave(page);
  await expect(status(page)).toContainText('Stopped early');

  const [results] = await shownRuns(page);
  const why = 'no XR frames: InvalidStateError: no layer';
  expect(results).toMatchObject({
    features: { granted: GRANTED }, // read before anything that can fail
    frameRate: null,
    planes: null,
    hands: null,
    reasons: { frames: why, frameRate: why, planes: why, meshes: why, hands: why },
  });
});

test('TC-DEV-0A (emulator) a declined room: a set that throws or is missing is reported as that', async ({
  page,
}) => {
  await openApp(page, readRoom('table'), `/${SPIKE}`);
  await page.evaluate(() => {
    const denied = (feature: string) => new DOMException(`${feature} is not enabled`, 'NotSupportedError');
    Object.defineProperty(XRFrame.prototype, 'detectedPlanes', {
      get() {
        throw denied('plane-detection');
      },
    });
    Object.defineProperty(XRFrame.prototype, 'detectedMeshes', { get: () => undefined });
    XRFrame.prototype.createAnchor = () => {
      throw denied('anchors');
    };
    XRSession.prototype.requestHitTestSource = () => Promise.reject(denied('hit-test'));
    // A layer that reports full foveation and ignores writes.
    Object.defineProperty(XRWebGLLayer.prototype, 'fixedFoveation', { get: () => 1, set: () => undefined });
  });
  await startProbe(page);
  await leave(page); // the room has been read by now: the rest of the run adds nothing here
  await expect(status(page)).toContainText('Stopped early');

  const [results] = await shownRuns(page);
  const planes = 'throws NotSupportedError: plane-detection is not enabled';
  expect(results).toMatchObject({
    planes: null,
    meshes: null,
    permission: { detectedPlanes: planes, detectedMeshes: 'missing', detectedPlanesAtEnd: 'not read' },
    hitTest: null,
    anchors: { created: false, tracked: null, persistentHandle: false },
    frameRate: { fixedFoveation: 1, fixedFoveationSettable: false },
  });
  expect(results?.reasons).toMatchObject({
    planes: `frame.detectedPlanes: ${planes}; at the end: not read`,
    meshes: 'frame.detectedMeshes: missing; at the end: not read',
    hitTest: 'NotSupportedError: hit-test is not enabled',
    'anchors.created': 'NotSupportedError: anchors is not enabled',
    'anchors.tracked': 'no anchor was created',
  });
});

test('TC-DEV-0A (emulator) a suspended audio context: pinch-to-sound is null with the reason, never inferred', async ({
  page,
}) => {
  await openApp(page, readRoom('table'), `/${SPIKE}`);
  await useHands(page);
  await page.evaluate(() => {
    const page = window as unknown as EmulatedPage;
    page.resumeCalls = 0;
    // A context that stays suspended whatever the page does.
    page.AudioContext = class extends AudioContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        void this.suspend();
      }
      override resume() {
        page.resumeCalls += 1;
        return Promise.resolve();
      }
    };
    // A layer on which a written foveation value sticks.
    let foveation = 0;
    Object.defineProperty(XRWebGLLayer.prototype, 'fixedFoveation', {
      get: () => foveation,
      set: (value: number) => {
        foveation = value;
      },
    });
  });
  await startProbe(page);
  await pinchOnce(page);
  await expect(status(page)).toContainText('Sound:');
  await leave(page);
  await expect(status(page)).toContainText('Stopped early');

  const [results] = await shownRuns(page);
  expect(await page.evaluate(() => (window as unknown as EmulatedPage).resumeCalls)).toBe(1); // in the tap
  expect(results?.audio).toMatchObject({ state: 'suspended', pinchToSound: null });
  expect(results?.reasons['audio.pinchToSound']).toBe('the audio context is suspended: no click played');
  expect(results?.hands?.pinchEvents).toHaveLength(3); // the pinch itself was seen
  expect(results?.frameRate).toMatchObject({ fixedFoveation: 0, fixedFoveationSettable: true });
});

test('TC-DEV-0A a browser that gives no session gets the reason, not a dead page', async ({ page }) => {
  await page.goto(BUILT_PAGE_URL + SPIKE); // the build has no emulator, and headless Chromium has no headset
  await startButton(page).click();

  await expect(status(page)).toContainText('Stopped early: no immersive-ar session');
  await expect(startButton(page)).toBeEnabled();
  const [results] = await shownRuns(page);
  expect(results).toMatchObject({ completed: false, emulator: null, features: null });
  expect(results?.basics.immersiveAr).toBe(false);
  expect(results?.audio.sampleRate).toBeGreaterThan(0);
});

test('NFR-SEC-01 the built spike page runs its probe with no policy violation and no error', async ({
  page,
}) => {
  // As 04-built-page-policy.spec.ts: the build has no emulator, so IWER is added from node_modules.
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.addInitScript({ path: IWER_BUILD });
  await page.addInitScript(() => {
    const page = window as unknown as EmulatedPage;
    page.policyViolations = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      page.policyViolations.push(`${event.effectiveDirective} blocked ${event.blockedURI}`),
    );
    page.IWER_DEVICE = new page.IWER.XRDevice(page.IWER.metaQuest3);
    page.IWER_DEVICE.installRuntime({ forceInstall: true }); // headless Chromium has a navigator.xr of its own
    page.IWER_DEVICE.primaryInputMode = 'hand';
  });

  await page.goto(BUILT_PAGE_URL + SPIKE);
  const policy = await page.evaluate(
    () => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ?? '',
  );
  expect(policy).toContain("default-src 'self'"); // a page with no policy would pass everything below
  // Up to the pinch prompt the page has used its stylesheet, WebGL, the session, Web Audio and localStorage.
  await startProbe(page);

  expect(await page.evaluate(() => (window as unknown as EmulatedPage).policyViolations)).toEqual([]);
  expect(errors).toEqual([]);
});
