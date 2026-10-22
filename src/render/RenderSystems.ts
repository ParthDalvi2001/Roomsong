// The ECS systems of render/ (LLD §3.2): PerfSystem; SeedSystem, the seeds and their orb (T-127);
// BedRenderSystem, the bed with its plants, tide and targets (T-128c, T-128d); and TuningRippleSystem (T-142).
// The renderers themselves stay plain classes that read no clock (API_SPEC §1.8).
import { createSystem, Types, Vector3, type Entity, type Matrix4, type Object3D } from '@iwsdk/core';

import { BedAnchor, Caption, Interactable } from '../core/components.js';
import { bus, clock, log, settings } from '../core/index.js';
import { cellCentre } from '../garden/index.js';
import { HAND_HINT_MAX_MS, HandState, HIT_RADIUS_M } from '../hands/index.js';

import { BedRenderer, onBed } from './BedRenderer.js';
import {
  GARDEN_FULL_CAPTION_MS,
  PERF_HUD_HEAD_OFFSET_M,
  PETAL_LIFT_M,
  RIPPLE_SWEEP_AT_MS,
  RIPPLE_TUNED_MS,
} from './config.js';
import { createPerfHud, PerfSampler } from './PerfHud.js';
import { PetalRenderer } from './PetalRenderer.js';
import { PlantRenderer } from './PlantRenderer.js';
import { SeedRenderer } from './SeedRenderer.js';
import { TideRenderer } from './TideRenderer.js';
import { TuningRipple } from './TuningRipple.js';
import { VineRenderer } from './VineRenderer.js';

import type { FlashGuard } from './FlashGuard.js';
import type { SeedMove } from './SeedRenderer.js';
import type { AudioEngine } from '../audio/index.js';
import type { EventMap, Hand, StringKey } from '../core/index.js';
import type { Cell, GardenState, Plant, RoomSignature } from '../garden/index.js';
import type { RoomSurfaces, SurfaceRef } from '../room/index.js';

const NOTHING = (): void => {};
/** UX §7: the caption of a seed let go over a full bed. */
const GARDEN_FULL: StringKey = 'gardenFull';
/** UX §7: how a seed that is sent back goes: a hop off the bed, a glide (with the caption) over a full one, and
 *  at once for a lost hand or a session's end. */
const BACK: Readonly<Record<EventMap['garden:seedBack']['reason'], SeedMove>> = {
  offBed: 'bump',
  full: 'glide',
  lost: 'jump',
  reset: 'jump',
};
const handIndex = (hand: Hand): number => (hand === 'left' ? 0 : 1);

/**
 * Times every frame and emits `perf:sample` once a second (NFR-PERF-03/04/05). Priority -100 (LLD §3.2): it runs
 * before every other system, so its `update` is the start of the frame's script. The frame ends in
 * `scene.onAfterRender`, which Three.js calls once per `renderer.render` of the scene: IWSDK gives an app no
 * other hook after the render. configData: `guard` (FlashGuard) and `engine` (AudioEngine).
 */
export class PerfSystem extends createSystem(
  {},
  { guard: { type: Types.Object, default: null }, engine: { type: Types.Object, default: null } },
) {
  /** This frame: when its script started (the page's clock, ms) and its frame time (ms, never goes back). */
  private startedMs = 0;
  private frameMs = 0;

  override init(): void {
    const engine = this.config.engine.value as AudioEngine;
    const sampler = new PerfSampler(this.renderer.info, this.config.guard.value as FlashGuard);
    // The contract does not say where the read-out sits: on the head, low and left inside the view box.
    const hud = createPerfHud(this.player.head);
    hud?.mesh.position.fromArray(PERF_HUD_HEAD_OFFSET_M);
    // No system's circuit breaker reaches inside renderer.render (LLD §3.2), and a throw there would end the
    // frames for good: this callback catches its own, says so once and stops sampling.
    this.scene.onAfterRender = () => {
      try {
        sampler.frame(this.frameMs, performance.now() - this.startedMs, engine.stats.voices);
      } catch (error) {
        this.scene.onAfterRender = NOTHING;
        log.error('render', 'the perf sample threw: sampling has stopped', error);
      }
    };
    this.cleanupFuncs.push(() => {
      this.scene.onAfterRender = NOTHING;
      hud?.dispose();
    });
  }

  override update(_delta: number, time: number): void {
    this.startedMs = performance.now();
    this.frameMs = time * 1000;
  }
}

