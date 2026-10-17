/// <reference types="webxr" />
// TC-E2E-05, Listen mode (T-148; US-10, FR-HND-06/07, FR-ROOM-04) in the app's own world on IWER's emulated
// hands, in the table room where the app places the bed itself: palms out → listen:enter, the dim dome and the
// aurora halo drawn by the app's renderer (its own perf:sample), a pinch → listen:exit and both gone; a press on
// the Listen orb → listen:enter, the palm to the face → the wake; and the 10-minute end on Playwright's clock.
// The garden is the app's own GardenSystem (T-128d). Vines (Could C4) are not built, so there is no vines entity
// to look for. The first-minute tutorial runs beside it (T-150): its hints and its caption go in Listen, so their
// draws are counted apart, like the tide's.
// Emulator result (E): IWER's hands are rigid; whether a real hand's palms out reads as this pose, how the dome
// looks over real passthrough and how the halo feels are headset questions.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { PALMS_OUT_HOLD_MS, WAKE_HOLD_MS } from '../../src/hands/config';

import { enterXR, openApp, readRoom, WORLD_READY_MS, xrFrames } from './support/iwer';

/** render/config.ts DOME_DIM (UX §3.5). Not imported: that file loads core/, which runs under Vite only. */
const DOME_DIM = 0.6;

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Hands = typeof import('../../src/hands/index');
type Render = typeof import('../../src/render/index');
type Ui = typeof import('../../src/ui/index');
type Hand = 'left' | 'right';
type Vec3 = { x: number; y: number; z: number };
type Mesh = import('three').Mesh<import('three').BufferGeometry, import('three').ShaderMaterial>;
type InstancedMesh = import('three').InstancedMesh<
  import('three').BufferGeometry,
  import('three').ShaderMaterial
>;

interface Heard {
  name: string;
  atMs: number;
  timedOut?: boolean;
}
interface Probe {
  heard: Heard[];
  /** `tide`: the tide wedge's own draws and triangles in the sampled frame (it turns in and out of the view). */
  samples: {
    draws: number;
    tris: number;
    maxFlashPerS: number;
    tide: { draws: number; tris: number };
    hints: { draws: number; tris: number };
  }[];
  /** The halo's guarded brightness and what passthrough is seen at behind the dome (1 = undimmed). */
  lit(): number;
  seen(): number;
  meshes(): { halo: boolean; dome: boolean; orb: boolean };
  /** The Listen orb's pinch target, once the bed is placed. */
  orbAt(): Vec3 | null;
  /** The right hand's pinch point, while it is tracked. */
  pinchPos(): Vec3 | null;
  isOrbHovered: boolean;
  /** The tuning ripple (T-142) has ended: room:tuned was heard. */
  isTuned: boolean;
  caption(): string | null;
}
/** IWSDK 1.0.1 puts its dev runtime on the page in a dev build; the app's world is a field of it. */
interface DevPage {
  FRAMEWORK_MCP_RUNTIME: { world: import('@iwsdk/core').World };
  IWER_DEVICE: { remote: { dispatch(method: string, params?: object): Promise<unknown> } };
}

// Emulated orientations, in degrees (roll 0 = palm down). Measured on IWER in this file's first run: pitch 90
// turns the palm normal to (±0.1, 0.37, −0.92), 23° off the head's forward (0, 0, −1); pitch −90 to the face.
const PALM_OUT = { pitch: 90 };
const PALM_TO_FACE = { pitch: -90 };
const PALM_DOWN = { roll: 0 };

