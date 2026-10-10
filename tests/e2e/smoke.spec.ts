import { test } from '@playwright/test';

// TODO(T-107): replace with the IWER-driven "page loads and enters emulated XR" scenario (TEST_PLAN §4.5).
test.skip('landing page loads and enters emulated XR (T-107)', async ({ page }) => {
  await page.goto('/');
});
