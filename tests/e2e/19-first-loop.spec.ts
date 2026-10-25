/// <reference types="webxr" />
// T-128d, the first loop in the real app (LLD §3.5 d1 and d2): the app's own GardenSystem with `autoplant`, its
// BedRenderSystem drawing the plants on the bed RoomSystem placed, one plant target per plant, and its
// GardenAudioSystem playing them as the tide sweeps. Everything is read from the app's own objects
// (`window.__roomsong`) and bus; the test emits nothing. The first loop by the emulator's hands is
// 16-seeds.spec.ts (d3, TC-E2E-03).
// Emulator results (E): software rendering and IWER's room fixtures. Nothing here says how the garden looks or
// sounds on a headset, or how fast it runs there.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, WORLD_READY_MS, xrFrames } from './support/iwer';

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Garden = typeof import('../../src/garden/index');
type Render = typeof import('../../src/render/index');
type RoomModule = typeof import('../../src/room/index');
type Vec3 = { x: number; y: number; z: number };
type PerfSample = import('../../src/core/index').EventMap['perf:sample'];

interface Device {
  activeSession?: XRSession;
}
interface Target {
  id: string;
  kind: string;
  radius: number;
  at: Vec3;
}
interface Probe {
  /** Every event the loop is made of, with the frame, the page time and `engine.stats.triggers` then. */
  heard: { type: string; frame: number; atMs: number; triggers: number }[];
  /** By frame number: whether the tide was drawn, the updates' time and updates plus render (ms). */
  tideByFrame: boolean[];
  updateMs: number[];
  scriptMs: number[];
  /** The page time of the Enter click, and of the first frame after which a note had been started. */
  enterAtMs: number;
  firstNoteAtMs: number;
  maxFlashPerS: number;
  /** Every perf:sample since the probe was made. */
  samples: PerfSample[];
  frame(): number;
  /** How many plants PlantRenderer draws: the instances of its five silhouettes. */
  instances(): number;
  /** The plant targets, and where each cell centre of those plants is on the bed, in world space. */
  plantTargets(): (Target & { cellAt: Vec3 })[];
  triggers(): number;
  /** The height of the bed pose the audio engine last synced its plants to (a private field of the engine). */
  audioBedY(): number;
  /** Resolves with `engine.stats.triggers` the next time the tide reaches `step`; `atBar` is that step's bar then. */
  atStep(step: number): Promise<number>;
  atBar: number;
  /**
   * The notes the tide starts from step `at` of `bar` to step `at` of the next bar: a plant after step `at` plays
   * in `bar`, one at or before it in the next, unless style B rests it there (P-009, FR-MUS-13: a bar of each of
   * its cycles, by its id; the engine's own rule, read from the app's engine).
   */
  due(bar: number, at: number): number;
}

const device = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { IWER_DEVICE?: Device }).IWER_DEVICE) as Promise<
    JSHandle<Device>
  >;

