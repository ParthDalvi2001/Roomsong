/// <reference types="webxr" />
// T-174 (D-057): the time-lapse demo in the real app. The app's own GardenSystem, store and saver; the save is read
// with a store of the test's own from the dev server's /src/persistence/index.ts, as 22-save-restore does. The
// demo starts from the `timeLapse` flag here; the panel's switch is pressed in 12-settings.spec.ts.
// Emulator results (E): desktop Chromium. Nothing here says how the growth looks or sounds on a headset.
import { expect, test, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, WORLD_READY_MS } from './support/iwer';

type Core = typeof import('../../src/core/index');
type Garden = typeof import('../../src/garden/index');
type Persistence = typeof import('../../src/persistence/index');

/** What the page shows and what is on disk: the switch, each plant's stage, the garden:grown heard, the save. */
function read(page: Page) {
  return page.evaluate(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const { stageFor } = await load<Garden>('/src/garden/index.ts');
    const { openStore } = await load<Persistence>('/src/persistence/index.ts');
    const { garden } = window.__roomsong!;
    const shown = garden.state!;
    return {
      timeLapse: garden.timeLapse,
      stages: shown.plants.map((p) => stageFor(shown.lastVisitAt - p.plantedAt)),
      grown: (window as { grown?: number }).grown ?? 0,
      saved: JSON.stringify(await (await openStore()).load()),
    };
  });
}

/** Waits for the app to be up, then counts its garden:grown from then on. */
async function opened(page: Page): Promise<void> {
  const enter = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await expect(enter).toBeEnabled({ timeout: WORLD_READY_MS });
  await page.evaluate(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const { bus } = await load<Core>('/src/core/index.ts');
    const counted = window as { grown?: number };
    counted.grown = 0;
    bus.on('garden:grown', () => void (counted.grown = (counted.grown ?? 0) + 1));
  });
}

test('with the timeLapse flag the plants grow within a minute; the save and a reload keep the real garden', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  // Two plants of the autoplant flag, saved with the session's visit: a few seconds old, stage 0.
  const offHost = await openApp(page, readRoom('table'), '/?flags=autoplant=2');
  await opened(page);
  await enterXR(page);
  await expect
    .poll(async () => (JSON.parse((await read(page)).saved) as { plants?: [] } | null)?.plants)
    .toHaveLength(2);
  const real = await read(page);
  expect(real.stages).toEqual([0, 0]);

  await page.goto('/?flags=timeLapse,skipOnboarding');
  await opened(page);
  expect((await read(page)).timeLapse).toBe(true);
  const started = Date.now();
  await enterXR(page);
  // Three simulated days, 4 s each: stage 2, on the path real days take (garden:grown).
  await expect
    .poll(async () => Math.min(...(await read(page)).stages), { timeout: 30_000 })
    .toBeGreaterThanOrEqual(2);
  expect(Date.now() - started).toBeLessThan(60_000);
  const lapsed = await read(page);
  expect(lapsed.grown).toBeGreaterThanOrEqual(2);
  expect(lapsed.saved).toBe(real.saved); // the demo was never written
  await page.screenshot({ path: '.tmp/time-lapse.png' });

  await page.goto('/?flags=skipOnboarding');
  await opened(page);
  expect(await read(page)).toEqual({ ...real, timeLapse: false, grown: 0 });
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
