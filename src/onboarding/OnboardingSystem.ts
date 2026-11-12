// The onboarding system (LLD §3, priority 35; API_SPEC §1.10 "Onboarding (T-150)"): feeds the bus to the state
// machine, raises each step's caption on its own entity, says each step on the bus for ui/Hints, and says the
// session's two one-time notices (no seed left, the undo petal).
import { createSystem, type Entity } from '@iwsdk/core';

import { Caption } from '../core/components.js';
import { bus, clock, flags, guide, settings, type StringKey } from '../core/index.js';

import { NO_SEEDS_GAP_MS, NO_SEEDS_SHOW_MS, ONBOARD_CAPTION_MS } from './config.js';
import { Onboarding, type OnboardingStep } from './Onboarding.js';

/** UX §3.3: the steps that have a caption, in a headset and in the garden window. */
const CAPTIONS: Partial<Record<OnboardingStep, readonly [xr: StringKey, window: StringKey | null]>> = {
  palm: ['onboardPalm', null], // a pointer is always palm up (LLD §11): the window has no such step to say
  plant: ['onboardPlant', 'onboardPlantClick'],
  listen: ['onboardListen', 'onboardListenClick'],
  // D-087: the steps the ghost hand acts out say what to do too; the window's drag is shown by its icon alone
  grow: ['onboardGrow', null],
  move: ['onboardMove', null],
  // D-084: the tour runs in a headset only (the window has no orb)
  orb: ['onboardOrb', null],
  tour: ['onboardTour', null],
};

/** The plant step's caption in gaze mode (T-160). */
const GAZE_PLANT: StringKey = 'onboardPlantGaze';
/** The orb step's caption in one-hand or gaze mode: the orb waits in the view box there (PanelSystem). */
const ORB_LOOK: StringKey = 'onboardOrbLook';
/** The notices said once a session, on their own entity so a step's caption and a notice do not take each other
 *  back: the first removal (UX §7, the undo petal), and in the garden window a palm up with no seed left. In a
 *  headset that one is said at every such palm up, on an entity of its own (BUG-056, `sayNoSeeds`). */
const SEEDS_TOMORROW: StringKey = 'seedsTomorrow';
/** The undo hint, as the step captions: for a headset, the garden window (a click), and gaze mode (a dwell). */
const UNDO_HINT: readonly [xr: StringKey, window: StringKey, gaze: StringKey] = [
  'undoHint',
  'undoHintClick',
  'undoHintGaze',
];