function watch(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

/** Listens in the page before Enter: the bed is placed in the session's first frames. */
async function probeLoop(page: Page): Promise<JSHandle<Probe>> {
  const enter = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await expect(enter).toBeEnabled({ timeout: WORLD_READY_MS });
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { Interactable } = await load<Components>('/src/core/components.ts');
    const garden = await load<Garden>('/src/garden/index.ts');
    const render = await load<Render>('/src/render/index.ts');
    const room = await load<RoomModule>('/src/room/index.ts');
    const { world, engine } = window.__roomsong!;
    // The engine's own records, scheduler and rest rule (private fields of the dev handle's engine).
    type Rec = { plant: { cell: { step: number } } };
    const inside = engine as unknown as {
      records: Map<string, Rec>;
      g: { scheduler: { nextIndex: number }; layers: { rests(r: Rec, bar: number): boolean } };
    };
    const bed = world.getSystem(room.RoomSystem)!.bed.object3D!;
    // Two private fields of BedRenderSystem: its plant and tide renderers.
    const drawing = world.getSystem(render.BedRenderSystem) as unknown as {
      plants: { meshes: { count: number }[] };
      tide: { mesh: { visible: boolean } };
    };
    // A frame: IWSDK's loop calls world.update, then renders, and the scene's onAfterRender ends the render.
    let frame = 0;
    let startedMs = 0;
    const update = world.update.bind(world);
    world.update = (delta, time) => {
      frame++;
      startedMs = performance.now();
      update(delta, time);
      probe.updateMs[frame] = performance.now() - startedMs;
      probe.tideByFrame[frame] = drawing.tide.mesh.visible;
      if (probe.firstNoteAtMs === 0 && engine.stats.triggers > 0) probe.firstNoteAtMs = performance.now();
    };
    const after = world.scene.onAfterRender.bind(world.scene);
    world.scene.onAfterRender = (...args) => {
      after(...args);
      probe.scriptMs[frame] = performance.now() - startedMs;
    };
    const enter = document.querySelector('main button');
    enter?.addEventListener('click', () => (probe.enterAtMs = performance.now()), { capture: true });
    const heard: Probe['heard'] = [];
    for (const type of ['xr:sessionStart', 'room:bedPlaced', 'room:signature', 'xr:sessionEnd'] as const)
      core.bus.on(type, () =>
        heard.push({ type, frame, atMs: performance.now(), triggers: engine.stats.triggers }),
      );
    core.bus.on('perf:sample', (s) => {
      probe.maxFlashPerS = Math.max(probe.maxFlashPerS, s.maxFlashPerS);
      probe.samples.push({ ...s });
    });
    const targets = world.queryManager.registerQuery({ required: [Interactable] }).entities;
    const point = (at: ArrayLike<number>): Vec3 => ({ x: at[0]!, y: at[1]!, z: at[2]! });
    const probe: Probe = {
      heard,
      tideByFrame: [],
      updateMs: [],
      scriptMs: [],
      enterAtMs: 0,
      firstNoteAtMs: 0,
      maxFlashPerS: 0,
      samples: [],
      triggers: () => engine.stats.triggers,
      atBar: -1,
      due: (bar, at) => {
        let n = 0;
        for (const r of inside.records.values()) {
          const playsIn = r.plant.cell.step > at ? bar : bar + 1;
          if (!inside.g.layers.rests(r, playsIn)) n++;
        }
        return n;
      },
      audioBedY: () => (engine as unknown as { bed: number[] }).bed[13]!,
      // Polled on a page timer, not by frame: the audio clock runs on whether a frame comes or not.
      atStep: (step) =>
        new Promise((done) => {
          let wasThere = engine.clock.stepIndex() === step;
          const timer = setInterval(() => {
            const isThere = engine.clock.stepIndex() === step;
            if (isThere && !wasThere) {
              clearInterval(timer);
              probe.atBar = Math.floor((inside.g.scheduler.nextIndex - 1) / 16); // the last step scheduled is this one
              done(engine.stats.triggers);
            }
            wasThere = isThere;
          }, 5);
        }),
      frame: () => frame,
      instances: () => drawing.plants.meshes.reduce((sum, mesh) => sum + mesh.count, 0),
      plantTargets: () => {
        const plants = window.__roomsong!.garden.state!.plants;
        return [...targets]
          .filter((entity) => entity.getValue(Interactable, 'kind') === 'plant')
          .map((entity) => {
            const id = entity.getValue(Interactable, 'id') ?? '';
            const cell = plants.find((p) => p.id === id)!.cell;
            const centre = garden.cellCentre(cell, { x: 0, y: 0 });
            const e = bed.matrixWorld.elements;
            // Bed-local (x, 0, y) into the world (D-029): the bed's matrix, column-major.
            const [x, z] = [centre.x, centre.y];
            const cellAt = {
              x: e[0] * x + e[8] * z + e[12],
              y: e[1] * x + e[9] * z + e[13],
              z: e[2] * x + e[10] * z + e[14],
            };
            return {
              id,
              kind: 'plant',
              radius: entity.getValue(Interactable, 'radius') ?? 0,
              at: point(entity.getVectorView(Interactable, 'worldPos')),
              cellAt,
            };
          });
      },
    };
    return probe;
  });
}

