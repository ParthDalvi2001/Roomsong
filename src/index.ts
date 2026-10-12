/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { World, XRInputVisualAdapter } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';

import { bus, log } from './core/index.js';
import { HandSystem } from './hands/index.js';
import { CaptionSystem, mountLanding } from './ui/index.js';

// No input models (T-111, Golden Rules 8 and 9). IWSDK 1.0.1 downloads a hand or controller model from
// cdn.jsdelivr.net whenever an input source joins the session, and no project option turns that off.
// `createVisual` is the one place that loads them; "no visual" is what it already returns when a model fails
// to load, and tracking carries on without it. Passthrough shows the real hands. tests/e2e/01-enter-xr.spec.ts
// goes red if a request leaves localhost, with hands or with controllers.
XRInputVisualAdapter.createVisual = () => Promise.resolve(undefined);

/** How often the Enter request is looked at while it is pending. No requirement fixes it: a frame or two. */
const ENTER_POLL_MS = 50;

/**
 * Starts the session from the landing page's Enter click (FR-SYS-01): `launchXR` requests it at once, inside the
 * user's gesture. Resolves true when a session started.
 * IWSDK 1.0.1 has no supported way to learn of a refusal: `launchXR` returns nothing and logs the rejection itself.
 * So the outcome is read from `World.sessionRequestPending`, which IWSDK's types mark `@internal`. package.json
 * pins the SDK exactly and the field is typed, so an upgrade that removes it fails the typecheck, not the user.
 */
function enterSession(world: World): Promise<boolean> {
  world.launchXR();
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (world.sessionRequestPending) return;
      clearInterval(timer);
      resolve(world.session !== undefined);
    }, ENTER_POLL_MS);
  });
}

// The landing page (T-126) is on screen before the world exists; its Enter button works once the world is ready.
const landing = mountLanding(document.getElementById('landing') as HTMLElement);

// `projectOptions` is iwsdk.config.json: an AR session with hands required and `xr.offer: "always"`, so IWSDK
// also offers the session to the browser once the world is ready (the browser's own Enter control, and the
// emulator's). Each module registers its systems here as it lands (LLD §1).
void World.create(document.getElementById('scene-container') as HTMLDivElement, projectOptions).then(
  (world) => {
    // Priorities as in LLD §3. HandSystem attaches its sampler on `xr:sessionStart` and detaches it on
    // `xr:sessionEnd` itself, so it is registered before either can be emitted.
    world.registerSystem(HandSystem, { priority: 20 }).registerSystem(CaptionSystem, { priority: 60 });
    // Either way in ends here. `xr:visibility` (API_SPEC §2) has no consumer yet: T-128 adds it.
    // A handler of `xr:sessionStart` takes the session from `xr.getSession()`: IWSDK sets `world.session` later.
    const xr = world.renderer.xr;
    // Three.js listens for the session's end before it announces its start, so a session that ends in between
    // gives an end with no start. An `xr:sessionEnd` is emitted only for a session whose start was emitted.
    let started = false;
    xr.addEventListener('sessionstart', () => {
      started = true;
      landing.granted(xr.getSession()?.enabledFeatures);
      bus.emit('xr:sessionStart', { visible: true });
    });
    xr.addEventListener('sessionend', () => {
      if (!started) return;
      started = false;
      bus.emit('xr:sessionEnd', { visible: false });
    });
    landing.ready(() => enterSession(world));
  },
  (error: unknown) => {
    // No WebGL, or the scene file did not arrive: without this the page would say "getting ready" for good.
    log.error('app', 'the world could not load', error);
    landing.failed();
  },
);
