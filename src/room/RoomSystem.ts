/// <reference types="webxr" />
// The per-frame wiring of room/ (LLD §3.2, API_SPEC §1.10): in each session the bed is placed, or comes back
// from its anchor, and the room is read once. Every XR frame goes to the three adapters and the anchor store.
// A promise's continuation only keeps its result here: the work is done by the next `update`, inside a frame
// and under the wiring's circuit breaker (rule 4, rule 12). The one file of room/ that imports the SDK.
// Not seen on a headset: which planes a real room gives, and whether an anchor comes back, are T-129's.
import { createSystem, Matrix4, Quaternion, Vector3, type Entity, type Object3D } from '@iwsdk/core';

import { BedAnchor, Caption } from '../core/components.js';
import { bus, clock, log, settings } from '../core/index.js';

import { AnchorStore } from './AnchorStore.js';
import {
  ANCHOR_RESTORE_TIMEOUT_MS,
  BED_CENTRE_MAX_M,
  EPSILON_M,
  FLOATING_DROP_M,
  GHOST_EASE_MS,
  HIT_TEST_TIMEOUT_MS,
  PLANE_LEVELS_TIMEOUT_MS,
  RESTORE_REACH_SLACK_M,
  SURFACE_MIN_HEIGHT_M,
} from './config.js';
import { HitTestAdapter } from './HitTestAdapter.js';
import { MeshAdapter } from './MeshAdapter.js';
import { PlacementSolver } from './PlacementSolver.js';
import { PlaneAdapter } from './PlaneAdapter.js';
import { RoomFeatureExtractor } from './RoomFeatures.js';

import type { BedPlacement } from './types.js';
import type { EventMap, Mat4, StringKey } from '../core/index.js';
import type { GardenState, PlacementLevel } from '../garden/index.js';

/**
 * idle: no session. starting, replacing: a placement was asked for (by `xr:sessionStart`, by `replace()`) and
 * waits for its first frame. restoring: the saved anchor was asked for. solving: the chain runs. placed.
 * "Placing" in the specs is the four in the middle.
 */
type Stage = 'idle' | 'starting' | 'replacing' | 'restoring' | 'solving' | 'placed';

/** `BedAnchor.source` by placement level (LLD §3.2). */
const SOURCES: Record<PlacementLevel, string> = { 1: 'table', 2: 'surface', 3: 'hittest', 4: 'floating' };

// Scratch for a pose taken apart; a rigid pose has no scale to keep.
const MATRIX = new Matrix4();
const POSITION = new Vector3();
const TURN = new Quaternion();
const SCALE = new Vector3();

/**
 * D-041: how far, measured level, the bed centre of `pose` is from the head, and Infinity when the bed is not in
 * front of the user or not near a height the solver itself would place one (FR-ROOM-01, D-034: at least 0.5 m
 * above the floor and 0.25 m below the eyes). NaN for a head pose that cannot be used: not finite, or lying on
 * its side. Forward is the level direction square to the head's right vector, as the solver has it, so pitch
 * does not turn it.
 */
function reachM(pose: Mat4, head: Mat4): number {
  const dx = pose[12]! - head[12]!;
  const dz = pose[14]! - head[14]!;
  const rightX = head[0]!;
  const rightZ = head[2]!;
  const ahead = dx * rightZ - dz * rightX;
  if (!Number.isFinite(ahead) || Math.abs(rightX) + Math.abs(rightZ) < EPSILON_M) return Number.NaN;
  const y = pose[13]!;
  // D-041's slack on the heights too: eyes a little lower than on the day it was placed do not move a floating bed.
  const isAtHeight =
    y >= SURFACE_MIN_HEIGHT_M - RESTORE_REACH_SLACK_M &&
    y <= head[13]! - FLOATING_DROP_M + RESTORE_REACH_SLACK_M;
  return ahead > 0 && isAtHeight ? Math.sqrt(dx * dx + dz * dz) : Infinity;
}

export class RoomSystem extends createSystem() {
  readonly planes = new PlaneAdapter();
  readonly meshes = new MeshAdapter();
  readonly hits = new HitTestAdapter();
  readonly anchors = new AnchorStore();
  readonly solver = new PlacementSolver(this.planes, this.hits);
  readonly extractor = new RoomFeatureExtractor(this.planes, this.meshes);
  /**
   * The bed: one entity for the life of the page (API_SPEC §1.10 rule 5). Everything drawn on the bed is a child
   * of its `object3D`. It carries BedAnchor exactly while a bed is placed. `persistent`: without it IWSDK parents
   * an entity to the active level.
   */
  readonly bed: Entity = this.world.createTransformEntity(undefined, { persistent: true });
  private readonly bedObject = this.bed.object3D as Object3D;
  /** Carries the level-3 hint while it is up. Its own entity: a Caption added to one that has one is not seen. */
  private readonly hint = this.createEntity();

