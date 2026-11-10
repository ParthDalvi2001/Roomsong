// T-151, FR-UI-04, FR-UI-05, NFR-ACC-01: what the settings panel draws, read off a canvas that only records what it
// is asked to draw, and what PanelSystem does with events, targets and hands, on fake entities (the way
// tests/unit/hands/HandSystem.test.ts does it). Node has no canvas and no WebGL: the panel in a scene is
// tests/e2e/12-settings.spec.ts.
import { Color, Matrix4, Vector3 } from '@iwsdk/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Interactable } from '../../../src/core/components.js';
import { bus, DEFAULT_SETTINGS, log, settings, STRINGS } from '../../../src/core/index.js';
import { SEED_KINDS, WANDERER } from '../../../src/garden/index.js';
import { HandState, HIT_RADIUS_M } from '../../../src/hands/index.js';
import { kindSwatch } from '../../../src/render/index.js';
import {
  CAPTION_BACKDROP,
  CAPTION_BACKDROP_HIGH_CONTRAST,
  CAPTION_TEXT_COLOUR,
  CUE_FILL_COLOUR,
  CUE_SEGMENTS,
  NEW_GARDEN_HOLD_MS,
  ORB_OFF_HAND_M,
  PANEL_ACCENT,
  PANEL_ACCENT_HIGH_CONTRAST,
  PANEL_BOLD_FONT,
  PANEL_DANGER,
  PANEL_DANGER_HIGH_CONTRAST,
  PANEL_DIM_ALPHA,
  PANEL_DIM_ALPHA_HIGH_CONTRAST,
  PANEL_FONT,
  PANEL_FONT_PX,
  PANEL_INK,
  PANEL_LOOK_AWAY_MS,
  PANEL_OUTLINE_HIGH_CONTRAST_PX,
  PANEL_OUTLINE_PX,
  PANEL_PX_PER_M,
  PANEL_RULE_ALPHA,
  PANEL_SYMBOL_FONT,
  PANEL_WIDE_TARGET_M,
  SKIP_REST_OPACITY,
} from '../../../src/ui/config.js';
import { ORB_ID, Panel, SKIP_ID, type PanelTab } from '../../../src/ui/Panel.js';
import { drawOrb, drawPanel, PanelSystem } from '../../../src/ui/PanelSystem.js';
import { PANEL } from '../../../src/ui/strings.js';

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
/** What the open panel draws on `tab`, or on the Seeds page ('seeds'). */
function drawn(tab: PanelTab | 'seeds', highContrast = false) {
  const panel = new Panel({
    newGarden: () => {},
    canRestore: () => false,
    restoreGarden: () => {},
    replaceBed: () => {},
    setBedHeightOffset: () => {},
    isTimeLapse: () => false,
    setTimeLapse: () => {},
    exit: () => {},
    pressed: () => {},
    pickSeed: () => {},
    swatch: (kind) => `swatch-${kind}`, // a stand-in for render's kindSwatch
  });
  for (const id of tab === 'seeds' ? [ORB_ID, 'tab:garden', 'seeds'] : [ORB_ID, `tab:${tab}`]) {
    panel.down('right', id);
    panel.up('right', id);
  }
  const { ctx, calls } = recorder();
  drawPanel(ctx, panel.controls(), panel.texts(), highContrast);
  const ops = (op: string) => calls.filter((call) => call.op === op);
  // its numbers to the micrometre of a canvas pixel: the layout's metres are sums of decimals
  const fine = (v: unknown) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v);
  const text = (word: string) => {
    const call = ops('fillText').find((each) => each.args[0] === word);
    return call && { ...call, args: call.args.map(fine) };
  };
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
    const shapes = ops('roundRect').map((call) => call.args as number[]);
    const near = (got: number[] | undefined, want: number[]) =>
      want.forEach((v, i) => expect(got?.[i], `${want.join(', ')}`).toBeCloseTo(v, 6));
    near(shapes[0], [3, 3, 1194, 832, 50]); // the backdrop, clear of the canvas edge
    // 10 Nov: a track under each group, the tabs first: from 1 cm inside the panel's left edge to the third tab's end
    near(shapes[1], [25, 25.25, 675, 100, 50]);
    near(shapes[5], [25, 25.25, 200, 100, 50]); // the Sound tab: 8 cm wide, centred on (-0.19, 0.1375) m
    near(shapes[8], [1075, 25.25, 100, 100, 50]); // Close: 4 cm round, centred on (0.21, 0.1375) m, 1 cm in
  });

  it('writes a word in the panel font, the chosen one bold, and a single sign larger, centred on the control', () => {
    const { text } = drawn('sound');
    expect(text('Sound')).toMatchObject({
      args: ['Sound', 125, 75.25, 175],
      font: PANEL_BOLD_FONT,
      textAlign: 'center',
    });
    expect(text('Access')).toMatchObject({ font: PANEL_FONT, textAlign: 'center' });
    expect(text('x')).toMatchObject({ args: ['x', 1125, 75.25, 75], font: PANEL_SYMBOL_FONT });
    expect(text('+')?.font).toBe(PANEL_SYMBOL_FONT);
  });

  it('writes labels from their left end in the regular weight, read-outs bold and centred, squeezed into their room and never cut', () => {
    const { text } = drawn('sound');
    expect(text('Speed')).toMatchObject({
      args: ['Speed', 25, 487.75, 650],
      font: PANEL_FONT,
      textAlign: 'left',
    });
    expect(text('84 BPM')).toMatchObject({
      args: ['84 BPM', 937.5, 487.75, 225],
      font: PANEL_BOLD_FONT,
      textAlign: 'center',
    });
    expect(text('no room found')?.fillStyle).toBe(CAPTION_TEXT_COLOUR);
  });

  it('keeps the text at a cap height of 1.4 cm or more (FR-UI-04)', () => {
    const CAP_OF_FONT_SIZE = 0.72; // a sans-serif capital (ui/config.ts)
    expect(PANEL_FONT).toContain(`${PANEL_FONT_PX}px`);
    expect((PANEL_FONT_PX / PANEL_PX_PER_M) * CAP_OF_FONT_SIZE).toBeGreaterThanOrEqual(0.014);
  });
});

