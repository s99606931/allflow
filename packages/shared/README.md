# @all-flow/shared

ALL-Flow isomorphic shared utilities used by both `@all-flow/backend` (Node) and `@all-flow/frontend` (Browser/Next).

## Policy

**Allowed**:

- ECMAScript built-ins (`Date`, `Math`, `JSON`, `URL`, `Promise`, `URLSearchParams`, `globalThis`)
- `zod` (peer dependency)

**Forbidden**:

- Node-only: `node:fs`, `node:path`, `node:os`, `Buffer`, `process.cwd`
- Browser-only: `window`, `document`, `navigator`, `localStorage`, `sessionStorage`
- Stack-coupled: `@prisma/client`, `prisma`, `fastify`, `next`, `react`

`process.env` is **not read directly**. Callers pass an env source object to `getEnvVar`.

## Sub-paths

| Import | Provides |
|--------|----------|
| `@all-flow/shared/errors` | `AppError`, 6 typed subclasses, `ErrorResponse`, `isAppError`, `toErrorResponse` |
| `@all-flow/shared/pagination` | `CursorPage<T>`, `OffsetPage<T>`, `clampLimit` |
| `@all-flow/shared/env` | `getEnvVar`, `loadEnvFrom`, `EnvValidationError` |
| `@all-flow/shared/redact` | `redactSecrets`, `DEFAULT_REDACT_KEYS` |
| `@all-flow/shared/zod` | `parseOrThrow`, `safeParseOr` |
| `@all-flow/shared/date` | `toIsoString`, `isIsoString`, `parseIso` |

`tree-shake` friendly: `sideEffects: false` + per-folder sub-barrels.

## Build

```bash
pnpm --filter @all-flow/shared build      # tsup esm + dts
pnpm --filter @all-flow/shared typecheck
pnpm --filter @all-flow/shared test
```
