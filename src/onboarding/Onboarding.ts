// The guided first minute (UX §3.3, T-150) as a plain state machine: no bus, no ECS, no clock of its own.
// OnboardingSystem feeds it the events and the frame time; ui/Hints draws each step's icon from `onboarding:step`.
// Mastery gates, one at a time: pinch (a seed planted), grow (a pull), move (a drag). No one is stuck: a gate step
// that makes no progress for STEP_STALL_MS gives way to the next one (D-053), from a first plant on (D-061).
import {
  HINT_RING_AFTER_PLANTS,
  LISTEN_AFTER_MS,
  LISTEN_AFTER_PLANTS,
  LISTEN_STEP_MS,
  ONBOARD_TIP_MS,
  STEP_STALL_MS,
} from './config.js';

/**
 * `off`: no tutorial (before a session's signature, a bed with plants, after the session, skipped: D-084). `tune`: the ripple
 * plays (UX §3.3 step 0). `palm`: open a hand for the seed (1). `plant`: a seed is out, plant it (2). `more`: the
 * 2nd and 3rd seeds, no hint (3). `grow` / `move`: the hint ring with the pull or the drag icon (4). `free`: the
 * gates are done but not all earned (the net, or the garden window's); earned, it is passed at once. `listen`:
 * "Show your palms to listen" (5). `orb`, `seedsTip`, `moveTip`: the tour (D-084), the board opened, then Seeds and
 * Move lit on it; not in the garden window (no orb). `done`: nothing more to teach.
 */
export type OnboardingStep =
  | 'off'
  | 'tune'
  | 'palm'
  | 'plant'
  | 'more'
  | 'grow'
  | 'move'
  | 'free'
  | 'listen'
  // D-084 (10 Nov): the guide's tour after Listen: open the settings orb, then Seeds and Move lit on the board
  | 'orb'
  | 'seedsTip'
  | 'moveTip'
  | 'done';

/** The release kinds that pass a gate (API_SPEC §1.4 `HeldGesture`). */
export type GateGesture = 'pull' | 'drag';

/** The steps in order. A step forced by the net is a floor: the machine does not go back below it. */
const ORDER: readonly OnboardingStep[] = [
  'off',
  'tune',
  'palm',
  'plant',
  'more',
  'grow',
  'move',
  'free',
  'listen',
  'orb',
  'seedsTip',
  'moveTip',
  'done',
];
const order = (step: OnboardingStep): number => ORDER.indexOf(step);
/** The steps that wait for the player. Gaze mode keeps the plant gate only. */
const isGate = (step: OnboardingStep): boolean =>
  order(step) >= order('palm') && order(step) <= order('move');

export class Onboarding {
  step: OnboardingStep = 'off';
  private seedIsOut = false;
  /** Seeds planted since the tutorial began (`garden:changed` `diff.added`): a removal takes none back. */
  private planted = 0;
  /** A pointer cannot pull (LLD §11): the garden window skips the grow gate. */
  private canPull = true;
  /** Gaze dwell: a look at a free cell plants (T-160), so the plant gate is taught; the gaze cannot pull or drag. */
  private isGazeOnly = false;
  private hasPulled = false;
  private hasDragged = false;
  private hasListened = false;
  /** The settings board is open (`panel:open`): the orb step waits for it, the tips end when it closes. */
  private isPanelOpen = false;
  /** The tour (D-084) began this tutorial: the system's settings hint at `done` is then not needed. */
  private hasToured = false;
  /** The latest frame time, ms; when the tutorial, the current step and its Listen step began. */
  private nowMs = 0;
  private startedMs = 0;
  private stepAtMs = 0;
  private listenAtMs = 0;

  /** `onStall` hears each step the net moved on from, and the one it moved to: the system logs it. */
  constructor(private readonly onStall: (from: OnboardingStep, to: OnboardingStep) => void = () => {}) {}

  /**
   * A session's first `room:signature`. `starts`: the bed is empty and nothing turns the tutorial off (D-053), so
   * a player who left before planting gets it again. A Re-place's signature, later in the session, is not passed.
   */
  signature(starts: boolean): void {
    if (this.step === 'off' && starts) this.go('tune');
  }

  /**
   * `room:tuned`: the first caption may come (UX §3.3 step 0). `canPull` is false in the garden window;
   * `isGazeOnly` with Settings.gazeDwell on.
   */
  tuned(canPull: boolean, isGazeOnly: boolean): void {
    if (this.step !== 'tune') return;
    this.canPull = canPull;
    this.isGazeOnly = isGazeOnly;
    this.startedMs = this.nowMs;
    this.go('palm');
    this.advance();
  }

  /** Settings.gazeDwell changed: on, the gates still to come but planting are skipped. */
  setGazeOnly(isGazeOnly: boolean): void {
    this.isGazeOnly = isGazeOnly;
    this.advance();
  }

  /** `garden:seedOut` and `garden:seedBack`: a seed rests on a hand, or went home. */
  seed(isOut: boolean): void {
    this.seedIsOut = isOut;
    this.advance();
  }

  /** Every `garden:changed`: `added` plants planted (or put back by an undo). A planted seed is no longer out. */
  changed(added: number): void {
    if (this.step === 'off' || added === 0) return;
    this.planted += added;
    this.seedIsOut = false;
    this.advance();
  }

