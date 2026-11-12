// Gaze dwell (FR-HND-12, US-16; UX §8, §9.2, §9.8): with `Settings.gazeDwell` on, in a session, the head's forward
// line selects by resting on a target for `Settings.dwellMs`, with no pinch anywhere. What it selects:
//   - while placing, the level-3 ghost while it is on a usable spot: RoomSystem.confirm() (a dwell never floats it);
//   - the Listen orb: Listen starts (a `press` release); in Listen it wakes (`gesture:wake`);
//   - an undo petal: undone (a `press` release);
//   - a free cell of the bed: the next seed is planted there (`gesture:palmUp`, then a `carry` release).
// It never selects kind `panel` (the panel dwells itself, API_SPEC §1.6), but a panel control blocks the gaze: what
// lies behind the panel is not selected through it (UX §9.8: one look selects once). It skips `seed` (the gaze has
// no pick-up, UX §9.1) and `plant` (no gaze action: pull by sliders is C2; a look at one gives the nearest free
// cell). In Listen the orb's wake needs twice the dwell (D-054).
// Every select goes through the gesture events of API_SPEC §1.4, as the hand's would; it emits no pinchStart.
// One select per look: what is under the gaze right after a select counts as selected until the gaze leaves it.
import { createSystem, Types, Vector3, type Entity } from '@iwsdk/core';

import { BedAnchor, Interactable } from '../core/components.js';
import { bus, settings, type EventMap, type Hand, type Mat4, type Vec2 } from '../core/index.js';
import { bedZone, nearestFreeCell, type Cell, type GardenState } from '../garden/index.js';
import { HandState, stickyCell, toBedLocal, type TargetRef } from '../hands/index.js';
import { gazeTarget, isHeadTurning, PANEL_MAX_FRAME_MS } from '../ui/index.js';

import { LISTEN_WAKE_DWELL_FACTOR, RETICLE_IDLE_DISTANCE_M } from './config.js';
import { Reticle } from './Reticle.js';

import type { FlashGuard } from '../render/index.js';
import type { BedPlacement } from '../room/index.js';

/** One dwell (UX §8): the time on one target, held while the head turns, and selected once. Creates nothing. */
export class Dwell {
  /** How far the dwell has come, 0..1: the reticle's ring. A level, never a blink (FR-UI-11). */
  readonly fill = new Float64Array(1);
  private readonly ms = new Float64Array(1);
  private isDone = false;
  private wasSelected = false;

  /**
   * One frame of `dtMs`. `isSame`: the gaze is on the target it was on in the last frame; `hasTarget`: it is on
   * one. `isTurning` (faster than 8 deg/s, UX §9.8) holds the time: it neither grows nor resets. Leaving resets
   * it. True on the frame that selects.
   */
  frame(dtMs: number, isSame: boolean, hasTarget: boolean, isTurning: boolean, dwellMs: number): boolean {
    const afterSelection = this.wasSelected;
    this.wasSelected = false;
    const ms = this.ms;
    if (!isSame) {
      ms[0] = 0;
      this.isDone = afterSelection; // what comes under the gaze right after a select did not ask for one
    }
    if (!isSame || !hasTarget || this.isDone) {
      this.fill[0] = 0;
      return false;
    }
    if (!isTurning && dtMs > 0) ms[0] = (ms[0] as number) + Math.min(dtMs, PANEL_MAX_FRAME_MS);
    if ((ms[0] as number) < dwellMs) {
      this.fill[0] = (ms[0] as number) / dwellMs;
      return false;
    }
    this.isDone = this.wasSelected = true;
    this.fill[0] = 0;
    return true;
  }
}

/** What GazeDwellSystem needs of RoomSystem (API_SPEC §1.10): the bed entity, the level-3 preview, the confirm. */
export interface GazeRoom {
  readonly bed: Entity;
  readonly solver: { preview(): Readonly<BedPlacement> | null };
  confirm(): void;
}

type Kind = 'none' | 'ghost' | 'cell' | 'orb' | 'undo';
/** The settings orb is a panel target too (API_SPEC §1.9), but small and off to the side: it blocks only when hit. */
const PANEL_ORB_ID = 'orb';
const WAKE: EventMap['gesture:wake'] = Object.freeze({ type: 'gesture:wake' });

