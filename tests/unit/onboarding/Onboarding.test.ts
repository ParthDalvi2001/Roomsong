// T-150, UX §3.3, D-053: the onboarding state machine, every transition, every gate and the 60 s net. Pure: no
// bus, no ECS.
import { describe, expect, it, vi } from 'vitest';

import {
  HINT_RING_AFTER_PLANTS,
  LISTEN_AFTER_MS,
  LISTEN_AFTER_PLANTS,
  LISTEN_STEP_MS,
  ONBOARD_TIP_MS,
  STEP_STALL_MS,
} from '../../../src/onboarding/config.js';
import { Onboarding } from '../../../src/onboarding/Onboarding.js';

const T0 = 12_345_678; // a frame time of real size, ms

/**
 * A machine at `step` the way the bus gets it there in a headset (or the garden window: `canPull` false, no pull).
 * `free` in a headset is passed at once: the gates earned bring the Listen step (step 5).
 */
function at(
  step: 'tune' | 'palm' | 'plant' | 'more' | 'grow' | 'move' | 'free',
  canPull = true,
  onStall?: ConstructorParameters<typeof Onboarding>[0],
): Onboarding {
  const m = new Onboarding(onStall);
  m.tick(T0);
  m.signature(true);
  if (step === 'tune') return m;
  m.tuned(canPull, false);
  if (step === 'palm') return m;
  m.seed(true);
  if (step === 'plant') return m;
  m.changed(1);
  if (step === 'more') return m;
  m.changed(HINT_RING_AFTER_PLANTS - 1);
  if (step === 'grow' || (step === 'move' && !canPull)) return m;
  if (canPull) m.released('pull');
  if (step === 'move') return m;
  m.released('drag');
  return m;
}

describe('Onboarding: the start (UX §3.3 step 0, D-053)', () => {
  it('is off until a signature that starts it; tune until room:tuned; then asks for an open hand', () => {
    const m = new Onboarding();
    expect(m.step).toBe('off');
    m.tuned(true, false); // a tuned with no tutorial does nothing
    expect(m.step).toBe('off');
    m.signature(true);
    expect(m.step).toBe('tune');
    m.tuned(true, false);
    expect(m.step).toBe('palm');
  });

  it('a signature that does not start it (a bed with plants) leaves it off; a later one does not restart it', () => {
    const m = new Onboarding();
    m.signature(false);
    expect(m.step).toBe('off');
    const running = at('more');
    running.signature(true);
    expect(running.step).toBe('more');
  });

  it('a seed already out at room:tuned (the palm was up during the ripple, or a pointer) skips the palm step', () => {
    const m = at('tune');
    m.seed(true);
    expect(m.step).toBe('tune'); // the ripple's captions first
    m.tuned(true, false);
    expect(m.step).toBe('plant');
  });

  it('a seed planted during the ripple skips the palm and the plant step', () => {
    const m = at('tune');
    m.seed(true);
    m.changed(1);
    m.tuned(true, false);
    expect(m.step).toBe('more');
  });

  it('gaze dwell (T-160): straight to the plant step, then past the pull and the drag; also when turned on', () => {
    const m = at('tune');
    m.tuned(true, true);
    expect(m.step).toBe('plant'); // no hand to open
    m.changed(1); // a look planted the seed
    expect(m.step).toBe('free');
    m.tick(T0 + LISTEN_AFTER_MS);
    expect(m.step).toBe('listen'); // Listen is still taught
    const later = at('grow');
    later.setGazeOnly(true);
    expect(later.step).toBe('free');
    const off = at('grow');
    off.setGazeOnly(false);
    expect(off.step).toBe('grow');
  });
});

describe('Onboarding: gate 1, the pinch (steps 1 to 3)', () => {
  it('palm -> plant on garden:seedOut; plant -> palm on garden:seedBack; plant -> more on the first plant', () => {
    const m = at('palm');
    m.seed(true);
    expect(m.step).toBe('plant');
    m.seed(false); // released off the bed: the seed went home
    expect(m.step).toBe('palm');
    m.seed(true);
    m.changed(0); // a change that plants nothing passes no gate
    expect(m.step).toBe('plant');
    m.changed(1);
    expect(m.step).toBe('more');
  });

  it('more holds through the 2nd and 3rd seed with no hint, and a pull or a drag there passes no step yet', () => {
    const m = at('more');
    m.seed(true);
    m.seed(false);
    m.released('pull');
    m.changed(HINT_RING_AFTER_PLANTS - 2);
    expect(m.step).toBe('more');
    m.changed(1);
    expect(m.step).toBe('move'); // the pull made early counts: its gate is passed
  });

  it('counts plantings, not plants on the bed: removals cannot bring the ring early or skip it', () => {
    const m = at('more');
    m.changed(0); // a removal: nothing added
    m.changed(1);
    expect(m.step).toBe('more'); // two planted, whatever the bed holds now
    m.changed(1);
    expect(m.step).toBe('grow');
  });
});

