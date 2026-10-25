// T-151, FR-UI-04, FR-UI-05, NFR-ACC-01: what the settings panel draws, read off a canvas that only records what it
// is asked to draw, and what PanelSystem does with events, targets and hands, on fake entities (the way
// tests/unit/hands/HandSystem.test.ts does it). Node has no canvas and no WebGL: the panel in a scene is
// tests/e2e/12-settings.spec.ts.
import { Matrix4, Vector3 } from '@iwsdk/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Interactable } from '../../../src/core/components.js';
import { bus, DEFAULT_SETTINGS, log, settings } from '../../../src/core/index.js';
import { HandState, HIT_RADIUS_M } from '../../../src/hands/index.js';
import {
  CAPTION_BACKDROP,
  CAPTION_BACKDROP_HIGH_CONTRAST,
  CAPTION_TEXT_COLOUR,
  CUE_FILL_COLOUR,
  CUE_SEGMENTS,
  NEW_GARDEN_HOLD_MS,
  ORB_OFF_HAND_M,
  PANEL_DIM_ALPHA,
  PANEL_DIM_ALPHA_HIGH_CONTRAST,
  PANEL_FONT,
  PANEL_FONT_PX,
  PANEL_INK,
  PANEL_OUTLINE_HIGH_CONTRAST_PX,
  PANEL_OUTLINE_PX,
  PANEL_PX_PER_M,
  PANEL_SYMBOL_FONT,
} from '../../../src/ui/config.js';
import { ORB_ID, Panel, type PanelTab } from '../../../src/ui/Panel.js';
import { drawOrb, drawPanel, PanelSystem } from '../../../src/ui/PanelSystem.js';

import type { EventMap, Hand } from '../../../src/core/index.js';

