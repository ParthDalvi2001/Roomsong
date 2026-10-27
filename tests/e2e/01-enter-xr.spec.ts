// TC-E2E-01 (FR-SYS-01/06): load -> Enter -> immersive-ar session active within the emulator limit of 10 s
// (SESSION_ENTRY_LIMIT_MS; the 5 s budget is a device number, TC-DEV-01), no errors, nothing but localhost
// requested (Golden Rule 9). Emulator result: says nothing about a headset.
import { expect, test, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, SESSION_ENTRY_LIMIT_MS, xrFrames } from './support/iwer';

type Components = typeof import('../../src/core/components');

/** FR-SYS-06: load to session within 5 s, held here against the app's share of it (appShareMs). */
const APP_ENTRY_LIMIT_MS = 5000;

/** The page's own clock at three points of the entry (ms on performance.now()), noted inside the page. */
interface EntryTimes {
  /** The Enter button became usable: the world is ready (landing.ready). */
  enterReadyMs: number;
  /** The click on it. */
  clickMs: number;
  /** The session is active (IWER's activeSession), seen on the next animation frame. */
  sessionMs: number;
  /** The page's HTML was parsed and its module scripts had run: before it the dev server served the modules. */
  domContentLoadedMs: number;
}

/**
 * The app's share of load-to-session (BUG-003): from the page's scripts running (DOMContentLoaded; before it the dev
 * server transforms and serves the modules, which a built page has no such cost for) to Enter usable, plus the
 * click to the session. Left out: the dev server's share, and the test's own waits (the Enter poll and the click
 * and status hops over the protocol), which are what grows on a busy host. Noted in the page, so no hop is in it.
 */
const appShareMs = (t: EntryTimes): number =>
  t.enterReadyMs - t.domContentLoadedMs + (t.sessionMs - t.clickMs);

/** Before the page loads: notes the entry's times in the page. */
async function noteEntryTimes(page: Page): Promise<() => Promise<EntryTimes>> {
  await page.addInitScript(() => {
    const times = { enterReadyMs: NaN, clickMs: NaN, sessionMs: NaN, domContentLoadedMs: NaN };
    (window as unknown as { __entryTimes: typeof times }).__entryTimes = times;
    const isEnter = (node: unknown): node is HTMLButtonElement =>
      node instanceof HTMLButtonElement && node.textContent?.trim() === 'Enter the garden';
    document.addEventListener('DOMContentLoaded', () => (times.domContentLoadedMs = performance.now()));
    document.addEventListener('click', (e) => isEnter(e.target) && (times.clickMs = performance.now()), true);
    // The document itself: at this point (before any of the page) it has no element yet.
    new MutationObserver((_, observer) => {
      const enter = [...document.querySelectorAll('button')].find(isEnter);
      if (enter === undefined || enter.disabled) return;
      times.enterReadyMs = performance.now();
      observer.disconnect();
    }).observe(document, { subtree: true, childList: true, attributes: true });
    const device = () => (window as unknown as { IWER_DEVICE?: { activeSession?: unknown } }).IWER_DEVICE;
    // A timer, not an animation frame: the page's frames are the session's once it runs.
    const look = setInterval(() => {
      if (device()?.activeSession === undefined) return;
      times.sessionMs = performance.now();
      clearInterval(look);
    }, 5);
  });
  return () => page.evaluate(() => (window as unknown as { __entryTimes: EntryTimes }).__entryTimes);
}

async function loadAndEnter(page: Page, roomName: string, input: 'hand' | 'controller') {
  const consoleErrors: { text: string; url: string }[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push({ text: message.text(), url: message.location().url });
  });
  const entryTimes = await noteEntryTimes(page);
  const started = Date.now();
  const offHost = await openApp(page, readRoom(roomName));
  const status = await enterXR(page, input);
  const ms = Date.now() - started;
  // The input sources join in the session's first frames: that is when IWSDK would ask for their models.
  await xrFrames(page, 5);
  return {
    ms,
    times: await entryTimes(),
    status,
    // The browser logs every aborted off-host request as an error too; those are counted once, in offHost.
    consoleErrors: consoleErrors.filter((error) => !offHost.includes(error.url)).map((error) => error.text),
    pageErrors,
    offHost,
  };
}

// Hands in both rooms; controllers once, because IWSDK takes a different path to a controller's model.
for (const [roomName, input] of [
  ['table', 'hand'],
  ['none', 'hand'],
  ['table', 'controller'],
] as const) {
  const title = `TC-E2E-01 enters immersive-ar within 10 s (emulator), no errors, nothing off localhost (${roomName}, ${input})`;
  test(title, async ({ page }, testInfo) => {
    const run = await loadAndEnter(page, roomName, input);
    await page.screenshot({ path: testInfo.outputPath(`enter-xr-${roomName}-${input}.png`) });
    const share = appShareMs(run.times);
    console.log(
      `TC-E2E-01 [${roomName}, ${input}] load-to-session ${run.ms} ms wall, the app's share ${Math.round(share)} ms ` +
        `(${JSON.stringify(run.times, (_, v: unknown) => (typeof v === 'number' ? Math.round(v) : v))}; ` +
        'emulator, software rendering)',
    );

    expect(run.status).toMatchObject({
      sessionActive: true,
      sessionMode: 'immersive-ar',
      visibilityState: 'visible',
    });
    expect(run.ms).toBeLessThanOrEqual(SESSION_ENTRY_LIMIT_MS);
    // FR-SYS-06's 5 s, held against the app's own share (BUG-003); the wall time above is the host's.
    expect(share).toBeLessThanOrEqual(APP_ENTRY_LIMIT_MS);
    expect(run.consoleErrors).toEqual([]);
    expect(run.pageErrors).toEqual([]);
    expect(run.offHost).toEqual([]); // Golden Rule 9: HTTP(S) and WebSocket, from page load on
    if (input !== 'controller') return;
    // Controllers in the hands and no hand tracked: the app says to put them down, about 2 s into the session.
    await page.evaluate(async () => {
      const url = '/src/core/components.ts';
      const { Caption } = (await import(/* @vite-ignore */ url)) as Components;
      const keys: string[] = [];
      (window as unknown as { captionKeys: string[] }).captionKeys = keys;
      window
        .__roomsong!.world.queryManager.registerQuery({ required: [Caption] })
        .subscribe('qualify', (entity) => keys.push(entity.getValue(Caption, 'key') ?? ''), true);
    });
    await page.waitForFunction(
      () => (window as unknown as { captionKeys: string[] }).captionKeys.includes('putControllersDown'),
      null,
      { timeout: 10_000 },
    );
  });
}
