/// <reference types="webxr" />
// T-128a: boot, entry and session (LLD §3.5 a1 to a4; API_SPEC §1.10 rules 1, 2, 3, 12, 14). The landing page is
// readable before the SDK arrives; the page's own Enter is the one way in and starts the sound; a system that
// throws does not stop the frames; a session can be hidden, shown, ended and entered again.
// Emulator results (E): they say nothing about a headset. Whether the Quest Browser lets the audio context and
// the session request share one click, and what it reports when the headset comes off, are device checks.
import { expect, test, type JSHandle, type Page, type Route } from '@playwright/test';

import { BUILT_PAGE_URL } from '../../playwright.config';

import { enterXR, openApp, readRoom, WORLD_READY_MS, xrFrames } from './support/iwer';

const APP_CHUNK = '**/src/app.ts*'; // what the boot's import('./app.js') asks the dev server for
/** A request for SDK or Three.js code, as the dev server names its pre-bundled packages. */
const isSdk = (url: string) => /@iwsdk_core|\/three\b|uikit/.test(url);
/** What the built landing page may weigh before the app chunk, unzipped: under four times the 14 kB it is today.
 *  The SDK chunk is 1.4 MB (5.9 MB before T-171), so one import of it into the boot cannot hide under this. */
const BOOT_BUDGET_BYTES = 52_000;
const FOVEATION_MEDIUM = 2 / 3; // NFR-PERF-09, pinned here on purpose (render/config.ts)
const AUDIO_START_GRACE_MS = 3000; // LLD §3.3 B, pinned here on purpose (src/app.ts)
const NO_SOUND = 'E_AUDIO_CONTEXT'; // the caption "Sound unavailable"

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Ui = typeof import('../../src/ui/index');
type PerfSample = import('../../src/core/index').EventMap['perf:sample'];

/** The part of IWER's XRDevice this spec uses (iwer 2.5.0). */
interface Device {
  supportedFeatures: string[];
  activeSession?: XRSession;
  /** Queued until the session's next frame, which then fires the session's `visibilitychange`. */
  updateVisibilityState(state: XRVisibilityState): void;
}
/** What a session test holds in the page. */
interface SessionProbe {
  /** The three `xr:*` events since the probe was made, with the page's time. */
  heard: { type: string; visible: boolean; atMs: number }[];
  captions: InstanceType<Ui['CaptionSystem']>;
  engine: NonNullable<Window['__roomsong']>['engine'];
  /** core's log ring, one line per entry: "level scope msg". */
  log(): string[];
  /** The state of the engine's own AudioContext, 'none' before `init()` has made it. */
  audio(): AudioContextState | 'none';
  foveation(): number | undefined;
  /**
   * Every caption raised since the probe was made (a Caption component added to an entity): its key, and how
   * long after the latest `xr:sessionStart`. Seen through an ECS query inside the call that raises it, so the
   * time does not depend on the emulator's frame rate.
   */
  raised: { key: string; afterStartMs: number }[];
}

const landing = (page: Page) => page.getByRole('main');
const enterButton = (page: Page) => landing(page).getByRole('button', { name: 'Enter the garden' });
const status = (page: Page) => landing(page).getByRole('status');
const device = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { IWER_DEVICE?: Device }).IWER_DEVICE) as Promise<
    JSHandle<Device>
  >;

/** Before the page loads: count every AudioContext the page constructs, IWSDK's and Three.js's included. */
async function countAudioContexts(page: Page): Promise<() => Promise<number>> {
  await page.addInitScript(() => {
    const counter = window as unknown as { audioContextsMade: number };
    counter.audioContextsMade = 0;
    window.AudioContext = new Proxy(window.AudioContext, {
      construct(target, args: ConstructorParameters<typeof AudioContext>) {
        counter.audioContextsMade++;
        return new target(...args);
      },
    });
  });
  return () => page.evaluate(() => (window as unknown as { audioContextsMade: number }).audioContextsMade);
}

