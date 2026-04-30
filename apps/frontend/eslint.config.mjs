// ESLint v9 Flat Config — migrated 2026-04-29.
// eslint-config-next v16 ships native flat configs (no FlatCompat needed).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'storybook-static/**',
      'test-results/**',
      'playwright-report/**',
      'coverage/**',
      'src/lib/api-types.gen.ts',
      'next-env.d.ts',
      '**/*.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Migration-scope: keep authoring style permissive while flat config stabilizes.
      // Tighten in a follow-up PR after PDCA-10 ships.
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
