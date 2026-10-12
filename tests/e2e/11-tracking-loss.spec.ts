/// <reference types="webxr" />
// T-116, the part of TC-E2E-16 that can be shown today (FR-HND-15, NFR-REL-02): the app's own HandSystem and
// CaptionSystem on IWER's emulated hands. A hand that carries a seed is taken away: hands:lost at once and the hint
// on screen, gesture:trackingLost after the grace, no release; the hand comes back: hands:found, the hint goes,
// and a new pinch works. An empty hand that is lost shows nothing (D-030).
// Not here, because nothing draws or drags yet: a dragged plant gliding back (T-146), the tint (T-119), the bed.
// The seed is a stand-in the test adds, an Interactable like the one T-127 will attach. The 5 s limit of the hint
// and a return inside the grace are in tests/unit/hands/ against a fake clock; here time is the machine's own.
// Emulator result (E): IWER can only take a whole hand away, at once. How real hands lose tracking is not shown.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { HAND_HINT_KEY, TRACKING_GRACE_MS } from '../../src/hands/config';

import { enterXR, openApp, readRoom, xrFrames } from './support/iwer';

type Core = typeof import('../../src/core/index');
type Ui = typeof import('../../src/ui/index');
type Hand = 'left' | 'right';

/** One event of hands/, as the page saw it: when (core's wall clock, ms) and what the hand held or pinched. */
interface Heard {
  name: string;
  hand: Hand;
  /** `hands:lost.held` or the `target` of a pinch start or a release: its id, or null. */
  id: string | null;
  atMs: number;
}
interface Probe {
  heard: Heard[];
  captions: InstanceType<Ui['CaptionSystem']>;
}
/** IWSDK 1.0.1 puts its dev runtime on the page in a dev build; the app's world is a field of it. */
interface DevPage {
  FRAMEWORK_MCP_RUNTIME: { world: import('@iwsdk/core').World };
  IWER_DEVICE: { remote: { dispatch(method: string, params?: object): Promise<unknown> } };
}

const SEED_ID = 'seed-e2e';

/** IWER's remote control: a pinch value (0..1) or the presence of one emulated hand. */
const dispatch = (page: Page, method: 'set_select_value' | 'set_connected', params: object) =>
  page.evaluate(
    ([method, params]) => (window as unknown as DevPage).IWER_DEVICE.remote.dispatch(method, params),
    [method, params] as const,
  );
const pinch = (page: Page, hand: Hand, value: 0 | 1) =>
  dispatch(page, 'set_select_value', { device: `hand-${hand}`, value });
const connect = (page: Page, hand: Hand, connected: boolean) =>
  dispatch(page, 'set_connected', { device: `hand-${hand}`, connected });

/** Resolves when the page has heard `count` events of that name for that hand; returns the last of them. */
async function heard(probe: JSHandle<Probe>, name: string, hand: Hand, count = 1): Promise<Heard> {
  const handle = await probe.evaluateHandle(
    (p, [name, hand, count]) =>
      new Promise<Heard>((done) => {
        const look = () => {
          const found = p.heard.filter((each) => each.name === name && each.hand === hand);
          if (found.length >= count) done(found[count - 1]!);
          else requestAnimationFrame(look);
        };
        look();
      }),
    [name, hand, count] as const,
  );
  return handle.jsonValue();
}

