/// <reference types="webxr" />
// The bed preview page (T-125, T-119): the bed, a garden of sample plants and the tide, drawn by the app's own
// renderers (src/render/). A plain page first (a seated view over a table, drag to orbit); "Enter XR" shows the
// same bed in an AR session, 0.45 m ahead at table height. No hands or controllers are drawn (D-027), no sound,
// and nothing is sent anywhere. The tide runs off the frame clock here; in the app it runs off the audio clock.
// The controls of T-119 stand in for what the app's wiring will call: the pointer is a hand's hover, a tick box a
// lost hand's tint, a button a visit a week later.
import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { bus, DEFAULT_TEMPO_BPM, flags, MS_PER_DAY, settings } from '../../../src/core/index.js';
import { BED_INNER, BED_OUTER, cellCentre, RINGS, snapToCell, STEPS } from '../../../src/garden/index.js';
import {
  BedRenderer,
  createPerfHud,
  FlashGuard,
  FOVEATION_MEDIUM,
  PerfSampler,
  PlantRenderer,
  TideRenderer,
} from '../../../src/render/index.js';

import type { EventMap } from '../../../src/core/index.js';
import type { Plant, VoiceType } from '../../../src/garden/index.js';

// UX_WIREFRAMES §2, the seated sketch: table top 0.72 m, eyes 1.15 m, bed centre 0.45 m ahead (D-020).
const TABLE_HEIGHT_M = 0.72;
const EYE_HEIGHT_M = 1.15;
const BED_AHEAD_M = 0.45;
const TABLE_WIDTH_M = 1.2;
const TABLE_DEPTH_M = 0.8;
const TABLE_COLOUR = 0x2b2622; // a dark wooden table; a real table shows through in the headset instead
const BRIGHT_TABLE_COLOUR = 0xffffff; // UX §9.4: the worst case for the tide's light
const BACKDROP_COLOUR = 0x0b0f12;
const TABLE_BELOW_BED_M = 0.001; // the table is drawn just under the bed, so the two do not fight for depth
// The plain view: its lens, how near and far it draws, and how far the mouse may take it.
const FIELD_OF_VIEW_DEG = 60;
const NEAR_M = 0.05;
const FAR_M = 20;
const ORBIT_MIN_M = 0.25;
const ORBIT_MAX_M = 2;
const ORBIT_ABOVE_TABLE_RAD = 0.05; // the view stays this far above the table's plane
// The HUD panel (?flags=perfHud), in the bed frame: past the right rim, turned to the seated eye.
const HUD_PLACE_M = [0.38, 0.1, -0.12] as const;
const BAR_S = (4 * 60) / DEFAULT_TEMPO_BPM; // FR-MUS-03: 4 beats a bar
const WEEK_MS = 7 * MS_PER_DAY; // the "a week passes" button: every plant reaches its last stage (FR-MUS-09)

/** Where the tide is in its bar, 0..1, at a time in seconds. In the app this is audio's clock.barPhase(). */
function tidePhase(timeS: number): number {
  const bars = timeS / BAR_S;
  return bars - Math.floor(bars);
}

