/// <reference types="webxr" />
// T-126: the landing page (UX §3.1; FR-SYS-01, FR-SYS-03) and TC-E2E-11 (NFR-FOV-01: a caption stays inside the FoV
// box while the head turns, read from the caption system's own report). Emulator results (E): they say nothing
// about a headset, and nothing about how the page or a caption looks.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { BUILT_PAGE_URL } from '../../playwright.config';

import { openApp, readRoom, SESSION_ENTRY_LIMIT_MS, xrFrames } from './support/iwer';

const WORLD_READY_MS = 15_000; // the Enter button waits for the world; software rendering takes a few seconds
const HANDS_OFF =
  'The garden did not open. Say yes when the headset asks, and check that hand tracking is on: Settings, Movement tracking, Hand tracking.';
const WINDOW =
  'The garden opens in this tab: a click or a tap is a pinch. Height and settings need a headset.';
const LOAD_FAILED = 'The garden could not load. Reload the page.';
const TOGGLES = [
  ['One hand', 'oneHand'],
  ['No hands: look to select', 'gazeDwell'],
  ['High contrast', 'highContrast'],
  ['Reduce motion', 'reducedMotion'],
] as const;

/** The part of IWER's XRDevice this spec uses (iwer 2.5.0). */
interface Device {
  primaryInputMode: 'controller' | 'hand';
  supportedFeatures: string[];
  /** The headset's orientation. */
  quaternion: { x: number; y: number; z: number; w: number };
  activeSession?: XRSession;
  remote: { dispatch(method: string, params?: object): Promise<unknown> };
}
type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Ui = typeof import('../../src/ui/index');
type Render = typeof import('../../src/render/index');
/** IWSDK 1.0.1 puts its dev runtime on the page in a dev build; the app's world is a field of it. */
interface DevPage {
  FRAMEWORK_MCP_RUNTIME: { world: import('@iwsdk/core').World };
}
/** What the caption test holds in the page: the system and its report, its quad, what one frame drew, and two levers. */
interface CaptionProbe {
  captions: InstanceType<Ui['CaptionSystem']>;
  /** The caption's quad in the scene: Three.js counts each upload of its canvas in `map.version`. */
  mesh: {
    quaternion: { x: number; y: number; z: number; w: number };
    material: { map: { version: number } };
  };
  info: { render: { calls: number; triangles: number } };
  raise(): void;
  set(patch: Partial<ReturnType<Core['settings']['get']>>): void;
  /** The session's own tuning ripple and its captions are over (T-142; it runs from T-128d on). */
  quiet(): boolean;
  /** Turns frustum culling off for every mesh of the scene. */
  noCull(): void;
}

const device = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { IWER_DEVICE?: Device }).IWER_DEVICE) as Promise<
    JSHandle<Device>
  >;
const landing = (page: Page) => page.getByRole('main');
const enterButton = (page: Page) => landing(page).getByRole('button', { name: 'Enter the garden' });
const status = (page: Page) => landing(page).getByRole('status');
const deviceRows = (page: Page) => landing(page).getByRole('list').first().getByRole('listitem');

/** Console errors and page errors from now on. */
function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

/** Core's settings store, read in the page: the dev server gives the test the module the app itself loaded. */
const readSettings = (page: Page) =>
  page.evaluate(async () => {
    const url = '/src/core/index.ts';
    const core = (await import(/* @vite-ignore */ url)) as Core;
    return { ...core.settings.get() };
  });

/** Presses the page's own Enter button with hands selected, and waits for the session's first frames. */
async function enterFromLanding(page: Page): Promise<JSHandle<Device>> {
  const d = await device(page);
  await d.evaluate((d) => {
    d.primaryInputMode = 'hand';
  });
  await enterButton(page).click({ timeout: WORLD_READY_MS });
  await page.waitForFunction((d) => d.activeSession !== undefined, d, { timeout: SESSION_ENTRY_LIMIT_MS });
  await xrFrames(page, 5);
  return d;
}

