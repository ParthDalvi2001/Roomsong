// The settings panel without its drawing (UX §3.6, T-151): what each tab shows, what a press, a hold or a dwell
// does, and where the panel and its orb go. No Three.js and no canvas here: ui/PanelSystem.ts draws what this file
// lists and feeds it the events and the frame. Settings are read from and written through core's store.
import { MS_PER_DAY, settings, validateSettings } from '../core/index.js';
import { setBedHeightOffset, WANDERER } from '../garden/index.js';
import { HIT_RADIUS_M, HOVER_DEAD_BAND_M, ORB_HIDE_FACING, ORB_SHOW_FACING } from '../hands/index.js';

import {
  BED_HEIGHT_STEP_M,
  HEAD_SPEED_SMOOTHING_MS,
  HEAD_TURN_PAUSE_DEG_PER_S,
  NEW_GARDEN_HOLD_MS,
  ORB_BELOW_GAZE_DEG,
  ORB_DISTANCE_M,
  ORB_OFF_HAND_M,
  ORB_SIDE_DEG,
  PANEL_DISTANCE_M,
  PANEL_HEIGHT_M,
  PANEL_LOOK_AWAY_MS,
  PANEL_MAX_FRAME_MS,
  PANEL_MAX_PITCH_DOWN_DEG,
  PANEL_TARGET_M,
  PANEL_TARGET_PITCH_M,
  PANEL_WIDE_TARGET_M,
  PANEL_WIDTH_M,
  TEMPO_STEP_BPM,
  VOLUME_STEP,
} from './config.js';
import { clampToFov, type FovElement } from './FovGuard.js';
import { PANEL } from './strings.js';

import type { Hand, Mat4, Settings, Vec3 } from '../core/index.js';
import type { GardenState, RoomFeatures, RoomSignature } from '../garden/index.js';

export type PanelTab = keyof typeof PANEL.tabs;

/** One pinch and gaze target, in the panel's own plane: metres from its centre, x to the right and y up. */
export interface PanelControl {
  id: string;
  x: number;
  y: number;
  /** Drawn width: PANEL_TARGET_M (round) or PANEL_WIDE_TARGET_M (it holds a word). Always PANEL_TARGET_M tall. */
  w: number;
  /** Drawn inside it. */
  text: string;
  /** Switched on, or the chosen one of its row. */
  on: boolean;
  /**
   * Drawn faint. A stepper at its limit, where a press changes nothing; and the gaze switch while the gaze mode is
   * on, because the gaze cannot act on it (a pinch still does).
   */
  dim: boolean;
}

/** A label or a read-out: its left end at `x`, its middle line at `y`, squeezed into `w` when it is longer. */
export interface PanelText {
  x: number;
  y: number;
  w: number;
  text: string;
  /** Not in effect now (the room's echo while Reverb is not on auto). */
  dim: boolean;
}

/**
 * What the Garden tab asks for. ui/ changes neither the garden nor the room: `PanelSystem` hands these on to the
 * app's GardenSystem and RoomSystem (API_SPEC §1.10).
 */
export interface PanelActions {
  /** FR-PER-03: a new garden in place of this one. The hold was the confirm. */
  newGarden(): void;
  /** D-060 item 13: whether the garden a New garden replaced can come back now, read each time the row is drawn;
   *  and the ask, on the same row and hold. */
  canRestore(): boolean;
  restoreGarden(): void;
  /** FR-ROOM-05: the bed is placed again. The panel has closed by then. */
  replaceBed(): void;
  /** FR-UI-10: the bed's height offset that is asked for, in metres. */
  setBedHeightOffset(metres: number): void;
  /** T-174: whether the time-lapse demo runs, read each time the switch is drawn; and the switch's ask. */
  isTimeLapse(): boolean;
  setTimeLapse(on: boolean): void;
  /** A press or a dwell acted on `id` (ORB_ID for the orb): its sound (T-164 §6), before what it does. */
  pressed(id: string): void;
}

/** Element `i` of a matrix, of a list of centres or of the panel's timers. */
const at = (list: ArrayLike<number>, i: number): number => list[i] as number;
// The panel's timers (Panel.ms).
const HELD = 0;
const GAZE = 1;
const AWAY = 2;

/** The id of the settings orb: like every control it is an Interactable of kind 'panel'. */
export const ORB_ID = 'orb';
export const NEW_GARDEN_ID = 'newGarden';
const TIME_LAPSE_ID = 'timeLapse';
// The gaze cannot switch itself off: a user with no hand to pinch with could not switch it back on.
const GAZE_TOGGLE_ID = 'gazeDwell';

