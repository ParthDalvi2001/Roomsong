/// <reference types="webxr" />
// TC-E2E-09 (NFR-PERF-03/04/09; TC-PERF-02 and the scene check of TC-PERF-08; T-165): the app's own worst frame in
// the emulator. A full bed (autoplant=80) in bloom (a reload with fakeDay=7 makes every plant seven days old), the
// room WORST_ROOM names (the counter by default: its wall is near enough for the vine to draw; the table room's is
// 1.8 m off, so there the vine never draws), high contrast and gaze dwell on, and all at once: a seed out, an undo
// petal waiting, the settings panel
// open with New garden held (its ring and its fill), a caption up and a plant being pulled. One perf:sample there
// and one in Listen. Deterministic: the gestures are the app's own events, emitted on its bus as 22-save-restore
// does, and the app's systems draw what they mean; the head looks level, so the gaze meets no cell, orb or petal it
// could select; frustum culling is off, so the count is that of a view with all of it in sight.
// Emulator result (E): IWER has no multiview and draws each mesh once per view. A Quest with multiview draws about
// half (requested by IWSDK, never confirmed on a device).
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, ROOMS, xrFrames } from './support/iwer';

/** WORST_ROOM=counter|table|…: 'counter' puts the vine in the frame; WORST_ROOM=table gives the figure recorded before. */
const WORST_ROOM = process.env.WORST_ROOM ?? 'counter';
if (!(ROOMS as readonly string[]).includes(WORST_ROOM))
  throw new Error(`WORST_ROOM=${WORST_ROOM}: not one of ${ROOMS.join(', ')}`);
const ROOM = WORST_ROOM as (typeof ROOMS)[number];

const DRAW_BUDGET = 60; // NFR-PERF-03, counted in the emulator (both views)
const TRIANGLE_BUDGET = 150_000; // NFR-PERF-04
const VOICE_CAP = 24; // audio/config.ts (NFR-PERF-10). Not imported: that file loads core/, which runs under Vite only
const FLASH_CAP_PER_S = 3; // FR-UI-11
// Measured 2026-10-19 on develop 3726e50 (before T-165 part A): 60 draws and 99 760 triangles in the worst frame,
// 60 and 98 012 in Listen. At the budget exactly: one more mesh in sight fails here.

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Garden = typeof import('../../src/garden/index');
type Persistence = typeof import('../../src/persistence/index');
type Ui = typeof import('../../src/ui/index');
type PerfSample = import('../../src/core/index').EventMap['perf:sample'];
type Release = import('../../src/core/index').EventMap['gesture:release'];
type Entity = import('@iwsdk/core').Entity;
type Vec3 = { x: number; y: number; z: number };

/** What was up in the frame a perf:sample was taken on, as the app's events and its meshes say. */
interface Up {
  highContrastAndGaze: boolean;
  seedOut: boolean;
  petal: boolean;
  panel: boolean;
  /** The ring round New garden and its fill. */
  cue: boolean;
  caption: boolean;
  pulling: boolean;
  reticle: boolean;
  listening: boolean;
  /** A hint mesh (the step icon, its ring or the remove arrow); logged, not required: the arrow fades after the first removal and the icon follows the onboarding step. */
  hints: boolean;
}
interface Sample extends PerfSample {
  atMs: number;
  up: Up;
}
interface Probe {
  samples: Sample[];
  /** Plants in the garden, and how many of them are in bloom (stage 3), as the renderer ages them. */
  bloom(): { plants: number; inBloom: number };
  visits(): number;
  /** Raises a caption of the app's own table for a minute and returns its key. */
  raiseCaption(): string;
  shownCaption(): string | null;
  noCull(): void;
  /** Emits the worst frame's gestures; returns the page time after the last. */
  worst(): number;
  /** Lets go of the pull and enters Listen by palms out; returns the page time after. */
  listen(): number;
  scene(): { lights: number; shadowMap: boolean };
}
/** IWSDK 1.0.1 puts IWER's device on the page in a dev build. */
interface DevPage {
  IWER_DEVICE: { remote: { dispatch(method: string, params?: object): Promise<unknown> } };
}

