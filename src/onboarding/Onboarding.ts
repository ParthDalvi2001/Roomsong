// The guided first minute (UX §3.3, T-150) as a plain state machine: no bus, no ECS, no clock of its own (the frame
// time comes in only for the settings tips). OnboardingSystem feeds it the events; ui/Hints draws each step, its
// icon, its ring and its dotted arrow (D-089), from `onboarding:step`.
// D-090 (12 Nov): strict. Each step moves on only on its own gesture, and `lock` says what may act meanwhile: only
// that. No time-out moves a step on (D-053's net is gone): the always-live "Skip tutorial" and Hints off end it.
import { ONBOARD_TIP_MS } from './config.js';

import type { GuideLock } from '../core/index.js';

/**
 * `off`: no guide (before a session's signature, a bed with plants, after the session, skipped: D-084). `tune`: the
 * ripple plays (UX §3.3 step 0). `palm`: open a hand for the seed. `plant`: a seed is out, plant it. `grow`: pull
 * the plant up. `move`: drag it along the bed. `remove`: drag it off the bed. `undo`: pinch its petal to bring it
 * back. `listen`: palms out, then back out of Listen (the wake). `orb`: the settings orb. `seedsTip`, `moveTip`:
 * Seeds and Move lit on the open board, ONBOARD_TIP_MS each (D-084). `done`: nothing more to teach.
 */
export type OnboardingStep =
  | 'off'
  | 'tune'
  | 'palm'
  | 'plant'
  | 'grow'
  | 'move'
  | 'remove'
  | 'undo'
  | 'listen'
  | 'orb'
  | 'seedsTip'
  | 'moveTip'
  | 'done';

/** The release kinds that pass a gate (API_SPEC §1.4 `HeldGesture`). */
export type GateGesture = 'pull' | 'drag';

const lockOf = (
  kinds: readonly string[],
  palmUp = false,
  palmsOut = false,
  shape: GuideLock['shape'] = null,
): GuideLock => Object.freeze({ kinds: Object.freeze(kinds), palmUp, palmsOut, shape });

/**
 * D-090: what may act at each step. 'cell' is gaze mode's plant (a look at a free cell); 'undo' the petal; 'orb' the
 * Listen orb (the garden window's and gaze mode's Listen); 'panel' the settings orb, the board being closed then.
 */
const LOCKS: Readonly<Record<OnboardingStep, GuideLock | null>> = {
  off: null,
  tune: lockOf([]),
  palm: lockOf([], true),
  plant: lockOf(['seed', 'cell'], true),
  grow: lockOf(['plant'], false, false, 'pull'),
  move: lockOf(['plant'], false, false, 'drag'),
  remove: lockOf(['plant'], false, false, 'drag'),
  undo: lockOf(['undo']),
  listen: lockOf(['orb'], false, true),
  orb: lockOf(['panel']),
  seedsTip: lockOf([]),
  moveTip: lockOf([]),
  done: null,
};

export class Onboarding {
  step: OnboardingStep = 'off';
  private seedIsOut = false;
  /** Seeds planted since the guide began (`garden:changed` `diff.added`). */
  private planted = 0;
  /** A pointer cannot pull (LLD §11): the garden window skips the grow step. */
  private canPull = true;
  /** Gaze dwell: a look at a free cell plants (T-160); the gaze cannot pull or drag. */
  private isGazeOnly = false;
  private hasPulled = false;
  private hasDragged = false;
  private hasRemoved = false;
  private isUndone = false;
  private hasListened = false;
  /** Back out of a Listen entered at the Listen step: the orb step is never met inside Listen (the guide hides there). */
  private hasWoken = false;
  /** The settings board is open (`panel:open`): the orb step waits for it, the tips end when it closes. */
  private isPanelOpen = false;
  /** The tour (D-084) began this guide: the system's settings hint at `done` is then not needed. */
  private hasToured = false;
  /** The latest frame time, ms, and when the current step began: the tips' time only. */
  private nowMs = 0;
  private stepAtMs = 0;

  /** D-090: what a hand or a look may do now; null when no guide runs. */
  get lock(): GuideLock | null {
    return LOCKS[this.step];
  }

  get toured(): boolean {
    return this.hasToured;
  }

  /**
   * A session's first `room:signature`. `starts`: the bed is empty and nothing turns the guide off (D-053), so a
   * player who left before planting gets it again. A Re-place's signature, later in the session, is not passed.
   */
  signature(starts: boolean): void {
    if (this.step === 'off' && starts) this.go('tune');
  }

  /** `room:tuned`: the first step. `canPull` is false in the garden window; `isGazeOnly` with Settings.gazeDwell. */
  tuned(canPull: boolean, isGazeOnly: boolean): void {
    if (this.step !== 'tune') return;
    this.canPull = canPull;
    this.isGazeOnly = isGazeOnly;
    this.go('palm');
    this.advance();
  }

