// NFR-SEC-01 (SECURITY_PLAN §5, T-109): the BUILT page under its Content Security Policy. Every other spec runs
// on the dev server, which carries no policy, so this is the one run that goes red when the policy blocks
// something the app needs. The build has no emulator: the test adds IWER from node_modules as an init script
// (init scripts are not subject to the page's policy) and presses the page's own Enter button, the only way in
// (`xr.offer` is "none", API_SPEC §1.10 rule 2). That click also starts the audio context, under the policy.
// The same run covers the pinch-test page (T-105), which is built into dist/ beside the app.
// Emulator result: says nothing about a headset.
import { createRequire } from 'node:module';

import { expect, test, type Page } from '@playwright/test';

import { BUILT_PAGE_URL } from '../../playwright.config';

import { WORLD_READY_MS, xrFrames } from './support/iwer';

// Resolved like any import, up the tree: an agent worktree has no node_modules of its own (BUG-012).
const IWER_BUILD = createRequire(import.meta.url).resolve('iwer/build/iwer.min.js');
const SESSION_FRAMES = 30; // input sources join and the app's systems run within the session's first frames

/** The part of IWER's XRDevice this spec uses (iwer 2.5.0). */
interface EmulatedDevice {
  primaryInputMode: 'controller' | 'hand';
  sessionOffered: boolean;
  activeSession?: object;
  installRuntime(options: { forceInstall: boolean }): void;
}
/** What the init scripts put on the page. */
interface BuiltPage {
  IWER: { XRDevice: new (config: unknown) => EmulatedDevice; metaQuest3: unknown };
  IWER_DEVICE: EmulatedDevice;
  policyViolations: string[];
}

/** Opens a built page with IWER installed and its policy checked. Returns the errors it goes on recording. */
async function openBuilt(page: Page, path = '') {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.addInitScript({ path: IWER_BUILD });
  await page.addInitScript(() => {
    const page = window as unknown as BuiltPage;
    page.policyViolations = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      page.policyViolations.push(
        `${event.effectiveDirective} blocked ${event.blockedURI} at ${event.sourceFile}:${event.lineNumber}`,
      ),
    );
    page.IWER_DEVICE = new page.IWER.XRDevice(page.IWER.metaQuest3);
    page.IWER_DEVICE.installRuntime({ forceInstall: true }); // headless Chromium has a navigator.xr of its own
    page.IWER_DEVICE.primaryInputMode = 'hand';
  });

  await page.goto(BUILT_PAGE_URL + path);
  const policy = await page.evaluate(
    () => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ?? '',
  );
  expect(policy).toContain("default-src 'self'"); // a page with no policy would pass everything below
  return { consoleErrors, pageErrors };
}

/** No policy violation, console error or page error so far. */
async function expectClean(page: Page, errors: Awaited<ReturnType<typeof openBuilt>>) {
  expect(await page.evaluate(() => (window as unknown as BuiltPage).policyViolations)).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
}

test('NFR-SEC-01 the built page loads and enters XR with no policy violation and no error', async ({
  page,
}) => {
  const errors = await openBuilt(page);
  const device = await page.evaluateHandle(() => (window as unknown as BuiltPage).IWER_DEVICE);
  const enter = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await enter.click({ timeout: WORLD_READY_MS });
  await page.waitForFunction((d) => d.activeSession !== undefined, device);
  expect(await device.evaluate((d) => d.sessionOffered)).toBe(false); // the built page offers no session either
  await xrFrames(page, SESSION_FRAMES);
  // The test hook is behind the dev gate (API_SPEC §1.10 rule 14): a production build without `dev=1` has none.
  expect(await page.evaluate(() => window.__roomsong)).toBeUndefined();
  await expectClean(page, errors);
});

test('NFR-SEC-01 the built pinch-test page runs its session with no policy violation and no error', async ({
  page,
}) => {
  const errors = await openBuilt(page, 'proto/pinch/');
  await page.getByRole('button', { name: 'Start' }).click();
  // A lit target: the script, the style sheet, WebGL, the audio context and the session all got through.
  await page.waitForFunction(() =>
    (window as unknown as { __pinchTest: { lit(): unknown } }).__pinchTest.lit(),
  );
  await expectClean(page, errors);
});