// The layout, in the panel's plane. Rows are PANEL_TARGET_PITCH_M apart; the header holds the tabs and Close.
const HEADER_Y = PANEL_TARGET_PITCH_M * 2;
const ROW_Y = [1, 0, -1, -2].map((row) => row * PANEL_TARGET_PITCH_M) as [number, number, number, number];
const LEFT_X = -0.19; // where a row's label starts
const FULL_W = 0.38;
const LABEL_W = 0.1;
const TAB_X = [-0.15, -0.05, 0.05] as const;
const CLOSE_X = 0.17;
const MINUS_X = -0.05;
const PLUS_X = 0.11;
const VALUE_X = -0.015; // the read-out of a stepper, between its two buttons
const VALUE_W = 0.09;
const OPTION_X = [-0.04, 0.055, 0.15] as const; // the three choices of Reverb and of Hold time
// Two switches to a row, each with its label to its right; the third column is the Sound tab's Mono (P-014), under
// the steppers' plus, beside "Tuned by": no tab had a free row for it.
const TOGGLE_X = [-0.17, 0.03, PLUS_X] as const;
const TOGGLE_LABEL_M = 0.03; // from a switch's centre to where its label starts
const TOGGLE_LABEL_W = 0.13;
const BEAT_LABEL_W = 0.11; // "Main hand" shares its row
const MONO_LABEL_W = 0.05; // to the panel's edge
const HAND_LABEL_X = -0.02;
const HAND_LABEL_W = 0.1;
const HAND_X = [0.11, 0.17] as const;
const ACTION_X = -0.15;
const ACTION_LABEL_X = -0.09;
const ACTION_LABEL_W = 0.28;
// The Garden tab's height row (T-167, T-174): "Height" and a narrow stepper on the left, so the Time-lapse switch
// fits on its right and "Place the garden again" and "New garden (erases this one)" keep whole rows.
// The read-out is the number only ("+10" is about 0.036 m): "+10 cm" ran into the plus button's ring.
const HEIGHT_LABEL_W = 0.065; // "Height" is about 0.06 m
const HEIGHT_MINUS_X = -0.105;
const HEIGHT_VALUE_X = -0.08;
const HEIGHT_VALUE_W = 0.04; // ends 1 cm before the plus button
const HEIGHT_PLUS_X = -0.01;
const TIME_LAPSE_X = 0.045; // one pitch from the plus
const TIME_LAPSE_LABEL_W = 0.115; // "Time-lapse" is about 0.1 m: it ends about 2 cm short of the panel's edge
const TUNED_Y = ROW_Y[3] + 0.005; // the two lines of "Tuned by" sit a little above the last row's middle
const LINE_M = 0.013; // half the distance between those two lines
// Both lines end before the Mono switch: "Tuned by: C major," is about 0.165 m, "echo 0.9 s" 0.09 m and the longest
// second line, "room 120 sq m, ceiling 3.4 m", 0.26 m, in the panel's 50 px font.
const TUNED_W = 0.175;
const ECHO_X = -0.01;
const ECHO_W = 0.095;
const ROOM_W = 0.27;

const TABS: Readonly<Record<string, PanelTab>> = {
  'tab:sound': 'sound',
  'tab:access': 'access',
  'tab:garden': 'garden',
};
const REVERBS = ['auto', 'small', 'off'] as const;
const DWELLS: readonly Settings['dwellMs'][] = [600, 900, 1200];

/** One more step of the volume, without the dust of adding 0.1 ten times. */
const volumeAfter = (volume: number, steps: number): number =>
  Math.round((volume + steps * VOLUME_STEP) * 100) / 100;

/** What a press on a settings control asks of core's store; the store's validator keeps it in range. */
const PATCHES: Readonly<Record<string, (s: Readonly<Settings>) => Partial<Settings>>> = {
  'tempo:-': (s) => ({ tempo: s.tempo - TEMPO_STEP_BPM }),
  'tempo:+': (s) => ({ tempo: s.tempo + TEMPO_STEP_BPM }),
  'volume:-': (s) => ({ volume: volumeAfter(s.volume, -1) }),
  'volume:+': (s) => ({ volume: volumeAfter(s.volume, 1) }),
  'reverb:auto': () => ({ reverb: 'auto' }),
  'reverb:small': () => ({ reverb: 'small' }),
  'reverb:off': () => ({ reverb: 'off' }),
  mono: (s) => ({ mono: !s.mono }),
  oneHand: (s) => ({ oneHand: !s.oneHand }),
  gazeDwell: (s) => ({ gazeDwell: !s.gazeDwell }),
  'dwell:600': () => ({ dwellMs: 600 }),
  'dwell:900': () => ({ dwellMs: 900 }),
  'dwell:1200': () => ({ dwellMs: 1200 }),
  highContrast: (s) => ({ highContrast: !s.highContrast }),
  reducedMotion: (s) => ({ reducedMotion: !s.reducedMotion }),
  beatRing: (s) => ({ beatRing: !s.beatRing }),
  'hand:left': () => ({ dominantHand: 'left' }),
  'hand:right': () => ({ dominantHand: 'right' }),
};

const round = (id: string, x: number, y: number, text: string): PanelControl => ({
  id,
  x,
  y,
  w: PANEL_TARGET_M,
  text,
  on: false,
  dim: false,
});
const wide = (id: string, x: number, y: number, text: string): PanelControl => ({
  ...round(id, x, y, text),
  w: PANEL_WIDE_TARGET_M,
});
const lit = (control: PanelControl, on: boolean): PanelControl => ({ ...control, on });
const label = (x: number, y: number, w: number, text: string): PanelText => ({ x, y, w, text, dim: false });

