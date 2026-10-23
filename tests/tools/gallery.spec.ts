// The six candidate gallery images for Devpost (T-182 prep), shot in the emulator because no headset exists yet:
// `npm run gallery` (tests/tools/playwright.gallery.config.ts), apart from the suite. Each shot is the app's own
// page in an emulated AR session, 1920 x 1080, the page's DOM (`main`) hidden so the picture is the garden alone,
// saved to .tmp/gallery/01..06.png; the console gets each shot's draws and triangles from the app's perf:sample.
// Emulator pictures: IWER's software rendering, its grey hands and planes, not a headset's passthrough.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { test, type JSHandle, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, xrFrames } from '../e2e/support/iwer';

import type { Vec3 } from '../../src/core/index';

type Core = typeof import('../../src/core/index');
type Render = typeof import('../../src/render/index');
type Ui = typeof import('../../src/ui/index');
type Remote = { remote: { dispatch(method: string, params?: object): Promise<unknown> } };

const OUT = fileURLToPath(new URL('../../.tmp/gallery/', import.meta.url));
const PALM_DOWN = { roll: 0, pitch: 0, yaw: 0 };
const PALM_UP = { roll: 180, pitch: 0, yaw: 0 };
const PALM_OUT = { pitch: 90 };
/** The left hand where the tutorial's seed lands on it (tests/e2e/23-onboarding.spec.ts). */
const LEFT_ROOT: Vec3 = { x: -0.2, y: 0.95, z: -0.3 };
/** Shot 01 holds the tuning ripple here: the table sweep (0.3 to 0.9 s) two thirds across, its afterglow behind. */
const RIPPLE_HOLD_MS = 700;

/** What a shot reads from the page: the bus events it waits for, and the latest perf:sample. */
interface Probe {
  heard: { type: string; step?: string }[];
  samples: { fps: number; draws: number; tris: number }[];
  ripple: { crestM: number; isOn: boolean };
  /** Holds the next ripple at RIPPLE_HOLD_MS after its start: a still of the crest on the table (as 07-bed holds
   *  the tide). The session's frames are slow in software rendering, so a 1.6 s sweep cannot be caught live. */
  holdRipple(): void;
  vineCount(): number;
  panelOpen(): boolean;
  setHighContrast(): void;
  pressPanel(id: string): void;
}

/** Listens on the app's bus before the session, and reaches the systems the shots pose. */
async function watch(page: Page): Promise<JSHandle<Probe>> {
  await page.waitForFunction(() => window.__roomsong !== undefined, null, { timeout: 15_000 });
  return page.evaluateHandle(async (holdMs) => {
    const load = (url: string): Promise<unknown> => import(/* @vite-ignore */ url);
    const core = (await load('/src/core/index.ts')) as Core;
    const render = (await load('/src/render/index.ts')) as Render;
    const ui = (await load('/src/ui/index.ts')) as Ui;
    const { world } = window.__roomsong!;
    const heard: Probe['heard'] = [];
    const samples: Probe['samples'] = [];
    for (const type of [
      'room:features',
      'room:tuned',
      'listen:enter',
      'garden:seedOut',
      'garden:grown',
    ] as const)
      core.bus.on(type, () => heard.push({ type }));
    core.bus.on('onboarding:step', ({ step }) => heard.push({ type: 'onboarding:step', step }));
    core.bus.on('perf:sample', ({ fps, draws, tris }) => samples.push({ fps, draws, tris }));
    // The ripple's table quad and the settings panel: private fields, read as the suite's own tests read them.
    const ripple = world.getSystem(render.TuningRippleSystem) as unknown as {
      ripple: {
        meshes: { visible: boolean; material: { uniforms: { uNow: { value: Float32Array } } } }[];
        start(plan: unknown, nowMs: number): void;
        update(nowMs: number): void;
      };
    };
    const panel = world.getSystem(ui.PanelSystem)!.panel;
    const probe: Probe = {
      heard,
      samples,
      get ripple() {
        const quad = ripple.ripple.meshes[0]!;
        const now = quad.material.uniforms.uNow.value;
        return { crestM: now[0]!, isOn: quad.visible && now[1]! > 0 };
      },
      holdRipple: () => {
        const r = ripple.ripple;
        const start = r.start.bind(r);
        const update = r.update.bind(r);
        let t0 = Number.NaN; // before a start, update gets NaN, which changes nothing (API_SPEC §1.8)
        r.start = (plan, nowMs) => {
          t0 = nowMs;
          start(plan, nowMs);
        };
        r.update = (nowMs) => update(Math.min(nowMs, t0 + holdMs));
      },
      vineCount: () => (world.scene.getObjectByName('vine') as { count: number } | undefined)?.count ?? 0,
      panelOpen: () => panel.open,
      setHighContrast: () => core.settings.set({ highContrast: true }),
      pressPanel: (id) => {
        panel.down('right', id);
        panel.up('right', id);
      },
    };
    return probe;
  }, RIPPLE_HOLD_MS);
}

const heard = (page: Page, probe: JSHandle<Probe>, type: string, count = 1, timeout = 30_000) =>
  page.waitForFunction(
    ([p, type, count]) => p.heard.filter((e) => e.type === type).length >= count,
    [probe, type, count] as const,
    { timeout, polling: 20 }, // on a timer: the page's own animation frame is rare in an emulated session
  );
const stepAt = (page: Page, probe: JSHandle<Probe>, step: string) =>
  page.waitForFunction(
    ([p, step]) => p.heard.some((e) => e.type === 'onboarding:step' && e.step === step),
    [probe, step] as const,
    { timeout: 60_000, polling: 20 },
  );

