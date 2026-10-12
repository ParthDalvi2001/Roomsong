// The ECS systems of render/ (LLD §3.2). Today one, PerfSystem; BedRenderSystem joins it with T-128c and T-128d.
// The renderers themselves stay plain classes that read no clock (API_SPEC §1.8).
import { createSystem, Types } from '@iwsdk/core';

import { log } from '../core/index.js';

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
