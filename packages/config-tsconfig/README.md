# @all-flow/config-tsconfig

Shared TypeScript configuration presets for the ALL-Flow monorepo.

## Presets

| File | Use case | Extended by |
|------|----------|-------------|
| `base.json` | Common foundation. Strict, ES2023, isolatedModules. | All other presets + `packages/contracts`, `packages/shared`. |
| `node22.json` | Node 22 LTS — NodeNext module + ES2022 + `types: ["node"]`. | `apps/backend`. |
| `nextjs.json` | Next.js 16 — DOM lib + bundler resolution + jsx preserve. | `apps/frontend`. |

## Usage

```jsonc
// apps/backend/tsconfig.json
{
  "extends": "@all-flow/config-tsconfig/node22.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

```jsonc
// apps/frontend/tsconfig.json
{
  "extends": "@all-flow/config-tsconfig/nextjs.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

```jsonc
// packages/<pkg>/tsconfig.json
{
  "extends": "@all-flow/config-tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

## Why two flavours

- **node22**: `NodeNext` resolution is required for Node-only packages that ship runtime code through `tsup`/`tsx`. ES2022 keeps decorators / private fields aligned with Node 22 LTS without polyfills.
- **nextjs**: Next.js 16 + Turbopack expect bundler resolution and DOM globals. `noUncheckedIndexedAccess` is intentionally relaxed here to match the existing frontend authoring style; tighten in a follow-up cycle.

## Step 5 (2026-04-30) absorption

Root `tsconfig.base.json` (Step 1 forward-compat asset) was a duplicate of this preset's `base.json`. Step 5 collapses it: `tsconfig.base.json` now thin-extends `packages/config-tsconfig/base.json`. New code should `extends` the package directly; the root file stays as a backward-compat shim until Step 6 catalog wave.