// The palette of UX §5 as hues: gold, moss, ice, violet; and a rose for the fifth voice.
const GOLD = 0.13;
const MOSS = 0.34;
const ICE = 0.53;
const VIOLET = 0.74;
const ROSE = 0.93;
/** One plant: its voice, its cell, its height 0..1, its hue, and how many days old it is when the page opens. */
type Row = readonly [VoiceType, ring: number, step: number, height: number, hue: number, ageDays?: number];
const SAMPLE: readonly Row[] = [
  ['bell', 0, 0, 0.55, GOLD],
  ['pad', 4, 1, 0.45, MOSS],
  ['bell', 2, 2, 0.8, GOLD],
  ['pad', 1, 3, 0.3, MOSS],
  ['pluck', 4, 4, 0.9, ICE],
  ['pluck', 3, 5, 0.6, ICE],
  ['bell', 1, 7, 0.4, VIOLET],
  ['pad', 3, 8, 0.5, MOSS],
  ['pluck', 0, 10, 0.7, ICE],
  ['bell', 4, 11, 1, GOLD],
  ['pad', 2, 12, 0.2, VIOLET],
  ['pluck', 2, 14, 0.5, MOSS],
  ['bell', 3, 15, 0.65, VIOLET],
];
const FIVE = [
  ['bell', GOLD],
  ['pad', MOSS],
  ['pluck', ICE],
  ['bass', VIOLET],
  ['choir', ROSE],
] as const;
// UX §9.5: the five in a row on the near side, on a short, a middling and a tall stem, the tall ones behind.
const SHAPES: readonly Row[] = (
  [
    [4, 0],
    [2, 0.55],
    [1, 1],
  ] as const
).flatMap(([ring, height]) => FIVE.map(([voice, hue], i): Row => [voice, ring, 2 + i, height, hue]));
// UX §9.6: one plant per stage in a row: new, a day, three days and a week old, left to right. Three rows, the
// taller behind: a reed, on which the whorls are plain to count; a jug, whose bulb they must clear; and an
// umbrella, whose canopy hides them on a short stem.
const STAGE_DAYS = [0, 1, 3, 7] as const;
const STAGE_STEPS = [6, 5, 3, 2] as const; // step 4, nearest the eye, stays free
const GROWTH: readonly Row[] = (
  [
    ['pluck', 4, 0.5, ICE],
    ['bass', 2, 0.75, VIOLET],
    ['choir', 0, 1, ROSE],
  ] as const
).flatMap(([voice, ring, height, hue]) =>
  STAGE_DAYS.map((ageDays, i): Row => [voice, ring, STAGE_STEPS[i]!, height, hue, ageDays]),
);
/** Every cell planted, ring by ring. */
function full(voices: readonly VoiceType[], count = RINGS * STEPS): Row[] {
  return Array.from({ length: count }, (_, i): Row => [
    voices[i % voices.length]!,
    Math.floor(i / STEPS),
    i % STEPS,
    (i % 5) / 4,
    (i % STEPS) / STEPS,
  ]);
}
const GARDENS: Readonly<Record<string, readonly Row[]>> = {
  // ?flags=autoplant=80 (API_SPEC §3) fills that many cells instead: the full bed of T-125's numbers.
  sample: flags.autoplant > 0 ? full(['bell', 'pad', 'pluck'], flags.autoplant) : SAMPLE,
  shapes: SHAPES,
  growth: GROWTH,
  everything: full(FIVE.map(([voice]) => voice)), // all five shapes on a full bed: the worst case of T-119
  empty: [],
};
// Each garden has its own ids: to the renderer a plant it already draws that is older is one that grew, and it
// would keep it waiting for its first note (UX §9.6).
const toPlants = (garden: string, rows: readonly Row[]): Plant[] =>
  rows.map(([voice, ring, step, height, hue, ageDays = 0], i) => ({
    id: `${garden}-${i}`,
    voice,
    cell: { ring, step },
    height,
    hue,
    plantedAt: -ageDays * MS_PER_DAY, // the page's garden time starts at 0
  }));

const TEXT = {
  noXr: 'This browser has no WebXR session to offer. The view above is the whole preview.',
  failed: 'The session did not start:',
  inXr: 'The bed is in the headset, 0.45 m ahead of where you started, at table height.',
  numbers: (s: EventMap['perf:sample']) =>
    `${s.fps.toFixed(0)} fps, ${s.draws} draw calls, ${s.tris} triangles, ${s.jsMs.toFixed(1)} ms script`,
} as const;

