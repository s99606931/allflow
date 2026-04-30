# @all-flow/contracts

> OpenAPI 3.1 Single Source of Record (SOR) for ALL-Flow.
> BE Zod schemas and FE TS types are generated from `openapi.yaml` here.

## Files

- `openapi.yaml` — **the** contract. Edit only this file.
- `scripts/openapi-to-zod.mjs` — generates Zod v4 schemas (used by BE).
- `scripts/openapi-to-types.mjs` — generates TS types via `openapi-typescript` (used by FE).
- `src/{zod,types}/index.ts` — placeholders. Step 4+ will host emit targets here.

## Usage

```bash
# from monorepo root
pnpm --filter @all-flow/contracts gen          # generate both Zod + TS types
pnpm --filter @all-flow/contracts gen:zod      # Zod only (BE)
pnpm --filter @all-flow/contracts gen:types    # TS types only (FE)
```

Backward-compat passthroughs (Step 3 보수적 codemod):

```bash
pnpm --filter @all-flow/backend openapi:gen    # → contracts gen:zod
pnpm --filter all-flow openapi:gen             # → contracts gen:types
```

## Step 3 design notes

- Emit targets currently live inside the consumer apps (no consumer code change).
- Drift guard (`apps/backend/scripts/openapi-drift.mjs`) reads from `packages/contracts/openapi.yaml`.
- Contract coverage check (`openapi:contract:strict`) reads from the same SOR.

## Future steps

- Step 4: emit `dist/zod/index.js` + `dist/types/index.js` here, switch BE/FE to `import { TaskSchema } from '@all-flow/contracts/zod'`.
- Step 6 (catalog): pin `zod`, `typescript`, `vitest` in pnpm catalog.