/**
 * The seed on the hand (T-127, FR-HND-05, API_SPEC §1.10 rule 8). Priority 49 (LLD §3.2), configData `guard`. It
 * draws the supply in its orb over the bed and the seed that is out: on the palm of the hand it went to
 * (`garden:seedOut`), at the pinch point of the hand of the latest `gesture:pinchStart` that names it, and back in
 * the orb on `garden:seedBack`; a planted seed leaves the supply with its `garden:changed`. While a seed is out it
 * carries that seed's `Interactable`, at the point it is drawn, and glows while a hand's `target:hover` names it
 * (FR-HND-16, UX §9.1). A hand that is lost or turned leaves its HandState as it was, so a seed on its palm stays
 * there, out (the garden's rule).
 */
export class SeedSystem extends createSystem(
  { hands: { required: [HandState] }, beds: { required: [BedAnchor] } },
  { guard: { type: Types.Object, default: null } },
) {
  private seeds!: SeedRenderer;
  /** Per hand (left, right): its palm and pinch points as HandSystem wrote them this frame. A seed follows one. */
  private readonly palms = [new Vector3(), new Vector3()];
  private readonly pinches = [new Vector3(), new Vector3()];
  private readonly handStates: (Entity | null)[] = [null, null];
  /** The bed (API_SPEC §1.10 rule 5: one entity, with BedAnchor while it is placed); the orb hangs over it. */
  private bed: Entity | null = null;
  /** The seed's target while one is out, and the "Garden is full" caption: an entity each, made once. */
  private target!: Entity;
  private caption!: Entity;
  private outId: string | null = null;
  /** Per hand (left, right): the seed its `target:hover` names, or null (FR-HND-16, UX §9.1). */
  private readonly hovers: (string | null)[] = [null, null];
  /** The latest frame's time, ms: a seed sent from a bus handler starts its glide there. */
  private frameMs = 0;
  private readonly drawnAt = new Vector3();

  override init(): void {
    this.seeds = new SeedRenderer(this.scene, this.config.guard.value as FlashGuard);
    this.target = this.createEntity();
    this.caption = this.createEntity();
    const { hands, beds } = this.queries;
    this.cleanupFuncs.push(
      // `true`: what was there before this system was registered counts too
      hands.subscribe(
        'qualify',
        (entity) => void (this.handStates[handIndex(entity.getValue(HandState, 'hand') as Hand)] = entity),
        true,
      ),
      hands.subscribe('disqualify', (entity) => {
        const i = this.handStates.indexOf(entity);
        if (i >= 0) this.handStates[i] = null;
      }),
      beds.subscribe('qualify', (entity) => void (this.bed = entity), true),
      beds.subscribe('disqualify', (entity) => {
        if (this.bed === entity) this.bed = null;
      }),
      bus.on('garden:changed', ({ state }) => {
        this.seeds.setSupply(state.seeds);
        // Planted (its id is in diff.added, and a plant takes its seed's id) or gone with its garden.
        if (this.outId !== null && !this.seeds.has(this.outId)) this.end();
      }),
      bus.on('garden:seedOut', ({ seed, hand }) => this.send(seed.id, hand)),
      bus.on('target:hover', ({ hand, target }) => {
        this.hovers[handIndex(hand)] = target?.kind === 'seed' ? target.id : null;
        this.seeds.setHover(this.hovers[0] ?? this.hovers[1] ?? null);
      }),
      bus.on('gesture:pinchStart', ({ hand, target }) => {
        if (target?.kind !== 'seed' || target.id !== this.outId) return;
        this.seeds.follow(target.id, this.pinches[handIndex(hand)]!, this.frameMs, 'hop');
      }),
      bus.on('garden:seedBack', ({ seedId, reason }) => {
        this.seeds.follow(seedId, null, this.frameMs, BACK[reason]);
        if (seedId === this.outId) this.end();
        if (reason === 'full') this.raiseFull();
      }),
      () => this.seeds.dispose(),
    );
  }

  /** `time`: IWSDK's frame time in seconds. In whole ms, as HandSystem has it: a fraction handed on is boxed. */
  override update(_delta: number, time: number): void {
    const nowMs = (this.frameMs = Math.round(time * 1000));
    for (let i = 0; i < 2; i++) {
      const entity = this.handStates[i];
      if (entity === null || entity === undefined) continue;
      this.palms[i]!.fromArray(entity.getVectorView(HandState, 'palmPos'));
      this.pinches[i]!.fromArray(entity.getVectorView(HandState, 'pinchPos'));
    }
    this.seeds.update(this.bed?.object3D?.matrixWorld ?? null, nowMs);
    if (this.outId === null || !this.seeds.positionOf(this.outId, this.drawnAt)) return;
    // The target is where the seed is drawn; hands reads it next frame (LLD §3.4).
    const view = this.target.getVectorView(Interactable, 'worldPos');
    view[0] = this.drawnAt.x;
    view[1] = this.drawnAt.y;
    view[2] = this.drawnAt.z;
  }

  /** `garden:seedOut`: the seed glides to that hand's palm and is a pinch target from now on (FR-HND-04). */
  private send(seedId: string, hand: Hand): void {
    if (this.outId !== null) {
      // At most one seed is out (rule 8): a second one sends the first home, drawn and target alike.
      this.seeds.follow(this.outId, null, this.frameMs, 'jump');
      this.end();
    }
    if (!this.seeds.follow(seedId, this.palms[handIndex(hand)]!, this.frameMs, 'glide')) {
      log.warn('render', 'garden:seedOut for a seed that is not in the supply', { seedId });
      return;
    }
    this.outId = seedId;
    // hands reads kind, id and radius once, when the component is added (API_SPEC §1.10 rule 7)
    this.target.addComponent(Interactable, { kind: 'seed', id: seedId, radius: HIT_RADIUS_M });
  }

  /** The seed is not out any more: its target goes. */
  private end(): void {
    this.outId = null;
    if (this.target.hasComponent(Interactable)) this.target.removeComponent(Interactable);
  }

  /** UX §7. Taken back first: a Caption added again to an entity that still has one would not qualify again. */
  private raiseFull(): void {
    if (this.caption.hasComponent(Caption)) this.caption.removeComponent(Caption);
    this.caption.addComponent(Caption, { key: GARDEN_FULL, expiresAt: clock.now() + GARDEN_FULL_CAPTION_MS });
  }
}

