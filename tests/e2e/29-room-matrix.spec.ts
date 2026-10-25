/// <reference types="webxr" />
// T-166, the emulator half of the room matrix (TC-E2E-13): in each of the six room fixtures the plan names, the
// app's own world enters, places the bed at whichever level the chain reaches (a pinch confirms the level-3 ghost
// where nothing lands by itself), plants one seed through the gesture events a hand would send, and the first
// note is heard: within FR-SYS-03's 20 s of the Enter click; the bed centre 0.35–0.45 m ahead of the head and its
// far edge within 0.75 m (FR-ROOM-01/03, D-034); draws ≤ 60 in the next perf:sample (NFR-PERF-03). One Playwright
// run, one test per room, the numbers in one console line each.
// Emulator result (E): IWER's planes are flat and exact; the real-room half of T-166 (six rooms, no Space Setup,
// permission declined) is a device matter.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import {
  enterXR,
  openApp,
  playHandPath,
  readHandPath,
  readRoom,
  WORLD_READY_MS,
  xrFrames,
} from './support/iwer';

type Core = typeof import('../../src/core/index');
type RoomModule = typeof import('../../src/room/index');
type PerfSample = import('../../src/core/index').EventMap['perf:sample'];

/** The six rooms (SPRINT_PLAN T-166): what each stands for. */
const MATRIX = [
  { room: 'tiny', stands: 'a small room with a table' },
  { room: 'large', stands: 'a large room, the table re-centred' },
  { room: 'floor', stands: 'no table: the floor and the walls only' },
  { room: 'no-walls', stands: 'no walls: the Wanderer signature' },
  { room: 'low-table', stands: 'a very low table (0.42 m)' },
  { room: 'none', stands: 'no scene data (Space Setup never run, or permission declined)' },
] as const;

const FIRST_SOUND_MS = 20_000; // FR-SYS-03
const BED_CENTRE_M: [number, number] = [0.35, 0.45]; // FR-ROOM-01, D-034: level distance from the head
const BED_FAR_EDGE_MAX_M = 0.75;
const BED_OUTER_M = 0.3; // garden/config.ts BED_OUTER: not imported, that file runs under Vite only
const DRAWS_MAX = 60; // NFR-PERF-03, both eyes

interface Probe {
  heard: { type: string; atMs: number; level?: number; key?: number; mode?: string; rt60?: number }[];
  enterAtMs: number;
  /** The first sound of any kind (the bed's chord, T-164 §6): FR-SYS-03's 20 s. */
  firstSoundAtMs: number;
  /** The planted seed's first note on the grid: a trigger after `plant()`'s count. */
  firstNoteAtMs: number;
  triggersBefore: number;
  /** JS ms of the frame that heard `room:signature`: the re-tune, and the bed's chord rendering its strings. */
  signatureFrameMs: number;
  samples: PerfSample[];
  seedId: string | null;
  plants(): number;
  isPlaced(): boolean;
  /** The bed centre's level distance ahead of the head, and its height under the eyes, metres. */
  reach(): { aheadM: number; dropM: number };
  /** The gesture events of one planting: palm up for a seed, then its carry released on ring 2, step 4. */
  plant(): void;
}

function watch(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function probeRoom(page: Page): Promise<JSHandle<Probe>> {
  const enter = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await expect(enter).toBeEnabled({ timeout: WORLD_READY_MS });
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { BedAnchor } = await load<typeof import('../../src/core/components')>('/src/core/components.ts');
    const room = await load<RoomModule>('/src/room/index.ts');
    const { world, engine, garden } = window.__roomsong!;
    const bed = world.getSystem(room.RoomSystem)!.bed;
    const update = world.update.bind(world);
    world.update = (delta, time) => {
      const was = heard.length;
      const t0 = performance.now();
      update(delta, time);
      const now = performance.now();
      if (heard.slice(was).some((e) => e.type === 'room:signature')) probe.signatureFrameMs = now - t0;
      // The tide's notes count in triggers; the placed note (P-012) and the bed's chord only in the voices sounding.
      if (probe.firstSoundAtMs === 0 && (engine.stats.triggers > 0 || engine.stats.voices > 0))
        probe.firstSoundAtMs = now;
      if (
        probe.firstNoteAtMs === 0 &&
        probe.triggersBefore >= 0 &&
        engine.stats.triggers > probe.triggersBefore
      )
        probe.firstNoteAtMs = now;
    };
    document
      .querySelector('main button')
      ?.addEventListener('click', () => (probe.enterAtMs = performance.now()), { capture: true });
    const heard: Probe['heard'] = [];
    const at = () => performance.now();
    core.bus.on('room:placementLevel', ({ level }) =>
      heard.push({ type: 'room:placementLevel', atMs: at(), level }),
    );
    core.bus.on('room:bedPlaced', ({ placement }) =>
      heard.push({ type: 'room:bedPlaced', atMs: at(), level: placement.level }),
    );
    core.bus.on('room:signature', ({ signature }) =>
      heard.push({
        type: 'room:signature',
        atMs: at(),
        key: signature.keyRoot,
        mode: signature.mode,
        rt60: signature.reverbRt60,
      }),
    );
    core.bus.on('garden:seedArrived', ({ seed }) => (probe.seedId ??= seed.id));
    core.bus.on('perf:sample', (s) => probe.samples.push({ ...s }));
    const probe: Probe = {
      heard,
      enterAtMs: 0,
      firstSoundAtMs: 0,
      firstNoteAtMs: 0,
      triggersBefore: -1,
      signatureFrameMs: 0,
      samples: [],
      seedId: null,
      plants: () => garden.state?.plants.length ?? 0,
      isPlaced: () => bed.hasComponent(BedAnchor),
      reach: () => {
        const b = bed.object3D!.matrixWorld.elements;
        const h = world.player.head.matrixWorld.elements;
        return { aheadM: Math.hypot(b[12] - h[12], b[14] - h[14]), dropM: h[13] - b[13] };
      },
      plant: () => {
        const id = probe.seedId!;
        probe.triggersBefore = engine.stats.triggers; // the plant's own first note is the next trigger
        core.bus.emit('gesture:palmUp', { type: 'gesture:palmUp', hand: 'right' });
        core.bus.emit('gesture:release', {
          type: 'gesture:release',
          hand: 'right',
          gesture: 'carry',
          target: { kind: 'seed', id },
          pos: { x: 0, y: 0, z: 0 },
          zone: 'bed',
          cell: { ring: 2, step: 4 }, // written out: the page's code cannot see the test's constants
          dy: null,
        } as never);
      },
    };
    return probe;
  });
}

