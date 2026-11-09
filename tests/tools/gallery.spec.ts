// The Devpost gallery drafts (T-182; SUBMISSION_CHECKLIST §2.2, in its order) and the app icon drawn from its SVG, shot
// in the emulator: `E2E_PORT=8491 npm run gallery` (tests/tools/playwright.gallery.config.ts), apart from the suite.
// Each shot is the app's own page in an emulated AR session, 1920 x 1080, the page's DOM (`main`) hidden so the picture
// is the garden alone, saved to evidence/gallery/ (README.md there lists them); the console gets each shot's draws and
// triangles from the app's perf:sample. Emulator pictures: IWER's software rendering, no passthrough, no real table.
// Staged with dev flags only where a judge reaches the same picture by hand: `autoplant` (a planted garden),
// `timeLapse` (the panel's Time-lapse), `handCue` (shot 03: the capture rig's dots for the hand passthrough shows).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { test, type JSHandle, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, xrFrames } from '../e2e/support/iwer';

import type { Vec3 } from '../../src/core/index';

type Core = typeof import('../../src/core/index');
type Render = typeof import('../../src/render/index');
type Ui = typeof import('../../src/ui/index');
type RoomModule = typeof import('../../src/room/index');
type Remote = { remote: { dispatch(method: string, params?: object): Promise<unknown> } };

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = `${ROOT}evidence/gallery/`;
const HALVES = `${ROOT}.tmp/gallery/`;
const PALM_DOWN = { roll: 0, pitch: 0, yaw: 0 };
const PALM_UP = { roll: 180, pitch: 0, yaw: 0 };
const PALM_OUT = { pitch: 90 };
/** The left hand where the tutorial's seed lands on it (tests/e2e/23-onboarding.spec.ts). */
const LEFT_ROOT: Vec3 = { x: -0.2, y: 0.95, z: -0.3 };
/** Shot 02 holds the tuning ripple here: the table sweep (0.3 to 0.9 s) two thirds across, its caption up. */
const RIPPLE_HOLD_MS = 700;
/** Shot 05: the room tour's small and large signature rooms (D-071: the palette turns -15 and +15 degrees). */
const TWO_ROOMS = [
  { room: 'sig-small-desk', name: 'Small room' },
  { room: 'sig-living-table', name: 'Large room' },
] as const;
const KEYS: Record<number, string> = { [-3]: 'A', 0: 'C', 2: 'D', 4: 'E' };
/** The ceiling captions' mood words (strings.ts rippleCeiling*). */
const MOODS: Record<string, string> = { minorPent: 'minor', majorPent: 'major', susPent: 'open' };

/** The bed's centre and its own +z, the side towards the player. */
interface Bed {
  x: number;
  y: number;
  z: number;
  toward: { x: number; z: number };
}

/** What a shot reads from the page: the bus events it waits for, and the latest perf:sample. */
interface Probe {
  heard: { type: string; step?: string }[];
  samples: { fps: number; draws: number; tris: number }[];
  signature: { keyRoot: number; mode: string; reverbRt60: number } | null;
  bed(): Bed;
  /** Holds the tuning ripple, and its caption, at RIPPLE_HOLD_MS after its start: a still of the crest on the table
   *  (as 07-bed holds the tide). The session's frames are slow in software rendering: a sweep cannot be caught live. */
  holdRipple(): void;
  caption(): string | null;
  panelOpen(): boolean;
  pressPanel(id: string): void;
  highContrast(): boolean;
}