/** Console errors and page errors from now on. */
function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** The app's world is up: app.ts sets its dev handle, then loads the garden and adds the save handlers, in one go. */
const appReady = (page: Page) =>
  page.waitForFunction(() => window.__roomsong !== undefined, undefined, { timeout: 15_000 });

/** Sets settings in the page; a change saves the garden with it (app.ts keepSaved). */
const setSettings = (page: Page, patch: { highContrast?: boolean; gazeDwell?: boolean }) =>
  page.evaluate(async (patch) => {
    const url = '/src/core/index.ts';
    const core = (await import(/* @vite-ignore */ url)) as Core;
    core.settings.set(patch);
  }, patch);

/** How many plants the page's store holds now (the save is debounced). */
const savedPlants = (page: Page) =>
  page.evaluate(async () => {
    const url = '/src/persistence/index.ts';
    const { openStore } = (await import(/* @vite-ignore */ url)) as Persistence;
    return (await (await openStore()).load())?.plants.length ?? 0;
  });

function probe(page: Page): Promise<JSHandle<Probe>> {
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { Caption, Interactable } = await load<Components>('/src/core/components.ts');
    const garden = await load<Garden>('/src/garden/index.ts');
    const ui = await load<Ui>('/src/ui/index.ts');
    const { world, garden: gardenSystem } = window.__roomsong!;
    const captions = world.getSystem(ui.CaptionSystem)!;
    const panels = world.getSystem(ui.PanelSystem)!;
    const isShown = (name: string) => world.scene.getObjectByName(name)?.visible === true;
    const targets = world.queryManager.registerQuery({ required: [Interactable] }).entities;
    const emit = core.bus.emit.bind(core.bus);

    let outSeed: string | null = null;
    let petalUntil = -Infinity; // core's clock
    let isPulling = false;
    let isListening = false;
    core.bus.on('garden:seedOut', ({ seed }) => void (outSeed = seed.id));
    core.bus.on('garden:seedBack', () => void (outSeed = null));
    core.bus.on('garden:removed', ({ expiresAt }) => void (petalUntil = expiresAt));
    core.bus.on('listen:enter', () => void (isListening = true));
    core.bus.on('listen:exit', () => void (isListening = false));
    const up = (): Up => {
      const s = core.settings.get();
      return {
        highContrastAndGaze: s.highContrast && s.gazeDwell,
        seedOut: outSeed !== null,
        petal: core.clock.now() < petalUntil,
        panel: panels.panel.open && isShown('settings-panel'),
        cue: isShown('settings-cue') && isShown('settings-fill'),
        caption: captions.shown === 'gardenFull',
        pulling: isPulling,
        reticle: isShown('gaze-reticle'),
        listening: isListening,
        hints: isShown('hint-icon') || isShown('hint-ring') || isShown('hint-remove'),
      };
    };
    const samples: Sample[] = [];
    core.bus.on('perf:sample', (sample) => samples.push({ ...sample, atMs: performance.now(), up: up() }));

    const plants = () => [...targets].filter((entity) => entity.getValue(Interactable, 'kind') === 'plant');
    const plantRef = (entity: Entity | undefined) => {
      if (entity === undefined) throw new Error('no plant target');
      const at = entity.getVectorView(Interactable, 'worldPos');
      const pos: Vec3 = { x: at[0] ?? 0, y: at[1] ?? 0, z: at[2] ?? 0 };
      return { target: { kind: 'plant' as const, id: entity.getValue(Interactable, 'id') ?? '' }, pos };
    };
    const nowhere: Vec3 = { x: 0, y: 1, z: -0.4 };
    const release = (hand: 'left' | 'right', more: Partial<Release>) =>
      emit('gesture:release', {
        type: 'gesture:release',
        hand,
        gesture: 'none',
        target: null,
        pos: nowhere,
        zone: 'inner',
        cell: null,
        dy: null,
        ...more,
      });
    /** A press of the left hand on a panel control (commit on release, FR-HND-16). */
    const press = (id: string) => {
      const target = { kind: 'panel' as const, id };
      emit('gesture:pinchStart', { type: 'gesture:pinchStart', hand: 'left', target, pos: nowhere });
      release('left', { gesture: 'press', target });
    };

    const probe: Probe = {
      samples,
      bloom: () => {
        const state = gardenSystem.state!;
        const inBloom = state.plants.filter((p) => garden.stageFor(state.lastVisitAt - p.plantedAt) === 3);
        return { plants: state.plants.length, inBloom: inBloom.length };
      },
      visits: () => gardenSystem.state?.visits ?? 0,
      raiseCaption: () => {
        // As any module raises one (LLD §3): an entity with core's Caption. The ripple's captions go first.
        world
          .createEntity()
          .addComponent(Caption, { key: 'gardenFull', expiresAt: core.clock.now() + 60_000 });
        return 'gardenFull';
      },
      shownCaption: () => captions.shown,
      noCull: () =>
        world.scene.traverse((o) => {
          o.frustumCulled = false;
        }),
      worst: () => {
        const [removed, pulled] = plants().map(plantRef);
        if (removed === undefined || pulled === undefined) throw new Error('fewer than two plants');
        // The right hand drags a plant off the bed: removed, and its undo petal waits (FR-HND-11, UX §9.3).
        emit('gesture:pinchStart', { type: 'gesture:pinchStart', hand: 'right', ...removed });
        release('right', { gesture: 'drag', target: removed.target, zone: 'outer' });
        // The left hand opens the panel, goes to its Garden tab and holds New garden: the ring and the fill. A
        // hold never commits by itself (only its release would, after 1.5 s), and while a hand pinches the panel's
        // own gaze dwell rests (Panel.frame).
        press('orb');
        press('tab:garden');
        emit('gesture:pinchStart', {
          type: 'gesture:pinchStart',
          hand: 'left',
          target: { kind: 'panel', id: 'newGarden' },
          pos: nowhere,
        });
        // A seed comes to the right palm (FR-HND-05), and the right hand pulls a plant up 4 cm (FR-HND-08).
        emit('gesture:palmUp', { type: 'gesture:palmUp', hand: 'right' });
        emit('gesture:pinchStart', { type: 'gesture:pinchStart', hand: 'right', ...pulled });
        emit('gesture:pull', { type: 'gesture:pull', hand: 'right', target: pulled.target, dy: 0.04 });
        isPulling = true;
        return performance.now();
      },
      listen: () => {
        // The pull is let go over nothing, so the garden keeps the plant's height; palms out start Listen (FR-HND-06).
        release('right', {});
        isPulling = false;
        emit('gesture:palmsOut', { type: 'gesture:palmsOut' });
        return performance.now();
      },
      scene: () => {
        let lights = 0;
        world.scene.traverse((o) => {
          if ((o as { isLight?: boolean }).isLight === true) lights++;
        });
        return { lights, shadowMap: world.renderer.shadowMap.enabled };
      },
    };
    return probe;
  });
}

