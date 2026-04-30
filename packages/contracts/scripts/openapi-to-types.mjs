#!/usr/bin/env node
/**
 * openapi-to-types.mjs — packages/contracts/openapi.yaml → FE TS types.
 *
 * 입력:  packages/contracts/openapi.yaml (SOR)
 * 출력:  apps/frontend/src/lib/api-types.gen.ts
 *
 * Step 3 보수적 codemod (2026-04-30): consumer-side emit target은 FE 위치 유지.
 * Step 4+에서 packages/contracts/src/types/로 migration 예정.
 */
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(CONTRACTS_ROOT, '..', '..');
const SRC = resolve(CONTRACTS_ROOT, 'openapi.yaml');
const OUT = resolve(REPO_ROOT, 'apps', 'frontend', 'src', 'lib', 'api-types.gen.ts');

execSync(`npx -y openapi-typescript@latest "${SRC}" -o "${OUT}"`, { stdio: 'inherit' });
console.log(`[ok] generated FE types → ${OUT}`);
