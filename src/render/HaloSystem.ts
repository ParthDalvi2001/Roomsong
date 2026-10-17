// Listen mode's system (LLD §3.2, priority 52; API_SPEC §1.10 "Listen mode"): the dim dome (also high contrast's
// dim) and the aurora halo (HaloRenderer), the Listen orb (OrbRenderer) and the orb's pinch target, and the
// "Goodnight" caption of the 10-minute end. The Listen state itself is the garden's: this system follows `listen:enter` and `listen:exit`.
import { createSystem, Types, type Entity, type Object3D } from '@iwsdk/core';

import { BedAnchor, Caption, Interactable } from '../core/components.js';
import { bus, clock, log, settings, type Settings, type StringKey } from '../core/index.js';
import { HIT_RADIUS_M } from '../hands/index.js';

import { GOODNIGHT_CAPTION_MS, LISTEN_ORB_ID, LISTEN_ORB_LIFT_M } from './config.js';
import { HaloRenderer } from './HaloRenderer.js';
import { OrbRenderer } from './OrbRenderer.js';

import type { FlashGuard } from './FlashGuard.js';
import type { AudioEngine } from '../audio/index.js';

/** UX §3.5: the one caption that is not an instruction. */
const GOODNIGHT: StringKey = 'goodnight';

/**
 * configData: `guard` (the page's FlashGuard), `engine` (the AudioEngine, for the beat) and `bed` (the bed
 * entity's Object3D, `RoomSystem.bed.object3D`, which carries the bed's pose; everything here is its child). The
 * orb and its target are there exactly while the bed is placed (a query on BedAnchor, API_SPEC §1.10 rule 5).
 */
export class HaloSystem extends createSystem(
  { beds: { required: [BedAnchor] } },
  {
    guard: { type: Types.Object, default: null },
    engine: { type: Types.Object, default: null },
    bed: { type: Types.Object, default: null },
  },
) {
  private halo!: HaloRenderer;
  private orb!: OrbRenderer;
  private bed!: Object3D;
  private engine!: AudioEngine;
  /** Carries the orb's Interactable while the bed is placed (rule 7: whoever draws the orb owns its target). */
  private target!: Entity;
  private caption!: Entity;
  private isPlaced = false;
  /** This session has its signature (rule 11: the beat only then). */
  private isTuned = false;
  /** Per hand (left, right): its hover is the orb. */
  private readonly hovered = [false, false];

  override init(): void {
    this.bed = this.config.bed.value as Object3D;
    this.engine = this.config.engine.value as AudioEngine;
    const guard = this.config.guard.value as FlashGuard;
    this.halo = new HaloRenderer(this.bed, guard);
    this.orb = new OrbRenderer(this.bed, guard);
    this.target = this.createEntity();
    this.caption = this.createEntity();
    const apply = (s: Readonly<Settings>): void => {
      this.halo.setReducedMotion(s.reducedMotion);
      this.halo.setHighContrast(s.highContrast); // FR-UI-05: the background dim
    };
    apply(settings.get());
    const { beds } = this.queries;
    this.cleanupFuncs.push(
      // `true`: a bed that was placed before this system was registered counts too
      beds.subscribe('qualify', () => this.setPlaced(true), true),
      beds.subscribe('disqualify', () => this.setPlaced(false)),
      bus.on('settings:changed', ({ settings: s }) => apply(s)),
      bus.on('listen:enter', () => this.setListening(true)),
      bus.on('listen:exit', ({ timedOut }) => {
        this.setListening(false);
        if (timedOut) this.sayGoodnight();
      }),
      bus.on('room:signature', () => void (this.isTuned = true)),
      bus.on('xr:sessionEnd', () => void (this.isTuned = false)),
      bus.on('target:hover', ({ hand, target }) => {
        this.hovered[hand === 'left' ? 0 : 1] = target?.kind === 'orb';
        this.orb.setHovered(this.hovered[0] === true || this.hovered[1] === true);
      }),
      () => {
        this.halo.dispose();
        this.orb.dispose();
        this.target.destroy(); // the orb's target goes with it, and so does a caption still up
        this.caption.destroy();
      },
    );
  }

  /** `time`: IWSDK's frame time in seconds. Whole milliseconds: a fraction handed on can cost an object a frame. */
  override update(_delta: number, time: number): void {
    const nowMs = Math.round(time * 1000);
    const { clock: audioClock } = this.engine;
    // API_SPEC §1.10 rule 11: the beat only with a bed, a signature and an audio clock that runs.
    const phase = this.isPlaced && this.isTuned && audioClock.now() > 0 ? audioClock.barPhase() : Number.NaN;
    this.halo.update(phase, nowMs);
    this.orb.update(nowMs);
    if (this.isPlaced) this.placeTarget();
  }

  private setListening(isListening: boolean): void {
    this.halo.setListening(isListening);
    this.orb.setListening(isListening);
  }

  /** The orb's centre in the world: LISTEN_ORB_LIFT_M up the bed's own y axis from its centre (D-029). */
  private placeTarget(): void {
    const m = this.bed.matrixWorld.elements;
    const at = this.target.getVectorView(Interactable, 'worldPos');
    at[0] = m[4] * LISTEN_ORB_LIFT_M + m[12];
    at[1] = m[5] * LISTEN_ORB_LIFT_M + m[13];
    at[2] = m[6] * LISTEN_ORB_LIFT_M + m[14];
  }

  /**
   * A query callback runs inside RoomSystem's `addComponent`, where no circuit breaker reaches (API_SPEC §1.10
   * rule 12): it catches its own throw.
   */
  private setPlaced(isPlaced: boolean): void {
    try {
      this.isPlaced = isPlaced;
      this.orb.mesh.visible = isPlaced;
      const has = this.target.hasComponent(Interactable);
      if (isPlaced && !has) {
        this.target.addComponent(Interactable, { kind: 'orb', id: LISTEN_ORB_ID, radius: HIT_RADIUS_M });
        this.placeTarget();
      } else if (!isPlaced && has) {
        this.target.removeComponent(Interactable);
      }
    } catch (error) {
      log.error('render', 'the Listen orb could not be placed or taken away', error);
    }
  }

  /** UX §3.5: "Goodnight", on the system's own entity; a caption still up is taken back first. */
  private sayGoodnight(): void {
    if (this.caption.hasComponent(Caption)) this.caption.removeComponent(Caption);
    this.caption.addComponent(Caption, { key: GOODNIGHT, expiresAt: clock.now() + GOODNIGHT_CAPTION_MS });
  }
}