test('TC-E2E-16 a hand lost while it carries a seed: hint, revert after the grace, no release; an empty hand: nothing', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  const offHost = await openApp(page, readRoom('table'));
  await enterXR(page);

  // The app's own world and systems (src/index.ts registered them); the test only listens, and adds one seed that
  // any pinch reaches: nothing in the app delivers a seed before T-127.
  const probe = await page.evaluateHandle(async (seedId) => {
    const [coreUrl, uiUrl] = ['/src/core/index.ts', '/src/ui/index.ts'];
    const core = (await import(/* @vite-ignore */ coreUrl)) as Core;
    const ui = (await import(/* @vite-ignore */ uiUrl)) as Ui;
    const { world } = (window as unknown as DevPage).FRAMEWORK_MCP_RUNTIME;
    const captions = world.getSystem(ui.CaptionSystem);
    if (captions === undefined) throw new Error('src/index.ts did not register CaptionSystem');
    const heard: Heard[] = [];
    const note = (name: string, hand: Hand, id: string | null) =>
      heard.push({ name, hand, id, atMs: core.clock.now() });
    core.bus.on('hands:lost', (event) => note('hands:lost', event.hand, event.held?.id ?? null));
    core.bus.on('hands:found', (event) => note('hands:found', event.hand, null));
    core.bus.on('gesture:trackingLost', (event) => note('gesture:trackingLost', event.hand, null));
    core.bus.on('gesture:pinchStart', (event) =>
      note('gesture:pinchStart', event.hand, event.target?.id ?? null),
    );
    core.bus.on('gesture:release', (event) => note('gesture:release', event.hand, event.target?.id ?? null));
    // A radius of 5 m around the user's chest: wherever the emulated hand pinches, it pinches this seed.
    const seed = world
      .createEntity()
      .addComponent(core.Interactable, { kind: 'seed', id: seedId, radius: 5 });
    seed.getVectorView(core.Interactable, 'worldPos').set([0, 1, -0.3]);
    const held: Probe = { heard, captions };
    return held;
  }, SEED_ID);
  await xrFrames(page, 3);

  // The right hand picks the seed up.
  await pinch(page, 'right', 1);
  expect(await heard(probe, 'gesture:pinchStart', 'right')).toMatchObject({ id: SEED_ID });

  // It is taken away: hands:lost names what it held, and the hint is on screen.
  await connect(page, 'right', false);
  const lost = await heard(probe, 'hands:lost', 'right');
  expect(lost.id).toBe(SEED_ID);
  await page.waitForFunction((p) => p.captions.shown !== null, probe);
  expect(await probe.evaluate((p) => p.captions.shown)).toBe(HAND_HINT_KEY);

  // The grace runs out: reverted, and nothing was released (so nothing was committed).
  const reverted = await heard(probe, 'gesture:trackingLost', 'right');
  // 2 ms of slack: the machine counts the grace on the frame time in whole ms; the page notes the wall clock.
  expect(reverted.atMs - lost.atMs).toBeGreaterThanOrEqual(TRACKING_GRACE_MS - 2);
  console.log(
    `T-116 hand removed: gesture:trackingLost ${reverted.atMs - lost.atMs} ms after hands:lost (emulator; the grace is ${TRACKING_GRACE_MS} ms)`,
  );
  expect(await probe.evaluate((p) => p.heard.map((each) => each.name))).toEqual([
    'gesture:pinchStart',
    'hands:lost',
    'gesture:trackingLost',
  ]);

  // The hand is back: hands:found, once, and the hint goes (a caption stays its minimum time).
  await connect(page, 'right', true);
  await heard(probe, 'hands:found', 'right');
  await page.waitForFunction((p) => p.captions.shown === null, probe);

  // A new pinch works, and its release is the first release there has been.
  await pinch(page, 'right', 0);
  await xrFrames(page, 3);
  await pinch(page, 'right', 1);
  expect(await heard(probe, 'gesture:pinchStart', 'right', 2)).toMatchObject({ id: SEED_ID });
  await pinch(page, 'right', 0);
  expect(await heard(probe, 'gesture:release', 'right')).toMatchObject({ id: SEED_ID });
  expect(
    await probe.evaluate((p) => p.heard.filter((each) => each.hand === 'right').map((each) => each.name)),
  ).toEqual([
    'gesture:pinchStart',
    'hands:lost',
    'gesture:trackingLost',
    'hands:found',
    'gesture:pinchStart',
    'gesture:release',
  ]);

  // D-030: an empty hand that is lost says so, and shows no hint and reverts nothing.
  await connect(page, 'left', false);
  expect(await heard(probe, 'hands:lost', 'left')).toMatchObject({ id: null });
  await xrFrames(page, 30); // longer than the grace at any frame rate the emulator reaches
  expect(await probe.evaluate((p) => p.captions.shown)).toBeNull();
  await connect(page, 'left', true);
  await heard(probe, 'hands:found', 'left');
  expect(
    await probe.evaluate((p) => p.heard.filter((each) => each.hand === 'left').map((each) => each.name)),
  ).toEqual(['hands:lost', 'hands:found']);

  expect(errors).toEqual([]);
  expect(offHost).toEqual([]); // Golden Rule 9
});
