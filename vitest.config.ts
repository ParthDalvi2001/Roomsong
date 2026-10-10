// Unit tests only (TEST_PLAN; CODING_GUIDELINES §9). Pure modules run in the node environment; the IWSDK Vite
// plugin is deliberately not loaded here (vitest.config.ts takes precedence over vite.config.ts).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
});
