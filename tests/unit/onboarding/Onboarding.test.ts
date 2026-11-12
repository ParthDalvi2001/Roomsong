// T-150, UX §3.3, D-090: the strict guide's state machine, every transition and every step's lock. Pure: no bus,
// no ECS; the frame time for the settings tips only.
import { describe, expect, it } from 'vitest';

import { ONBOARD_TIP_MS } from '../../../src/onboarding/config.js';
import { Onboarding, type OnboardingStep } from '../../../src/onboarding/Onboarding.js';

const T0 = 12_345_678; // a frame time of real size, ms

/** A machine at `step` the way the bus gets it there in a headset (or the garden window: `canPull` false). */
function at(step: OnboardingStep, canPull = true): Onboarding {
  const m = new Onboarding();
  m.tick(T0);
  m.signature(true);
  if (step === 'tune') return m;
  m.tuned(canPull, false);
  if (step === 'palm') return m;
  m.seed(true);
  if (step === 'plant') return m;
  m.changed(1);
  if (step === 'grow' || (step === 'move' && !canPull)) return m;
  if (canPull) m.released('pull');
  if (step === 'move') return m;
  m.released('drag');
  if (step === 'remove') return m;
  m.removed();
  if (step === 'undo') return m;
  m.undone();
  if (step === 'listen') return m;
  m.listened();
  m.woke();
  if (step === 'orb' || step === 'done') return m;
  m.panel(true);
  return m;
}

describe('Onboarding: the start (UX §3.3 step 0, D-053)', () => {
  it('is off until a signature that starts it; tune until room:tuned; then asks for an open hand', () => {
    const m = new Onboarding();
    m.tuned(true, false); // not started: nothing
    expect(m.step).toBe('off');
    m.signature(true);
    expect(m.step).toBe('tune');
    m.tuned(true, false);
    expect(m.step).toBe('palm');
  });

  it('a signature that does not start it leaves it off; a later one does not restart a running guide', () => {
    const m = new Onboarding();
    m.signature(false);
    expect(m.step).toBe('off');
    const running = at('grow');
    running.signature(true);
    expect(running.step).toBe('grow');
  });

  it('a seed already out at room:tuned skips the palm step; a seed planted during the ripple, the plant step', () => {
    const out = new Onboarding();
    out.signature(true);
    out.seed(true);
    out.tuned(true, false);
    expect(out.step).toBe('plant');
    const planted = new Onboarding();
    planted.signature(true);
    planted.tuned(true, false);
    planted.changed(1);
    expect(planted.step).toBe('grow');
  });
});

