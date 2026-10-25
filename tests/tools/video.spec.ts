// The judge video's emulator capture (T-153 prep; VIDEO_SCRIPT_V0 §3.3): one continuous take of the first loop,
// recorded as WebM at 1920 x 1080 by `npm run video:capture`, because no headset exists. Enter; the bed placed and
// the tuning ripple; the palm up, the seed, the pinch, the carry, the plant and its note; the tutorial's two more
// seeds, and a fourth after its gates (a prelude visit, cut by the editor, saves a garden of four seeds and no
// plant: the tutorial runs only on an empty bed, so `autoplant` cannot serve); the pull and the move; Listen (palms out: the dome
// and the halo); the wake. The hands are IWER's, driven as 23-onboarding drives them; the head by IWER's
// set_transform, eased, under 40 degrees a second. The page's DOM (`main`) is hidden for the take, as the gallery
// hides it. Each beat's time from the start of the recording goes to the console and to beats.json beside the
// video, for the editor's cut.
//
// Emulator footage (Golden Rule 11): IWER's software rendering at its own frame rate; the app draws no hand (D-027),
// so the take sets the dev-only `handCue` flag (T-175), which draws the hands' joints for the recording; the room is
// the fixture's planes. Playwright's recorder takes no sound: the audio runs in the page (the Enter
// click starts it), and every call the app makes on its engine during the take is logged, with its audio-clock and
// recording times, to engine-calls.json. `npm run video:audio` replays them offline into the take's track
// (tests/renders/video-track.spec.ts), and `npm run video:cut` makes the rough cut (scripts/rough-cut.ts).
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { test, type JSHandle, type Page } from '@playwright/test';

import { HIT_RADIUS_M } from '../../src/hands/config';
import { GUIDE_CELL } from '../../src/ui/config';
import { enterXR, openApp, readRoom, xrFrames } from '../e2e/support/iwer';

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Garden = typeof import('../../src/garden/index');
type Hands = typeof import('../../src/hands/index');
type RoomModule = typeof import('../../src/room/index');
type Hand = 'left' | 'right';
type Vec3 = { x: number; y: number; z: number };
type Cell = { ring: number; step: number };

const OUT = fileURLToPath(new URL('../../.tmp/video/', import.meta.url));
/** VIDEO_SCRIPT_V0 §3.3: the hero room. The take runs with the tutorial on and no flag. */
const ROOM = 'sig-living-table';
/** The prelude adds this seed to the three starters, so the take has four plants by Listen. */
const MORE_SEEDS = [{ voice: 'bell', hue: 0.6 }];
const FOURTH_CELL: Cell = { ring: 1, step: 4 };
/** The seated camera of §3.3: pitched down to the bed; level for the palms out (read against the head's forward). */
const BED_PITCH_DEG = 45;
const LISTEN_PITCH_DEG = 40;
const HEAD_DEG_PER_S = 36; // under the script's 40
const HEAD_STEP_MS = 100;
/** A hand's carry, pull or drag is shown as a glide of this many steps (an emulated hand jumps otherwise). */
const GLIDE_STEPS = 3; // each step rests the hand, two emulator frames and more: six made a carry 11 s long
const GLIDE_STEP_MS = 80;
const PULL_M = 0.08; // the tutorial's grow gate, as 23-onboarding pulls it
const MOVE_TO: Cell = { ring: 3, step: 6 }; // the move gate's free cell, as 23-onboarding drags it

const PALM_DOWN = { roll: 0, pitch: 0, yaw: 0 };
const PALM_UP = { roll: 180, pitch: 0, yaw: 0 };
const PALM_OUT = { pitch: 90 };
const PALM_TO_FACE = { pitch: -90 };
const LEFT_ROOT: Vec3 = { x: -0.2, y: 0.95, z: -0.3 };
const RIGHT_REST: Vec3 = { x: 0.3, y: 1.1, z: -0.25 };
const LEFT_OUT: Vec3 = { x: -0.15, y: 1.5, z: -0.35 };
const RIGHT_OUT: Vec3 = { x: 0.15, y: 1.5, z: -0.35 };
const LOWERED_LEFT: Vec3 = { x: -0.3, y: 0.7, z: -0.2 };
const LOWERED_RIGHT: Vec3 = { x: 0.3, y: 0.7, z: -0.2 };
const WAKE_AT: Vec3 = { x: 0.05, y: 1.55, z: -0.3 };
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