/** A switch: it says "on" or "off" in words, so its state is not carried by its fill alone. */
function toggle(id: string, column: 0 | 1 | 2, y: number, value: boolean): PanelControl {
  return lit(round(id, TOGGLE_X[column], y, value ? PANEL.on : PANEL.off), value);
}
const toggleLabel = (column: 0 | 1 | 2, y: number, text: string): PanelText =>
  label(TOGGLE_X[column] + TOGGLE_LABEL_M, y, TOGGLE_LABEL_W, text);

/** The two buttons of a tempo or volume stepper. One is dim when the store's validator would not move the value. */
function stepper(name: 'tempo' | 'volume', y: number, s: Readonly<Settings>): PanelControl[] {
  return [
    { id: `${name}:-`, x: MINUS_X, text: PANEL.minus },
    { id: `${name}:+`, x: PLUS_X, text: PANEL.plus },
  ].map(({ id, x, text }) => {
    const patch = PATCHES[id];
    const next = patch === undefined ? s : validateSettings({ ...s, ...patch(s) }, s);
    return { ...round(id, x, y, text), dim: next[name] === s[name] };
  });
}

const keyName = (sig: RoomSignature): string => `${PANEL.keys[`${sig.keyRoot}`]} ${PANEL.modes[sig.mode]}`;

/** UX §3.6, the second line of "Tuned by": from what the room set the key and the echo. */
function roomLine(sig: RoomSignature, features: RoomFeatures | null): string {
  if (sig.paletteSeed === 0) return PANEL.noRoom; // 0 = Wanderer (API_SPEC §1.1)
  const parts: string[] = [];
  if (features?.floorArea !== undefined)
    parts.push(`${PANEL.room} ${Math.round(features.floorArea)} ${PANEL.squareMetres}`);
  if (features?.ceilingHeight !== undefined)
    parts.push(`${PANEL.ceiling} ${features.ceilingHeight.toFixed(1)} ${PANEL.metres}`);
  return parts.join(', ');
}

/**
 * UX §3.6: "Day 4, Seeds left 2, Key D major (room)". The day is the garden's age in whole days of 24 hours, plus one.
 * The seeds' day is the local calendar day (garden/growth.ts, which keeps that helper to itself and needs the time
 * zone): the two can differ by one around midnight.
 */
function gardenLine(garden: GardenState | null, sig: RoomSignature): string {
  const parts: string[] = [];
  if (garden !== null) {
    const day = Math.max(1, Math.floor((garden.lastVisitAt - garden.createdAt) / MS_PER_DAY) + 1);
    parts.push(`${PANEL.day} ${day}`, `${PANEL.seeds} ${garden.seeds.length}`);
  }
  parts.push(`${PANEL.key} ${keyName(sig)}${sig.paletteSeed === 0 ? '' : ` ${PANEL.fromRoom}`}`);
  return parts.join(', ');
}

/** FR-UI-10: the offset one more step would ask for, in metres, to the millimetre. */
const heightAfter = (garden: GardenState | null, steps: number): number =>
  Math.round(((garden?.bedHeightOffset ?? 0) + steps * BED_HEIGHT_STEP_M) * 1000) / 1000;

function heightText(garden: GardenState | null): string {
  const cm = Math.round((garden?.bedHeightOffset ?? 0) * 100);
  return `${cm > 0 ? PANEL.plus : ''}${cm}`;
}

/**
 * The panel's state and rules. One per app; `PanelSystem` owns it.
 * A press acts when the pinch ends on the control it started on (FR-HND-16), a dwell when the gaze has rested on
 * a control for `Settings.dwellMs` (FR-HND-12). New garden also needs NEW_GARDEN_HOLD_MS of hold, either way.
 */
export class Panel {
  /** Something it shows has changed. Whoever draws it clears this. */
  /** The New garden row was last drawn as "Bring back the old garden" (D-060 item 13). */
  private couldRestore = false;
  /** The hold on the New garden row began while the old garden could come back: its release restores, never
   *  erases, though the window closed during the hold (bug bash 27 Oct, S1). */
  private restoreHeld = false;
  /** BUG-014: the gaze mode was just switched by a press: the first control the gaze rests on after it (one that
   *  appears under the head's line a frame later) counts as selected, until the gaze leaves it. */
  private isFreshGaze = false;
  stale = true;
  /**
   * `fill[0]`: how far the hold on New garden or the dwell has come, 0..1. A level, never a blink (FR-UI-11).
   * An array for the same reason as `ms` below. A per-frame reader takes `fill[0] as number`: a `??` on it costs
   * heap numbers too.
   */
  readonly fill = new Float64Array(1);

  private isOpen = false;
  private shownTab: PanelTab = 'sound';
  private garden: GardenState | null = null;
  private signature: RoomSignature = WANDERER;
  private features: RoomFeatures | null = null;
  private readonly pinching = { left: false, right: false };
  private readonly hovered = { left: '', right: '' };
  private heldId = '';
  private heldHand: Hand = 'right';
  private gazeId = '';
  /** The dwell on `gazeId` has acted: it does not act again until the gaze has left it. */
  private gazeDone = false;
  /** Something was selected since the gaze was last looked at (`dwell`). */
  private selected = false;
  // How long the pinch has been held, the gaze has rested and the look has been away, in ms. A typed array, not
  // three fields: a fraction written to a field costs a heap number every frame (16 bytes, measured with the heap
  // probe of tests/unit/ui/Panel.test.ts).
  private readonly ms = new Float64Array(3);

