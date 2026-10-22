// T-150: OnboardingSystem on the real bus with a fake world: what starts the tutorial and what does not, the caption
// of each step (once, taken back when the step ends, the garden window's twins), `onboarding:step` once per change,
// Listen, gaze mode, the hints setting, the 60 s net's log, the two one-time notices, the session's end. Zero
// allocation per frame is onboarding.heap.test.ts.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Caption } from '../../../src/core/components.js';
import { bus, DEFAULT_SETTINGS, log, settings } from '../../../src/core/index.js';
import { ONBOARD_CAPTION_MS, STEP_STALL_MS } from '../../../src/onboarding/config.js';
import { OnboardingSystem } from '../../../src/onboarding/OnboardingSystem.js';
import { garden, plant, seed as supplySeed } from '../garden/fixtures.js';
import { FakeEntity } from '../render/seedRig.js';

import type { EventMap } from '../../../src/core/index.js';

const live: OnboardingSystem[] = [];
afterEach(() => {
  for (const system of live.splice(0)) system.destroy();
  settings.set({ ...DEFAULT_SETTINGS });
  bus.emit('xr:sessionEnd', { visible: false });
  vi.restoreAllMocks();
});

function rig() {
  const xr = { isPresenting: true };
  const created: FakeEntity[] = [];
  const world = {
    renderer: { xr },
    createEntity: () => {
      const entity = new FakeEntity();
      created.push(entity);
      return entity;
    },
  };
  const system = new OnboardingSystem(world as never, {} as never, 35);
  system.init();
  live.push(system);
  const caption = created[0]!;
  const notice = created[1]!;
  const steps: string[] = [];
  const off = bus.on('onboarding:step', ({ step }) => steps.push(step));
  live.push({ destroy: off } as never);
  let timeS = 12_345.678;
  return {
    xr,
    system,
    steps,
    /** The key of the caption the system has up now, or null. */
    shown: () => (caption.hasComponent(Caption) ? (caption.getValue(Caption, 'key') as string) : null),
    /** Every caption it raised, in order. */
    raised: () => caption.added.filter(([c]) => c === Caption).map(([, v]) => v.key as string),
    /** Every notice it raised, in order; and the one up now. */
    notices: () => notice.added.filter(([c]) => c === Caption).map(([, v]) => v.key as string),
    notice: () => (notice.hasComponent(Caption) ? (notice.getValue(Caption, 'key') as string) : null),
    frame: (seconds = 0.014) => system.update(seconds, (timeS += seconds)),
  };
}

/** A garden of `plants` plants, the last `added` of them just planted, `seeds` left in the supply. */
const changed = (plants: number, added = plants, seeds = 0): EventMap['garden:changed'] => {
  const ids = Array.from({ length: plants }, (_, i) => `p${i}`);
  return {
    state: garden(
      ids.map((id, i) => plant(id, 2, i)),
      Array.from({ length: seeds }, (_, i) => supplySeed(`s${i}`)),
    ),
    diff: { added: ids.slice(plants - added), removed: [], changed: [] },
  };
};
const palmUp = { type: 'gesture:palmUp', hand: 'right' } as EventMap['gesture:palmUp'];
const removed = { plantId: 'p0', undoToken: 'u1', expiresAt: 0 } as unknown as EventMap['garden:removed'];
const seed = { id: 's1' } as EventMap['garden:seedOut']['seed'];
const release = (gesture: 'pull' | 'drag' | 'carry', kind = 'plant') =>
  ({ gesture, target: { kind, id: 'p0' } }) as unknown as EventMap['gesture:release'];

/** A new garden's session up to `room:tuned`. */
function started() {
  bus.emit('garden:changed', changed(0));
  bus.emit('room:signature', { signature: {} as never, starterSeeds: true });
  bus.emit('room:tuned', {});
}