/** Console errors and page errors from now on. */
function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** Listens on the app's bus, before the session: the app's garden tunes with the room. */
function stage(page: Page): Promise<JSHandle<Probe>> {
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { Interactable } = await load<Components>('/src/core/components.ts');
    const hands = await load<Hands>('/src/hands/index.ts');
    const render = await load<Render>('/src/render/index.ts');
    const ui = await load<Ui>('/src/ui/index.ts');
    const { world } = (window as unknown as DevPage).FRAMEWORK_MCP_RUNTIME;
    const system = world.getSystem(render.HaloSystem) as unknown as {
      halo: { halo: Mesh; dome: InstancedMesh };
      orb: { mesh: Mesh };
    };
    if (system === undefined) throw new Error('src/app.ts did not register HaloSystem');
    const bed = world.getSystem(render.BedRenderSystem) as unknown as { tide: { mesh: Mesh } };
    const captions = world.getSystem(ui.CaptionSystem)!;

    // Noted as each is emitted, before any handler runs: the app's garden subscribed first, and it emits the
    // listen:* event from inside its handler of the gesture, so a listener would hear the gesture second.
    const heard: Heard[] = [];
    const note = (name: string, more: Partial<Heard> = {}) =>
      heard.push({ name, atMs: core.clock.now(), ...more });
    const noted = new Set([
      'gesture:palmsOut',
      'gesture:wake',
      'gesture:pinchStart',
      'listen:enter',
      'listen:exit',
    ]);
    const emit = core.bus.emit.bind(core.bus);
    core.bus.emit = ((type: string, payload: { timedOut: boolean }) => {
      if (noted.has(type)) note(type, type === 'listen:exit' ? { timedOut: payload.timedOut } : {});
      emit(type as never, payload as never);
    }) as typeof core.bus.emit;
    const samples: Probe['samples'] = [];
    // The tide (T-128d) turns with the bar, so looking ahead it is frustum-culled for part of each bar: its draws
    // in the frame that perf:sample reports are counted, from the start of that frame's render.
    const tide = { draws: 0, tris: 0 };
    const tideTris = bed.tide.mesh.geometry.index!.count / 3;
    // The tutorial's hints and the caption quad (T-150, one quad each): up before Listen, gone in it.
    const hints = { draws: 0, tris: 0 };
    world.scene.onBeforeRender = () => {
      tide.draws = tide.tris = 0;
      hints.draws = hints.tris = 0;
    };
    bed.tide.mesh.onBeforeRender = () => {
      tide.draws++;
      tide.tris += tideTris;
    };
    world.scene.traverse((object) => {
      if (!object.name.startsWith('hint-') && object.name !== 'caption') return;
      object.onBeforeRender = () => {
        hints.draws++;
        hints.tris += 2;
      };
    });
    core.bus.on('perf:sample', ({ draws, tris, maxFlashPerS }) =>
      samples.push({ draws, tris, maxFlashPerS, tide: { ...tide }, hints: { ...hints } }),
    );
    const targets = world.queryManager.registerQuery({ required: [Interactable] }).entities;
    const states = world.queryManager.registerQuery({ required: [hands.HandState] }).entities;
    const probe: Probe = {
      heard,
      samples,
      lit: () => (system.halo.halo.material.uniforms.uHalo!.value as Float32Array)[0]!,
      seen: () => 1 - (system.halo.dome.material.uniforms.uDome!.value as Float32Array)[0]!,
      meshes: () => ({
        halo: system.halo.halo.visible,
        dome: system.halo.dome.count > 0, // switched by its count, never hidden (BUG-008 review)
        orb: system.orb.mesh.visible,
      }),
      orbAt: () => {
        const orb = [...targets].find((entity) => entity.getValue(Interactable, 'kind') === 'orb');
        if (orb === undefined) return null;
        const at = orb.getVectorView(Interactable, 'worldPos');
        return { x: at[0]!, y: at[1]!, z: at[2]! };
      },
      pinchPos: () => {
        const right = [...states].find((entity) => entity.getValue(hands.HandState, 'hand') === 'right');
        if (right?.getValue(hands.HandState, 'tracked') !== true) return null;
        const at = right.getVectorView(hands.HandState, 'pinchPos');
        return { x: at[0]!, y: at[1]!, z: at[2]! };
      },
      isOrbHovered: false,
      isTuned: false,
      caption: () => captions.shown,
    };
    core.bus.on('room:tuned', () => {
      probe.isTuned = true;
    });
    core.bus.on('target:hover', ({ hand, target }) => {
      if (hand === 'right') probe.isOrbHovered = target?.kind === 'orb';
    });
    return probe;
  });
}