  constructor(private readonly actions: PanelActions) {}

  get open(): boolean {
    return this.isOpen;
  }

  get tab(): PanelTab {
    return this.shownTab;
  }

  /** The targets on show: the header and the open tab; none while the panel is closed. A new array: not per frame. */
  controls(): PanelControl[] {
    if (!this.isOpen) return [];
    const s = settings.get();
    const header = [
      ...Object.entries(TABS).map(([id, tab], i) =>
        lit(wide(id, TAB_X[i] ?? 0, HEADER_Y, PANEL.tabs[tab]), tab === this.shownTab),
      ),
      round('close', CLOSE_X, HEADER_Y, PANEL.close),
    ];
    if (this.shownTab === 'sound') return [...header, ...this.soundControls(s)];
    if (this.shownTab === 'access') return [...header, ...this.accessControls(s)];
    return [...header, ...this.gardenControls()];
  }

  /** The labels and read-outs of the open tab. A new array: not per frame. */
  texts(): PanelText[] {
    if (!this.isOpen) return [];
    const s = settings.get();
    if (this.shownTab === 'sound') return this.soundTexts(s);
    if (this.shownTab === 'access') return this.accessTexts(s);
    return [
      label(LEFT_X, ROW_Y[0], FULL_W, gardenLine(this.garden, this.signature)),
      label(LEFT_X, ROW_Y[1], HEIGHT_LABEL_W, PANEL.bedHeight),
      label(HEIGHT_VALUE_X, ROW_Y[1], HEIGHT_VALUE_W, heightText(this.garden)),
      label(TIME_LAPSE_X + TOGGLE_LABEL_M, ROW_Y[1], TIME_LAPSE_LABEL_W, PANEL.timeLapse),
      label(ACTION_LABEL_X, ROW_Y[2], ACTION_LABEL_W, PANEL.replaceBed),
      label(
        ACTION_LABEL_X,
        ROW_Y[3],
        ACTION_LABEL_W,
        this.actions.canRestore() ? PANEL.bringBack : PANEL.newGarden,
      ),
    ];
  }

  /** The garden as of the latest `garden:changed`: the bed height, the day and the seed count are read from it. */
  setGarden(garden: GardenState): void {
    this.garden = garden;
    this.stale = true;
  }

  /** The room's signature (`room:signature`). Until the first one the panel shows the Wanderer tuning, as audio plays it. */
  setSignature(signature: RoomSignature): void {
    this.signature = signature;
    this.stale = true;
  }

  setFeatures(features: RoomFeatures): void {
    this.features = features;
    this.stale = true;
  }

  /** A hand's hover (`target:hover`): the id of a control or of the orb, or '' for anything else. */
  hover(hand: Hand, id: string): void {
    this.hovered[hand] = id;
  }

  /** A pinch started (`gesture:pinchStart`): on the control or orb `id`, or on anything else (''). */
  down(hand: Hand, id: string): void {
    this.pinching[hand] = true;
    if (id === '') return;
    this.heldId = id;
    this.heldHand = hand;
    this.ms[HELD] = 0;
    if (id === NEW_GARDEN_ID) this.restoreHeld = this.actions.canRestore();
    this.refill();
  }

  /** A pinch ended (`gesture:release`): as a press on `id`, or as anything else (''), which acts on nothing. */
  up(hand: Hand, id: string): void {
    this.pinching[hand] = false;
    const mine = this.heldHand === hand && this.heldId !== '';
    const heldMs = mine && this.heldId === id ? at(this.ms, HELD) : 0;
    if (mine) this.heldId = '';
    this.refill();
    if (id === '' || (id === NEW_GARDEN_ID && heldMs < NEW_GARDEN_HOLD_MS)) return;
    this.select(id);
  }

  /**
   * One frame of `dtMs`. `gazeId`: the control or orb on the gaze line, '' for none. `away`: the panel's centre
   * is outside the FoV box. `isTurning`: the head turns faster than 8 deg/s (`isHeadTurning`), so the dwell holds.
   * Creates nothing unless something acts.
   */
  frame(dtMs: number, gazeId: string, away: boolean, isTurning = false): void {
    const ms = this.ms;
    const dt = dtMs > 0 ? Math.min(dtMs, PANEL_MAX_FRAME_MS) : 0; // a time that is not a number counts as 0
    if (this.heldId !== '') ms[HELD] = at(ms, HELD) + dt;
    ms[AWAY] = this.isOpen && away ? at(ms, AWAY) + dt : 0;
    if (at(ms, AWAY) >= PANEL_LOOK_AWAY_MS) this.setOpen(false);
    const s = settings.get();
    const gazing = s.gazeDwell && !this.pinching.left && !this.pinching.right && gazeId !== GAZE_TOGGLE_ID;
    this.dwell(dt, gazing ? gazeId : '', s, isTurning);
    this.refill();
    // D-060 item 13: the New garden row reads "Bring back the old garden" while that can be done: redraw at the turn.
    const canRestore = this.isOpen && this.shownTab === 'garden' && this.actions.canRestore();
    if (canRestore !== this.couldRestore) {
      this.couldRestore = canRestore;
      this.stale = true;
    }
  }