/**
 * Priority 25 (LLD §3.2). configData: `room` (a GazeRoom: RoomSystem) and `guard` (the page's FlashGuard, for the
 * reticle). The gaze's events name `Settings.dominantHand`. A hand that is pinching or selecting stops the dwell.
 */
export class GazeDwellSystem extends createSystem(
  { targets: { required: [Interactable] }, hands: { required: [HandState] } },
  { room: { type: Types.Object, default: null }, guard: { type: Types.Object, default: null } },
) {
  readonly dwell = new Dwell();
  /** The gaze's target this frame: its kind, and the id of an orb or petal or the free cell (garden's own object). */
  kind: Kind = 'none';
  cell: Cell | null = null;
  private id = '';
  private room!: GazeRoom;
  private reticle!: Reticle;
  // The orb, undo and panel targets: their entities and kinds, and centres (x, y, z) for gazeTarget. `blockers`:
  // the centres of the panel's controls (not its orb), which cover the panel with no gap (5.5 cm pitch, 4 cm reach).
  private readonly entities: Entity[] = [];
  private readonly kinds: string[] = [];
  private blockers = new Float32Array(3 * 8);
  private blockerCount = 0;
  private readonly handStates: Entity[] = [];
  private centres = new Float32Array(3 * 8);
  private kept = -1;
  private keptCell: Cell | null = null;
  private garden: GardenState | null = null;
  private outSeedId: string | null = null;
  private isListening = false;
  private lastMs = -1;
  private readonly headTurn = new Float64Array(4);
  private readonly distance = new Float64Array(1);
  private readonly hit = new Vector3();
  private readonly local: Vec2 = { x: 0, y: 0 };
  private readonly ref: TargetRef = { kind: 'orb', id: '' };
  private readonly hover: EventMap['target:hover'] = { hand: 'right', target: null, cell: null };
  private readonly palmUp: EventMap['gesture:palmUp'] = { type: 'gesture:palmUp', hand: 'right' };
  private readonly release: EventMap['gesture:release'] = {
    type: 'gesture:release',
    hand: 'right',
    gesture: 'press',
    target: null,
    pos: new Vector3(),
    zone: 'inner',
    cell: null,
    dy: null,
  };

  override init(): void {
    this.room = this.config.room.value as GazeRoom;
    this.reticle = new Reticle(this.scene, this.config.guard.value as FlashGuard);
    const { targets, hands } = this.queries;
    // Arrays, not the queries' Sets: iterating a Set every frame can cost an iterator object.
    this.cleanupFuncs.push(
      hands.subscribe('qualify', (entity) => void this.handStates.push(entity), true),
      hands.subscribe('disqualify', (entity) => {
        const i = this.handStates.indexOf(entity);
        if (i >= 0) this.handStates.splice(i, 1);
      }),
      // kind and id are given to addComponent and never set later (API_SPEC §1.10 rule 7)
      targets.subscribe('qualify', (entity) => this.addTarget(entity), true),
      targets.subscribe('disqualify', (entity) => {
        const i = this.entities.indexOf(entity);
        if (i >= 0) {
          this.entities.splice(i, 1);
          this.kinds.splice(i, 1);
        }
        this.kept = -1;
      }),
      bus.on('garden:changed', ({ state, diff }) => {
        this.garden = state;
        if (this.outSeedId !== null && diff.added.includes(this.outSeedId)) this.outSeedId = null;
      }),
      bus.on('garden:seedOut', ({ seed }) => void (this.outSeedId = seed.id)),
      bus.on('garden:seedBack', ({ seedId }) => {
        if (seedId === this.outSeedId) this.outSeedId = null;
      }),
      bus.on('listen:enter', () => void (this.isListening = true)),
      bus.on('listen:exit', () => void (this.isListening = false)),
      () => this.reticle.dispose(),
    );
  }

  /** `time`: IWSDK's frame time in seconds, taken in whole ms (a fraction handed on is boxed). */
  override update(_delta: number, time: number): void {
    const nowMs = Math.round(time * 1000);
    const dtMs = this.lastMs < 0 ? 0 : nowMs - this.lastMs;
    this.lastMs = nowMs;
    const s = settings.get();
    const head = (this.xrManager.isPresenting ? this.player.head : this.camera).matrixWorld.elements;
    // In a session only: the garden window's camera never moves, so its gaze would rest on the bed for ever.
    const isOn = s.gazeDwell && this.xrManager.isPresenting;
    this.distance[0] = RETICLE_IDLE_DISTANCE_M;
    const wasKind = this.kind;
    const wasId = this.id;
    const wasCell = this.cell;
    this.id = '';
    this.cell = null;
    this.kind = isOn && !this.isHandBusy() ? this.aim(head) : 'none';
    const isSame = this.kind === wasKind && this.id === wasId && this.cell === wasCell;
    if (!isSame) this.setHover(s.dominantHand);
    const isTurning = isHeadTurning(head, dtMs, this.headTurn);
    const isWake = this.kind === 'orb' && this.isListening;
    const dwellMs = isWake ? LISTEN_WAKE_DWELL_FACTOR * s.dwellMs : s.dwellMs; // D-054
    if (this.dwell.frame(dtMs, isSame, this.kind !== 'none', isTurning, dwellMs)) this.select(s.dominantHand);
    this.reticle.setOutlined(s.highContrast);
    this.reticle.update(head, isOn, this.distance, this.dwell.fill, nowMs);
  }

  /** What the gaze is on: writes `id`, `cell` and the dot's distance. */
  private aim(head: Mat4): Kind {
    const count = this.fillCentres();
    const i = gazeTarget(head, this.centres, count, this.kept);
    this.kept = i;
    const c = this.centres;
    if (i >= 0) ahead(head, c[3 * i]!, c[3 * i + 1]!, c[3 * i + 2]!, this.distance);
    const kind = i < 0 ? undefined : this.kinds[i];
    // UX §9.8: the panel's own dwell has it, the dot on it; nothing behind the panel is selected through it.
    if (kind === 'panel') return 'none';
    const blocker = gazeTarget(head, this.blockers, this.blockerCount, -1);
    if (blocker >= 0) {
      const b = this.blockers;
      ahead(head, b[3 * blocker]!, b[3 * blocker + 1]!, b[3 * blocker + 2]!, this.distance);
      return 'none';
    }
    const bed = this.room.bed;
    if (!bed.hasComponent(BedAnchor)) {
      const preview = this.room.solver.preview();
      if (preview === null || preview.level !== 3) return 'none';
      ahead(head, preview.pose[12]!, preview.pose[13]!, preview.pose[14]!, this.distance);
      return 'ghost';
    }
    if (kind === 'orb' || (kind === 'undo' && !this.isListening)) {
      this.id = this.entities[i]!.getValue(Interactable, 'id') ?? '';
      return kind;
    }
    this.distance[0] = RETICLE_IDLE_DISTANCE_M;
    // A free cell, while a seed can be given (PRD §3.4: in Listen nothing but the wake is taken).
    if (this.isListening || this.garden === null || bed.object3D === undefined) return 'none';
    if (this.outSeedId === null && this.garden.seeds.length === 0) return 'none';
    this.cell = this.cellAt(head, bed.object3D.matrixWorld.elements);
    return this.cell === null ? 'none' : 'cell';
  }

  /** The free cell a seed would be planted in from where the gaze meets the bed's plane; null off the bed or full. */
  private cellAt(head: Mat4, bedPose: Mat4): Cell | null {
    const fx = -head[8]!;
    const fy = -head[9]!;
    const fz = -head[10]!;
    const towardUp = fx * bedPose[4]! + fy * bedPose[5]! + fz * bedPose[6]!;
    const t =
      ((bedPose[12]! - head[12]!) * bedPose[4]! +
        (bedPose[13]! - head[13]!) * bedPose[5]! +
        (bedPose[14]! - head[14]!) * bedPose[6]!) /
      towardUp;
    if (!(towardUp < 0) || !(t > 0)) return null; // looking up from the bed, along it, or away
    this.hit.set(head[12]! + fx * t, head[13]! + fy * t, head[14]! + fz * t);
    this.keptCell = stickyCell(toBedLocal(bedPose, this.hit, this.local), this.keptCell);
    if (this.keptCell === null || this.garden === null) return null;
    this.distance[0] = t;
    return nearestFreeCell(this.garden, this.keptCell);
  }

  private select(hand: Hand): void {
    if (this.kind === 'ghost') return this.room.confirm();
    if (this.kind === 'orb' && this.isListening) return void bus.emit('gesture:wake', WAKE);
    const e = this.release;
    e.hand = hand;
    if (this.kind === 'cell') {
      if (this.outSeedId === null) {
        this.palmUp.hand = hand;
        bus.emit('gesture:palmUp', this.palmUp); // the garden gives the next seed, if it can (garden:seedOut)
      }
      if (this.outSeedId === null) return;
      this.ref.kind = 'seed';
      this.ref.id = this.outSeedId;
      e.gesture = 'carry';
      e.cell = this.cell;
    } else {
      this.ref.kind = this.kind as TargetRef['kind'];
      this.ref.id = this.id;
      e.gesture = 'press';
      e.cell = null;
      this.hit.fromArray(this.centres, 3 * this.kept); // the pressed target's centre
    }
    e.target = this.ref;
    (e.pos as Vector3).copy(this.hit);
    const bedPose = this.room.bed.object3D?.matrixWorld.elements;
    e.zone = bedPose === undefined ? 'inner' : bedZone(toBedLocal(bedPose, this.hit, this.local));
    bus.emit('gesture:release', e);
  }

  /** `target:hover` for the gaze's hand on a change (FR-HND-16): the orb or petal lit, or the cell a seed would fill. */
  private setHover(hand: Hand): void {
    const e = this.hover;
    const target = this.kind === 'orb' || this.kind === 'undo' ? this.ref : null;
    const cell = this.cell;
    if (e.target === null && e.cell === null && target === null && cell === null) return;
    if (target !== null) {
      this.ref.kind = this.kind as TargetRef['kind'];
      this.ref.id = this.id;
    }
    e.hand = hand;
    e.target = target;
    e.cell = cell;
    bus.emit('target:hover', e);
  }

  /** A hand pinching (the hold signal) or selecting (the tap signal, which a seed is carried on) stops the dwell. */
  private isHandBusy(): boolean {
    for (let i = 0; i < this.handStates.length; i++) {
      const hand = this.handStates[i]!;
      if (hand.getValue(HandState, 'pinch') === true || hand.getValue(HandState, 'select') === true)
        return true;
    }
    return false;
  }

  private addTarget(entity: Entity): void {
    const kind = entity.getValue(Interactable, 'kind');
    if (kind !== 'orb' && kind !== 'undo' && kind !== 'panel') return;
    this.entities.push(entity);
    this.kinds.push(kind);
    if (this.centres.length < 3 * this.entities.length) {
      this.centres = new Float32Array(6 * this.entities.length);
      this.blockers = new Float32Array(6 * this.entities.length);
    }
    this.kept = -1;
  }

  /** Writes the centres of every target and of the panel's controls; returns how many targets there are. */
  private fillCentres(): number {
    let blockers = 0;
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i]!;
      const at = entity.getVectorView(Interactable, 'worldPos');
      this.centres[3 * i] = at[0]!;
      this.centres[3 * i + 1] = at[1]!;
      this.centres[3 * i + 2] = at[2]!;
      if (this.kinds[i] !== 'panel' || entity.getValue(Interactable, 'id') === PANEL_ORB_ID) continue;
      this.blockers[3 * blockers] = at[0]!;
      this.blockers[3 * blockers + 1] = at[1]!;
      this.blockers[3 * blockers + 2] = at[2]!;
      blockers++;
    }
    this.blockerCount = blockers;
    return this.entities.length;
  }
}

/** How far ahead of the head a point is, along its forward line, into `out[0]` (a fraction returned is boxed). */
function ahead(head: Mat4, x: number, y: number, z: number, out: Float64Array): void {
  out[0] = -((x - head[12]!) * head[8]! + (y - head[13]!) * head[9]! + (z - head[14]!) * head[10]!);
}