/** Waits for the world (the Enter button works), then listens in the page. Made before a session is entered. */
async function probeSession(page: Page): Promise<JSHandle<SessionProbe>> {
  await expect(enterButton(page)).toBeEnabled({ timeout: WORLD_READY_MS });
  return page.evaluateHandle(async () => {
    const [coreUrl, componentsUrl, uiUrl] = [
      '/src/core/index.ts',
      '/src/core/components.ts',
      '/src/ui/index.ts',
    ];
    const core = (await import(/* @vite-ignore */ coreUrl)) as Core;
    const { Caption } = (await import(/* @vite-ignore */ componentsUrl)) as Components;
    const ui = (await import(/* @vite-ignore */ uiUrl)) as Ui;
    const { world, engine } = window.__roomsong!;
    const captions = world.getSystem(ui.CaptionSystem)!;
    const heard: SessionProbe['heard'] = [];
    for (const type of ['xr:sessionStart', 'xr:sessionEnd', 'xr:visibility'] as const)
      core.bus.on(type, ({ visible }) => heard.push({ type, visible, atMs: performance.now() }));
    // Noted as the emit of `xr:sessionStart` begins: the wiring's handler, subscribed at boot before this one, raises
    // its caption inside that emit.
    let startedAtMs = NaN;
    const emit = core.bus.emit.bind(core.bus);
    core.bus.emit = (type, payload) => {
      if (type === 'xr:sessionStart') startedAtMs = performance.now();
      emit(type, payload);
    };
    const raised: SessionProbe['raised'] = [];
    world.queryManager.registerQuery({ required: [Caption] }).subscribe('qualify', (entity) => {
      const key = entity.getValue(Caption, 'key') ?? '';
      // The tuning ripple's own captions (T-142) come in every session the garden tunes (T-128d): not the wiring's.
      if (key.startsWith('ripple')) return;
      raised.push({ key, afterStartMs: performance.now() - startedAtMs });
    });
    const probe: SessionProbe = {
      heard,
      captions,
      engine,
      log: () => core.log.recent().map((entry) => `${entry.level} ${entry.scope} ${entry.msg}`),
      // `g` is the engine's private graph: read, never written.
      audio: () => (engine as unknown as { g: { ctx: AudioContext } | null }).g?.ctx.state ?? 'none',
      foveation: () => world.renderer.xr.getFoveation(),
      raised,
    };
    return probe;
  });
}
const audio = (probe: JSHandle<SessionProbe>) => probe.evaluate((p) => p.audio());
const heardTypes = (probe: JSHandle<SessionProbe>) => probe.evaluate((p) => p.heard.map((e) => e.type));
/** `xr:visibility` only: the `visible` of each, in order. */
const visibility = (probe: JSHandle<SessionProbe>) =>
  probe.evaluate((p) => p.heard.filter((e) => e.type === 'xr:visibility').map((e) => e.visible));
/** Resolves once `ms` have passed since the latest `xr:sessionStart`: the app's own deadline, not a sleep. */
const sinceSessionStart = (page: Page, probe: JSHandle<SessionProbe>, ms: number) =>
  page.waitForFunction(
    ([p, ms]) => {
      const starts = p.heard.filter((e) => e.type === 'xr:sessionStart');
      return performance.now() - (starts[starts.length - 1]?.atMs ?? Infinity) > ms;
    },
    [probe, ms] as const,
  );

/** Console errors and page errors from now on. */
function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

/** Before the page loads: note when the page's name first shows, in ms since the navigation started. */
async function timeLandingText(page: Page): Promise<() => Promise<number>> {
  await page.addInitScript(() => {
    const seen = new MutationObserver(() => {
      if (document.querySelector('#landing h1') === null) return;
      (window as unknown as { landingAtMs: number }).landingAtMs = performance.now();
      seen.disconnect();
    });
    seen.observe(document, { childList: true, subtree: true });
  });
  return () => page.evaluate(() => (window as unknown as { landingAtMs: number }).landingAtMs);
}

test('a1 the landing page is on screen and usable before the app chunk, and no SDK code is asked for until then', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  let asked = false;
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(APP_CHUNK, async (route) => {
    asked = true;
    await held;
    await route.continue();
  });
  const landingAtMs = await timeLandingText(page);
  await openApp(page, readRoom('none'));

  await expect(landing(page).getByRole('heading', { level: 1 })).toHaveText('Roomsong');
  console.log(
    `T-128a navigation to the landing text ${(await landingAtMs()).toFixed(0)} ms (dev server, emulator host)`,
  );
  await expect.poll(() => asked).toBe(true);
  // The whole page, with the app chunk still on its way: the name, a disabled Enter, the status, the toggles.
  await expect(enterButton(page)).toBeDisabled();
  await expect(status(page)).toHaveText('Getting the garden ready.');
  await expect(landing(page).getByRole('listitem').first()).toHaveText('Mixed reality: supported.');
  await landing(page).getByLabel('High contrast').check();
  await expect(landing(page).getByLabel('High contrast')).toBeChecked();
  expect(requests.filter(isSdk)).toEqual([]);

  release();
  await expect(enterButton(page)).toBeEnabled({ timeout: WORLD_READY_MS });
  await expect(status(page)).toHaveText('');
  await expect(landing(page).getByLabel('High contrast')).toBeChecked(); // the world arriving unticks nothing
  // The control: the app chunk does bring the SDK, under a name the filter sees.
  expect(requests.filter(isSdk).length).toBeGreaterThan(0);
});