describe('settings panel drawing: state is not carried by colour alone (NFR-ACC-01)', () => {
  it('fills the chosen tab and option with the accent and writes on it in bold charcoal; the others lie plain on their track', () => {
    for (const [highContrast, accent] of [
      [false, PANEL_ACCENT],
      [true, PANEL_ACCENT_HIGH_CONTRAST],
    ] as const) {
      const { ops, text } = drawn('sound', highContrast);
      expect(ops('fill').filter((call) => call.fillStyle === accent)).toHaveLength(2); // Sound and room; Mono is off
      for (const word of ['Sound', 'room'])
        expect(text(word)).toMatchObject({ fillStyle: PANEL_INK, font: PANEL_BOLD_FONT });
      for (const word of ['Access', 'small'])
        expect(text(word)).toMatchObject({ fillStyle: CAPTION_TEXT_COLOUR, font: PANEL_FONT });
    }
  });

  it('says on or off in words on every switch, and its knob sits right when on and left when off', () => {
    const { panel, ops } = drawn('access');
    const switches = ['oneHand', 'gazeDwell', 'highContrast', 'reducedMotion', 'beatRing'];
    const said = panel.controls().filter((control) => switches.includes(control.id));
    expect(said.map((control) => control.text)).toEqual(['off', 'off', 'off', 'off', 'on']);
    expect(said.every((control) => control.look === 'switch' && control.w === PANEL_WIDE_TARGET_M)).toBe(
      true,
    );
    const written = ops('fillText').map((call) => call.args[0]);
    expect(written.filter((word) => word === 'off')).toHaveLength(4);
    expect(written.filter((word) => word === 'on')).toHaveLength(1);
    const knobs = ops('arc').map((call) => call.args[0] as number);
    expect(knobs).toHaveLength(5);
    said.forEach((control, i) => {
      const centre = 600 + control.x * 2500;
      expect(knobs[i], control.id).toBeCloseTo(centre + (control.on ? 50 : -50), 6);
    });
  });

  it('draws a stepper that has nothing left, and the echo that is not in effect, fainter', () => {
    settings.set({ tempo: 120, volume: 1, reverb: 'small' });
    const normal = drawn('sound');
    const signs = (sign: string) => normal.ops('fillText').filter((call) => call.args[0] === sign);
    expect(signs('+').map((call) => call.globalAlpha)).toEqual([PANEL_DIM_ALPHA, PANEL_DIM_ALPHA]);
    expect(signs('-').map((call) => call.globalAlpha)).toEqual([1, 1]);
    expect(normal.text('echo 0.9 s')?.globalAlpha).toBe(PANEL_DIM_ALPHA);
    expect(normal.text('Tuned to: C major,')?.globalAlpha).toBe(1);
    expect(drawn('sound', true).text('echo 0.9 s')?.globalAlpha).toBe(PANEL_DIM_ALPHA_HIGH_CONTRAST);
  });
});