/** The part of the dev emulator (IWER 2.5.0) this page uses, when it is there. */
interface Emulator {
  remote: { dispatch(method: string, params: object): Promise<unknown> };
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const enterButton = byId<HTMLButtonElement>('enter');
const statusLine = byId('status');
const numbersLine = byId('numbers');
const gardenChoice = byId<HTMLSelectElement>('garden');
const box = (id: string) => byId<HTMLInputElement>(id);

const renderer = new WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFoveation(FOVEATION_MEDIUM); // NFR-PERF-09
byId('view').append(renderer.domElement);

const scene = new Scene();
const backdrop = new Color(BACKDROP_COLOUR);
scene.background = backdrop;
const table = new Mesh(
  new PlaneGeometry(TABLE_WIDTH_M, TABLE_DEPTH_M).rotateX(-Math.PI / 2),
  new MeshBasicMaterial({ color: TABLE_COLOUR }),
);
table.position.set(0, TABLE_HEIGHT_M - TABLE_BELOW_BED_M, -BED_AHEAD_M);
// The bed frame (D-029): +x to the viewer's right, +z toward the viewer.
const bed = new Group();
bed.position.set(0, TABLE_HEIGHT_M, -BED_AHEAD_M);
scene.add(table, bed);

const guard = new FlashGuard();
const cells = new BedRenderer(bed, guard);
const plants = new PlantRenderer(bed, guard);
const tide = new TideRenderer(bed, guard);
const sampler = new PerfSampler(renderer.info, guard);
const hud = createPerfHud(bed); // only with ?flags=perfHud
if (hud) {
  hud.mesh.position.set(...HUD_PLACE_M);
  hud.mesh.lookAt(0, EYE_HEIGHT_M, 0);
}

const camera = new PerspectiveCamera(FIELD_OF_VIEW_DEG, 1, NEAR_M, FAR_M);
camera.position.set(0, EYE_HEIGHT_M, 0);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(bed.position);
controls.minDistance = ORBIT_MIN_M;
controls.maxDistance = ORBIT_MAX_M;
controls.maxPolarAngle = Math.PI / 2 - ORBIT_ABOVE_TABLE_RAD; // never from under the table
controls.update();

function resize(): void {
  if (renderer.xr.isPresenting) return; // the session owns the size
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

// The garden on show, and its time: `lastVisitAt` is 0 until "a week passes".
let onShow: Plant[] = [];
let lastVisitAt = 0;
const centre = { x: 0, y: 0 };
/** The plant nearest the viewer: the one the "lost hand" of the tint box held. */
const nearest = (): Plant | undefined =>
  onShow.reduce<Plant | undefined>(
    (best, plant) =>
      best && cellCentre(best.cell, centre).y >= cellCentre(plant.cell, centre).y ? best : plant,
    undefined,
  );
/** FR-HND-15: in the app, `hands:lost` with a held plant sets the tint and `hands:found` lifts it. */
function tint(): void {
  const held = box('tint').checked ? nearest() : undefined;
  plants.setTint('left', held?.id ?? null, held ? Number.POSITIVE_INFINITY : 0);
}
function showGarden(): void {
  onShow = toPlants(gardenChoice.value, GARDENS[gardenChoice.value] ?? SAMPLE);
  lastVisitAt = 0;
  plants.setState({ plants: onShow, lastVisitAt });
  plants.setHover('right', null);
  tint();
}
showGarden();
gardenChoice.addEventListener('change', showGarden);
box('tint').addEventListener('change', tint);
// FR-MUS-09: a visit a week later. The plants array stays the same one, as after applyVisit; each plant that grew
// unfurls on its next note (UX §9.6).
byId('week').addEventListener('click', () => {
  lastVisitAt += WEEK_MS;
  plants.setState({ plants: onShow, lastVisitAt });
});
box('bright').addEventListener('change', () =>
  table.material.color.set(box('bright').checked ? BRIGHT_TABLE_COLOUR : TABLE_COLOUR),
);
// The app's settings store: the renderers read it themselves (API_SPEC §1.8).
box('reduced').addEventListener('change', () => settings.set({ reducedMotion: box('reduced').checked }));
box('contrast').addEventListener('change', () => settings.set({ highContrast: box('contrast').checked }));

// FR-HND-16: the pointer stands in for a hand. The marker of the cell under it is the cue for where a release
// would land; with the glow box ticked, a plant on that cell glows as under an empty hand.
const pointer = new Vector2();
const ray = new Raycaster();
const bedPlane = new Plane(new Vector3(0, 1, 0), -TABLE_HEIGHT_M);
const onBedPlane = new Vector3();
function hover(event: PointerEvent | null): void {
  let cell = null;
  if (event && !renderer.xr.isPresenting) {
    const { left, top, width, height } = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - left) / width) * 2 - 1, 1 - ((event.clientY - top) / height) * 2);
    ray.setFromCamera(pointer, camera);
    if (ray.ray.intersectPlane(bedPlane, onBedPlane)) {
      // Bed-local (x, y) is the bed's x and z (D-029).
      cell = snapToCell({ x: onBedPlane.x - bed.position.x, y: onBedPlane.z - bed.position.z });
    }
  }
  cells.setHover('right', cell);
  const under =
    cell && onShow.find((plant) => plant.cell.ring === cell.ring && plant.cell.step === cell.step);
  plants.setHover('right', box('glow').checked && under ? under.id : null);
}
renderer.domElement.addEventListener('pointermove', hover);
renderer.domElement.addEventListener('pointerleave', () => hover(null));

