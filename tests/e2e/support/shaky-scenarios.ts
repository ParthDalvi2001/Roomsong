// The shaky-hands scenes (SHAKY_SCENARIOS in shaky-table.ts), played inside the page by the rig: the browser spec calls
// `play` through page.evaluate, the headset's ghost mode calls it directly. Each scene moves pretend hands with the
// noise measured on a real headset and throws, with what the app said, when the app does not do what a player expects.
// All the rest is the app's own: its HandSampler (in a browser test), GestureMachine, GardenSystem and rendering.
import { Vector3 } from 'three';

import { settings } from '../../../src/core/index.js';
import { HIT_RADIUS_M } from '../../../src/hands/config.js';
import { OnboardingSystem } from '../../../src/onboarding/index.js';
import { GUIDE_CELL } from '../../../src/ui/config.js';
import { HintSystem, PanelSystem } from '../../../src/ui/index.js';

import {
  PALM_OUT_BAND,
  PALM_UP_BAND,
  PALM_UP_NATURAL,
  PANEL_FINGERS_FROM_HEAD_M,
  PLANT_SHORT_M,
} from './shaky-noise.js';
import { Rig, SETTLE_MS, type Cell, type Driver, type Hand } from './shaky-rig.js';

/** Measured by the scene, for the log and the report. */
export type Facts = Record<string, number | string>;
type Scene = (rig: Rig, facts: Facts) => Promise<void>;

const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);
/** Hints.ts `Frame`. */
const PALM_ICON = 4;
const SEED_MS = 8000;
/** The longest a press or a release may take to be heard, on a loaded host. */
const HEARD_MS = 3000;
const round = (value: number, digits = 3): number => Number(value.toFixed(digits));

/** The player is seated and has both hands at rest; the room has tuned, so a seed can be asked for. */
async function seated(rig: Rig): Promise<void> {
  await rig.until(() => rig.count('room:tuned') > 0, 20_000, 'The room never tuned');
  rig.seat();
  await rig.rest('left');
  await rig.rest('right');
  await rig.wait(300);
}

/** A held hand's move, with one tracking drop half way (Rig.blink). */
async function carry(rig: Rig, hand: Hand, to: Vector3, ms: number, turn: Parameters<Rig['go']>[3] = {}) {
  const moving = rig.go(hand, to, ms, turn);
  await rig.wait(ms / 2);
  rig.blink(hand);
  await moving;
}

const seedOn = (rig: Rig, hand: Hand) => rig.count('garden:seedOut', (e) => e.hand === hand);

/**
 * A palm rising through its natural readings into the band a real seed came at, with the tracking dropping all the
 * while; resolves when the seed has come to it. Measured: `seedAfterMs`, and the drops the app saw meanwhile.
 */
async function askForSeed(rig: Rig, facts: Facts, hand: Hand): Promise<void> {
  const before = seedOn(rig, hand);
  const x = hand === 'left' ? -0.2 : 0.2;
  rig.dropMode(hand, 'burst');
  rig.palm(hand, PALM_UP_NATURAL);
  await rig.go(hand, rig.fromBed(x, 0.2, 0.22), 600, { normal: UP, fingers: rig.ahead() });
  const lifted = performance.now();
  rig.beat('Palm up, tracking dropping');
  rig.palm(hand, PALM_UP_BAND);
  await rig.until(
    () => seedOn(rig, hand) > before,
    SEED_MS,
    `No seed came to the ${hand} palm through the tracking drops`,
  );
  facts.seedAfterMs = Math.round(performance.now() - lifted);
  facts.dropsBeforeSeed = rig.count('hands:lost', (e) => e.hand === hand, lifted);
  rig.beat('A seed came');
}

/** Resolves when a seed rests on `hand`'s palm, near enough for the eye and the pick. */
async function seedRestsOn(rig: Rig, hand: Hand): Promise<void> {
  await rig.until(
    () => {
      const seed = rig.target('seed');
      return seed !== null && seed.distanceTo(rig.read(hand).palmPos) < HIT_RADIUS_M / 2;
    },
    HEARD_MS,
    `The seed never rested on the ${hand} palm`,
  );
}

