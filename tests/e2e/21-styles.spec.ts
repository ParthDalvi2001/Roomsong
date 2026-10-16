// T-164: the sound-style listening page (proto/styles/) loads, starts the app's audio engine on a click, plays
// notes, switches style and garden while it plays, and stops, with no console error and nothing asked of another
// host. Headless Chromium: it proves the page works, not how it sounds (that is Parth's listening review).
import { expect, test } from '@playwright/test';

import { openApp, readRoom } from './support/iwer';

test('T-164 the listening page plays the garden in each style, with no error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  // The dev server injects the emulator into every page; openApp answers its room request from the fixtures.
  const offHost = await openApp(page, readRoom('table'), '/proto/styles/');
  const status = page.locator('#status');
  await expect(status).toHaveText('Stopped.');

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(status).toContainText('Playing style A, 3 plants');
  await expect.poll(async () => Number(await status.getAttribute('data-notes'))).toBeGreaterThan(3);

  for (const style of ['B', 'C'] as const) {
    await page.locator(`#style-${style}`).click();
    await expect(page.locator(`#style-${style}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(status).toContainText(`Playing style ${style}`);
  }
  await page.locator('#full').check();
  await expect(status).toContainText('Playing style C, 8 plants');
  const notes = Number(await status.getAttribute('data-notes'));
  await expect.poll(async () => Number(await status.getAttribute('data-notes'))).toBeGreaterThan(notes + 4);
  console.log(`T-164 listening page: ${await status.textContent()}`);

  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(status).toHaveText('Stopped.');
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
