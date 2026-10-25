// T-151, UX §3.6: the settings panel's rules, without its drawing. Time is a fake: every test moves it by hand,
// one frame at a time, through Panel.frame. Core's settings store is the real one, reset before each test.
import { Euler, Matrix4, Quaternion, Vector3 } from '@iwsdk/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { bus, DEFAULT_SETTINGS, settings } from '../../../src/core/index.js';
import { WANDERER } from '../../../src/garden/index.js';
import {
  HIT_RADIUS_M,
  HOVER_DEAD_BAND_M,
  ORB_HIDE_FACING,
  ORB_SHOW_FACING,
} from '../../../src/hands/index.js';
import {
  FOV_HALF_H_DEG,
  FOV_HALF_V_DEG,
  NEW_GARDEN_HOLD_MS,
  ORB_OFF_HAND_M,
  PANEL_DISTANCE_M,
  PANEL_HEIGHT_M,
  PANEL_LOOK_AWAY_MS,
  PANEL_MAX_FRAME_MS,
  PANEL_MAX_PITCH_DOWN_DEG,
  PANEL_TARGET_M,
  PANEL_TARGET_PITCH_M,
  PANEL_WIDTH_M,
} from '../../../src/ui/config.js';
import { clampToFov, fovBoundsDeg } from '../../../src/ui/FovGuard.js';
import {
  gazeTarget,
  hasPose,
  isHeadTurning,
  ORB_ELEMENT,
  ORB_ID,
  orbHome,
  orbOnHand,
  Panel,
  PANEL_ELEMENT,
  placePanel,
  type PanelActions,
  type PanelTab,
} from '../../../src/ui/Panel.js';
import { PANEL } from '../../../src/ui/strings.js';
import { garden, seed } from '../garden/fixtures.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

import type { EventMap, Hand, Mat4, Settings } from '../../../src/core/index.js';
import type { RoomSignature } from '../../../src/garden/index.js';

const D_MAJOR_ROOM: RoomSignature = { ...WANDERER, keyRoot: 2, reverbRt60: 0.6, paletteSeed: 7 };

/** What the panel has asked of the garden and of the room since the test began. */
const calls = {
  newGarden: [] as object[],
  replaceBed: [] as object[],
  bedHeight: [] as { metres: number }[],
  timeLapse: [] as boolean[],
  pressed: [] as string[],
};
/** The garden's time-lapse demo, as the stand-in garden has it. */
let isTimeLapse = false;
const actions: PanelActions = {
  newGarden: () => calls.newGarden.push({}),
  replaceBed: () => calls.replaceBed.push({}),
  setBedHeightOffset: (metres) => calls.bedHeight.push({ metres }),
  isTimeLapse: () => isTimeLapse,
  setTimeLapse: (on) => {
    calls.timeLapse.push(on);
    isTimeLapse = on;
  },
  pressed: (id) => calls.pressed.push(id),
};

/** A pinch that starts and ends on the same control: what hands/ reports as a press. */
function press(panel: Panel, id: string, hand: Hand = 'right'): void {
  panel.down(hand, id);
  panel.up(hand, id);
}
/** An open panel on `tab`, one frame after the press that chose the tab. */
function opened(tab: PanelTab = 'sound'): Panel {
  const panel = new Panel(actions);
  press(panel, ORB_ID);
  press(panel, `tab:${tab}`);
  panel.frame(0, '', false);
  return panel;
}
const ids = (panel: Panel): string[] => panel.controls().map((control) => control.id);
const control = (panel: Panel, id: string) => panel.controls().find((c) => c.id === id);
const words = (panel: Panel): string[] => panel.texts().map((text) => text.text);
/** Moves the fake time on by `ms`, in frames no longer than a real one, with the gaze on `gazeId`. */
function run(panel: Panel, ms: number, gazeId = '', away = false): void {
  for (let left = ms; left > 0; left -= 50) panel.frame(Math.min(50, left), gazeId, away);
}
/** The gaze arrives on `id`: the frame it arrives in counts nothing. */
const lookAt = (panel: Panel, id: string): void => panel.frame(0, id, false);
const off: (() => void)[] = [];
/** The payloads of an event from now on, until the test ends. */
function heard<K extends keyof EventMap>(type: K): EventMap[K][] {
  const payloads: EventMap[K][] = [];
  off.push(bus.on(type, (payload) => payloads.push({ ...payload })));
  return payloads;
}

beforeEach(() => {
  while (off.length > 0) off.pop()?.();
  for (const list of Object.values(calls)) list.length = 0;
  isTimeLapse = false;
  settings.set({ ...DEFAULT_SETTINGS });
});

