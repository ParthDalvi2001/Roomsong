// Moves a pair of pretend hands, frame by frame, with the noise of shaky-noise.ts, and reads what the app did. It runs
// inside the page, on the dev server, in the app's own modules. A Driver puts a hand where the rig says: IWER's hands for
// the browser tests (the session's real joints, select events and input sources), tests/tools/headset-ghost.ts on a
// headset. Everything is placed relative to where the bed landed and where the head is, so nothing here knows a room.
import { Matrix4, Quaternion, Vector3 } from 'three';

import { bus } from '../../../src/core/index.js';
import { cellCentre } from '../../../src/garden/index.js';
import { TRACKING_GRACE_MS as GRACE_MS } from '../../../src/hands/config.js';
import { HandSystem } from '../../../src/hands/HandSystem.js';
import { stemFor } from '../../../src/render/PlantRenderer.js';
import { RoomSystem } from '../../../src/room/index.js';

import { CLOSE_MS, closeShiftM, Drops, palmReading, shake, UNDER_GRACE_GAP_MS } from './shaky-noise.js';

import type { Hand } from '../../../src/core/index.js';
import type { HandFrame } from '../../../src/hands/InputSource.js';

export type { Hand };
export interface Cell {
  ring: number;
  step: number;
}

/**
 * Where the rig's hands and head go. `at` is the hand's origin in the world; `curl` how far thumb and index have
 * closed, 0 (IWER's relaxed hand) to 1 (its pinch).
 */
export interface Driver {
  hand(hand: Hand, at: Vector3, turn: Quaternion, curl: number, tracked: boolean): void;
  /** The platform's pinch classifier: selectstart, or select and selectend. */
  select(hand: Hand, down: boolean): void;
  /** Moves the head; a headset's head is the player's own, so there it does nothing. */
  head(at: Vector3, turn: Quaternion): void;
  /** `callback` once, at the next XR frame. */
  frame(callback: () => void): void;
}

/**
 * IWER's relaxed and pinch hand poses (iwer 2.5.0, lib/device/configs/hand): the 25 joints of the left hand from the
 * hand's origin, in the order of WebXR Hand Input. Palm down, fingers along -z. The right hand mirrors x.
 */
const OPEN_JOINTS = [
  [-0.0491, 0.0021, 0.117],
  [-0.0106, 0.0007, 0.0874],
  [0.0155, -0.0003, 0.0681],
  [0.0433, 0.0034, 0.0492],
  [0.062, 0.0041, 0.0332],
  [-0.0201, 0.0088, 0.0866],
  [-0.0002, 0.0389, 0.0391],
  [0.0162, 0.0548, 0.0088],
  [0.026, 0.0599, -0.0129],
  [0.0336, 0.0642, -0.0335],
  [-0.0363, 0.0116, 0.0855],
  [-0.0213, 0.0459, 0.0366],
  [-0.0146, 0.0679, 0.0004],
  [-0.0104, 0.0741, -0.0261],
  [-0.007, 0.0802, -0.0501],
  [-0.054, 0.0158, 0.0815],
  [-0.0416, 0.0417, 0.0358],
  [-0.04, 0.0644, 0.0041],
  [-0.0378, 0.0733, -0.0208],
  [-0.0345, 0.0802, -0.0439],
  [-0.0619, 0.0136, 0.0785],
  [-0.0615, 0.0327, 0.0371],
  [-0.0661, 0.0498, 0.0119],
  [-0.0688, 0.0549, -0.0076],
  [-0.0695, 0.0614, -0.0285],
] as const;
const CLOSED_JOINTS = [
  [-0.0687, -0.0094, 0.1063],
  [-0.0321, -0.012, 0.0719],
  [-0.0176, -0.0197, 0.0439],
  [-0.0071, -0.021, 0.0118],
  [0.0003, -0.0245, -0.0114],
  [-0.038, -0.002, 0.0763],
  [-0.0069, 0.0339, 0.0421],
  [0.0033, 0.0148, 0.0109],
  [0.0022, -0.0058, -0.0018],
  [-0.0013, -0.0252, -0.0124],
  [-0.054, 0.0031, 0.074],
  [-0.0272, 0.0416, 0.0368],
  [-0.0103, 0.053, -0.001],
  [-0.0005, 0.051, -0.0267],
  [0.0082, 0.05, -0.0501],
  [-0.0673, 0.0079, 0.0721],
  [-0.0471, 0.0381, 0.0321],
  [-0.0358, 0.0613, 0.0029],
  [-0.0263, 0.068, -0.0209],
  [-0.0163, 0.073, -0.0426],
  [-0.0746, 0.0062, 0.0676],
  [-0.067, 0.0295, 0.029],
  [-0.0645, 0.0514, 0.0077],
  [-0.0619, 0.0604, -0.0104],
  [-0.0568, 0.0704, -0.0292],
] as const;
const [THUMB_TIP, INDEX_TIP, WRIST, INDEX_ROOT, PINKY_ROOT] = [4, 9, 0, 6, 21] as const;

