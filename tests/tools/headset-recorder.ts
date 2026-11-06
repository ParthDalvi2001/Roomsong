// Dev server only, with ?rec=1 (vite.config.ts, plugin roomsong-headset-recorder): records what a real headset session
// senses to .tmp/headset/rec.jsonl on the Mac, so a tester in the headset can be coached and bugs seen as they happen.
// Allocates per event by design: never in a build, and frame numbers taken with it on are a little pessimistic.
import { bus } from '../../src/core/index.js';
import { HandSystem } from '../../src/hands/HandSystem.js';

type Line = Record<string, unknown>;
const queue: Line[] = [];
const started = performance.now();
const rec = (kind: string, data?: unknown): void => {
  queue.push({ t: Math.round(performance.now() - started), kind, data });
};

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

// What the bus does not say: the words on the page, the session's features and inputs, and where the head is.
let status = '';
let inputs = '';
let sessionSeen: XRSession | null = null;
type Dev = {
  world: {
    renderer: { xr: { getSession(): XRSession | null } };
    getSystem(system: unknown): unknown;
    player: { head: { matrixWorld: { elements: number[] } } };
  };
};
setInterval(() => {
  const words = document.querySelector('[role=status]')?.textContent ?? '';
  if (words !== status) rec('page:status', (status = words));
  const dev = (window as unknown as { __roomsong?: Dev }).__roomsong;
  if (dev === undefined) return;
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

// Twice a second, each hand: tracked, and how far its palm faces up (1 = straight up; the seed asks for 0.82 or more).
type Slots = { slots: { frame: { hand: string; tracked: boolean; pinch: boolean; palmNormal: { y: number } } }[] };
setInterval(() => {
  const dev = (window as unknown as { __roomsong?: Dev }).__roomsong;
  const hands = dev?.world.getSystem(HandSystem) as Slots | undefined;
  if (dev?.world.renderer.xr.getSession() == null || hands === undefined) return;
  rec(
    'hands:sample',
    hands.slots.map(({ frame }) => ({
      hand: frame.hand,
      tracked: frame.tracked,
      pinch: frame.pinch,
      palmUp: Math.round(frame.palmNormal.y * 100) / 100,
    })),
  );
}, 500);
