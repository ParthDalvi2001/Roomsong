// The landing page (UX §3.1): the one 2D screen. Name, Enter, what this device supports, the access toggles, Help.
// Built from native elements only, so mouse, touch and keyboard all work and a screen reader gets real controls.
import { bus, log, settings } from '../core/index.js';

import { LANDING } from './strings.js';

export type Support = 'yes' | 'no' | 'unknown';
// A type alias, not an interface: Object.values() then knows its values are Support.
export type FeatureSupport = {
  immersiveAr: Support;
  /** Never 'no': a failed session request does not say why. */
  handTracking: 'yes' | 'unknown';
  planeDetection: Support;
  anchors: Support;
};

const granted = (enabled: readonly string[] | null | undefined, feature: string): Support =>
  enabled == null ? 'unknown' : enabled.includes(feature) ? 'yes' : 'no';

/**
 * What is known about the device. `immersiveAr` is the browser's answer to isSessionSupported (undefined until it
 * answers). `enabled` is the last session's XRSession.enabledFeatures: null before any session, because WebXR
 * cannot be asked about a feature without one; undefined when a session started in a browser without that list.
 * Hand tracking is a required feature (FR-SYS-02), so a session that started had it.
 */
export function detectSupport(
  immersiveAr: boolean | undefined,
  enabled: readonly string[] | null | undefined,
): FeatureSupport {
  return {
    immersiveAr: immersiveAr === undefined ? 'unknown' : immersiveAr ? 'yes' : 'no',
    handTracking: enabled === null ? 'unknown' : 'yes',
    planeDetection: granted(enabled, 'plane-detection'),
    anchors: granted(enabled, 'anchors'),
  };
}

/** The four sentences the page shows, in the order of FeatureSupport: what is supported and what happens without it. */
export function featureLines(support: FeatureSupport): string[] {
  const text = LANDING.features;
  return [
    text.immersiveAr[support.immersiveAr],
    text.handTracking[support.handTracking],
    text.planeDetection[support.planeDetection],
    text.anchors[support.anchors],
  ];
}

export interface Landing {
  /**
   * The world is ready: Enter works from now on. `enter` is called inside the click (a session request needs the
   * user's gesture) and resolves false when no session started. It must not throw; a throw or a rejection is
   * logged and counted as false. `opensWindow`: Enter opens the garden window (LLD §11), so it works on a browser
   * with no mixed reality, and the page says so.
   */
  ready(enter: () => Promise<boolean>, opensWindow?: boolean): void;
  /** A session started. `enabledFeatures` is its XRSession.enabledFeatures (undefined where the browser has none). */
  granted(enabledFeatures: readonly string[] | undefined): void;
  /** The world could not load: Enter stays disabled and the page says to reload. */
  failed(): void;
}

const TOGGLES = ['oneHand', 'gazeDwell', 'highContrast', 'reducedMotion'] as const;

function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  return parent.appendChild(element);
}

/** Builds the page's elements into `root` and returns the ones that change. */
function build(root: HTMLElement) {
  add(root, 'h1', LANDING.title);
  add(root, 'p', LANDING.tagline).className = 'tagline';
  const button = add(root, 'button', LANDING.enter);
  button.type = 'button';
  const status = add(root, 'p');
  status.id = 'landing-status';
  status.setAttribute('role', 'status'); // a live region: a change is read out
  button.setAttribute('aria-describedby', status.id);

  const device = add(root, 'section');
  add(device, 'h2', LANDING.deviceHeading);
  const list = add(device, 'ul');
  const rows = Object.keys(LANDING.features).map(() => add(list, 'li'));

  const access = add(root, 'fieldset');
  add(access, 'legend', LANDING.accessHeading);
  const boxes = TOGGLES.map((key) => {
    const label = add(access, 'label');
    const box = add(label, 'input');
    box.type = 'checkbox';
    label.append(LANDING.access[key]);
    return box;
  });

  const help = add(root, 'details');
  add(help, 'summary', LANDING.helpHeading);
  const steps = add(help, 'ol');
  for (const step of LANDING.help) add(steps, 'li', step);
  add(root, 'p', LANDING.privacy);
  return { button, status, device, rows, boxes };
}