describe('settings panel drawing: high contrast (FR-UI-05)', () => {
  // An outline on every control: its own, or its track's for a segment and a stepper's button (one per group).
  const outlines = (panel: Panel) => {
    const grouped = panel.controls().filter((c) => c.look === 'segment' || c.look === 'step');
    const groups = new Set(grouped.map((c) => c.id.split(':')[0]));
    return panel.controls().length - grouped.length + groups.size;
  };

  it('normally: charcoal glass, a light outline on every control or its track, no frame', () => {
    const { panel, ops } = drawn('access');
    expect(ops('fill')[0]?.fillStyle).toBe(CAPTION_BACKDROP);
    expect(CAPTION_BACKDROP).toBe(`rgba(${CHARCOAL.join(', ')}, 0.9)`);
    const strokes = ops('stroke');
    expect(strokes).toHaveLength(outlines(panel));
    for (const stroke of strokes) {
      expect(stroke).toMatchObject({ lineWidth: PANEL_OUTLINE_PX, strokeStyle: CAPTION_TEXT_COLOUR });
    }
  });

  it('in high contrast: opaque black, a frame, and an outline twice as heavy on every control or its track', () => {
    const { panel, ops } = drawn('access', true);
    expect(ops('fill')[0]?.fillStyle).toBe('#000000');
    const strokes = ops('stroke');
    // the frame too, and in high contrast each segment and stepper button on its track (T-168 review: FR-UI-05)
    const segments = panel.controls().filter((c) => c.look === 'segment' || c.look === 'step').length;
    expect(strokes).toHaveLength(outlines(panel) + segments + 1);
    for (const stroke of strokes) {
      expect(stroke).toMatchObject({
        lineWidth: PANEL_OUTLINE_HIGH_CONTRAST_PX,
        strokeStyle: CAPTION_TEXT_COLOUR,
      });
    }
    expect(PANEL_OUTLINE_HIGH_CONTRAST_PX).toBe(2 * PANEL_OUTLINE_PX);
  });

  it('10 Nov: Seeds is filled with the accent, New garden outlined in the warm red, a thin rule under the header', () => {
    for (const [highContrast, accent, danger, rule] of [
      [false, PANEL_ACCENT, PANEL_DANGER, PANEL_RULE_ALPHA],
      [true, PANEL_ACCENT_HIGH_CONTRAST, PANEL_DANGER_HIGH_CONTRAST, 1],
    ] as const) {
      const { ops, text } = drawn('garden', highContrast);
      expect(text('Seeds')).toMatchObject({ fillStyle: PANEL_INK, font: PANEL_BOLD_FONT });
      expect(ops('fill').filter((call) => call.fillStyle === accent)).toHaveLength(2); // the tab and Seeds
      expect(ops('stroke').filter((call) => call.strokeStyle === danger)).toHaveLength(1);
      expect(text('New garden')?.fillStyle).toBe(CAPTION_TEXT_COLOUR);
      const outline = highContrast ? PANEL_OUTLINE_HIGH_CONTRAST_PX : PANEL_OUTLINE_PX;
      expect(ops('fillRect')[0]).toMatchObject({
        args: [25, 144 - outline / 2, 1150, outline],
        globalAlpha: rule,
      });
    }
  });

  it('text is 4.5:1 or better normally and 7:1 or better in high contrast, the faint text included', () => {
    // On the backdrop's own colour. What a room seen through the glass does to it is for the device run.
    expect(contrast(CREAM, CHARCOAL)).toBeGreaterThan(15);
    expect(contrast(rgb(PANEL_INK), CREAM)).toBeGreaterThan(15);
    expect(contrast(over(CREAM, CHARCOAL, PANEL_DIM_ALPHA), CHARCOAL)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(CREAM, BLACK)).toBeGreaterThan(19);
    expect(contrast(over(CREAM, BLACK, PANEL_DIM_ALPHA_HIGH_CONTRAST), BLACK)).toBeGreaterThanOrEqual(7);
    // 10 Nov: the charcoal on the accent, normal and high contrast
    expect(contrast(rgb(PANEL_INK), rgb(PANEL_ACCENT))).toBeGreaterThanOrEqual(7);
    expect(contrast(rgb(PANEL_INK), rgb(PANEL_ACCENT_HIGH_CONTRAST))).toBeGreaterThanOrEqual(7);
  });

  it('the ring of a hold or a dwell shows against what it lies on, the cream ring and the backdrop: 3:1 or better', () => {
    const violet = rgb(CUE_FILL_COLOUR);
    for (const under of [CREAM, CHARCOAL, BLACK]) expect(contrast(violet, under)).toBeGreaterThanOrEqual(3);
    // New garden's red, as its outline on the backdrop and as its hold ring (10 Nov)
    for (const red of [PANEL_DANGER, PANEL_DANGER_HIGH_CONTRAST])
      for (const under of [CREAM, CHARCOAL, BLACK])
        expect(contrast(rgb(red), under), red).toBeGreaterThanOrEqual(3);
    // and the accent against the backdrop it lies on
    expect(contrast(rgb(PANEL_ACCENT), CHARCOAL)).toBeGreaterThanOrEqual(3);
    expect(contrast(rgb(PANEL_ACCENT_HIGH_CONTRAST), BLACK)).toBeGreaterThanOrEqual(3);
  });

  it('the Seeds page (T-193): each swatch is filled with its kind colour, in high contrast too, and its name keeps the text colour', () => {
    for (const highContrast of [false, true]) {
      const { panel, ops, text } = drawn('seeds', highContrast);
      const controls = panel.controls();
      const swatches = controls.filter((c) => c.id.startsWith('seed:'));
      expect(swatches.length).toBeGreaterThanOrEqual(4);
      for (const swatch of swatches) {
        const fills = ops('fill').filter((call) => call.fillStyle === `swatch-${swatch.id.slice(5)}`);
        expect(
          fills.map((call) => call.globalAlpha),
          swatch.id,
        ).toEqual([1]);
      }
      const names = swatches.map((c) => STRINGS[SEED_KINDS.find((row) => `seed:${row.kind}` === c.id)!.name]);
      for (const word of [...names, PANEL.pickSeed])
        expect(text(word), word).toMatchObject({
          fillStyle: CAPTION_TEXT_COLOUR,
          globalAlpha: 1,
          textAlign: 'left',
        });
      expect(text(STRINGS.libNew)?.fillStyle).toBe(PANEL_INK); // the shown library, lit
      expect(text(STRINGS.libOld)?.fillStyle).toBe(CAPTION_TEXT_COLOUR);
    }
  });
});