test('landing page: name, Enter, device support, toggles and Help, all by keyboard; no error, nothing off localhost', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));

  await expect(landing(page).getByRole('heading', { level: 1 })).toHaveText('Roomsong');
  await expect(landing(page).getByText('Grow a song on your table.')).toBeVisible();
  await expect(enterButton(page)).toBeEnabled({ timeout: WORLD_READY_MS });
  await expect(status(page)).toHaveText('');
  // Before a session only immersive AR can be known; the page says so for the rest.
  await expect(deviceRows(page)).toHaveText([
    'Mixed reality: supported.',
    'Hand tracking: checked when you enter. Roomsong cannot start without it.',
    'Table detection: checked when you enter. Without it the garden asks you where to put it, or floats in front of you.',
    'Saved position: checked when you enter. Without it the garden is placed again on each visit.',
  ]);
  // The other words UX §9.7 changed: the heading of the toggles, the last two Help steps, the privacy line.
  await expect(landing(page).getByRole('group', { name: 'Accessibility' })).toBeVisible();
  await expect(
    landing(page).getByText(
      'Your garden is saved in this browser, on this device only. What the headset shares about your room and your hands stays on the device: nothing is sent anywhere.',
    ),
  ).toBeVisible();

  // Keyboard: Enter, then the four toggles, then Help, in reading order, each with a visible focus ring.
  await enterButton(page).focus();
  for (const [label] of TOGGLES) {
    await page.keyboard.press('Tab');
    await expect(landing(page).getByLabel(label)).toBeFocused();
    await expect(landing(page).getByLabel(label)).toHaveCSS('outline-style', 'solid');
  }
  await page.keyboard.press('Space');
  await expect(landing(page).getByLabel('Reduce motion')).toBeChecked();
  expect(await readSettings(page)).toMatchObject({ reducedMotion: true });
  await page.keyboard.press('Tab');
  const help = landing(page).getByText('Help', { exact: true });
  await expect(help).toBeFocused();
  const firstStep = landing(page).getByText('Sit at a table and put the controllers down.', { exact: false });
  await expect(firstStep).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(firstStep).toBeVisible();
  const steps = landing(page).getByRole('list').last().getByRole('listitem');
  expect(await steps.count()).toBeGreaterThanOrEqual(3);
  expect(await steps.count()).toBeLessThanOrEqual(5); // the four steps and where settings are (T-167, D-060 (9))
  await expect(steps.last()).toContainText('For settings, turn the back of your left hand');

  await page.screenshot({ path: '.tmp/landing.png', fullPage: true });
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('landing page: each access toggle changes core settings, and follows them', async ({ page }) => {
  const errors = watch(page);
  await openApp(page, readRoom('none'));
  expect(await readSettings(page)).toMatchObject({
    oneHand: false,
    gazeDwell: false,
    highContrast: false,
    reducedMotion: false,
  });

  for (const [label, key] of TOGGLES) {
    await landing(page).getByLabel(label).check();
    expect(await readSettings(page), label).toMatchObject({ [key]: true });
    await landing(page).getByLabel(label).uncheck();
    expect(await readSettings(page), label).toMatchObject({ [key]: false });
  }

  // The other way: the store changes (what src/index.ts does with a loaded save, API_SPEC §2) and the boxes follow.
  await page.evaluate(async () => {
    const url = '/src/core/index.ts';
    const core = (await import(/* @vite-ignore */ url)) as Core;
    core.settings.set({ oneHand: true, highContrast: true });
  });
  await expect(landing(page).getByLabel('One hand')).toBeChecked();
  await expect(landing(page).getByLabel('High contrast')).toBeChecked();
  await expect(landing(page).getByLabel('No hands: look to select')).not.toBeChecked();
  // TODO(T-128): the toggles survive a reload once persistence saves `settings:changed` and src/index.ts seeds the
  // store from the save. Core's store itself saves nothing (API_SPEC §2), so there is no reload case here yet.
  expect(errors).toEqual([]);
});

