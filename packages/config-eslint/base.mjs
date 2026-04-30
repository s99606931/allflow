// @all-flow/config-eslint/base — ESLint v9 flat config foundation.
// Import-only file; no side effects. Apps merge this with framework-specific presets.

/** @type {import('eslint').Linter.Config[]} */
const base = [
  {
    name: 'all-flow/base/ignores',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/storybook-static/**',
      '**/*.d.ts',
      '**/*.gen.ts',
      '**/*.generated.ts',
    ],
  },
  {
    name: 'all-flow/base/rules',
    rules: {
      // Migration-scope: keep authoring style permissive while flat config stabilizes.
      // Tighten in a follow-up cycle (Step 6 catalog wave or later).
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': 'off', // delegated to @typescript-eslint/no-unused-vars in tsx presets
    },
  },
];

export default base;
