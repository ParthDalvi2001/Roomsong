// The Node side of the shaky-hands scenes: opens the app in the emulator, hears its errors, and plays one scene in the
// page (shaky-scenarios.ts). tests/e2e/30-shaky-hands.spec.ts and the videos both come through here.
import { expect, type Page, type TestInfo } from '@playwright/test';

import { enterXR, openApp, readRoom } from './iwer';

import type { Driver } from './shaky-rig';
import type { Facts } from './shaky-scenarios';
import type { ShakyScenario } from './shaky-table';

type Scenes = typeof import('./shaky-scenarios');

/** What the emulator offers the rig (iwer 2.5.0). */
interface Iwer {
  activeSession?: XRSession;
  /** 'manual': the emulator's own panel writes its stored poses over the hands and head every frame. */
  controlMode: 'manual' | 'programmatic';
  position: { set(x: number, y: number, z: number): void };
  quaternion: { set(x: number, y: number, z: number, w: number): void };
  hands: Record<
    'left' | 'right',
    {
      position: { set(x: number, y: number, z: number): void };
      quaternion: { set(x: number, y: number, z: number, w: number): void };
      updatePinchValue(value: number): void;
      connected: boolean;
      inputSource: XRInputSource;
    }
  >;
}

/** `SHAKY_VIDEO=1` (tests/tools/test-videos.ts): the ghost hands on, a caption, and a look at each ending. */
const IS_VIDEO = process.env.SHAKY_VIDEO === '1';
const LINGER_MS = 1800;

const SEED_BASE = 20261107;

/** Runs in the page, before Enter: the rig on IWER's own hands and head. A drop is a hand leaving the input sources. */
function preparePage(seed: number): Promise<void> {
  const url = '/tests/e2e/support/shaky-scenarios.ts';
  return (import(/* @vite-ignore */ url) as Promise<Scenes>).then((m) => {
    const device = (window as unknown as { IWER_DEVICE: Iwer }).IWER_DEVICE;
    // IWER's hand fires select as its pinch value leaves 0, at the first hint of a curl; a platform's classifier fires
    // as the fingers meet. The rig says when (Driver.select): IWER's own select events are held back.
    let lastFrame: XRFrame | null = null;
    let isOurs = false;
    let wrapped: XRSession | null = null;
    const driver: Driver = {
      hand(hand, at, turn, curl, tracked) {
        device.controlMode = 'programmatic'; // each frame: a remote command returns it to manual 30 s later
        const input = device.hands[hand];
        input.position.set(at.x, at.y, at.z);
        input.quaternion.set(turn.x, turn.y, turn.z, turn.w);
        input.updatePinchValue(curl);
        if (input.connected !== tracked) input.connected = tracked;
      },
      select(hand, down) {
        const session = device.activeSession;
        if (session === undefined || lastFrame === null) return;
        const init = { frame: lastFrame, inputSource: device.hands[hand].inputSource };
        isOurs = true;
        try {
          for (const type of (down ? ['selectstart'] : ['select', 'selectend']) as XRInputSourceEventType[])
            session.dispatchEvent(new XRInputSourceEvent(type, init));
        } finally {
          isOurs = false;
        }
      },
      head(at, turn) {
        device.position.set(at.x, at.y, at.z);
        device.quaternion.set(turn.x, turn.y, turn.z, turn.w);
      },
      frame(callback) {
        const session = device.activeSession;
        if (session === undefined) return;
        if (wrapped !== session) {
          wrapped = session;
          const dispatch = session.dispatchEvent.bind(session);
          session.dispatchEvent = (event) => (event.type.startsWith('select') && !isOurs ? true : dispatch(event));
        }
        session.requestAnimationFrame((_time, frame) => {
          lastFrame = frame;
          callback();
        });
      },
    };
    const rig = m.prepare(seed, driver);
    rig.onBeat = (line) => {
      const beat = document.getElementById('shaky-beat');
      if (beat !== null) beat.textContent = line;
    };
  });
}