test('landing page: Enter starts an immersive-ar session, the page steps aside and then reports what was granted', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  // What every other module hears: one start and one end for each session (API_SPEC §2).
  const heard = await page.evaluateHandle(async () => {
    const url = '/src/core/index.ts';
    const core = (await import(/* @vite-ignore */ url)) as Core;
    const heard = { starts: 0, ends: 0 };
    core.bus.on('xr:sessionStart', () => heard.starts++);
    core.bus.on('xr:sessionEnd', () => heard.ends++);
    return heard;
  });
  // Three.js can report the end of a session whose start it never announced (one that ends while it is being set
  // up). Planted here: no module may hear an end without its start.
  await expect(enterButton(page)).toBeEnabled({ timeout: WORLD_READY_MS });
  await page.evaluate(() => {
    const { world } = (window as unknown as DevPage).FRAMEWORK_MCP_RUNTIME;
    world.renderer.xr.dispatchEvent({ type: 'sessionend' });
  });
  expect(await heard.jsonValue()).toEqual({ starts: 0, ends: 0 });
  const started = Date.now();
  const d = await enterFromLanding(page);
  console.log(`T-126 Enter click to session ${Date.now() - started} ms (emulator, software rendering)`);

  expect(await d.evaluate((d) => d.remote.dispatch('get_session_status'))).toMatchObject({
    sessionActive: true,
    sessionMode: 'immersive-ar',
    visibilityState: 'visible',
  });
  await expect(landing(page)).toBeHidden();
  expect(await heard.jsonValue()).toEqual({ starts: 1, ends: 0 });

  await d.evaluate((d) => d.activeSession?.end());
  await expect(landing(page)).toBeVisible();
  await expect(status(page)).toHaveText('');
  await expect(enterButton(page)).toBeEnabled();
  await expect(enterButton(page)).toBeFocused(); // a keyboard user is back on the control they left by
  expect(await heard.jsonValue()).toEqual({ starts: 1, ends: 1 });
  // The emulator grants everything the app asks for.
  await expect(deviceRows(page)).toHaveText([
    'Mixed reality: supported.',
    'Hand tracking: on.',
    'Table detection: on. The garden looks for your table.',
    'Saved position: on. The garden can come back to the same spot.',
  ]);

  // In again and out again: still one of each per session.
  await enterFromLanding(page);
  await expect(landing(page)).toBeHidden();
  await d.evaluate((d) => d.activeSession?.end());
  await expect(landing(page)).toBeVisible();
  expect(await heard.jsonValue()).toEqual({ starts: 2, ends: 2 });
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('landing page: a world that cannot load says so and offers no Enter', async ({ page }) => {
  const errors = watch(page);
  // The scene file never arrives: World.create rejects.
  await page.route('**/main.iwsdk.scene.json*', (route) => route.abort());
  await openApp(page, readRoom('none'));

  await expect(status(page)).toHaveText(LOAD_FAILED, { timeout: WORLD_READY_MS });
  await expect(enterButton(page)).toBeDisabled();
  await expect(landing(page).getByLabel('High contrast')).toBeEnabled();
  // Logged through core's log, not left as an unhandled rejection (which would be a bare "TypeError: ...").
  expect(errors.filter((line) => line.startsWith('[app] the world could not load'))).toHaveLength(1);
  expect(errors.filter((line) => /^\w*Error: /.test(line))).toEqual([]);
});

test('landing page: an entry path that throws leaves Enter usable', async ({ page }) => {
  const errors = watch(page);
  await openApp(page, readRoom('none'));
  await expect(enterButton(page)).toBeEnabled({ timeout: WORLD_READY_MS });
  // A planted bug: the first session request throws inside the click.
  await page.evaluate(() => {
    const { world } = (window as unknown as DevPage).FRAMEWORK_MCP_RUNTIME;
    const launch = world.launchXR.bind(world);
    world.launchXR = () => {
      world.launchXR = launch;
      throw new Error('planted');
    };
  });

  await enterButton(page).click();
  await expect(status(page)).toHaveText(HANDS_OFF);
  await expect(enterButton(page)).toBeEnabled();
  expect(errors).toHaveLength(2);
  expect(errors[0]).toContain('[ui] Enter failed');
  expect(errors[0]).toContain('planted');
  expect(errors[1]).toBe('[ui] E_HANDS_UNAVAILABLE');

  // The next press goes through: the page did not stay "entering".
  await enterFromLanding(page);
  await expect(landing(page)).toBeHidden();
  expect(errors).toHaveLength(2);
});

test('landing page: a refused session says how to turn hand tracking on, and Enter works once it is on (FR-SYS-03)', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('table'));
  const d = await device(page);
  // A headset with hand tracking switched off refuses a session that requires it.
  await d.evaluate((d) => d.supportedFeatures.splice(d.supportedFeatures.indexOf('hand-tracking'), 1));

  await enterButton(page).click({ timeout: WORLD_READY_MS });
  await expect(status(page)).toHaveText(HANDS_OFF);
  expect(await d.evaluate((d) => d.activeSession === undefined)).toBe(true);
  await expect(landing(page)).toBeVisible();
  await expect(enterButton(page)).toBeEnabled();
  // Two expected lines: IWSDK logs the refusal itself, and the page logs its error code (API_SPEC §5).
  expect(errors).toHaveLength(2);
  expect(errors[0]).toContain('[XR] Failed to start XR session');
  expect(errors[1]).toBe('[ui] E_HANDS_UNAVAILABLE');

  await d.evaluate((d) => d.supportedFeatures.push('hand-tracking'));
  await enterFromLanding(page);
  await expect(landing(page)).toBeHidden();
  await d.evaluate((d) => d.activeSession?.end());
  await expect(status(page)).toHaveText('');
  expect(errors).toHaveLength(2);
});

