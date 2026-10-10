import { defineConfig } from 'vitest/config';

// Relative base so dist/ works from any static folder or a file share (no hosting chosen yet, T-108).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
