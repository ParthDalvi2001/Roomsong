/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineComponents } from '@iwsdk/core';

// Empty component manifest (iwsdk.config.json `components.module`). A component must be listed here before
// a scene can author it; keep this module free of systems, DOM and renderer imports.
export default defineComponents([]);