/** A pinch target on the bed (API_SPEC §1.10 rule 7): its entity, and where on the bed it stands. */
interface BedTarget {
  readonly id: string;
  readonly entity: Entity;
  cell: Cell;
  readonly liftM: number;
  /** The frame time it goes at, ms: a petal's end; Infinity for a plant's. */
  readonly untilMs: number;
}
const HANDS: readonly Hand[] = ['left', 'right'];
const NO_PLANTS: Plant[] = []; // shared, never written: the plants drawn while no bed is placed
const CENTRE = { x: 0, y: 0 };
const AT = new Vector3();
const DISSOLVED_AT = new Vector3(); // where a removed plant was last drawn, bed frame (PlantRenderer.heldAt)
/**
 * The bar phase as the plants and the tide get it: in steps of 1/PHASE_STEPS of a bar (0.7 ms at 84 BPM, far
 * under a frame), taken from numbers made once. A fraction made in the frame is boxed when it is handed to a call
 * V8 does not inline, as PlantRenderer.update is not: 16 bytes a frame (BedRenderSystem.heap.test.ts). The array
 * starts with null so that V8 keeps its elements as the boxed numbers they are; a number[] holds them raw and
 * boxes again at each read.
 */
const PHASE_STEPS = 4096; // a power of two: `& (PHASE_STEPS - 1)` wraps a phase outside 0..1 back into the bar
const PHASES: unknown[] = [null];
for (let i = 0; i < PHASE_STEPS; i++) PHASES.push(i / PHASE_STEPS);
const phaseOf = (phase: number): number =>
  PHASES[1 + (Math.floor(phase * PHASE_STEPS) & (PHASE_STEPS - 1))] as number;

