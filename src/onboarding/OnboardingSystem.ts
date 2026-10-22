// The onboarding system (LLD §3, priority 35; API_SPEC §1.10 "Onboarding (T-150)"): feeds the bus to the state
// machine, raises each step's caption on its own entity, says each step on the bus for ui/Hints, and says the
// session's two one-time notices (no seed left, the undo petal).
import { createSystem, type Entity } from '@iwsdk/core';

import { Caption } from '../core/components.js';
import { bus, clock, flags, log, settings, type StringKey } from '../core/index.js';

import { ONBOARD_CAPTION_MS } from './config.js';
import { Onboarding, type OnboardingStep } from './Onboarding.js';

/** UX §3.3: the steps that have a caption, in a headset and in the garden window. */
const CAPTIONS: Partial<Record<OnboardingStep, readonly [xr: StringKey, window: StringKey | null]>> = {
  palm: ['onboardPalm', null], // a pointer is always palm up (LLD §11): the window has no such step to say
  plant: ['onboardPlant', 'onboardPlantClick'],
  listen: ['onboardListen', 'onboardListenClick'],
};

/** The plant step's caption in gaze mode (T-160). */
const GAZE_PLANT: StringKey = 'onboardPlantGaze';
/** The notices said once a session, on their own entity so a step's caption and a notice do not take each other
 *  back: a palm up with no seed left (UX §3.3; a new seed each day), the first removal (UX §7, the undo petal). */
const SEEDS_TOMORROW: StringKey = 'seedsTomorrow';
const UNDO_HINT: StringKey = 'undoHint';

export class OnboardingSystem extends createSystem({}) {
  readonly machine = new Onboarding((from, to) =>
    log.info('onboarding', `no progress in "${from}" for 60 s: on to "${to}" (D-053)`),
  );
  private caption!: Entity;
  private notice!: Entity;
  /** The notices raised this session: each is said once. */
  private readonly noticed = new Set<StringKey>();
  /** The seeds of the supply at the latest `garden:changed`: none, and a palm up gets "More seeds tomorrow". */
  private seeds = 0;
  /** The step last said on the bus. */
  private said: OnboardingStep = 'off';
  /** The steps whose caption was raised this tutorial: each is shown once. */
  private readonly captioned = new Set<OnboardingStep>();
  /** No immersive session while one is open: the garden window (FR-SYS-07). Read once, at `room:tuned`. */
  private inWindow = false;
  private isListening = false;
  /** The plants of the latest `garden:changed`: the tutorial starts on an empty bed only (D-053). */
  private plants = 0;
  /** This session's first `room:signature` was heard: a Re-place's later one starts nothing. */
  private isSigned = false;

  get step(): OnboardingStep {
    return this.machine.step;
  }

  override init(): void {
    this.caption = this.createEntity();
    this.notice = this.createEntity();
    const machine = this.machine;
    this.cleanupFuncs.push(
      // D-053: whenever a session begins on an empty bed, not only on the visit with the starter seeds, so a player
      // who left before planting gets the tutorial again. Hints off in Settings turns it off too.
      bus.on('room:signature', () => {
        if (this.isSigned) return;
        this.isSigned = true;
        machine.signature(this.plants === 0 && !flags.skipOnboarding && settings.get().hintsEnabled);
        this.sync();
      }),
      bus.on('room:tuned', () => {
        this.inWindow = !this.xrManager.isPresenting;
        machine.tuned(!this.inWindow, settings.get().gazeDwell);
        this.sync();
      }),
      bus.on('garden:seedOut', () => {
        machine.seed(true);
        this.sync();
      }),
      bus.on('garden:seedBack', () => {
        machine.seed(false);
        this.sync();
      }),
      bus.on('garden:changed', ({ state, diff }) => {
        this.plants = state.plants.length;
        this.seeds = state.seeds.length;
        machine.changed(diff.added.length);
        this.sync();
      }),
      // The supply is empty (day 1 has 3 seeds; the next comes tomorrow): the garden hands out nothing, so say why.
      bus.on('gesture:palmUp', () => {
        if (this.seeds === 0) this.raiseNotice(SEEDS_TOMORROW);
      }),
      // The first removal of the session: the undo petal is a target (UX §7), one hint while it is there.
      bus.on('garden:removed', () => {
        if (settings.get().hintsEnabled) this.raiseNotice(UNDO_HINT);
      }),
      bus.on('gesture:release', ({ gesture, target }) => {
        if (target?.kind !== 'plant' || (gesture !== 'pull' && gesture !== 'drag')) return;
        machine.released(gesture);
        this.sync();
      }),
      bus.on('listen:enter', () => {
        this.isListening = true;
        this.takeCaption(); // Listen dims the room: no instruction over it
        machine.listened();
        this.sync();
      }),
      bus.on('listen:exit', () => void (this.isListening = false)),
      bus.on('settings:changed', ({ settings: next }) => {
        if (next.hintsEnabled)
          machine.setGazeOnly(next.gazeDwell); // the gaze plants by a look (T-160); it cannot pull or drag
        else machine.stop();
        this.sync();
      }),
      bus.on('xr:sessionEnd', () => {
        machine.reset();
        this.isSigned = false;
        this.captioned.clear();
        this.noticed.clear();
        this.isListening = false;
        if (this.notice.hasComponent(Caption)) this.notice.removeComponent(Caption);
        this.sync();
      }),
    );
  }

  override update(_delta: number, time: number): void {
    // Whole ms: a fraction kept in a field is boxed by V8 (HandSystem's note, API_SPEC §1.4).
    this.machine.tick(Math.round(time * 1000));
    if (this.machine.step !== this.said) this.sync();
  }

  /** Says a new step on the bus, and swaps the caption: the old step's is taken back, the new one's raised once. */
  private sync(): void {
    const step = this.machine.step;
    if (step === this.said) return;
    this.said = step;
    this.takeCaption();
    const keys = CAPTIONS[step];
    const isGaze = step === 'plant' && settings.get().gazeDwell; // T-160: the plant step by a look
    const key = keys === undefined ? null : this.inWindow ? keys[1] : isGaze ? GAZE_PLANT : keys[0];
    if (key !== null && !this.isListening && !this.captioned.has(step)) {
      this.captioned.add(step);
      this.caption.addComponent(Caption, { key, expiresAt: clock.now() + ONBOARD_CAPTION_MS });
    }
    bus.emit('onboarding:step', { step });
  }

  /** Says a notice once a session, through the caption line (CAPTION_MIN_MS, one at a time, FoV); never in Listen. */
  private raiseNotice(key: StringKey): void {
    if (this.isListening || this.noticed.has(key)) return;
    this.noticed.add(key);
    if (this.notice.hasComponent(Caption)) this.notice.removeComponent(Caption); // one live caption per raiser
    this.notice.addComponent(Caption, { key, expiresAt: clock.now() + ONBOARD_CAPTION_MS });
  }

  private takeCaption(): void {
    if (this.caption.hasComponent(Caption)) this.caption.removeComponent(Caption);
  }
}
