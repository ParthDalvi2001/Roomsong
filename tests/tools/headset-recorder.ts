// Dev server only, with ?rec=1 (vite.config.ts, plugin roomsong-headset-recorder): records what a real headset session
// senses to .tmp/headset/rec.jsonl on the Mac, so a tester in the headset can be coached and bugs seen as they happen.
// Allocates per event by design: never in a build, and frame numbers taken with it on are a little pessimistic.
// Snapshots of what is drawn: every 5 s while a session presents, and on the frame after room:bedPlaced and
// room:tuned, the scene is drawn once more from the left eye into a 512 px target off screen, read back, put on
// mid-grey (transparent is passthrough) and posted as a PNG, saved as .tmp/headset/snaps/<page start>-<n>.png.
// Not the XR framebuffer: the emulator's and the Quest's (layers, multiview) differ. So it shows the scene's state,
// never a multiview-only fault (each snap line says whether the session draws multiview). Cost per snapshot: one
// extra draw of the scene and an async read-back; on the Quest the first one compiles a non-multiview copy of
// each shader (a one-off hitch), and renderer.info for that frame counts the snapshot's draw. Between snapshots, and
// with no session, one test per frame and no allocation.
import { PerspectiveCamera, SRGBColorSpace, WebGLRenderTarget, type Camera, type WebGLRenderer } from 'three';

import { bus, DEFAULT_SETTINGS, settings } from '../../src/core/index.js';
import { HandSystem } from '../../src/hands/HandSystem.js';
import { PanelSystem } from '../../src/ui/PanelSystem.js';

type Line = Record<string, unknown>;
const queue: Line[] = [];
const started = performance.now();
const rec = (kind: string, data?: unknown): void => {
  queue.push({ t: Math.round(performance.now() - started), kind, data });
};

const SNAP_EVERY_MS = 5000;
/** The snapshot's longer side, px; the other follows the eye's aspect. */
const SNAP_PX = 512;
/** What a transparent pixel (passthrough) becomes in the PNG. */
const SNAP_GREY = 128;
const pageStart = new Date().toISOString().replace(/:/g, '-');
let snapDue: string | null = null;
let snapsTaken = 0;
let isSnapping = false;
let isWatching = false;

const send = (): void => {
  if (queue.length === 0) return;
  const body = queue
    .splice(0)
    .map((line) => JSON.stringify(line))
    .join('\n');
  void fetch('/__rec', { method: 'POST', body, keepalive: body.length < 60_000 }).catch(() => undefined);
};
setInterval(send, 400);
addEventListener('pagehide', send);

/** The garden's whole state is long and the numbers are noise: counts, and round numbers. */
function brief(type: string, payload: unknown): unknown {
  if (type === 'garden:changed') {
    const { state, diff } = payload as { state: { plants: unknown[]; seeds: unknown[] }; diff: unknown };
    return { plants: state.plants.length, seeds: state.seeds.length, diff };
  }
  const text = JSON.stringify(payload, (_k, v: unknown) =>
    typeof v === 'number' ? Math.round(v * 1000) / 1000 : v,
  );
  return text !== undefined && text.length > 500 ? `${text.slice(0, 500)}…` : payload;
}

const emit = bus.emit.bind(bus);
(bus as { emit: unknown }).emit = (type: string, payload: unknown) => {
  if (type === 'room:bedPlaced' || type === 'room:tuned') snapDue = type;
  try {
    rec(type, brief(type, payload));
  } catch (error) {
    rec('rec:unserializable', `${type}: ${String(error)}`);
  }
  emit(type as never, payload as never);
};

addEventListener('error', (e) => rec('page:error', `${e.message} @ ${e.filename}:${e.lineno}`));
addEventListener('unhandledrejection', (e) => rec('page:rejection', String(e.reason)));
for (const level of ['warn', 'error'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    rec(`console:${level}`, args.map(String).join(' ').slice(0, 500));
    original(...args);
  };
}

const xr = navigator.xr;
rec('page', { url: location.href, ua: navigator.userAgent, xr: xr !== undefined });
void xr?.isSessionSupported('immersive-ar').then((ar) => rec('page:ar-supported', ar));

// Each load starts from the default settings, once the save has loaded: a tester is not stuck with a stray switch.
// &keep=1 keeps them, to test that they are saved.
let isResetDue = !new URLSearchParams(location.search).has('keep');

// What the bus does not say: the words on the page, the session's features and inputs, and where the head is.
let status = '';
let inputs = '';
let sessionSeen: XRSession | null = null;
type Dev = {
  garden: { state: unknown };
  world: {
    renderer: WebGLRenderer;
    camera: Camera;
    getSystem(system: unknown): unknown;
    player: { head: { matrixWorld: { elements: number[] } } };
  };
};
setInterval(() => {
  const words = document.querySelector('[role=status]')?.textContent ?? '';
  if (words !== status) rec('page:status', (status = words));
  const dev = (window as unknown as { __roomsong?: Dev }).__roomsong;
  if (dev === undefined) return;
  if (!isWatching) watchRender(dev.world.renderer, dev.world.camera);
  if (isResetDue && dev.garden.state !== null) {
    isResetDue = false;
    settings.set({ ...DEFAULT_SETTINGS });
    rec('rec:settingsReset');
  }
  const session = dev.world.renderer.xr.getSession();
  if (session !== sessionSeen) {
    sessionSeen = session;
    rec(
      'xr:session',
      session && {
        mode: session.environmentBlendMode,
        features: session.enabledFeatures,
        visibility: session.visibilityState,
      },
    );
  }
  if (session === null) return;
  const now = [...session.inputSources]
    .map((s) => `${s.handedness}:${s.hand ? 'hand' : s.gamepad ? 'controller' : 'other'}`)
    .join(' ');
  if (now !== inputs) rec('xr:inputs', (inputs = now));
  const m = dev.world.player.head.matrixWorld.elements;
  rec('xr:head', {
    y: Math.round((m[13] ?? 0) * 100) / 100,
    x: Math.round((m[12] ?? 0) * 100) / 100,
    z: Math.round((m[14] ?? 0) * 100) / 100,
    downness: Math.round((m[9] ?? 0) * 100) / 100,
  });
}, 1000);

