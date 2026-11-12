// T-150, UX §3.3, D-087: the strict guide's state machine, every transition and every step's lock. Pure: no bus,
// no ECS, no clock.
import { describe, expect, it } from 'vitest';

import { Onboarding, type OnboardingStep } from '../../../src/onboarding/Onboarding.js';

/** A machine at `step` the way the bus gets it there in a headset (or the garden window: `canPull` false). */
function at(step: OnboardingStep, canPull = true): Onboarding {
  const m = new Onboarding();
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
  if (step === 'listen') return m;
  m.listened();
  if (step === 'orb' || step === 'done') return m;
  m.panel(true);
  return m;
}

describe('Onboarding: the start (UX §3.3 step 0, D-053)', () => {
  it('is off until a signature that starts it; tune until room:tuned; then asks for an open hand', () => {
    const m = new Onboarding();
    expect(m.step).toBe('off');
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

  it('a seed already out at room:tuned skips the palm step; a seed planted during the ripple skips the plant step', () => {
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

describe('Onboarding: strict, one step at a time (D-087)', () => {
  it('palm -> plant -> grow -> move -> listen -> orb -> tour -> done, each on its own gesture only', () => {
    const m = at('palm');
    m.released('drag'); // gestures of later steps pass nothing now
    m.listened();
    m.panel(true);
    m.panel(false);
    expect(m.step).toBe('palm');
    m.seed(true);
    expect(m.step).toBe('plant');
    m.seed(false); // the seed went home: back to the palm
    expect(m.step).toBe('palm');
    m.seed(true);
    m.changed(1);
    expect(m.step).toBe('grow');
    m.released('pull');
    expect(m.step).toBe('move');
    m.released('drag');
    expect(m.step).toBe('listen');
    m.listened();
    expect(m.step).toBe('orb');
    m.panel(true);
    expect(m.step).toBe('tour');
    m.toured();
    expect(m.step).toBe('done');
  });

  it('nothing moves a step on but its gesture: no time-out, no plant count (the old nets are gone)', () => {
    const m = at('grow');
    m.changed(10); // more plantings do not pass the pull
    m.released('drag'); // a drag is not the pull
    expect(m.step).toBe('grow');
  });

  it('locks each step to its own gesture; off and done lock nothing', () => {
    expect(new Onboarding().lock).toBeNull();
    expect(at('tune').lock).toEqual({ kinds: [], palmUp: false, palmsOut: false, shape: null });
    expect(at('palm').lock).toEqual({ kinds: [], palmUp: true, palmsOut: false, shape: null });
    expect(at('plant').lock).toEqual({ kinds: ['seed', 'cell'], palmUp: true, palmsOut: false, shape: null });
    expect(at('grow').lock).toEqual({ kinds: ['plant'], palmUp: false, palmsOut: false, shape: 'pull' });
    expect(at('move').lock).toEqual({ kinds: ['plant'], palmUp: false, palmsOut: false, shape: 'drag' });
    expect(at('listen').lock).toEqual({ kinds: ['orb'], palmUp: false, palmsOut: true, shape: null });
    expect(at('orb').lock).toEqual({ kinds: ['panel'], palmUp: false, palmsOut: false, shape: null });
    expect(at('tour').lock).toEqual({ kinds: [], palmUp: false, palmsOut: false, shape: null });
    const done = at('tour');
    done.toured();
    expect(done.lock).toBeNull();
  });

  it('the board closed during the walkthrough: back to the orb step; opened again, the walkthrough', () => {
    const m = at('tour');
    m.panel(false);
    expect(m.step).toBe('orb');
    m.toured(); // only the tour step hears the walkthrough's end
    expect(m.step).toBe('orb');
    m.panel(true);
    expect(m.step).toBe('tour');
  });

  it('a board already open at the orb step passes it at once', () => {
    const m = at('listen');
    m.panel(true);
    expect(m.step).toBe('listen');
    m.listened();
    expect(m.step).toBe('tour');
  });
});

describe('Onboarding: the garden window and gaze mode', () => {
  it('the garden window (a pointer cannot pull) goes from plant to move, and ends at Listen: no orb, no tour', () => {
    const m = at('move', false);
    expect(m.step).toBe('move');
    m.released('drag');
    m.listened();
    expect(m.step).toBe('done');
  });

  it('gaze mode (T-160): straight to the plant step, then on to Listen past the pull and the drag', () => {
    const m = new Onboarding();
    m.signature(true);
    m.tuned(true, true);
    expect(m.step).toBe('plant');
    m.changed(1);
    expect(m.step).toBe('listen');
    const late = at('grow');
    late.setGazeOnly(true); // turned on mid-guide: the steps it cannot do are passed
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
    const m = at('tour');
    m.restart(false);
    expect(m.step).toBe('palm');
    m.seed(true);
    m.changed(1);
    expect(m.step).toBe('grow'); // the pull of the first round does not count again
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
    const m = at('tour');
    m.reset();
    expect(m.step).toBe('off');
    m.signature(true);
    m.tuned(true, false);
    m.seed(true);
    m.changed(1);
    expect(m.step).toBe('grow');
  });
});
