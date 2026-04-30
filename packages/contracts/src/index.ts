// @all-flow/contracts — Single Source of Record for OpenAPI 3.1 contract.
//
// Step 3 (2026-04-30): generation pipeline lives here, but consumer-emit targets
// remain in apps/{backend,frontend} for backward-compat. Step 4+ will migrate
// emit targets into packages/contracts/src/{zod,types}.

export * from './zod/index.js';
export type * from './types/index.js';
