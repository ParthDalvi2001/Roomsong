/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * file LICENSES/IWSDK-MIT.txt in the root directory of this source tree.
 */

import { defineAssets } from '@iwsdk/core';

// Empty asset manifest (iwsdk.config.json `assets.module`). Golden Rules 8 and 9: entries are original
// procedural objects or files under `public/`, addressed through `import.meta.env.BASE_URL`; never another host.
export default defineAssets({});