/**
 * Draws what stands on the bed (LLD §3.2). Priority 50. configData: `guard`, the page's FlashGuard; `engine`, the
 * audio engine, whose clock the tide follows; and `bed`, the Object3D of the bed's entity (`RoomSystem.bed.object3D`):
 * it carries the bed's pose, and RoomSystem shows and hides it. The bed is placed exactly while an entity carries
 * BedAnchor (API_SPEC §1.10 rule 5). Until then, and so while the level-3 ghost of UX §9.2 shows, the cell markers
 * are faded out (the glass with its ring lines is the ghost), and no plant is drawn or has a target. While placed:
 * the plants of the latest `garden:changed`, one `Interactable { kind: 'plant' }` per plant at its cell, the tide
 * from the session's `room:signature` on (rule 11), the hover cue and the tint of a lost hand (D-044), and the
 * undo petal with its own target (T-146).
 */
export class BedRenderSystem extends createSystem(
  { beds: { required: [BedAnchor] } },
  {
    guard: { type: Types.Object, default: null },
    engine: { type: Types.Object, default: null },
    bed: { type: Types.Object, default: null },
  },
) {
  private bed!: Object3D;
  private engine!: AudioEngine;
  private bedRenderer!: BedRenderer;
  private plants!: PlantRenderer;
  private tide!: TideRenderer;
  private petals!: PetalRenderer;
  /** The latest garden; null until the first `garden:changed`. */
  private state: GardenState | null = null;
  private createdAt = Number.NaN;
  private isPlaced = false;
  /** This session has its signature: the tide may run (rule 11). */
  private isTuned = false;
  /** The plants' targets, by plant id and as a list (a frame loops the list, no Map iterator), and the undo
   *  petals' (each lives as long as its petal). */
  private readonly targets = new Map<string, BedTarget>();
  private readonly plantTargets: BedTarget[] = [];
  private readonly undoTargets: BedTarget[] = [];
  /** The bed's world matrix when the targets were last placed: a bed moved under them moves them (LLD §3.2). */
  private readonly aimedFrom = new Float64Array(16);
  /** The latest frame's time, ms: a tint or a petal set from a bus handler is timed on it. */
  private frameMs = 0;

  override init(): void {
    const guard = this.config.guard.value as FlashGuard;
    this.bed = this.config.bed.value as Object3D;
    this.engine = this.config.engine.value as AudioEngine;
    this.bedRenderer = new BedRenderer(this.bed, guard);
    this.plants = new PlantRenderer(this.bed, guard);
    this.tide = new TideRenderer(this.bed, guard);
    this.petals = new PetalRenderer(this.bed, guard);
    this.setPlaced(false);
    const { beds } = this.queries;
    this.cleanupFuncs.push(
      // `true`: a bed that was placed before this system was registered counts too
      beds.subscribe('qualify', () => this.setPlaced(true), true),
      beds.subscribe('disqualify', () => this.setPlaced(false)),
      bus.on('garden:changed', ({ state, diff }) => {
        this.state = state;
        for (const id of diff.added) this.petals.hide(id); // the undo
        // New garden drops every undo token, and no event says so (API_SPEC §1.8)
        if (state.createdAt !== this.createdAt) this.petals.clear();
        this.createdAt = state.createdAt;
        // The whole state, before the visit and after it: the renderer unfurls what grew (T-119)
        if (this.isPlaced) this.draw();
      }),
      bus.on('garden:removed', ({ plantId, undoToken, expiresAt }) =>
        this.showPetal(plantId, undoToken.plant, expiresAt),
      ),
      bus.on('room:signature', () => void (this.isTuned = true)),
      bus.on('xr:sessionEnd', () => {
        this.isTuned = false;
        for (const hand of HANDS) this.onHover(hand, null, null);
        for (const hand of HANDS) this.plants.setTint(hand, null, 0);
      }),
      bus.on('target:hover', ({ hand, target, cell }) =>
        this.onHover(hand, target?.kind === 'plant' ? target.id : null, cell),
      ),
      // FR-HND-15 (D-030): the plant a lost hand held is dimmed until the hint's longest time, or its return
      bus.on('hands:lost', ({ hand, held }) => {
        if (held?.kind === 'plant') this.plants.setTint(hand, held.id, this.frameMs + HAND_HINT_MAX_MS);
      }),
      bus.on('hands:found', ({ hand }) => this.plants.setTint(hand, null, 0)),
      // The shaping drawn (T-147, API_SPEC §1.8 "Who calls it"): the garden's handlers have run first.
      bus.on('gesture:pinchStart', (e) => this.plants.onPinchStart(e)),
      bus.on('gesture:pull', (e) => this.plants.onPull(e)),
      bus.on('gesture:drag', (e) => this.plants.onDrag(e)),
      bus.on('gesture:release', (e) => this.plants.onRelease(e)),
      bus.on('gesture:trackingLost', (e) => this.plants.onRelease(e)),
      () => {
        this.setPlaced(false);
        for (const renderer of [this.bedRenderer, this.plants, this.tide, this.petals]) renderer.dispose();
      },
    );
  }

  /** `time`: IWSDK's frame time in seconds. Whole milliseconds: a fraction handed on can cost an object a frame. */
  override update(_delta: number, time: number): void {
    const nowMs = (this.frameMs = Math.round(time * 1000));
    // The targets first, so a renderer that throws every frame cannot leave one behind. A petal's target lives
    // exactly as long as its petal: the end of its 5 s, the undo, New garden, a newer petal over the same cell.
    const undo = this.undoTargets;
    for (let i = undo.length - 1; i >= 0; i--) {
      const target = undo[i]!;
      if (nowMs < target.untilMs && this.petals.has(target.id)) continue;
      target.entity.destroy();
      undo[i] = undo[undo.length - 1]!;
      undo.pop();
    }
    // A bed moved with no event (a recentre or a pause re-reads its anchor, LLD §3.2) moves the targets with it.
    if (this.isPlaced && !isSamePose(this.bed.matrixWorld.elements, this.aimedFrom)) this.aimAll();
    // Rule 11: before init() the engine says phase 0, a valid phase; during Re-place there is no bed to sweep;
    // a phase that is not a number is no tide. Two branches, not `cond ? phase : NaN`: V8 may unbox such a
    // value and box it again for the calls.
    const audioClock = this.engine.clock;
    const barPhase =
      this.isPlaced && this.isTuned && audioClock.now() > 0 ? audioClock.barPhase() : Number.NaN;
    if (Number.isFinite(barPhase)) this.sweep(phaseOf(barPhase), nowMs);
    else this.sweep(Number.NaN, nowMs);
    this.bedRenderer.update(nowMs);
    this.petals.update(nowMs);
  }

  /** The tide and each plant's glow as it passes (FR-UI-07): one phase for both. */
  private sweep(phase: number, nowMs: number): void {
    this.tide.update(phase, nowMs);
    this.plants.update(phase, nowMs);
  }

  /**
   * A query callback runs inside RoomSystem's `addComponent`, in the middle of its placed step, where no
   * circuit breaker reaches (API_SPEC §1.10 rule 12): it catches its own throw.
   */
  private setPlaced(isPlaced: boolean): void {
    try {
      this.isPlaced = isPlaced;
      this.bedRenderer.setGhost(!isPlaced);
      if (!isPlaced) this.petals.clear(); // nothing stands on a bed that is not placed; the token runs out alone
      this.draw();
    } catch (error) {
      log.error('render', 'the bed could not be drawn as placed or as a ghost', error);
    }
  }

  /** The plants of the latest state and their targets, or none while the bed is not placed. On a change only. */
  private draw(): void {
    const plants = this.isPlaced ? (this.state?.plants ?? NO_PLANTS) : NO_PLANTS;
    this.plants.setState({ plants, lastVisitAt: this.state?.lastVisitAt ?? 0 });
    const live = new Set<string>();
    for (const plant of plants) {
      if (!onBed(plant.cell)) continue; // not drawn, as in PlantRenderer: no target either
      live.add(plant.id);
      const kept = this.targets.get(plant.id);
      if (kept !== undefined) {
        kept.cell = plant.cell; // moved
        continue;
      }
      // hands reads kind, id and radius once, when the component is added (rule 7)
      const entity = this.createEntity();
      entity.addComponent(Interactable, { kind: 'plant', id: plant.id, radius: HIT_RADIUS_M });
      this.targets.set(plant.id, { id: plant.id, entity, cell: plant.cell, liftM: 0, untilMs: Infinity });
    }
    this.plantTargets.length = 0;
    for (const [id, target] of this.targets) {
      if (live.has(id)) {
        this.plantTargets.push(target);
        continue;
      }
      target.entity.destroy();
      this.targets.delete(id);
    }
    this.aimAll();
  }

  /** Rule 7: every target at its cell's centre on the bed, raised by its lift, in world space. */
  private aimAll(): void {
    const pose = this.bed.matrixWorld;
    for (let i = 0; i < this.plantTargets.length; i++) aim(this.plantTargets[i]!, pose);
    for (let i = 0; i < this.undoTargets.length; i++) aim(this.undoTargets[i]!, pose);
    this.aimedFrom.set(pose.elements);
  }

  /**
   * D-044: an empty hand over a plant lights the plant and that plant's own cell marker (in high contrast every
   * plant is outlined, and under the tide's crest the guard clamps the glow away). Any other hover: its cell.
   */
  private onHover(hand: Hand, plantId: string | null, cell: Cell | null): void {
    this.plants.setHover(hand, plantId);
    this.bedRenderer.setHover(hand, plantId === null ? cell : (this.targets.get(plantId)?.cell ?? null));
  }

  /** UX §9.3, on garden:removed: the petal over the plant's own cell, and its target while it is up. */
  private showPetal(plantId: string, plant: Plant, expiresAt: number): void {
    // No bed, no petal: a plant held through Re-place and dragged off would leave an unseen target at the old pose.
    if (!this.isPlaced) return;
    // The token's end is on core's wall clock; the petal's on the frame clock (API_SPEC §1.8). A plant dragged
    // off the bed bursts from where the hand left it (T-147).
    const untilMs = this.frameMs + (expiresAt - clock.now());
    const from = this.plants.heldAt(plantId, DISSOLVED_AT) ? DISSOLVED_AT : null;
    this.petals.show(plantId, plant, untilMs, from);
    if (!this.petals.has(plantId)) return;
    const entity = this.createEntity();
    entity.addComponent(Interactable, { kind: 'undo', id: plantId, radius: HIT_RADIUS_M });
    const target = { id: plantId, entity, cell: plant.cell, liftM: PETAL_LIFT_M, untilMs };
    this.undoTargets.push(target);
    aim(target, this.bed.matrixWorld);
  }
}