describe('settings panel: opening, closing and the tabs (UX §3.6)', () => {
  it('starts closed, with nothing to pinch; the orb opens it and the orb or Close shuts it', () => {
    const panel = new Panel(actions);
    expect(panel.open).toBe(false);
    expect(panel.controls()).toEqual([]);
    expect(panel.texts()).toEqual([]);
    press(panel, ORB_ID);
    expect(panel.open).toBe(true);
    expect(panel.tab).toBe('sound');
    press(panel, ORB_ID);
    expect(panel.open).toBe(false);
    press(panel, ORB_ID);
    press(panel, 'close');
    expect(panel.open).toBe(false);
    expect(panel.controls()).toEqual([]);
  });

  it('shows the controls of UX §3.6 on each tab, under the three tabs and Close', () => {
    const header = ['tab:sound', 'tab:access', 'tab:garden', 'close'];
    expect(ids(opened('sound'))).toEqual([
      ...header,
      ...['tempo:-', 'tempo:+', 'volume:-', 'volume:+', 'reverb:auto', 'reverb:small', 'reverb:off', 'mono'],
    ]);
    expect(ids(opened('access'))).toEqual([
      ...header,
      ...['oneHand', 'gazeDwell', 'highContrast', 'reducedMotion', 'beatRing', 'hand:left', 'hand:right'],
    ]);
    expect(ids(opened('garden'))).toEqual([
      ...header,
      ...['height:-', 'height:+', 'replaceBed', 'newGarden', 'timeLapse'],
    ]);
    const panel = opened('garden');
    expect(control(panel, 'tab:garden')?.on).toBe(true);
    expect(control(panel, 'tab:sound')?.on).toBe(false);
    const tabs = panel.controls().slice(0, 3);
    expect(tabs.map((c) => c.text)).toEqual(['Sound', 'Access', 'Garden']);
  });

  it('shows the hold times only while the gaze mode is on', () => {
    const panel = opened('access');
    expect(ids(panel)).not.toContain('dwell:900');
    expect(words(panel)).not.toContain('Look time');
    settings.set({ gazeDwell: true });
    expect(ids(panel)).toEqual(expect.arrayContaining(['dwell:600', 'dwell:900', 'dwell:1200']));
    expect(words(panel)).toContain('Look time');
    expect(control(panel, 'dwell:900')).toMatchObject({ on: true, text: '0.9 s' });
  });

  it('ignores a press on a control that is not on show: another tab, a hidden row, a closed panel', () => {
    const changes = heard('settings:changed');
    const panel = opened('access');
    press(panel, 'tempo:+'); // the Sound tab's
    press(panel, 'dwell:600'); // hidden: the gaze mode is off
    press(panel, 'no such control');
    press(panel, 'close');
    press(panel, 'oneHand'); // the panel is closed
    expect(changes).toEqual([]);
    expect(settings.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('closes when its centre has been out of the view box for 5 s on end, and not before', () => {
    const panel = opened();
    run(panel, PANEL_LOOK_AWAY_MS - 1, '', true);
    expect(panel.open).toBe(true);
    panel.frame(1, '', false); // a look back starts the count again
    run(panel, PANEL_LOOK_AWAY_MS - 1, '', true);
    expect(panel.open).toBe(true);
    panel.frame(1, '', true);
    expect(panel.open).toBe(false);
  });
});

describe('settings panel: every control writes core settings and shows the value (UX §3.6)', () => {
  const CASES: [tab: PanelTab, id: string, after: Partial<Settings>, before?: Partial<Settings>][] = [
    ['sound', 'tempo:+', { tempo: 88 }],
    ['sound', 'tempo:-', { tempo: 80 }],
    ['sound', 'volume:+', { volume: 0.9 }],
    ['sound', 'volume:-', { volume: 0.7 }],
    ['sound', 'reverb:small', { reverb: 'small' }],
    ['sound', 'reverb:off', { reverb: 'off' }],
    ['sound', 'reverb:auto', { reverb: 'auto' }, { reverb: 'off' }],
    ['sound', 'mono', { mono: true }],
    ['sound', 'mono', { mono: false }, { mono: true }],
    ['access', 'oneHand', { oneHand: true }],
    ['access', 'oneHand', { oneHand: false }, { oneHand: true }],
    ['access', 'gazeDwell', { gazeDwell: true }],
    ['access', 'gazeDwell', { gazeDwell: false }, { gazeDwell: true }],
    ['access', 'dwell:600', { dwellMs: 600 }, { gazeDwell: true }],
    ['access', 'dwell:1200', { dwellMs: 1200 }, { gazeDwell: true }],
    ['access', 'dwell:900', { dwellMs: 900 }, { gazeDwell: true, dwellMs: 600 }],
    ['access', 'highContrast', { highContrast: true }],
    ['access', 'reducedMotion', { reducedMotion: true }],
    ['access', 'beatRing', { beatRing: false }],
    ['access', 'hand:left', { dominantHand: 'left' }],
    ['access', 'hand:right', { dominantHand: 'right' }, { dominantHand: 'left' }],
  ];

  it.each(CASES)('%s tab, %s', (tab, id, after, before = {}) => {
    settings.set(before);
    const start = settings.get();
    const panel = opened(tab);
    const changes = heard('settings:changed');
    panel.stale = false; // as after a redraw
    press(panel, id);
    expect(settings.get()).toEqual({ ...start, ...after }); // that field, and no other
    expect(changes).toHaveLength(1);
    expect(panel.stale).toBe(true);
  });

  it('covers every setting the panel of UX §3.6 has a control for', () => {
    const written = new Set(CASES.flatMap(([, , after]) => Object.keys(after)));
    // hintsEnabled has no control in UX §3.6
    expect([...written].sort()).toEqual(
      Object.keys(DEFAULT_SETTINGS)
        .filter((key) => key !== 'hintsEnabled')
        .sort(),
    );
  });

  it('shows the current values: read-outs, the chosen option and each switch in words', () => {
    const panel = opened('sound');
    expect(words(panel)).toEqual(
      expect.arrayContaining(['Speed', '84 BPM', 'Volume', '80 %', 'Echo', 'Mono']),
    );
    expect(control(panel, 'reverb:auto')).toMatchObject({ on: true, text: 'room' });
    expect(control(panel, 'mono')).toMatchObject({ on: false, text: 'off' }); // P-014
    press(panel, 'tempo:+');
    press(panel, 'volume:-');
    press(panel, 'reverb:small');
    expect(words(panel)).toEqual(expect.arrayContaining(['88 BPM', '70 %']));
    expect(control(panel, 'reverb:small')?.on).toBe(true);
    expect(control(panel, 'reverb:auto')?.on).toBe(false);

    press(panel, 'tab:access');
    expect(control(panel, 'oneHand')).toMatchObject({ on: false, text: 'off' });
    expect(control(panel, 'beatRing')).toMatchObject({ on: true, text: 'on' });
    expect(control(panel, 'hand:right')).toMatchObject({ on: true, text: 'R' });
    press(panel, 'oneHand');
    press(panel, 'hand:left');
    expect(control(panel, 'oneHand')).toMatchObject({ on: true, text: 'on' });
    expect(control(panel, 'hand:left')?.on).toBe(true);
    expect(control(panel, 'hand:right')?.on).toBe(false);
    expect(words(panel)).toEqual([
      'One hand',
      'Look to select',
      'High contrast',
      'Reduce motion',
      'Beat ring',
      'Main hand',
    ]);
  });

  it('follows a setting that changed somewhere else (the landing page, a loaded save)', () => {
    const panel = opened('sound');
    settings.set({ tempo: 100, volume: 0.25 });
    expect(words(panel)).toEqual(expect.arrayContaining(['100 BPM', '25 %']));
  });

  it('stops the tempo at 60 and 120 BPM, in steps of 4, and dims the button that has nothing left', () => {
    const panel = opened('sound');
    const seen: number[] = [];
    for (let i = 0; i < 12; i++) {
      press(panel, 'tempo:+');
      seen.push(settings.get().tempo);
    }
    expect(seen).toEqual([88, 92, 96, 100, 104, 108, 112, 116, 120, 120, 120, 120]);
    expect(control(panel, 'tempo:+')?.dim).toBe(true);
    expect(control(panel, 'tempo:-')?.dim).toBe(false);
    const changes = heard('settings:changed');
    press(panel, 'tempo:+');
    expect(changes).toEqual([]);
    for (let i = 0; i < 20; i++) press(panel, 'tempo:-');
    expect(settings.get().tempo).toBe(60);
    expect(control(panel, 'tempo:-')?.dim).toBe(true);
    expect(control(panel, 'tempo:+')?.dim).toBe(false);
  });

  it('stops the volume at 0 and 100 %, in steps of 10 % with no rounding dust', () => {
    const panel = opened('sound');
    const seen: number[] = [];
    for (let i = 0; i < 10; i++) {
      press(panel, 'volume:-');
      seen.push(settings.get().volume);
    }
    expect(seen).toEqual([0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0, 0, 0]);
    expect(words(panel)).toContain('0 %');
    expect(control(panel, 'volume:-')?.dim).toBe(true);
    for (let i = 0; i < 12; i++) press(panel, 'volume:+');
    expect(settings.get().volume).toBe(1);
    expect(words(panel)).toContain('100 %');
    expect(control(panel, 'volume:+')?.dim).toBe(true);
  });
});

describe('settings panel: the Sound tab says what tuned the song (UX §3.6, US-22)', () => {
  const tuned = (panel: Panel) => panel.texts().slice(-3);

  it('shows the Wanderer tuning until a room has set one', () => {
    expect(tuned(opened('sound')).map((t) => t.text)).toEqual([
      'Tuned to: C major,',
      'echo 0.9 s',
      'no room found',
    ]);
  });

  it('credits the room with the key and the echo, and says from what', () => {
    const panel = opened('sound');
    panel.setSignature(D_MAJOR_ROOM);
    panel.setFeatures({ level: 1, floorArea: 15.2, ceilingHeight: 2.71 });
    expect(tuned(panel).map((t) => t.text)).toEqual([
      'Tuned to: D major,',
      'echo 0.6 s',
      'room 15 sq m, ceiling 2.7 m',
    ]);
    panel.stale = false; // as after a redraw: each of the two asks for the next one
    panel.setSignature({ ...D_MAJOR_ROOM, keyRoot: -3, mode: 'minorPent', reverbRt60: 2 });
    expect(panel.stale).toBe(true);
    panel.stale = false;
    panel.setFeatures({ level: 2, floorArea: 30 });
    expect(panel.stale).toBe(true);
    expect(tuned(panel).map((t) => t.text)).toEqual(['Tuned to: A minor,', 'echo 2.0 s', 'room 30 sq m']);
  });

  it('takes the Wanderer tuning by its marker, a palette seed of 0, not by being the same object', () => {
    const panel = opened('sound');
    panel.setSignature({ ...WANDERER }); // a copy, as a signature that crossed a save or a worker would be
    panel.setFeatures({ level: 4, floorArea: 12 });
    expect(tuned(panel)[2]?.text).toBe('no room found');
    press(panel, 'tab:garden');
    expect(words(panel)[0]).toBe('Key C major'); // and no "(room)"
  });

  it('dims the echo while Reverb is not on auto', () => {
    const panel = opened('sound');
    expect(tuned(panel).map((t) => t.dim)).toEqual([false, false, false]);
    press(panel, 'reverb:small');
    expect(tuned(panel).map((t) => t.dim)).toEqual([false, true, false]);
    press(panel, 'reverb:off');
    expect(tuned(panel)[1]?.dim).toBe(true);
  });
});

describe('settings panel: the Garden tab asks, it does not act (UX §3.6)', () => {
  const DAY_MS = 86_400_000;

  it('reads the day, the seeds and the key off the garden and the room', () => {
    const panel = opened('garden');
    expect(words(panel)[0]).toBe('Key C major'); // no garden seen yet
    const visited = { createdAt: 1000, lastVisitAt: 1000 + 3.5 * DAY_MS };
    panel.setGarden(garden([], [seed('a'), seed('b')], visited));
    expect(words(panel)[0]).toBe('Day 4, Seeds left 2, Key C major');
    panel.setSignature(D_MAJOR_ROOM);
    expect(words(panel)[0]).toBe('Day 4, Seeds left 2, Key D major (room)');
    panel.setGarden(garden());
    expect(words(panel)[0]).toBe('Day 1, Seeds left 0, Key D major (room)');
  });

  it('Place the garden again says so once and closes the panel', () => {
    const panel = opened('garden');
    const asked = calls.replaceBed;
    press(panel, 'replaceBed');
    expect(asked).toHaveLength(1);
    expect(panel.open).toBe(false);
  });

  it('a bed-height step asks for the next 2 cm, from the height of the garden it last saw', () => {
    const panel = opened('garden');
    const asked = calls.bedHeight;
    expect(words(panel)).toEqual(expect.arrayContaining(['Height', '0 cm']));
    press(panel, 'height:+');
    press(panel, 'height:-');
    expect(asked).toEqual([{ metres: 0.02 }, { metres: -0.02 }]); // no garden seen: from 0
    panel.setGarden(garden([], [], { bedHeightOffset: 0.06 }));
    expect(words(panel)).toContain('+6 cm');
    press(panel, 'height:+');
    press(panel, 'height:-');
    expect(asked.slice(2)).toEqual([{ metres: 0.08 }, { metres: 0.04 }]);
    panel.setGarden(garden([], [], { bedHeightOffset: -0.04 }));
    expect(words(panel)).toContain('-4 cm');
  });

  it('stops the bed height at 10 cm up or down', () => {
    const panel = opened('garden');
    const asked = calls.bedHeight;
    panel.setGarden(garden([], [], { bedHeightOffset: 0.1 }));
    expect(control(panel, 'height:+')?.dim).toBe(true);
    expect(control(panel, 'height:-')?.dim).toBe(false);
    press(panel, 'height:+');
    expect(asked).toEqual([]);
    expect(words(panel)).toContain('+10 cm');
    panel.setGarden(garden([], [], { bedHeightOffset: -0.1 }));
    expect(control(panel, 'height:-')?.dim).toBe(true);
    press(panel, 'height:-');
    expect(asked).toEqual([]);
    press(panel, 'height:+');
    expect(asked).toEqual([{ metres: -0.08 }]);
  });
});

describe('settings panel: the Time-lapse (demo) switch (T-174, D-057)', () => {
  it('shows what the garden says, and a press or a dwell asks for the other; it is no setting', () => {
    const panel = opened('garden');
    expect(words(panel)).toContain('Time-lapse');
    expect(control(panel, 'timeLapse')).toMatchObject({ on: false, text: 'off', dim: false });
    press(panel, 'timeLapse');
    expect(calls.timeLapse).toEqual([true]);
    expect(control(panel, 'timeLapse')).toMatchObject({ on: true, text: 'on' });
    expect(settings.get()).toEqual(DEFAULT_SETTINGS);
    settings.set({ gazeDwell: true });
    lookAt(panel, '');
    lookAt(panel, 'timeLapse');
    run(panel, DEFAULT_SETTINGS.dwellMs, 'timeLapse');
    expect(calls.timeLapse).toEqual([true, false]);
    isTimeLapse = true; // the flag, or a garden that changed it: the switch reads it when drawn
    expect(control(panel, 'timeLapse')?.on).toBe(true);
  });
});

describe('settings panel: New garden needs a hold, so it cannot happen by accident (T-151)', () => {
  it('does nothing on a short press', () => {
    const panel = opened('garden');
    const asked = calls.newGarden;
    press(panel, 'newGarden');
    panel.down('right', 'newGarden');
    run(panel, NEW_GARDEN_HOLD_MS - 1);
    expect(panel.fill[0]).toBeCloseTo(1, 2);
    panel.up('right', 'newGarden');
    expect(asked).toEqual([]);
    expect(panel.fill[0]).toBe(0);
  });

  it('starts a new garden once, when the pinch is let go on it after the full hold', () => {
    const panel = opened('garden');
    const asked = calls.newGarden;
    panel.down('left', 'newGarden');
    expect(panel.cue()).toBe('newGarden');
    run(panel, NEW_GARDEN_HOLD_MS / 2);
    expect(panel.fill[0]).toBeCloseTo(0.5, 5);
    run(panel, NEW_GARDEN_HOLD_MS / 2);
    expect(asked).toEqual([]); // nothing changes before the release (FR-HND-16)
    expect(panel.fill[0]).toBe(1);
    panel.up('left', 'newGarden');
    expect(asked).toHaveLength(1);
    expect(panel.open).toBe(true);
  });

  it('does nothing when the hand moved off it before letting go, however long the hold', () => {
    const panel = opened('garden');
    const asked = calls.newGarden;
    panel.down('right', 'newGarden');
    run(panel, 3 * NEW_GARDEN_HOLD_MS);
    panel.up('right', ''); // hands/ reports a cancelled press with no target
    expect(asked).toEqual([]);
  });

  it('does not count a pause as a hold: a frame is 100 ms at most', () => {
    const panel = opened('garden');
    const asked = calls.newGarden;
    panel.down('right', 'newGarden');
    panel.frame(60_000, '', false); // the headset came off and went back on
    expect(panel.fill[0]).toBeCloseTo(PANEL_MAX_FRAME_MS / NEW_GARDEN_HOLD_MS, 5);
    panel.up('right', 'newGarden');
    expect(asked).toEqual([]);
  });

  it('a hold by one hand does not count for the other hand', () => {
    const panel = opened('garden');
    const asked = calls.newGarden;
    panel.down('left', 'newGarden');
    run(panel, NEW_GARDEN_HOLD_MS);
    panel.up('right', 'newGarden'); // the other hand, which never held it
    expect(asked).toEqual([]);
  });

  it('does not add two short holds up: 1.4 s, let go, then 0.2 s', () => {
    const panel = opened('garden');
    panel.down('right', 'newGarden');
    run(panel, 1400);
    panel.up('right', 'newGarden');
    panel.down('right', 'newGarden');
    expect(panel.fill[0]).toBe(0); // the second hold starts from nothing
    run(panel, 200);
    panel.up('right', 'newGarden');
    expect(calls.newGarden).toEqual([]);
  });

  it('does not count a hold that began on another control: Place the garden again held, let go on New garden', () => {
    const panel = opened('garden');
    panel.down('right', 'replaceBed');
    run(panel, 2 * NEW_GARDEN_HOLD_MS);
    expect(panel.fill[0]).toBe(0); // the fill is New garden's alone
    panel.up('right', 'newGarden');
    expect(calls.newGarden).toEqual([]);
    expect(calls.replaceBed).toEqual([]);
    expect(panel.open).toBe(true);
  });

  it('counts no time for a frame of 0 ms or less, or of a time that is not a number', () => {
    settings.set({ gazeDwell: true, dwellMs: 600 });
    const panel = opened('garden');
    panel.down('right', 'newGarden');
    for (const dt of [0, -50, -NEW_GARDEN_HOLD_MS, NaN, -Infinity]) panel.frame(dt, '', true);
    expect(panel.fill[0]).toBe(0);
    panel.up('right', 'newGarden');
    expect(calls.newGarden).toEqual([]);
    // the dwell and the look-away time stand still too
    lookAt(panel, 'height:+');
    for (const dt of [0, -5000, NaN]) panel.frame(dt, 'height:+', true);
    expect(panel.fill[0]).toBe(0);
    expect(calls.bedHeight).toEqual([]);
    expect(panel.open).toBe(true);
    run(panel, 600, 'height:+'); // and time that does pass still counts in full afterwards
    expect(calls.bedHeight).toEqual([{ metres: 0.02 }]);
  });
});

describe('settings panel: gaze dwell selects with no pinch (FR-HND-12)', () => {
  it.each([600, 900, 1200] as const)('selects after %i ms on a control, and not 1 ms sooner', (ms) => {
    settings.set({ gazeDwell: true, dwellMs: ms });
    const panel = opened('sound');
    lookAt(panel, 'tempo:+');
    run(panel, ms - 1, 'tempo:+');
    expect(settings.get().tempo).toBe(84);
    expect(panel.cue()).toBe('tempo:+');
    expect(panel.fill[0]).toBeCloseTo(1, 2);
    run(panel, 1, 'tempo:+');
    expect(settings.get().tempo).toBe(88);
    expect(panel.fill[0]).toBe(0);
  });

  it('selects once: the gaze has to leave the control before it can select it again', () => {
    settings.set({ gazeDwell: true });
    const panel = opened('sound');
    lookAt(panel, 'tempo:+');
    run(panel, 5000, 'tempo:+');
    expect(settings.get().tempo).toBe(88);
    lookAt(panel, '');
    lookAt(panel, 'tempo:+');
    run(panel, 900, 'tempo:+');
    expect(settings.get().tempo).toBe(92);
  });

  it('starts over when the gaze leaves the control, or moves to another one', () => {
    settings.set({ gazeDwell: true });
    const panel = opened('sound');
    lookAt(panel, 'tempo:+');
    run(panel, 800, 'tempo:+');
    lookAt(panel, ''); // away for one frame
    lookAt(panel, 'tempo:+');
    run(panel, 800, 'tempo:+');
    lookAt(panel, 'tempo:-');
    run(panel, 800, 'tempo:-');
    expect(settings.get().tempo).toBe(84);
    run(panel, 100, 'tempo:-');
    expect(settings.get().tempo).toBe(80);
  });

  it('selects nothing while a hand is pinching somewhere else, and starts over when the pinch ends', () => {
    settings.set({ gazeDwell: true });
    const panel = opened('sound');
    lookAt(panel, 'tempo:+');
    run(panel, 800, 'tempo:+');
    panel.down('left', ''); // a pinch on a plant, say
    run(panel, 5000, 'tempo:+');
    expect(settings.get().tempo).toBe(84);
    expect(panel.cue()).toBe('');
    panel.up('left', '');
    lookAt(panel, 'tempo:+');
    run(panel, 899, 'tempo:+');
    expect(settings.get().tempo).toBe(84);
    run(panel, 1, 'tempo:+');
    expect(settings.get().tempo).toBe(88);
  });

  it('is off unless the gaze mode is on', () => {
    const panel = opened('sound');
    lookAt(panel, 'tempo:+');
    run(panel, 5000, 'tempo:+');
    expect(settings.get().tempo).toBe(84);
    expect(panel.cue()).toBe('');
  });

  it('opens the panel from the orb and closes it from Close', () => {
    settings.set({ gazeDwell: true });
    const panel = new Panel(actions);
    lookAt(panel, ORB_ID);
    run(panel, 900, ORB_ID);
    expect(panel.open).toBe(true);
    run(panel, 5000, ORB_ID); // still looking at the orb: it does not shut again
    expect(panel.open).toBe(true);
    lookAt(panel, 'close');
    run(panel, 900, 'close');
    expect(panel.open).toBe(false);
  });

  it('needs the dwell and then the hold for New garden', () => {
    settings.set({ gazeDwell: true, dwellMs: 600 });
    const panel = opened('garden');
    const asked = calls.newGarden;
    lookAt(panel, 'newGarden');
    run(panel, 600 + NEW_GARDEN_HOLD_MS - 1, 'newGarden');
    expect(asked).toEqual([]);
    run(panel, 1, 'newGarden');
    expect(asked).toHaveLength(1);
  });

  it('cannot switch itself off: a user with no hand to pinch with could not switch it back on', () => {
    settings.set({ gazeDwell: true });
    const panel = opened('access');
    lookAt(panel, 'gazeDwell');
    run(panel, 5000, 'gazeDwell');
    expect(settings.get().gazeDwell).toBe(true);
    expect(panel.cue()).toBe(''); // no ring on it either
    press(panel, 'gazeDwell'); // a pinch can
    expect(settings.get().gazeDwell).toBe(false);
  });

  it('shows that switch as out of reach while the gaze mode is on: drawn faint, and only then', () => {
    const panel = opened('access');
    expect(control(panel, 'gazeDwell')).toMatchObject({ dim: false, on: false, text: 'off' });
    settings.set({ gazeDwell: true });
    expect(control(panel, 'gazeDwell')).toMatchObject({ dim: true, on: true, text: 'on' });
    const faint = panel.controls().filter((c) => c.dim);
    expect(faint.map((c) => c.id)).toEqual(['gazeDwell']);
  });

  it('takes what is under the gaze when the panel opens as looked at already: no second selection', () => {
    // The user dwells on the orb, the panel opens, and a control lies where the gaze still rests.
    settings.set({ gazeDwell: true, dwellMs: 600 });
    const panel = new Panel(actions);
    lookAt(panel, ORB_ID);
    run(panel, 600, ORB_ID);
    expect(panel.open).toBe(true);
    run(panel, 5000, 'reverb:small'); // the orb has stepped aside: this control is under the same gaze
    expect(settings.get().reverb).toBe('auto');
    expect(panel.fill[0]).toBe(0);
    lookAt(panel, ''); // the gaze leaves it and comes back: now it is a choice
    lookAt(panel, 'reverb:small');
    run(panel, 600, 'reverb:small');
    expect(settings.get().reverb).toBe('small');
  });

  it('takes a control that was just pinched as looked at already: one press, one step', () => {
    // Gaze mode with a hand: the user looks at Tempo + and pinches it, and goes on looking at it.
    settings.set({ gazeDwell: true, dwellMs: 600 });
    const panel = opened('sound');
    lookAt(panel, 'tempo:+');
    run(panel, 300, 'tempo:+');
    panel.down('right', 'tempo:+');
    run(panel, 100, 'tempo:+');
    panel.up('right', 'tempo:+');
    expect(settings.get().tempo).toBe(88);
    run(panel, 5000, 'tempo:+');
    expect(settings.get().tempo).toBe(88);
    lookAt(panel, '');
    lookAt(panel, 'tempo:+');
    run(panel, 600, 'tempo:+');
    expect(settings.get().tempo).toBe(92);
  });
});

describe('settings panel: the cue (UX §3.6: a control lights up on hover)', () => {
  it('rings what a pinch holds, else what a hand hovers', () => {
    const panel = opened('sound');
    expect(panel.cue()).toBe('');
    panel.hover('left', 'tempo:-');
    expect(panel.cue()).toBe('tempo:-');
    panel.hover('right', 'tempo:+');
    expect(panel.cue()).toBe('tempo:+');
    panel.down('left', 'volume:+');
    expect(panel.cue()).toBe('volume:+');
    panel.up('left', '');
    panel.hover('right', '');
    panel.hover('left', '');
    expect(panel.cue()).toBe('');
  });
});

describe('settings panel: targets of at least 4 cm with clear gaps (T-151, Golden Rule 3)', () => {
  const layouts = (): [name: string, panel: Panel][] => {
    settings.set({ gazeDwell: true }); // the fullest Access tab: the hold times are on show
    return (['sound', 'access', 'garden'] as const).map((tab) => [tab, opened(tab)]);
  };

  it('every control is 4 cm or more, inside the panel, and covered by its hit sphere', () => {
    for (const [name, panel] of layouts()) {
      for (const c of panel.controls()) {
        expect(c.w, `${name} ${c.id}`).toBeGreaterThanOrEqual(0.04);
        expect(Math.abs(c.x) + c.w / 2, `${name} ${c.id}`).toBeLessThanOrEqual(PANEL_WIDTH_M / 2);
        expect(Math.abs(c.y) + PANEL_TARGET_M / 2, `${name} ${c.id}`).toBeLessThanOrEqual(PANEL_HEIGHT_M / 2);
        expect(c.w / 2, `${name} ${c.id}`).toBeLessThanOrEqual(HIT_RADIUS_M);
      }
    }
  });

  it('two controls are never nearer than 5.5 cm centre to centre, with 1.5 cm clear between them', () => {
    for (const [name, panel] of layouts()) {
      const controls = panel.controls();
      for (const a of controls) {
        for (const b of controls) {
          if (a === b) continue;
          const pair = `${name} ${a.id} / ${b.id}`;
          expect(Math.hypot(a.x - b.x, a.y - b.y), pair).toBeGreaterThanOrEqual(PANEL_TARGET_PITCH_M - 1e-9);
          const gapX = Math.abs(a.x - b.x) - (a.w + b.w) / 2;
          const gapY = Math.abs(a.y - b.y) - PANEL_TARGET_M;
          expect(Math.max(gapX, gapY), pair).toBeGreaterThanOrEqual(0.015 - 1e-9);
        }
      }
    }
  });

  it('no label runs into a control or off the panel', () => {
    const TEXT_HALF_M = 0.01; // a 50 px line on 2500 px per metre
    for (const [name, panel] of layouts()) {
      const texts = panel.texts();
      for (const text of texts) {
        expect(text.x, `${name} ${text.text}`).toBeGreaterThanOrEqual(-PANEL_WIDTH_M / 2);
        expect(text.x + text.w, `${name} ${text.text}`).toBeLessThanOrEqual(PANEL_WIDTH_M / 2);
        expect(Math.abs(text.y) + TEXT_HALF_M).toBeLessThanOrEqual(PANEL_HEIGHT_M / 2);
        for (const c of panel.controls()) {
          if (Math.abs(c.y - text.y) >= PANEL_TARGET_M / 2 + TEXT_HALF_M) continue; // another row
          const clear = text.x >= c.x + c.w / 2 || text.x + text.w <= c.x - c.w / 2;
          expect(clear, `${name}: "${text.text}" and ${c.id}`).toBe(true);
        }
        for (const other of texts) {
          if (other === text || Math.abs(other.y - text.y) >= 2 * TEXT_HALF_M) continue; // another line
          const clear = text.x >= other.x + other.w || text.x + text.w <= other.x;
          expect(clear, `${name}: "${text.text}" and "${other.text}"`).toBe(true);
        }
      }
    }
  });
});

/** A head at `at` with the given turn, in degrees: yaw to the left, pitch up, roll to the left shoulder. */
function headAt(at: [number, number, number], yaw = 0, pitch = 0, roll = 0): Mat4 {
  const rad = Math.PI / 180;
  const turn = new Quaternion().setFromEuler(new Euler(pitch * rad, yaw * rad, roll * rad, 'YXZ'));
  return new Matrix4().compose(new Vector3(...at), turn, new Vector3(1, 1, 1)).elements;
}
/** A world point in the head's own axes: x to its right, y up, z ahead. */
function seenFrom(head: Mat4, p: { x: number; y: number; z: number }) {
  const h = (i: number) => head[i] as number;
  const d = [p.x - h(12), p.y - h(13), p.z - h(14)] as const;
  const dot = (c: number) => d[0] * h(c) + d[1] * h(c + 1) + d[2] * h(c + 2);
  return { x: dot(0), y: dot(4), z: -dot(8) };
}

/** The panel as `placePanel` puts it for `head`: its pose, its centre and its four corners, world. */
function placed(head: Mat4) {
  const pose = new Array<number>(16).fill(0);
  placePanel(head, pose);
  const p = (i: number) => pose[i] as number;
  const corner = (sx: number, sy: number) => {
    const along = (axis: number) =>
      p(12 + axis) + (sx * p(axis) * PANEL_WIDTH_M) / 2 + (sy * p(4 + axis) * PANEL_HEIGHT_M) / 2;
    return new Vector3(along(0), along(1), along(2));
  };
  const corners = [corner(-1, -1), corner(1, -1), corner(-1, 1), corner(1, 1)];
  // Vector3s, not plain { x, y, z }: one plain point handed to the FoV guard, and its per-frame calls further
  // down this file cost heap numbers (the heap test at the end goes red).
  return { pose, centre: new Vector3(p(12), p(13), p(14)), corners };
}

describe('settings panel: where it opens (UX §3.6, FR-UI-03)', () => {
  const SEATED: [number, number, number] = [0, 1.15, 0];
  // The head the panel is placed for: the head itself, or, when that looks down more than 30 degrees, the same
  // head looking 30 degrees down.
  const POSES: [name: string, head: Mat4, placedFor?: Mat4][] = [
    ['level', headAt(SEATED)],
    ['looking at a wrist, 25 degrees down and 20 to the left', headAt(SEATED, 20, -25)],
    ['looking up 35 degrees', headAt(SEATED, 0, 35)],
    ['turned 60 degrees right', headAt(SEATED, -60)],
    ['turned 170 degrees left, leaning', headAt([0.2, 1.05, -0.1], 170, -10)],
    ['head tilted 30 degrees, looking 25 degrees down', headAt(SEATED, -15, -25, 30)],
    ['straight up', headAt(SEATED, 40, 90)],
    ['looking at the bed, 44 degrees down', headAt(SEATED, 0, -44), headAt(SEATED, 0, -30)],
    ['70 degrees down and 50 to the right', headAt(SEATED, -50, -70), headAt(SEATED, -50, -30)],
    ['straight down', headAt(SEATED, 0, -90), headAt(SEATED, 0, -30)],
  ];

  it.each(POSES)('all four corners are inside 25 by 20 degrees: %s', (_name, head, placedFor = head) => {
    const { pose, centre, corners } = placed(head);
    expect(seenFrom(placedFor, centre).z).toBeCloseTo(PANEL_DISTANCE_M, 9); // on the plane the guard works on
    for (let i = 0; i < 12; i++) expect(pose[i], `axis element ${i}`).toBeCloseTo(placedFor[i] as number, 9);
    for (const corner of corners) {
      const local = seenFrom(placedFor, corner);
      const deg = (v: number) => (Math.atan2(v, local.z) * 180) / Math.PI;
      expect(Math.abs(deg(local.x))).toBeLessThanOrEqual(FOV_HALF_H_DEG + 1e-6);
      expect(Math.abs(deg(local.y))).toBeLessThanOrEqual(FOV_HALF_V_DEG + 1e-6);
    }
  });

  it('opens 0.55 m ahead at eye height when the head is level', () => {
    const { centre } = placed(headAt([0.3, 1.15, -0.2]));
    expect(centre.x).toBeCloseTo(0.3, 9);
    expect(centre.y).toBeCloseTo(1.15, 9);
    expect(centre.z).toBeCloseTo(-0.75, 9);
  });

  it('comes as near to eye height as the box allows when the head looks down: its top edge is on 20 degrees', () => {
    const head = headAt([0, 1.15, 0], 0, -20);
    const edges = { leftDeg: 0, rightDeg: 0, downDeg: 0, upDeg: 0 };
    fovBoundsDeg(head, placed(head).centre, PANEL_ELEMENT, edges);
    expect(edges.upDeg).toBeCloseTo(FOV_HALF_V_DEG, 6);
    expect(edges.rightDeg).toBeCloseTo(-edges.leftDeg, 6); // centred
  });

  it.each([30, 44, 70, 90])(
    'stays clear of the table when the head looks %i degrees down: its lower edge at most 35 cm below the eyes',
    (down) => {
      expect(PANEL_MAX_PITCH_DOWN_DEG).toBe(30);
      const EYE_M = 1.15; // the seated sketch of UX §2: the table top is at 0.72 m
      const { centre, corners } = placed(headAt([0, EYE_M, 0], 35, -down));
      const lowest = Math.min(...corners.map((corner) => corner.y));
      expect(lowest).toBeGreaterThanOrEqual(EYE_M - 0.35);
      expect(lowest).toBeCloseTo(EYE_M - 0.3442, 3); // 8.6 cm above that table, the same from 30 degrees on
      // and it is where the head pointed: 35 degrees to the left, not straight ahead in the room
      expect((Math.atan2(-centre.x, -centre.z) * 180) / Math.PI).toBeCloseTo(35, 6);
    },
  );
});

describe('hasPose', () => {
  it('is false for the identity, the head before a session has given its first pose, and true for any pose', () => {
    expect(hasPose(new Matrix4().elements)).toBe(false);
    expect(hasPose(headAt([0, 1.6, 0]))).toBe(true);
    expect(hasPose(headAt([0, 0, 0], 10))).toBe(true);
  });
});

describe('settings orb: where it is (UX §2, FR-UI-09, FR-HND-12)', () => {
  const HEAD = headAt([0, 1.15, 0]);

  it('waits in the view box, on the side that is not the dominant hand, below the gaze line', () => {
    const home = new Vector3();
    orbHome(headAt([0, 1.15, 0], 30, -20), 'right', home);
    const local = seenFrom(headAt([0, 1.15, 0], 30, -20), home);
    expect(local.x).toBeLessThan(0);
    expect(local.y).toBeLessThan(0);
    expect(local.z).toBeCloseTo(0.45, 9);
    expect((Math.atan2(-local.x, local.z) * 180) / Math.PI).toBeCloseTo(20, 6);
    // inside the box: the guard leaves it where it is
    expect(clampToFov(headAt([0, 1.15, 0], 30, -20), home, ORB_ELEMENT, new Vector3())).toBe(false);
    orbHome(HEAD, 'left', home);
    expect(seenFrom(HEAD, home).x).toBeGreaterThan(0);
  });

  it('rides 9 cm off the back of the hand, and shows only while the back of the hand faces the head', () => {
    const out = new Vector3();
    const palmPos = [-0.1, 0.95, -0.3];
    const awayFromHead = [0, 0, -1]; // the palm faces away: its back is to the head
    expect(orbOnHand({ palmPos, palmNormal: awayFromHead }, HEAD, false, out)).toBe(true);
    expect([out.x, out.y, out.z]).toEqual([-0.1, 0.95, -0.3 + ORB_OFF_HAND_M]);
    // palm up, the pose that asks for a seed: hidden
    expect(orbOnHand({ palmPos, palmNormal: [0, 1, 0] }, HEAD, true, out)).toBe(false);
    expect(out.y).toBeCloseTo(0.95 - ORB_OFF_HAND_M, 9);
  });

  it('does not flicker on the edge: it shows above one angle and hides below a smaller one', () => {
    const out = new Vector3();
    const palmPos = [0, 1.15, -0.3]; // straight ahead of the head
    const turned = (facing: number) => [Math.sqrt(1 - facing * facing), 0, -facing];
    const between = (ORB_SHOW_FACING + ORB_HIDE_FACING) / 2;
    expect(orbOnHand({ palmPos, palmNormal: turned(between) }, HEAD, false, out)).toBe(false);
    expect(orbOnHand({ palmPos, palmNormal: turned(between) }, HEAD, true, out)).toBe(true);
    expect(orbOnHand({ palmPos, palmNormal: turned(ORB_SHOW_FACING + 0.01) }, HEAD, false, out)).toBe(true);
    expect(orbOnHand({ palmPos, palmNormal: turned(ORB_HIDE_FACING - 0.01) }, HEAD, true, out)).toBe(false);
    const atTheHead = { palmPos: [0, 1.15, 0], palmNormal: turned(1) };
    expect(orbOnHand(atTheHead, HEAD, true, out)).toBe(false);
  });
});

describe('gazeTarget (FR-HND-12, FR-HND-04)', () => {
  const HEAD = headAt([0, 1.15, 0], 0, 0);
  const AHEAD = -0.55;
  const NONE = -1; // no memory: nothing was under the gaze before
  /** Targets on the plane 0.55 m ahead, each `x` metres to the side of the gaze line. */
  const beside = (...xs: number[]) => new Float32Array(xs.flatMap((x) => [x, 1.15, AHEAD]));

  it('picks the target the gaze line passes nearest to, within the hit radius', () => {
    const centres = new Float32Array([0.03, 1.15, AHEAD, -0.01, 1.16, AHEAD, 0.2, 1.15, AHEAD]);
    expect(gazeTarget(HEAD, centres, 3, NONE)).toBe(1);
    expect(gazeTarget(HEAD, centres, 1, NONE)).toBe(0);
    expect(gazeTarget(headAt([0.2, 1.15, 0]), centres, 3, NONE)).toBe(2);
  });

  it('picks the nearest wherever it stands in the list: first, with a farther one in range after it', () => {
    expect(gazeTarget(HEAD, beside(0.01, 0.03), 2, NONE)).toBe(0);
    expect(gazeTarget(HEAD, beside(0.03, 0.01), 2, NONE)).toBe(1);
    expect(gazeTarget(HEAD, beside(0.02, -0.01, 0.03), 3, NONE)).toBe(1);
  });

  it('picks nothing when the line passes every target by more than 4 cm, or the target is behind the head', () => {
    expect(gazeTarget(HEAD, beside(HIT_RADIUS_M + 0.001), 1, NONE)).toBe(-1);
    expect(gazeTarget(HEAD, beside(HIT_RADIUS_M - 0.001), 1, NONE)).toBe(0);
    expect(gazeTarget(HEAD, new Float32Array([0, 1.15, 0.55]), 1, NONE)).toBe(-1);
    expect(gazeTarget(HEAD, new Float32Array(0), 0, NONE)).toBe(-1);
    expect(gazeTarget(HEAD, new Float32Array([NaN, NaN, NaN]), 1, 0)).toBe(-1); // a hidden orb's slot
    // the head turns to it: 30 degrees left, the target on that line
    const turned = headAt([0, 1.15, 0], 30);
    const onLine = new Float32Array([-0.55 * Math.sin(Math.PI / 6), 1.15, -0.55 * Math.cos(Math.PI / 6)]);
    expect(gazeTarget(turned, onLine, 1, NONE)).toBe(0);
    expect(gazeTarget(HEAD, onLine, 1, NONE)).toBe(-1);
  });

  it('keeps the target it had on the edge of its radius: 5 mm of memory, as the hand picker has', () => {
    expect(HOVER_DEAD_BAND_M).toBe(0.005);
    const onTheEdge = beside(HIT_RADIUS_M + 0.002);
    expect(gazeTarget(HEAD, onTheEdge, 1, NONE)).toBe(-1); // not yet in
    expect(gazeTarget(HEAD, onTheEdge, 1, 0)).toBe(0); // but not yet out
    expect(gazeTarget(HEAD, beside(HIT_RADIUS_M + 0.006), 1, 0)).toBe(-1); // out
  });

  it('keeps the target it had between two neighbours until the other is 5 mm nearer', () => {
    const between = beside(-0.0275, 0.0275); // the gaze rests on the border of two controls 5.5 cm apart
    expect(gazeTarget(HEAD, between, 2, 0)).toBe(0);
    expect(gazeTarget(HEAD, between, 2, 1)).toBe(1);
    expect(gazeTarget(HEAD, beside(-0.03, 0.026), 2, 0)).toBe(0); // 4 mm nearer: not enough
    expect(gazeTarget(HEAD, beside(-0.03, 0.024), 2, 0)).toBe(1); // 6 mm nearer
  });
});

describe('isHeadTurning (UX §9.8)', () => {
  /** The smoothed speed after `ms` of a head that turns at `degPerS`, in 14 ms frames; and the last answer. */
  function turn(degPerS: number, ms: number) {
    const memory = new Float64Array(4);
    let isTurning = false;
    for (let t = 0; t <= ms; t += 14)
      isTurning = isHeadTurning(headAt([0, 1.15, 0], (degPerS * t) / 1000), 14, memory);
    return { degPerS: memory[3] as number, isTurning };
  }

  it('a steady 10 deg/s turn reads within 0.5 deg/s of 10 after 500 ms, and is a turn', () => {
    const { degPerS, isTurning } = turn(10, 500);
    expect(degPerS).toBeGreaterThan(9.5);
    expect(degPerS).toBeLessThan(10.5);
    expect(isTurning).toBe(true);
  });

  it('a still head reads 0; 5 deg/s is no turn; a frame of no time changes nothing', () => {
    expect(turn(0, 500)).toEqual({ degPerS: 0, isTurning: false });
    expect(turn(5, 500).isTurning).toBe(false);
    const memory = new Float64Array(4);
    isHeadTurning(headAt([0, 1.15, 0], 0), 14, memory);
    isHeadTurning(headAt([0, 1.15, 0], 30), 0, memory);
    expect([memory[2], memory[3]]).toEqual([-1, 0]); // still the forward of yaw 0, still no speed
  });
});

describe('settings panel: the dwell holds while the head turns (UX §9.8)', () => {
  /**
   * The head sweeps sideways at `degPerS` through the centre of tempo:+, 0.55 m ahead, from 15 degrees off;
   * the gaze line picks it as PanelSystem does. Returns how many times it was selected.
   */
  function sweep(degPerS: number): number {
    settings.set({ gazeDwell: true, dwellMs: 600 });
    const panel = opened('sound');
    const centre = new Float32Array([0, 1.15, -0.55]);
    const memory = new Float64Array(4);
    let kept = -1;
    for (let t = 0; t <= (30 / degPerS) * 1000; t += 14) {
      const head = headAt([0, 1.15, 0], -15 + (degPerS * t) / 1000);
      kept = gazeTarget(head, centre, 1, kept);
      panel.frame(14, kept === 0 ? 'tempo:+' : '', false, isHeadTurning(head, 14, memory));
    }
    return (settings.get().tempo - 84) / 4;
  }

  it('at a 600 ms dwell a 10 deg/s sweep selects nothing, and a 5 deg/s sweep selects once', () => {
    expect(sweep(10)).toBe(0); // 0.9 s inside the control's gaze zone: without the hold it would select
    expect(sweep(5)).toBe(1);
  });

  it('a burst of turning while the gaze rests on a control holds the fill; the select still comes, later', () => {
    settings.set({ gazeDwell: true, dwellMs: 600 });
    const panel = opened('sound');
    lookAt(panel, 'tempo:+');
    run(panel, 300, 'tempo:+');
    const fill = panel.fill[0];
    for (let ms = 0; ms < 500; ms += 50) panel.frame(50, 'tempo:+', false, true);
    expect(panel.fill[0]).toBe(fill);
    expect(settings.get().tempo).toBe(84);
    run(panel, 300, 'tempo:+');
    expect(settings.get().tempo).toBe(88);
  });
});

describe('settings panel: reduced motion (FR-UI-06)', () => {
  it('has no motion to reduce: it is there at once, and the setting changes nothing but its own switch', () => {
    const panel = opened('access');
    const before = { controls: panel.controls(), texts: panel.texts() };
    settings.set({ reducedMotion: true });
    const fresh = opened('access'); // open at once: no frame has run
    expect(fresh.open).toBe(true);
    expect(fresh.texts()).toEqual(before.texts);
    expect(fresh.controls()).toEqual(
      before.controls.map((c) => (c.id === 'reducedMotion' ? { ...c, on: true, text: 'on' } : c)),
    );
  });
});

describe('what the open panel costs per frame (CODING_GUIDELINES §5)', () => {
  it('the frame, the gaze pick and the look-away check create nothing on the heap', () => {
    const ROUNDS = 20_000;
    settings.set({ gazeDwell: true });
    const panel = opened('access');
    const controls = panel.controls();
    const idList = controls.map((c) => c.id);
    const head = new Matrix4().makeTranslation(0, 1.15, 0).elements;
    const centres = new Float32Array(controls.flatMap((c) => [c.x, 1.15 + c.y, -PANEL_DISTANCE_M]));
    const centre = new Vector3(0, 1.15, -PANEL_DISTANCE_M);
    const scratch = new Vector3();
    const POINT = { distanceM: PANEL_DISTANCE_M, halfWidthM: 0, halfHeightM: 0 };
    let picked = 0;
    let cued = 0;
    let filled = 0;
    let kept = -1;
    const frames = (): void => {
      for (let i = 0; i < ROUNDS; i++) {
        // Idle: the gaze sweeps over the controls (5 mm a frame, 72 frames a second) and rests on none of them
        // long enough to select it. A selection changes what is on show, and that redraw may allocate.
        head[12] = ((i % 80) - 40) / 200;
        const hit = gazeTarget(head, centres, idList.length, kept);
        kept = hit;
        if (hit >= 0) picked++;
        const away = clampToFov(head, centre, POINT, scratch);
        panel.frame(14, idList[hit] ?? '', away); // whole milliseconds, as PanelSystem hands them on
        if (panel.cue() !== '') cued++;
        if ((panel.fill[0] as number) > 0) filled++;
      }
    };
    const keeper: { kept: object | null } = { kept: null };
    const allocate = (): void => {
      for (let i = 0; i < ROUNDS; i++) keeper.kept = { i };
    };
    frames(); // warm up: the JIT's own allocations happen here
    frames();
    allocate();

    const control = heapCost(allocate);
    expect(control.gcs > 0 || control.grewBytes > ROUNDS * 8).toBe(true); // the probe sees that leak
    // The best of three rounds: the JIT may still finish a compile during one of them.
    const costs = [heapCost(frames), heapCost(frames), heapCost(frames)];
    const clean = costs.filter((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES);
    expect(clean.length, JSON.stringify(costs)).toBeGreaterThan(0);
    expect(picked).toBeGreaterThan(ROUNDS); // the gaze was on a control in many of the frames
    expect(cued).toBeGreaterThan(ROUNDS);
    expect(filled).toBeGreaterThan(ROUNDS); // and the fill was growing
    expect(settings.get()).toEqual({ ...DEFAULT_SETTINGS, gazeDwell: true }); // idle: nothing was selected
    expect(panel.open).toBe(true);
    expect(keeper.kept).not.toBeNull();
  });
});

describe('panel strings', () => {
  const texts = (value: unknown): string[] =>
    typeof value === 'string' ? [value] : Object.values(value as object).flatMap(texts);
  const all = texts(PANEL);

  it('are plain English: the character set of core/strings.ts, plus the plus and percent signs of a read-out', () => {
    expect(all.length).toBeGreaterThan(40);
    for (const text of all) {
      expect(text).toMatch(/^[A-Za-z0-9 .,:;!?'()%+-]+$/);
      expect(text).toBe(text.trim());
      expect(text).not.toMatch(/ {2}/);
    }
  });

  it('do not promise eye control: the gaze mode is named for what it asks (UX §9.7)', () => {
    expect(PANEL.gazeDwell).toBe('Look to select');
    expect(all.join(' ')).not.toMatch(/eye|gaze|dwell/i);
  });
});

describe('the sound of a press (T-164 §6)', () => {
  it('reports each press or dwell that acts with its id, before it acts; one on nothing on show reports none', () => {
    const panel = new Panel(actions);
    press(panel, 'height:+'); // the panel is closed: nothing is on show
    press(panel, ORB_ID);
    press(panel, 'tab:garden');
    press(panel, 'height:+');
    press(panel, 'replaceBed');
    expect(calls.pressed).toEqual([ORB_ID, 'tab:garden', 'height:+', 'replaceBed']);
    expect(calls.replaceBed).toHaveLength(1);
  });
});
