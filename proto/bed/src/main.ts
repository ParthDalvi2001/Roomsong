/// <reference types="webxr" />
// T-125 preview page: the bed, 13 sample plants and the tide, drawn by the app's own renderers (src/render/).
// A plain page first (a seated view over a table, drag to orbit); "Enter XR" shows the same bed in an AR
// session, 0.45 m ahead at table height. No hands or controllers are drawn (D-027), no sound, and nothing is
// sent anywhere. The tide runs off the frame clock here; in the app it runs off the audio clock (T-128).
import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { bus, DEFAULT_TEMPO_BPM, flags } from '../../../src/core/index.js';
import { STEPS } from '../../../src/garden/index.js';
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

/** Where the tide is in its bar, 0..1, at a time in seconds. In the app this is audio's clock.barPhase(). */
function tidePhase(timeS: number): number {
  const bars = timeS / BAR_S;
  return bars - Math.floor(bars);
}

// The palette of UX §5 as hues: gold, moss, ice, violet.
const GOLD = 0.13;
const MOSS = 0.34;
const ICE = 0.53;
const VIOLET = 0.74;
type Row = readonly [VoiceType, ring: number, step: number, height: number, hue: number];
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
// ?flags=autoplant=80 (API_SPEC §3) fills that many cells instead, ring by ring: the full bed for the perf numbers.
const VOICES = ['bell', 'pad', 'pluck'] as const;
const AUTO: readonly Row[] = Array.from({ length: flags.autoplant }, (_, i) => [
  VOICES[i % VOICES.length]!,
  Math.floor(i / STEPS),
  i % STEPS,
  (i % 5) / 4,
  (i % STEPS) / STEPS,
]);
const plantsOnShow: Plant[] = (AUTO.length > 0 ? AUTO : SAMPLE).map(
  ([voice, ring, step, height, hue], i) => ({
    id: `plant-${i}`,
    voice,
    cell: { ring, step },
    height,
    hue,
    plantedAt: 0,
  }),
);

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
new BedRenderer(bed);
const plants = new PlantRenderer(bed, guard);
const tide = new TideRenderer(bed, guard);
plants.setState({ plants: plantsOnShow });
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

let latest: (EventMap['perf:sample'] & { inXr: boolean; atMs: number }) | null = null;
bus.on('perf:sample', (sample) => {
  // A copy: the emitter reuses its object.
  latest = { ...sample, inXr: renderer.xr.isPresenting, atMs: performance.now() };
  numbersLine.textContent = TEXT.numbers(sample);
});

renderer.setAnimationLoop((timeMs) => {
  const startedMs = performance.now();
  const phase = tidePhase(timeMs / 1000);
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

// Read-only handle for tests/e2e/07-bed.spec.ts: the latest perf:sample, when it came and whether in a session,
// and the foveation the session's layer was asked for.
Object.defineProperty(window, '__bed', {
  value: Object.freeze({ sample: () => latest, foveation: () => renderer.xr.getFoveation() ?? null }),
});