/** Writes a target's `worldPos`: its cell's centre on the bed (bed-local x and z, D-029), `liftM` above it. */
function aim(target: BedTarget, bedPose: Matrix4): void {
  cellCentre(target.cell, CENTRE);
  AT.set(CENTRE.x, target.liftM, CENTRE.y).applyMatrix4(bedPose);
  const view = target.entity.getVectorView(Interactable, 'worldPos');
  view[0] = AT.x;
  view[1] = AT.y;
  view[2] = AT.z;
}

/** The 16 numbers of a pose against a kept copy: no allocation. */
function isSamePose(now: ArrayLike<number>, kept: Float64Array): boolean {
  for (let i = 0; i < 16; i++) if (now[i] !== kept[i]) return false;
  return true;
}

const SWEEPS = RIPPLE_SWEEP_AT_MS.length; // table, wall, ceiling
/** Where a chord tone rings: one vector for all three, read by chordTone in the call (no allocation). */
const NOTE_AT = new Vector3();

/** A surface's centre for chordTone, or undefined for none: its note rings at the bed (LLD §5.8). */
function noteAt(surface: SurfaceRef | undefined): Vector3 | undefined {
  return (
    surface && NOTE_AT.set(surface.pose[12] as number, surface.pose[13] as number, surface.pose[14] as number)
  );
}