interface Call {
  op: string;
  args: unknown[];
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  globalAlpha: number;
  font: string;
  textAlign: string;
}
/** A 2D context that draws nothing: it keeps each call with the styles that were set when it was made. */
function recorder() {
  const calls: Call[] = [];
  const styles = { fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', textAlign: '' };
  const ctx = new Proxy<Record<string, unknown>>(styles, {
    get: (target, key) => {
      const op = String(key);
      return op in target ? target[op] : (...args: unknown[]) => calls.push({ op, args, ...styles });
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}
/** What the open panel draws on `tab`. */
function drawn(tab: PanelTab, highContrast = false) {
  const panel = new Panel({
    newGarden: () => {},
    replaceBed: () => {},
    setBedHeightOffset: () => {},
    isTimeLapse: () => false,
    setTimeLapse: () => {},
    pressed: () => {},
  });
  for (const id of [ORB_ID, `tab:${tab}`]) {
    panel.down('right', id);
    panel.up('right', id);
  }
  const { ctx, calls } = recorder();
  drawPanel(ctx, panel.controls(), panel.texts(), highContrast);
  const ops = (op: string) => calls.filter((call) => call.op === op);
  const text = (word: string) => ops('fillText').find((call) => call.args[0] === word);
  return { panel, calls, ops, text };
}

// WCAG 2 relative luminance and contrast, on 0..255 sRGB triples.
type Rgb = readonly [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;
const linear = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]: Rgb) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
function contrast(a: Rgb, b: Rgb): number {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y) as [number, number];
  return (high + 0.05) / (low + 0.05);
}
const over = (top: Rgb, under: Rgb, alpha: number): Rgb =>
  top.map((c, i) => alpha * c + (1 - alpha) * (under[i] ?? 0)) as unknown as Rgb;
const CREAM = rgb(CAPTION_TEXT_COLOUR);
const CHARCOAL: Rgb = [20, 26, 31]; // the colour of CAPTION_BACKDROP, pinned below
const BLACK = rgb(CAPTION_BACKDROP_HIGH_CONTRAST);

beforeEach(() => settings.set({ ...DEFAULT_SETTINGS }));

describe('settings panel drawing: where things go (UX §3.6)', () => {
  it('draws each control 4 cm tall where the layout puts it: 2500 canvas pixels to the metre, y down', () => {
    const { ops } = drawn('sound');
    const shapes = ops('roundRect').map((call) => call.args);
    expect(shapes[0]).toEqual([3, 3, 994, 694, 50]); // the backdrop, clear of the canvas edge
    expect(shapes[1]).toEqual([25, 25, 200, 100, 50]); // the Sound tab: 8 cm wide, centred on (-0.15, 0.11) m
    expect(shapes[4]).toEqual([875, 25, 100, 100, 50]); // Close: 4 cm round, centred on (0.17, 0.11) m
  });

  it('writes a word in the panel font and a single sign larger, centred on the control', () => {
    const { text } = drawn('sound');
    expect(text('Sound')).toMatchObject({
      args: ['Sound', 125, 75, 175],
      font: PANEL_FONT,
      textAlign: 'center',
    });
    expect(text('x')).toMatchObject({ args: ['x', 925, 75, 75], font: PANEL_SYMBOL_FONT });
    expect(text('+')?.font).toBe(PANEL_SYMBOL_FONT);
  });

  it('writes labels and read-outs from their left end, squeezed into their room and never cut', () => {
    const { text } = drawn('sound');
    expect(text('Speed')).toMatchObject({
      args: ['Speed', 25, 212.5, 250],
      font: PANEL_FONT,
      textAlign: 'left',
    });
    expect(text('84 BPM')?.args).toEqual(['84 BPM', 462.5, 212.5, 225]);
    expect(text('no room found')?.fillStyle).toBe(CAPTION_TEXT_COLOUR);
  });

  it('keeps the text at a cap height of 1.4 cm or more (FR-UI-04)', () => {
    const CAP_OF_FONT_SIZE = 0.72; // a sans-serif capital (ui/config.ts)
    expect(PANEL_FONT).toContain(`${PANEL_FONT_PX}px`);
    expect((PANEL_FONT_PX / PANEL_PX_PER_M) * CAP_OF_FONT_SIZE).toBeGreaterThanOrEqual(0.014);
  });
});

describe('settings panel drawing: state is not carried by colour alone (NFR-ACC-01)', () => {
  it('fills the chosen tab and option with cream and writes on it in charcoal; the others are outlined', () => {
    const { ops, text } = drawn('sound');
    const fills = ops('fill').map((call) => call.fillStyle);
    expect(fills[1]).toBe(CAPTION_TEXT_COLOUR); // the Sound tab
    expect(fills[2]).not.toBe(CAPTION_TEXT_COLOUR); // the Access tab
    expect(text('Sound')?.fillStyle).toBe(PANEL_INK);
    expect(text('Access')?.fillStyle).toBe(CAPTION_TEXT_COLOUR);
    expect(text('room')?.fillStyle).toBe(PANEL_INK); // Echo: room, the chosen option
    expect(text('small')?.fillStyle).toBe(CAPTION_TEXT_COLOUR);
  });

  it('says on or off in words on every switch', () => {
    const { panel, ops } = drawn('access');
    const switches = ['oneHand', 'gazeDwell', 'highContrast', 'reducedMotion', 'beatRing'];
    const said = panel.controls().filter((control) => switches.includes(control.id));
    expect(said.map((control) => control.text)).toEqual(['off', 'off', 'off', 'off', 'on']);
    const written = ops('fillText').map((call) => call.args[0]);
    expect(written.filter((word) => word === 'off')).toHaveLength(4);
    expect(written.filter((word) => word === 'on')).toHaveLength(1);
  });

  it('draws a stepper that has nothing left, and the echo that is not in effect, fainter', () => {
    settings.set({ tempo: 120, reverb: 'small' });
    const normal = drawn('sound');
    expect(normal.text('+')?.globalAlpha).toBe(PANEL_DIM_ALPHA); // the first +: the tempo's
    expect(normal.text('-')?.globalAlpha).toBe(1);
    expect(normal.text('echo 0.9 s')?.globalAlpha).toBe(PANEL_DIM_ALPHA);
    expect(normal.text('Tuned to: C major,')?.globalAlpha).toBe(1);
    expect(drawn('sound', true).text('echo 0.9 s')?.globalAlpha).toBe(PANEL_DIM_ALPHA_HIGH_CONTRAST);
  });
});

describe('settings panel drawing: high contrast (FR-UI-05)', () => {
  it('normally: charcoal glass, a light outline on every control, no frame', () => {
    const { panel, ops } = drawn('access');
    expect(ops('fill')[0]?.fillStyle).toBe(CAPTION_BACKDROP);
    expect(CAPTION_BACKDROP).toBe(`rgba(${CHARCOAL.join(', ')}, 0.9)`);
    const strokes = ops('stroke');
    expect(strokes).toHaveLength(panel.controls().length);
    for (const stroke of strokes) {
      expect(stroke).toMatchObject({ lineWidth: PANEL_OUTLINE_PX, strokeStyle: CAPTION_TEXT_COLOUR });
    }
  });

  it('in high contrast: opaque black, a frame, and an outline twice as heavy on every control', () => {
    const { panel, ops } = drawn('access', true);
    expect(ops('fill')[0]?.fillStyle).toBe('#000000');
    const strokes = ops('stroke');
    expect(strokes).toHaveLength(panel.controls().length + 1); // the frame too
    for (const stroke of strokes) {
      expect(stroke).toMatchObject({
        lineWidth: PANEL_OUTLINE_HIGH_CONTRAST_PX,
        strokeStyle: CAPTION_TEXT_COLOUR,
      });
    }
    expect(PANEL_OUTLINE_HIGH_CONTRAST_PX).toBe(2 * PANEL_OUTLINE_PX);
  });

  it('text is 4.5:1 or better normally and 7:1 or better in high contrast, the faint text included', () => {
    // On the backdrop's own colour. What a room seen through the glass does to it is for the device run.
    expect(contrast(CREAM, CHARCOAL)).toBeGreaterThan(15);
    expect(contrast(rgb(PANEL_INK), CREAM)).toBeGreaterThan(15);
    expect(contrast(over(CREAM, CHARCOAL, PANEL_DIM_ALPHA), CHARCOAL)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(CREAM, BLACK)).toBeGreaterThan(19);
    expect(contrast(over(CREAM, BLACK, PANEL_DIM_ALPHA_HIGH_CONTRAST), BLACK)).toBeGreaterThanOrEqual(7);
  });

  it('the ring of a hold or a dwell shows against what it lies on, the cream ring and the backdrop: 3:1 or better', () => {
    const violet = rgb(CUE_FILL_COLOUR);
    for (const under of [CREAM, CHARCOAL, BLACK]) expect(contrast(violet, under)).toBeGreaterThanOrEqual(3);
  });
});

describe('settings panel drawing: a redraw (UX §3.6)', () => {
  it('clears the canvas first: nothing of the tab before shows through the glass', () => {
    const { calls } = drawn('garden');
    expect(calls[0]).toMatchObject({ op: 'clearRect', args: [0, 0, 1000, 700] });
  });

  it('draws the labels in the label colour whatever the last control was drawn in', () => {
    // On the Access tab of a right-handed user the last control drawn is R, which is on: cream, written on in
    // charcoal. The labels come after it, and a label left in that charcoal would be charcoal on charcoal.
    const { text, ops } = drawn('access');
    const onControls = ops('fillText').filter((call) => call.textAlign === 'center');
    expect(onControls.pop()).toMatchObject({
      args: ['R', 925, 625, 75],
      fillStyle: PANEL_INK,
    });
    const labels = ['One hand', 'Look to select', 'High contrast', 'Reduce motion', 'Beat ring', 'Main hand'];
    for (const label of labels)
      expect(text(label), label).toMatchObject({ fillStyle: CAPTION_TEXT_COLOUR, globalAlpha: 1 });
  });

  it('draws the gaze switch faint while the gaze mode is on, in both looks, and the other switches in full', () => {
    settings.set({ gazeDwell: true });
    for (const [highContrast, alpha] of [
      [false, PANEL_DIM_ALPHA],
      [true, PANEL_DIM_ALPHA_HIGH_CONTRAST],
    ] as const) {
      const { panel, ops } = drawn('access', highContrast);
      const shapes = ops('fill').slice(1); // after the backdrop: one fill per control, in their order
      const alphaOf = (id: string) => shapes[panel.controls().findIndex((c) => c.id === id)]?.globalAlpha;
      expect(alphaOf('gazeDwell')).toBe(alpha);
      expect(alphaOf('oneHand')).toBe(1);
      expect(alphaOf('dwell:900')).toBe(1);
    }
  });
});

describe('settings orb drawing (UX §2)', () => {
  it('is a dark disc with a cream rim and three sliders, so it reads against any room', () => {
    const { ctx, calls } = recorder();
    drawOrb(ctx, false);
    const fills = calls.filter((call) => call.op === 'fill');
    const strokes = calls.filter((call) => call.op === 'stroke');
    expect(fills[0]?.fillStyle).toBe(CAPTION_BACKDROP);
    expect(strokes[0]).toMatchObject({ strokeStyle: CAPTION_TEXT_COLOUR, lineWidth: 2 * PANEL_OUTLINE_PX });
    expect(strokes).toHaveLength(1 + 3); // the rim and three lines
    expect(fills.slice(1).map((call) => call.fillStyle)).toEqual(Array(3).fill(CAPTION_TEXT_COLOUR)); // knobs
  });

  it('in high contrast: opaque black with a rim twice as heavy', () => {
    const { ctx, calls } = recorder();
    drawOrb(ctx, true);
    expect(calls.find((call) => call.op === 'fill')?.fillStyle).toBe('#000000');
    const rim = calls.find((call) => call.op === 'stroke');
    expect(rim?.lineWidth).toBe(2 * PANEL_OUTLINE_HIGH_CONTRAST_PX);
  });
});

/** As much of an ECS entity as PanelSystem uses. */
class FakeEntity {
  private readonly data = new Map<unknown, Record<string, unknown>>();
  private readonly views = new Map<unknown, Map<string, Float32Array>>();
  destroyed = false;

  addComponent(component: unknown, values: Record<string, unknown> = {}): this {
    this.data.set(component, { ...values });
    this.views.set(component, new Map()); // a component that comes back has new storage, as in the real ECS
    return this;
  }
  removeComponent(component: unknown): this {
    this.data.delete(component);
    this.views.delete(component);
    return this;
  }
  hasComponent(component: unknown): boolean {
    return this.data.has(component);
  }
  getValue(component: unknown, key: string): unknown {
    return this.data.get(component)?.[key] ?? null;
  }
  setValue(component: unknown, key: string, value: unknown): void {
    this.data.get(component)![key] = value;
  }
  getVectorView(component: unknown, key: string): Float32Array {
    const views = this.views.get(component)!;
    let view = views.get(key);
    if (view === undefined) {
      const first = this.data.get(component)?.[key];
      view = Array.isArray(first) ? new Float32Array(first as number[]) : new Float32Array(3);
      views.set(key, view);
    }
    return view;
  }
  destroy(): void {
    this.destroyed = true;
  }
}

/** As much of an ECS query as PanelSystem uses: who is told when an entity comes or goes. */
class FakeQuery {
  readonly entities = new Set<FakeEntity>();
  private readonly told = {
    qualify: new Set<(e: FakeEntity) => void>(),
    disqualify: new Set<(e: FakeEntity) => void>(),
  };

  subscribe(event: 'qualify' | 'disqualify', callback: (e: FakeEntity) => void, replay = false): () => void {
    this.told[event].add(callback);
    if (replay) this.entities.forEach(callback);
    return () => this.told[event].delete(callback);
  }
  add(entity: FakeEntity): FakeEntity {
    this.entities.add(entity);
    this.told.qualify.forEach((callback) => callback(entity));
    return entity;
  }
  remove(entity: FakeEntity): void {
    this.entities.delete(entity);
    this.told.disqualify.forEach((callback) => callback(entity));
  }
}

const EYE: [number, number, number] = [0, 1.15, 0];
const live: PanelSystem[] = [];
afterEach(() => {
  while (live.length > 0) live.pop()?.destroy(); // off the bus, so one test's panel does not hear the next
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** PanelSystem on fake entities, in a session, the head level at EYE; `given` is its configData. */
function rig(given: { garden?: object | null; room?: object | null; engine?: object | null } = {}) {
  const asked: string[] = [];
  const garden = {
    newGarden: () => asked.push('newGarden'),
    setBedHeightOffset: (metres: number) => asked.push(`setBedHeightOffset ${metres}`),
    timeLapse: false,
    setTimeLapse: (on: boolean) => asked.push(`setTimeLapse ${on}`),
  };
  const room = { replace: () => asked.push('replace') };
  const engine = { ui: (sound: string) => asked.push(`ui ${sound}`) };
  const canvas = () => ({ width: 0, height: 0, getContext: () => recorder().ctx });
  vi.stubGlobal('document', { createElement: canvas });
  const xr = { isPresenting: true };
  const head = new Matrix4().makeTranslation(...EYE);
  const drawnMeshes: { name: string; visible: boolean }[] = [];
  const created: FakeEntity[] = [];
  const world = {
    player: { head: { matrixWorld: head } },
    camera: { matrixWorld: new Matrix4() },
    scene: {
      add: (mesh: { name: string; visible: boolean }) => drawnMeshes.push(mesh),
      remove: (mesh: object) => drawnMeshes.splice(drawnMeshes.indexOf(mesh as never), 1),
    },
    renderer: { xr },
    createEntity: () => {
      const entity = new FakeEntity();
      created.push(entity);
      return entity;
    },
  };
  const hands = new FakeQuery();
  const system = new PanelSystem(world as never, {} as never, 62);
  system.queries = { hands } as never;
  system.config.garden.value = 'garden' in given ? given.garden : garden;
  system.config.room.value = 'room' in given ? given.room : room;
  system.config.engine.value = 'engine' in given ? given.engine : engine;
  system.init();
  live.push(system);

  /** One frame, `ms` long. */
  const frame = (ms = 14) => system.update(ms / 1000);
  /** A hand's HandState, as hands/ keeps it: its palm at `at`, facing `normal`. */
  const hand = (which: Hand, at: number[], normal: number[]) => {
    const entity = new FakeEntity().addComponent(HandState, { hand: which, tracked: true });
    entity.getVectorView(HandState, 'palmPos').set(at);
    entity.getVectorView(HandState, 'palmNormal').set(normal);
    return hands.add(entity);
  };
  /** A hand whose back faces the head, 0.3 m ahead of it and a little down: the orb shows on it. */
  const watch = (which: Hand = 'left') => hand(which, [-0.1, 0.95, -0.3], [0, 0, -1]);
  const targets = () => created.filter((entity) => entity.hasComponent(Interactable));
  const ids = () => targets().map((entity) => entity.getValue(Interactable, 'id'));
  const mesh = (name: string) => drawnMeshes.find((each) => each.name === name)!;
  const emit = <K extends keyof EventMap>(type: K, payload: Omit<EventMap[K], 'type'>) =>
    bus.emit(type, { type, ...payload } as unknown as EventMap[K]);
  const AT = { x: 0, y: 0, z: 0 };
  const pinch = (kind: string, id: string, which: Hand = 'right') =>
    emit('gesture:pinchStart', { hand: which, target: { kind, id } as never, pos: AT });
  const release = (gesture: string, kind: string, id: string, which: Hand = 'right') =>
    emit('gesture:release', {
      hand: which,
      gesture: gesture as never,
      target: { kind, id } as never,
      pos: AT,
      zone: 'inner',
      cell: null,
      dy: null,
    });
  /** A pinch that starts and ends on a panel target, and the frame after it. */
  const press = (id: string) => {
    pinch('panel', id);
    release('press', 'panel', id);
    frame();
  };
  const act = { frame, hand, watch, pinch, release, press, emit };
  return { system, xr, head, hands, asked, created, targets, ids, mesh, ...act };
}

const HEADER = ['tab:sound', 'tab:access', 'tab:garden', 'close'];
const SOUND = [
  'tempo:-',
  'tempo:+',
  'volume:-',
  'volume:+',
  'reverb:auto',
  'reverb:small',
  'reverb:off',
  'mono',
];
const SWITCHES = ['oneHand', 'gazeDwell', 'highContrast', 'reducedMotion', 'beatRing'];
const ACCESS = [...SWITCHES, 'hand:left', 'hand:right'];

describe('PanelSystem: its targets (API_SPEC §1.10 rule 7)', () => {
  it('has an Interactable for what is on show, and only for that: after open, a tab change and close', () => {
    const { watch, frame, press, ids, targets, system } = rig();
    frame();
    expect(ids()).toEqual([]); // no hand, no orb
    watch();
    frame();
    expect(ids()).toEqual([ORB_ID]);

    press(ORB_ID);
    expect(system.panel.open).toBe(true);
    expect(ids()).toEqual([ORB_ID, ...HEADER, ...SOUND]);
    for (const entity of targets()) {
      expect(entity.getValue(Interactable, 'kind')).toBe('panel');
      expect(entity.getValue(Interactable, 'radius')).toBe(HIT_RADIUS_M);
    }
    // Where it is drawn: the panel is 0.55 m ahead of a level head, and Close is at (0.17, 0.11) m on it.
    const close = targets().find((entity) => entity.getValue(Interactable, 'id') === 'close')!;
    const [x, y, z] = close.getVectorView(Interactable, 'worldPos');
    expect([x, y, z].map((v) => Math.round(v! * 1000) / 1000)).toEqual([0.17, 1.26, -0.55]);

    press('tab:access');
    expect(ids()).toEqual([ORB_ID, ...HEADER, ...ACCESS]);
    expect(targets()).toContain(close); // the header's targets stay: the same entity, the same component

    press('close');
    expect(system.panel.open).toBe(false);
    expect(ids()).toEqual([ORB_ID]);
  });

  it('removes every Interactable and closes the panel when the session ends', () => {
    const { watch, frame, press, ids, emit, xr, system, mesh } = rig();
    watch();
    frame();
    press(ORB_ID);
    expect(ids()).toHaveLength(1 + HEADER.length + SOUND.length);
    xr.isPresenting = false;
    emit('xr:sessionEnd', { visible: false });
    frame();
    expect(system.panel.open).toBe(false);
    expect(ids()).toEqual([]);
    expect([mesh('settings-panel').visible, mesh('settings-orb').visible]).toEqual([false, false]);
  });

  it('gives every target back when it is taken down', () => {
    const { watch, frame, press, created, system } = rig();
    watch();
    frame();
    press(ORB_ID);
    system.destroy();
    live.length = 0;
    expect(created.length).toBeGreaterThan(0);
    expect(created.every((entity) => entity.destroyed)).toBe(true);
  });
});

describe('PanelSystem: what it takes for a press (API_SPEC §1.4)', () => {
  it('ignores a target of another kind that carries one of its ids', () => {
    const { watch, frame, pinch, release, system } = rig();
    watch();
    frame();
    for (const kind of ['orb', 'plant', 'seed', 'undo', 'bed']) {
      pinch(kind, ORB_ID);
      release('press', kind, ORB_ID);
      frame();
      expect(system.panel.open, kind).toBe(false);
    }
    pinch('panel', ORB_ID);
    release('press', 'panel', ORB_ID);
    frame();
    expect(system.panel.open).toBe(true);
    pinch('undo', 'close'); // and the same for a control of the open panel
    release('press', 'undo', 'close');
    frame();
    expect(system.panel.open).toBe(true);
  });

  it('ignores a release that is not a press', () => {
    const { watch, frame, pinch, release, system } = rig();
    watch();
    frame();
    for (const gesture of ['none', 'carry', 'drag', 'pull']) {
      pinch('panel', ORB_ID);
      release(gesture, 'panel', ORB_ID);
      frame();
      expect(system.panel.open, gesture).toBe(false);
    }
  });

  it('drops a hold when the hand is lost: New garden does not start, however long it was held', () => {
    const { watch, frame, press, pinch, release, emit, asked, system, mesh } = rig({ engine: null }); // no ticks in `asked`
    watch();
    frame();
    press(ORB_ID);
    press('tab:garden');
    pinch('panel', 'newGarden');
    for (let ms = 0; ms < 2 * NEW_GARDEN_HOLD_MS; ms += 50) frame(50);
    expect(system.panel.fill[0]).toBe(1);
    expect([mesh('settings-cue').visible, mesh('settings-fill').visible]).toEqual([true, true]);
    emit('gesture:trackingLost', { hand: 'right' });
    frame();
    expect(system.panel.fill[0]).toBe(0);
    expect([mesh('settings-cue').visible, mesh('settings-fill').visible]).toEqual([false, false]);
    release('press', 'panel', 'newGarden'); // whatever comes after it
    frame();
    expect(asked).toEqual([]);

    pinch('panel', 'newGarden'); // and a full hold that is not interrupted does start one
    for (let ms = 0; ms < NEW_GARDEN_HOLD_MS; ms += 50) frame(50);
    release('press', 'panel', 'newGarden');
    expect(asked).toEqual(['newGarden']);
  });

  it('hands the Garden tab on to the garden and the room it was given', () => {
    const { watch, frame, press, asked, system } = rig({ engine: null }); // no ticks in `asked`
    watch();
    frame();
    press(ORB_ID);
    press('tab:garden');
    press('height:+');
    press('timeLapse');
    press('replaceBed');
    expect(asked).toEqual(['setBedHeightOffset 0.02', 'setTimeLapse true', 'replace']);
    expect(system.panel.open).toBe(false);
  });

  it('says so, as an error, when it was given no garden or no room, and then leaves the Garden tab inert', () => {
    const error = vi.spyOn(log, 'error').mockImplementation(() => {});
    const { watch, frame, press, system } = rig({ garden: null, room: null });
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toBe('ui');
    watch();
    frame();
    press(ORB_ID);
    press('tab:garden');
    expect(() => press('height:+')).not.toThrow();
    expect(() => press('replaceBed')).not.toThrow();
    expect(system.panel.open).toBe(false);
  });
});

describe('PanelSystem: the orb (UX §2, FR-UI-09, FR-HND-12)', () => {
  it('rides the hand that is not the dominant one, read from its HandState, and goes with its tracking', () => {
    const { hand, frame, ids, targets, mesh } = rig();
    const left = hand('left', [-0.1, 0.95, -0.3], [0, 0, -1]);
    hand('right', [0.2, 0.9, -0.3], [0, 0, -1]);
    frame();
    expect(ids()).toEqual([ORB_ID]);
    const [x, y, z] = targets()[0]!.getVectorView(Interactable, 'worldPos');
    // 9 cm off the back of the left hand, towards the head
    expect([x, y, z].map((v) => Math.round(v! * 1000) / 1000)).toEqual([-0.1, 0.95, -0.3 + ORB_OFF_HAND_M]);

    left.setValue(HandState, 'tracked', false);
    frame();
    expect(ids()).toEqual([]);
    expect(mesh('settings-orb').visible).toBe(false);

    settings.set({ dominantHand: 'left' }); // now the right hand carries it
    frame();
    const [rx] = targets()[0]!.getVectorView(Interactable, 'worldPos');
    expect(rx).toBeCloseTo(0.2, 6);
  });

  it('is hidden palm up, and when the hand has no HandState any more', () => {
    const { hand, hands, frame, ids } = rig();
    const left = hand('left', [-0.1, 0.95, -0.3], [0, 1, 0]); // palm up: asking for a seed
    frame();
    expect(ids()).toEqual([]);
    left.getVectorView(HandState, 'palmNormal').set([0, 0, -1]);
    frame();
    expect(ids()).toEqual([ORB_ID]);
    hands.remove(left);
    frame();
    expect(ids()).toEqual([]);
  });

  it('waits for the head to have a pose before it takes its place in the view box', () => {
    settings.set({ gazeDwell: true });
    const { head, frame, ids, targets } = rig();
    head.identity(); // a session's first frames: no pose yet
    frame();
    frame();
    expect(ids()).toEqual([]); // not placed from no pose: it would be near the floor for the whole session
    head.makeTranslation(...EYE);
    frame();
    expect(ids()).toEqual([ORB_ID]);
    const [x, y, z] = targets()[0]!.getVectorView(Interactable, 'worldPos');
    expect(z).toBeCloseTo(-0.45, 5);
    expect(x).toBeLessThan(0); // to the left for a right-handed user
    expect(y).toBeGreaterThan(1); // a little below the eyes, not at the floor
    expect(y).toBeLessThan(EYE[1]);
  });

  it('steps aside while the panel it opened by gaze is open, and what lies under the gaze is not selected', () => {
    const { head, frame, press, watch, ids, targets, system } = rig();
    watch(); // first by hand, to leave the panel on the Access tab: its Reduce motion switch is where the gaze will rest
    frame();
    press(ORB_ID);
    press('tab:access');
    press('close');
    settings.set({ gazeDwell: true, dwellMs: 600 });
    frame();
    const [x = 0, y = 0, z = 0] = targets()[0]!.getVectorView(Interactable, 'worldPos');
    // The head turns to the orb where it waits, and then does not move again.
    head.lookAt(new Vector3(...EYE), new Vector3(x, y, z), new Vector3(0, 1, 0)).setPosition(...EYE);
    // A head that jumps there reads as turning for its first 0.4 s, which holds the dwell (UX §9.8, T-160).
    for (let ms = 0; ms <= 1100; ms += 50) frame(50);
    expect(system.panel.open).toBe(true);
    expect(ids()).not.toContain(ORB_ID);
    expect(system.panel.cue()).toBe('reducedMotion'); // that control is under the resting gaze
    const before = { ...settings.get() };
    for (let ms = 0; ms < 3000; ms += 50) frame(50);
    expect(settings.get()).toEqual(before);
    expect(system.panel.open).toBe(true);
  });
});

describe('PanelSystem: the ring of a hold (UX §8)', () => {
  it('draws the part of the fill ring that the hold has come to, in whole steps', () => {
    const { watch, frame, press, pinch, system } = rig();
    watch();
    frame();
    press(ORB_ID);
    press('tab:garden');
    const fill = (system as unknown as { fill: { geometry: { drawRange: { count: number } } } }).fill;
    pinch('panel', 'newGarden');
    for (let ms = 0; ms < NEW_GARDEN_HOLD_MS / 2; ms += 50) frame(50);
    expect(fill.geometry.drawRange.count).toBe((CUE_SEGMENTS / 2) * 6); // half way round: two triangles a step
    for (let ms = 0; ms < NEW_GARDEN_HOLD_MS / 2; ms += 50) frame(50);
    expect(fill.geometry.drawRange.count).toBe(CUE_SEGMENTS * 6);
  });
});

describe('the UI sounds of the panel (T-164 §6)', () => {
  it("every press that acts is engine.ui('tick'), Place the garden again too (its confirm is the bed's landing); with no engine, no sound and no throw", () => {
    const { watch, frame, press, asked } = rig();
    watch();
    frame();
    press(ORB_ID);
    press('tab:garden');
    press('replaceBed');
    expect(asked).toEqual(['ui tick', 'ui tick', 'ui tick', 'replace']);
    const silent = rig({ engine: null });
    silent.watch();
    silent.frame();
    expect(() => silent.press(ORB_ID)).not.toThrow();
    expect(silent.asked).toEqual([]);
  });
});