test('landing page, built: without immersive AR it offers the garden window (T-114b); no policy violation, no request off site', async ({
  page,
}) => {
  // The production build in plain headless Chromium, which has WebXR but no immersive-ar: a desktop visitor.
  const errors = watch(page);
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { policyViolations: string[] }).policyViolations = violations;
    document.addEventListener('securitypolicyviolation', (event) =>
      violations.push(`${event.effectiveDirective} blocked ${event.blockedURI}`),
    );
  });
  await page.goto(BUILT_PAGE_URL);

  await expect(status(page)).toHaveText(WINDOW, { timeout: WORLD_READY_MS });
  await expect(enterButton(page)).toBeEnabled();
  // The headset's features are not the window's: the section is left out, so nothing says "not supported".
  await expect(deviceRows(page).first()).toBeHidden();
  await expect(landing(page).getByLabel('High contrast')).toBeEnabled(); // the toggles do not need a headset
  // The style sheet got through the policy: the page is laid out, not a bare list.
  await expect(enterButton(page)).toHaveCSS('border-radius', '24px');

  await page.screenshot({ path: '.tmp/landing-no-ar.png', fullPage: true });
  // The window opens on the built page too, under its policy; its close button is laid out by the page's sheet.
  await enterButton(page).click();
  await expect(page.getByRole('button', { name: 'Close the garden' })).toHaveCSS('border-radius', '24px');
  const violations = await page.evaluate(
    () => (window as unknown as { policyViolations: string[] }).policyViolations,
  );
  expect(violations).toEqual([]);
  expect(errors).toEqual([]);
  expect(requests.filter((url) => !url.startsWith(BUILT_PAGE_URL) && !url.startsWith('data:'))).toEqual([]);
});