describe('Onboarding: gates 2 and 3, grow then move (step 4)', () => {
  it('more -> grow at 3 plantings; a drag is not the grow gate; the pull then passes both', () => {
    const m = at('more');
    m.changed(HINT_RING_AFTER_PLANTS - 1);
    expect(m.step).toBe('grow');
    m.released('drag');
    expect(m.step).toBe('grow');
    m.released('pull');
    expect(m.step).toBe('listen'); // the drag made before counts for the move gate; both earned: step 5
  });

  it('grow -> move -> listen, one at a time: both gates earned, Listen is taught at once (day 1 has 3 seeds)', () => {
    const m = at('grow');
    m.released('pull');
    expect(m.step).toBe('move');
    m.released('drag');
    expect(m.step).toBe('listen');
  });

  it('a gate the net passed is not earned: free, and the 4-minute net brings Listen', () => {
    const m = at('grow');
    m.tick(T0 + STEP_STALL_MS); // the pull never came
    expect(m.step).toBe('move');
    m.released('drag');
    expect(m.step).toBe('free');
    m.tick(T0 + LISTEN_AFTER_MS);
    expect(m.step).toBe('listen');
  });

  it('the garden window (a pointer cannot pull) goes from more straight to move', () => {
    const m = at('more', false);
    m.changed(HINT_RING_AFTER_PLANTS - 1);
    expect(m.step).toBe('move');
    m.released('drag');
    expect(m.step).toBe('free');
  });
});

describe('Onboarding: the 60 s net (D-053): no one is stuck', () => {
  it('each gate step with no progress for STEP_STALL_MS gives way to the next, and says so', () => {
    const stalls: string[] = [];
    const pairs = [
      ['more', 'grow'],
      ['grow', 'move'],
      ['move', 'free'],
    ] as const;
    for (const [from, to] of pairs) {
      const m = at(from, true, (was, now) => stalls.push(`${was}>${now}`));
      m.tick(T0 + STEP_STALL_MS - 1);
      expect(m.step).toBe(from);
      m.tick(T0 + STEP_STALL_MS);
      expect(m.step).toBe(to);
    }
    expect(stalls).toEqual(['more>grow', 'grow>move', 'move>free']);
  });

  it('palm and plant have no net: with nothing planted, nothing teaches shaping a plant (D-061)', () => {
    const onStall = vi.fn();
    const m = at('palm', true, onStall);
    m.tick(T0 + 10 * STEP_STALL_MS);
    expect(m.step).toBe('palm');
    m.seed(true);
    expect(m.step).toBe('plant');
    m.tick(T0 + 20 * STEP_STALL_MS);
    expect(m.step).toBe('plant');
    expect(onStall).not.toHaveBeenCalled();
  });

  it('progress restarts the clock; the garden window steps from more to move', () => {
    const m = at('palm');
    m.tick(T0 + STEP_STALL_MS - 1000);
    m.seed(true); // progress: the plant step begins now
    m.tick(T0 + STEP_STALL_MS + 1000);
    expect(m.step).toBe('plant');
    const onStall = vi.fn();
    const window = at('more', false, onStall);
    window.tick(T0 + STEP_STALL_MS);
    expect(window.step).toBe('move');
    expect(onStall).toHaveBeenCalledWith('more', 'move');
  });

  it('tune, free, listen and done have no net (they have their own ends)', () => {
    const m = at('tune');
    m.tick(T0 + 10 * STEP_STALL_MS);
    expect(m.step).toBe('tune');
    const free = at('free', false);
    free.tick(T0 + STEP_STALL_MS);
    expect(free.step).toBe('free');
  });
});

describe('Onboarding: step 5, Listen (the gates earned, 4 min or 6 plantings)', () => {
  it('free -> listen 4 minutes after room:tuned (the garden window: no pull to earn); listen -> done on listen:enter', () => {
    const m = at('free', false);
    m.tick(T0 + LISTEN_AFTER_MS - 1);
    expect(m.step).toBe('free');
    m.tick(T0 + LISTEN_AFTER_MS);
    expect(m.step).toBe('listen');
    m.listened();
    expect(m.step).toBe('done');
  });

  it('free -> listen at 6 plantings; listen -> done LISTEN_STEP_MS later when nobody listens', () => {
    const m = at('free', false);
    m.tick(T0 + 1000);
    m.changed(LISTEN_AFTER_PLANTS - HINT_RING_AFTER_PLANTS);
    expect(m.step).toBe('listen');
    m.tick(T0 + 1000 + LISTEN_STEP_MS - 1);
    expect(m.step).toBe('listen');
    m.tick(T0 + 1000 + LISTEN_STEP_MS);
    expect(m.step).toBe('done');
  });

  it('a player who found Listen before is not told: done instead of listen (the window), the tour (a headset)', () => {
    const m = at('free', false);
    m.listened();
    expect(m.step).toBe('free');
    m.tick(T0 + LISTEN_AFTER_MS);
    expect(m.step).toBe('done');
    const earned = at('move');
    earned.listened();
    earned.released('drag');
    expect(earned.step).toBe('orb');
  });
});

