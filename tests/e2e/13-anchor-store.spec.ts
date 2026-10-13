/// <reference types="webxr" />
// T-162: the real AnchorStore (src/room/) on IWER's anchors and persistent handles (FR-ROOM-07), by itself: the
// page loads the class from the dev server and gives it every XR frame, as RoomSystem does. Since T-128c the app
// has a store of its own, in RoomSystem, and two stores on one site sweep each other's anchors: every page here
// is opened with `noAnchors`, which switches the app's store off, and this spec's store gets flags of its own.
// TC-E2E-02's anchor half (`room:bedPlaced { restored }`, `room:anchored`) is 06-room.spec.ts.
// Each test has its own browser context and so its own empty storage.
// Emulator result (E). IWER keeps a persistent anchor as a matrix in localStorage, restores every handle it
// knows in the next frame, has no limit on their number, and never loses tracking: this shows that the calls are
// made in the right order inside the right frames, and nothing about whether a Quest finds the table again.
import { expect, test, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom } from './support/iwer';

import type { AnchorStore } from '../../src/room/index';

/** What `startStore` leaves on the page, as `window.anchors`. */
interface Installed {
  store: AnchorStore;
  /** Every property the store read from a frame, in order. */
  touched: string[];
}
type Installing = Window & { anchors: Installed };

/** A bed on the table room's table: 0.45 m ahead and 0.1 m to the right, turned 30 degrees about the vertical. */
const TURN_RAD = Math.PI / 6;
const BED_POSE = [
  ...[Math.cos(TURN_RAD), 0, -Math.sin(TURN_RAD), 0],
  ...[0, 1, 0, 0],
  ...[Math.sin(TURN_RAD), 0, Math.cos(TURN_RAD), 0],
  ...[0.1, 0.74, -0.45, 1],
];
/** FR-ROOM-07. Spelled out: the requirement's number, not the module's constant. */
const RESTORE_TIMEOUT_MS = 4000;
const toTenthOfMm = (pose: ArrayLike<number> | null): number[] | null =>
  pose && Array.from(pose, (value) => Math.round(value * 1e4) / 1e4 + 0);

/** Every page of this spec: the app's own anchor store, in RoomSystem, is off. */
const APP_STORE_OFF = '/?flags=noAnchors';

/**
 * Puts an AnchorStore in the page's XR session and gives it every frame from now on; resolves after the first.
 * The frame goes in behind a proxy that notes what the store reads from it. `isOn` false: the store gets the
 * `noAnchors` flag, as the page has it.
 */
async function startStore(page: Page, isOn = true): Promise<void> {
  await page.evaluate(async (isOn) => {
    const [coreUrl, roomUrl] = ['/src/core/index.ts', '/src/room/index.ts'];
    const core = (await import(/* @vite-ignore */ coreUrl)) as typeof import('../../src/core/index');
    const room = (await import(/* @vite-ignore */ roomUrl)) as typeof import('../../src/room/index');
    const device = (window as unknown as { IWER_DEVICE: { activeSession?: XRSession } }).IWER_DEVICE;
    const session = device.activeSession;
    if (!session) throw new Error('startStore needs an active XR session');
    const space = await session.requestReferenceSpace('local-floor');
    const store = new room.AnchorStore({ ...core.flags, noAnchors: !isOn });
    const touched: string[] = [];
    const watched = (frame: XRFrame): XRFrame =>
      new Proxy(frame, {
        get: (target, key) => {
          touched.push(String(key));
          const value: unknown = Reflect.get(target, key, target);
          return typeof value === 'function' ? (value.bind(target) as unknown) : value;
        },
      });
    Object.assign(window, { anchors: { store, touched } });
    await new Promise<void>((done) => {
      const onFrame = (_: number, frame: XRFrame): void => {
        store.setFrame(watched(frame), space);
        done();
        session.requestAnimationFrame(onFrame);
      };
      session.requestAnimationFrame(onFrame);
    });
  }, isOn);
}