/** A joint of the hand from its origin, in the hand's own frame, at that curl (IWER lerps each joint the same way). */
export function jointOf(hand: Hand, joint: number, curl: number, out: Vector3): Vector3 {
  const [x, y, z] = OPEN_JOINTS[joint]!;
  const [cx, cy, cz] = CLOSED_JOINTS[joint]!;
  out.set(x + (cx - x) * curl, y + (cy - y) * curl, z + (cz - z) * curl);
  if (hand === 'right') out.x = -out.x;
  return out;
}

/** The pinch point (midway between the two tips, as HandSampler has it) from the hand's origin, in its own frame. */
function pinchOf(hand: Hand, curl: number, out: Vector3): Vector3 {
  const tip = new Vector3();
  return jointOf(hand, THUMB_TIP, curl, out)
    .add(jointOf(hand, INDEX_TIP, curl, tip))
    .multiplyScalar(0.5);
}

/**
 * A hand reaching for something: thumb and index 3.8 cm apart, wider than PINCH_RELEASE_M, as a hand about to pinch
 * is. From it a close moves the pinch point 3.1 cm with the palm still, which is near the recording's 75th percentile
 * of 3.2 cm; the relaxed hand (curl 0) has its tips 9.4 cm apart.
 */
export const READY_CURL = 0.6;
const NATURAL_SHIFT_M = pinchOf('left', 1, new Vector3()).distanceTo(
  pinchOf('left', READY_CURL, new Vector3()),
);

/** The palm normal HandSampler reads off the relaxed hand at no turn: IWER's hand is not quite flat to its origin. */
function restNormal(hand: Hand): Vector3 {
  const wrist = jointOf(hand, WRIST, 0, new Vector3());
  const a = jointOf(hand, INDEX_ROOT, 0, new Vector3()).sub(wrist);
  const b = jointOf(hand, PINKY_ROOT, 0, new Vector3()).sub(wrist);
  return a
    .cross(b)
    .normalize()
    .multiplyScalar(hand === 'left' ? -1 : 1);
}

/** The turn that gives a hand this palm normal, its fingers towards `fingers`. */
function turnFor(hand: Hand, normal: Vector3, fingers: Vector3, out: Quaternion): Quaternion {
  const basis = (y: Vector3, along: Vector3): Matrix4 => {
    const z = along.clone().addScaledVector(y, -along.dot(y)).normalize();
    return new Matrix4().makeBasis(y.clone().cross(z), y, z);
  };
  const local = basis(restNormal(hand), new Vector3(0, 0, -1));
  return out.setFromRotationMatrix(basis(normal, fingers).multiply(local.transpose()));
}

export interface Heard {
  type: string;
  t: number;
  hand: Hand | null;
  kind: string | null;
  id: string | null;
  gesture: string | null;
  zone: string | null;
  cell: Cell | null;
  dy: number | null;
  step: string | null;
  /** A pinch's filtered pinch point as the app had it. */
  pos: Vector3 | null;
}