describe('settings panel drawing: a redraw (UX §3.6)', () => {
  it('clears the canvas first: nothing of the tab before shows through the glass', () => {
    const { calls } = drawn('garden');
    expect(calls[0]).toMatchObject({ op: 'clearRect', args: [0, 0, 1200, 838] });
  });

  it('draws the labels in the label colour whatever the last control was drawn in', () => {
    // On the Access tab of a right-handed user the last control drawn is R, which is on: cream, written on in
    // charcoal. The labels come after it, and a label left in that charcoal would be charcoal on charcoal.
    const { text, ops } = drawn('access');
    const onControls = ops('fillText').filter((call) => call.textAlign === 'center');
    expect(onControls.pop()).toMatchObject({
      args: ['R', 1125, 487.75, 75],
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
      // a control's own pill: the shape at its place and of its width (a track is wider)
      const alphaOf = (id: string) => {
        const c = panel.controls().find((each) => each.id === id)!;
        const left = 600 + (c.x - c.w / 2) * 2500;
        const shape = ops('roundRect').find(
          (call) => Math.abs((call.args[0] as number) - left) < 1e-6 && call.args[2] === c.w * 2500,
        );
        return shape?.globalAlpha;
      };
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
    canRestore: false,
    restoreReplaced: () => asked.push('restoreReplaced'),
    setBedHeightOffset: (metres: number) => asked.push(`setBedHeightOffset ${metres}`),
    timeLapse: false,
    setTimeLapse: (on: boolean) => asked.push(`setTimeLapse ${on}`),
    pick: (kind: string) => asked.push(`pick ${kind}`),
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
  'volume:-',
  'volume:+',
  'tempo:-',
  'tempo:+',
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
    // Where it is drawn: the panel is 0.55 m ahead of a level head, and Close is at (0.21, 0.1375) m on it.
    const close = targets().find((entity) => entity.getValue(Interactable, 'id') === 'close')!;
    const [x, y, z] = close.getVectorView(Interactable, 'worldPos');
    expect([x, y, z].map((v) => Math.round(v! * 10000) / 10000)).toEqual([0.21, 1.2875, -0.55]);

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
    const { watch, frame, press, pinch, release, system } = rig();
    watch();
    frame();
    press(ORB_ID);
    frame();
    for (const gesture of ['none', 'carry', 'drag', 'pull']) {
      pinch('panel', 'close');
      release(gesture, 'panel', 'close');
      frame();
      expect(system.panel.open, gesture).toBe(true);
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
    const { head, frame, press, watch, ids, targets, system, asked } = rig();
    watch(); // first by hand, to leave the panel on the Garden tab: its height's plus is where the gaze will rest
    frame();
    press(ORB_ID);
    press('tab:garden');
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
    expect(system.panel.cue()).toBe('height:+'); // that control is under the resting gaze
    const before = { ...settings.get() };
    const asks = asked.length;
    for (let ms = 0; ms < 3000; ms += 50) frame(50);
    expect(settings.get()).toEqual(before);
    expect(asked.slice(asks)).toEqual([]); // no height asked for
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

describe('PanelSystem: the Seeds page (T-193, D-076; API_SPEC §1.9)', () => {
  it("the Garden tab's Seeds button opens it; a swatch is filled by render, and its press is garden.pick once, then the board closes", () => {
    const { frame, press, ids, asked, system, mesh } = rig();
    frame();
    for (const id of [ORB_ID, 'tab:garden', 'seeds']) press(id);
    frame();
    expect(system.panel.open).toBe(true);
    expect(mesh('settings-panel').visible).toBe(true);
    expect(ids()).toEqual([
      'lib:old',
      'lib:new',
      'close',
      'seed:bowl',
      'seed:chime',
      'seed:flute',
      'seed:reed',
      'seed:hum',
    ]);
    const bowl = system.panel.controls().find((c) => c.id === 'seed:bowl')!;
    expect(bowl.fill).toMatch(/^#[0-9a-f]{6}$/);
    expect(bowl.fill).toBe(kindSwatch('bowl', WANDERER.paletteSeed, WANDERER.reverbRt60));
    asked.length = 0;
    press('seed:bowl');
    expect(asked).toEqual(['ui tick', 'pick bowl']);
    expect(system.panel.open).toBe(false);
    expect(ids()).toEqual([]);
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

describe('PanelSystem: the guide (D-084)', () => {
  const offs: (() => void)[] = [];
  afterEach(() => offs.splice(0).forEach((off) => off()));
  /** Every payload of `type` from now on. */
  function heard<K extends keyof EventMap>(type: K): EventMap[K][] {
    const seen: EventMap[K][] = [];
    offs.push(bus.on(type, (event) => void seen.push(event)));
    return seen;
  }
  const opens = () => heard('panel:open');
  const DEG = 180 / Math.PI;
  type Shown = { visible: boolean; matrix: Matrix4; material: { color: Color } };
  const accent = (hex: string) => new Color(hex).toArray().map((v) => Math.round(v * 1e4) / 1e4);
  const colour = (ring: Shown) => ring.material.color.toArray().map((v) => Math.round(v * 1e4) / 1e4);
  const where = (ring: Shown) =>
    [12, 13, 14].map((i) => Math.round((ring.matrix.elements[i] ?? 0) * 1e4) / 1e4);

  it('says panel:open once per change, by pinch and by look-away', () => {
    const seen = opens();
    const { watch, frame, press, head, system } = rig();
    watch();
    frame();
    press(ORB_ID);
    frame();
    expect(seen.map((e) => e.open)).toEqual([true]);
    press('close');
    frame();
    expect(seen.map((e) => e.open)).toEqual([true, false]);
    press(ORB_ID);
    head.makeRotationY(Math.PI).setPosition(...EYE); // the head turns round: the board is behind it
    for (let ms = 0; ms <= PANEL_LOOK_AWAY_MS + 200; ms += 50) frame(50);
    expect(system.panel.open).toBe(false);
    expect(seen.map((e) => e.open)).toEqual([true, false, true, false]);
  });

  it('says panel:open once when a gaze dwell on the orb opens the board', () => {
    settings.set({ gazeDwell: true, dwellMs: 600 });
    const seen = opens();
    const { head, frame, targets, system } = rig();
    frame();
    const [x = 0, y = 0, z = 0] = targets()[0]!.getVectorView(Interactable, 'worldPos');
    head.lookAt(new Vector3(...EYE), new Vector3(x, y, z), new Vector3(0, 1, 0)).setPosition(...EYE);
    for (let ms = 0; ms <= 2000; ms += 50) frame(50);
    expect(system.panel.open).toBe(true);
    expect(seen.map((e) => e.open)).toEqual([true]);
  });

  it('shows Skip guide only while the guide runs, in the upper corner of the dominant side in the FoV box; a press says onboarding:skip once and it goes', () => {
    const skips = heard('onboarding:skip');
    const { frame, ids, targets, press, emit, mesh } = rig();
    frame();
    for (const step of ['off', 'done'] as const) {
      emit('onboarding:step', { step });
      frame();
      expect(ids(), step).not.toContain(SKIP_ID);
    }
    emit('onboarding:step', { step: 'plant' });
    frame();
    expect(ids()).toEqual([SKIP_ID]); // no hand, so no orb
    // 10 Nov: dim at rest, so it does not pull the eye from the guide (full when hovered, gazed at, or in high contrast)
    expect((mesh('guide-skip') as unknown as { material: { opacity: number } }).material.opacity).toBe(
      SKIP_REST_OPACITY,
    );
    const skip = targets()[0]!;
    expect(skip.getValue(Interactable, 'kind')).toBe('panel');
    const [x = 0, y = 0, z = 0] = skip.getVectorView(Interactable, 'worldPos');
    expect(Math.atan2(x, -z) * DEG).toBeCloseTo(19, 0); // to the right of a right-handed user
    expect(Math.atan2(EYE[1] - y, -z) * DEG).toBeCloseTo(-16, 0); // above the gaze, the box's upper corner (10 Nov)
    press(SKIP_ID);
    expect(skips).toHaveLength(1);
    expect(ids()).not.toContain(SKIP_ID);
    press(SKIP_ID); // a pinch that ends where it was: nothing left to skip
    expect(skips).toHaveLength(1);
  });

  it("moves Skip guide into the open board's header, clear of the tabs and Close, and takes a gaze dwell on it", () => {
    const skips = heard('onboarding:skip');
    const { watch, frame, press, emit, targets, head } = rig();
    watch();
    emit('onboarding:step', { step: 'orb' });
    frame();
    press(ORB_ID);
    frame();
    const at = (id: string) => [
      ...targets()
        .find((e) => e.getValue(Interactable, 'id') === id)!
        .getVectorView(Interactable, 'worldPos'),
    ];
    const [x = 0, y = 0, z = 0] = at(SKIP_ID);
    expect([y, z].map((v) => Math.round(v * 1e4) / 1e4)).toEqual([
      Math.round(at('close')[1]! * 1e4) / 1e4,
      -0.55,
    ]);
    expect(at('close')[0]! - x).toBeGreaterThanOrEqual(0.055);
    expect(x - at('tab:garden')[0]!).toBeGreaterThanOrEqual(0.055);
    settings.set({ gazeDwell: true, dwellMs: 600 });
    head.lookAt(new Vector3(...EYE), new Vector3(x, y, z), new Vector3(0, 1, 0)).setPosition(...EYE);
    for (let ms = 0; ms <= 2000; ms += 50) frame(50);
    expect(skips).toHaveLength(1);
  });

  it('turns the open board to the Garden tab in seedsTip and rings Seeds in a slow accent pulse; Move in moveTip; the orb in orb', () => {
    const { watch, frame, press, emit, system, mesh, targets } = rig();
    const ring = mesh('settings-cue') as unknown as Shown;
    const at = (id: string) =>
      [
        ...targets()
          .find((e) => e.getValue(Interactable, 'id') === id)!
          .getVectorView(Interactable, 'worldPos'),
      ].map((v) => Math.round(v * 1e4) / 1e4);
    watch();
    emit('onboarding:step', { step: 'orb' });
    frame();
    expect(ring.visible).toBe(true);
    expect(where(ring)).toEqual(at(ORB_ID));
    press(ORB_ID); // the Sound tab
    emit('onboarding:step', { step: 'seedsTip' });
    frame();
    expect(system.panel.tab).toBe('garden');
    expect(where(ring)).toEqual(at('seeds'));
    const reds: number[] = [];
    for (let ms = 0; ms < 1000; ms += 14) {
      frame();
      reds.push(ring.material.color.r);
    }
    expect(Math.max(...reds)).toBeCloseTo(new Color(PANEL_ACCENT).r, 2);
    expect(Math.min(...reds)).toBeLessThan(0.6 * Math.max(...reds));
    press('tab:sound'); // once per step: the player may look round the board
    expect(system.panel.tab).toBe('sound');
    emit('onboarding:step', { step: 'moveTip' });
    frame();
    expect(system.panel.tab).toBe('garden');
    expect(where(ring)).toEqual(at('replaceBed'));
    emit('onboarding:step', { step: 'done' });
    frame();
    expect(ring.visible).toBe(false);
  });

  it('glows steady in the full accent with Reduce motion, its high-contrast twin in high contrast', () => {
    settings.set({ reducedMotion: true });
    const { watch, frame, emit, mesh } = rig();
    const ring = mesh('settings-cue') as unknown as Shown;
    watch();
    emit('onboarding:step', { step: 'orb' });
    for (let i = 0; i < 100; i++) {
      frame();
      expect(colour(ring)).toEqual(accent(PANEL_ACCENT));
    }
    settings.set({ highContrast: true });
    frame();
    expect(colour(ring)).toEqual(accent(PANEL_ACCENT_HIGH_CONTRAST));
  });
});