/** Resolves when the page has heard `count` events of that name; returns the last of them. */
async function heard(probe: JSHandle<Probe>, name: string, count = 1): Promise<Heard> {
  const handle = await probe.evaluateHandle(
    (p, [name, count]) =>
      new Promise<Heard>((done) => {
        const look = () => {
          const found = p.heard.filter((each) => each.name === name);
          if (found.length >= count) done(found[count - 1]!);
          else requestAnimationFrame(look);
        };
        look();
      }),
    [name, count] as const,
  );
  return handle.jsonValue();
}

/** The first `perf:sample` taken from now on: the draw calls and triangles of one frame. */
function nextSample(probe: JSHandle<Probe>) {
  return probe.evaluate(
    (p) =>
      new Promise<Probe['samples'][number]>((done) => {
        const had = p.samples.length;
        const look = () => {
          if (p.samples.length > had) done(p.samples[p.samples.length - 1]!);
          else requestAnimationFrame(look);
        };
        look();
      }),
  );
}

/** Puts emulated hands where and how they are given, all in one frame (IWER runs its queue per frame). */
function pose(page: Page, hands: Partial<Record<Hand, { position: Vec3; orientation: object }>>) {
  return page.evaluate(async (hands) => {
    const { remote } = (window as unknown as DevPage).IWER_DEVICE;
    await Promise.all(
      Object.entries(hands).map(([hand, at]) =>
        remote.dispatch('set_transform', { device: `hand-${hand}`, ...at }),
      ),
    );
  }, hands);
}
/** IWER's remote commands, all reaching the session in the same frame. */
const together = (page: Page, commands: [method: string, params: object][]) =>
  page.evaluate(async (commands) => {
    const { remote } = (window as unknown as DevPage).IWER_DEVICE;
    await Promise.all(commands.map(([method, params]) => remote.dispatch(method, params)));
  }, commands);
const select = (page: Page, hand: Hand, value: 0 | 1) =>
  page.evaluate(
    ([device, value]) =>
      (window as unknown as DevPage).IWER_DEVICE.remote.dispatch('set_select_value', { device, value }),
    [`hand-${hand}`, value] as const,
  );
const nowMs = (probe: JSHandle<Probe>) => probe.evaluate(() => Date.now());

/** Both palms held out in front of the face (FR-HND-06). */
const palmsOut = (page: Page) =>
  pose(page, {
    left: { position: { x: -0.15, y: 1.5, z: -0.35 }, orientation: PALM_OUT },
    right: { position: { x: 0.15, y: 1.5, z: -0.35 }, orientation: PALM_OUT },
  });

/** The session is up and the app has placed its bed: the orb's target is there. */
async function inSession(page: Page): Promise<JSHandle<Probe>> {
  // src/app.ts sets this after its last `register`: before it HaloSystem may not be there (a loaded machine).
  await page.waitForFunction(() => window.__roomsong !== undefined, null, { timeout: WORLD_READY_MS });
  const probe = await stage(page);
  await enterXR(page);
  await page.waitForFunction((p) => p.orbAt() !== null && p.meshes().orb, probe, { timeout: 15_000 });
  return probe;
}

