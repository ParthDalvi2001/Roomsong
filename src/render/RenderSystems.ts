// The ECS systems of render/ (LLD §3.2): PerfSystem, and BedRenderSystem, which draws the bed today and gets its
// plants, tide and targets with T-128d. The renderers themselves stay plain classes that read no clock
// (API_SPEC §1.8).
import { createSystem, Types, type Object3D } from '@iwsdk/core';

import { BedAnchor } from '../core/components.js';
import { log } from '../core/index.js';

import { BedRenderer } from './BedRenderer.js';
import { PERF_HUD_HEAD_OFFSET_M } from './config.js';
import { createPerfHud, PerfSampler } from './PerfHud.js';

import type { FlashGuard } from './FlashGuard.js';
import type { AudioEngine } from '../audio/index.js';

const NOTHING = (): void => {};

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