  /** Settings.gazeDwell changed: on, the steps the gaze cannot do are passed. */
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

  /** `gesture:release` of a plant: a pull counts at the grow step, a drag at the move step, and nowhere else. */
  released(gesture: GateGesture): void {
    if (gesture === 'pull' && this.step === 'grow') this.hasPulled = true;
    if (gesture === 'drag' && this.step === 'move') this.hasDragged = true;
    this.advance();
  }

  /** `garden:removed` at the move or the remove step (a drag off the bed in the move step makes both at once). */
  removed(): void {
    if (this.step === 'move' || this.step === 'remove') this.hasRemoved = true;
    this.advance();
  }

  /** The removed plant came back by its petal, at the undo step. */
  undone(): void {
    if (this.step === 'undo') this.isUndone = true;
    this.advance();
  }

  /**
   * The petal faded unpinched at the undo step: back to the remove step, so the lesson runs from a removal to the
   * plant back; with no plant left to remove, on to Listen.
   */
  petalGone(hasPlants: boolean): void {
    if (this.step !== 'undo') return;
    if (hasPlants) {
      this.hasRemoved = false;
      this.go('remove');
    } else this.isUndone = true;
    this.advance();
  }

  /** `listen:enter`, at the Listen step. */
  listened(): void {
    if (this.step === 'listen') this.hasListened = true;
    this.advance();
  }

  /** `listen:exit` (not a timed-out one), out of the Listen the step asked for. */
  woke(): void {
    if (this.step === 'listen' && this.hasListened) this.hasWoken = true;
    this.advance();
  }

  /** `panel:open`: the settings board opened or closed. */
  panel(isOpen: boolean): void {
    this.isPanelOpen = isOpen;
    this.advance();
  }

  /** Every frame, with the frame time in whole ms: the tips' time. */
  tick(nowMs: number): void {
    this.nowMs = nowMs;
    this.advance();
  }

  /** Hints were turned off (Settings.hintsEnabled): nothing more is taught this session. */
  stop(): void {
    if (this.step !== 'off') this.go('done');
  }

  /** D-084 "Skip tutorial": the guide ends at once, quietly, and stays off until a New garden restarts it. */
  skip(): void {
    this.go('off');
  }

  /** D-084 New garden in a headset: the guide again from the palm step, the room already tuned. */
  restart(isGazeOnly: boolean): void {
    const isPanelOpen = this.isPanelOpen;
    const nowMs = this.nowMs;
    this.reset();
    this.isPanelOpen = isPanelOpen;
    this.nowMs = nowMs;
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
    this.hasRemoved = false;
    this.isUndone = false;
    this.hasListened = false;
    this.hasWoken = false;
    this.isPanelOpen = false;
    this.hasToured = false;
    this.stepAtMs = 0;
  }

  private go(step: OnboardingStep): void {
    this.step = step;
    this.stepAtMs = this.nowMs;
    if (step === 'orb') this.hasToured = true;
  }

  /** Takes every step whose condition already holds. */
  private advance(): void {
    for (let next = this.next(); next !== this.step; next = this.next()) this.go(next);
  }

  private next(): OnboardingStep {
    const step = this.step;
    // The gaze cannot open a hand, pull or drag: straight to the plant step, and from a plant on to Listen.
    if (step === 'palm' || step === 'plant') {
      if (this.planted > 0) return this.isGazeOnly ? 'listen' : this.canPull ? 'grow' : 'move';
      return this.seedIsOut || this.isGazeOnly ? 'plant' : 'palm';
    }
    if (step === 'grow') return this.isGazeOnly ? 'listen' : this.hasPulled ? 'move' : 'grow';
    if (step === 'move') return this.isGazeOnly ? 'listen' : this.hasDragged ? 'remove' : 'move';
    if (step === 'remove') return this.hasRemoved ? 'undo' : 'remove';
    if (step === 'undo') return this.isUndone ? 'listen' : 'undo';
    // The garden window has no settings orb: its guide ends at Listen.
    if (step === 'listen') return this.hasWoken ? (this.canPull ? 'orb' : 'done') : 'listen';
    if (step === 'orb') return this.isPanelOpen ? 'seedsTip' : 'orb';
    if (step === 'seedsTip' || step === 'moveTip') {
      if (!this.isPanelOpen) return 'done'; // the board closed: the rest of the tour is not shown on it
      if (this.nowMs - this.stepAtMs < ONBOARD_TIP_MS) return step;
      return step === 'seedsTip' ? 'moveTip' : 'done';
    }
    return step;
  }
}