  /** The control or orb to ring: the one a pinch is held on, else the one under the gaze, else a hovered one. */
  cue(): string {
    return this.heldId || this.gazeId || this.hovered.right || this.hovered.left;
  }

  close(): void {
    this.setOpen(false);
  }

  /** FR-HND-12: the gaze rests on `id` ('' = on nothing) for one more frame. */
  private dwell(dt: number, id: string, s: Readonly<Settings>, isTurning: boolean): void {
    const ms = this.ms;
    // What comes under the gaze right after a selection counts as selected already. The panel opens under a gaze
    // that rests where the orb was, and a pinch on a control ends with the gaze still on it: neither look asked
    // for a second selection.
    const afterSelection = this.selected;
    this.selected = false;
    if (id !== this.gazeId) {
      this.gazeId = id;
      ms[GAZE] = 0;
      this.gazeDone = afterSelection || (this.isFreshGaze && id !== '');
      if (id !== '') this.isFreshGaze = false;
      if (id === NEW_GARDEN_ID && !this.pinching.left && !this.pinching.right)
        this.restoreHeld = this.actions.canRestore();
      return;
    }
    if (id === '' || this.gazeDone || isTurning) return; // UX §9.8: a fast turn holds the dwell, leaving resets it
    ms[GAZE] = at(ms, GAZE) + dt;
    if (at(ms, GAZE) < this.dwellMs(s)) return;
    this.gazeDone = true;
    this.select(id);
  }

  private dwellMs(s: Readonly<Settings>): number {
    return s.dwellMs + (this.gazeId === NEW_GARDEN_ID ? NEW_GARDEN_HOLD_MS : 0);
  }

  private refill(): void {
    const ms = this.ms;
    if (this.heldId === NEW_GARDEN_ID) this.fill[0] = Math.min(1, at(ms, HELD) / NEW_GARDEN_HOLD_MS);
    else if (this.gazeId === '' || this.gazeDone) this.fill[0] = 0;
    else this.fill[0] = Math.min(1, at(ms, GAZE) / this.dwellMs(settings.get()));
  }

  private setOpen(open: boolean): void {
    if (open === this.isOpen) return;
    this.isOpen = open;
    this.ms[AWAY] = 0;
    this.stale = true;
  }

  /** Acts on a control. One that is not on show (another tab's, a closed panel's) or is at its limit does nothing. */
  private select(id: string): void {
    if (id === ORB_ID) {
      this.selected = true;
      this.actions.pressed(id);
      this.setOpen(!this.isOpen);
      return;
    }
    const control = this.controls().find((each) => each.id === id);
    // The gaze switch is dim for the gaze only: a pinch still switches it.
    if (control === undefined || (control.dim && id !== GAZE_TOGGLE_ID)) return;
    this.selected = true;
    if (id === GAZE_TOGGLE_ID) this.isFreshGaze = true;
    this.actions.pressed(id);
    const patch = PATCHES[id];
    const tab = TABS[id];
    if (patch !== undefined) settings.set(patch(settings.get()));
    else if (tab !== undefined) this.shownTab = tab;
    else this.act(id);
    this.stale = true;
  }

  /** Close, and the Garden tab, which asks through `actions` and changes nothing itself. */
  private act(id: string): void {
    if (id === 'close') this.setOpen(false);
    else if (id === 'height:-') this.actions.setBedHeightOffset(heightAfter(this.garden, -1));
    else if (id === 'height:+') this.actions.setBedHeightOffset(heightAfter(this.garden, 1));
    else if (id === NEW_GARDEN_ID && this.restoreHeld) this.actions.restoreGarden();
    else if (id === NEW_GARDEN_ID) this.actions.newGarden();
    if (id === NEW_GARDEN_ID) this.restoreHeld = false;
    else if (id === TIME_LAPSE_ID) this.actions.setTimeLapse(!this.actions.isTimeLapse());
    else if (id === 'replaceBed') {
      // The placement needs the view, and its confirming pinch must not land on a control.
      this.setOpen(false);
      this.actions.replaceBed();
    }
  }

  private soundControls(s: Readonly<Settings>): PanelControl[] {
    return [
      ...stepper('tempo', ROW_Y[0], s),
      ...stepper('volume', ROW_Y[1], s),
      ...REVERBS.map((reverb, i) =>
        lit(wide(`reverb:${reverb}`, OPTION_X[i] ?? 0, ROW_Y[2], PANEL.reverbs[reverb]), s.reverb === reverb),
      ),
      toggle('mono', 2, ROW_Y[3], s.mono),
    ];
  }