/** Takes a due snapshot right after the frame's own render (the XR camera is then this frame's), never in it. */
function watchRender(renderer: WebGLRenderer, mainCamera: Camera): void {
  isWatching = true;
  const render = renderer.render.bind(renderer);
  const eye = new PerspectiveCamera();
  const target = new WebGLRenderTarget(1, 1, { colorSpace: SRGBColorSpace });
  setInterval(() => {
    if (renderer.xr.isPresenting) snapDue ??= 'timer';
  }, SNAP_EVERY_MS);
  renderer.render = (scene, camera) => {
    render(scene, camera);
    if (snapDue === null || isSnapping || camera !== mainCamera || !renderer.xr.isPresenting) return;
    const left = renderer.xr.getCamera().cameras[0];
    if (left?.viewport === undefined) return;
    const why = snapDue;
    snapDue = null;
    const scale = SNAP_PX / Math.max(left.viewport.z, left.viewport.w);
    const width = Math.round(left.viewport.z * scale);
    const height = Math.round(left.viewport.w * scale);
    target.setSize(width, height);
    eye.copy(left, false);
    eye.matrixWorldAutoUpdate = false; // else render() rebuilds matrixWorld without the player rig's transform
    const previous = renderer.getRenderTarget();
    renderer.xr.enabled = false; // draw with `eye` alone, into `target`
    try {
      renderer.setRenderTarget(target);
      render(scene, eye);
    } finally {
      renderer.setRenderTarget(previous);
      renderer.xr.enabled = true;
    }
    isSnapping = true;
    const pixels = new Uint8Array(width * height * 4);
    const query = new URLSearchParams({
      name: `${pageStart}-${++snapsTaken}`,
      t: String(Math.round(performance.now() - started)),
      why,
      multiview: (renderer.xr as { isMultiview?: boolean }).isMultiview === true ? '1' : '0',
    });
    renderer
      .readRenderTargetPixelsAsync(target, 0, 0, width, height, pixels)
      .then(() => toPng(pixels, width, height))
      .then((png) => fetch(`/__snap?${query}`, { method: 'POST', body: png }))
      .then((response) => response.ok || rec('snap:error', `the Mac said ${response.status}`))
      .catch((error: unknown) => rec('snap:error', String(error)))
      .finally(() => (isSnapping = false));
  };
}

/** GL's rows run bottom-up; its colours are premultiplied, so each pixel goes on the grey by what alpha leaves. */
function toPng(pixels: Uint8Array, width: number, height: number): Promise<Blob> {
  const image = new ImageData(width, height);
  const row = width * 4;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < row; x += 4) {
      const from = (height - 1 - y) * row + x;
      const to = y * row + x;
      const grey = ((255 - (pixels[from + 3] ?? 0)) / 255) * SNAP_GREY;
      for (let c = 0; c < 3; c++) image.data[to + c] = (pixels[from + c] ?? 0) + grey;
      image.data[to + 3] = 255;
    }
  }
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext('2d')?.putImageData(image, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}

// Twice a second, each hand: tracked; how far its palm faces up (1 = straight up; the seed asks for 0.82 or more); and
// how far it faces the way the head looks (Listen asks for 0.77 or more, and a palm not within 30 degrees of down).
type Slots = {
  candidates: { target: { kind: string; id: string }; pos: { x: number; y: number; z: number } }[];
  slots: {
    frame: {
      hand: string;
      tracked: boolean;
      pinch: boolean;
      palmNormal: { x: number; y: number; z: number };
    };
  }[];
};
const round = (value: number): number => Math.round(value * 100) / 100;
let panelOpen = false;
setInterval(() => {
  const dev = (window as unknown as { __roomsong?: Dev }).__roomsong;
  const hands = dev?.world.getSystem(HandSystem) as Slots | undefined;
  if (dev?.world.renderer.xr.getSession() == null || hands === undefined) return;
  const m = dev.world.player.head.matrixWorld.elements;
  rec(
    'plants:at',
    hands.candidates
      .filter(({ target }) => target.kind === 'plant')
      .map(({ target, pos }) => [target.id.slice(-1), round(pos.x), round(pos.y), round(pos.z)]),
  );
  const isOpen =
    (dev.world.getSystem(PanelSystem) as { panel?: { open: boolean } } | undefined)?.panel?.open ?? false;
  if (isOpen !== panelOpen) rec('panel:open', (panelOpen = isOpen));
  rec(
    'hands:sample',
    hands.slots.map(({ frame: { hand, tracked, pinch, palmNormal: n } }) => ({
      hand,
      tracked,
      pinch,
      palmUp: round(n.y),
      palmOut: round(-(n.x * (m[8] ?? 0) + n.y * (m[9] ?? 0) + n.z * (m[10] ?? 0))),
    })),
  );
}, 500);
