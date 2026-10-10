// NFR-SEC-01 (SECURITY_PLAN §5, T-109): the BUILT page under its Content Security Policy. Every other spec runs
// on the dev server, which carries no policy, so this is the one run that goes red when the policy blocks
// something the app needs. The build has no emulator: the test adds IWER from node_modules as an init script
// (init scripts are not subject to the page's policy) and grants the session the app offers.
// Emulator result: says nothing about a headset.
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { BUILT_PAGE_URL } from '../../playwright.config';

import { xrFrames } from './support/iwer';

const IWER_BUILD = fileURLToPath(new URL('../../node_modules/iwer/build/iwer.min.js', import.meta.url));
const SESSION_FRAMES = 30; // input sources join and the app's systems run within the session's first frames

/** The part of IWER's XRDevice this spec uses (iwer 2.5.0). */
interface EmulatedDevice {
  primaryInputMode: 'controller' | 'hand';
  sessionOffered: boolean;
  activeSession?: object;
  installRuntime(options: { forceInstall: boolean }): void;
  grantOfferedSession(): void;
}
/** What the init scripts put on the page. */
interface BuiltPage {
  IWER: { XRDevice: new (config: unknown) => EmulatedDevice; metaQuest3: unknown };
  IWER_DEVICE: EmulatedDevice;
  policyViolations: string[];
}

test('NFR-SEC-01 the built page loads and enters XR with no policy violation and no error', async ({
  page,
}) => {
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

  await page.goto(BUILT_PAGE_URL);
  const policy = await page.evaluate(
    () => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ?? '',
  );
  expect(policy).toContain("default-src 'self'"); // a page with no policy would pass everything below
  const device = await page.evaluateHandle(() => (window as unknown as BuiltPage).IWER_DEVICE);
  await page.waitForFunction((d) => d.sessionOffered, device);
  await device.evaluate((d) => d.grantOfferedSession());
  await page.waitForFunction((d) => d.activeSession !== undefined, device);
  await xrFrames(page, SESSION_FRAMES);

  expect(await page.evaluate(() => (window as unknown as BuiltPage).policyViolations)).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