/** Listens on the app's bus before the session, and reaches the systems the shots pose. */
async function watch(page: Page): Promise<JSHandle<Probe>> {
  await page.waitForFunction(() => window.__roomsong !== undefined, null, { timeout: 15_000 });
  return page.evaluateHandle(async (holdMs) => {
    const load = (url: string): Promise<unknown> => import(/* @vite-ignore */ url);
    const core = (await load('/src/core/index.ts')) as Core;
    const render = (await load('/src/render/index.ts')) as Render;
    const ui = (await load('/src/ui/index.ts')) as Ui;
    const room = (await load('/src/room/index.ts')) as RoomModule;
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
    // The ripple's system, the captions and the panel: private fields, read as the suite's own tests read them.
    const ripple = world.getSystem(render.TuningRippleSystem) as unknown as {
      startedMs: number;
      update(delta: number, time: number): void;
    };
    const captions = world.getSystem(ui.CaptionSystem) as unknown as {
      shown: string | null;
      queue: { current(nowMs: number): string | null };
    };
    const panel = world.getSystem(ui.PanelSystem)!.panel;
    const probe: Probe = {
      heard,
      samples,
      signature: null,
      bed: () => {
        const e = world.getSystem(room.RoomSystem)!.bed.object3D!.matrixWorld.elements;
        const toward = Math.hypot(e[8], e[10]) || 1;
        return { x: e[12], y: e[13], z: e[14], toward: { x: e[8] / toward, z: e[10] / toward } };
      },
      holdRipple: () => {
        // The system's frame time stops at the hold: the crest, its afterglow and the caption timeline with it.
        const update = ripple.update.bind(ripple);
        ripple.update = (delta, time) => {
          const startedMs = ripple.startedMs; // NaN until the bed is placed and the ripple begins
          update(delta, Number.isNaN(startedMs) ? time : Math.min(time, (startedMs + holdMs) / 1000));
        };
        // The caption's expiry runs on the app clock: from its first frame on screen its queue is asked at that time.
        const { queue } = captions;
        const current = queue.current.bind(queue);
        let heldAt = Number.NaN;
        queue.current = (nowMs) => {
          if (Number.isNaN(heldAt) && captions.shown !== null) heldAt = nowMs;
          return current(Number.isNaN(heldAt) ? nowMs : heldAt);
        };
      },
      caption: () => captions.shown,
      panelOpen: () => panel.open,
      pressPanel: (id) => {
        panel.down('right', id);
        panel.up('right', id);
      },
      highContrast: () => core.settings.get().highContrast,
    };
    core.bus.on('room:signature', ({ signature: s }) => {
      probe.signature = { keyRoot: s.keyRoot, mode: s.mode, reverbRt60: s.reverbRt60 };
    });
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
const look = (page: Page, pitch: number) =>
  remote(page, 'set_transform', { device: 'headset', orientation: { yaw: 0, pitch: -pitch, roll: 0 } });
const hand = (page: Page, which: 'left' | 'right', position: Vec3, orientation: object) =>
  remote(page, 'set_transform', { device: `hand-${which}`, position, orientation });
/** The head at `position`, turned to `target`. */
async function view(page: Page, position: Vec3, target: Vec3): Promise<void> {
  await remote(page, 'set_transform', { device: 'headset', position });
  await remote(page, 'look_at', { device: 'headset', target });
}
/** The head `back` m from the bed's centre towards the player and `up` m over it, looking at the point `aim` m from
 *  the centre towards the player. */
async function frame(page: Page, probe: JSHandle<Probe>, back: number, up: number, aim = 0): Promise<void> {
  const bed = await probe.evaluate((p) => p.bed());
  const along = (m: number, y: number) => ({ x: bed.x + bed.toward.x * m, y, z: bed.z + bed.toward.z * m });
  await view(page, along(back, bed.y + up), along(aim, bed.y));
}

/** The picture (whole, or `clip`), every element but the canvas hidden (the page's DOM and the emulator's own
 *  "Remote Control Active" overlay), and the latest perf:sample on the console. */
async function shoot(
  page: Page,
  probe: JSHandle<Probe>,
  path: string,
  what: string,
  clip?: { x: number; y: number; width: number; height: number },
): Promise<void> {
  await xrFrames(page, 2);
  const style = await page.addStyleTag({
    content:
      'body *:not(canvas) { visibility: hidden !important; } canvas { visibility: visible !important; }',
  });
  await page.screenshot({ path, ...(clip && { clip }) });
  await style.evaluate((node) => (node as Element).remove());
  const sample = await probe.evaluate((p) => p.samples[p.samples.length - 1] ?? null);
  console.log(
    `gallery ${path.slice(ROOT.length)} ${what}: ${sample?.draws ?? '?'} draws, ${sample?.tris ?? '?'} triangles at ` +
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

/** Up to the tutorial's plant step: the palm turned up has brought the first seed. */
async function seedOnPalm(page: Page, flags: string): Promise<JSHandle<Probe>> {
  const probe = await session(page, 'table', flags, 55, true);
  await hand(page, 'left', LEFT_ROOT, PALM_DOWN);
  await stepAt(page, probe, 'palm');
  await hand(page, 'left', LEFT_ROOT, PALM_UP);
  await stepAt(page, probe, 'plant');
  await heard(page, probe, 'garden:seedOut');
  return probe;
}

test('01 hero: a garden in full bloom in Listen mode, the aurora halo round the bed', async ({ page }) => {
  test.setTimeout(180_000); // seven simulated days, then Listen
  // Palms out are read against the head's forward (hands/poses/palmsOut.ts): the head is level for the hold.
  const probe = await session(page, 'table', 'autoplant=40,timeLapse', 0); // half the bed: each plant reads
  await heard(page, probe, 'room:tuned');
  await heard(page, probe, 'garden:grown', 3, 60_000); // the time-lapse: days 1, 3 and 7, every stage reached
  await page.waitForTimeout(8000); // each plant unfurls on its next note (a bar is under 3 s), or after 10 s
  await hand(page, 'left', { x: -0.15, y: 1.5, z: -0.35 }, PALM_OUT);
  await hand(page, 'right', { x: 0.15, y: 1.5, z: -0.35 }, PALM_OUT);
  await heard(page, probe, 'listen:enter');
  await frame(page, probe, 0.45, 0.25);
  await page.waitForTimeout(4000); // the 1.2 s transition in, fully, at the emulator's frame rate
  await shoot(page, probe, `${OUT}01-hero-listen.png`, 'full bloom, Listen mode, the halo');
});

test('02 the tuning ripple crossing the table, its caption up', async ({ page }) => {
  // As session(), with the ripple held before the session starts it (the bed is placed in its first frames).
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openApp(page, readRoom('table'), '/');
  const probe = await watch(page);
  await probe.evaluate((p) => p.holdRipple());
  await enterXR(page);
  await look(page, 45);
  await heard(page, probe, 'room:features');
  await page.waitForFunction((p) => p.caption() !== null, probe, { timeout: 15_000, polling: 20 });
  await page.waitForTimeout(1500); // the markers' fade-in, done
  const caption = await probe.evaluate((p) => p.caption());
  await shoot(page, probe, `${OUT}02-tuning-ripple.png`, `the ripple held on the table, caption ${caption}`);
});

test('03 palm up: the first seed arriving on the open hand', async ({ page }) => {
  const probe = await seedOnPalm(page, 'handCue');
  await hand(page, 'right', { x: 0.45, y: 0.8, z: -0.3 }, PALM_DOWN); // resting on the table, out of the frame
  await view(page, { x: -0.08, y: 1.15, z: -0.05 }, { x: -0.2, y: 0.95, z: -0.32 }); // close over the palm
  await page.waitForTimeout(2500); // the seed's glide to the palm, the caption and the ring up
  await shoot(page, probe, `${OUT}03-seed-on-palm.png`, 'the seed on the palm, the hand cue on');
});

test('04 the planting moment without a hand: the pinch hint over the glowing cell, the five rings', async ({
  page,
}) => {
  // D-027: the app draws no hand, so the shot is the app's own pinch hint where the seed goes, close over the bed.
  const probe = await seedOnPalm(page, '');
  await hand(page, 'left', { x: -0.6, y: 0.95, z: -0.2 }, PALM_UP); // the seed on the palm, out of the frame
  await frame(page, probe, 0.42, 0.3, 0.15);
  await page.waitForTimeout(2500);
  await shoot(
    page,
    probe,
    `${OUT}04-planting-close-up.png`,
    'the glowing cell, the ghost pinch, the five rings',
  );
});

for (const { room, name } of TWO_ROOMS) {
  test(`05 half: the same garden in the ${room} room`, async ({ page }) => {
    // A seated head 40 cm over the bed and 42 cm back, as the room tour; the frame's middle half only.
    const probe = await session(page, room, 'autoplant=20', 0);
    await heard(page, probe, 'room:tuned');
    await frame(page, probe, 0.42, 0.4);
    await page.waitForTimeout(3000);
    mkdirSync(HALVES, { recursive: true });
    const clip = { x: 480, y: 0, width: 960, height: 1080 };
    await shoot(page, probe, `${HALVES}05-${room}.png`, name, clip);
    const s = (await probe.evaluate((p) => p.signature))!;
    const floor = readRoom(room).planes.find((p) => p.label === 'floor')!;
    const label = `${name}, ${floor.size[0].toFixed(1)} x ${floor.size[1].toFixed(1)} m: ${KEYS[s.keyRoot]} ${MOODS[s.mode]}, echo ${s.reverbRt60} s`;
    console.log(`gallery 05 ${room}: ${label}`);
    writeFileSync(`${HALVES}05-${room}.txt`, label);
  });
}

test('05 two rooms, two songs: the two halves side by side, each with what its room tuned', async ({
  page,
}) => {
  const half = (room: string) => ({
    png: readFileSync(`${HALVES}05-${room}.png`).toString('base64'),
    label: readFileSync(`${HALVES}05-${room}.txt`, 'utf8'),
  });
  const halves = TWO_ROOMS.map(({ room }) => half(room));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.setContent(
    `<style>body{margin:0;display:flex;background:#090d11}figure{margin:0;position:relative}` +
      `img{display:block;width:960px;height:1080px}figure+figure{border-left:2px solid #090d11}` +
      `figcaption{position:absolute;left:50%;bottom:48px;transform:translateX(-50%);white-space:nowrap;` +
      `font:600 30px system-ui,sans-serif;color:#fff8e7;background:rgba(9,13,17,.72);padding:12px 24px;` +
      `border-radius:999px}</style>` +
      halves
        .map((h) => `<figure><img src="data:image/png;base64,${h.png}"><figcaption></figcaption></figure>`)
        .join(''),
  );
  // The labels as text, not markup.
  await page.evaluate(
    (labels) => {
      document.querySelectorAll('figcaption').forEach((c, i) => (c.textContent = labels[i]!));
    },
    halves.map((h) => h.label),
  );
  await page.screenshot({ path: `${OUT}05-two-rooms.png` });
});

test('06 the settings panel, Access tab, high contrast switched on there', async ({ page }) => {
  const probe = await session(page, 'table', 'autoplant=12', 35);
  await heard(page, probe, 'room:tuned');
  await probe.evaluate((p) => p.pressPanel('orb'));
  await page.waitForFunction((p) => p.panelOpen(), probe, { timeout: 10_000, polling: 20 });
  await xrFrames(page, 3);
  await probe.evaluate((p) => p.pressPanel('tab:access'));
  await xrFrames(page, 3);
  await probe.evaluate((p) => p.pressPanel('highContrast'));
  await page.waitForFunction((p) => p.highContrast(), probe, { timeout: 10_000, polling: 20 });
  await page.waitForTimeout(2500); // the dim and the outlines, through the guard, at the emulator's frame rate
  await shoot(page, probe, `${OUT}06-settings-high-contrast.png`, 'the panel, Access tab, high contrast on');
});

test('icon: icon.svg drawn at 512, 192 and 32 px', async ({ page }) => {
  const svg = readFileSync(`${OUT}icon/icon.svg`, 'utf8');
  for (const [size, file] of [
    [512, 'icon-512.png'],
    [192, 'icon-192.png'],
    [32, 'favicon-32.png'],
  ] as const) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    await page.screenshot({ path: `${OUT}icon/${file}` });
  }
});