const NOTED = [
  'hands:lost',
  'hands:found',
  'gesture:palmUp',
  'gesture:pinchStart',
  'gesture:release',
  'gesture:trackingLost',
  'gesture:palmsOut',
  'gesture:wake',
  'garden:seedOut',
  'garden:seedBack',
  'garden:removed',
  'garden:changed',
  'listen:enter',
  'listen:exit',
  'onboarding:step',
  'settings:changed',
  'room:tuned',
] as const;

type DropMode = 'none' | 'burst' | 'underGrace';

/** One pretend hand: where it is asked to be, and its noise. */
interface Puppet {
  /** Where its pinch point is with the fingers at READY_CURL. */
  at: Vector3;
  normal: Vector3;
  fingers: Vector3;
  /** The palm's reading wanders in this band, tilted about the fingers; null: the normal as it stands. */
  band: readonly [number, number] | null;
  curl: number;
  /** How much of the close moves the palm rather than the pinch point: sets the close shift (0: the palm stays). */
  palmShare: number;
  move: {
    fromAt: Vector3;
    toAt: Vector3;
    fromNormal: Vector3;
    toNormal: Vector3;
    fromFingers: Vector3;
    toFingers: Vector3;
    fromCurl: number;
    toCurl: number;
    startMs: number;
    ms: number;
    done: () => void;
  } | null;
  shake: (tMs: number, out: Vector3) => void;
  seed: number;
  mode: DropMode;
  drops: Drops | null;
  tracked: boolean;
  /** The time of the next change of `tracked`, and of the last one. */
  nextMs: number;
  changedMs: number;
  /** A frame has passed since it last changed: a gap or a spell shorter than a frame is still seen. */
  settled: boolean;
  /** In the one drop of `blink`; its gaps. */
  isBlinking: boolean;
  blinks?: Drops;
}

const LEFT_OF_BED = -1;
const GRACE_SPARE_MS = 80;
/** The pinch point is filtered (FR-HND-03, 1 Hz: a time constant of 160 ms). A hand that has arrived waits this long. */
export const SETTLE_MS = 450;

export class Rig {
  /** What the app said on its bus, from the moment the rig was made. */
  readonly heard: Heard[] = [];
  /** The largest angle between where the head looks and each hand's fingers, while `watchView` is set, in degrees. */
  maxViewDeg = 0;
  watchView: Hand | null = null;
  /** A scripted line for whoever watches: the video's caption, the headset's label. */
  onBeat: ((line: string) => void) | null = null;
  private readonly puppets: Record<Hand, Puppet>;
  private readonly waiters: (() => void)[] = [];
  private readonly offs: (() => void)[] = [];
  private isRunning = false;
  private frames = 0;
  private startedMs = 0;
  private lastFrameMs = 0;
  /** The latest frame's length. */
  private frameMs = 0;
  /** Frames over 150 ms (software rendering stalls on a new shader), and the drops: for a failure's report. */
  private readonly stalls: string[] = [];

  constructor(
    seed: number,
    private readonly driver: Driver,
  ) {
    const make = (hand: Hand, offset: number): Puppet => ({
      at: new Vector3(hand === 'left' ? -0.3 : 0.3, 0.9, -0.2),
      normal: new Vector3(0, -1, 0),
      fingers: new Vector3(0, 0, -1),
      band: null,
      curl: READY_CURL,
      palmShare: 0,
      move: null,
      shake: shake(seed + offset),
      seed: seed + offset,
      mode: 'none',
      drops: null,
      tracked: true,
      nextMs: Infinity,
      changedMs: 0,
      settled: true,
      isBlinking: false,
    });
    this.puppets = { left: make('left', 1), right: make('right', 2) };
    for (const type of NOTED) {
      this.offs.push(
        bus.on(type as 'hands:lost', (payload: unknown) => {
          const e = (payload ?? {}) as {
            hand?: Hand;
            target?: { kind: string; id: string } | null;
            gesture?: string;
            zone?: string;
            cell?: Cell | null;
            dy?: number | null;
            step?: string;
            pos?: { x: number; y: number; z: number };
            plantId?: string;
            seed?: { id: string };
          };
          this.heard.push({
            type,
            t: performance.now(),
            hand: e.hand ?? null,
            kind: e.target?.kind ?? null,
            id: e.target?.id ?? e.plantId ?? e.seed?.id ?? null,
            gesture: e.gesture ?? null,
            zone: e.zone ?? null,
            cell: e.cell ? { ...e.cell } : null,
            dy: e.dy ?? null,
            step: e.step ?? null,
            pos: e.pos ? new Vector3(e.pos.x, e.pos.y, e.pos.z) : null,
          });
        }),
      );
    }
  }