  private stage: Stage = 'idle';
  /** Counts the placements begun and ended: the continuation of an earlier one finds another number and keeps nothing. */
  private turn = 0;
  /** Placing: the frame time of its first frame, for the wait of a restored bed; Infinity until that frame. */
  private waitFromMs = Infinity;
  // What a promise's continuation kept for the next `update`.
  /** The store's answer to `restore`; undefined when none waits. */
  private answer: Mat4 | null | undefined;
  /** The bed to place: the chain's, or the one that came back in reach. */
  private placement: BedPlacement | null = null;
  /** The handle `create` gave. */
  private madeHandle: string | null = null;
  // Placed.
  private placed: BedPlacement | null = null;
  private isRestored = false;
  /** The placed step is still to do, or threw before its events. */
  private isLanding = false;
  /** The level-3 ghost is on screen. */
  private isGhost = false;
  /** Each hand's pinch began while this ghost was on screen (left, right): only its release confirms. */
  private readonly isAimed = [false, false];
  // From the latest `garden:changed` (API_SPEC §1.3 step 1): the saved pair, and where the bed rides.
  private savedHandle: string | null = null;
  private savedLevel: PlacementLevel = 4;
  private heightOffsetM = 0;
  /** The reference space whose `reset` (a recentre) is listened to. */
  private space: XRReferenceSpace | null = null;
  private readonly onReset = (): void => this.readAnchorAgain();

  override init(): void {
    this.bedObject.visible = false;
    this.cleanupFuncs.push(
      bus.on('xr:sessionStart', () => this.clear('starting')),
      // The solver's pending promise never settles, so no bed arrives late (LLD §3.2).
      bus.on('xr:sessionEnd', () => this.clear('idle')),
      bus.on('xr:visibility', ({ visible }) => {
        if (visible) this.resume();
      }),
      // The confirm by hand (UX §9.2): a pinch on nothing, begun while the ghost was up, let go. One begun earlier
      // (during the plane wait) was not aimed. A cancelled press has `target: null` too, but its gesture is
      // `press`. The solver ignores a confirm outside level 3.
      bus.on('gesture:pinchStart', ({ hand }) => {
        this.isAimed[hand === 'left' ? 0 : 1] = this.isGhost;
      }),
      bus.on('gesture:release', ({ hand, gesture, target }) => {
        const i = hand === 'left' ? 0 : 1;
        const isAimed = this.isAimed[i];
        this.isAimed[i] = false;
        if (isAimed && gesture === 'none' && target === null) this.solver.confirm();
      }),
      bus.on('garden:changed', ({ state }) => this.followGarden(state)),
    );
  }

  /** FR-ROOM-05: places the bed again by the chain; the garden is kept. Nothing outside a session. */
  replace(): void {
    if (this.stage === 'idle') return;
    void this.anchors.clear();
    this.clear('replacing');
  }

  /**
   * The level-3 confirm from a gaze dwell (T-160). It acts only while the preview is on a usable spot: a dwell
   * never floats the bed (UX §9.2).
   */
  confirm(): void {
    if (this.solver.preview()?.level === 3) this.solver.confirm();
  }

  /** `time`: IWSDK's frame time in seconds, which never goes back. */
  override update(delta: number, time: number): void {
    // IWSDK types the frame as always there; outside XR the renderer has none (the garden window).
    const frame = this.xrFrame as XRFrame | null;
    const space = this.xrManager.getReferenceSpace();
    if (frame !== null && space !== null) {
      this.planes.setFrame(frame, space);
      this.meshes.setFrame(frame, space);
      this.hits.setFrame(frame, space);
      this.anchors.setFrame(frame, space);
      if (space !== this.space) {
        this.space = space;
        space.addEventListener('reset', this.onReset);
      }
    }
    if (this.stage === 'idle') return;
    // Whole milliseconds: a fraction handed on as an argument can cost an object a frame (HandSystem does the same).
    if (this.stage !== 'placed') this.place(delta, Math.round(time * 1000));
    // Not `else`: the frame that finds a bed to place does the placed step too.
    if (this.stage === 'placed') this.keep();
  }

  /** Nothing of one placement reaches the next: the run, what a continuation kept, the bed and its BedAnchor. */
  private clear(stage: Stage): void {
    this.turn++;
    this.stage = stage;
    this.solver.cancel();
    this.answer = undefined;
    this.placement = this.placed = null;
    this.madeHandle = null;
    this.isLanding = false;
    this.waitFromMs = Infinity;
    this.hide();
    if (this.bed.hasComponent(BedAnchor)) this.bed.removeComponent(BedAnchor);
  }

  /** No bed on screen, and no hint. */
  private hide(): void {
    this.bedObject.visible = false;
    this.takeHint();
  }

