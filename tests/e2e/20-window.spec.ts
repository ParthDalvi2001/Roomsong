// TC-E2E-14 (FR-SYS-07, LLD §11, T-114b): the garden window in a plain Chromium page, with no emulator. The dev
// page is used for its source modules (the bus); the emulator the dev plugin injects is answered with an empty
// script, so this is a desktop browser: WebXR with no immersive-ar. The Enter click starts the sound and opens the
// window; the bed stands on its table in view; the seed comes to the pointer (a pointer is always "palm up"); a
// mouse click on the ring is a pinch and a release there, so the seed is planted and sings; the close button gives
// the landing page back. Browser results only: nothing here is a headset result.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

type Core = typeof import('../../src/core/index');
type RoomModule = typeof import('../../src/room/index');

const WORLD_READY_MS = 15_000; // the Enter button waits for the world; software rendering takes a few seconds
const WINDOW = 'The garden opens in this tab: a click or a tap is a pinch.';
/** Bed-local, metres: on the ring, to the user's right, clear of the Listen orb in the centre hole. */
const ON_RING_M = { x: 0.21, z: 0 };

interface Probe {
  /** The bus events of the window, in order: the name, and the hand and the target's kind where there are those. */
  heard: string[];
  isBedShown: () => boolean;
  /** Where a bed-local point is on the page, in CSS pixels. */
  onPage: (x: number, z: number) => { x: number; y: number };
  audioNowS: () => number;
  /** Notes the engine has started. */
  triggers: () => number;
}

/** Opens the dev page as a desktop browser would see it: no emulator, nothing from another host. */
async function openPlain(page: Page): Promise<string[]> {
  const offHost: string[] = [];
  await page.route('**/@iwer-injection-runtime*', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: '' }),
  );
  await page.route(
    (url) => url.hostname !== 'localhost',
    (route) => {
      offHost.push(route.request().url());
      return route.abort();
    },
  );
  await page.goto('/');
  return offHost;
}

/** Listens on the app's own bus from before Enter, and reads the bed and the engine through the dev handle. */
function listen(page: Page): Promise<JSHandle<Probe>> {
  return page.evaluateHandle(async () => {
    const load = (url: string): Promise<unknown> => import(/* @vite-ignore */ url);
    const core = (await load('/src/core/index.ts')) as Core;
    const room = (await load('/src/room/index.ts')) as RoomModule;
    const { world, engine } = window.__roomsong!;
    const bed = world.getSystem(room.RoomSystem)!.bed.object3D!;
    const heard: string[] = [];
    for (const type of ['xr:sessionStart', 'xr:sessionEnd'] as const)
      core.bus.on(type, () => heard.push(type));
    core.bus.on('gesture:pinchStart', (e) =>
      heard.push(`${e.type} ${e.hand} ${e.target?.kind ?? 'nothing'}`),
    );
    core.bus.on('gesture:release', (e) => heard.push(`${e.type} ${e.hand} ${e.target?.kind ?? 'nothing'}`));
    core.bus.on('garden:seedOut', ({ hand }) => heard.push(`garden:seedOut ${hand}`));
    core.bus.on('garden:changed', ({ state, diff }) => {
      if (diff.added.length > 0) heard.push(`garden:planted ${state.plants.length}`);
    });
    const probe: Probe = {
      heard,
      isBedShown: () => bed.visible,
      onPage: (x, z) => {
        const ndc = bed.localToWorld(bed.position.clone().set(x, 0, z)).project(world.camera);
        const rect = world.renderer.domElement.getBoundingClientRect();
        return {
          x: rect.left + ((ndc.x + 1) / 2) * rect.width,
          y: rect.top + ((1 - ndc.y) / 2) * rect.height,
        };
      },
      audioNowS: () => engine.clock.now(),
      triggers: () => engine.stats.triggers,
    };
    return probe;
  });
}

const enterButton = (page: Page) => page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
const closeButton = (page: Page) => page.getByRole('button', { name: 'Close the garden' });
const heard = (probe: JSHandle<Probe>) => probe.evaluate((p) => p.heard);

test('TC-E2E-14 the garden window: no emulator; the bed in view; a click plants the seed and it sings; close', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const offHost = await openPlain(page);
  expect(await page.evaluate(() => 'IWER_DEVICE' in window)).toBe(false);
  expect(await page.evaluate(() => navigator.xr?.isSessionSupported('immersive-ar') ?? false)).toBe(false);
  await expect(page.getByRole('main').getByRole('status')).toHaveText(WINDOW, { timeout: WORLD_READY_MS });
  const probe = await listen(page);

  await enterButton(page).click();
  await expect(page.getByRole('main')).toBeHidden();
  await expect(closeButton(page)).toBeVisible();
  // The level-4 bed, placed from the window's camera; the click started the sound (the audio clock runs).
  await expect.poll(() => probe.evaluate((p) => p.isBedShown())).toBe(true);
  await expect.poll(() => probe.evaluate((p) => p.audioNowS())).toBeGreaterThan(0);
  // A pointer is always palm up (LLD §11): the seed comes to it, the dominant hand, with no click.
  await expect.poll(() => heard(probe)).toContain('garden:seedOut right');

  // The seed rides the pointer over the ring; one click there is a pinch on it and a release on the bed.
  const at = await probe.evaluate((p, { x, z }) => p.onPage(x, z), ON_RING_M);
  await page.mouse.move(at.x, at.y, { steps: 5 });
  const before = await probe.evaluate((p) => p.triggers());
  await page.mouse.click(at.x, at.y);
  await expect.poll(() => heard(probe)).toContain('garden:planted 1');
  expect((await heard(probe)).filter((e) => e.startsWith('gesture:'))).toEqual([
    'gesture:pinchStart right seed',
    'gesture:release right seed',
  ]);
  // It sings: the tide reaches its step within a bar (16 steps at 84 BPM is under 3 s).
  await expect.poll(() => probe.evaluate((p) => p.triggers()), { timeout: 10_000 }).toBeGreaterThan(before);
  await page.screenshot({ path: '.tmp/t114b-window.png' });

  await closeButton(page).click();
  await expect(enterButton(page)).toBeVisible();
  await expect(closeButton(page)).toBeHidden();
  expect((await heard(probe)).slice(-1)).toEqual(['xr:sessionEnd']);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