const heardOf = (page: Page, probe: JSHandle<Probe>, type: string, timeout = 15_000) =>
  page.waitForFunction(([p, type]) => p.heard.some((e) => e.type === type), [probe, type] as const, {
    timeout,
  });

for (const { room, stands } of MATRIX) {
  test(`TC-E2E-13 ${room}: ${stands}: the bed in reach, one seed planted, the first note in time`, async ({
    page,
  }) => {
    const errors = watch(page);
    const offHost = await openApp(page, readRoom(room));
    const probe = await probeRoom(page);
    await enterXR(page);
    // Whichever level lands first: a labelled table or a surface is placed in the first frames; a room with
    // neither shows the level-3 ghost after the 3 s plane wait, and a pinch confirms it (in the air: it floats).
    await page.waitForFunction(
      (p) => p.isPlaced() || p.heard.some((e) => e.type === 'room:placementLevel' && e.level === 3),
      probe,
      { timeout: 15_000 },
    );
    if (!(await probe.evaluate((p) => p.isPlaced()))) {
      await xrFrames(page, 3); // the ghost is up: a pinch begun before it would confirm nothing
      await playHandPath(page, readHandPath('pinch'));
      await heardOf(page, probe, 'room:bedPlaced');
    }
    await heardOf(page, probe, 'room:signature');
    await page.waitForFunction((p) => p.seedId !== null, probe, { timeout: 5000 }); // the first visit's seeds
    await probe.evaluate((p) => p.plant());
    await xrFrames(page, 2);
    expect(await probe.evaluate((p) => p.plants())).toBe(1);
    await page.waitForFunction((p) => p.firstNoteAtMs > 0, probe, { timeout: FIRST_SOUND_MS });
    const had = await probe.evaluate((p) => p.samples.length);
    await page.waitForFunction(([p, had]) => p.samples.length > had, [probe, had] as const, {
      timeout: 5000,
    });

    const r = await probe.evaluate((p) => ({
      level: p.heard.find((e) => e.type === 'room:bedPlaced')!.level!,
      signature: p.heard.find((e) => e.type === 'room:signature')!,
      reach: p.reach(),
      enterToBedMs: p.heard.find((e) => e.type === 'room:bedPlaced')!.atMs - p.enterAtMs,
      enterToFirstSoundMs: p.firstSoundAtMs - p.enterAtMs,
      enterToFirstNoteMs: p.firstNoteAtMs - p.enterAtMs,
      signatureFrameMs: p.signatureFrameMs,
      sample: p.samples[p.samples.length - 1]!,
    }));
    console.log(
      `T-166 ${room} (emulator): level ${r.level}; bed ${r.reach.aheadM.toFixed(3)} m ahead, ` +
        `${r.reach.dropM.toFixed(2)} m under the eyes, far edge ${(r.reach.aheadM + BED_OUTER_M).toFixed(3)} m; ` +
        `signature key ${r.signature.key} ${r.signature.mode} rt60 ${r.signature.rt60} ` +
        `(its frame ${r.signatureFrameMs.toFixed(1)} ms JS); Enter to bed ${Math.round(r.enterToBedMs)} ms, ` +
        `to the first sound ${Math.round(r.enterToFirstSoundMs)} ms, to the plant's first note ` +
        `${Math.round(r.enterToFirstNoteMs)} ms; draws ${r.sample.draws}, tris ${r.sample.tris}, ` +
        `flash ${r.sample.maxFlashPerS}`,
    );
    expect(r.reach.aheadM).toBeGreaterThanOrEqual(BED_CENTRE_M[0] - 1e-6);
    expect(r.reach.aheadM).toBeLessThanOrEqual(BED_CENTRE_M[1] + 1e-6);
    expect(r.reach.aheadM + BED_OUTER_M).toBeLessThanOrEqual(BED_FAR_EDGE_MAX_M);
    expect(r.enterToFirstSoundMs).toBeLessThanOrEqual(FIRST_SOUND_MS); // FR-SYS-03
    expect(r.enterToFirstNoteMs).toBeGreaterThan(0); // the planted seed's own note was heard (waited for above)
    expect(r.sample.draws).toBeLessThanOrEqual(DRAWS_MAX);
    expect(r.sample.maxFlashPerS).toBeLessThanOrEqual(3);
    expect(errors).toEqual([]);
    expect(offHost).toEqual([]);
  });
}