interface Heard {
  name: string;
  id: string | null;
  step: string | null;
  gesture: string | null;
  atMs: number;
}
interface Probe {
  heard: Heard[];
  seedTarget(): { id: string; at: Vec3 } | null;
  plantTargets(): { id: string; at: Vec3 }[];
  hand(hand: Hand): { palmPos: Vec3; pinchPos: Vec3 };
  cellAt(cell: Cell): Vec3;
  plants(): { id: string; cell: Cell }[];
  /** Notes the engine has started. */
  triggers(): number;
  /** Seeds in the supply. */
  seeds(): number;
  /** Writes this garden, with `more` seeds added and no plant, to the localStorage fallback as a later visit, for
   *  the next page to load (persistence/Store: of one garden twice, the later visit wins). */
  saveSeeds(more: { voice: string; hue: number }[]): void;
  /** The right pinch point once it has stopped moving (two frames the same). */
  atRest(): Promise<Vec3>;
  /** From now on, logs every call the app makes on its audio engine (the settings in force first). */
  recordEngine(): void;
  engineCalls(): EngineCall[];
}
/** One call on the engine: its method, its arguments (typed arrays as arrays), the audio clock and the wall clock. */
interface EngineCall {
  m: string;
  args: unknown[];
  audioS: number;
  wallMs: number;
}
interface DevPage {
  IWER_DEVICE: { remote: { dispatch(method: string, params: object): Promise<unknown> } };
}

/** Listens on the app's bus from before the session, and reaches the hands and the garden through the dev handle. */
function watch(page: Page): Promise<JSHandle<Probe>> {
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { Interactable } = await load<Components>('/src/core/components.ts');
    const gardenModule = await load<Garden>('/src/garden/index.ts');
    const hands = await load<Hands>('/src/hands/index.ts');
    const room = await load<RoomModule>('/src/room/index.ts');
    const { world, engine, garden } = window.__roomsong!;
    const bed = world.getSystem(room.RoomSystem)!.bed.object3D!;
    const calls: EngineCall[] = [];
    const heard: Heard[] = [];
    const note = (name: string, more: Partial<Heard> = {}) =>
      heard.push({ name, id: null, step: null, gesture: null, ...more, atMs: performance.now() });
    core.bus.on('onboarding:step', ({ step }) => note('step', { step }));
    core.bus.on('garden:seedOut', ({ seed }) => note('garden:seedOut', { id: seed.id }));
    core.bus.on('garden:changed', (e) => {
      for (const id of e.diff.added) note('planted', { id });
    });
    core.bus.on('gesture:release', (e) => note('gesture:release', { gesture: e.gesture }));
    for (const type of ['room:features', 'room:tuned', 'listen:enter', 'listen:exit'] as const)
      core.bus.on(type, () => note(type));
    const targets = world.queryManager.registerQuery({ required: [Interactable] }).entities;
    const states = world.queryManager.registerQuery({ required: [hands.HandState] }).entities;
    const stateOf = (hand: Hand) => [...states].find((e) => e.getValue(hands.HandState, 'hand') === hand)!;
    const vec = (view: ArrayLike<number>): Vec3 => ({ x: view[0]!, y: view[1]!, z: view[2]! });
    const ofKind = (kind: string) => [...targets].filter((e) => e.getValue(Interactable, 'kind') === kind);
    const probe: Probe = {
      heard,
      seedTarget() {
        const seed = ofKind('seed')[0];
        return seed === undefined
          ? null
          : {
              id: seed.getValue(Interactable, 'id') ?? '',
              at: vec(seed.getVectorView(Interactable, 'worldPos')),
            };
      },
      plantTargets: () =>
        ofKind('plant').map((e) => ({
          id: e.getValue(Interactable, 'id') ?? '',
          at: vec(e.getVectorView(Interactable, 'worldPos')),
        })),
      hand: (hand) => ({
        palmPos: vec(stateOf(hand).getVectorView(hands.HandState, 'palmPos')),
        pinchPos: vec(stateOf(hand).getVectorView(hands.HandState, 'pinchPos')),
      }),
      cellAt(cell) {
        const c = gardenModule.cellCentre(cell, { x: 0, y: 0 });
        const e = bed.matrixWorld.elements;
        return {
          x: e[0] * c.x + e[8] * c.y + e[12],
          y: e[1] * c.x + e[9] * c.y + e[13],
          z: e[2] * c.x + e[10] * c.y + e[14],
        };
      },
      plants: () => garden.state!.plants.map((p) => ({ id: p.id, cell: { ...p.cell } })),
      triggers: () => engine.stats.triggers,
      seeds: () => garden.state?.seeds.length ?? 0,
      saveSeeds: (more) => {
        const state = garden.state!;
        const now = Date.now();
        const seeds = [
          ...state.seeds,
          ...more.map((seed, i) => ({ id: `take-${i}`, ...seed, receivedAt: now })),
        ];
        const saved = { ...state, plants: [], seeds, lastVisitAt: now + 3_600_000 };
        localStorage.setItem('roomsong.garden.state', JSON.stringify(saved));
      },
      atRest: () =>
        new Promise((done, fail) => {
          let last: Vec3 | null = null;
          const look = () => {
            const session = world.renderer.xr.getSession();
            if (session === null) return fail(new Error('atRest needs a session'));
            const now = probe.hand('right').pinchPos;
            if (last !== null && distance(now, last) < 0.0002) return done(now);
            last = now;
            session.requestAnimationFrame(look);
          };
          const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
          look();
        }),
      recordEngine() {
        const log = (m: string, args: unknown[]) =>
          calls.push({
            m,
            args: JSON.parse(
              JSON.stringify(args, (_, v: unknown) =>
                ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v,
              ),
            ) as unknown[],
            audioS: engine.clock.now(),
            wallMs: Date.now(),
          });
        // AudioSystem applied these at boot, before this probe: the replay starts from them.
        const s = core.settings.get();
        log('setTempo', [s.tempo]);
        log('setVolume', [s.volume]);
        log('setReverb', [s.reverb]);
        log('setMono', [s.mono]);
        const methods = engine as unknown as Record<string, (...args: unknown[]) => unknown>;
        let lastPose = '';
        for (const m of [
          'init',
          'resume',
          'suspend',
          'setTempo',
          'setVolume',
          'setMono',
          'setReverb',
          'setSignature',
          'setStyle',
          'setListenerPose',
          'syncPlants',
          'chordTone',
          'ui',
          'enterListen',
          'exitListen',
          'setStillness',
        ]) {
          const original = methods[m]!.bind(engine);
          methods[m] = (...args: unknown[]) => {
            // The head's pose comes every frame: logged only when it changed.
            const pose = m === 'setListenerPose' ? Array.from(args[0] as ArrayLike<number>).join() : '';
            if (pose === '' || pose !== lastPose) log(m, args);
            if (pose !== '') lastPose = pose;
            return original(...args);
          };
        }
      },
      engineCalls: () => calls,
    };
    return probe;
  });
}

