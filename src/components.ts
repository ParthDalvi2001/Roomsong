/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineComponents } from '@iwsdk/core';

import { BedAnchor, Caption, Interactable } from './core/components.js';
// Straight from its file: hands/index.ts also exports HandSystem, and this module stays free of systems.
import { HandState } from './hands/HandState.js';

// Component manifest (iwsdk.config.json `components.module`). A component must be listed here before
// a scene can author it; keep this module free of systems, DOM and renderer imports.
export default defineComponents([BedAnchor, Interactable, Caption, HandState]);