/** Carries what a closed hand holds to a cell and lets go there: a plant within a step and a ring of that cell. */
async function plantAt(rig: Rig, hand: Hand, cell: Cell, facts: Facts): Promise<void> {
  rig.beat('The carry down to the bed');
  rig.palm(hand, null);
  const before = rig.plants().length;
  await carry(rig, hand, rig.cell(cell, 0.04), 1100, { normal: DOWN, fingers: rig.ahead() });
  await rig.wait(SETTLE_MS);
  await rig.open(hand);
  await rig.until(() => rig.plants().length === before + 1, HEARD_MS, 'The seed was not planted');
  const planted = rig.plants().slice(-1)[0]!;
  facts.plantedAt = `ring ${planted.cell.ring} step ${planted.cell.step}`;
  rig.check(
    Math.abs(planted.cell.ring - cell.ring) <= 1 && Math.abs(planted.cell.step - cell.step) <= 1,
    `Planted at ${facts.plantedAt}, the hand let go over ring ${cell.ring} step ${cell.step}`,
  );
  rig.check(rig.count('garden:seedBack') === 0, 'The seed went home during the carry');
  rig.beat('A plant');
}

const pinchedOn = (rig: Rig, hand: Hand, kind: string, fromMs: number, id?: string) =>
  rig.count(
    'gesture:pinchStart',
    (e) => e.hand === hand && e.kind === kind && (id === undefined || e.id === id),
    fromMs,
  ) > 0;

/** Moves a hand on the head of the plant in that cell and takes it. */
async function takePlant(rig: Rig, hand: Hand, cell: Cell): Promise<{ id: string; head: Vector3 }> {
  const plant = rig
    .plants()
    .find((p) => p.cell.ring === cell.ring && p.cell.step === cell.step);
  rig.check(plant !== undefined, `No plant at ring ${cell.ring} step ${cell.step}`);
  const { id } = plant!;
  const head = rig.target('plant', id)!;
  await rig.go(hand, head, 900, { normal: DOWN, fingers: rig.ahead() });
  await rig.wait(SETTLE_MS);
  const from = performance.now();
  await rig.close(hand);
  await rig.until(() => pinchedOn(rig, hand, 'plant', from, id), HEARD_MS, 'The pinch on the plant took nothing');
  return { id, head };
}

