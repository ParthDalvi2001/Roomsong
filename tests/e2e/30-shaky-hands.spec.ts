// Shaky hands: the app's real gesture, garden and render code under what a real hand does (tracking drops, jitter, drift,
// fingers short of the target by depth, the shift as fingers close), with noise measured on the first real Quest 3S
// sessions and a seed per scene (support/shaky-noise.ts). On 2026-11-07 a first headset session found 10 bugs that
// about 2,000 tests with perfect simulated hands had passed (BUG-021 to BUG-030). Each scene here fails when its bug is
// put back. Scenes 12 and 13 found two more (BUG-032, BUG-033), since fixed (emulator); they now pass as plain tests.
// Emulator results: they say what the app does with hands like these, not how a headset's hands behave.
import { test } from '@playwright/test';

import { playScene } from './support/shaky-play';
import { SHAKY_SCENARIOS } from './support/shaky-table';

const SCENE_LIMIT_MS = 120_000; // software rendering, and hands at a person's speed

for (const scenario of SHAKY_SCENARIOS) {
  test(`${scenario.n}. ${scenario.title} (${scenario.bug})`, async ({ page }, info) => {
    test.setTimeout(SCENE_LIMIT_MS);
    // A bug the scene found, not yet fixed: the scene must fail, and passes as "expected to fail" (see the table).
    test.fail(scenario.newBug !== undefined, scenario.newBug);
    await playScene(page, scenario, info);
  });
}
