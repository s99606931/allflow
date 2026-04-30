// @all-flow/config-eslint/node — Node.js (Fastify backend) preset.
// Backend lint is currently delegated to Biome; this preset exists as a forward-compat asset
// for scripts/, contracts/, shared/ packages that need ESLint without React.

import base from './base.mjs';

/** @type {import('eslint').Linter.Config[]} */
const node = [
  ...base,
  {
    name: 'all-flow/node/env',
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        // Common Node globals; consumers may extend with `globals` package.
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-process-exit': 'warn',
    },
  },
];

export default node;
