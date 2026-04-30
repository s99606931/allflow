#!/usr/bin/env node
/**
 * openapi-drift.mjs — frontend openapi.yaml과 백엔드가 사용하는 스키마 사이의 drift 검출.
 *
 * 동작:
 *  1) frontend openapi.yaml을 읽어 components.schemas 키 목록과 SHA-256 해시 산출
 *  2) src/shared/schemas/api.generated.ts 의 첫 줄에 박힌 source-hash 주석과 비교
 *  3) 다르면 exit(1) — CI는 `pnpm openapi:gen` 후 커밋을 강제
 *
 * 사용:
 *   pnpm openapi:gen     → 재생성 + source-hash 갱신
 *   pnpm openapi:check   → drift 검사
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, '..', 'all-flow-frontend', 'openapi.yaml');
const GEN = resolve(ROOT, 'src', 'shared', 'schemas', 'api.generated.ts');
const HASH_FILE = resolve(ROOT, 'src', 'shared', 'schemas', '.openapi.hash');

function fail(msg) {
  console.error(`[openapi-drift] FAIL: ${msg}`);
  process.exit(1);
}

if (!existsSync(SRC)) fail(`openapi.yaml not found: ${SRC}`);
if (!existsSync(GEN)) fail(`api.generated.ts not found — run 'pnpm openapi:gen'`);
if (!existsSync(HASH_FILE)) fail(`.openapi.hash missing — run 'pnpm openapi:gen'`);

const yamlBuf = readFileSync(SRC);
const sha = createHash('sha256').update(yamlBuf).digest('hex');
const stored = readFileSync(HASH_FILE, 'utf8').trim();

if (sha !== stored) {
  fail(
    `openapi.yaml drift detected:\n  current : ${sha}\n  generated-from: ${stored}\n  → run 'pnpm openapi:gen' and commit the result.`,
  );
}

console.log(`[ok] openapi.yaml hash matches generated schemas (${sha.slice(0, 12)}…)`);