const heardOf = (page: Page, probe: JSHandle<Probe>, type: string, count = 1) =>
  page.waitForFunction(([p, type, count]) => p.heard.filter((e) => e.type === type).length >= count, [
    probe,
    type,
    count,
  ] as const);
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

test('d1: a garden is drawn on the bed: three plants, three plant targets at their cells; gone after the session, back in the next', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'), '/?flags=autoplant=3');
  const probe = await probeLoop(page);
  // The garden was loaded before Enter was usable: the page holds it already, with its three plants.
  expect(await page.evaluate(() => window.__roomsong!.garden.state!.plants.map((p) => p.id))).toEqual([
    'auto-0',
    'auto-1',
    'auto-2',
  ]);
  await enterXR(page);
  await heardOf(page, probe, 'room:bedPlaced');
  await xrFrames(page, 2);
  expect(await probe.evaluate((p) => p.instances())).toBe(3);
  const targets = await probe.evaluate((p) => p.plantTargets());
  expect(targets.map((t) => t.id).sort()).toEqual(['auto-0', 'auto-1', 'auto-2']);
  for (const t of targets) {
    expect(t.radius).toBeCloseTo(0.04, 6); // HIT_RADIUS_M, a Float32 field
    expect(distance(t.at, t.cellAt), t.id).toBeLessThan(1e-4); // Float32 positions
  }
  console.log(`T-128d d1 plant targets (emulator, table room): ${JSON.stringify(targets.map((t) => t.at))}`);

  // A bed-height step, as the panel's Garden tab makes it (FR-UI-10): the bed rises 2 cm, and with it every plant
  // target and the pose the audio plays the plants from.
  const audioBefore = await probe.evaluate((p) => p.audioBedY());
  expect(audioBefore).toBeCloseTo(targets[0]!.cellAt.y, 4);
  await page.evaluate(() => window.__roomsong!.garden.setBedHeightOffset(0.02));
  await xrFrames(page, 2);
  const raised = await probe.evaluate((p) => p.plantTargets());
  for (const t of raised) {
    const was = targets.find((each) => each.id === t.id)!;
    expect(t.at.y - was.at.y, t.id).toBeCloseTo(0.02, 4);
    expect(distance(t.at, t.cellAt), t.id).toBeLessThan(1e-4);
  }
  expect((await probe.evaluate((p) => p.audioBedY())) - audioBefore).toBeCloseTo(0.02, 4);

  await (await device(page)).evaluate((d) => d.activeSession?.end());
  await heardOf(page, probe, 'xr:sessionEnd');
  expect(await probe.evaluate((p) => [p.instances(), p.plantTargets().length])).toEqual([0, 0]);

  await enterXR(page);
  await heardOf(page, probe, 'room:bedPlaced', 2);
  await xrFrames(page, 2);
  expect(await probe.evaluate((p) => [p.instances(), p.plantTargets().length])).toEqual([3, 3]);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('d2: the tide plays it: no note and no tide before room:signature; then each bar the plants style B does not rest', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'), '/?flags=autoplant=3');
  const probe = await probeLoop(page);
  await enterXR(page);
  await heardOf(page, probe, 'room:signature');
  const signature = await probe.evaluate((p) => p.heard.find((e) => e.type === 'room:signature')!);
  // The engine had no plant before the signature: not one note had started, and the tide was never drawn.
  expect(signature.triggers).toBe(0);
  const tideBefore = await probe.evaluate(
    (p, upTo) => p.tideByFrame.slice(0, upTo).some(Boolean),
    signature.frame,
  );
  expect(tideBefore).toBe(false);
  // The plants stand on steps 0, 7 and 14 (autoplant: cell 7n). Read at step 4, half-way between two of their
  // notes (a note is started up to LOOK_AHEAD_S, 0.12 s, before its step): from there to step 4 of the next bar
  // the tide starts exactly the plants style B does not rest in their bar, each one bar of its cycle (P-009,
  // FR-MUS-13; style null played all three every bar), read over six bars.
  const counts: number[] = [];
  const due: number[] = [];
  const BARS = 6;
  for (let bar = 0; bar <= BARS; bar++) {
    counts.push(await probe.evaluate((p) => p.atStep(4)));
    if (bar < BARS) due.push(await probe.evaluate((p) => p.due(p.atBar, 4)));
  }
  const played = due.map((_, i) => counts[i + 1]! - counts[i]!);
  expect(played).toEqual(due);
  for (const n of due) expect(n).toBeLessThanOrEqual(3);
  // A plant rests at most every second bar (its 2-bar cycle): three plants start 9 notes or more in six bars.
  expect(due.reduce((sum, n) => sum + n, 0)).toBeGreaterThanOrEqual(9);
  expect(await probe.evaluate((p) => p.tideByFrame[p.frame()])).toBe(true);
  const timing = await probe.evaluate((p) => ({
    enterToSignatureMs: p.heard.find((e) => e.type === 'room:signature')!.atMs - p.enterAtMs,
    enterToFirstNoteMs: p.firstNoteAtMs - p.enterAtMs,
    maxFlashPerS: p.maxFlashPerS,
  }));
  expect(timing.maxFlashPerS).toBeLessThanOrEqual(3); // FR-UI-11, every perf:sample of the run
  console.log(
    `T-128d d2 (emulator, table room, autoplant=3, style B): notes a bar ${JSON.stringify(played)} ` +
      `(due ${JSON.stringify(due)}); Enter to ` +
      `room:signature ${Math.round(timing.enterToSignatureMs)} ms, Enter to the first note started ` +
      `${Math.round(timing.enterToFirstNoteMs)} ms; maxFlashPerS ${timing.maxFlashPerS}`,
  );
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('d2: with a full bed the frame of room:signature stays under its 50 ms of script time (LLD §3.3 D)', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('table'), '/?flags=autoplant=80');
  const probe = await probeLoop(page);
  await enterXR(page);
  await heardOf(page, probe, 'room:signature');
  await xrFrames(page, 25);
  // Two whole perf:samples with the full bed playing: the read-out of NFR-PERF-03/04/05 (emulator numbers).
  const had = await probe.evaluate((p) => p.samples.length);
  await page.waitForFunction(([p, had]) => p.samples.length >= had + 2, [probe, had] as const, {
    timeout: 20_000,
  });
  const frames = await probe.evaluate((p) => {
    const at = p.heard.find((e) => e.type === 'room:signature')!.frame;
    const others = p.scriptMs.slice(at + 5, at + 25).sort((a, b) => a - b);
    return {
      updateMs: p.updateMs[at]!,
      scriptMs: p.scriptMs[at]!,
      medianLaterMs: others[Math.floor(others.length / 2)] ?? Number.NaN,
      plants: p.instances(),
      targets: p.plantTargets().length,
      sample: p.samples[p.samples.length - 1]!,
    };
  });
  console.log(
    `T-128d d2 the frame of room:signature, autoplant=80 (emulator, software rendering): updates ` +
      `${frames.updateMs.toFixed(1)} ms, updates and render ${frames.scriptMs.toFixed(1)} ms; a later frame's ` +
      `median ${frames.medianLaterMs.toFixed(1)} ms; perf:sample ${JSON.stringify(frames.sample)}`,
  );
  expect([frames.plants, frames.targets]).toEqual([80, 80]);
  expect(frames.scriptMs).toBeLessThan(50);
  expect(frames.sample.draws).toBeLessThanOrEqual(60); // NFR-PERF-03, both eyes
  expect(frames.sample.tris).toBeLessThanOrEqual(150_000); // NFR-PERF-04
  expect(frames.sample.maxFlashPerS).toBeLessThanOrEqual(3); // FR-UI-11
  expect(errors).toEqual([]);
});