describe('Onboarding: the tour after Listen (D-084)', () => {
  it('listen -> orb, which waits for the board; seedsTip and moveTip ONBOARD_TIP_MS each; then done', () => {
    const m = at('free');
    expect(m.step).toBe('listen');
    m.listened();
    expect(m.step).toBe('orb');
    m.tick(T0 + 10 * STEP_STALL_MS); // no net: the orb step waits for the board
    expect(m.step).toBe('orb');
    m.panel(true);
    expect(m.step).toBe('seedsTip');
    const at0 = T0 + 10 * STEP_STALL_MS;
    m.tick(at0 + ONBOARD_TIP_MS - 1);
    expect(m.step).toBe('seedsTip');
    m.tick(at0 + ONBOARD_TIP_MS);
    expect(m.step).toBe('moveTip');
    m.tick(at0 + 2 * ONBOARD_TIP_MS - 1);
    expect(m.step).toBe('moveTip');
    m.tick(at0 + 2 * ONBOARD_TIP_MS);
    expect(m.step).toBe('done');
    expect(m.toured).toBe(true);
  });

  it('a board already open passes the orb step at once; the board closed during a tip ends the tour', () => {
    const m = at('free');
    m.panel(true);
    m.tick(T0 + LISTEN_STEP_MS); // nobody listened: on to the tour
    expect(m.step).toBe('seedsTip');
    m.panel(false);
    expect(m.step).toBe('done');
    const late = at('free');
    late.panel(true);
    late.listened();
    late.tick(T0 + ONBOARD_TIP_MS);
    expect(late.step).toBe('moveTip');
    late.panel(false);
    expect(late.step).toBe('done');
  });

  it('the garden window has no orb: listen -> done, no tour', () => {
    const m = at('free', false);
    m.panel(true);
    m.tick(T0 + LISTEN_AFTER_MS);
    m.listened();
    expect(m.step).toBe('done');
    expect(m.toured).toBe(false);
  });
});

describe('Onboarding: skip and restart (D-084)', () => {
  it('skip ends the guide at once, off, and nothing of the session starts it again (the system passes no later signature)', () => {
    const m = at('more');
    m.skip();
    expect(m.step).toBe('off');
    m.changed(LISTEN_AFTER_PLANTS);
    m.released('pull');
    m.listened();
    m.panel(true);
    m.tick(T0 + 10 * LISTEN_AFTER_MS);
    m.tuned(true, false);
    m.stop();
    expect(m.step).toBe('off');
  });

  it('restart (New garden): the palm step at once, every gate again; the board stays as it is', () => {
    const m = at('free');
    m.panel(true);
    m.listened();
    m.skip();
    m.restart(false);
    expect(m.step).toBe('palm');
    expect(m.toured).toBe(false);
    m.seed(true);
    m.changed(HINT_RING_AFTER_PLANTS);
    expect(m.step).toBe('grow'); // the pull and the drag before are forgotten
    m.released('pull');
    m.released('drag');
    m.listened();
    expect(m.step).toBe('seedsTip'); // the board opened before the restart is still open
    const gaze = at('more');
    gaze.restart(true);
    expect(gaze.step).toBe('plant'); // gaze mode: no hand to open
  });
});

describe('Onboarding: stop and reset', () => {
  it('stop (hints turned off) ends a running tutorial and leaves an idle one off', () => {
    const m = at('plant');
    m.stop();
    expect(m.step).toBe('done');
    m.seed(false);
    expect(m.step).toBe('done');
    const idle = new Onboarding();
    idle.stop();
    expect(idle.step).toBe('off');
  });

  it('reset (the session ended) forgets everything: the next tutorial passes every gate again', () => {
    const m = at('free');
    m.listened();
    m.reset();
    expect(m.step).toBe('off');
    m.signature(true);
    m.tuned(true, false);
    expect(m.step).toBe('palm'); // the seed out before is forgotten
    m.seed(true);
    m.changed(HINT_RING_AFTER_PLANTS);
    expect(m.step).toBe('grow'); // the pull and the drag before are forgotten
  });
});
