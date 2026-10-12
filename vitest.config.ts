// Unit tests only (TEST_PLAN; CODING_GUIDELINES §9). Pure modules run in the node environment; the IWSDK Vite
// plugin is deliberately not loaded here (vitest.config.ts takes precedence over vite.config.ts).
import { defineConfig } from 'vitest/config';

// The coverage gate (NFR-MAINT-01, T-117): `npm run test:coverage` fails when one of the four folders below is
// under 80 %. Branches get the same 80: they measured 94 to 98 % per folder on 2026-10-11, so nothing argues for
// less, and more would be a second requirement.
// CI runs it as its own step and `npm run verify` stays without coverage: under V8 coverage the million-round
// allocation tests run 5 to 16 times slower (core/events: 1.4 s, with coverage 4.9 to 14.3 s on a loaded
// machine), so verify keeps measuring the code as it ships.
const GATE = { lines: 80, functions: 80, statements: 80, branches: 80 };

export default defineConfig({
  test: {
    environment: 'node',
    // 30 s, not Vitest's 5 s: with several agents testing at once on one machine, sound tests timed out from load
    // alone (2026-10-11 and 12). A test that really hangs now takes 30 s to say so.
    testTimeout: 30_000,
    // Four workers, not one per core: with agents testing side by side, eight node workers each pushed this
    // 16 GB machine into swap until the editor was killed (2026-10-12).
    maxWorkers: 4,
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      // Every source file, also one that no test imports: it counts as 0 %, so untested code cannot stay unseen.
      include: ['src/**/*.ts'],
      // Files by name only, each with its reason; never a pattern and never a whole folder of the four. Type-only
      // files, index.ts re-exports and events.ts declarations need no entry: they hold no statement, so V8 counts
      // 0 of 0 for them, and a pattern would only hide logic that lands in one later (src/core/events.ts is the
      // event bus).
      exclude: [
        // The IndexedDB adapter: it needs a real browser database, which node does not have. Run in Chromium by
        // tests/e2e/10-persistence.spec.ts.
        'src/persistence/idb.ts',
      ],
      reporter: ['text'],
      thresholds: {
        // A glob that matches no file passes, so a renamed folder needs its key renamed here.
        'src/garden/**': GATE,
        'src/audio/**': GATE,
        'src/persistence/**': GATE,
        'src/room/**': GATE,
      },
    },
  },
});