  /** `gesture:release` of a plant: a pull or a drag passes its gate, whenever it is made. */
  released(gesture: GateGesture): void {
    if (gesture === 'pull') this.hasPulled = true;
    else this.hasDragged = true;
    this.advance();
  }

  /** `listen:enter`: the player found Listen, so its step is not needed any more. */
  listened(): void {
    this.hasListened = true;
    this.advance();
  }

  /** `panel:open`: the settings board opened or closed. */
  panel(isOpen: boolean): void {
    this.isPanelOpen = isOpen;
    this.advance();
  }

  get toured(): boolean {
    return this.hasToured;
  }

  /** Every frame, with the frame time in whole ms: the time-outs and the net. */
  tick(nowMs: number): void {
    this.nowMs = nowMs;
    this.advance();
    const step = this.step;
    // D-061: no net on palm and plant. What follows them teaches shaping a plant, so with none planted their hint
    // stays, the true one. Nothing waits on a hint: the player can still do everything.
    if (!isGate(step) || order(step) <= order('plant') || nowMs - this.stepAtMs < STEP_STALL_MS) return;
    const to = step === 'more' && !this.canPull ? 'move' : ORDER[order(step) + 1]!;
    this.go(to);
    this.onStall(step, to);
    this.advance();
  }

  /** Hints were turned off (Settings.hintsEnabled): nothing more is taught this session. */
  stop(): void {
    if (this.step !== 'off') this.go('done');
  }

  /** D-084 "Skip guide": the guide ends at once, quietly, and stays off until a New garden restarts it. */
  skip(): void {
    this.go('off');
  }

  /** D-084 New garden in a headset: the guide again from the palm step, the room already tuned. The board stays. */
  restart(isGazeOnly: boolean): void {
    const isPanelOpen = this.isPanelOpen;
    this.reset();
    this.isPanelOpen = isPanelOpen;
    this.go('tune');
    this.tuned(true, isGazeOnly);
  }

  /** `xr:sessionEnd`: nothing of one session reaches the next. */
  reset(): void {
    this.step = 'off';
    this.seedIsOut = false;
    this.planted = 0;
    this.canPull = true;
    this.isGazeOnly = false;
    this.hasPulled = false;
    this.hasDragged = false;
    this.hasListened = false;
    this.isPanelOpen = false;
    this.hasToured = false;
    this.startedMs = 0;
    this.stepAtMs = 0;
    this.listenAtMs = 0;
  }

  private go(step: OnboardingStep): void {
    this.step = step;
    this.stepAtMs = this.nowMs;
    if (step === 'listen') this.listenAtMs = this.nowMs;
    if (step === 'orb') this.hasToured = true;
  }

  /** After Listen: the tour, but not in the garden window (`canPull` false there), which has no orb. */
  private afterListen(): OnboardingStep {
    return this.canPull ? 'orb' : 'done';
  }

  /** Takes every step whose condition already holds: an action made early skips its step. */
  private advance(): void {
    for (;;) {
      const next = this.next();
      if (next === this.step) return;
      this.go(next);
    }
  }

  private next(): OnboardingStep {
    const step = this.step;
    // Gaze: no hand to open, so straight to the plant step; after a plant, or the net, past the pull and the drag.
    if (isGate(step) && this.isGazeOnly)
      return this.planted > 0 || order(step) > order('plant') ? 'free' : 'plant';
    if (step === 'palm' || step === 'plant') {
      if (this.planted > 0) return 'more';
      return this.seedIsOut ? 'plant' : 'palm';
    }
    if (step === 'more' || step === 'grow' || step === 'move' || step === 'free') {
      // The Listen step: when both gates are earned (day 1 has 3 seeds, so LISTEN_AFTER_PLANTS is a later visit's
      // net), 4 minutes on, or at 6 plantings. A gate the net passed is not earned: its player gets the 4 minutes.
      const isLate =
        (step === 'free' && this.hasPulled && this.hasDragged) ||
        this.nowMs - this.startedMs >= LISTEN_AFTER_MS ||
        this.planted >= LISTEN_AFTER_PLANTS;
      if (isLate) return this.hasListened ? this.afterListen() : 'listen';
      if (step === 'more') {
        if (this.planted < HINT_RING_AFTER_PLANTS) return 'more';
        return this.canPull ? 'grow' : 'move';
      }
      if (step === 'grow') return this.hasPulled ? 'move' : 'grow';
      if (step === 'move') return this.hasDragged ? 'free' : 'move';
      return 'free';
    }
    if (step === 'listen') {
      return this.hasListened || this.nowMs - this.listenAtMs >= LISTEN_STEP_MS
        ? this.afterListen()
        : 'listen';
    }
    if (step === 'orb') return this.isPanelOpen ? 'seedsTip' : 'orb';
    if (step === 'seedsTip' || step === 'moveTip') {
      if (!this.isPanelOpen) return 'done'; // the board closed: the rest of the tour is not shown on it
      if (this.nowMs - this.stepAtMs < ONBOARD_TIP_MS) return step;
      return step === 'seedsTip' ? 'moveTip' : 'done';
    }
    return step;
  }
}