describe('OnboardingSystem: who gets the tutorial', () => {
  it('a new garden: tune at its signature, the palm step at room:tuned', () => {
    const r = rig();
    bus.emit('garden:changed', changed(0));
    bus.emit('room:signature', { signature: {} as never, starterSeeds: true });
    expect(r.steps).toEqual(['tune']);
    expect(r.shown()).toBeNull(); // the ripple's captions go first (UX §3.3 step 0)
    bus.emit('room:tuned', {});
    expect(r.steps).toEqual(['tune', 'palm']);
    expect(r.shown()).toBe('onboardPalm');
  });

  it('D-053: any session that begins on an empty bed, starter seeds or not (a player who left before planting)', () => {
    const r = rig();
    bus.emit('garden:changed', changed(0));
    bus.emit('room:signature', { signature: {} as never, starterSeeds: false });
    expect(r.steps).toEqual(['tune']);
  });

  it("only at the session's first signature: a Re-place on an emptied bed starts nothing; the next session does", () => {
    const r = rig();
    bus.emit('garden:changed', changed(2, 0));
    bus.emit('room:signature', { signature: {} as never, starterSeeds: false });
    bus.emit('garden:changed', changed(0, 0)); // both plants removed
    bus.emit('room:signature', { signature: {} as never, starterSeeds: false }); // a Re-place
    expect(r.steps).toEqual([]);
    bus.emit('xr:sessionEnd', { visible: false });
    bus.emit('room:signature', { signature: {} as never, starterSeeds: false });
    expect(r.steps).toEqual(['tune']);
  });

  it('not on a bed that holds plants, not with hints off', () => {
    const r = rig();
    bus.emit('garden:changed', changed(2, 0));
    bus.emit('room:signature', { signature: {} as never, starterSeeds: true });
    bus.emit('xr:sessionEnd', { visible: false });
    bus.emit('garden:changed', changed(0, 0));
    settings.set({ ...DEFAULT_SETTINGS, hintsEnabled: false });
    bus.emit('room:signature', { signature: {} as never, starterSeeds: true });
    bus.emit('room:tuned', {});
    r.frame();
    expect(r.steps).toEqual([]);
    expect(r.raised()).toEqual([]);
  });

  it('gaze dwell on (T-160): no palm step; the plant step says "Look at a cell to plant"; Listen still comes', () => {
    const r = rig();
    settings.set({ ...DEFAULT_SETTINGS, gazeDwell: true });
    started();
    expect(r.steps).toEqual(['tune', 'plant']);
    expect(r.raised()).toEqual(['onboardPlantGaze']);
  });

  it('the 60 s net logs the step it moved on from (D-053)', () => {
    const info = vi.spyOn(log, 'info');
    const r = rig();
    r.frame();
    started();
    r.frame(STEP_STALL_MS / 1000);
    expect(r.steps.slice(-1)).toEqual(['plant']);
    expect(info).toHaveBeenCalledWith('onboarding', expect.stringContaining('"palm"'));
  });
});