test('a1 an app chunk that does not arrive: the page says to reload and offers no Enter', async ({
  page,
}) => {
  const errors = watch(page);
  await page.route(APP_CHUNK, (route) => route.abort());
  await openApp(page, readRoom('none'));

  await expect(status(page)).toHaveText('The garden could not load. Reload the page.');
  await expect(enterButton(page)).toBeDisabled();
  await expect(landing(page).getByLabel('High contrast')).toBeEnabled();
  expect(errors.filter((line) => line.startsWith('[app] the world could not load'))).toHaveLength(1);
});

test('a1 built: the page is readable with the files index.html names alone, a few kB, the app chunk held back', async ({
  page,
}) => {
  // The production build in plain headless Chromium (no emulator). Every script and style the page's own HTML
  // names is weighed and goes through; whatever the boot asks for afterwards (the app chunk, and the chunks Vite
  // preloads with it) is held back.
  const html = await (await page.request.get(BUILT_PAGE_URL)).text();
  const named = Array.from(html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g), (match) => match[1] ?? '');
  expect(named.length).toBeGreaterThan(0);
  let bootBytes = Buffer.byteLength(html);
  for (const name of named)
    bootBytes += (await (await page.request.get(BUILT_PAGE_URL + name)).body()).length;
  let released = false;
  const held: Route[] = [];
  await page.route('**/assets/**', (route) => {
    const isNamed = named.some((name) => route.request().url().endsWith(`/${name}`));
    return isNamed || released ? route.continue() : void held.push(route);
  });
  const landingAtMs = await timeLandingText(page);
  await page.goto(BUILT_PAGE_URL);

  await expect(landing(page).getByRole('heading', { level: 1 })).toHaveText('Roomsong');
  await expect.poll(() => held.length).toBeGreaterThan(0); // the boot has asked for the app chunk
  await expect(enterButton(page)).toBeDisabled();
  await expect(landing(page).getByLabel('High contrast')).toBeEnabled();
  await expect(landing(page).getByRole('listitem').first()).toContainText('Mixed reality: ');
  console.log(
    `T-128a built page: landing text ${(await landingAtMs()).toFixed(0)} ms after navigation, with ` +
      `${bootBytes} bytes unzipped in index.html and the ${named.length} files it names (preview server, this host)`,
  );
  expect(bootBytes).toBeLessThan(BOOT_BUDGET_BYTES);

  released = true;
  for (const route of held) await route.continue();
});

