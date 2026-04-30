# @all-flow/config-eslint

Shared ESLint v9 flat-config presets for the ALL-Flow monorepo.

## Presets

| Export | File | Use case |
|--------|------|----------|
| `@all-flow/config-eslint/base` | `base.mjs` | Common ignores + neutral rule set. No framework or env. |
| `@all-flow/config-eslint/node` | `node.mjs` | Node 22 globals + `no-process-exit`. Forward-compat for scripts/contracts/shared. |
| `@all-flow/config-eslint/react` | `react.mjs` | Next.js 16 core-web-vitals + typescript + react-hooks v7. **Used by `apps/frontend`.** |

## Usage

```js
// apps/frontend/eslint.config.mjs
import react from '@all-flow/config-eslint/react';

export default [
  {
    ignores: [
      // app-specific ignores layered on top of base
      'src/lib/api-types.gen.ts',
      'next-env.d.ts',
    ],
  },
  ...react,
];
```

```js
// packages/<pkg>/eslint.config.mjs (when ESLint adoption is wanted)
import node from '@all-flow/config-eslint/node';

export default node;
```

## Why three presets

- **base**: ignore list + zero-framework rules. All other presets compose on top.
- **node**: Node globals + Node-specific rules (e.g. `no-process-exit`). Backend currently uses Biome; this exists for non-Biome packages.
- **react**: pulls in `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. These are Next.js's native flat configs (no `FlatCompat` needed since v16).

## Migration scope policy

The `react` preset preserves the migration-scope rule overrides established on 2026-04-29 (PDCA-10 frontend ESLint v9 migration):

- `@typescript-eslint/no-unused-vars` → `warn` with `_`-prefix opt-out
- `@typescript-eslint/no-explicit-any` → `warn`
- `react-hooks/{use-memo, refs, set-state-in-effect, immutability}` → `warn`

Tighten in a follow-up cycle once flat config stabilizes across the codebase.

## Step 5 (2026-04-30) extraction

Before Step 5, `apps/frontend/eslint.config.mjs` inlined the entire flat config (38 LOC). After Step 5 it imports `@all-flow/config-eslint/react` and adds only app-specific ignores. The two stay byte-equivalent in behaviour; lint output is identical.