  private soundTexts(s: Readonly<Settings>): PanelText[] {
    const echo = `${PANEL.echo} ${this.signature.reverbRt60.toFixed(1)} ${PANEL.seconds}`;
    return [
      label(LEFT_X, ROW_Y[0], LABEL_W, PANEL.tempo),
      label(VALUE_X, ROW_Y[0], VALUE_W, `${Math.round(s.tempo)} ${PANEL.bpm}`),
      label(LEFT_X, ROW_Y[1], LABEL_W, PANEL.volume),
      label(VALUE_X, ROW_Y[1], VALUE_W, `${Math.round(s.volume * 100)} ${PANEL.percent}`),
      label(LEFT_X, ROW_Y[2], LABEL_W, PANEL.reverb),
      { ...toggleLabel(2, ROW_Y[3], PANEL.mono), w: MONO_LABEL_W },
      label(LEFT_X, TUNED_Y + LINE_M, TUNED_W, `${PANEL.tunedBy} ${keyName(this.signature)},`),
      // UX §3.6: the echo part dims while Reverb is not on auto, when the room's echo is not the one heard.
      { ...label(ECHO_X, TUNED_Y + LINE_M, ECHO_W, echo), dim: s.reverb !== 'auto' },
      label(LEFT_X, TUNED_Y - LINE_M, ROOM_W, roomLine(this.signature, this.features)),
    ];
  }

  private accessControls(s: Readonly<Settings>): PanelControl[] {
    const dwells = DWELLS.map((ms, i) =>
      lit(wide(`dwell:${ms}`, OPTION_X[i] ?? 0, ROW_Y[1], `${ms / 1000} ${PANEL.seconds}`), s.dwellMs === ms),
    );
    return [
      toggle('oneHand', 0, ROW_Y[0], s.oneHand),
      // While the gaze mode is on the gaze cannot act on its own switch (GAZE_TOGGLE_ID), and the switch shows it.
      { ...toggle(GAZE_TOGGLE_ID, 1, ROW_Y[0], s.gazeDwell), dim: s.gazeDwell },
      ...(s.gazeDwell ? dwells : []), // UX §3.6: the dwell times show while the gaze mode is on
      toggle('highContrast', 0, ROW_Y[2], s.highContrast),
      toggle('reducedMotion', 1, ROW_Y[2], s.reducedMotion),
      toggle('beatRing', 0, ROW_Y[3], s.beatRing),
      lit(round('hand:left', HAND_X[0], ROW_Y[3], PANEL.hands.left), s.dominantHand === 'left'),
      lit(round('hand:right', HAND_X[1], ROW_Y[3], PANEL.hands.right), s.dominantHand === 'right'),
    ];
  }

  private accessTexts(s: Readonly<Settings>): PanelText[] {
    return [
      toggleLabel(0, ROW_Y[0], PANEL.oneHand),
      toggleLabel(1, ROW_Y[0], PANEL.gazeDwell),
      ...(s.gazeDwell ? [label(LEFT_X, ROW_Y[1], LABEL_W, PANEL.holdTime)] : []),
      toggleLabel(0, ROW_Y[2], PANEL.highContrast),
      toggleLabel(1, ROW_Y[2], PANEL.reducedMotion),
      { ...toggleLabel(0, ROW_Y[3], PANEL.beatRing), w: BEAT_LABEL_W },
      label(HAND_LABEL_X, ROW_Y[3], HAND_LABEL_W, PANEL.mainHand),
    ];
  }

  private gardenControls(): PanelControl[] {
    const garden = this.garden;
    const atEnd = (steps: number): boolean =>
      garden !== null && setBedHeightOffset(garden, heightAfter(garden, steps)) === garden;
    return [
      { ...round('height:-', HEIGHT_MINUS_X, ROW_Y[1], PANEL.minus), dim: atEnd(-1) },
      { ...round('height:+', HEIGHT_PLUS_X, ROW_Y[1], PANEL.plus), dim: atEnd(1) },
      wide('replaceBed', ACTION_X, ROW_Y[2], PANEL.start),
      // Not during the time-lapse demo (the garden refuses it then): drawn faint, and not selected.
      { ...wide(NEW_GARDEN_ID, ACTION_X, ROW_Y[3], PANEL.hold), dim: this.actions.isTimeLapse() },
      { ...toggle(TIME_LAPSE_ID, 1, ROW_Y[1], this.actions.isTimeLapse()), x: TIME_LAPSE_X },
    ];
  }
}

/**
 * FR-HND-12: which target the gaze line (straight ahead of the head) passes through. `centres` holds x, y, z of
 * `count` targets, world. The answer is the index of the one nearest the line among those the line passes within
 * the hit radius (FR-HND-04) and that are ahead of the head; -1 when there is none.
 * `kept` is the index it answered last (-1 for none), the gaze's memory, as the picker of hands/ has one
 * (FR-HND-16): that target counts as HOVER_DEAD_BAND_M nearer than it is, so a head that rests on the edge of a
 * radius, or between two targets, does not make the cue blink. Creates nothing.
 */
export function gazeTarget(head: Mat4, centres: ArrayLike<number>, count: number, kept: number): number {
  let best = -1;
  let bestM = Infinity;
  for (let i = 0; i < count; i++) {
    const dx = at(centres, 3 * i) - at(head, 12);
    const dy = at(centres, 3 * i + 1) - at(head, 13);
    const dz = at(centres, 3 * i + 2) - at(head, 14);
    const ahead = 0 - (dx * at(head, 8) + dy * at(head, 9) + dz * at(head, 10)); // a head looks down its -z
    if (ahead <= 0) continue;
    let offM = Math.sqrt(Math.max(0, dx * dx + dy * dy + dz * dz - ahead * ahead));
    if (i === kept) offM -= HOVER_DEAD_BAND_M;
    if (offM <= HIT_RADIUS_M && offM < bestM) {
      best = i;
      bestM = offM;
    }
  }
  return best;
}