test('a3 in a session: perf:sample once a second, medium foveation, a circuit breaker on every system', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  await enterXR(page);

  const samples = await page.evaluateHandle(async () => {
    const url = '/src/core/index.ts';
    const core = (await import(/* @vite-ignore */ url)) as Core;
    const samples: (PerfSample & { atMs: number })[] = [];
    core.bus.on('perf:sample', (sample) => samples.push({ ...sample, atMs: performance.now() }));
    return samples;
  });
  await page.waitForFunction((s) => s.length >= 3, samples, { timeout: 15_000 });
  const got = await samples.jsonValue();
  for (const [i, sample] of got.entries()) {
    console.log(
      `T-128a perf:sample in the session: ${sample.fps.toFixed(0)} fps, ${sample.jsMs.toFixed(2)} ms script, ` +
        `${sample.draws} draws, ${sample.tris} tris, ${sample.voices} voices, flash ${sample.maxFlashPerS} (emulator)`,
    );
    expect(sample.fps).toBeGreaterThan(0);
    expect(sample.jsMs).toBeGreaterThan(0);
    expect(sample.maxFlashPerS).toBeLessThanOrEqual(3); // FR-UI-11
    // Once a second: the first frame at or past 1000 ms, so never sooner. The upper bound only says "not every
    // few seconds"; it leaves room for the slow frames of software rendering on a busy host (13 fps seen).
    if (i > 0) {
      const gapMs = sample.atMs - (got[i - 1]?.atMs ?? 0);
      expect(gapMs).toBeGreaterThanOrEqual(990);
      expect(gapMs).toBeLessThan(3000);
    }
  }

  const world = await page.evaluate(() => {
    const { world } = window.__roomsong!;
    const systems = world.getSystems();
    return {
      foveation: world.renderer.xr.getFoveation(),
      systems: systems.length,
      // The breaker is an `update` of the instance's own, in front of its class's.
      unguarded: systems
        .filter((system) => !Object.prototype.hasOwnProperty.call(system, 'update'))
        .map((system) => system.constructor.name),
      priorities: systems.map((system) => system.priority),
    };
  });
  // Three's stored number, not the XR layer's `fixedFoveation`: this proves `setFoveation` was called with it and
  // that Three still holds it in a session. What the headset's layer does with it is the device check.
  expect(world.foveation).toBeCloseTo(FOVEATION_MEDIUM, 6);
  expect(world.unguarded).toEqual([]);
  expect(world.systems).toBeGreaterThan(3); // ours and IWSDK's own
  expect(world.priorities[0]).toBe(-100); // PerfSystem runs first: its update is the start of the frame
  expect([...world.priorities].sort((a, b) => a - b)).toEqual(world.priorities);
  expect(world.priorities).toEqual(expect.arrayContaining([20, 60])); // HandSystem, CaptionSystem
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('a3 a system that throws on every frame does not stop the frames, and runs again when it no longer throws', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('table'));
  await enterXR(page);

  // A planted fault inside the app's own CaptionSystem: every update throws from now on.
  const probe = await page.evaluateHandle(async () => {
    const [coreUrl, componentsUrl, uiUrl] = [
      '/src/core/index.ts',
      '/src/core/components.ts',
      '/src/ui/index.ts',
    ];
    const core = (await import(/* @vite-ignore */ coreUrl)) as Core;
    const { Caption } = (await import(/* @vite-ignore */ componentsUrl)) as Components;
    const ui = (await import(/* @vite-ignore */ uiUrl)) as Ui;
    const { world } = window.__roomsong!;
    const captions = world.getSystem(ui.CaptionSystem)!;
    const queue = (captions as unknown as { queue: { current(nowMs: number): unknown } }).queue;
    const current = queue.current.bind(queue);
    /** When each update of the system ran (and threw), on the page's clock. */
    const ranAtMs: number[] = [];
    queue.current = () => {
      ranAtMs.push(performance.now());
      throw new Error('planted: every frame');
    };
    let frames = 0;
    const count = () => {
      frames++;
      world.renderer.xr.getSession()?.requestAnimationFrame(count);
    };
    count();
    return {
      captions,
      /** XR frames since the fault was planted, the times the system ran in them, and its own pause flag. */
      seen: () => ({ frames, ranAtMs: [...ranAtMs], paused: captions.isPaused }),
      mend: () => void (queue.current = current),
      raise: () =>
        world
          .createEntity()
          .addComponent(Caption, { key: 'rippleCeiling', expiresAt: core.clock.now() + 60_000 }),
    };
  });
  const threw = () => errors.filter((line) => line.startsWith('[app] CaptionSystem.update threw'));
  // Three rounds of the breaker: skipped for a second of frame time, run again, thrown again.
  await expect.poll(() => threw().length, { timeout: 15_000 }).toBeGreaterThanOrEqual(3);
  const { frames, ranAtMs, paused } = await probe.evaluate((p) => p.seen());
  const gapsMs = ranAtMs.slice(1).map((at, i) => Math.round(at - (ranAtMs[i] ?? 0)));
  console.log(
    `T-128a CaptionSystem threw ${ranAtMs.length} times in ${frames} XR frames: ${frames - ranAtMs.length} of ` +
      `its updates were skipped, and it ran again ${gapsMs.join(' and ')} ms after a throw (emulator)`,
  );
  // A throw costs that system a second, never the frames. With no pause there would be a throw on every frame;
  // three frames a throw is the bar because software rendering on a busy host has been as slow as 13 fps.
  expect(frames).toBeGreaterThan(3 * ranAtMs.length);
  // It runs again on the first frame a second of frame time after the throw: never sooner (20 ms of slack: the
  // frame time is read at the frame's start, the page's clock inside it), and not seconds later.
  for (const gapMs of gapsMs) {
    expect(gapMs).toBeGreaterThanOrEqual(980);
    expect(gapMs).toBeLessThan(3000);
  }
  expect(paused).toBe(false); // skipped by the breaker, not stopped: the system's own pause is left alone
  await xrFrames(page, 10);
  expect(errors).toEqual(threw()); // nothing else went wrong, and nothing reached the page as an uncaught error

  // Mended: within the breaker's pause the system is back and shows a caption.
  await probe.evaluate((p) => {
    p.mend();
    p.raise();
  });
  await page.waitForFunction((p) => p.captions.shown === 'rippleCeiling', probe);
});

