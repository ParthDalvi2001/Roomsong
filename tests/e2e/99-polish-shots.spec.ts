// Polish pass pictures (D-058), not a check: the garden window as Parth sees it on a laptop, and the emulator's
// landing, placed bed and first caption. Writes .tmp/polish/<prefix>-*.png. Run alone: `npx playwright test 99-polish`.
// Prefix: SHOT_PREFIX=after (default "before").
import { mkdirSync } from 'node:fs';

import { test, type JSHandle, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, xrFrames } from './support/iwer';

type Core = typeof import('../../src/core/index');
type RoomModule = typeof import('../../src/room/index');
type Ui = typeof import('../../src/ui/index');

const DIR = '.tmp/polish';
const PREFIX = process.env.SHOT_PREFIX ?? 'before';
const shot = (name: string) => `${DIR}/${PREFIX}-${name}.png`;
const WORLD_READY_MS = 15_000;
const WINDOW = 'The garden opens in this tab: a click or a tap is a pinch.';
/** One plant on each ring, spread round the bed; grown for 8, 4, 2 days, 0 and 0 (GROWTH_STAGE_DAYS 1/3/7). */
const CELLS = [
  { ring: 0, step: 0 },
  { ring: 1, step: 3 },
  { ring: 2, step: 7 },
  { ring: 3, step: 10 },
  { ring: 4, step: 13 },
];
const AGE_DAYS = [8, 4, 2, 0, 0];
/** A new garden has three starter seeds (SEED_SUPPLY_MAX 5); two more make five plants. */
const MORE_SEEDS = [
  { voice: 'bell', hue: 0.6 },
  { voice: 'choir', hue: 0.85 },
];

interface Probe {
  heard: string[];
  isBedShown: () => boolean;
  onPage: (x: number, y: number, z: number) => { x: number; y: number };
  caption: () => string | null;
  plants: () => number;
  /** Writes a five-plant garden to the localStorage fallback, for the next page to load (Store: the later visit wins). */
  saveFive: (
    cells: { ring: number; step: number }[],
    ageDays: number[],
    more: { voice: string; hue: number }[],
  ) => void;
}

async function openPlain(page: Page, path = '/'): Promise<void> {
  await page.route('**/@iwer-injection-runtime*', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: '' }),
  );
  await page.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort(),
  );
  await page.goto(path);
}

function probe(page: Page): Promise<JSHandle<Probe>> {
  return page.evaluateHandle(async () => {
    const load = (url: string): Promise<unknown> => import(/* @vite-ignore */ url);
    const core = (await load('/src/core/index.ts')) as Core;
    const room = (await load('/src/room/index.ts')) as RoomModule;
    const ui = (await load('/src/ui/index.ts')) as Ui;
    const { world, garden } = window.__roomsong!;
    const bed = world.getSystem(room.RoomSystem)!.bed.object3D!;
    const captions = world.getSystem(ui.CaptionSystem)!;
    const heard: string[] = [];
    core.bus.on('garden:seedOut', () => heard.push('seedOut'));
    core.bus.on('listen:enter', () => heard.push('listen:enter'));
    core.bus.on('listen:exit', () => heard.push('listen:exit'));
    return {
      heard,
      isBedShown: () => bed.visible,
      onPage: (x, y, z) => {
        const ndc = bed.localToWorld(bed.position.clone().set(x, y, z)).project(world.camera);
        const rect = world.renderer.domElement.getBoundingClientRect();
        return { x: rect.left + ((ndc.x + 1) / 2) * rect.width, y: rect.top + ((1 - ndc.y) / 2) * rect.height };
      },
      caption: () => captions.shown,
      plants: () => garden.state?.plants.length ?? 0,
      saveFive: (cells, ageDays, more) => {
        const state = garden.state!;
        const now = Date.now();
        const seeds = [...state.seeds, ...more.map((seed, i) => ({ id: `polish-${i}`, ...seed, receivedAt: now }))];
        const plants = cells.map((cell, i) => ({
          id: seeds[i]!.id,
          voice: seeds[i]!.voice,
          hue: seeds[i]!.hue,
          cell,
          height: 0.2 + 0.2 * i,
          plantedAt: now - ageDays[i]! * 86_400_000,
        }));
        const saved = { ...state, plants, seeds: [], lastVisitAt: now + 3_600_000 };
        localStorage.setItem('roomsong.garden.state', JSON.stringify(saved));
      },
    } satisfies Probe;
  });
}