/**
 * The tuning ripple (FR-ROOM-12, LLD §5.8). Priority 55. configData: `guard`, the page's FlashGuard; `engine`, the
 * audio engine, which plays the room chord (T-142b); and `bed`, the bed entity's Object3D. A ripple needs the
 * surfaces of room:features and the signature of the same placement.
 * GardenSystem answers room:features with room:signature, so this system hears the signature first; either way
 * the ripple starts in the next update, in the same frame, and its times count from that frame (API_SPEC §1.10
 * rule 4). Each surface that has a sweep raises its caption on this system's own entity, from the sweep's start
 * to the next one's; room:tuned follows at RIPPLE_TUNED_MS. A Wanderer session is told by its signature
 * (paletteSeed 0), not by missing surfaces: one ripple over the bed and no caption.
 */
export class TuningRippleSystem extends createSystem(
  { beds: { required: [BedAnchor] } },
  {
    guard: { type: Types.Object, default: null },
    engine: { type: Types.Object, default: null },
    bed: { type: Types.Object, default: null },
  },
) {
  private ripple!: TuningRipple;
  private engine!: AudioEngine;
  private bed!: Object3D;
  /** Carries the ripple's caption. Its own entity: a Caption added to one that still has one is not seen. */
  private caption!: Entity;
  // What the next ripple waits for. Both are used once.
  private surfaces: RoomSurfaces | null = null;
  private signature: RoomSignature | null = null;
  private starterSeeds = false;
  /** The running ripple: the frame time it started (ms; NaN = none), each sweep's caption (null = none), the next sweep. */
  private startedMs = Number.NaN;
  private readonly keys: (StringKey | null)[] = [null, null, null];
  private next = 0;

  override init(): void {
    this.ripple = new TuningRipple(this.scene, this.config.guard.value as FlashGuard);
    this.bed = this.config.bed.value as Object3D;
    this.engine = this.config.engine.value as AudioEngine;
    this.caption = this.createEntity();
    this.cleanupFuncs.push(
      bus.on('room:signature', ({ signature, starterSeeds }) => {
        this.signature = signature;
        this.starterSeeds = starterSeeds;
      }),
      bus.on('room:features', ({ surfaces }) => {
        this.surfaces = surfaces;
      }),
      bus.on('xr:sessionEnd', () => this.end()),
      // A Re-place starts by taking BedAnchor off the bed (API_SPEC §1.10 rule 5); no bus event says so. The
      // callback runs inside RoomSystem's removeComponent, where no circuit breaker reaches: it catches its own.
      this.queries.beds.subscribe('disqualify', () => {
        try {
          this.end();
        } catch (error) {
          log.error('render', 'the tuning ripple could not be stopped', error);
        }
      }),
      () => this.ripple.dispose(),
    );
  }

  /** `time`: IWSDK's frame time in seconds, in whole milliseconds as BedRenderSystem takes it. */
  override update(_delta: number, time: number): void {
    const nowMs = Math.round(time * 1000);
    if (this.surfaces !== null && this.signature !== null) this.begin(this.surfaces, this.signature, nowMs);
    if (!Number.isNaN(this.startedMs)) this.follow(nowMs - this.startedMs);
    this.ripple.update(nowMs);
  }

  /** The timeline is set before the quads are aimed: a throw there costs the light, never room:tuned (T-150). */
  private begin(surfaces: RoomSurfaces, signature: RoomSignature, nowMs: number): void {
    this.surfaces = this.signature = null;
    const isWanderer = signature.paletteSeed === 0; // LLD §5.8: no room tuple hashes to 0
    const table = this.starterSeeds ? 'rippleTableSeeds' : 'rippleTableColour';
    this.keys[0] = !isWanderer && surfaces.table !== undefined ? table : null;
    this.keys[1] = !isWanderer && surfaces.nearestWall !== undefined ? 'rippleWalls' : null;
    this.keys[2] = !isWanderer && surfaces.ceiling !== undefined ? 'rippleCeiling' : null;
    this.takeCaption(); // a ripple started again: the last one's caption goes
    this.startedMs = nowMs;
    this.next = 0;
    // Each note at its sweep's start (LLD §5.8), all three always, before the quads are aimed; Wanderer's at the bed.
    const { engine } = this;
    const audioS = engine.clock.now();
    const [tableMs, wallMs, ceilingMs] = RIPPLE_SWEEP_AT_MS;
    engine.chordTone(0, audioS + tableMs / 1000, isWanderer ? undefined : noteAt(surfaces.table));
    engine.chordTone(1, audioS + wallMs / 1000, isWanderer ? undefined : noteAt(surfaces.nearestWall));
    engine.chordTone(2, audioS + ceilingMs / 1000, isWanderer ? undefined : noteAt(surfaces.ceiling));
    this.ripple.start(
      {
        surfaces,
        bedPose: this.bed.matrixWorld.elements,
        isWanderer,
        paletteSeed: signature.paletteSeed,
        isReducedMotion: settings.get().reducedMotion,
      },
      nowMs,
    );
  }

  /** Raises each sweep's caption as its time comes, then room:tuned. A caption whose time went by unseen is skipped. */
  private follow(elapsedMs: number): void {
    for (; this.next < SWEEPS && elapsedMs >= RIPPLE_SWEEP_AT_MS[this.next]!; this.next++) {
      const endMs = this.next + 1 < SWEEPS ? RIPPLE_SWEEP_AT_MS[this.next + 1]! : RIPPLE_TUNED_MS;
      const key = this.keys[this.next] ?? null;
      if (key === null || elapsedMs >= endMs) continue;
      this.takeCaption();
      this.caption.addComponent(Caption, { key, expiresAt: clock.now() + endMs - elapsedMs });
    }
    if (this.next < SWEEPS || elapsedMs < RIPPLE_TUNED_MS) return;
    this.startedMs = Number.NaN;
    bus.emit('room:tuned', {});
  }

  /** The session ended: no ripple, no caption, and nothing kept for the next session. */
  private end(): void {
    this.surfaces = this.signature = null;
    this.startedMs = Number.NaN;
    this.ripple.stop();
    this.takeCaption();
  }

  private takeCaption(): void {
    if (this.caption.hasComponent(Caption)) this.caption.removeComponent(Caption);
  }
}

