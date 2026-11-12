// T-150: OnboardingSystem on the real bus with a fake world: what starts the tutorial and what does not, the caption
// of each step (once, taken back when the step ends, the garden window's twins), `onboarding:step` once per change,
// Listen, gaze mode, the hints setting, the strict guide's lock (D-087), the one-time notices, the session's end. Zero
// allocation per frame is onboarding.heap.test.ts.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Caption } from '../../../src/core/components.js';
import { bus, DEFAULT_SETTINGS, guide, settings } from '../../../src/core/index.js';
import { NO_SEEDS_GAP_MS, NO_SEEDS_SHOW_MS, ONBOARD_CAPTION_MS } from '../../../src/onboarding/config.js';
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
  vi.useRealTimers(); // the BUG-056 test fakes the clock: back even when one of its expects throws
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
  const noSeeds = created[2]!;
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
    /** BUG-056: how often "no seeds" was raised, whether it is up now, and when the last one is asked to end. */
    noSeedsCount: () => noSeeds.added.filter(([c]) => c === Caption).length,
    noSeedsUp: () => noSeeds.hasComponent(Caption),
    noSeedsEnds: () => noSeeds.getValue(Caption, 'expiresAt') as number,
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

/** A new garden's session up to `room:tuned`: an empty bed, three seeds in the supply. */
function started() {
  bus.emit('garden:changed', changed(0, 0, 3));
  bus.emit('room:signature', { signature: {} as never, starterSeeds: true });
  bus.emit('room:tuned', {});
}

/** The first plant, its pull and its drag: the Listen step, in a headset, in the garden window and in gaze mode. */
function toListen() {
  bus.emit('garden:changed', changed(1));
  bus.emit('gesture:release', release('pull'));
  bus.emit('gesture:release', release('drag'));
}