/** Resolves with the `count`-th event of that name (and step or gesture, where given). */
async function heard(
  probe: JSHandle<Probe>,
  name: string,
  { step, gesture, count = 1 }: { step?: string; gesture?: string; count?: number } = {},
): Promise<Heard> {
  const handle = await probe.evaluateHandle(
    (p, [name, step, gesture, count]) =>
      new Promise<Heard>((done) => {
        const find = () =>
          p.heard.filter(
            (e) =>
              e.name === name &&
              (step === null || e.step === step) &&
              (gesture === null || e.gesture === gesture),
          )[count - 1];
        const poll = () => {
          const found = find();
          if (found !== undefined) done(found);
          else setTimeout(poll, 20);
        };
        poll();
      }),
    [name, step ?? null, gesture ?? null, count] as const,
  );
  return handle.jsonValue();
}

/** IWER's remote: the head and the hands, every command of one call reaching the session in the same frame. */
const together = (page: Page, commands: [method: string, params: object][]) =>
  page.evaluate(async (commands) => {
    const { remote } = (window as unknown as DevPage).IWER_DEVICE;
    await Promise.all(commands.map(([method, params]) => remote.dispatch(method, params)));
  }, commands);

/** The head, pitched down `pitch` degrees, in one step. */
const look = (page: Page, pitch: number) =>
  together(page, [['set_transform', { device: 'headset', orientation: { yaw: 0, pitch: -pitch, roll: 0 } }]]);

/** The head turned from one pitch to another, eased, under HEAD_DEG_PER_S. */
async function turnHead(page: Page, from: number, to: number): Promise<void> {
  const steps = Math.max(1, Math.ceil((Math.abs(to - from) / HEAD_DEG_PER_S) * (1000 / HEAD_STEP_MS)));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    await look(page, from + (to - from) * eased);
    await page.waitForTimeout(HEAD_STEP_MS);
  }
}