let latest: (EventMap['perf:sample'] & { inXr: boolean; atMs: number }) | null = null;
bus.on('perf:sample', (sample) => {
  // A copy: the emitter reuses its object.
  latest = { ...sample, inXr: renderer.xr.isPresenting, atMs: performance.now() };
  numbersLine.textContent = TEXT.numbers(sample);
});

/** For the tests and the screenshots: a phase the tide is held at, or null while it runs. */
let heldPhase: number | null = null;
renderer.setAnimationLoop((timeMs) => {
  const startedMs = performance.now();
  const phase = heldPhase ?? tidePhase(timeMs / 1000);
  cells.update(timeMs);
  tide.update(phase, timeMs);
  plants.update(phase, timeMs);
  renderer.render(scene, camera);
  sampler.frame(timeMs, performance.now() - startedMs);
});

async function enterXr(): Promise<void> {
  enterButton.disabled = true;
  statusLine.textContent = '';
  try {
    // Hands if the headset has them; nothing on this page needs a hand or a controller.
    const session = await navigator.xr!.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hand-tracking'],
    });
    session.addEventListener('end', () => {
      scene.background = backdrop;
      table.visible = controls.enabled = true;
      enterButton.disabled = false;
      statusLine.textContent = '';
      resize();
    });
    await renderer.xr.setSession(session);
    scene.background = null; // passthrough
    table.visible = controls.enabled = false;
    hover(null); // no pointer in the session: the cue is a hand's, which this page does not have
    // The dev emulator starts its head standing and looking straight ahead, with the bed out of view below:
    // seat it as in the sketch and look at the bed. Outside the emulator this global does not exist.
    const emulator = (window as { IWER_DEVICE?: Emulator }).IWER_DEVICE;
    await emulator?.remote.dispatch('set_transform', {
      device: 'headset',
      position: { x: 0, y: EYE_HEIGHT_M, z: 0 },
    });
    await emulator?.remote.dispatch('look_at', {
      device: 'headset',
      target: { x: 0, y: TABLE_HEIGHT_M, z: -BED_AHEAD_M },
    });
    statusLine.textContent = TEXT.inXr;
  } catch (error) {
    statusLine.textContent = `${TEXT.failed} ${error instanceof Error ? error.message : String(error)}`;
    enterButton.disabled = false;
  }
}

enterButton.addEventListener('click', () => void enterXr());
void (async () => {
  const supported = (await navigator.xr?.isSessionSupported('immersive-ar').catch(() => false)) ?? false;
  enterButton.hidden = !supported;
  if (!supported) statusLine.textContent = TEXT.noXr;
})();

/** Where a point of the bed is on the page, in CSS pixels: `ring` and `step` may lie between cells. */
function pixelOf(ring: number, step: number): { x: number; y: number } {
  const radius = BED_INNER + (ring * (BED_OUTER - BED_INNER)) / (RINGS - 1);
  const angle = (step * 2 * Math.PI) / STEPS; // from +x toward +z (D-029)
  const at = new Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle)).add(bed.position);
  at.project(camera);
  const { left, top, width, height } = renderer.domElement.getBoundingClientRect();
  return { x: left + ((at.x + 1) / 2) * width, y: top + ((1 - at.y) / 2) * height };
}

// Handle for tests/e2e/07-bed.spec.ts: the latest perf:sample, when it came and whether in a session; the
// foveation the session's layer was asked for; where a point of the bed is on the page; and a way to hold the
// tide still.
Object.defineProperty(window, '__bed', {
  value: Object.freeze({
    sample: () => latest,
    foveation: () => renderer.xr.getFoveation() ?? null,
    pixelOf,
    holdTide: (phase: number | null) => {
      heldPhase = phase;
    },
  }),
});