describe('OnboardingSystem: the captions (UX §3.3)', () => {
  it('one per step, taken back when the step is done; none for more, grow and move', () => {
    const r = rig();
    started();
    bus.emit('garden:seedOut', { seed, hand: 'left' });
    expect(r.shown()).toBe('onboardPlant');
    bus.emit('garden:changed', changed(1));
    expect(r.shown()).toBeNull();
    bus.emit('garden:changed', changed(3));
    bus.emit('gesture:release', release('pull'));
    bus.emit('gesture:release', release('drag'));
    expect(r.steps).toEqual(['tune', 'palm', 'plant', 'more', 'grow', 'move', 'listen']); // free passed at once
    expect(r.raised()).toEqual(['onboardPalm', 'onboardPlant', 'onboardListen']);
  });

  it('a caption asks for ONBOARD_CAPTION_MS: the line of captions is never held by a slow step', () => {
    const r = rig();
    const before = Date.now();
    started();
    const raised = r.system['caption'] as unknown as FakeEntity;
    const expiresAt = raised.getValue(Caption, 'expiresAt') as number;
    expect(expiresAt - before).toBeGreaterThanOrEqual(ONBOARD_CAPTION_MS - 1);
    expect(expiresAt - Date.now()).toBeLessThanOrEqual(ONBOARD_CAPTION_MS + 1);
  });

  it('a step come back to is not captioned twice (hints once): a seed sent home goes back to palm, silently', () => {
    const r = rig();
    started();
    bus.emit('garden:seedOut', { seed, hand: 'left' });
    bus.emit('garden:seedBack', { seedId: 's1', reason: 'offBed' });
    expect(r.steps.slice(-1)).toEqual(['palm']);
    expect(r.shown()).toBeNull();
    bus.emit('garden:seedOut', { seed, hand: 'left' });
    expect(r.raised()).toEqual(['onboardPalm', 'onboardPlant']);
  });

  it('a carry, or a release of a seed or nothing, passes no gate', () => {
    const r = rig();
    started();
    bus.emit('garden:changed', changed(3));
    bus.emit('gesture:release', release('carry'));
    bus.emit('gesture:release', release('pull', 'seed'));
    bus.emit('gesture:release', { gesture: 'pull', target: null } as unknown as EventMap['gesture:release']);
    expect(r.steps.slice(-1)).toEqual(['grow']);
  });

  it('the garden window: no palm step, the click captions, and no grow gate (a pointer cannot pull)', () => {
    const r = rig();
    r.xr.isPresenting = false;
    bus.emit('garden:changed', changed(0));
    bus.emit('room:signature', { signature: {} as never, starterSeeds: true });
    bus.emit('garden:seedOut', { seed, hand: 'right' }); // a pointer is always palm up
    bus.emit('room:tuned', {});
    expect(r.steps).toEqual(['tune', 'plant']);
    expect(r.shown()).toBe('onboardPlantClick');
    bus.emit('garden:changed', changed(3));
    expect(r.steps.slice(-1)).toEqual(['move']);
    r.system.machine.tick(Number.MAX_SAFE_INTEGER); // 4 minutes on
    r.frame();
    expect(r.steps.slice(-1)).toEqual(['listen']);
    expect(r.shown()).toBe('onboardListenClick');
  });

  it('the Listen step in a headset says "Show your palms to listen"; listen:enter ends it', () => {
    const r = rig();
    started();
    bus.emit('garden:changed', changed(6)); // LISTEN_AFTER_PLANTS
    expect(r.steps.slice(-1)).toEqual(['listen']);
    expect(r.shown()).toBe('onboardListen');
    bus.emit('listen:enter', {});
    expect(r.steps.slice(-1)).toEqual(['done']);
    expect(r.shown()).toBeNull();
  });
});

describe('OnboardingSystem: Listen, the hints setting, the session', () => {
  it('listen:enter takes the caption back, and a step reached in Listen raises none', () => {
    const r = rig();
    started();
    bus.emit('listen:enter', {});
    expect(r.shown()).toBeNull();
    bus.emit('garden:seedOut', { seed, hand: 'left' }); // no seed is handed out in Listen; were one, no caption
    expect(r.shown()).toBeNull();
    bus.emit('listen:exit', { timedOut: false });
    bus.emit('garden:changed', changed(1));
    expect(r.steps.slice(-1)).toEqual(['more']);
  });

  it('hints turned off in the panel: done at once, the caption taken back', () => {
    const r = rig();
    started();
    settings.set({ ...DEFAULT_SETTINGS, hintsEnabled: false });
    expect(r.steps.slice(-1)).toEqual(['done']);
    expect(r.shown()).toBeNull();
  });

  it('xr:sessionEnd: off, the caption taken back; a frame after it says nothing', () => {
    const r = rig();
    started();
    bus.emit('xr:sessionEnd', { visible: false });
    expect(r.steps.slice(-1)).toEqual(['off']);
    expect(r.shown()).toBeNull();
    const said = r.steps.length;
    r.frame();
    expect(r.steps).toHaveLength(said);
  });

  it('a frame says a step reached by time alone, once', () => {
    const r = rig();
    started();
    bus.emit('garden:changed', changed(3));
    bus.emit('gesture:release', release('pull')); // no drag: the move gate waits, and Listen comes by time
    r.system.machine.tick(Number.MAX_SAFE_INTEGER);
    r.frame(); // the frame's own tick brings the time back, but the step was taken already
    r.frame();
    expect(r.steps.filter((s) => s === 'listen')).toHaveLength(1);
  });
});

