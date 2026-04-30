// @all-flow/config-eslint/react — Next.js + React + TypeScript preset (ESLint v9 flat).
// Imports eslint-config-next native flat configs (no FlatCompat needed).
// Mirrors apps/frontend/eslint.config.mjs migration done 2026-04-29.

import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import base from './base.mjs';

/** @type {import('eslint').Linter.Config[]} */
const react = [
  ...base,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    name: 'all-flow/react/migration-scope',
    rules: {
      // Migration-scope rule set — kept permissive while flat config stabilizes.
      // Source of truth: apps/frontend/eslint.config.mjs (2026-04-29 migration).
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-img-element': 'warn',
      // react-hooks v7 newly elevated rules — migrate gradually.
      'react-hooks/use-memo': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
];

export default react;