/**
 * The vine (FR-ROOM-04, Could C4, D-021; T-149). Priority 53. configData: `guard`, the page's FlashGuard; `bed`,
 * the bed entity's Object3D. The nearest wall of `room:features` (the one the tuning ripple sweeps) is laid in the
 * next update, from the bed's pose of that frame (rule 4); the garden's plant count sets the length. A Re-place
 * (BedAnchor leaving the bed) and `xr:sessionEnd` take the vine away. Decoration only: no target, no caption.
 */
export class VineSystem extends createSystem(
  { beds: { required: [BedAnchor] } },
  {
    guard: { type: Types.Object, default: null },
    bed: { type: Types.Object, default: null },
  },
) {
  private vine!: VineRenderer;
  private bed!: Object3D;
  /** The surfaces the next update lays the vine on; null when none wait. */
  private surfaces: RoomSurfaces | null = null;

  override init(): void {
    this.vine = new VineRenderer(this.scene, this.config.guard.value as FlashGuard);
    this.bed = this.config.bed.value as Object3D;
    this.vine.setReducedMotion(settings.get().reducedMotion);
    this.cleanupFuncs.push(
      bus.on('room:features', ({ surfaces }) => void (this.surfaces = surfaces)),
      bus.on('garden:changed', ({ state }) => this.vine.setPlants(state.plants)),
      bus.on('settings:changed', ({ settings: s }) => this.vine.setReducedMotion(s.reducedMotion)),
      bus.on('xr:sessionEnd', () => this.unlay()),
      // Runs inside RoomSystem's removeComponent, where no circuit breaker reaches: it catches its own.
      this.queries.beds.subscribe('disqualify', () => {
        try {
          this.unlay();
        } catch (error) {
          log.error('render', 'the vine could not be taken away', error);
        }
      }),
      () => this.vine.dispose(),
    );
  }

  /** `time`: IWSDK's frame time in seconds, in whole milliseconds as the other systems take it. */
  override update(_delta: number, time: number): void {
    if (this.surfaces !== null) {
      this.vine.setWall(this.surfaces.nearestWall, this.bed.matrixWorld.elements);
      this.surfaces = null;
    }
    this.vine.update(Math.round(time * 1000));
  }

  private unlay(): void {
    this.surfaces = null;
    this.vine.setWall(undefined, this.bed.matrixWorld.elements);
  }
}