const DEG_PER_RAD = 180 / Math.PI;
/**
 * UX §9.8: whether the head turns faster than HEAD_TURN_PAUSE_DEG_PER_S, for a gaze dwell to hold. `memory` is the
 * caller's own Float64Array(4): the last forward (x, y, z, all 0 before the first call) and the speed in deg/s, the
 * angle between this frame's forward and the last one over `dtMs` (at most PANEL_MAX_FRAME_MS), smoothed with a
 * HEAD_SPEED_SMOOTHING_MS time constant. A frame of no time changes nothing. Creates nothing; it returns a boolean
 * and keeps the speed in `memory[3]` because a fraction a function returns is boxed.
 */
export function isHeadTurning(head: Mat4, dtMs: number, memory: Float64Array): boolean {
  const fx = -at(head, 8);
  const fy = -at(head, 9);
  const fz = -at(head, 10); // a head looks down its -z
  // Math.sqrt, not Math.hypot: hypot allocates on every call in V8 (hands/TargetPicker.ts)
  const length = Math.sqrt(fx * fx + fy * fy + fz * fz);
  const lx = at(memory, 0);
  const ly = at(memory, 1);
  const lz = at(memory, 2);
  const lastLength = Math.sqrt(lx * lx + ly * ly + lz * lz);
  if (dtMs > 0 && length > 0 && lastLength > 0) {
    const cos = (fx * lx + fy * ly + fz * lz) / (length * lastLength);
    const dt = Math.min(dtMs, PANEL_MAX_FRAME_MS);
    const degPerS = (Math.acos(Math.min(1, Math.max(-1, cos))) * DEG_PER_RAD * 1000) / dt;
    memory[3] = at(memory, 3) + (degPerS - at(memory, 3)) * (1 - Math.exp(-dt / HEAD_SPEED_SMOOTHING_MS));
  }
  if (dtMs > 0 || lastLength === 0) {
    memory[0] = fx;
    memory[1] = fy;
    memory[2] = fz;
  }
  return at(memory, 3) > HEAD_TURN_PAUSE_DEG_PER_S;
}

/** Whether `head` is a pose yet. Before a session's first pose the head's matrix is the identity. */
export function hasPose(head: Mat4): boolean {
  for (let i = 0; i < 16; i++) if (at(head, i) !== (i % 5 === 0 ? 1 : 0)) return true;
  return false;
}

/** The panel as the FoV guard sees it. */
export const PANEL_ELEMENT: Readonly<FovElement> = {
  distanceM: PANEL_DISTANCE_M,
  halfWidthM: PANEL_WIDTH_M / 2,
  halfHeightM: PANEL_HEIGHT_M / 2,
};
const RAD_PER_DEG = Math.PI / 180;
const SIN_MAX_PITCH_DOWN = Math.sin(PANEL_MAX_PITCH_DOWN_DEG * RAD_PER_DEG);
/**
 * A point kept in three elements of an array of numbers. The FoV guard and the orb's rules write their answer to a
 * `Vec3`; written to this one, a fraction stays off the heap. Never a plain { x, y, z } for the guard: after it
 * was handed one as the point to read, each of its later calls cost 32 bytes of heap numbers, whatever those
 * were handed (measured with the heap probe of tests/unit/ui/Panel.test.ts).
 */
export class ArrayVec3 {
  constructor(
    private readonly array: { [index: number]: number },
    private readonly offset: number,
  ) {}
  get x(): number {
    return this.array[this.offset] as number;
  }
  set x(value: number) {
    this.array[this.offset] = value;
  }
  get y(): number {
    return this.array[this.offset + 1] as number;
  }
  set y(value: number) {
    this.array[this.offset + 1] = value;
  }
  get z(): number {
    return this.array[this.offset + 2] as number;
  }
  set z(value: number) {
    this.array[this.offset + 2] = value;
  }
}

// Scratch of placePanel, which runs once per opening: the head it places the panel for, and the panel's centre.
const LEVELLED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
// Data fields, as every caller of clampToFov passes them: an accessor object at one call site (an ArrayVec3) made
// V8 box the numbers at every call, 24 bytes a frame in Chromium (T-128d review). A class, like THREE.Vector3,
// which ui/ code here may not import: a number written to an object literal is boxed (FovGuard.ts).
class Point implements Vec3 {
  x = 0;
  y = 0;
  z = 0;
}
const CENTRE = new Point();

/**
 * Copies `head` to `out`, turned up about its own right-hand axis until it looks down no more than
 * PANEL_MAX_PITCH_DOWN_DEG. A head that looks straight down comes out looking the way the top of the head pointed.
 */
