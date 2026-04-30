// ESLint v9 Flat Config — extracted to @all-flow/config-eslint/react in Step 5 (2026-04-30).
// This file now layers app-specific ignores on top of the shared preset.
import react from '@all-flow/config-eslint/react';

export default [
  {
    ignores: [
      // App-specific (base preset already ignores .next/node_modules/dist/coverage/etc).
      'src/lib/api-types.gen.ts',
      'next-env.d.ts',
    ],
  },
  ...react,
];