/**
 * Builds the page into `root`, once per page. It hides itself for the length of a session (`xr:sessionStart` /
 * `xr:sessionEnd`).
 */
export function mountLanding(root: HTMLElement): Landing {
  const { button, status, device, rows, boxes } = build(root);
  let arSupported: boolean | undefined;
  let enabled: readonly string[] | null | undefined = null;
  let enter: (() => Promise<boolean>) | null = null;
  let opensWindow = false;
  let loadFailed = false;
  let entering = false;
  let enterFailed = false;
  let sessionSeen = false;

  function render(): void {
    const support = detectSupport(arSupported, enabled);
    const states = Object.values(support);
    featureLines(support).forEach((line, i) => {
      const row = rows[i] as HTMLLIElement;
      row.textContent = line;
      row.dataset.support = states[i];
    });
    button.disabled = enter === null || (arSupported === false && !opensWindow);
    device.hidden = opensWindow; // the headset's features: none of them is the window's
    if (opensWindow) status.textContent = LANDING.window;
    // Not before ready(): until then the garden window may still open, and this would say the opposite.
    else if (arSupported === false && enter !== null) status.textContent = LANDING.E_XR_UNSUPPORTED;
    else if (loadFailed) status.textContent = LANDING.loadFailed;
    else if (enterFailed) status.textContent = LANDING.E_HANDS_UNAVAILABLE;
    else status.textContent = enter === null ? LANDING.loading : '';
  }
  function syncToggles(): void {
    const current = settings.get();
    boxes.forEach((box, i) => {
      box.checked = current[TOGGLES[i] as (typeof TOGGLES)[number]];
    });
  }
  function entered(started: boolean): void {
    entering = false;
    // An answer that arrives after a session did run (timers can sleep while one is up) is not a failure.
    enterFailed = !started && !sessionSeen;
    if (enterFailed) log.error('ui', 'E_HANDS_UNAVAILABLE');
    render();
  }
  function answer(supported: boolean): void {
    arSupported = supported;
    if (!supported) log.warn('ui', 'E_XR_UNSUPPORTED');
    render();
  }

  button.addEventListener('click', () => {
    const start = enter;
    if (start === null || entering) return;
    entering = true;
    enterFailed = false;
    sessionSeen = false;
    render();
    // `start` runs here, inside the click. Inside a promise, so that a throw ends like a rejection: logged, and
    // `entering` cleared. Otherwise one bug in the entry path would leave Enter dead until a reload.
    new Promise<boolean>((resolve) => resolve(start())).then(entered, (error: unknown) => {
      log.error('ui', 'Enter failed', error);
      entered(false);
    });
  });
  boxes.forEach((box, i) => {
    box.addEventListener('change', () => settings.set({ [TOGGLES[i] as string]: box.checked }));
  });
  bus.on('settings:changed', syncToggles);
  bus.on('xr:sessionStart', () => {
    sessionSeen = true;
    enterFailed = false; // a session is the proof: an earlier "did not open" is no longer true
    root.hidden = true;
    render();
  });
  bus.on('xr:sessionEnd', () => {
    root.hidden = false;
    button.focus(); // a hidden page holds no focus: without this a keyboard user comes back to nothing
  });
  if (navigator.xr === undefined) answer(false);
  else navigator.xr.isSessionSupported('immersive-ar').then(answer, () => answer(false));
  syncToggles();
  render();

  return {
    ready(enterSession, isWindow = false) {
      enter = enterSession;
      opensWindow = isWindow;
      render();
    },
    granted(enabledFeatures) {
      enabled = enabledFeatures;
      render();
    },
    failed() {
      loadFailed = true;
      render();
    },
  };
}