/** The emulated hands (23-onboarding): the right hand's pinch that does not move its pinch point. */
async function emulatedHands(page: Page, probe: JSHandle<Probe>) {
  const transform = (hand: Hand, position: Vec3, orientation: object = PALM_DOWN): [string, object] => [
    'set_transform',
    { device: `hand-${hand}`, position, orientation },
  ];
  const select = (value: 0 | 1): [string, object] => ['set_select_value', { device: 'hand-right', value }];
  const settle = async (): Promise<Vec3> => {
    await xrFrames(page, 2);
    return probe.evaluate((p) => p.atRest());
  };
  const from = (tip: Vec3): Vec3 => ({
    x: tip.x - RIGHT_REST.x,
    y: tip.y - RIGHT_REST.y,
    z: tip.z - RIGHT_REST.z,
  });
  await together(page, [transform('right', RIGHT_REST)]);
  const open = from(await settle());
  await together(page, [select(1)]);
  const closed = from(await settle());
  await together(page, [select(0)]);
  await settle();
  const rootFor = (pos: Vec3, tip: Vec3): Vec3 => ({ x: pos.x - tip.x, y: pos.y - tip.y, z: pos.z - tip.z });
  const carryTo = async (pos: Vec3): Promise<Vec3> => {
    await together(page, [transform('right', rootFor(pos, closed))]);
    return settle();
  };
  return {
    put: (hand: Hand, position: Vec3, orientation: object) =>
      together(page, [transform(hand, position, orientation)]),
    /** The open hand comes to its pinch point at `pos` and closes there; resolves with how far off it rested. */
    async pinchAt(pos: Vec3): Promise<number> {
      await together(page, [transform('right', rootFor(pos, open))]);
      const tip = await settle();
      await together(page, [transform('right', rootFor(pos, closed)), select(1)]);
      return distance(tip, pos);
    },
    /** The closed hand glides from `from` to `to` in GLIDE_STEPS, resting at each. */
    async glideTo(from: Vec3, to: Vec3): Promise<void> {
      for (let i = 1; i <= GLIDE_STEPS; i++) {
        const t = i / GLIDE_STEPS;
        await carryTo({
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          z: from.z + (to.z - from.z) * t,
        });
        await page.waitForTimeout(GLIDE_STEP_MS);
      }
    },
    releaseAt: (pos: Vec3) => together(page, [transform('right', rootFor(pos, open)), select(0)]),
    rest: () => together(page, [transform('right', RIGHT_REST), select(0)]),
  };
}
type EmulatedHands = Awaited<ReturnType<typeof emulatedHands>>;

/** The `count`-th seed out on the left palm, pinched by the right hand, carried to `to` and let go there. */
async function carry(page: Page, probe: JSHandle<Probe>, hands: EmulatedHands, to: Vec3, count: number) {
  const out = await heard(probe, 'garden:seedOut', { count });
  const resting = async () => {
    const seed = await probe.evaluate((p) => p.seedTarget());
    const palm = await probe.evaluate((p) => p.hand('left').palmPos);
    return seed?.id === out.id ? { at: seed.at, gap: distance(seed.at, palm) } : null;
  };
  let seed = await resting(); // the seed's glide to the palm (300 ms) ends with it resting there
  while (seed === null || seed.gap > 0.001) {
    await xrFrames(page, 2);
    seed = await resting();
  }
  const off = await hands.pinchAt(seed.at);
  if (off > HIT_RADIUS_M / 4) throw new Error(`the pinch rested ${(off * 100).toFixed(1)} cm off the seed`);
  await xrFrames(page, 12); // past the 100 ms hop to the pinch point
  await hands.glideTo(seed.at, to);
  await hands.releaseAt(to);
  await heard(probe, 'planted', { count });
}