test('TC-E2E-11 a caption is drawn in the scene and stays inside 25 by 20 degrees while the head turns', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  const d = await enterFromLanding(page);

  // The app's own CaptionSystem (src/app.ts registers it at 60), on the app's own world (IWSDK's dev-build
  // hook). The test raises a caption the way any module does: an entity with a Caption component.
  const probe = await page.evaluateHandle(async () => {
    const [coreUrl, componentsUrl, uiUrl] = [
      '/src/core/index.ts',
      '/src/core/components.ts',
      '/src/ui/index.ts',
    ];
    const core = (await import(/* @vite-ignore */ coreUrl)) as Core;
    const { Caption } = (await import(/* @vite-ignore */ componentsUrl)) as Components;
    const ui = (await import(/* @vite-ignore */ uiUrl)) as Ui;
    const { world } = (window as unknown as DevPage).FRAMEWORK_MCP_RUNTIME;
    if (!world.hasSystem(ui.CaptionSystem)) throw new Error('src/app.ts did not register CaptionSystem');
    const raise = () => {
      const expiresAt = core.clock.now() + 50_000;
      world.createEntity().addComponent(Caption, { key: 'rippleCeiling', expiresAt });
    };
    // A private field of TuningRippleSystem: its renderer's quads.
    const renderUrl = '/src/render/index.ts';
    const render = (await import(/* @vite-ignore */ renderUrl)) as Render;
    const { ripple } = world.getSystem(render.TuningRippleSystem) as unknown as {
      ripple: { meshes: readonly { visible: boolean }[] };
    };
    const captions = world.getSystem(ui.CaptionSystem) as CaptionProbe['captions'];
    const held: CaptionProbe = {
      captions,
      mesh: world.scene.getObjectByName('caption') as unknown as CaptionProbe['mesh'],
      info: world.renderer.info,
      raise,
      set: (patch) => core.settings.set(patch),
      quiet: () => captions.shown === null && !ripple.meshes.some((mesh) => mesh.visible),
      noCull: () => world.scene.traverse((object) => void (object.frustumCulled = false)),
    };
    return held;
  });
  await xrFrames(page, 2);
  // The app's garden tunes the room at the bed's placement: its ripple and captions go first (T-128d).
  await page.waitForFunction((p) => p.quiet(), probe, { timeout: 20_000 });
  // Every mesh drawn whenever it is visible: the head turns between the two counts, and a mesh of the live garden
  // near the edge of the emulated view (the Listen orb) would leave the count as the caption joins it.
  await probe.evaluate((p) => p.noCull());
  const before = await probe.evaluate((p) => ({ ...p.info.render }));
  await probe.evaluate((p) => p.raise());
  await page.waitForFunction((p) => p.captions.shown === 'rippleCeiling', probe);
  /** How often the caption's canvas has been sent to the graphics card. */
  const uploads = () => probe.evaluate((p) => p.mesh.material.map.version);

  /** Turns the emulated head and returns the caption's edges, in degrees from the gaze, once it has settled. */
  const lookAndReport = async (orientation: { pitch: number; yaw: number; roll: number }) => {
    const turn = { device: 'headset', orientation };
    await d.evaluate((d, turn) => d.remote.dispatch('set_transform', turn), turn);
    await xrFrames(page, 4);
    return probe.evaluate((p) => ({ ...p.captions.fov }));
  };
  const EDGE = 0.05; // degrees: the emulator's poses are 32-bit floats
  const expectInside = (fov: Awaited<ReturnType<typeof lookAndReport>>, pose: string) => {
    expect(fov.leftDeg, pose).toBeGreaterThanOrEqual(-25 - EDGE);
    expect(fov.rightDeg, pose).toBeLessThanOrEqual(25 + EDGE);
    expect(fov.downDeg, pose).toBeGreaterThanOrEqual(-20 - EDGE);
    expect(fov.upDeg, pose).toBeLessThanOrEqual(20 + EDGE);
  };

  // Where it appears: centred, a little below the gaze, 0.40 m wide at 0.6 m (18.4 degrees to each side).
  const ahead = await lookAndReport({ pitch: 0, yaw: 0, roll: 0 });
  expectInside(ahead, 'ahead');
  expect(ahead.rightDeg).toBeCloseTo(18.43, 1);
  expect(ahead.leftDeg).toBeCloseTo(-18.43, 1);
  expect(ahead.upDeg).toBeLessThan(0);
  expect(ahead.downDeg).toBeGreaterThan(-12);
  const uploadsAtStart = await uploads();
  await page.screenshot({ path: '.tmp/caption.png' });
  // One quad, drawn once for each eye: the caption's whole cost (NFR-PERF-03/04).
  const drawn = await probe.evaluate((p) => ({ ...p.info.render }));
  console.log(
    `T-126 per frame, both eyes: ${before.calls} draw calls and ${before.triangles} triangles without a caption, ` +
      `${drawn.calls} and ${drawn.triangles} with one (emulator)`,
  );
  expect(drawn.calls - before.calls).toBe(2);
  expect(drawn.triangles - before.triangles).toBe(4);

  // The caption stays in the room where it appeared; the guard holds it at the edge the head turned away from.
  const turned = await lookAndReport({ pitch: 0, yaw: 60, roll: 0 });
  expectInside(turned, 'yaw 60');
  expect(Math.max(-turned.leftDeg, turned.rightDeg)).toBeCloseTo(25, 1);
  const behind = await lookAndReport({ pitch: 0, yaw: -170, roll: 0 });
  expectInside(behind, 'yaw -170');
  expect(Math.max(-behind.leftDeg, behind.rightDeg)).toBeCloseTo(25, 1);
  const down = await lookAndReport({ pitch: -50, yaw: 0, roll: 0 });
  expectInside(down, 'pitch -50');
  expect(Math.max(-down.downDeg, down.upDeg)).toBeCloseTo(20, 1);
  expectInside(await lookAndReport({ pitch: 35, yaw: -40, roll: 30 }), 'pitch 35, yaw -40, roll 30');
  // It faces the head: its orientation is the emulated headset's own (q and -q are the same turn).
  const facing = await probe.evaluate((p) => {
    const head = (window as unknown as { IWER_DEVICE: Device }).IWER_DEVICE.quaternion;
    const q = p.mesh.quaternion;
    return Math.abs(q.x * head.x + q.y * head.y + q.z * head.z + q.w * head.w);
  });
  expect(facing).toBeCloseTo(1, 4);
  // Back where it started, the caption is back where it appeared.
  expect((await lookAndReport({ pitch: 0, yaw: 0, roll: 0 })).rightDeg).toBeCloseTo(18.43, 1);

  // What the system's own update costs with a caption on screen (NFR-PERF-05: 6 ms for the whole frame). Printed,
  // not asserted: on this host the number says more about the other jobs running than about the code.
  const microseconds = await probe.evaluate((p) => {
    const ROUNDS = 5000;
    const started = performance.now();
    for (let i = 0; i < ROUNDS; i++) p.captions.update();
    return ((performance.now() - started) * 1000) / ROUNDS;
  });
  console.log(`T-126 CaptionSystem.update, caption shown: ${microseconds.toFixed(1)} us (emulator host)`);

  // The canvas is drawn once per caption: not per frame, not when the head moves, not for a setting that does
  // not change how a caption looks. High contrast does, once.
  expect(await uploads()).toBe(uploadsAtStart);
  await probe.evaluate((p) => p.set({ tempo: 100 }));
  await xrFrames(page, 3);
  expect(await uploads()).toBe(uploadsAtStart);
  await probe.evaluate((p) => p.set({ highContrast: true }));
  await xrFrames(page, 3);
  expect(await uploads()).toBe(uploadsAtStart + 1);
  await probe.evaluate((p) => p.set({ volume: 0.5 }));
  await xrFrames(page, 3);
  expect(await uploads()).toBe(uploadsAtStart + 1);

  expect(await probe.evaluate((p) => p.captions.shown)).toBe('rippleCeiling');
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