test('a4 the Enter click starts the session and the sound: one audio context, made in the click, and running', async ({
  page,
}) => {
  const errors = watch(page);
  const made = await countAudioContexts(page);
  const offHost = await openApp(page, readRoom('table'));
  const probe = await probeSession(page);
  const madeBefore = await made();
  expect(await audio(probe)).toBe('none'); // the page makes no context of ours before the click

  const clicked = Date.now();
  await enterXR(page);
  console.log(
    `T-128a Enter click to the first XR frame ${Date.now() - clicked} ms (emulator, software rendering)`,
  );
  await page.waitForFunction((p) => p.engine.clock.now() > 0, probe); // the audio clock runs
  expect(await audio(probe)).toBe('running');
  expect(await made()).toBe(madeBefore + 1);
  expect(await heardTypes(probe)).toEqual(['xr:sessionStart']);

  // Past the grace: the session has sound, so nothing says otherwise.
  await sinceSessionStart(page, probe, AUDIO_START_GRACE_MS + 200);
  const log = await probe.evaluate((p) => p.log());
  expect(log).toContain('info app audio started');
  expect(log.filter((line) => line.includes(NO_SOUND))).toEqual([]);
  expect(await probe.evaluate((p) => p.raised)).toEqual([]);
  // A tuning-ripple caption may be up meanwhile (the garden tunes the room, T-128d); "Sound unavailable" is not.
  expect(await probe.evaluate((p) => p.captions.shown)).not.toBe(NO_SOUND);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('a4 a refused session leaves the page usable and no audio context running; the next Enter has sound', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('table'));
  const probe = await probeSession(page);
  const d = await device(page);
  // A headset with hand tracking switched off refuses a session that requires it.
  await d.evaluate((d) => d.supportedFeatures.splice(d.supportedFeatures.indexOf('hand-tracking'), 1));

  await enterButton(page).click();
  await expect(status(page)).toContainText('The garden did not open.');
  await expect(enterButton(page)).toBeEnabled();
  // The click made the context; with no session it fades out and stops.
  await expect.poll(() => audio(probe)).toBe('suspended');
  expect(await heardTypes(probe)).toEqual([]);
  // Two expected lines: IWSDK logs the refusal itself, and the page logs its error code (API_SPEC §5).
  expect(errors).toHaveLength(2);

  await d.evaluate((d) => d.supportedFeatures.push('hand-tracking'));
  await enterXR(page);
  await expect.poll(() => audio(probe)).toBe('running');
  expect(await heardTypes(probe)).toEqual(['xr:sessionStart']);
  expect(errors).toHaveLength(2);
});

test('a4 a session hidden and shown again: xr:visibility false then true, once each, and the sound follows', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('table'));
  const probe = await probeSession(page);
  await enterXR(page);
  const d = await device(page);
  const show = async (state: XRVisibilityState) => {
    await d.evaluate((d, state) => d.updateVisibilityState(state), state);
    await xrFrames(page, 3); // the emulator applies it on the next frame, and keeps its frames coming when hidden
    expect(await d.evaluate((d) => d.activeSession?.visibilityState)).toBe(state);
  };
  await expect.poll(() => audio(probe)).toBe('running');

  // The headset comes off: one event, and the sound fades out and stops (FR-SYS-05).
  await show('hidden');
  expect(await visibility(probe)).toEqual([false]);
  await expect.poll(() => audio(probe)).toBe('suspended');
  // Back, blurred first (a system menu over the session): that counts as seen, so this is the one `true`.
  await show('visible-blurred');
  expect(await visibility(probe)).toEqual([false, true]);
  await expect.poll(() => audio(probe)).toBe('running');
  // Blurred to visible and back: the session fires its event each time, and nothing is emitted for it.
  await show('visible');
  await show('visible-blurred');
  await show('visible');
  expect(await visibility(probe)).toEqual([false, true]);
  expect(await heardTypes(probe)).toEqual(['xr:sessionStart', 'xr:visibility', 'xr:visibility']);
  expect(errors).toEqual([]);
});