function limitPitchDown(head: Mat4, out: number[]): void {
  for (let i = 0; i < 16; i++) out[i] = at(head, i);
  const aheadY = 0 - at(head, 9);
  const upY = at(head, 5);
  if (aheadY >= -SIN_MAX_PITCH_DOWN) return;
  // The turn t for which ahead' = ahead cos t + up sin t is that far down and no further: the smaller of the two.
  // A head rolled so far that no turn gets there takes the turn that gets nearest.
  const reach = Math.sqrt(aheadY * aheadY + upY * upY);
  const t = Math.atan2(upY, aheadY) - Math.acos(Math.max(-1, -SIN_MAX_PITCH_DOWN / reach));
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  for (let axis = 0; axis < 3; axis++) {
    const ahead = 0 - at(head, 8 + axis);
    const up = at(head, 4 + axis);
    out[4 + axis] = up * cos - ahead * sin;
    out[8 + axis] = 0 - (ahead * cos + up * sin);
  }
}

/**
 * Where the panel opens and how it is turned (UX §3.6, FR-UI-03), written to `pose` as a world matrix of 16
 * numbers. It opens PANEL_DISTANCE_M ahead at eye height, brought into the FoV box by the guard, facing the head
 * as the guard assumes (the head's own turn), and then stays there. The head it is worked out for looks down no
 * more than PANEL_MAX_PITCH_DOWN_DEG: a user who looks at the bed finds the panel above it, clear of the table,
 * and looks up to it. `head` is the head's world matrix.
 */
export function placePanel(head: Mat4, pose: { [index: number]: number }): void {
  limitPitchDown(head, LEVELLED);
  const aheadX = 0 - at(LEVELLED, 8);
  const aheadZ = 0 - at(LEVELLED, 10);
  const level = Math.sqrt(aheadX * aheadX + aheadZ * aheadZ);
  // A head that looks straight up has no level "ahead": the point is then the head itself, and the guard puts
  // that on the gaze line.
  const k = level > 1e-6 ? PANEL_DISTANCE_M / level : 0;
  CENTRE.x = at(LEVELLED, 12) + aheadX * k;
  CENTRE.y = at(LEVELLED, 13);
  CENTRE.z = at(LEVELLED, 14) + aheadZ * k;
  clampToFov(LEVELLED, CENTRE, PANEL_ELEMENT, CENTRE);
  for (let i = 0; i < 12; i++) pose[i] = at(LEVELLED, i);
  pose[12] = CENTRE.x;
  pose[13] = CENTRE.y;
  pose[14] = CENTRE.z;
  pose[15] = 1;
}

/** The orb as the FoV guard sees it while it waits in the view box. */
export const ORB_ELEMENT: Readonly<FovElement> = {
  distanceM: ORB_DISTANCE_M,
  halfWidthM: PANEL_TARGET_M / 2,
  halfHeightM: PANEL_TARGET_M / 2,
};
const ORB_SIDE_M = ORB_DISTANCE_M * Math.tan(ORB_SIDE_DEG * RAD_PER_DEG);
const ORB_DROP_M = ORB_DISTANCE_M * Math.tan(ORB_BELOW_GAZE_DEG * RAD_PER_DEG);

/**
 * FR-UI-09, FR-HND-12: the orb's place in the room when it cannot ride a hand (one hand, or the gaze alone): ahead
 * of `head`, to the side that is not the dominant hand's, below the gaze line. Writes `out`. The caller keeps that
 * point and clamps it into the FoV box every frame, as a caption is.
 */
export function orbHome(head: Mat4, dominant: Hand, out: Vec3): void {
  const x = dominant === 'right' ? -ORB_SIDE_M : ORB_SIDE_M;
  out.x = at(head, 12) + x * at(head, 0) - ORB_DROP_M * at(head, 4) - ORB_DISTANCE_M * at(head, 8);
  out.y = at(head, 13) + x * at(head, 1) - ORB_DROP_M * at(head, 5) - ORB_DISTANCE_M * at(head, 9);
  out.z = at(head, 14) + x * at(head, 2) - ORB_DROP_M * at(head, 6) - ORB_DISTANCE_M * at(head, 10);
}

/** A hand's palm as its `HandState` holds it (hands/): two vectors of x, y, z, world. */
export interface Palm {
  palmPos: ArrayLike<number>;
  palmNormal: ArrayLike<number>;
}

/**
 * The orb on a hand (UX §2): ORB_OFF_HAND_M off the back of the hand, written to `out`. Returns whether it shows:
 * only while the back of the hand faces the head, so it is hidden palm up, when a seed is asked for and would be
 * drawn in the same place. `shown` is the answer of the frame before. Creates nothing.
 */
export function orbOnHand(palm: Palm, head: Mat4, shown: boolean, out: Vec3): boolean {
  const { palmPos, palmNormal } = palm;
  const dx = at(head, 12) - at(palmPos, 0);
  const dy = at(head, 13) - at(palmPos, 1);
  const dz = at(head, 14) - at(palmPos, 2);
  out.x = at(palmPos, 0) - at(palmNormal, 0) * ORB_OFF_HAND_M;
  out.y = at(palmPos, 1) - at(palmNormal, 1) * ORB_OFF_HAND_M;
  out.z = at(palmPos, 2) - at(palmNormal, 2) * ORB_OFF_HAND_M;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const facing = 0 - (dx * at(palmNormal, 0) + dy * at(palmNormal, 1) + dz * at(palmNormal, 2)) / distance;
  return facing > (shown ? ORB_HIDE_FACING : ORB_SHOW_FACING); // a hand at the head gives NaN: hidden
}