/** A caption drawn over the page, so it is in the recording: which scene, and that this is the emulator. */
const caption = (page: Page, title: string) =>
  page.evaluate((title) => {
    const box = document.createElement('div');
    box.style.cssText =
      'position:fixed;left:16px;top:12px;right:16px;z-index:99999;font:600 22px system-ui,sans-serif;color:#fff;' +
      'text-shadow:0 1px 3px #000,0 0 8px #000;pointer-events:none';
    const head = document.createElement('div');
    head.textContent = title;
    const beat = document.createElement('div');
    beat.id = 'shaky-beat';
    beat.style.cssText = 'font-weight:400;font-size:20px;color:#ffe9a8;margin-top:4px';
    const label = document.createElement('div');
    label.textContent = 'EMULATOR FOOTAGE: simulated hands, not a headset';
    label.style.cssText = 'font-weight:400;font-size:15px;opacity:.85;margin-top:4px';
    box.append(head, beat, label);
    document.body.append(box);
  }, title);

/**
 * The start page (BUG-028), played from Node, since only Playwright's mouse makes a real tap. A tap is drawn in a ring
 * round the Enter button, or at the side of it: a laser pointer's stray click. Nothing on it may switch anything on.
 */
async function strayTaps(page: Page): Promise<Facts> {
  const enter = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await expect(enter).toBeEnabled({ timeout: 15_000 });
  const section = page.getByRole('main').locator('details').first();
  await expect(section).toHaveJSProperty('open', false);
  const box = (await enter.boundingBox())!;
  // Every 4th tap goes further: the Enter button and the section's switches are this far apart on the headset's page.
  const taps = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * 2 * Math.PI;
    const reach = i % 4 === 3 ? 260 : 110;
    return {
      x: box.x + box.width / 2 + Math.cos(angle) * (box.width / 2 + reach),
      y: box.y + box.height / 2 + Math.sin(angle) * (box.height / 2 + reach),
    };
  });
  let landedOnSwitch = 0;
  for (const tap of taps) {
    landedOnSwitch += await page.evaluate(({ x, y }) => {
      const under = document.elementFromPoint(x, y);
      return under?.closest('label, input') !== null && under !== null ? 1 : 0;
    }, tap);
    await page.mouse.click(tap.x, tap.y);
  }
  const settings = await page.evaluate(async () => {
    const url = '/src/core/index.ts';
    const core = (await import(/* @vite-ignore */ url)) as typeof import('../../../src/core/index');
    const { oneHand, gazeDwell, highContrast, reducedMotion } = core.settings.get();
    return { oneHand, gazeDwell, highContrast, reducedMotion };
  });
  expect(settings, 'stray taps round Enter switched something on').toEqual({
    oneHand: false,
    gazeDwell: false,
    highContrast: false,
    reducedMotion: false,
  });
  await expect(section, 'stray taps round Enter opened the Accessibility section').toHaveJSProperty('open', false);
  return { taps: taps.length, landedOnSwitch };
}

/** Opens the app, plays scene `s` and throws if a player would be stuck, or if the page reports an error. */
export async function playScene(page: Page, s: ShakyScenario, info: TestInfo): Promise<Facts> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  const opened = Date.now();
  const flags = [s.flags, IS_VIDEO ? 'handCue' : ''].filter((flag) => flag !== '').join(',');
  const offHost = await openApp(page, readRoom('table'), flags === '' ? '/' : `/?flags=${flags}`, {
    onboarding: s.tutorial === true,
  });
  const markStart = () => info.annotations.push({ type: 'startMs', description: String(Date.now() - opened) });
  let facts: Facts;
  if (s.pageOnly === true) {
    if (IS_VIDEO) await caption(page, `${s.n}. ${s.title}`);
    markStart();
    facts = await strayTaps(page);
    await enterXR(page);
  } else {
    await page.waitForFunction(() => window.__roomsong !== undefined, null, { timeout: 15_000 });
    await page.evaluate(preparePage, SEED_BASE + s.n);
    await enterXR(page);
    if (IS_VIDEO) await caption(page, `${s.n}. ${s.title}`);
    markStart();
    facts = await page.evaluate(async (n) => {
      const url = '/tests/e2e/support/shaky-scenarios.ts';
      const m = (await import(/* @vite-ignore */ url)) as Scenes;
      return m.play(n);
    }, s.n);
  }
  if (IS_VIDEO) await page.waitForTimeout(LINGER_MS); // the ending on screen: a recording's pause, in no test's logic
  console.log(`Shaky ${s.n} (emulator, seed ${SEED_BASE + s.n}): ${JSON.stringify(facts)}`);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
  return facts;
}