test('the first loop, one take: enter, place, plant, grow, move, listen, wake', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  const t0 = Date.now(); // the page, and its recording, began a moment before this line
  const beats: { beat: string; atS: number; note: string }[] = [];
  const mark = (beat: string, note = '') => {
    const atS = Math.round((Date.now() - t0) / 100) / 10;
    beats.push({ beat, atS, note });
    console.log(`beat ${atS.toFixed(1).padStart(5)} s  ${beat}${note === '' ? '' : `: ${note}`}`);
  };

  // The prelude, not for the cut: a first visit with the tutorial off, whose garden (its three starter seeds come
  // with the room's signature) is saved with one more seed and no plant for the take to load.
  await openApp(page, readRoom(ROOM), '/?flags=skipOnboarding');
  await page.waitForFunction(() => window.__roomsong !== undefined, null, { timeout: 15_000 });
  const prelude = await watch(page);
  mark('prelude', 'a first visit, cut: it saves the garden the take loads');
  await enterXR(page);
  await heard(prelude, 'room:tuned');
  await page.waitForFunction((p) => p.seeds() >= 3, prelude, { timeout: 15_000, polling: 50 });
  await prelude.evaluate((p, more) => p.saveSeeds(more), MORE_SEEDS);

  // The take: the second visit, the tutorial on. The emulator restores its anchor, so the bed is placed at once.
  await openApp(page, readRoom(ROOM), '/?flags=handCue', { onboarding: true }); // the hand drawn (T-175)
  await page.waitForFunction(() => window.__roomsong !== undefined, null, { timeout: 15_000 });
  const probe = await watch(page);
  await probe.evaluate((p) => p.recordEngine()); // before Enter: the click calls init()
  mark('landing', 'the take begins: the page up, the world loading');
  await enterXR(page);
  mark('enter', 'Enter pressed: the session is up, the sound started');
  await page.addStyleTag({ content: 'main { visibility: hidden; }' }); // the garden alone, as the gallery shoots it
  await look(page, BED_PITCH_DEG);
  const hands = await emulatedHands(page, probe); // the right hand's calibration: a pinch at nothing, unseen
  await hands.put('left', LEFT_ROOT, PALM_DOWN); // seen palm down first, as a player's hand is

  // B1: the bed placed on the table, and the tuning ripple over the table, the wall and the ceiling.
  await heard(probe, 'room:features');
  mark('placed', 'the bed on the table; the tuning ripple starts');
  await heard(probe, 'room:tuned');
  mark('tuned', 'the ripple done: the room signature is in');
  await page.waitForTimeout(1500);

  // B2: "Open your hand, palm up"; the palm turned up brings the seed; the pinch, the carry, the plant, its note.
  await heard(probe, 'step', { step: 'palm' });
  await page.waitForTimeout(1500); // the caption and the palm icon, read
  await hands.put('left', LEFT_ROOT, PALM_UP);
  mark('palm', 'the left palm up: the seed glides to it');
  await heard(probe, 'step', { step: 'plant' });
  await page.waitForTimeout(2000); // the seed on the palm, "Pinch the seed, drop it here", the glowing cell
  const guideAt = await probe.evaluate((p, c) => p.cellAt(c), GUIDE_CELL);
  mark('pinch', 'the right hand pinches the seed off the palm and carries it');
  const before = await probe.evaluate((p) => p.triggers());
  await carry(page, probe, hands, guideAt, 1);
  mark('plant', 'the seed planted on the glowing cell');
  await page.waitForFunction(([p, before]) => p.triggers() > before, [probe, before] as const, {
    timeout: 15_000,
    polling: 50,
  });
  mark('note', 'its first note: the tide reached it');

  // B3: two more seeds (the tutorial's), to the guide cell's neighbours.
  await carry(page, probe, hands, await probe.evaluate((p, c) => p.cellAt(c), { ring: 2, step: 3 }), 2);
  mark('plant 2');
  await carry(page, probe, hands, await probe.evaluate((p, c) => p.cellAt(c), { ring: 2, step: 5 }), 3);
  mark('plant 3');

  // B4: the pull (the grow gate) on the newest plant, then the move (the move gate) along the bed.
  await heard(probe, 'step', { step: 'grow' });
  await page.waitForTimeout(1500); // the hint ring and the pull icon round the newest plant
  const newest = (await probe.evaluate((p) => p.plants())).slice(-1)[0]!;
  const foot = (await probe.evaluate((p) => p.plantTargets())).find((t) => t.id === newest.id)!.at;
  await hands.pinchAt(foot);
  mark('pull', 'the newest plant pinched and pulled up 8 cm: it grows');
  await hands.glideTo(foot, { ...foot, y: foot.y + PULL_M });
  await hands.releaseAt({ ...foot, y: foot.y + PULL_M });
  await heard(probe, 'gesture:release', { gesture: 'pull' });
  await heard(probe, 'step', { step: 'move' });
  await page.waitForTimeout(1500); // the drag icon
  const to = await probe.evaluate((p, c) => p.cellAt(c), MOVE_TO);
  await hands.pinchAt(foot);
  mark('move', 'the same plant dragged one ring out, to a free cell');
  await hands.glideTo(foot, to);
  await hands.releaseAt(to);
  await heard(probe, 'gesture:release', { gesture: 'drag' });
  await heard(probe, 'step', { step: 'listen' });
  // The fourth seed, held by the tutorial until its gates, comes to the palm now; the take goes on without it
  // if it does not (the tutorial's supply is its own).
  const fourth = await page
    .waitForFunction((p) => p.heard.filter((e) => e.name === 'garden:seedOut').length >= 4, probe, {
      timeout: 15_000,
      polling: 50,
    })
    .then(
      () => true,
      () => false,
    );
  if (fourth) {
    await carry(page, probe, hands, await probe.evaluate((p, c) => p.cellAt(c), FOURTH_CELL), 4);
    mark('plant 4', 'the fourth seed, out after the gates');
  } else mark('plant 4 missing', 'no fourth seed came out within 15 s of the gates');
  await hands.rest();
  await page.waitForTimeout(3000); // the garden plays: a bar of the plants

  // B5: Listen. Palms out are read against the head's forward: the head level for the hold, then down to the halo.
  await turnHead(page, BED_PITCH_DEG, 0);
  await hands.put('left', LEFT_OUT, PALM_OUT);
  await hands.put('right', RIGHT_OUT, PALM_OUT);
  mark('palms out', 'both palms out, held');
  await heard(probe, 'listen:enter');
  mark('listen', 'Listen: the dome dims the room, the aurora halo rises');
  await hands.put('left', LOWERED_LEFT, PALM_DOWN);
  await hands.put('right', LOWERED_RIGHT, PALM_DOWN);
  await turnHead(page, 0, LISTEN_PITCH_DEG);
  await page.waitForTimeout(8000); // the halo breathing with the song

  // B6: the wake: the right palm turned to the face; the garden back.
  await turnHead(page, LISTEN_PITCH_DEG, 0);
  await hands.put('right', WAKE_AT, PALM_TO_FACE);
  mark('wake pose', 'the right palm to the face');
  await heard(probe, 'listen:exit');
  mark('wake', 'the halo and the dome go: the garden back');
  await hands.put('right', LOWERED_RIGHT, PALM_DOWN);
  await turnHead(page, 0, BED_PITCH_DEG);
  await page.waitForTimeout(3000);
  mark('end');

  // The recording ends with the page; saveAs waits for the file to be whole.
  const calls = await probe.evaluate((p) => p.engineCalls());
  const endS = (Date.now() - t0) / 1000;
  const video = page.video()!;
  await page.close();
  // Where the audio clock's 0 falls on the recording: the wall time less the audio time of each call made while the
  // context ran, their median (the spread says how steady the two clocks kept together).
  const zeros = calls
    .filter((c) => c.audioS > 0.5)
    .map((c) => (c.wallMs - t0) / 1000 - c.audioS)
    .sort((a, b) => a - b);
  const preRollS = zeros[Math.floor(zeros.length / 2)] ?? Number.NaN;
  const spreadS = (zeros[zeros.length - 1] ?? 0) - (zeros[0] ?? 0);
  writeFileSync(
    `${OUT}engine-calls.json`,
    JSON.stringify({
      timeBase: 'atS: seconds on the recording, as beats.json; audioS: the engine audio clock',
      preRollS,
      spreadS,
      endS,
      calls: calls.map(({ m, args, audioS, wallMs }) => ({ m, args, audioS, atS: (wallMs - t0) / 1000 })),
    }),
  );
  console.log(
    `engine: ${calls.length} calls; the audio clock's 0 at ${preRollS.toFixed(3)} s on the recording ` +
      `(spread ${spreadS.toFixed(3)} s)`,
  );
  await video.saveAs(`${OUT}first-loop.webm`);
  const sheet = {
    file: 'first-loop.webm',
    recordedAt: new Date(t0).toISOString(),
    room: ROOM,
    flags: 'handCue on the take (the tutorial on); skipOnboarding on the prelude',
    size: '1920x1080',
    audio: 'none: Playwright records no sound; npm run video:audio renders the track from engine-calls.json',
    endS,
    timeBase: 'seconds from the recording start (the page opened within 0.2 s before "landing")',
    source: 'Immersive Web Emulator (IWER), software rendering, no headset',
    beats,
  };
  writeFileSync(`${OUT}beats.json`, JSON.stringify(sheet, null, 2));
  console.log(`video: ${OUT}first-loop.webm, beats: ${OUT}beats.json (emulator capture, no sound)`);
});
