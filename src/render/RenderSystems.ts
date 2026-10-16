// The ECS systems of render/ (LLD §3.2): PerfSystem; SeedSystem, the seeds and their orb (T-127);
// BedRenderSystem, which draws the bed today and gets its plants, tide and targets with T-128d; and
// TuningRippleSystem. The renderers themselves stay plain classes that read no clock (API_SPEC §1.8).
import { createSystem, Types, Vector3, type Entity, type Object3D } from '@iwsdk/core';

import { BedAnchor, Caption, Interactable } from '../core/components.js';
import { bus, clock, log, settings } from '../core/index.js';
import { HandState, HIT_RADIUS_M } from '../hands/index.js';

import { BedRenderer } from './BedRenderer.js';
import {
  GARDEN_FULL_CAPTION_MS,
  PERF_HUD_HEAD_OFFSET_M,
  RIPPLE_SWEEP_AT_MS,
  RIPPLE_TUNED_MS,
} from './config.js';
import { createPerfHud, PerfSampler } from './PerfHud.js';
import { SeedRenderer } from './SeedRenderer.js';
import { TuningRipple } from './TuningRipple.js';

import type { FlashGuard } from './FlashGuard.js';
import type { SeedMove } from './SeedRenderer.js';
import type { AudioEngine } from '../audio/index.js';
import type { EventMap, Hand, StringKey } from '../core/index.js';
import type { RoomSignature } from '../garden/index.js';
import type { RoomSurfaces } from '../room/index.js';

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
 * carries that seed's `Interactable`, at the point it is drawn. A hand that is lost or turned leaves its HandState
 * as it was, so a seed on its palm stays there, out (the garden's rule).
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

/**
 * Draws what stands on the bed (LLD §3.2). Priority 50. configData: `guard`, the page's FlashGuard, and `bed`,
 * the Object3D of the bed's entity (`RoomSystem.bed.object3D`): it carries the bed's pose, and RoomSystem shows
 * and hides it. The bed is placed exactly while an entity carries BedAnchor (API_SPEC §1.10 rule 5). Until then,
 * and so while the level-3 ghost of UX §9.2 shows, the cell markers are faded out: the glass with its ring lines
 * is the ghost. The plants, the tide and the targets join with T-128d, and with them the hover cue
 * (`bedRenderer.setHover`).
 */
export class BedRenderSystem extends createSystem(
  { beds: { required: [BedAnchor] } },
  { guard: { type: Types.Object, default: null }, bed: { type: Types.Object, default: null } },
) {
  private bedRenderer!: BedRenderer;

  override init(): void {
    this.bedRenderer = new BedRenderer(
      this.config.bed.value as Object3D,
      this.config.guard.value as FlashGuard,
    );
    this.setPlaced(false);
    const { beds } = this.queries;
    this.cleanupFuncs.push(
      // `true`: a bed that was placed before this system was registered counts too
      beds.subscribe('qualify', () => this.setPlaced(true), true),
      beds.subscribe('disqualify', () => this.setPlaced(false)),
      () => this.bedRenderer.dispose(),
    );
  }

  /** `time`: IWSDK's frame time in seconds. Whole milliseconds: a fraction handed on can cost an object a frame. */
  override update(_delta: number, time: number): void {
    this.bedRenderer.update(Math.round(time * 1000));
  }

  /**
   * A query callback runs inside RoomSystem's `addComponent`, in the middle of its placed step, where no
   * circuit breaker reaches (API_SPEC §1.10 rule 12): it catches its own throw.
   */
  private setPlaced(isPlaced: boolean): void {
    try {
      this.bedRenderer.setGhost(!isPlaced);
    } catch (error) {
      log.error('render', 'the bed could not be drawn as placed or as a ghost', error);
    }
  }
}

const SWEEPS = RIPPLE_SWEEP_AT_MS.length; // table, wall, ceiling

/**
 * The tuning ripple (FR-ROOM-12, LLD §5.8). Priority 55. configData: `guard`, the page's FlashGuard, and `bed`, the
 * bed entity's Object3D. A ripple needs the surfaces of room:features and the signature of the same placement.
 * GardenSystem answers room:features with room:signature, so this system hears the signature first; either way
 * the ripple starts in the next update, in the same frame, and its times count from that frame (API_SPEC §1.10
 * rule 4). Each surface that has a sweep raises its caption on this system's own entity, from the sweep's start
 * to the next one's; room:tuned follows at RIPPLE_TUNED_MS. A Wanderer session is told by its signature
 * (paletteSeed 0), not by missing surfaces: one ripple over the bed and no caption.
 */
export class TuningRippleSystem extends createSystem(
  { beds: { required: [BedAnchor] } },
  { guard: { type: Types.Object, default: null }, bed: { type: Types.Object, default: null } },
) {
  private ripple!: TuningRipple;
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