test('a4 the session ends cleanly and a second Enter starts another, with no second audio context of ours', async ({
  page,
}) => {
  const errors = watch(page);
  const made = await countAudioContexts(page);
  const offHost = await openApp(page, readRoom('table'));
  const probe = await probeSession(page);
  const d = await device(page);

  await enterXR(page);
  await expect.poll(() => audio(probe)).toBe('running');
  const madeAfterFirstEnter = await made();
  await d.evaluate((d) => d.activeSession?.end());
  await expect(landing(page)).toBeVisible();
  await expect(enterButton(page)).toBeFocused();
  await expect.poll(() => audio(probe)).toBe('suspended'); // a clean end: no context runs on the page

  await enterXR(page);
  await expect.poll(() => audio(probe)).toBe('running');
  await page.waitForFunction(
    (p) => p.log().filter((line) => line === 'info app audio started').length === 2,
    probe,
  );
  expect(await heardTypes(probe)).toEqual(['xr:sessionStart', 'xr:sessionEnd', 'xr:sessionStart']);
  // IWSDK's own audio system makes a context in World.create, so the rule is not "one on the page": it is that
  // nothing is constructed after the first Enter. The second init() only resumes.
  expect(await made()).toBe(madeAfterFirstEnter);
  // Three.js keeps the foveation and applies it at each session start.
  expect(await probe.evaluate((p) => p.foveation())).toBeCloseTo(FOVEATION_MEDIUM, 6);

  // The second session has its own visibility: nothing of the first is left listening.
  await d.evaluate((d) => d.updateVisibilityState('hidden'));
  await expect.poll(() => visibility(probe)).toEqual([false]);
  await d.evaluate((d) => d.updateVisibilityState('visible'));
  await expect.poll(() => visibility(probe)).toEqual([false, true]);
  await d.evaluate((d) => d.activeSession?.end());
  await expect(landing(page)).toBeVisible();
  expect((await heardTypes(probe)).slice(-1)).toEqual(['xr:sessionEnd']);
  expect((await probe.evaluate((p) => p.log())).filter((line) => line.includes(NO_SOUND))).toEqual([]);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('a4 no sound, init() rejected: "Sound unavailable" is up from the session\'s start, and the session runs', async ({
  page,
}) => {
  const errors = watch(page);
  // A room with a table: in one without, the bed waits at level 3 and the app raises its hint (T-128c).
  await openApp(page, readRoom('table'));
  const probe = await probeSession(page);
  await probe.evaluate((p) => {
    p.engine.init = () => Promise.reject(new Error('planted: no audio'));
  });

  await enterXR(page);
  // Raised in the same call as `xr:sessionStart`, not after the grace, and drawn by the session's frames.
  const [first] = await probe.evaluate((p) => p.raised);
  expect(first?.key).toBe(NO_SOUND);
  expect(first?.afterStartMs).toBeLessThan(AUDIO_START_GRACE_MS / 2);
  await page.waitForFunction((p) => p.captions.shown === 'E_AUDIO_CONTEXT', probe);
  await xrFrames(page, 10); // the garden goes on without sound
  // Once: the grace that follows a session's start raises no second one.
  await sinceSessionStart(page, probe, AUDIO_START_GRACE_MS + 300);
  expect(await probe.evaluate((p) => p.raised.map((each) => each.key))).toEqual([NO_SOUND]);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toMatch(/^\[app\] E_AUDIO_CONTEXT /);
});

test('a4 no sound, a session with no click before it: "Sound unavailable" is up from its start', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('none'));
  const probe = await probeSession(page);
  const d = await device(page);
  // The second way in that the dev plugin's native XR control has: a session request with no Enter click.
  await page.evaluate(() => window.__roomsong!.world.launchXR());
  await page.waitForFunction((d) => d.activeSession !== undefined, d);

  await page.waitForFunction((p) => p.captions.shown === 'E_AUDIO_CONTEXT', probe);
  const [first] = await probe.evaluate((p) => p.raised);
  expect(first?.key).toBe(NO_SOUND);
  expect(first?.afterStartMs).toBeLessThan(AUDIO_START_GRACE_MS / 2); // at the start, not after the grace
  expect(await audio(probe)).toBe('none'); // init() was never called
  expect(errors).toEqual([]);
});