describe('Onboarding: strict, one step at a time (D-090)', () => {
  it('palm, plant, grow, move, remove, undo, listen, orb, the two tips, done: each on its own gesture only', () => {
    const m = at('palm');
    m.released('drag'); // gestures of later steps count for nothing now
    m.removed();
    m.listened();
    expect(m.step).toBe('palm');
    m.seed(true);
    expect(m.step).toBe('plant');
    m.seed(false); // the seed went home: back to the palm
    expect(m.step).toBe('palm');
    m.seed(true);
    m.changed(1); // the first plant: straight on to the pull, no more seeds first
    expect(m.step).toBe('grow');
    m.released('drag'); // not the pull
    m.changed(5); // nor more plantings
    expect(m.step).toBe('grow');
    m.released('pull');
    expect(m.step).toBe('move');
    m.released('drag');
    expect(m.step).toBe('remove');
    m.undone(); // nothing removed yet: nothing to undo
    expect(m.step).toBe('remove');
    m.removed();
    expect(m.step).toBe('undo');
    m.undone();
    expect(m.step).toBe('listen');
    m.woke(); // no Listen yet: a wake passes nothing
    expect(m.step).toBe('listen');
    m.listened();
    expect(m.step).toBe('listen'); // in Listen still: the step ends out of it, so the orb step is seen
    m.woke();
    expect(m.step).toBe('orb');
    m.panel(true);
    expect(m.step).toBe('seedsTip');
    m.tick(T0 + ONBOARD_TIP_MS - 1);
    expect(m.step).toBe('seedsTip');
    m.tick(T0 + ONBOARD_TIP_MS);
    expect(m.step).toBe('moveTip');
    m.tick(T0 + 2 * ONBOARD_TIP_MS);
    expect(m.step).toBe('done');
  });

  it('no time-out moves a step on: a stalled step waits, however long', () => {
    for (const step of ['palm', 'grow', 'move', 'remove', 'undo', 'listen', 'orb'] as const) {
      const m = at(step);
      m.tick(T0 + 60 * 60_000);
      expect(m.step, step).toBe(step);
    }
  });

  it('a drag off the bed in the move step passes the move and the remove steps at once, either order of events', () => {
    const removedFirst = at('move');
    removedFirst.removed(); // garden:removed is said inside the release's own dispatch
    removedFirst.released('drag');
    expect(removedFirst.step).toBe('undo');
    const releasedFirst = at('move');
    releasedFirst.released('drag');
    releasedFirst.removed();
    expect(releasedFirst.step).toBe('undo');
  });

  it('a petal that fades unpinched: back to the remove step; with no plant left, on to Listen', () => {
    const m = at('undo');
    m.petalGone(true);
    expect(m.step).toBe('remove');
    m.removed();
    m.undone();
    expect(m.step).toBe('listen');
    const empty = at('undo');
    empty.petalGone(false);
    expect(empty.step).toBe('listen');
    const elsewhere = at('grow');
    elsewhere.petalGone(true); // only the undo step hears it
    expect(elsewhere.step).toBe('grow');
  });

  it('locks each step to its own gesture; off and done lock nothing', () => {
    const lock = (kinds: string[], palmUp = false, palmsOut = false, shape: string | null = null) => ({
      kinds,
      palmUp,
      palmsOut,
      shape,
    });
    expect(new Onboarding().lock).toBeNull();
    expect(at('tune').lock).toEqual(lock([]));
    expect(at('palm').lock).toEqual(lock([], true));
    expect(at('plant').lock).toEqual(lock(['seed', 'cell'], true));
    expect(at('grow').lock).toEqual(lock(['plant'], false, false, 'pull'));
    expect(at('move').lock).toEqual(lock(['plant'], false, false, 'drag'));
    expect(at('remove').lock).toEqual(lock(['plant'], false, false, 'drag'));
    expect(at('undo').lock).toEqual(lock(['undo']));
    expect(at('listen').lock).toEqual(lock(['orb'], false, true));
    expect(at('orb').lock).toEqual(lock(['panel']));
    expect(at('seedsTip').lock).toEqual(lock([]));
    const done = at('seedsTip');
    done.panel(false);
    expect(done.step).toBe('done');
    expect(done.lock).toBeNull();
  });

  it('a board already open at the orb step passes it at once; the board closed during a tip ends the tour', () => {
    const m = at('listen');
    m.panel(true);
    m.listened();
    m.woke();
    expect(m.step).toBe('seedsTip');
    m.panel(false);
    expect(m.step).toBe('done');
    expect(m.toured).toBe(true);
  });
});

describe('Onboarding: the garden window and gaze mode', () => {
  it('the garden window (a pointer cannot pull): plant, move, remove, undo, Listen, then done (no orb there)', () => {
    const m = at('move', false);
    expect(m.step).toBe('move');
    m.released('drag');
    m.removed();
    m.undone();
    m.listened();
    m.woke();
    expect(m.step).toBe('done');
  });

  it('gaze mode (T-160): straight to the plant step, then on to Listen past what the gaze cannot do', () => {
    const m = new Onboarding();
    m.signature(true);
    m.tuned(true, true);
    expect(m.step).toBe('plant');
    m.changed(1);
    expect(m.step).toBe('listen');
    const late = at('move');
    late.setGazeOnly(true); // turned on mid-guide
    expect(late.step).toBe('listen');
  });
});

describe('Onboarding: skip, restart, stop and reset', () => {
  it('skip ends the guide at once, off, with no lock', () => {
    const m = at('grow');
    m.skip();
    expect(m.step).toBe('off');
    expect(m.lock).toBeNull();
  });

  it('restart (New garden): the palm step at once, every step again', () => {
    const m = at('seedsTip');
    m.restart(false);
    expect(m.step).toBe('palm');
    expect(m.toured).toBe(false);
    m.seed(true);
    m.changed(1);
    expect(m.step).toBe('grow'); // the pull of the first round does not count again
    const gaze = at('grow');
    gaze.restart(true);
    expect(gaze.step).toBe('plant');
  });

  it('stop (hints turned off) ends a running guide and leaves an idle one off', () => {
    const m = at('move');
    m.stop();
    expect(m.step).toBe('done');
    const idle = new Onboarding();
    idle.stop();
    expect(idle.step).toBe('off');
  });

  it('reset (the session ended) forgets everything: the next guide passes every step again', () => {
    const m = at('orb');
    m.reset();
    expect(m.step).toBe('off');
    m.signature(true);
    m.tuned(true, false);
    m.seed(true);
    m.changed(1);
    expect(m.step).toBe('grow');
  });
});