test('T-162 an anchor made on one page load gives the same pose after a reload, and none once cleared', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  const offHost = await openApp(page, readRoom('table'), APP_STORE_OFF);
  await enterXR(page);
  await startStore(page);
  const first = await page.evaluate(async (pose) => {
    const { store, touched } = (window as unknown as Installing).anchors;
    const session = (window as unknown as { IWER_DEVICE: { activeSession: XRSession } }).IWER_DEVICE
      .activeSession;
    const frames = async (count: number): Promise<void> => {
      for (let i = 0; i < count; i++) await new Promise((next) => session.requestAnimationFrame(next));
    };
    // What the SDK itself keeps on the site: with its scene-understanding system on, one anchor by now
    await frames(5);
    const sdkKeeps = Array.from(session.persistentAnchors ?? ['no list']);
    // A stray: a persistent anchor of the site that the store was never told of
    const space = await session.requestReferenceSpace('local-floor');
    const strayAnchor = await new Promise<XRAnchor>((made) =>
      session.requestAnimationFrame((_, frame) => made(frame.createAnchor!(new XRRigidTransform(), space))),
    );
    const stray = await strayAnchor.requestPersistentHandle!();
    const isSupported = store.supported();
    const handle = await store.create(pose);
    await frames(2);
    const siteKeeps = Array.from(session.persistentAnchors ?? ['no list']);
    return { isSupported, sdkKeeps, stray, handle, siteKeeps, touched: Array.from(new Set(touched)) };
  }, BED_POSE);
  console.log(`T-162 create: ${JSON.stringify(first)} (emulator)`);
  expect(first.isSupported).toBe(true);
  expect(first.sdkKeeps).toEqual([]); // `features.sceneUnderstanding` is off (D-040): no anchor but the store's
  expect(first.handle).toMatch(/^[0-9a-f-]{36}$/);
  expect(first.stray).not.toBe(first.handle);
  expect(first.siteKeeps).toEqual([first.handle]); // the sweep took the stray
  // The anchor was made through a frame the store was handed, and through nothing else
  expect(first.touched).toEqual(['session', 'createAnchor']);

  await page.reload();
  await enterXR(page);
  await startStore(page);
  const second = await page.evaluate(
    async ({ handle, timeoutMs }) => {
      const { store, touched } = (window as unknown as Installing).anchors;
      const started = performance.now();
      const pose = await store.restore(handle, timeoutMs);
      const ms = Math.round(performance.now() - started);
      await store.clear();
      const afterClear = await store.restore(handle, timeoutMs);
      const neverKnown = await store.restore('00000000-0000-4000-8000-000000000000', timeoutMs);
      return {
        pose: pose && Array.from(pose),
        ms,
        afterClear,
        neverKnown,
        touched: Array.from(new Set(touched)),
      };
    },
    { handle: first.handle!, timeoutMs: RESTORE_TIMEOUT_MS },
  );
  console.log(`T-162 restore: ${JSON.stringify(second)} (emulator)`);
  expect(toTenthOfMm(second.pose)).toEqual(toTenthOfMm(BED_POSE));
  expect(second.ms).toBeLessThan(RESTORE_TIMEOUT_MS);
  expect(second.afterClear).toBeNull();
  expect(second.neverKnown).toBeNull();
  expect(second.touched).toEqual(['session', 'getPose']);

  // Noted, not asserted: what the emulator does with the cleared handle on the next page load. IWER's delete
  // leaves the anchor in its localStorage (read in its source), so a test of a failed restore after a reload
  // cannot rely on clear(). A headset is expected to forget the anchor (TC-DEV-05).
  await page.reload();
  await enterXR(page);
  await startStore(page);
  const isBack = await page.evaluate(
    async ({ handle, timeoutMs }) =>
      (await (window as unknown as Installing).anchors.store.restore(handle, timeoutMs)) !== null,
    { handle: first.handle!, timeoutMs: RESTORE_TIMEOUT_MS },
  );
  console.log(`T-162 the cleared handle restores again after a reload: ${isBack} (emulator)`);

  expect(pageErrors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('T-162 with noAnchors the store reads nothing of a frame and restores nothing, though the device knows the handle', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  const offHost = await openApp(page, readRoom('table'), APP_STORE_OFF);
  await enterXR(page);
  await startStore(page);
  const handle = await page.evaluate(
    (pose) => (window as unknown as Installing).anchors.store.create(pose),
    BED_POSE,
  );
  expect(handle).not.toBeNull();

  await page.goto(APP_STORE_OFF); // loaded anew, with the same storage: the emulator still knows the handle
  await enterXR(page);
  await startStore(page, false); // this time the store has the flag too
  const flagged = await page.evaluate(
    async ({ handle, pose, timeoutMs }) => {
      const { store, touched } = (window as unknown as Installing).anchors;
      const result = {
        isSupported: store.supported(),
        restored: await store.restore(handle, timeoutMs),
        created: await store.create(pose),
        cleared: await store.clear().then(() => true),
      };
      const session = (window as unknown as { IWER_DEVICE: { activeSession: XRSession } }).IWER_DEVICE
        .activeSession;
      for (let i = 0; i < 3; i++) await new Promise((next) => session.requestAnimationFrame(next));
      return { ...result, touched, stillKnown: session.persistentAnchors?.includes(handle) };
    },
    { handle: handle!, pose: BED_POSE, timeoutMs: RESTORE_TIMEOUT_MS },
  );
  console.log(`T-162 noAnchors: ${JSON.stringify(flagged)} (emulator)`);
  expect(flagged).toEqual({
    isSupported: false,
    restored: null,
    created: null,
    cleared: true,
    touched: [],
    stillKnown: true, // the flag only switches the store off: the anchor of the earlier visit is left alone
  });

  expect(pageErrors).toEqual([]);
  expect(offHost).toEqual([]);
});