test('TC-E2E-05 palms out: listen:enter, the dome and the halo drawn by the app; a pinch: listen:exit and both gone', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'), '/', { onboarding: true });
  const probe = await inSession(page);
  // The garden's signature starts the tuning ripple (T-142); its quads are drawn for 4 s, so the counts
  // start after room:tuned.
  await page.waitForFunction((p) => p.isTuned, probe, { timeout: 10_000 });
  const before = await nextSample(probe);
  expect(await probe.evaluate((p) => p.meshes())).toEqual({ halo: false, dome: false, orb: true });
  /** For the pictures only: the head turns down to the bed and back (this changes nothing in Listen; the samples
   *  are all taken looking ahead, where the same meshes are in view). */
  const picture = async (path: string) => {
    const bedAt = await probe.evaluate((p) => p.orbAt());
    await together(page, [['look_at', { device: 'headset', target: bedAt }]]);
    await xrFrames(page, 3);
    await page.screenshot({ path });
    await together(page, [['look_at', { device: 'headset', target: { x: 0, y: 1.6, z: -1 } }]]);
    await xrFrames(page, 3);
  };
  await picture('.tmp/listen-before.png');

  const posedAt = await nowMs(probe);
  await palmsOut(page);
  const out = await heard(probe, 'gesture:palmsOut');
  await heard(probe, 'listen:enter');
  // The hold counts from the first sample with both palms out, one or two frames after the command.
  expect(out.atMs - posedAt).toBeGreaterThanOrEqual(PALMS_OUT_HOLD_MS - 50);
  // Faded fully in, passthrough at 40 % (the cover is a 32-bit float), before anything is measured.
  await page.waitForFunction(
    ([p, seen]) => p.lit() > 0.7 && Math.abs(p.seen() - seen) < 1e-5,
    [probe, 1 - DOME_DIM] as const,
    { timeout: 5000 },
  );
  const during = await nextSample(probe);
  // The breath is timed on the tide only with an audio clock that runs (API_SPEC §1.10 rule 11).
  const audioS = await page.evaluate(() => window.__roomsong!.engine.clock.now());
  await picture('.tmp/listen-halo.png');

  // The right hand pinches at nothing: any pinch wakes.
  await select(page, 'right', 1);
  await heard(probe, 'gesture:pinchStart');
  const exit = await heard(probe, 'listen:exit');
  expect(exit.timedOut).toBe(false);
  await select(page, 'right', 0);
  await page.waitForFunction((p) => !p.meshes().halo && !p.meshes().dome, probe, { timeout: 5000 });
  const after = await nextSample(probe);

  console.log(
    `T-148 Listen: draws ${before.draws} -> ${during.draws} -> ${after.draws}, triangles ${before.tris} -> ` +
      `${during.tris} -> ${after.tris} (of these the tide's draws ${before.tide.draws} -> ${during.tide.draws} -> ` +
      `${after.tide.draws}; the hints' ${before.hints.draws} -> ${during.hints.draws} -> ${after.hints.draws}), flash ${during.maxFlashPerS}; palms out after ` +
      `${out.atMs - posedAt} ms; audio clock ${audioS.toFixed(1)} s (emulator, perf:sample)`,
  );
  // Two meshes, the dome and the halo, drawn once per view (the emulated session has two), with no pass over the
  // frame: nothing else is added. The dome has 80 triangles and the halo 96. The tide's, the hints' and the caption's draws
  // are left out.
  const drawn = (s: Probe['samples'][number]) => ({
    draws: s.draws - s.tide.draws - s.hints.draws,
    tris: s.tris - s.tide.tris - s.hints.tris,
  });
  const [b, d, a] = [drawn(before), drawn(during), drawn(after)];
  const draws = d.draws - b.draws;
  expect([2, 4]).toContain(draws);
  expect(d.tris - b.tris).toBe((draws / 2) * (80 + 96));
  expect(a).toEqual(b);
  expect(during.maxFlashPerS).toBeLessThanOrEqual(3);
  expect(during.hints.draws).toBe(0); // the tutorial's hints and caption go in Listen
  expect((await probe.evaluate((p) => p.heard)).map((each) => each.name)).toEqual([
    'gesture:palmsOut',
    'listen:enter',
    'gesture:pinchStart',
    'listen:exit',
  ]);
  expect(errors).toEqual([]); // a shader that did not compile would be here
  expect(offHost).toEqual([]); // Golden Rule 9
});