/** IWER's remote: the head and the hands. The head tilts down `pitch` degrees; the bed is below the eyes. */
const remote = (page: Page, method: string, params: object) =>
  page.evaluate(
    async ([method, params]) => {
      await (window as unknown as { IWER_DEVICE: Remote }).IWER_DEVICE.remote.dispatch(method, params);
    },
    [method, params] as const,
  );
const look = (page: Page, pitch: number, position?: Vec3) =>
  remote(page, 'set_transform', {
    device: 'headset',
    ...(position && { position }),
    orientation: { yaw: 0, pitch: -pitch, roll: 0 },
  });
const hand = (page: Page, which: 'left' | 'right', position: Vec3, orientation: object) =>
  remote(page, 'set_transform', { device: `hand-${which}`, position, orientation });

/** The picture, the page's DOM hidden, and the latest perf:sample on the console. */
async function shoot(page: Page, probe: JSHandle<Probe>, n: number, what: string): Promise<void> {
  await xrFrames(page, 2);
  const style = await page.addStyleTag({ content: 'main { visibility: hidden; }' });
  await page.screenshot({ path: `${OUT}0${n}.png` });
  await style.evaluate((node) => (node as Element).remove());
  const sample = await probe.evaluate((p) => p.samples[p.samples.length - 1] ?? null);
  console.log(
    `gallery 0${n} ${what}: ${sample?.draws ?? '?'} draws, ${sample?.tris ?? '?'} triangles at ` +
      `${sample?.fps.toFixed(1) ?? '?'} fps (emulator, perf:sample)`,
  );
}

/** Opens the app in `room` with `flags`, enters the session and tilts the head to `pitch` degrees. */
async function session(page: Page, room: string, flags: string, pitch: number, onboarding = false) {
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openApp(page, readRoom(room), flags === '' ? '/' : `/?flags=${flags}`, { onboarding });
  const probe = await watch(page);
  await enterXR(page);
  await look(page, pitch);
  return probe;
}

test('01 the bed just placed, the tuning ripple sweeping the table', async ({ page }) => {
  // As session(), with the ripple held before the session starts it (the bed is placed in its first frames).
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openApp(page, readRoom('table'), '/');
  const probe = await watch(page);
  await probe.evaluate((p) => p.holdRipple());
  await enterXR(page);
  await look(page, 45);
  await heard(page, probe, 'room:features');
  await page.waitForFunction((p) => p.ripple.isOn && p.ripple.crestM > 0.15, probe, {
    timeout: 15_000,
    polling: 20,
  });
  await page.waitForTimeout(1500); // the markers' fade-in and the tide's, done
  await shoot(page, probe, 1, 'the bed placed, the ripple held on the table');
});

test('02 a full bed in bloom with the vine up the wall', async ({ page }) => {
  const probe = await session(page, 'counter', 'autoplant=80,timeLapse', 15);
  await heard(page, probe, 'room:tuned');
  await look(page, 15, { x: 0, y: 1.6, z: 0.45 }); // back from the wall, so the whole vine is in the frame
  await page.waitForFunction((p) => p.vineCount() === 48, probe, { timeout: 40_000, polling: 20 });
  await heard(page, probe, 'garden:grown', 3, 60_000); // the time-lapse: days 1, 3 and 7, every stage reached
  await page.waitForTimeout(8000); // each plant unfurls on its next note (a bar is under 3 s), or after 10 s
  await shoot(page, probe, 2, 'full bed in bloom, the vine up the wall');
});

test('03 Listen mode: the dome, the aurora halo and the orb', async ({ page }) => {
  // Palms out are read against the head's forward (hands/poses/palmsOut.ts): the head is level for the hold.
  const probe = await session(page, 'table', 'autoplant=24', 0);
  await heard(page, probe, 'room:tuned');
  await hand(page, 'left', { x: -0.15, y: 1.5, z: -0.35 }, PALM_OUT);
  await hand(page, 'right', { x: 0.15, y: 1.5, z: -0.35 }, PALM_OUT);
  await heard(page, probe, 'listen:enter');
  await look(page, 40);
  await page.waitForTimeout(4000); // the 1.2 s transition in, fully, at the emulator's frame rate
  await shoot(page, probe, 3, 'Listen mode');
});

test('04 high contrast: every target outlined', async ({ page }) => {
  const probe = await session(page, 'table', 'autoplant=24', 45);
  await heard(page, probe, 'room:tuned');
  await probe.evaluate((p) => p.setHighContrast());
  await page.waitForTimeout(2500); // the dim and the outlines, through the guard, at the emulator's frame rate
  await shoot(page, probe, 4, 'high contrast');
});

test('05 the seed on the palm over the glowing cell, with its caption', async ({ page }) => {
  const probe = await session(page, 'table', '', 55, true);
  await hand(page, 'left', LEFT_ROOT, PALM_DOWN);
  await stepAt(page, probe, 'palm');
  await hand(page, 'left', LEFT_ROOT, PALM_UP);
  await stepAt(page, probe, 'plant');
  await heard(page, probe, 'garden:seedOut');
  await page.waitForTimeout(2500); // the seed's glide to the palm, the caption and the ring up
  await shoot(page, probe, 5, 'the seed on the palm, "Pinch the seed, drop it here"');
});

test('06 the settings panel open on the Garden tab', async ({ page }) => {
  const probe = await session(page, 'table', 'autoplant=12', 35);
  await heard(page, probe, 'room:tuned');
  await probe.evaluate((p) => p.pressPanel('orb'));
  await page.waitForFunction((p) => p.panelOpen(), probe, { timeout: 10_000, polling: 20 });
  await xrFrames(page, 3);
  await probe.evaluate((p) => p.pressPanel('tab:garden'));
  await page.waitForTimeout(2000);
  await shoot(page, probe, 6, 'the settings panel, Garden tab');
});
