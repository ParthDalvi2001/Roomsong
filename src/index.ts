/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * file LICENSES/IWSDK-MIT.txt in the root directory of this source tree.
 */

// The boot (LLD §3.3 A): the landing page first, then the app chunk. This file and what it imports without
// `import()` load neither @iwsdk/core nor three (API_SPEC §1.10 rule 1; tests/unit/index.test.ts follows the
// imports), so the page is readable before the SDK has arrived. `mountLanding` comes from ui/Landing.js, not
// ui/index.js: the index also exports CaptionSystem.
import { log } from './core/index.js';
import { mountLanding } from './ui/Landing.js';

const landing = mountLanding(document.getElementById('landing') as HTMLElement);

// One catch for both ends: the chunk that does not arrive (network, a script error) and any throw in the
// wiring's start-up steps. Without it the page would say "Getting the garden ready." for good.
import('./app.js')
  .then((app) => app.start(landing))
  .catch((error: unknown) => {
    log.error('app', 'the world could not load', error);
    landing.failed();
  });
