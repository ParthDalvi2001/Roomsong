/// <reference types="webxr" />
// T-105 / TC-DEV-00 in the emulator: the pinch-accuracy page records a first-try hit and a miss, ends on its
// finish target and shows the results; nothing but localhost is requested (Golden Rule 9). This proves the
// page's flow. It says nothing about pinch accuracy on a headset: that is the device run in proto/pinch/README.md.
import { expect, test, type Page } from '@playwright/test';

import { openApp, playHandPath, readRoom, type HandPath } from './support/iwer';

type Vec3 = [x: number, y: number, z: number];
interface PinchTest {
  lit(): Vec3 | null;
  finish(): Vec3 | null;
  trials(): {
    group: string;
    target: number;
    hit: boolean;
    nearest: number;
    distM: number;
    rawHit: boolean;
  }[];
}
interface PageWindow {
  __pinchTest: PinchTest;
  IWER_DEVICE: {
    primaryInputMode: string;
    remote: { dispatch(method: string, params: object): Promise<unknown> };
  };
}

// IWER's hand origin is 2.5 cm above and 1.2 cm behind its closed pinch (README.md, hand paths).
const handAt = ([x, y, z]: Vec3) => ({ x, y: y + 0.025, z: z + 0.012 });

// The emulator's hand snaps from open to pinched in one frame, and the midpoint of its two finger tips jumps
// 7.7 cm as it does (measured, IWER 2.5.0). The sheet's filter (1 Hz, beta 0) is two frames into that jump when
// the pinch is confirmed and still about 5 cm behind, so with the default beta an exact pinch is a recorded miss
// here. A real hand does not close in one frame. The page's own ?beta= makes the filter follow the jump.
const PAGE = '/proto/pinch/?seed=1&beta=100';

/** The right hand jumps to `point`, rests a second, pinches for 300 ms and opens. */
function pinchAt(point: Vec3): HandPath {
  const frame = (t: number, pinch: number) => ({
    t,
    position: handAt(point),
    orientation: { roll: 0 },
    pinch,
  });
  return {
    description: 'pinch at a point',
    hand: 'right',
    frames: [frame(0, 0), frame(1000, 1), frame(1300, 0)],
  };
}

/** Presses the page's Start with hands selected: the session starts at once, as it does from a real click. */
async function start(page: Page) {
  await page.evaluate(() => {
    (window as unknown as PageWindow).IWER_DEVICE.primaryInputMode = 'hand'; // IWER starts on controllers
  });
  await page.getByRole('button', { name: 'Start' }).click();
}

const nextLit = async (page: Page) =>
  (await page.waitForFunction(() => (window as unknown as PageWindow).__pinchTest.lit())).jsonValue();
const trials = (page: Page) => page.evaluate(() => (window as unknown as PageWindow).__pinchTest.trials());

test('T-105 a first-try hit, a miss, the finish target and the results; nothing off localhost', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  const offHost = await openApp(page, readRoom('table'), PAGE);
  await start(page);

  // Hit: pinch on the lit target.
  const first = (await nextLit(page))!;
  expect(first[1]).toBeCloseTo(0.74); // the targets lie on the fixture's table
  await playHandPath(page, pinchAt(first));
  await expect.poll(() => trials(page)).toHaveLength(1);
  const [hit] = await trials(page);
  console.log(`T-105 hit ${JSON.stringify(hit)} (emulator)`);
  expect(hit).toMatchObject({
    group: '3 cm grid',
    hit: true,
    nearest: hit!.target,
    rawHit: true,
    hand: 'right',
  });

  // Miss: pinch 8 cm to the right of the next lit target.
  const second = (await nextLit(page))!;
  await playHandPath(page, pinchAt([second[0] + 0.08, second[1], second[2]]));
  await expect.poll(() => trials(page)).toHaveLength(2);
  const miss = (await trials(page))[1]!;
  console.log(`T-105 miss ${JSON.stringify(miss)} (emulator)`);
  expect(miss.hit).toBe(false);
  expect(Math.abs(miss.distM - 0.08)).toBeLessThan(0.015);

  // Finish with the hands: pinch the finish target. Not through playHandPath, which reads the hand from
  // the session after the path, and this pinch ends the session.
  const finish = (await page.evaluate(() => (window as unknown as PageWindow).__pinchTest.finish()))!;
  await page.evaluate(async (position) => {
    const { remote } = (window as unknown as PageWindow).IWER_DEVICE;
    await remote.dispatch('animate_to', {
      device: 'hand-right',
      position,
      orientation: { roll: 0 },
      duration: 1,
    });
    await remote.dispatch('set_select_value', { device: 'hand-right', value: 1 });
  }, handAt(finish));

  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('pinch-results.png'), fullPage: true });
  await expect(page.getByRole('row', { name: /3 cm grid/ })).toContainText('3 cm grid2150%1');
  await expect(page.locator('#notes')).toContainText(
    'finish target pinched. Surface: table (table) at 0.74 m',
  );
  const result = JSON.parse(await page.locator('#json').innerText()) as {
    ended: string;
    seed: number;
    beta: number;
    fov: { fits: boolean };
    trials: unknown[];
  };
  expect(result).toMatchObject({ ended: 'finish', seed: 1, beta: 100, fov: { fits: true } });
  expect(result.trials).toHaveLength(2);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]); // Golden Rule 9: HTTP(S) and WebSocket, from page load on
});

// The two fallbacks of the surface choice; the labelled table is the scenario above.
for (const [room, heightM, why] of [
  ['counter', 0.92, 'a horizontal plane at table height with no table label'],
  ['none', 1.15, 'no plane, so floating 0.45 m below the head (1.6 m in the emulator)'],
] as const) {
  test(`T-105 surface in the ${room} room: ${why}`, async ({ page }) => {
    await openApp(page, readRoom(room), PAGE);
    await start(page);
    expect((await nextLit(page))![1]).toBeCloseTo(heightM);
  });
}
