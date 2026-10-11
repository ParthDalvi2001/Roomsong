/// <reference types="webxr" />
// T-124: the real HandSampler (src/hands/) on IWER's emulated hands. Nothing wires hands/ into the app before
// T-128, so the page loads the class from the dev server and samples it once per XR frame while a hand path
// plays. Emulator result (E): what IWER's joints and select events give, which says nothing about a headset.
import { expect, test, type Page } from '@playwright/test';

import { enterXR, openApp, playHandPath, readHandPath, readRoom } from './support/iwer';

type Hand = 'left' | 'right';

/** One sample of the hand, as HandSampler filled it. */
interface Row {
  tracked: boolean;
  pinch: boolean;
  select: boolean;
  /** Up component of the palm normal: 1 = palm up, -1 = palm down. */
  palmY: number;
  /** Height of the rest point above the middle of the palm (wrist and the two outer knuckles), metres. */
  restAbovePalmM: number;
}

const PALM_UP_MIN = Math.cos((35 * Math.PI) / 180); // FR-HND-05

/** Starts sampling `hand` in the page, once per XR frame, into `window.handRows`. */
async function record(page: Page, hand: Hand): Promise<void> {
  await page.evaluate(async (hand) => {
    const samplerUrl = '/src/hands/HandSampler.ts';
    const frameUrl = '/src/hands/InputSource.ts';
    const { HandSampler } = (await import(
      /* @vite-ignore */ samplerUrl
    )) as typeof import('../../src/hands/HandSampler');
    const { createHandFrame } = (await import(
      /* @vite-ignore */ frameUrl
    )) as typeof import('../../src/hands/InputSource');
    const session = (window as unknown as { IWER_DEVICE: { activeSession?: XRSession } }).IWER_DEVICE
      .activeSession;
    if (!session) throw new Error('record needs an active XR session');
    const space = await session.requestReferenceSpace('local-floor');
    const sampler = new HandSampler();
    sampler.attach(session);
    const out = createHandFrame(hand);
    const rows: Row[] = [];
    (window as unknown as { handRows: Row[] }).handRows = rows;
    const onFrame = (_time: number, frame: XRFrame) => {
      sampler.setFrame(frame, space);
      sampler.sample(hand, performance.now(), out);
      const joints = [...session.inputSources].find((source) => source.handedness === hand)?.hand;
      const heightOf = (joint: XRHandJoint) => {
        const jointSpace = joints?.get(joint);
        return (jointSpace && frame.getJointPose?.(jointSpace, space))?.transform.position.y ?? Number.NaN;
      };
      const palmY =
        (heightOf('wrist') +
          heightOf('index-finger-phalanx-proximal') +
          heightOf('pinky-finger-phalanx-proximal')) /
        3;
      rows.push({
        tracked: out.tracked,
        pinch: out.pinch,
        select: out.select,
        palmY: out.palmNormal.y,
        restAbovePalmM: out.palmPos.y - palmY,
      });
      session.requestAnimationFrame(onFrame);
    };
    session.requestAnimationFrame(onFrame);
  }, hand);
}

/** The samples taken since the last call. */
const takeRows = (page: Page) =>
  page.evaluate(() => (window as unknown as { handRows: Row[] }).handRows.splice(0));

for (const hand of ['right', 'left'] as const) {
  test(`T-124 HandSampler on the emulated ${hand} hand: pinch, select and palm up; nothing off localhost`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    const offHost = await openApp(page, readRoom('table'));
    await enterXR(page);
    await record(page, hand);

    // The pinch path: the hand closes at 200 ms and opens at 500 ms, palm down.
    const pinched = await playHandPath(page, { ...readHandPath('pinch'), hand });
    const pinchRows = await takeRows(page);
    const summary = pinchRows.map((row) => `${row.pinch ? 'P' : '-'}${row.select ? 'S' : '-'}`).join(' ');
    console.log(`T-124 ${hand} pinch path, pinch and select per frame: ${summary} (emulator)`);
    expect(pinched.events.map((event) => event.type)).toEqual(['selectstart', 'selectend']);
    expect(pinchRows.length).toBeGreaterThan(5);
    expect(pinchRows.every((row) => row.tracked)).toBe(true);
    expect(pinchRows.some((row) => row.pinch)).toBe(true); // the joint distance: 2 mm when IWER pinches
    expect(pinchRows.some((row) => row.select)).toBe(true); // the platform's select events
    expect(pinchRows[0]).toMatchObject({ pinch: false, select: false });
    expect(pinchRows.every((row) => row.palmY < 0)).toBe(true); // palm down throughout

    // The palm-up path: the hand turns over in 300 ms and holds.
    await playHandPath(page, { ...readHandPath('palm-up'), hand });
    const palmRows = await takeRows(page);
    const last = palmRows[palmRows.length - 1];
    console.log(`T-124 ${hand} palm-up path ends at ${JSON.stringify(last)} (emulator)`);
    expect(last?.tracked).toBe(true);
    expect(last?.palmY).toBeGreaterThanOrEqual(PALM_UP_MIN); // the normal is mirrored for the left hand
    expect(last?.restAbovePalmM).toBeGreaterThan(0.02); // a seed rests 3 cm out of the palm: above it, palm up
    expect(last?.restAbovePalmM).toBeLessThanOrEqual(0.03);
    expect(palmRows.every((row) => !row.pinch && !row.select)).toBe(true);

    expect(pageErrors).toEqual([]);
    expect(offHost).toEqual([]);
  });
}