describe('OnboardingSystem: the one-time notices (UX re-check 23 Oct)', () => {
  it('"More seeds tomorrow" at a palm up with an empty supply, once a session, not while seeds are left', () => {
    const r = rig();
    started();
    bus.emit('garden:changed', changed(2, 2, 1)); // one seed left
    bus.emit('gesture:palmUp', palmUp);
    expect(r.notices()).toEqual([]);
    bus.emit('garden:changed', changed(3, 1, 0)); // the last one planted
    bus.emit('gesture:palmUp', palmUp);
    expect(r.notice()).toBe('seedsTomorrow');
    bus.emit('gesture:palmUp', palmUp);
    expect(r.notices()).toEqual(['seedsTomorrow']);
    expect(r.shown()).toBeNull(); // the step's caption entity is not touched
    bus.emit('xr:sessionEnd', { visible: false });
    expect(r.notice()).toBeNull();
    started();
    bus.emit('garden:changed', changed(3, 0, 0));
    bus.emit('gesture:palmUp', palmUp);
    expect(r.notices()).toEqual(['seedsTomorrow', 'seedsTomorrow']); // the next session says it again
  });

  it('"Pinch the petal to undo" on the first removal of the session, once; not in Listen; not with hints off', () => {
    const r = rig();
    started();
    bus.emit('garden:changed', changed(3));
    bus.emit('listen:enter', {});
    bus.emit('garden:removed', removed);
    expect(r.notices()).toEqual([]);
    bus.emit('listen:exit', { timedOut: false });
    bus.emit('garden:removed', removed);
    expect(r.notice()).toBe('undoHint');
    bus.emit('garden:removed', removed);
    expect(r.notices()).toEqual(['undoHint']);
    settings.set({ ...DEFAULT_SETTINGS, hintsEnabled: false });
    bus.emit('xr:sessionEnd', { visible: false });
    bus.emit('garden:removed', removed);
    expect(r.notices()).toEqual(['undoHint']);
  });

  it('"Turn a hand over for settings" at done, once; after Listen when done came in it; not in the window, not with hints off', () => {
    const r = rig();
    started();
    bus.emit('garden:changed', changed(3));
    bus.emit('gesture:release', release('pull'));
    bus.emit('gesture:release', release('drag')); // listen
    bus.emit('listen:enter', {}); // done, in Listen: nothing yet
    expect(r.notices()).toEqual([]);
    bus.emit('listen:exit', { timedOut: false });
    expect(r.notice()).toBe('settingsHint');
    bus.emit('listen:enter', {});
    bus.emit('listen:exit', { timedOut: false });
    expect(r.notices()).toEqual(['settingsHint']);
    bus.emit('xr:sessionEnd', { visible: false });
    started();
    settings.set({ ...DEFAULT_SETTINGS, hintsEnabled: false }); // done by stop(): no hint
    expect(r.steps.slice(-1)).toEqual(['done']);
    expect(r.notices()).toEqual(['settingsHint']);
    bus.emit('xr:sessionEnd', { visible: false });
    settings.set({ ...DEFAULT_SETTINGS });
    r.xr.isPresenting = false; // the garden window has no orb
    started();
    bus.emit('garden:changed', changed(3));
    bus.emit('gesture:release', release('drag'));
    r.system.machine.tick(Number.MAX_SAFE_INTEGER); // 4 minutes on: listen
    r.frame();
    bus.emit('listen:enter', {});
    bus.emit('listen:exit', { timedOut: false });
    expect(r.steps.slice(-1)).toEqual(['done']);
    expect(r.notices()).toEqual(['settingsHint']);
  });
});