  /** From the session's first frames on. */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startedMs = performance.now();
    this.tick();
  }

  /** The pretend hands stay where they are. The bus is left alone. */
  stop(): void {
    this.isRunning = false;
    for (const off of this.offs.splice(0)) off();
  }

  private tick = (): void => {
    if (!this.isRunning) return;
    this.frames++;
    this.driver.frame(this.tick);
    const now = performance.now();
    if (this.lastFrameMs > 0) this.frameMs = now - this.lastFrameMs;
    if (this.frameMs > 150)
      this.stalls.push(`${Math.round(this.frameMs)} ms at ${Math.round(now - this.startedMs)}`);
    this.lastFrameMs = now;
    this.step('left', now);
    this.step('right', now);
    for (const done of this.waiters.splice(0)) done();
  };

  private step(hand: Hand, now: number): void {
    const p = this.puppets[hand];
    const move = p.move;
    if (move !== null) {
      const k = Math.min(1, (now - move.startMs) / move.ms);
      const eased = k * k * (3 - 2 * k);
      p.at.lerpVectors(move.fromAt, move.toAt, eased);
      p.normal.lerpVectors(move.fromNormal, move.toNormal, eased).normalize();
      p.fingers.lerpVectors(move.fromFingers, move.toFingers, eased).normalize();
      p.curl = move.fromCurl + (move.toCurl - move.fromCurl) * k;
      if (k >= 1) {
        p.move = null;
        move.done();
      }
    }
    this.track(p, now);
    const normal = p.normal.clone();
    if (p.band !== null) {
      // The reading is the cosine of the tilt off the normal asked for, about the fingers' line.
      normal.applyAxisAngle(
        p.fingers,
        (hand === 'left' ? -1 : 1) * Math.acos(palmReading(p.seed, p.band, now)),
      );
    }
    const turn = turnFor(hand, normal, p.fingers, new Quaternion());
    const off = new Vector3();
    p.shake(now, off);
    const ready = pinchOf(hand, READY_CURL, new Vector3());
    const closing = pinchOf(hand, p.curl, new Vector3()).sub(ready).multiplyScalar(p.palmShare);
    const root = p.at.clone().add(off).sub(ready.add(closing).applyQuaternion(turn));
    this.driver.hand(hand, root, turn, p.curl, p.tracked);
    if (this.watchView === hand) {
      const m = this.head();
      const to = root.add(pinchOf(hand, p.curl, new Vector3()).applyQuaternion(turn));
      to.sub(new Vector3(m[12], m[13], m[14])).normalize();
      const forward = new Vector3(-m[8]!, -m[9]!, -m[10]!);
      this.maxViewDeg = Math.max(this.maxViewDeg, (Math.acos(to.dot(forward)) * 180) / Math.PI);
    }
  }

  /**
   * A closed hand holds something, and drops only by `blink`: in rec.jsonl 3 of 705 holds saw a drop under the grace
   * (8 more lost the hand for good), against the bursts of an idle hand.
   */
  private track(p: Puppet, now: number): void {
    if (!p.settled) {
      p.settled = true; // this frame shows the last change
      return;
    }
    // A change shows a frame later and is seen a frame after that, and a slow emulator frame can be 100 ms: a gap kept
    // under the grace comes back with two frames and GRACE_SPARE_MS to spare. Only an idle hand's burst may outlast it.
    const isHeld = p.curl >= 1 || p.mode === 'none';
    const mayOutlast = p.mode === 'burst' && !isHeld && !p.isBlinking;
    const isGraceNear =
      !p.tracked && !mayOutlast && now - p.changedMs + 2 * this.frameMs >= GRACE_MS - GRACE_SPARE_MS;
    if (p.isBlinking || isHeld) {
      if (p.tracked || (now < p.nextMs && !isGraceNear)) return;
      p.isBlinking = false;
      this.change(p, now, true);
      return;
    }
    if (p.drops === null || (now < p.nextMs && !isGraceNear)) return;
    this.change(p, now, !p.tracked);
  }

  private change(p: Puppet, now: number, tracked: boolean): void {
    p.tracked = tracked;
    p.settled = false;
    p.changedMs = now;
    const drops = p.drops ?? new Drops(p.seed + 30, UNDER_GRACE_GAP_MS);
    p.nextMs = now + (tracked ? drops.spellMs() : drops.gapMs());
  }

  /** One tracking drop now, under the grace: what a hold sees at most (see `track`). */
  blink(hand: Hand): void {
    const p = this.puppets[hand];
    if (!p.tracked || !p.settled) return;
    p.isBlinking = true;
    p.nextMs = performance.now() + (p.blinks ??= new Drops(p.seed + 40, UNDER_GRACE_GAP_MS)).gapMs();
    p.tracked = false;
    p.settled = false;
    p.changedMs = performance.now();
  }

  /** XR frames a second since `start`: the emulator renders in software. */
  fps(): number {
    return Math.round((1000 * this.frames) / (performance.now() - this.startedMs));
  }

  /** Resolves at the next XR frame. */
  frame(): Promise<void> {
    return new Promise((done) => this.waiters.push(done));
  }

  /** Time in the choreography, counted on XR frames: the hands keep moving meanwhile. */
  async wait(ms: number): Promise<void> {
    const end = performance.now() + ms;
    while (performance.now() < end) await this.frame();
  }

  /** Resolves when `isDone`. Past `ms` it throws `why`, with what was heard. */
  async until(isDone: () => boolean, ms: number, why: string): Promise<void> {
    const end = performance.now() + ms;
    while (!isDone()) {
      if (performance.now() > end) throw new Error(`${why}, not within ${ms} ms. ${this.summary()}`);
      await this.frame();
    }
  }

  check(isTrue: boolean, why: string): void {
    if (!isTrue) throw new Error(`${why}. ${this.summary()}`);
  }

  /** How many events of that type the app has said since `fromMs`, those `is` accepts. */
  count(type: (typeof NOTED)[number], is: (e: Heard) => boolean = () => true, fromMs = 0): number {
    return this.heard.filter((e) => e.type === type && e.t >= fromMs && is(e)).length;
  }

  /** The latest event of that type that `is` accepts. */
  last(type: (typeof NOTED)[number], is: (e: Heard) => boolean = () => true): Heard | null {
    return this.heard.filter((e) => e.type === type && is(e)).pop() ?? null;
  }

  summary(): string {
    const counts: Record<string, number> = {};
    for (const e of this.heard) counts[e.type] = (counts[e.type] ?? 0) + 1;
    const last = this.heard
      .filter((e) => e.type === 'gesture:pinchStart' || e.type === 'gesture:release')
      .slice(-4)
      .map((e) => `${e.type} ${e.hand} ${e.kind ?? 'null'}:${e.id ?? ''} ${e.gesture ?? ''}`.trim());
    const where = (['left', 'right'] as const).map((hand) => {
      const p = this.puppets[hand];
      const read = this.read(hand);
      const v = (a: { x: number; y: number; z: number }) =>
        `${a.x.toFixed(3)},${a.y.toFixed(3)},${a.z.toFixed(3)}`;
      return `${hand} asked ${v(p.at)} curl ${p.curl.toFixed(2)} read ${v(read.pinchPos)} palm ${v(read.palmNormal)}`;
    });
    const stalls = this.stalls.slice(-4).join(', ') || 'none';
    return `Heard ${JSON.stringify(counts)}; last pinches: ${last.join(' | ') || 'none'}; ${where.join('; ')}; frames over 150 ms: ${stalls}`;
  }

  beat(line: string): void {
    this.onBeat?.(line);
  }

  // ---- Reading the app -----------------------------------------------------------------------------------------

  private get world() {
    return window.__roomsong!.world;
  }

  private get hands(): { candidates: HandSystem['candidates']; slots: { frame: HandFrame }[] } {
    return this.world.getSystem(HandSystem) as unknown as {
      candidates: HandSystem['candidates'];
      slots: { frame: HandFrame }[];
    };
  }

  /** What the app reads for a hand: filtered pinch point, palm rest point and palm normal. */
  read(hand: Hand): HandFrame {
    return this.hands.slots[hand === 'left' ? 0 : 1]!.frame;
  }

  /** The head's world matrix. */
  head(): number[] {
    return this.world.player.head.matrixWorld.elements;
  }

  eye(): Vector3 {
    const m = this.head();
    return new Vector3(m[12], m[13], m[14]);
  }

  /** Each target the hands can pick now, by kind. */
  targets(kind: string): { id: string; at: Vector3 }[] {
    return this.hands.candidates
      .filter((c) => c.target.kind === kind)
      .map((c) => ({ id: c.target.id, at: new Vector3(c.pos.x, c.pos.y, c.pos.z) }));
  }

  target(kind: string, id?: string): Vector3 | null {
    return this.targets(kind).find((t) => id === undefined || t.id === id)?.at ?? null;
  }

  /** Where a plant's head is drawn, which is what a player pinches: on its stem (render's stemFor) over its cell. */
  plantHead(id: string): Vector3 | null {
    const plant = this.plants().find((p) => p.id === id);
    return plant === undefined ? null : this.cell(plant.cell, stemFor(plant.height));
  }

  plants(): { id: string; cell: Cell; height: number }[] {
    return window.__roomsong!.garden.state!.plants.map((p) => ({
      id: p.id,
      cell: { ...p.cell },
      height: p.height,
    }));
  }

  // ---- Placing by the bed and the head --------------------------------------------------------------------------

  private get bed() {
    return this.world.getSystem(RoomSystem)!.bed.object3D!;
  }

  /** A point of the bed's own frame: x across, up, z towards the player. */
  fromBed(x: number, up: number, z: number): Vector3 {
    return this.bed.localToWorld(new Vector3(x, up, z));
  }

  /** A cell's centre on the bed, raised by `up`. */
  cell(cell: Cell, up = 0): Vector3 {
    const c = cellCentre(cell, { x: 0, y: 0 });
    return this.fromBed(c.x, up, c.y);
  }

  /** The way ahead of the player, level. */
  ahead(): Vector3 {
    const towards = this.fromBed(0, 0, 0).sub(this.fromBed(0, 0, 1));
    towards.y = 0;
    return towards.normalize();
  }

  /** On the line from the eyes to `target`: `short` metres before it, and `off` metres beside the line. */
  sight(target: Vector3, short: number, off = 0): Vector3 {
    const eye = this.eye();
    const along = target.clone().sub(eye).normalize();
    const side = along
      .clone()
      .cross(new Vector3(0, 1, 0))
      .normalize();
    return target.clone().addScaledVector(along, -short).addScaledVector(side, off);
  }

  /** On the line from the eyes to `target`, `fromHead` metres from the eyes. */
  sightFromHead(target: Vector3, fromHead: number): Vector3 {
    const eye = this.eye();
    return eye.clone().addScaledVector(target.clone().sub(eye).normalize(), fromHead);
  }

  /** Emulator: the head seated, as the recordings have it, 40 cm over the bed and 42 cm back, looking at the bed. */
  seat(): void {
    this.driver.head(this.fromBed(0, 0.4, 0.42), new Quaternion());
    this.lookAt(this.fromBed(0, 0, 0), this.fromBed(0, 0.4, 0.42));
  }

  lookAt(point: Vector3, from: Vector3 = this.eye()): void {
    const turn = new Quaternion().setFromRotationMatrix(
      new Matrix4().lookAt(from, point, new Vector3(0, 1, 0)),
    );
    this.driver.head(from, turn);
  }

  // ---- Moving the hands -----------------------------------------------------------------------------------------

  /** Tracking of a hand from now on: steady, in bursts, or in bursts with every gap under the grace. */
  dropMode(hand: Hand, mode: DropMode): void {
    const p = this.puppets[hand];
    if (mode === p.mode) return;
    p.mode = mode;
    if (mode === 'none') {
      p.drops = null; // a hand out of sight comes back at its next change
      return;
    }
    p.drops = new Drops(
      p.seed + (mode === 'burst' ? 10 : 20),
      mode === 'burst' ? Infinity : UNDER_GRACE_GAP_MS,
    );
    p.nextMs = performance.now() + p.drops.spellMs();
    p.settled = true;
  }

  /** Glides a hand. Fingers and palm move with it, if given. Resolves when it has arrived. */
  go(
    hand: Hand,
    to: Vector3 | null,
    ms: number,
    turn: { normal?: Vector3; fingers?: Vector3; curl?: number } = {},
  ): Promise<void> {
    const p = this.puppets[hand];
    p.move?.done();
    return new Promise((done) => {
      p.move = {
        fromAt: p.at.clone(),
        toAt: to?.clone() ?? p.at.clone(),
        fromNormal: p.normal.clone(),
        toNormal: turn.normal?.clone().normalize() ?? p.normal.clone(),
        fromFingers: p.fingers.clone(),
        toFingers: turn.fingers?.clone().normalize() ?? p.fingers.clone(),
        fromCurl: p.curl,
        toCurl: turn.curl ?? p.curl,
        startMs: performance.now(),
        ms,
        done,
      };
    });
  }

  /** Puts a hand there at once, for the start of a scene. */
  place(hand: Hand, to: Vector3, normal: Vector3, fingers: Vector3): void {
    const p = this.puppets[hand];
    p.at.copy(to);
    p.normal.copy(normal).normalize();
    p.fingers.copy(fingers).normalize();
  }

  /** The palm's reading wanders inside this band from now on, the hand relaxed (null: it stops, the hand ready). */
  palm(hand: Hand, band: readonly [number, number] | null): void {
    const p = this.puppets[hand];
    p.band = band;
    if (p.curl < 1) p.curl = band === null ? READY_CURL : 0; // a closed hand stays closed
    p.palmShare = 0;
  }

  /** A resting hand: beside the bed, palm down. */
  rest(hand: Hand, ms = 0): Promise<void> {
    const to = this.fromBed((hand === 'left' ? LEFT_OF_BED : -LEFT_OF_BED) * 0.33, 0.1, 0.2);
    const normal = new Vector3(0, -1, 0);
    this.palm(hand, null);
    if (ms === 0) {
      this.place(hand, to, normal, this.ahead());
      return Promise.resolve();
    }
    return this.go(hand, to, ms, { normal, fingers: this.ahead() });
  }

  /**
   * Closes the fingers over CLOSE_MS: the joints' pinch reads as they meet, and the platform's select comes once they
   * have. The pinch point moves as much as rec.jsonl measured at this percentile, the way IWER's fingers close; what
   * the fingers' own 3.1 cm is short of or past that, the palm moves. A relaxed hand (a palm up) closes from curl 0
   * with its palm still.
   */
  async close(hand: Hand, percentile = 0.5): Promise<void> {
    const p = this.puppets[hand];
    p.palmShare = p.curl < READY_CURL ? 0 : 1 - closeShiftM(percentile) / NATURAL_SHIFT_M;
    await this.go(hand, null, CLOSE_MS, { curl: 1 });
    this.driver.select(hand, true);
    for (let i = 0; i < 3; i++) await this.frame();
  }

  /** Opens the fingers to the ready curl; the platform ends its select as they part. */
  async open(hand: Hand): Promise<void> {
    this.driver.select(hand, false);
    await this.go(hand, null, CLOSE_MS, { curl: READY_CURL });
  }

  /** Closes and at once opens, past the app's lockout: a tap. */
  async tap(hand: Hand, percentile = 0.5): Promise<void> {
    await this.close(hand, percentile);
    await this.wait(150);
    await this.open(hand);
    await this.wait(200);
  }
}