describe('OnboardingSystem: who gets the tutorial', () => {
  it('a new garden: tune at its signature, the palm step at room:tuned', () => {
    const r = rig();
    bus.emit('garden:changed', changed(0, 0, 3));
    bus.emit('room:signature', { signature: {} as never, starterSeeds: true });
    expect(r.steps).toEqual(['tune']);
    expect(r.shown()).toBeNull(); // the ripple's captions go first (UX §3.3 step 0)
    bus.emit('room:tuned', {});
    expect(r.steps).toEqual(['tune', 'palm']);
    expect(r.shown()).toBe('onboardPalm');
  });

  it('D-053: any session that begins on an empty bed, starter seeds or not (a player who left before planting)', () => {
    const r = rig();
    bus.emit('garden:changed', changed(0, 0, 1));
    bus.emit('room:signature', { signature: {} as never, starterSeeds: false });
    expect(r.steps).toEqual(['tune']);
  });

  it('D-087: not with an empty supply at room:tuned, whose palm step would wait for a seed that cannot come', () => {
    const r = rig();
    bus.emit('garden:changed', changed(0, 0, 0));
    bus.emit('room:signature', { signature: {} as never, starterSeeds: false });
    bus.emit('room:tuned', {});
    expect(r.steps).toEqual(['tune', 'off']);
    expect(r.raised()).toEqual([]);
  });

  it("only at the session's first signature: a Re-place on an emptied bed starts nothing; the next session does", () => {
    const r = rig();
    bus.emit('garden:changed', changed(2, 0));
    bus.emit('room:signature', { signature: {} as never, starterSeeds: false });
    bus.emit('garden:changed', changed(0, 0, 1)); // both plants removed
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

  it("D-087: writes each step's lock to core's guide, the palm step's at once; none when skipped", () => {
    rig();
    started();
    expect(guide.lock).toEqual({ kinds: [], palmUp: true, palmsOut: false, shape: null });
    bus.emit('garden:seedOut', { seed, hand: 'left' });
    expect(guide.lock?.kinds).toEqual(['seed', 'cell']);
    bus.emit('onboarding:skip', {});
    expect(guide.lock).toBeNull();
  });
});

describe('OnboardingSystem: the captions (UX §3.3)', () => {
  it('one per step, the old one taken back when the next comes', () => {
    const r = rig();
    started();
    bus.emit('garden:seedOut', { seed, hand: 'left' });
    expect(r.shown()).toBe('onboardPlant');
    bus.emit('garden:changed', changed(1));
    expect(r.shown()).toBe('onboardGrow');
    bus.emit('gesture:release', release('pull'));
    expect(r.shown()).toBe('onboardMove');
    bus.emit('gesture:release', release('drag'));
    expect(r.steps).toEqual(['tune', 'palm', 'plant', 'grow', 'move', 'listen']);
    expect(r.raised()).toEqual([
      'onboardPalm',
      'onboardPlant',
      'onboardGrow',
      'onboardMove',
      'onboardListen',
    ]);
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
    bus.emit('garden:changed', changed(0, 0, 3));
    bus.emit('room:signature', { signature: {} as never, starterSeeds: true });
    bus.emit('garden:seedOut', { seed, hand: 'right' }); // a pointer is always palm up
    bus.emit('room:tuned', {});
    expect(r.steps).toEqual(['tune', 'plant']);
    expect(r.shown()).toBe('onboardPlantClick');
    bus.emit('garden:changed', changed(3));
    expect(r.steps.slice(-1)).toEqual(['move']);
    bus.emit('gesture:release', release('drag'));
    expect(r.steps.slice(-1)).toEqual(['listen']);
    expect(r.shown()).toBe('onboardListenClick');
  });

  it('the Listen step in a headset says "Show your palms to listen"; listen:enter ends it', () => {
    const r = rig();
    started();
    toListen();
    expect(r.steps.slice(-1)).toEqual(['listen']);
    expect(r.shown()).toBe('onboardListen');
    bus.emit('listen:enter', {});
    expect(r.steps.slice(-1)).toEqual(['orb']); // D-084: the tour comes next
    expect(r.shown()).toBeNull();
  });
});

describe('OnboardingSystem: the tour, skip and New garden (D-084)', () => {
  it('after Listen the orb caption; the open board, the walkthrough; its end (onboarding:toured), done', () => {
    const r = rig();
    started();
    toListen();
    bus.emit('listen:enter', {});
    expect(r.shown()).toBeNull(); // no instruction over Listen
    bus.emit('listen:exit', { timedOut: false });
    expect(r.shown()).toBe('onboardOrb');
    bus.emit('panel:open', { open: true });
    expect(r.shown()).toBe('onboardTour');
    bus.emit('onboarding:toured', {});
    expect(r.steps.slice(-3)).toEqual(['orb', 'tour', 'done']);
    expect(r.shown()).toBeNull();
    expect(guide.lock).toBeNull();
    expect(r.notices()).toEqual([]);
  });

  it('the orb caption is "Look at the orb" in one-hand and gaze mode: the orb waits in view there', () => {
    const r = rig();
    for (const mode of [{ oneHand: true }, { gazeDwell: true }]) {
      settings.set({ ...DEFAULT_SETTINGS, ...mode });
      started();
      toListen();
      bus.emit('listen:enter', {});
      bus.emit('listen:exit', { timedOut: false });
      expect(r.shown()).toBe('onboardOrbLook');
      bus.emit('xr:sessionEnd', { visible: false });
    }
  });

  it('the garden window skips the tour: listen -> done, and says no settings hint (no orb there)', () => {
    const r = rig();
    r.xr.isPresenting = false;
    started();
    toListen();
    bus.emit('listen:enter', {});
    bus.emit('listen:exit', { timedOut: false });
    expect(r.steps.slice(-2)).toEqual(['listen', 'done']);
    expect(r.notices()).toEqual([]);
  });

  it('skip: off at once, the caption taken back, no settings hint; nothing of the session starts it again', () => {
    const r = rig();
    started();
    bus.emit('onboarding:skip', {});
    expect(r.steps.slice(-1)).toEqual(['off']);
    expect(r.shown()).toBeNull();
    bus.emit('garden:seedOut', { seed, hand: 'left' });
    bus.emit('garden:changed', changed(6));
    bus.emit('listen:enter', {});
    bus.emit('listen:exit', { timedOut: false });
    bus.emit('room:signature', { signature: {} as never, starterSeeds: false }); // a Re-place
    bus.emit('room:tuned', {});
    r.frame();
    expect(r.steps.slice(-1)).toEqual(['off']);
    expect(r.raised()).toEqual(['onboardPalm']);
    expect(r.notices()).toEqual([]);
    bus.emit('xr:sessionEnd', { visible: false });
    started(); // skipped in the tour: its caption taken back too
    toListen();
    bus.emit('listen:enter', {});
    bus.emit('listen:exit', { timedOut: false });
    expect(r.shown()).toBe('onboardOrb');
    bus.emit('onboarding:skip', {});
    expect(r.shown()).toBeNull();
    expect(r.notices()).toEqual([]);
  });

  it('garden:renewed starts it again at once from the palm step, captions again; not in Listen, with hints off or in the window', () => {
    const r = rig();
    started();
    bus.emit('onboarding:skip', {});
    bus.emit('garden:renewed', {});
    expect(r.steps.slice(-1)).toEqual(['palm']);
    expect(r.raised()).toEqual(['onboardPalm', 'onboardPalm']);
    bus.emit('garden:renewed', {}); // again at the palm step: its caption once more, the step said once
    expect(r.raised()).toHaveLength(3);
    expect(r.steps.filter((step) => step === 'palm')).toHaveLength(2);
    bus.emit('onboarding:skip', {});
    bus.emit('listen:enter', {});
    bus.emit('garden:renewed', {});
    bus.emit('listen:exit', { timedOut: false });
    expect(r.steps.slice(-1)).toEqual(['off']);
    settings.set({ ...DEFAULT_SETTINGS, hintsEnabled: false });
    bus.emit('garden:renewed', {});
    expect(r.steps.slice(-1)).toEqual(['off']);
    settings.set({ ...DEFAULT_SETTINGS });
    bus.emit('xr:sessionEnd', { visible: false });
    r.xr.isPresenting = false;
    started();
    bus.emit('onboarding:skip', {});
    bus.emit('garden:renewed', {});
    expect(r.steps.slice(-1)).toEqual(['off']);
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
    expect(r.steps.slice(-1)).toEqual(['grow']);
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
});

describe('OnboardingSystem: the one-time notices (UX re-check 23 Oct)', () => {
  it('BUG-056: in a headset every palm up with an empty supply says "no seeds", again after 4 s and not more often', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_800_000_000_000);
    const r = rig();
    started();
    bus.emit('room:bedPlaced', {} as EventMap['room:bedPlaced']);
    bus.emit('garden:changed', changed(2, 2, 1)); // one seed left
    bus.emit('gesture:palmUp', palmUp);
    expect(r.noSeedsCount()).toBe(0);
    bus.emit('garden:changed', changed(3, 1, 0)); // the last one planted
    bus.emit('gesture:palmUp', palmUp);
    expect(r.noSeedsCount()).toBe(1);
    expect(r.noSeedsEnds() - Date.now()).toBe(NO_SEEDS_SHOW_MS); // asked to stay 2 s
    for (let ms = 400; ms < NO_SEEDS_GAP_MS; ms += 400) {
      vi.advanceTimersByTime(400); // the palm stays up: a palm up every 400 ms
      bus.emit('gesture:palmUp', palmUp);
    }
    expect(r.noSeedsCount()).toBe(1); // 3.6 s on: not again
    vi.advanceTimersByTime(400);
    bus.emit('gesture:palmUp', palmUp);
    expect(r.noSeedsCount()).toBe(2); // 4 s on: again
    expect(r.notices()).toEqual([]); // the once-a-session notices and the step's caption are not touched
    expect(r.shown()).toBe('onboardGrow');
    vi.useRealTimers();
  });

  it('BUG-056: "no seeds" is not said in Listen, before a bed is placed or while one is placed again', () => {
    const r = rig();
    started();
    bus.emit('garden:changed', changed(3, 0, 0));
    bus.emit('gesture:palmUp', palmUp);
    expect(r.noSeedsCount()).toBe(0); // no bed yet
    bus.emit('room:bedPlaced', {} as EventMap['room:bedPlaced']);
    bus.emit('listen:enter', {});
    bus.emit('gesture:palmUp', palmUp);
    expect(r.noSeedsCount()).toBe(0); // Listen
    bus.emit('listen:exit', { timedOut: false });
    bus.emit('gesture:palmUp', palmUp);
    expect(r.noSeedsCount()).toBe(1);
    bus.emit('room:placementLevel', { level: 3 }); // "Place the garden again": the notice goes with the bed
    expect(r.noSeedsUp()).toBe(false);
    bus.emit('gesture:palmUp', palmUp);
    expect(r.noSeedsCount()).toBe(1);
    bus.emit('xr:sessionEnd', { visible: false });
    expect(r.noSeedsUp()).toBe(false);
  });

  it('in the garden window, where the pointer is always palm up, "no seeds" stays a once-a-session notice', () => {
    const r = rig();
    r.xr.isPresenting = false;
    started();
    bus.emit('garden:changed', changed(3, 0, 0));
    bus.emit('gesture:palmUp', palmUp);
    bus.emit('gesture:palmUp', palmUp);
    expect(r.notices()).toEqual(['seedsTomorrow']);
    expect(r.noSeedsCount()).toBe(0);
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

  it('the undo hint has its twins: "Look at the petal to undo" in gaze mode, "Click the petal to undo" in the window (23 Oct audit F2)', () => {
    const r = rig();
    settings.set({ ...DEFAULT_SETTINGS, gazeDwell: true });
    started();
    bus.emit('garden:changed', changed(3));
    bus.emit('garden:removed', removed);
    expect(r.notices()).toEqual(['undoHintGaze']);
    settings.set({ ...DEFAULT_SETTINGS }); // gaze off mid-session: the notice was said, whatever its wording
    bus.emit('garden:removed', removed);
    expect(r.notices()).toEqual(['undoHintGaze']);
    bus.emit('xr:sessionEnd', { visible: false });
    r.xr.isPresenting = false; // the garden window: read at room:tuned
    started();
    bus.emit('garden:changed', changed(3));
    bus.emit('garden:removed', removed);
    expect(r.notices()).toEqual(['undoHintGaze', 'undoHintClick']);
  });
});
