// ESLint flat config — CODING_GUIDELINES §2. Type-checked rules for TypeScript, import ordering, and the
// audio-module ban on setTimeout. `npm run lint` runs with --max-warnings 0, so warnings are failures.
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import { config as tsConfig, configs as tsConfigs } from 'typescript-eslint';

export default tsConfig(
  {
    ignores: [
      'node_modules/**',
      '**/dist/**', // any depth: proto/sound/dist is build output too
      'out/**',
      '.iwsdk/**',
      '.vite/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'tests/e2e/__artifacts__/**',
      'public/**',
      'specs/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tsConfigs.recommendedTypeChecked,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    // The TypeScript resolver understands package `exports` maps (the node resolver does not).
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true, project: './tsconfig.json' }, node: true },
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser },
    },
    rules: {
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      // `virtual:iwsdk-project` is provided by @iwsdk/vite-plugin-dev at build time.
      'import/no-unresolved': ['error', { ignore: ['^virtual:'] }],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    // Audio timing goes through the look-ahead Scheduler, never the event loop (CODING_GUIDELINES §2, LLD audio/).
    files: ['src/audio/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='setTimeout']",
          message: 'setTimeout is banned in audio/: use the Scheduler (audio/Scheduler.ts).',
        },
        {
          selector: "CallExpression[callee.property.name='setTimeout']",
          message: 'setTimeout is banned in audio/: use the Scheduler (audio/Scheduler.ts).',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts', '*.config.ts', 'scripts/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tsConfigs.disableTypeChecked,
    languageOptions: { globals: { ...globals.node } },
  },
  eslintConfigPrettier,
);
