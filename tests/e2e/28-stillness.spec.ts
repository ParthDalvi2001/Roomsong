/// <reference types="webxr" />
// Stillness opens the garden (P-016, T-173 part 2b, D-057) in the app's own world on IWER's emulated head, in the
// table room where the app places the bed itself: the head turned down to the bed and held there for STILL_OPEN_MS
// → stillness:changed { isOpen: true }, the halo lit by the app's renderer (its uniform, through the guard) with
// no Listen; the head turned level (the bed out of the FoV box) → closed at once and the halo back to dark.
// Emulator result (E): whether a seated head holds under 8 deg/s for 8 s while it means to, and whether the lift,
// the wider reverb and the +2 dB are felt, are headset questions.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, WORLD_READY_MS, xrFrames } from './support/iwer';

/** access/config.ts STILL_OPEN_MS. Not imported: that file loads garden/, which runs under Vite only. */
const STILL_OPEN_MS = 8000;
const STILL_RAMP_MS = 2000; // render/config.ts

type Core = typeof import('../../src/core/index');
type Render = typeof import('../../src/render/index');
type RoomModule = typeof import('../../src/room/index');
type Vec3 = { x: number; y: number; z: number };
type Mesh = import('three').Mesh<import('three').BufferGeometry, import('three').ShaderMaterial>;

interface Probe {
  heard: { isOpen: boolean; plantId: string; atMs: number }[];
  lit(): number;
  bedAt(): Vec3;
}
interface DevPage {
  IWER_DEVICE: { remote: { dispatch(method: string, params?: object): Promise<unknown> } };
}

function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

function stage(page: Page): Promise<JSHandle<Probe>> {
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const render = await load<Render>('/src/render/index.ts');
    const room = await load<RoomModule>('/src/room/index.ts');
    const { world } = window.__roomsong!;
    const halo = world.getSystem(render.HaloSystem) as unknown as { halo: { halo: Mesh } };
    const bed = world.getSystem(room.RoomSystem)!.bed.object3D!;
    const probe: Probe = {
      heard: [],
      lit: () => (halo.halo.halo.material.uniforms.uHalo!.value as Float32Array)[0]!,
      bedAt: () => {
        const e = bed.matrixWorld.elements;
        return { x: e[12], y: e[13], z: e[14] };
      },
    };
    core.bus.on('stillness:changed', ({ isOpen, plantId }) =>
      probe.heard.push({ isOpen, plantId, atMs: performance.now() }),
    );
    core.bus.on('room:bedPlaced', () => probe.heard.push({ isOpen: false, plantId: 'placed', atMs: 0 }));
    return probe;
  });
}

test('TC-E2E-05b stillness: 8 s still on the bed opens it and lifts the halo; a turn closes it at once', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'), '/');
  await page.waitForFunction(() => window.__roomsong !== undefined, null, { timeout: WORLD_READY_MS });
  const probe = await stage(page);
  await enterXR(page);
  const remote = (method: string, params: object) =>
    page.evaluate(
      ([method, params]) => (window as unknown as DevPage).IWER_DEVICE.remote.dispatch(method, params),
      [method, params] as const,
    );
  await page.waitForFunction((p) => p.heard.some((e) => e.plantId === 'placed'), probe, { timeout: 15_000 });
  await xrFrames(page, 3);
  // Looking level: the bed is far below the FoV box, so nothing counts, however still the head is.
  expect(await probe.evaluate((p) => p.lit())).toBe(0);

  const bedAt = await probe.evaluate((p) => p.bedAt());
  await remote('look_at', { device: 'headset', target: bedAt });
  const lookedAt = await page.evaluate(() => performance.now());
  await page.waitForFunction((p) => p.heard.some((e) => e.isOpen), probe, { timeout: STILL_OPEN_MS + 5000 });
  const opened = await probe.evaluate((p) => p.heard.find((e) => e.isOpen)!);
  expect(opened.atMs - lookedAt).toBeGreaterThanOrEqual(STILL_OPEN_MS - 50);
  // The halo comes up slowly, out of Listen (no dome): to about STILL_HALO (0.25) in STILL_RAMP_MS.
  await page.waitForFunction((p) => p.lit() > 0.2, probe, { timeout: STILL_RAMP_MS + 2000 });
  const lit = await probe.evaluate((p) => p.lit());
  expect(lit).toBeLessThanOrEqual(0.26);

  // The head turns level: closed at once, and the halo glides back to dark.
  await remote('look_at', { device: 'headset', target: { x: 0, y: 1.6, z: -2 } });
  await page.waitForFunction((p) => p.heard.some((e, i) => i > 0 && !e.isOpen && e.plantId === ''), probe, {
    timeout: 2000,
  });
  await page.waitForFunction((p) => p.lit() === 0, probe, { timeout: STILL_RAMP_MS + 2000 });
  console.log(`P-016 stillness: opened ${Math.round(opened.atMs - lookedAt)} ms after the look; halo lit ${lit.toFixed(3)} (emulator)`);

  expect(offHost).toEqual([]);
  expect(errors).toEqual([]);
});