async function enterWindow(page: Page): Promise<JSHandle<Probe>> {
  await page.getByRole('main').getByRole('status').waitFor();
  await page.waitForFunction((text) => document.querySelector('[role=status]')?.textContent === text, WINDOW, {
    timeout: WORLD_READY_MS,
  });
  const p = await probe(page);
  await page.getByRole('main').getByRole('button', { name: 'Enter the garden' }).click();
  await page.waitForFunction((p) => p.isBedShown(), p, { timeout: 10_000 });
  // A seed comes to the pointer when the supply has one (a saved five-plant garden has none).
  await page.waitForFunction((p) => p.heard.includes('seedOut'), p, { timeout: 3000 }).catch(() => undefined);
  return p;
}

/** A garden of five grown plants: saved on a first visit, loaded by a reload. Resolves with the new page's probe. */
async function withFivePlants(page: Page): Promise<JSHandle<Probe>> {
  const first = await enterWindow(page);
  await first.evaluate((p, [cells, ageDays, more]) => p.saveFive(cells, ageDays, more), [
    CELLS,
    AGE_DAYS,
    MORE_SEEDS,
  ] as const);
  await page.reload();
  const p = await enterWindow(page);
  await page.waitForFunction((p) => p.plants() === 5, p, { timeout: 10_000 });
  // The pointer off the bed, so no seed rides over the picture's subject.
  const rest = await p.evaluate((p) => p.onPage(0.36, 0, 0));
  await page.mouse.move(rest.x, rest.y, { steps: 5 });
  await page.waitForTimeout(4000); // a bar and more: the tide has lit each plant, so each has unfurled
  return p;
}

test.beforeAll(() => mkdirSync(DIR, { recursive: true }));
test.use({ viewport: { width: 1440, height: 900 } });

test('laptop mode: landing, the empty bed with the first caption and hint', async ({ page }) => {
  await openPlain(page);
  await page.waitForFunction((text) => document.querySelector('[role=status]')?.textContent === text, WINDOW, {
    timeout: WORLD_READY_MS,
  });
  await page.screenshot({ path: shot('landing-laptop'), fullPage: true });
  const p = await enterWindow(page);
  const rest = await p.evaluate((p) => p.onPage(0.36, 0, 0));
  await page.mouse.move(rest.x, rest.y, { steps: 3 });
  await page.waitForFunction((p) => p.caption() !== null, p, { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(1500); // the caption's fade, the ghost click's loop
  await page.screenshot({ path: shot('bed-empty-caption-hint') });
});

// The tutorial off: its move gate holds the fourth seed back until a drag.
test('laptop mode: five plants, Listen', async ({ page }) => {
  await openPlain(page, '/?flags=skipOnboarding');
  const p = await withFivePlants(page);
  await page.screenshot({ path: shot('five-plants') });
  // Listen: a click on the Listen orb in the centre hole, aimed at its foot: the pointer's ray meets the bed plane,
  // and through the orb's centre (2 cm up) it would land 3.6 cm past it, outside the 4 cm hit radius.
  const orb = await p.evaluate((p) => p.onPage(0, 0, 0));
  await page.mouse.move(orb.x, orb.y, { steps: 5 });
  await page.waitForTimeout(150);
  await page.mouse.click(orb.x, orb.y);
  await page.waitForFunction((p) => p.heard.includes('listen:enter'), p, { timeout: 10_000 });
  const rest = await p.evaluate((p) => p.onPage(0.36, 0, 0));
  await page.mouse.move(rest.x, rest.y, { steps: 3 });
  await page.waitForTimeout(2500); // the 1.2 s fade in, and a breath of the halo
  await page.screenshot({ path: shot('listen') });
});

test('laptop mode: high contrast with five plants', async ({ page }) => {
  await openPlain(page, '/?flags=skipOnboarding');
  await page.getByLabel('High contrast').check();
  await withFivePlants(page);
  await page.screenshot({ path: shot('high-contrast') });
});

test('emulator: landing, the bed placed on the table, the first caption', async ({ page }) => {
  await openApp(page, readRoom('table'), '/', { onboarding: true });
  await page.waitForFunction(
    () => document.querySelector('[role=status]')?.textContent === '',
    undefined,
    { timeout: WORLD_READY_MS },
  );
  await page.screenshot({ path: shot('landing-emulator'), fullPage: true });
  await enterXR(page);
  const p = await probe(page);
  await page.waitForFunction((p) => p.isBedShown(), p, { timeout: 15_000 });
  await xrFrames(page, 30);
  await page.screenshot({ path: shot('emulator-bed-placed') });
  await page.waitForFunction((p) => p.caption() !== null, p, { timeout: 15_000 }).catch(() => undefined);
  await xrFrames(page, 20);
  await page.screenshot({ path: shot('emulator-caption') });
});