test('a4 no sound, a context that never starts: the caption comes after the grace, and not for a session that ended', async ({
  page,
}) => {
  const errors = watch(page);
  // A room with a table: in one without, the bed waits at level 3 and the app raises its hint (T-128c).
  await openApp(page, readRoom('table'));
  const probe = await probeSession(page);
  const d = await device(page);
  // What a browser that will not start the context looks like: init() neither resolves nor rejects.
  await probe.evaluate((p) => {
    p.engine.init = () => new Promise(() => {});
  });

  // A session that ends inside the grace takes its timer with it.
  await enterXR(page);
  await d.evaluate((d) => d.activeSession?.end());
  await expect(landing(page)).toBeVisible();
  await sinceSessionStart(page, probe, AUDIO_START_GRACE_MS + 300);
  expect(await probe.evaluate((p) => p.raised)).toEqual([]);
  expect(await probe.evaluate((p) => p.captions.shown)).toBeNull();

  // A session that lasts: the caption, AUDIO_START_GRACE_MS after its start.
  await enterXR(page);
  await page.waitForFunction((p) => p.captions.shown === 'E_AUDIO_CONTEXT', probe);
  const raised = await probe.evaluate((p) => p.raised);
  expect(raised.map((each) => each.key)).toEqual([NO_SOUND]);
  const afterMs = raised[0]?.afterStartMs ?? NaN;
  console.log(
    `T-128a no audio clock: "Sound unavailable" raised ${afterMs.toFixed(0)} ms after xr:sessionStart`,
  );
  // 5 ms of slack below: a browser timer may fire a millisecond early. Above: a timer on a busy host is late.
  expect(afterMs).toBeGreaterThanOrEqual(AUDIO_START_GRACE_MS - 5);
  expect(afterMs).toBeLessThan(AUDIO_START_GRACE_MS + 1500);
  expect(errors).toEqual([]);
});

test('a4 no sound, a later session whose audio context does not resume: the caption comes after the grace', async ({
  page,
}) => {
  const errors = watch(page);
  // A room with a table: in one without, the bed waits at level 3 and the app raises its hint (T-128c).
  await openApp(page, readRoom('table'));
  const probe = await probeSession(page);
  const d = await device(page);

  // A first session with sound, and left.
  await enterXR(page);
  await expect.poll(() => audio(probe)).toBe('running');
  await d.evaluate((d) => d.activeSession?.end());
  await expect(landing(page)).toBeVisible();
  await expect.poll(() => audio(probe)).toBe('suspended');
  // From here the browser will not resume the context: resume() stays pending, and nothing rejects.
  const leftAtS = await probe.evaluate((p) => {
    const { ctx } = (p.engine as unknown as { g: { ctx: AudioContext } }).g;
    ctx.resume = () => new Promise(() => {});
    return p.engine.clock.now();
  });
  expect(leftAtS).toBeGreaterThan(0); // the audio clock stands above 0 for good: "still at 0" would see nothing

  await enterXR(page);
  await page.waitForFunction((p) => p.captions.shown === 'E_AUDIO_CONTEXT', probe);
  const raised = await probe.evaluate((p) => p.raised);
  expect(raised.map((each) => each.key)).toEqual([NO_SOUND]);
  const afterMs = raised[0]?.afterStartMs ?? NaN;
  console.log(
    `T-128a context not resumed: "Sound unavailable" raised ${afterMs.toFixed(0)} ms after xr:sessionStart`,
  );
  expect(afterMs).toBeGreaterThanOrEqual(AUDIO_START_GRACE_MS - 5);
  expect(afterMs).toBeLessThan(AUDIO_START_GRACE_MS + 1500);
  expect(await audio(probe)).toBe('suspended');
  expect(await probe.evaluate((p) => p.engine.clock.now())).toBe(leftAtS);
  expect(errors).toEqual([]); // nothing rejected, so the caption is the only thing that says so
});