test('TC-E2E-05 a pinch on the Listen orb enters; a palm turned to the face wakes', async ({ page }) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'), '/', { onboarding: true });
  const probe = await inSession(page);
  const orb = (await probe.evaluate((p) => p.orbAt()))!;

  // From the hand's root to its pinch point, open and closed, measured on a pinch at nothing before the session's
  // Listen matters. IWER's pinch point jumps 7.7 cm when the hand closes (15-shaping.spec.ts), so the hand is
  // moved by that jump in the frame it closes or opens: the filtered point (FR-HND-03) stays on the orb.
  const atRest = async (): Promise<Vec3> => {
    let last: Vec3 | null = null;
    for (;;) {
      await xrFrames(page, 1);
      const now = await probe.evaluate((p) => p.pinchPos());
      if (
        now !== null &&
        last !== null &&
        Math.hypot(now.x - last.x, now.y - last.y, now.z - last.z) < 0.0002
      ) {
        return now;
      }
      last = now;
    }
  };
  const root = { x: 0.2, y: 1.2, z: -0.3 };
  const from = (tip: Vec3): Vec3 => ({ x: tip.x - root.x, y: tip.y - root.y, z: tip.z - root.z });
  const rootFor = (tipAt: Vec3, offset: Vec3): Vec3 => ({
    x: tipAt.x - offset.x,
    y: tipAt.y - offset.y,
    z: tipAt.z - offset.z,
  });
  await pose(page, { right: { position: root, orientation: PALM_DOWN } });
  const open = from(await atRest());
  await select(page, 'right', 1);
  const closed = from(await atRest());
  await select(page, 'right', 0);
  await atRest();
  await xrFrames(page, 12); // past the 130 ms lockout after a release (FR-HND-02)
  await pose(page, { right: { position: rootFor(orb, open), orientation: PALM_DOWN } });
  await atRest();
  await page.waitForFunction((p) => p.isOrbHovered, probe);
  await probe.evaluate((p) => void (p.heard.length = 0)); // the measuring pinch is not part of the story

  // The press acts on its release over the orb (FR-HND-16).
  await together(page, [
    ['set_transform', { device: 'hand-right', position: rootFor(orb, closed), orientation: PALM_DOWN }],
    ['set_select_value', { device: 'hand-right', value: 1 }],
  ]);
  await heard(probe, 'gesture:pinchStart');
  await xrFrames(page, 4);
  expect(await probe.evaluate((p) => p.heard.map((each) => each.name))).toEqual(['gesture:pinchStart']);
  await together(page, [
    ['set_transform', { device: 'hand-right', position: rootFor(orb, open), orientation: PALM_DOWN }],
    ['set_select_value', { device: 'hand-right', value: 0 }],
  ]);
  await heard(probe, 'listen:enter');
  await page.waitForFunction((p) => p.meshes().halo && p.meshes().dome, probe);

  // The wake: the right palm turned to the face, near the head's own line.
  const turnedAt = await nowMs(probe);
  await pose(page, { right: { position: { x: 0.05, y: 1.55, z: -0.3 }, orientation: PALM_TO_FACE } });
  const wake = await heard(probe, 'gesture:wake');
  expect(wake.atMs - turnedAt).toBeGreaterThanOrEqual(WAKE_HOLD_MS - 50);
  expect((await heard(probe, 'listen:exit')).timedOut).toBe(false);
  await page.waitForFunction((p) => !p.meshes().halo && !p.meshes().dome, probe, { timeout: 5000 });
  console.log(
    `T-148 orb press then wake: the wake came ${wake.atMs - turnedAt} ms after the turn (emulator)`,
  );
  expect((await probe.evaluate((p) => p.heard)).map((each) => each.name)).toEqual([
    'gesture:pinchStart',
    'listen:enter',
    'gesture:wake',
    'listen:exit',
  ]);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('TC-E2E-05 the 10-minute end on a fake clock: listen:exit timed out, "Goodnight", the halo gone', async ({
  page,
}) => {
  const errors = watch(page);
  await page.clock.install(); // time flows as usual until the test moves it on
  const offHost = await openApp(page, readRoom('table'), '/', { onboarding: true });
  const probe = await inSession(page);
  await palmsOut(page);
  await heard(probe, 'listen:enter');
  await page.clock.fastForward('09:59');
  await xrFrames(page, 3);
  expect(await probe.evaluate((p) => p.heard.some((each) => each.name === 'listen:exit'))).toBe(false);
  await page.clock.fastForward('00:02');
  expect((await heard(probe, 'listen:exit')).timedOut).toBe(true);
  await page.waitForFunction((p) => p.caption() === 'goodnight', probe, { timeout: 5000 });
  await page.waitForFunction((p) => !p.meshes().halo && !p.meshes().dome, probe, { timeout: 5000 });
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