/** The first perf:sample taken after `sinceMs` (page time) whose frame had everything in `want` up. */
async function sampleWith(
  page: Page,
  p: JSHandle<Probe>,
  sinceMs: number,
  want: Partial<Up>,
): Promise<Sample> {
  await page.waitForFunction(
    ([p, since]) => p.samples.filter((s) => s.atMs > since).length >= 2,
    [p, sinceMs] as const,
    {
      timeout: 10_000,
    },
  );
  const after = (await p.evaluate((p) => p.samples)).filter((s) => s.atMs > sinceMs);
  const found = after.find((s) =>
    Object.entries(want).every(([key, value]) => s.up[key as keyof Up] === value),
  );
  expect(found, `a sample with ${JSON.stringify(want)} up, among ${JSON.stringify(after)}`).toBeDefined();
  return found!;
}

const report = (s: Sample) =>
  `${s.draws} draws, ${s.tris} triangles, ${s.voices} voices, ${s.jsMs.toFixed(2)} ms script, ${s.fps.toFixed(0)} fps, hints ${s.up.hints ? 'up' : 'down'}`;

test('TC-E2E-09 the worst frame, full bed in bloom: draws, triangles, voices and the scene rules, then in Listen', async ({
  page,
}) => {
  const errors = watch(page);
  // The garden is planted and saved on a first load, then seven days pass: every plant is in bloom at the visit.
  // The load's own garden:changed comes before the save handlers (app.ts A7, A8): the settings change saves it.
  const room = readRoom(ROOM);
  const firstOffHost = await openApp(page, room, '/?flags=autoplant=80');
  await appReady(page);
  await setSettings(page, { highContrast: true });
  await expect.poll(() => savedPlants(page), { timeout: 10_000 }).toBe(80);
  const offHost = await openApp(page, room, '/?flags=autoplant=80,fakeDay=7');
  await appReady(page);
  const p = await probe(page);
  await enterXR(page);
  await page.waitForFunction((p) => p.visits() === 1, p, { timeout: 20_000 });
  expect(await p.evaluate((p) => p.bloom())).toEqual({ plants: 80, inBloom: 80 });

  // High contrast and the gaze, a level head (the gaze passes over the bed, never onto it) and a caption.
  await page.evaluate(() => {
    const { remote } = (window as unknown as DevPage).IWER_DEVICE;
    return remote.dispatch('set_transform', {
      device: 'headset',
      orientation: { pitch: 0, yaw: 0, roll: 0 },
    });
  });
  await setSettings(page, { highContrast: true, gazeDwell: true });
  const key = await p.evaluate((p) => p.raiseCaption());
  await page.waitForFunction(([p, key]) => p.shownCaption() === key, [p, key] as const, { timeout: 15_000 });
  await p.evaluate((p) => p.noCull());
  await xrFrames(page, 3);

  // All at once, inside the petal's 5 s.
  const worstAt = await p.evaluate((p) => p.worst());
  const worst = await sampleWith(page, p, worstAt, {
    highContrastAndGaze: true,
    seedOut: true,
    petal: true,
    panel: true,
    cue: true,
    caption: true,
    pulling: true,
    reticle: true,
  });

  // And in Listen: the dome and the halo in place of the pull, the rest as it was.
  const listenAt = await p.evaluate((p) => p.listen());
  const listen = await sampleWith(page, p, listenAt, {
    highContrastAndGaze: true,
    panel: true,
    cue: true,
    caption: true,
    listening: true,
  });
  const scene = await p.evaluate((p) => p.scene());
  console.log(
    `T-165 TC-E2E-09 (emulator, ${ROOM} room, both views, no culling, 80 plants in bloom): the worst frame ${report(worst)}; ` +
      `in Listen ${report(listen)}; ${scene.lights} lights, shadow map ${scene.shadowMap ? 'on' : 'off'}`,
  );

  // A scene that draws nothing would also pass the budget: the worst frame must really be drawn (recorded 60 / 99 760).
  expect(worst.draws).toBeGreaterThan(20);
  expect(worst.tris).toBeGreaterThan(50_000);
  for (const sample of [worst, listen]) {
    expect(sample.draws).toBeLessThanOrEqual(DRAW_BUDGET);
    expect(sample.tris).toBeLessThanOrEqual(TRIANGLE_BUDGET);
    expect(sample.voices).toBeLessThanOrEqual(VOICE_CAP);
    expect(sample.maxFlashPerS).toBeLessThanOrEqual(FLASH_CAP_PER_S);
  }
  expect(scene.lights).toBeLessThanOrEqual(1); // NFR-PERF-09
  expect(scene.shadowMap).toBe(false);
  expect(errors).toEqual([]);
  expect([...firstOffHost, ...offHost]).toEqual([]);
});
