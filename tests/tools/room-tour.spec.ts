// `npm run test:room-tour` (tests/tools/test-videos.ts --rooms): the garden in each room fixture of tests/fixtures/rooms,
// in name order, for a look at how the rooms differ. Twenty plants (`autoplant`), no tutorial; IWER enters and the room's
// planes are drawn (room-planes.ts: IWER draws none) with a label of what the room is and what the game made of it. A
// seated head 40 cm over the bed and 42 cm back looks down at it (as the shaky-hands scenes sit), and the tide is
// recorded for 10 s from `room:tuned`, with a still 4 s in. Then an overview from the same distance for every room.
// Each room's numbers go to .tmp/room-tour/<n>.json for the README. Emulator footage: software rendering, no passthrough.
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { test, type Page } from '@playwright/test';

import {
  enterXR,
  openApp,
  playHandPath,
  readHandPath,
  readRoom,
  xrFrames,
  type Room,
} from '../e2e/support/iwer';

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
/** The overview's distance from the room's middle, the same for every room, and its look down. */
const OVERVIEW_M = 7.5;
const DOWN_RAD = (35 * Math.PI) / 180;
const KEYS: Record<number, string> = { [-3]: 'A', 0: 'C', 2: 'D', 4: 'E' };

/** The room and what the game made of it, in four lines: its size, its table, the bed, the signature. */
function describe(room: Room, h: Heard): string[] {
  const floor = room.planes.find((p) => p.label === 'floor');
  const ceiling = room.planes.find((p) => p.label === 'ceiling');
  const walls = room.planes.filter((p) => p.label === 'wall').length;
  const size =
    floor === undefined
      ? 'no floor, no walls: nothing sensed'
      : `${floor.size[0]} x ${floor.size[1]} m floor, ` +
        (ceiling === undefined ? 'no ceiling' : `ceiling ${ceiling.center[1]} m`) +
        `, ${walls} walls`;
  const table = room.planes.find((p) => p.label === 'table' || p.label === 'other');
  const s = h.signature;
  return [
    size,
    table === undefined
      ? 'no table'
      : `${table.label} ${table.center[1]} m high, ${table.size[0]} x ${table.size[1]} m`,
    `bed: level ${h.placedLevel ?? '?'}, ${h.bed?.y.toFixed(2) ?? '?'} m over the floor`,
    s === null
      ? 'no signature'
      : `${KEYS[s.keyRoot] ?? s.keyRoot} ${s.mode}, echo ${s.reverbRt60} s, palette ${h.palette!.shiftDeg} deg / sat ${h.palette!.saturation.toFixed(2)}`,
  ];
}

/** Writes the lines over the page, so they are in the stills and the video (as the test videos do). */
function label(lines: string[]): void {
  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;left:14px;top:10px;z-index:99999;font:500 19px system-ui,sans-serif;color:#fff;' +
    'background:rgba(0,0,0,.55);padding:8px 12px;border-radius:8px;line-height:1.35;pointer-events:none';
  lines.forEach((line, i) => {
    const row = document.createElement('div');
    row.textContent = line;
    if (i === 0) row.style.cssText = 'font-weight:700;font-size:22px';
    box.append(row);
  });
  const tag = document.createElement('div');
  tag.textContent = 'EMULATOR: room drawn from the fixture the game reads';
  tag.style.cssText = 'font-size:14px;opacity:.8';
  box.append(tag);
  document.body.append(box);
}

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
    const facts = await heard.evaluate((h) => h.read());
    const bed = facts.bed!;
    // The room the game reads, drawn (IWER draws none of it), and what it is, written over the picture.
    await page.evaluate(async (room) => {
      const url = '/tests/tools/room-planes.ts';
      const planes = (await import(/* @vite-ignore */ url)) as typeof import('./room-planes');
      planes.drawRoom(room);
    }, room);
    await page.evaluate(label, [`${n}. ${name}`, ...describe(room, facts)]);

    // The garden: a seated head 40 cm over the bed and 42 cm back, looking down at it; 10 s of the tide.
    const centre = { x: bed.x, y: bed.y, z: bed.z };
    await look(
      page,
      { x: bed.x + bed.toward.x * 0.42, y: bed.y + 0.4, z: bed.z + bed.toward.z * 0.42 },
      centre,
    );
    await xrFrames(page, 3);
    const startMs = Date.now() - opened;
    await page.waitForTimeout(STILL_AT_MS); // the recording itself: the tide sweeps while it runs
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: `${OUT}${n}.png` });
    await page.waitForTimeout(RECORD_MS - STILL_AT_MS);
    info.annotations.push({ type: 'startMs', description: String(startMs) });
    info.annotations.push({ type: 'durationMs', description: String(RECORD_MS) });

    // The overview: the same spot for every room, OVERVIEW_M from the room's middle towards the back right corner,
    // looking down 35 degrees, so a small room is small in the picture and a large one large. From outside, the near
    // walls drop away (room-planes.ts draws each wall from its room's side only).
    const floor = room.planes.find((plane) => plane.label === 'floor');
    const middle = { x: floor?.center[0] ?? bed.x, y: 0.5, z: floor?.center[2] ?? bed.z };
    const flat = OVERVIEW_M * Math.cos(DOWN_RAD) * Math.SQRT1_2;
    const from = { x: middle.x + flat, y: middle.y + OVERVIEW_M * Math.sin(DOWN_RAD), z: middle.z + flat };
    await look(page, from, middle);
    await xrFrames(page, 3);
    await page.screenshot({ path: `${OUT}${n}-room.png` });

    mkdirSync(FACTS, { recursive: true });
    writeFileSync(
      `${FACTS}${n}.json`,
      JSON.stringify({ n, room: name, stands: STANDS[name] ?? '', size: describe(room, facts)[0], ...facts }),
    );
  });
});
