// `npm run test:room-tour` (tests/tools/test-videos.ts --rooms): the garden in each room fixture of tests/fixtures/rooms,
// in name order, for a look at how the rooms differ. Twenty plants (`autoplant`), no tutorial; IWER enters, a seated head
// 40 cm over the bed and 42 cm back looks down at it (as the shaky-hands scenes sit), and the tide is recorded for 10 s
// from `room:tuned`, with a still 4 s in. Then the head steps back and up for a still of the room round the garden.
// Each room's numbers go to .tmp/room-tour/<n>.json for the README. Emulator footage: software rendering, the fixture's
// planes for walls, no passthrough.
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { test, type Page } from '@playwright/test';

import { enterXR, openApp, playHandPath, readHandPath, readRoom, xrFrames } from '../e2e/support/iwer';

type Core = typeof import('../../src/core/index');
type RoomModule = typeof import('../../src/room/index');
type Palette = typeof import('../../src/render/palette');

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = `${ROOT}room-tour/`;
const FACTS = `${ROOT}.tmp/room-tour/`;
const ROOMS = readdirSync(`${ROOT}tests/fixtures/rooms`)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.slice(0, -5))
  .sort();
/** What a room stands for: 29-room-matrix.spec.ts's words for its six, the fixture's own for the rest. */
const STANDS: Record<string, string> = {
  tiny: 'a small room with a table',
  large: 'a large room, the table re-centred',
  floor: 'no table: the floor and the walls only',
  'no-walls': 'no walls: the Wanderer signature',
  'low-table': 'a very low table (0.42 m)',
  none: 'no scene data (Space Setup never run, or permission declined)',
  table: 'a living room with a labelled table 0.74 m high',
  counter: 'a kitchen worktop 0.92 m high, labelled other',
  'sig-kitchen-counter': 'signature room 2: a kitchen 3.6 x 4.2 m, ceiling 2.7 m, a counter',
  'sig-small-desk': 'signature room 1: a box room 2.0 x 2.8 m, ceiling 2.4 m, a desk',
  'sig-living-table': 'signature room 3: a living room 6.0 x 7.0 m, ceiling 3.0 m, a table',
};
const RECORD_MS = 10_000;
const STILL_AT_MS = 4_000;

/** What the page heard of the room, and where the bed is. */
interface Heard {
  level: number | null;
  placedLevel: number | null;
  signature: {
    keyRoot: number;
    mode: string;
    tempo: number;
    reverbRt60: number;
    reverbSize: string;
    paletteSeed: number;
  } | null;
  palette: { shiftDeg: number; saturation: number } | null;
  tuned: boolean;
  /** The bed's pose: its centre and its own +z, the side towards the player. */
  bed: { x: number; y: number; z: number; toward: { x: number; z: number } } | null;
}

/** Listens before Enter: the placement level, the bed, the signature and its palette, the tuning. */
const listen = (page: Page) =>
  page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const room = await load<RoomModule>('/src/room/index.ts');
    const { setPalette, newPalette } = await load<Palette>('/src/render/palette.ts');
    const heard: Heard & { read: () => Heard } = {
      level: null,
      placedLevel: null,
      signature: null,
      palette: null,
      tuned: false,
      bed: null,
      read: () => {
        const object = window.__roomsong!.world.getSystem(room.RoomSystem)!.bed.object3D!;
        const e = object.matrixWorld.elements;
        const toward = Math.hypot(e[8], e[10]) || 1;
        const bed = { x: e[12], y: e[13], z: e[14], toward: { x: e[8] / toward, z: e[10] / toward } };
        const { level, placedLevel, signature, palette, tuned } = heard;
        return { level, placedLevel, signature, palette, tuned, bed };
      },
    };
    core.bus.on('room:placementLevel', ({ level }) => (heard.level = level));
    core.bus.on('room:bedPlaced', ({ placement }) => (heard.placedLevel = placement.level));
    core.bus.on('room:signature', ({ signature }) => {
      const { keyRoot, mode, tempo, reverbRt60, reverbSize, paletteSeed } = signature;
      heard.signature = { keyRoot, mode, tempo, reverbRt60, reverbSize, paletteSeed };
      heard.palette = { ...setPalette(newPalette(), paletteSeed) };
    });
    core.bus.on('room:tuned', () => (heard.tuned = true));
    return heard;
  });

/** IWER's head, put there and turned to `target`, through its remote (programmatic for 30 s after). */
const look = (page: Page, position: object, target: object) =>
  page.evaluate(
    async ([position, target]) => {
      const { remote } = (
        window as unknown as { IWER_DEVICE: { remote: { dispatch(m: string, p: object): Promise<unknown> } } }
      ).IWER_DEVICE;
      await remote.dispatch('set_transform', { device: 'headset', position });
      await remote.dispatch('look_at', { device: 'headset', target });
    },
    [position, target] as const,
  );

ROOMS.forEach((name, i) => {
  const n = i + 1;
  test(`${n}. ${name}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    const opened = Date.now();
    const room = readRoom(name);
    await openApp(page, room, '/?flags=autoplant=20');
    await page.waitForFunction(() => window.__roomsong !== undefined, null, { timeout: 15_000 });
    const heard = await listen(page);
    await enterXR(page);
    // A room with no surface shows the level-3 ghost after its plane wait; a pinch confirms it (29-room-matrix).
    await page.waitForFunction((h) => h.placedLevel !== null || h.level === 3, heard, { timeout: 15_000 });
    if (await heard.evaluate((h) => h.placedLevel === null)) {
      await xrFrames(page, 3);
      await playHandPath(page, readHandPath('pinch'));
    }
    await page.waitForFunction((h) => h.tuned, heard, { timeout: 20_000 });
    const { bed } = await heard.evaluate((h) => h.read());
    const at = (back: number, up: number) => ({
      x: bed!.x + bed!.toward.x * back,
      y: bed!.y + up,
      z: bed!.z + bed!.toward.z * back,
    });
    const centre = { x: bed!.x, y: bed!.y, z: bed!.z };
    await look(page, at(0.42, 0.4), centre);
    await xrFrames(page, 3);

    const startMs = Date.now() - opened;
    await page.waitForTimeout(STILL_AT_MS); // the recording itself: the tide sweeps while it runs
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: `${OUT}${n}.png` });
    await page.waitForTimeout(RECORD_MS - STILL_AT_MS);
    info.annotations.push({ type: 'startMs', description: String(startMs) });
    info.annotations.push({ type: 'durationMs', description: String(RECORD_MS) });

    // Further back and higher, still looking at the bed: inside the floor's own edge where the fixture has one.
    const floor = room.planes.find((plane) => plane.label === 'floor');
    let back = 1.4;
    if (floor !== undefined) {
      const towards = Math.sign(bed!.toward.z) || 1; // the fixtures' rooms are square to z
      const edge = floor.center[2] + (towards * floor.size[1]) / 2;
      back = Math.min(back, Math.abs(edge - bed!.z) - 0.15);
    }
    const ceiling = room.planes.find((plane) => plane.label === 'ceiling')?.center[1] ?? 2.5;
    await look(page, at(back, Math.min(1.0, ceiling - 0.25 - bed!.y)), centre);
    await xrFrames(page, 3);
    await page.screenshot({ path: `${OUT}${n}-room.png` });

    mkdirSync(FACTS, { recursive: true });
    const facts = await heard.evaluate((h) => h.read());
    writeFileSync(
      `${FACTS}${n}.json`,
      JSON.stringify({ n, room: name, stands: STANDS[name] ?? '', ...facts }),
    );
  });
});
