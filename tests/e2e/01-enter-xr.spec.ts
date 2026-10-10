// TC-E2E-01 (FR-SYS-01/06): load -> Enter -> immersive-ar session active within the emulator limit of 10 s
// (SESSION_ENTRY_LIMIT_MS; the 5 s budget is a device number, TC-DEV-01), no errors, nothing but localhost
// requested (Golden Rule 9). Emulator result: says nothing about a headset.
import { expect, test, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, SESSION_ENTRY_LIMIT_MS, xrFrames } from './support/iwer';

async function loadAndEnter(page: Page, roomName: string, input: 'hand' | 'controller') {
  const consoleErrors: { text: string; url: string }[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push({ text: message.text(), url: message.location().url });
  });
  const started = Date.now();
  const offHost = await openApp(page, readRoom(roomName));
  const status = await enterXR(page, input);
  const ms = Date.now() - started;
  // The input sources join in the session's first frames: that is when IWSDK would ask for their models.
  await xrFrames(page, 5);
  return {
    ms,
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
    console.log(
      `TC-E2E-01 [${roomName}, ${input}] load-to-session ${run.ms} ms (emulator, software rendering)`,
    );

    expect(run.status).toMatchObject({
      sessionActive: true,
      sessionMode: 'immersive-ar',
      visibilityState: 'visible',
    });
    expect(run.ms).toBeLessThanOrEqual(SESSION_ENTRY_LIMIT_MS);
    expect(run.consoleErrors).toEqual([]);
    expect(run.pageErrors).toEqual([]);
    expect(run.offHost).toEqual([]); // Golden Rule 9: HTTP(S) and WebSocket, from page load on
  });
}
