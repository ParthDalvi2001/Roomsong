// The guided first minute (UX §3.3, T-150) as a plain state machine: no bus, no ECS, no clock.
// OnboardingSystem feeds it the events; ui/Hints acts out each step from `onboarding:step`.
// D-087 (12 Nov): strict. Each step waits for its own gesture, and `lock` says what may act meanwhile: only that.
// No time-out moves a step on (D-053's net is gone): the guide's Skip button, always live, and Hints off end it.
import type { GuideLock } from '../core/index.js';

/**
 * `off`: no guide (before a session's signature, a bed with plants, after the session, skipped: D-084). `tune`: the
 * ripple plays (UX §3.3 step 0). `palm`: open a hand for the seed. `plant`: a seed is out, plant it. `grow`: pull the
 * plant up. `move`: drag it. `listen`: palms out, then back out of Listen (the wake). `orb`: the settings orb. `tour`: ui/ walks the open board, a
 * setting at a time, and says `onboarding:toured` at its end. `done`: nothing more to teach.
 */
export type OnboardingStep =
  'off' | 'tune' | 'palm' | 'plant' | 'grow' | 'move' | 'listen' | 'orb' | 'tour' | 'done';

/** The release kinds that pass a gate (API_SPEC §1.4 `HeldGesture`). */
export type GateGesture = 'pull' | 'drag';

const lockOf = (
  kinds: readonly string[],
  palmUp = false,
  palmsOut = false,
  shape: GuideLock['shape'] = null,
): GuideLock => Object.freeze({ kinds: Object.freeze(kinds), palmUp, palmsOut, shape });

/**
 * D-087: what may act at each step. 'cell' is gaze mode's plant (a look at a free cell); 'orb' the Listen orb (the
 * garden window's and gaze mode's Listen); 'panel' the settings orb, as the board is closed at the orb step.
 */
const LOCKS: Readonly<Record<OnboardingStep, GuideLock | null>> = {
  off: null,
  tune: lockOf([]),
  palm: lockOf([], true),
  plant: lockOf(['seed', 'cell'], true),
  grow: lockOf(['plant'], false, false, 'pull'),
  move: lockOf(['plant'], false, false, 'drag'),
  listen: lockOf(['orb'], false, true),
  orb: lockOf(['panel']),
  tour: lockOf([]),
  done: null,
};

export class Onboarding {
  step: OnboardingStep = 'off';
  private seedIsOut = false;
  /** Seeds planted since the guide began (`garden:changed` `diff.added`): a removal takes none back. */
  private planted = 0;
  /** A pointer cannot pull (LLD §11): the garden window skips the grow step. */
  private canPull = true;
  /** Gaze dwell: a look at a free cell plants (T-160); the gaze cannot pull or drag. */
  private isGazeOnly = false;
  private hasPulled = false;
  private hasDragged = false;
  private hasListened = false;
  /** Back out of a Listen entered at the Listen step: the step ends there, so the next one is not met inside Listen. */
  private hasWoken = false;
  /** The settings board is open (`panel:open`): the orb step waits for it; closed in the tour, the orb step again. */
  private isPanelOpen = false;
  private hasToured = false;

  /** D-087: what a hand or a look may do now; null when no guide runs. */
  get lock(): GuideLock | null {
    return LOCKS[this.step];
  }

  /**
   * A session's first `room:signature`. `starts`: the bed is empty, a seed is there to plant and nothing turns the
   * guide off (D-053), so a player who left before planting gets it again. A Re-place's signature is not passed.
   */
  signature(starts: boolean): void {
    if (this.step === 'off' && starts) this.step = 'tune';
  }

  /** `room:tuned`: the first step. `canPull` is false in the garden window; `isGazeOnly` with Settings.gazeDwell. */
  tuned(canPull: boolean, isGazeOnly: boolean): void {
    if (this.step !== 'tune') return;
    this.canPull = canPull;
    this.isGazeOnly = isGazeOnly;
    this.step = 'palm';
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

  /** `gesture:release` of a plant: a pull or a drag; counted only at its own step (D-087). */
  released(gesture: GateGesture): void {
    if (gesture === 'pull' && this.step === 'grow') this.hasPulled = true;
    if (gesture === 'drag' && this.step === 'move') this.hasDragged = true;
    this.advance();
  }

  /** `listen:enter`; counted only at the Listen step (D-087). */
  listened(): void {
    if (this.step === 'listen') this.hasListened = true;
    this.advance();
  }

  /** `listen:exit` (not a timed-out one): out of the Listen the step asked for, the step is done. */
  woke(): void {
    if (this.step === 'listen' && this.hasListened) this.hasWoken = true;
    this.advance();
  }

  /** `panel:open`: the settings board opened or closed. */
  panel(isOpen: boolean): void {
    this.isPanelOpen = isOpen;
    this.advance();
  }

  /** `onboarding:toured`: ui/ showed the walkthrough's last setting. */
  toured(): void {
    if (this.step !== 'tour') return;
    this.hasToured = true;
    this.advance();
  }

  /** Hints were turned off (Settings.hintsEnabled): nothing more is taught this session. */
  stop(): void {
    if (this.step !== 'off') this.step = 'done';
  }

  /** D-084 "Skip tutorial": the guide ends at once, quietly, and stays off until a New garden restarts it. */
  skip(): void {
    this.step = 'off';
  }

  /** D-084 New garden in a headset: the guide again from the palm step, the room already tuned. */
  restart(isGazeOnly: boolean): void {
    const isPanelOpen = this.isPanelOpen;
    this.reset();
    this.isPanelOpen = isPanelOpen;
    this.step = 'tune';
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
    this.hasWoken = false;
    this.isPanelOpen = false;
    this.hasToured = false;
  }

  /** Takes every step whose condition already holds. */
  private advance(): void {
    for (let next = this.next(); next !== this.step; next = this.next()) this.step = next;
  }

  private next(): OnboardingStep {
    const step = this.step;
    // The gaze cannot open a hand, pull or drag: straight to the plant step, and from a plant on to Listen.
    if (step === 'palm' || step === 'plant') {
      if (this.planted > 0) return this.isGazeOnly ? 'listen' : this.canPull ? 'grow' : 'move';
      return this.seedIsOut || this.isGazeOnly ? 'plant' : 'palm';
    }
    if (step === 'grow') return this.isGazeOnly ? 'listen' : this.hasPulled ? 'move' : 'grow';
    if (step === 'move') return this.isGazeOnly || this.hasDragged ? 'listen' : 'move';
    // The garden window has no settings orb: its guide ends at Listen.
    if (step === 'listen') return this.hasWoken ? (this.canPull ? 'orb' : 'done') : 'listen';
    if (step === 'orb') return this.isPanelOpen ? 'tour' : 'orb';
    if (step === 'tour') return this.hasToured ? 'done' : this.isPanelOpen ? 'tour' : 'orb';
    return step;
  }
}