const SCENES: Record<number, Scene> = {
  async 1(rig, facts) {
    await seated(rig);
    await askForSeed(rig, facts, 'left');
    await seedRestsOn(rig, 'left');
    rig.check(Number(facts.dropsBeforeSeed) >= 1, 'The palm-up hold saw no tracking drop: this is not the test');
  },

  async 2(rig, facts) {
    await seated(rig);
    await askForSeed(rig, facts, 'left');
    await seedRestsOn(rig, 'left');
    await rig.wait(400);
    rig.beat('The same hand pinches the seed off its palm');
    const fingers = new Vector3().copy(rig.read('left').pinchPos).distanceTo(rig.target('seed')!);
    facts.fingersOffSeedM = round(fingers);
    rig.check(fingers > HIT_RADIUS_M, 'The fingers already touch the seed: this is not the palm pick');
    rig.dropMode('left', 'underGrace');
    const from = performance.now();
    await rig.close('left');
    await rig.until(() => pinchedOn(rig, 'left', 'seed', from), HEARD_MS, "A pinch by the seed's own hand took nothing");
    facts.dropsInCarryBefore = rig.count('hands:lost', (e) => e.hand === 'left');
    await plantAt(rig, 'left', GUIDE_CELL, facts);
    facts.dropsInCarry = rig.count('hands:lost', (e) => e.hand === 'left') - Number(facts.dropsInCarryBefore);
    delete facts.dropsInCarryBefore;
    rig.check(rig.count('gesture:trackingLost') === 0, 'The carry was dropped by a short tracking gap');
  },

  async 3(rig, facts) {
    await seated(rig);
    await askForSeed(rig, facts, 'left');
    await seedRestsOn(rig, 'left');
    rig.beat('The first palm goes down, the other goes up');
    rig.dropMode('left', 'none');
    await rig.rest('left', 500);
    rig.palm('right', PALM_UP_BAND);
    await rig.go('right', rig.fromBed(0.2, 0.2, 0.22), 600, { normal: UP, fingers: rig.ahead() });
    await rig.until(() => seedOn(rig, 'right') > 0, SEED_MS, 'The seed did not cross to the other palm');
    await seedRestsOn(rig, 'right');
    rig.beat('It crossed; the first hand pinches it');
    rig.dropMode('left', 'underGrace');
    await rig.go('left', rig.target('seed'), 900, { normal: DOWN, fingers: rig.ahead() });
    await rig.wait(SETTLE_MS);
    const from = performance.now();
    await rig.close('left');
    await rig.until(() => pinchedOn(rig, 'left', 'seed', from), HEARD_MS, 'The first hand could not pinch the crossed seed');
    rig.dropMode('right', 'none');
    rig.palm('right', null);
    await plantAt(rig, 'left', GUIDE_CELL, facts);
  },

  async 4(rig, facts) {
    await seated(rig);
    const plant = rig.plants().find((p) => p.cell.ring === 2 && p.cell.step === 4)!;
    rig.dropMode('right', 'underGrace');
    // The close shift at the recording's median, its 75th and its 90th percentile.
    for (const percentile of [0.5, 0.75, 0.9]) {
      const head = rig.target('plant', plant.id)!; // a let-go can grow it: the opening fingers move too
      rig.beat(`Fingers short of the plant's head, close shift at p${percentile * 100}`);
      await rig.go('right', rig.sight(head, PLANT_SHORT_M), 800, {
        normal: DOWN,
        fingers: rig.ahead(),
      });
      await rig.wait(SETTLE_MS);
      const off = new Vector3().copy(rig.read('right').pinchPos).distanceTo(head);
      facts.fingersOffHeadM = round(off);
      rig.check(off > 2 * HIT_RADIUS_M, 'The fingers already touch the plant: this is not the depth error');
      const from = performance.now();
      await rig.close('right', percentile);
      await rig.until(
        () => rig.count('gesture:pinchStart', (e) => e.hand === 'right', from) > 0,
        HEARD_MS,
        'The fingers closed and no pinch began',
      );
      // The recording measured this at its one plant pinch (PLANT_OFF_LINE_M, 1.6 cm): the target off the line at the pinch.
      const at = rig.last('gesture:pinchStart', (e) => e.hand === 'right')!.pos!;
      const eye = rig.eye();
      const line = at.clone().sub(eye).normalize();
      const offLine = head.clone().sub(eye).sub(line.multiplyScalar(head.clone().sub(eye).dot(line))).length();
      facts[`offLineAtPinchP${percentile * 100}M`] = round(offLine);
      rig.check(
        pinchedOn(rig, 'right', 'plant', from, plant.id),
        `A pinch by the plant's head, fingers ${round(off * 100, 1)} cm short, close shift p${percentile * 100}, ` +
          `took nothing: the plant was ${round(offLine * 100, 1)} cm off the line through the fingers`,
      );
      await rig.wait(200);
      await rig.open('right');
      await rig.wait(300);
    }
    facts.pinches = rig.count('gesture:pinchStart', (e) => e.kind === 'plant');
    rig.beat('Three pinches took it');
  },

  async 5(rig, facts) {
    await seated(rig);
    rig.dropMode('right', 'underGrace');
    rig.beat('Pinch the head');
    const { id, head } = await takePlant(rig, 'right', { ring: 2, step: 4 });
    const height = rig.plants().find((p) => p.id === id)!.height;
    rig.beat('A small pull, 3.5 cm');
    rig.watchView = 'right';
    await carry(rig, 'right', head.clone().add(new Vector3(0, 0.035, 0)), 900);
    await rig.wait(SETTLE_MS);
    await rig.open('right');
    await rig.until(() => rig.count('gesture:release', (e) => e.id === id) > 0, HEARD_MS, 'The pull was never released');
    rig.watchView = null;
    const release = rig.last('gesture:release', (e) => e.id === id)!;
    facts.gesture = release.gesture!;
    facts.dyM = round(release.dy ?? 0);
    rig.check(release.gesture === 'pull' && release.dy !== null, `The lift ended as ${release.gesture}`);
    await rig.wait(100);
    const after = rig.plants().find((p) => p.id === id)!.height;
    const rise = rig.target('plant', id)!.y - head.y;
    facts.height = `${round(height, 2)} to ${round(after, 2)}`;
    facts.headRoseM = round(rise);
    facts.maxViewDeg = Math.round(rig.maxViewDeg);
    rig.check(after > height, 'The pull committed nothing');
    rig.check(
      Math.abs(rise - release.dy!) < 0.008,
      `The fingers rose ${facts.dyM} m and the plant's head ${facts.headRoseM} m: the head should stay at the fingers`,
    );
    rig.check(rig.maxViewDeg < 45, `The hand went ${facts.maxViewDeg} degrees off where the head looks`);
    rig.beat('It grew with the fingers');
  },

  async 6(rig, facts) {
    await seated(rig);
    rig.dropMode('right', 'underGrace');
    rig.beat('Pinch the head');
    const { id, head } = await takePlant(rig, 'right', { ring: 2, step: 4 });
    rig.beat('Slide along the ring');
    const to: Cell = { ring: 2, step: 5 };
    await carry(rig, 'right', rig.cell(to, head.y - rig.cell(to).y), 900);
    await rig.wait(SETTLE_MS);
    await rig.open('right');
    await rig.until(() => rig.count('gesture:release', (e) => e.id === id) > 0, HEARD_MS, 'The slide was never released');
    const release = rig.last('gesture:release', (e) => e.id === id)!;
    facts.gesture = release.gesture!;
    rig.check(release.gesture === 'drag', `A sideways slide ended as ${release.gesture}`);
    await rig.wait(100);
    const cell = rig.plants().find((p) => p.id === id)!.cell;
    facts.movedTo = `ring ${cell.ring} step ${cell.step}`;
    rig.check(
      cell.ring === to.ring && cell.step === to.step,
      `The plant was slid to ring ${to.ring} step ${to.step} and stands at ${facts.movedTo}`,
    );
    rig.beat('Moved one step');
  },

  async 7(rig, facts) {
    await seated(rig);
    rig.dropMode('right', 'underGrace');
    rig.beat('Pinch the head');
    const from: Cell = { ring: 3, step: 2 };
    const { id, head } = await takePlant(rig, 'right', from);
    rig.beat('Off the ring');
    const off = rig.fromBed(0.3, head.y - rig.fromBed(0, 0, 0).y, 0.3);
    await carry(rig, 'right', off, 900);
    await rig.wait(SETTLE_MS);
    await rig.open('right');
    await rig.until(() => rig.count('garden:removed', (e) => e.id === id) > 0, HEARD_MS, 'The plant dragged off the bed was not removed');
    facts.zone = rig.last('gesture:release', (e) => e.id === id)!.zone!;
    const removedAt = performance.now();
    await rig.until(() => rig.target('undo', id) !== null, HEARD_MS, 'No undo petal came');
    rig.beat('The petal: pinch it');
    const petal = rig.target('undo', id)!;
    await rig.go('right', petal, 500);
    await rig.wait(SETTLE_MS);
    const pressed = performance.now();
    await rig.close('right');
    await rig.until(() => pinchedOn(rig, 'right', 'undo', pressed, id), HEARD_MS, 'The pinch on the petal took nothing');
    await rig.wait(150);
    await rig.open('right');
    await rig.until(() => rig.plants().some((p) => p.id === id), HEARD_MS, 'The petal did not bring the plant back');
    facts.undoAfterMs = Math.round(performance.now() - removedAt);
    const back = rig.plants().find((p) => p.id === id)!;
    rig.check(
      back.cell.ring === from.ring && back.cell.step === from.step,
      `The plant came back at ring ${back.cell.ring} step ${back.cell.step}`,
    );
    rig.beat('It came back');
  },

  async 8(rig, facts) {
    await seated(rig);
    // Measured at a real palms-out: the head a little down, 0.49 of the way to the floor.
    const eye = rig.eye();
    rig.lookAt(eye.clone().addScaledVector(rig.ahead(), 0.4).add(new Vector3(0, -0.22, 0)));
    await rig.wait(100);
    const m = rig.head();
    const forward = new Vector3(-m[8]!, -m[9]!, -m[10]!);
    const side = forward.clone().cross(UP).normalize();
    const palmAt = (hand: Hand) =>
      eye.clone().addScaledVector(forward, 0.33).addScaledVector(side, hand === 'left' ? -0.14 : 0.14);
    // Drops on the left hand, every gap under the grace: the recording has none in the 4 s before a real palms-out,
    // and two hands dropping out in turn can leave the pose for longer than a real drop.
    const palmsOut = async (): Promise<void> => {
      rig.dropMode('left', 'underGrace');
      rig.dropMode('right', 'none');
      for (const hand of ['left', 'right'] as const) rig.palm(hand, PALM_OUT_BAND);
      await Promise.all(
        (['left', 'right'] as const).map((hand) =>
          rig.go(hand, palmAt(hand), 700, { normal: forward, fingers: UP }),
        ),
      );
    };
    rig.beat('Both palms out, shaky');
    const from = performance.now();
    await palmsOut();
    await rig.until(() => rig.count('listen:enter') > 0, 12_000, 'Palms out never started Listen through the drops');
    facts.listenAfterMs = Math.round(performance.now() - from);
    facts.dropsBeforeListen = rig.count('hands:lost', () => true, from);
    rig.check(Number(facts.dropsBeforeListen) >= 1, 'The palms-out hold saw no tracking drop: this is not the test');

    rig.beat('Wake by a palm to the face');
    rig.dropMode('right', 'underGrace');
    rig.palm('right', null);
    await rig.go('right', palmAt('right'), 400, { normal: forward.clone().negate(), fingers: UP });
    await rig.until(() => rig.count('gesture:wake') > 0, 8000, 'A palm to the face did not wake through the drops');
    await rig.until(() => rig.count('listen:exit') > 0, HEARD_MS, 'Woken, Listen did not end');

    rig.beat('Palms out again');
    await rig.wait(300);
    await palmsOut();
    await rig.until(() => rig.count('listen:enter') > 1, 12_000, 'Palms out did not start Listen a second time');
    rig.beat('Wake by a pinch');
    rig.dropMode('right', 'underGrace');
    rig.palm('right', null);
    await rig.wait(300);
    await rig.close('right');
    await rig.until(() => rig.count('listen:exit') > 1, HEARD_MS, 'A pinch did not wake Listen');
    await rig.open('right');
    rig.beat('Awake');
  },

  async 9(rig, facts) {
    await seated(rig);
    const panel = window.__roomsong!.world.getSystem(PanelSystem)!.panel;
    rig.beat('The orb rides the left hand');
    rig.dropMode('right', 'underGrace');
    await rig.until(() => rig.target('panel', 'orb') !== null, HEARD_MS, 'No settings orb showed on the left hand');
    await rig.go('right', rig.target('panel', 'orb'), 900, { normal: DOWN, fingers: rig.ahead() });
    await rig.wait(SETTLE_MS);
    let from = performance.now();
    await rig.close('right');
    await rig.until(() => pinchedOn(rig, 'right', 'panel', from, 'orb'), HEARD_MS, 'The pinch on the orb took nothing');
    await rig.wait(120);
    rig.check(panel.open, 'The fingers closed on the orb and the panel did not open at the pinch (the fingers are still closed)');
    rig.beat('It opened at the pinch; the hand carrying the orb drifts');
    await carry(rig, 'left', rig.fromBed(-0.27, 0.13, 0.2), 300);
    await rig.open('right');
    await rig.wait(300);
    rig.check(panel.open, 'The panel closed again as the pinch ended');

    const press = async (id: string, isDone: () => boolean, why: string): Promise<void> => {
      const at = rig.target('panel', id);
      rig.check(at !== null, `No control ${id} on the panel`);
      const fingers = rig.sightFromHead(at!, PANEL_FINGERS_FROM_HEAD_M);
      facts.fingersFromHeadM = round(fingers.distanceTo(rig.eye()));
      facts.fingersOffControlM = round(fingers.distanceTo(at!));
      await rig.go('right', fingers, 800);
      await rig.wait(SETTLE_MS);
      from = performance.now();
      await rig.close('right');
      await rig.until(
        () => pinchedOn(rig, 'right', 'panel', from, id),
        HEARD_MS,
        `A pinch ${facts.fingersFromHeadM} m from the head, on the line to ${id}, took nothing`,
      );
      // What a real press does: rec.jsonl has a press moving up to 3.5 cm before its release.
      await carry(rig, 'right', fingers.clone().add(new Vector3(0.035, 0, 0)), 300);
      await rig.open('right');
      await rig.until(isDone, HEARD_MS, why);
    };

    rig.beat('Fingers 25 cm from the head press Volume +');
    const { volume } = settings.get();
    await press('volume:+', () => settings.get().volume > volume, 'The press on Volume + changed nothing');
    facts.volume = `${round(volume, 1)} to ${round(settings.get().volume, 1)}`;
    await rig.wait(300);
    rig.beat('And Close');
    await press('close', () => !panel.open, 'The press on Close did not close the panel');
    rig.beat('Closed');
  },

  async 11(rig, facts) {
    await rig.until(() => rig.count('room:tuned') > 0, 20_000, 'The room never tuned');
    rig.seat();
    await rig.rest('left');
    await rig.rest('right');
    const world = window.__roomsong!.world;
    const tutorial = world.getSystem(OnboardingSystem)!;
    const hints = world.getSystem(HintSystem)!;
    // Its clock is the time handed to update (Onboarding.ts has none of its own), so the test can step it (no sleep).
    let skewS = 0;
    const update = tutorial.update.bind(tutorial);
    tutorial.update = (delta, time) => update(delta, time + skewS);
    await rig.until(() => tutorial.step === 'palm', 5000, `The tutorial stands at "${tutorial.step}", not "palm"`);
    await rig.until(() => hints.shows.icon === PALM_ICON, 5000, 'The palm hint never showed');
    rig.dropMode('left', 'burst');
    rig.beat('Nothing planted: the palm hint');
    await rig.wait(800);
    rig.beat('The clock jumps 61 s');
    skewS += 61;
    await rig.wait(800);
    facts.stepAfter61s = tutorial.step;
    rig.check(rig.plants().length === 0, 'A plant came from nowhere');
    rig.check(
      tutorial.step === 'palm' && hints.shows.icon === PALM_ICON,
      `61 s on, with nothing planted, the tutorial stands at "${tutorial.step}" and shows icon ${hints.shows.icon}`,
    );
    rig.beat('Still the palm hint; a palm up still brings a seed');
    await askForSeed(rig, facts, 'left');
    await rig.until(() => (tutorial.step as string) === 'plant', HEARD_MS, 'A seed out did not bring the plant step');
    rig.beat('The clock jumps 61 s again');
    skewS += 61;
    await rig.wait(800);
    facts.stepAfter122s = tutorial.step;
    rig.check((tutorial.step as string) === 'plant', `61 s more, with nothing planted, the tutorial stands at "${tutorial.step}"`);
    rig.beat('Still the plant hint');
  },
};

let rig: Rig | null = null;

/** Before Enter: hears the app from the session's first event. */
export function prepare(seed: number, driver: Driver): Rig {
  rig = new Rig(seed, driver);
  return rig;
}

/** Plays a scene in the running session. It rejects with the reason a player would be stuck. */
export async function play(n: number): Promise<Facts> {
  const scene = SCENES[n];
  if (rig === null || scene === undefined) throw new Error(`No rig, or no scene ${n}`);
  rig.start();
  const facts: Facts = {};
  await scene(rig, facts);
  facts.fps = rig.fps();
  return facts;
}
