/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { World, XRInputVisualAdapter } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';

// No input models (T-111, Golden Rules 8 and 9). IWSDK 1.0.1 downloads a hand or controller model from
// cdn.jsdelivr.net whenever an input source joins the session, and no project option turns that off.
// `createVisual` is the one place that loads them; "no visual" is what it already returns when a model fails
// to load, and tracking carries on without it. Passthrough shows the real hands. tests/e2e/01-enter-xr.spec.ts
// goes red if a request leaves localhost, with hands or with controllers.
XRInputVisualAdapter.createVisual = () => Promise.resolve(undefined);

// Empty Roomsong scene (T-111). `projectOptions` is iwsdk.config.json: an AR session with hands required and
// `xr.offer: "always"`, so IWSDK offers the immersive session to the browser once the world is ready. There
// is no in-page Enter control yet. Each module registers its systems here as it lands (LLD §1).
void World.create(document.getElementById('scene-container') as HTMLDivElement, projectOptions);