  private takeHint(): void {
    this.isGhost = false;
    this.isAimed[0] = this.isAimed[1] = false;
    // CaptionSystem takes a caption down itself once it was shown to its end.
    if (this.hint.hasComponent(Caption)) this.hint.removeComponent(Caption);
  }

  /** The saved pair and the height offset. It also runs inside this system's own emits: the garden answers them. */
  private followGarden(state: GardenState): void {
    // API_SPEC §4: a handle with no level is no pair, and the bed is then re-placed.
    this.savedHandle = state.anchorLevel === undefined ? null : (state.anchorHandle ?? null);
    this.savedLevel = state.anchorLevel ?? 4;
    // A visit or a plant comes with the same offset: only a changed one moves the bed.
    const byM = state.bedHeightOffset - this.heightOffsetM;
    if (byM === 0) return;
    this.heightOffsetM = state.bedHeightOffset;
    if (!this.bed.hasComponent(BedAnchor)) return; // no bed placed: the next one, and the ghost, take it
    this.bedObject.position.y += byM;
    this.bedObject.updateMatrixWorld(true);
    this.bed.setValue(BedAnchor, 'heightOffset', state.bedHeightOffset);
  }

  /** The session is seen again. The frame time ran on while it was hidden, so a wait would be over at once. */
  private resume(): void {
    this.readAnchorAgain();
    if (this.stage === 'idle' || this.stage === 'placed') return;
    this.waitFromMs = Infinity;
    // A restore on its way needs nothing: the store pauses its own time-out. A bed already kept is placed.
    if (this.stage === 'solving' && this.placement === null) this.runChain();
  }

  /**
   * Placed, after a pause or a recentre: the store reads the anchor's pose again, with no call to the device,
   * and the next `update` moves the bed there (LLD §5.5).
   */
  private readAnchorAgain(): void {
    if (this.stage === 'placed' && this.savedHandle !== null) this.restore(this.savedHandle);
  }

  private restore(handle: string): void {
    const turn = this.turn;
    void this.anchors.restore(handle, ANCHOR_RESTORE_TIMEOUT_MS).then((pose) => {
      if (turn === this.turn) this.answer = pose;
    });
  }