export class OnboardingSystem extends createSystem({}) {
  readonly machine = new Onboarding();
  private caption!: Entity;
  private notice!: Entity;
  /** BUG-056: the "no seeds" notice's own entity, so its repeats never take another notice back. */
  private noSeeds!: Entity;
  /** When that notice was last raised, on core's clock. */
  private noSeedsAt = -Infinity;
  /** A bed is placed: between a Re-place and its bed there is no garden to be out of seeds in. */
  private isPlaced = false;
  /** The notices raised this session: each is said once. */
  private readonly noticed = new Set<StringKey>();
  /** The seeds of the supply at the latest `garden:changed` (-1 before one): none, and a palm up gets "More seeds
   *  tomorrow", and at room:tuned no guide goes on (D-087: its palm step would wait for a seed that cannot come). */
  private seeds = -1;
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
    this.noSeeds = this.createEntity();
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
        // D-087: the palm step would wait for a seed that cannot come: none in the supply (the visit's seeds, given
        // after the signature, are in by now), no guide
        if (this.seeds === 0 && machine.step === 'tune') machine.skip();
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
        if (this.seeds === 0) this.sayNoSeeds();
      }),
      bus.on('room:placementLevel', () => {
        this.isPlaced = false; // a placement runs: the old bed is gone
        this.takeNoSeeds();
      }),
      bus.on('room:bedPlaced', () => {
        this.isPlaced = true;
      }),
      // The first removal of the session: the undo petal is a target (UX §7), one hint while it is there.
      bus.on('garden:removed', () => {
        const s = settings.get();
        if (s.hintsEnabled) this.raiseNotice(UNDO_HINT[this.inWindow ? 1 : s.gazeDwell ? 2 : 0], 'undoHint');
      }),
      bus.on('gesture:release', ({ gesture, target }) => {
        if (target?.kind !== 'plant' || (gesture !== 'pull' && gesture !== 'drag')) return;
        machine.released(gesture);
        this.sync();
      }),
      bus.on('listen:enter', () => {
        this.isListening = true;
        this.takeCaption(); // Listen dims the room: no instruction over it but the guide's way back out (D-087)
        this.takeNoSeeds();
        machine.listened();
        this.sync();
        if (machine.step === 'listen') this.sayWake();
      }),
      bus.on('listen:exit', ({ timedOut }) => {
        this.isListening = false;
        // A step reached in Listen (listen:enter ends the Listen step: the orb step, or done) says it now; not after
        // the 10-minute end, whose line is "Goodnight" (UX §3.5): the hint would queue ahead of it.
        if (timedOut) return;
        machine.woke(); // D-087: the Listen step ends out of Listen, so the orb step is seen
        this.sync();
        this.sayStep();
      }),
      bus.on('panel:open', ({ open }) => {
        machine.panel(open);
        this.sync();
      }),
      // D-084: skipped, the guide ends quietly: `off`, its caption taken back, no settings hint.
      bus.on('onboarding:skip', () => {
        machine.skip();
        this.sync();
      }),
      bus.on('onboarding:toured', () => {
        machine.toured();
        this.sync();
      }),
      // D-084: a New garden in a headset starts the guide again at once, from the palm step: the room is tuned.
      bus.on('garden:renewed', () => {
        const s = settings.get();
        if (!s.hintsEnabled || flags.skipOnboarding || this.inWindow || this.isListening) return;
        machine.restart(s.gazeDwell);
        this.captioned.clear();
        this.sync();
        this.sayStep(); // the step it was at already (sync said nothing): its caption again
      }),
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
        this.isPlaced = false;
        this.noSeedsAt = -Infinity;
        this.takeNoSeeds();
        this.sync();
      }),
    );
  }

  /**
   * Says a new step on the bus, and swaps the caption: the old step's is taken back, the new one's raised once. D-087:
   * the step's lock first, so whatever hears the step finds the hands already held to it.
   */
  private sync(): void {
    const step = this.machine.step;
    if (step === this.said) return;
    this.said = step;
    guide.lock = this.machine.lock;
    this.takeCaption();
    this.sayStep();
    bus.emit('onboarding:step', { step });
  }

  /** Raises the current step's caption, once a tutorial and never in Listen. */
  private sayStep(): void {
    const step = this.machine.step;
    const keys = CAPTIONS[step];
    if (keys === undefined || this.isListening || this.captioned.has(step)) return;
    const s = settings.get();
    const key = this.inWindow
      ? keys[1]
      : step === 'plant' && s.gazeDwell // T-160: the plant step by a look
        ? GAZE_PLANT
        : step === 'orb' && (s.oneHand || s.gazeDwell)
          ? ORB_LOOK
          : keys[0];
    if (key === null) return;
    this.captioned.add(step);
    this.takeCaption();
    this.caption.addComponent(Caption, { key, expiresAt: clock.now() + ONBOARD_CAPTION_MS });
  }

  /**
   * Says a notice once a session, through the caption line (CAPTION_MIN_MS, one at a time, FoV); never in Listen.
   * `id` is the notice, apart from its wording: a mode that changes mid-session swaps the twin, not the once.
   */
  private raiseNotice(key: StringKey, id: StringKey = key): void {
    if (this.isListening || this.noticed.has(id)) return;
    this.noticed.add(id);
    if (this.notice.hasComponent(Caption)) this.notice.removeComponent(Caption); // one live caption per raiser
    this.notice.addComponent(Caption, { key, expiresAt: clock.now() + ONBOARD_CAPTION_MS });
  }

  /**
   * BUG-056: a palm up with the supply empty. In a headset, every time, at most once per NO_SEEDS_GAP_MS and for
   * NO_SEEDS_SHOW_MS; never in Listen and never before a bed is placed. In the garden window the pointer is always
   * palm up (LLD §11), so it stays one of the once-a-session notices there.
   */
  private sayNoSeeds(): void {
    if (this.inWindow) return this.raiseNotice(SEEDS_TOMORROW);
    const now = clock.now();
    // `!(... >= gap)`: a clock that stepped back (core's is wall time) says it again rather than never.
    if (
      this.isListening ||
      !this.isPlaced ||
      (now >= this.noSeedsAt && now - this.noSeedsAt < NO_SEEDS_GAP_MS)
    )
      return;
    this.noSeedsAt = now;
    this.takeNoSeeds(); // one live caption per raiser: an entity that still has one would not qualify again
    this.noSeeds.addComponent(Caption, { key: SEEDS_TOMORROW, expiresAt: now + NO_SEEDS_SHOW_MS });
  }

  /** D-087: in Listen at the guide's Listen step, how to come back out: a pinch, a click, or a look at the orb. */
  private sayWake(): void {
    const key: StringKey = this.inWindow
      ? 'onboardWakeClick'
      : settings.get().gazeDwell
        ? 'onboardWakeGaze'
        : 'onboardWake';
    this.takeCaption();
    this.caption.addComponent(Caption, { key, expiresAt: clock.now() + ONBOARD_CAPTION_MS });
  }

  private takeNoSeeds(): void {
    if (this.noSeeds.hasComponent(Caption)) this.noSeeds.removeComponent(Caption);
  }

  private takeCaption(): void {
    if (this.caption.hasComponent(Caption)) this.caption.removeComponent(Caption);
  }
}