  /** The chain, from its first level. A second run drops the first, whose promise never settles. */
  private runChain(): void {
    const turn = this.turn;
    this.stage = 'solving';
    this.hide(); // begun again after a pause, it shows nothing until it is at level 3 again
    void this.solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS }).then((placement) => {
      if (turn === this.turn) this.placement = placement;
    });
  }

  /** One frame of placing (LLD §3.2). */
  private place(delta: number, nowMs: number): void {
    const head = (this.xrManager.isPresenting ? this.player.head : this.camera).matrixWorld.elements;
    if (this.waitFromMs === Infinity) this.waitFromMs = nowMs;
    // The decision of the first frame: here and not in the `xr:sessionStart` handler, because the store cannot
    // answer before it has seen a frame. It is asked even when it is not supported: it answers null at once,
    // and then knows which anchor to delete (API_SPEC §1.3).
    if (this.stage === 'starting' && this.savedHandle !== null) {
      this.stage = 'restoring';
      this.restore(this.savedHandle);
    } else if (this.stage === 'starting' || this.stage === 'replacing') {
      this.runChain();
    }
    if (this.stage === 'restoring' && this.placement === null) this.judge(head);
    if (this.placement !== null) return this.land(nowMs);
    if (this.stage !== 'solving') return;
    this.solver.update(head, nowMs);
    this.showGhost(delta);
  }

  /** Restoring: the store's answer. A bed in reach comes back where it was; anything else is the chain's (D-041). */
  private judge(head: Mat4): void {
    const pose = this.answer;
    if (pose === undefined) return;
    const distM = pose === null ? Infinity : reachM(pose, head);
    // choice: D-041 does not say what a head pose that cannot be used means. The answer waits for a usable one,
    // as the chain does: running the chain here would have the saved anchor deleted for one bad frame.
    if (Number.isNaN(distM)) return;
    this.answer = undefined;
    if (pose !== null && distM <= BED_CENTRE_MAX_M + RESTORE_REACH_SLACK_M) {
      this.placement = { pose, level: this.savedLevel };
    } else {
      this.runChain();
    }
  }

  /** A bed is kept for this frame: the placed step begins, unless a restored bed still waits for planes. */
  private land(nowMs: number): void {
    const isRestored = this.stage === 'restoring';
    // choice: LLD §5.8 has a restored bed wait for planes, at most 3 s, before the room is read (the extractor
    // cannot tell "no planes yet" from "no planes"), and API_SPEC §1.10 rule 4 has bed and features in one
    // frame. So the whole placed step waits. `read()` allocates, as in the chain's own 3 s (D-034). At every saved
    // level: a bed saved at 3 or 4 keeps the signature of a room whose walls are scanned (D-060 item 14).
    const waits =
      isRestored &&
      this.planes.supported() &&
      nowMs - this.waitFromMs < PLANE_LEVELS_TIMEOUT_MS &&
      this.planes.read().length === 0;
    if (waits) return;
    // The kept bed is cleared before anything acts on it: `update` may be started again after a throw.
    this.placed = this.placement;
    this.placement = null;
    this.isRestored = isRestored;
    this.isLanding = true;
    this.stage = 'placed';
  }

  /**
   * Solving, at level 3: the bed shows where it would land, with no BedAnchor, which makes it the ghost of
   * UX §9.2, and the hint is up. It follows the preview with an ease, so hit-test jitter does not shake it.
   */
  private showGhost(delta: number): void {
    const shown = this.solver.preview();
    if (shown === null) return;
    const bed = this.bedObject;
    MATRIX.fromArray(shown.pose).decompose(POSITION, TURN, SCALE);
    // choice: the contract does not say whether the ghost rides at the height offset. It does, like the bed
    // that lands there, so nothing jumps when it is placed.
    POSITION.y += this.heightOffsetM;
    const ease = this.isGhost ? 1 - Math.exp((-delta * 1000) / GHOST_EASE_MS) : 1; // the first frame puts it there
    bed.position.lerp(POSITION, ease);
    bed.quaternion.slerp(TURN, ease);
    if (this.isGhost) return;
    this.isGhost = true;
    bed.visible = true;
    const key: StringKey = settings.get().gazeDwell ? 'placeLookGaze' : 'placeLook';
    this.hint.addComponent(Caption, { key, expiresAt: clock.now() + HIT_TEST_TIMEOUT_MS });
  }

  /** One frame of placed: what is left of the placed step, then what a continuation kept. It creates nothing. */
  private keep(): void {
    const placed = this.placed;
    if (placed === null) return;
    if (this.isLanding) this.settle(placed);
    if (this.madeHandle !== null) {
      const handle = this.madeHandle;
      this.madeHandle = null;
      bus.emit('room:anchored', { handle, level: placed.level });
    }
    if (this.answer === undefined) return;
    // choice: after a pause or a recentre LLD §3.2 says only that "the bed entity moves" to the anchor's pose.
    // So no event follows, and a null or a far pose leaves the bed where it is: D-041 is about a session's start.
    if (this.answer !== null) this.poseBed(this.answer);
    this.answer = undefined;
  }

  /**
   * The placed step (LLD §3.2), all of it in this frame, with this frame's XRFrame readable. After a throw the
   * breaker starts `update` again a second later: the bed's own part is then done again, and no event is sent
   * a second time.
   */
  private settle(placement: BedPlacement): void {
    this.poseBed(placement.pose);
    this.bedObject.visible = true;
    if (!this.bed.hasComponent(BedAnchor)) {
      const source = SOURCES[placement.level];
      this.bed.addComponent(BedAnchor, { heightOffset: this.heightOffsetM, source });
    }
    this.takeHint();
    this.isLanding = false; // before the events: none is sent twice
    const restored = this.isRestored;
    // The chain emitted the levels it tried. A bed that came back tried none, so its level is said here.
    if (restored) bus.emit('room:placementLevel', { level: placement.level });
    bus.emit(
      'room:bedPlaced',
      this.xrManager.isPresenting ? { placement, restored } : { placement, restored, inWindow: true },
    );
    bus.emit('room:features', this.readRoom(placement));
    if (restored) return;
    // The new anchor is made in the background and holds nothing up (FR-ROOM-07); null is "no anchor".
    const turn = this.turn;
    void this.anchors.create(placement.pose).then((handle) => {
      if (turn === this.turn) this.madeHandle = handle;
    });
  }

  /**
   * The room, read once per placement. `room:features` follows every `room:bedPlaced`, also when the read
   * throws: the garden has no other way to its signature, its visit and its seeds (LLD §3.3 D).
   */
  private readRoom(placement: BedPlacement): EventMap['room:features'] {
    try {
      return { features: this.extractor.extract(placement), surfaces: this.extractor.surfaces };
    } catch (error) {
      log.error('room', 'the room read threw: no features', error);
      return { features: { level: placement.level }, surfaces: {} };
    }
  }

  /**
   * Puts the bed's entity at `pose`, raised by the height offset, and makes its world matrix current, so a
   * reader in this frame sees the new pose (LLD §3.1). `pose` itself is the surface's.
   */
  private poseBed(pose: Mat4): void {
    const bed = this.bedObject;
    MATRIX.fromArray(pose).decompose(bed.position, bed.quaternion, SCALE);
    bed.position.y += this.heightOffsetM;
    bed.updateMatrixWorld(true);
  }
}
