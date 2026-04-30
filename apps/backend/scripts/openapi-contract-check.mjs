#!/usr/bin/env node
/**
 * openapi-contract-check.mjs — @all-flow/contracts(packages/contracts/openapi.yaml) ↔
 * backend 라우트 커버리지 검증 (T-601).
 *
 * 동작:
 *   1) packages/contracts/openapi.yaml(SOR) 의 paths × method 모음을 추출.
 *   2) 백엔드 src/modules/**\/*.routes.ts 정적 스캔 → app.get/post/patch/delete 경로 추출.
 *   3) 컨트랙트에 있으나 백엔드에 없는 라우트(미구현) / 백엔드에만 있는 라우트(외부 비공개)
 *      를 분리해 출력.
 *   4) `--strict` 옵션 시 미구현이 1개라도 있으면 exit(1).
 *
 * 사용:
 *   node scripts/openapi-contract-check.mjs           # 리포트만
 *   node scripts/openapi-contract-check.mjs --strict  # 미구현 시 실패
 *
 * Step 3 (2026-04-30): SPEC 경로가 frontend → packages/contracts로 이동.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SPEC = resolve(ROOT, '..', '..', 'packages', 'contracts', 'openapi.yaml');
const MODULES = resolve(ROOT, 'src', 'modules');

const STRICT = process.argv.includes('--strict');

function fail(msg) {
  console.error(`[contract-check] ${msg}`);
  process.exit(1);
}

if (!existsSync(SPEC)) fail(`openapi.yaml not found: ${SPEC}`);
if (!existsSync(MODULES)) fail(`modules dir not found: ${MODULES}`);

// ---------- 1) packages/contracts/openapi.yaml 의 paths × method 추출 ----------
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

function extractContract(text) {
  const lines = text.split('\n');
  const out = new Set();
  let inPaths = false;
  let currentPath = null;
  for (const raw of lines) {
    if (/^paths:\s*$/.test(raw)) {
      inPaths = true;
      continue;
    }
    if (!inPaths) continue;
    // 다음 top-level 키(들여쓰기 0) 만나면 paths 종료
    if (/^[A-Za-z]/.test(raw)) break;
    const indent = raw.length - raw.replace(/^\s+/, '').length;
    const stripped = raw.trim();
    if (stripped.length === 0 || stripped.startsWith('#')) continue;
    if (indent === 2 && stripped.startsWith('/') && stripped.endsWith(':')) {
      currentPath = stripped.slice(0, -1);
      continue;
    }
    if (currentPath && indent === 4) {
      const m = stripped.match(/^([a-z]+):\s*$/);
      if (m && HTTP_METHODS.has(m[1])) {
        out.add(`${m[1].toUpperCase()} ${currentPath}`);
      }
    }
  }
  return out;
}

const yaml = readFileSync(SPEC, 'utf8');
const contract = extractContract(yaml);

// ---------- 2) 백엔드 라우트 정적 스캔 ----------
function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = resolve(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.routes.ts')) out.push(p);
  }
  return out;
}

// Step 3 (2026-04-30): allow generic type args, e.g. app.post<{ Params: ... }>('/path', ...).
const ROUTE_RE = /app\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*['"]([^'"]+)['"]/g;

const backend = new Set();
for (const file of walk(MODULES)) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(ROUTE_RE)) {
    const method = m[1].toUpperCase();
    const path = m[2];
    backend.add(`${method} ${path}`);
  }
}

// ---------- 3) 비교 ----------
function normalize(routeKey) {
  const [method, path] = routeKey.split(' ');
  return `${method} ${path.replace(/\{([^}]+)\}/g, ':$1').replace(/\/$/, '')}`;
}

const contractSet = new Set([...contract].map(normalize));
const backendSet = new Set([...backend].map(normalize));

const missing = [...contractSet].filter((k) => !backendSet.has(k)).sort();
const extra = [...backendSet].filter((k) => !contractSet.has(k)).sort();

console.log('[contract-check] 결과');
console.log(`  contract routes: ${contractSet.size}`);
console.log(`  backend  routes: ${backendSet.size}`);

if (missing.length > 0) {
  console.log('\n  미구현 (contract에 있고 backend에 없음):');
  for (const m of missing) console.log(`    - ${m}`);
}
if (extra.length > 0) {
  console.log('\n  비공개/추가 (backend에 있고 contract에 없음):');
  for (const e of extra) console.log(`    + ${e}`);
}

const coverage =
  contractSet.size === 0 ? 1 : (contractSet.size - missing.length) / contractSet.size;
console.log(`\n  coverage: ${(coverage * 100).toFixed(1)}%`);

if (STRICT && missing.length > 0) {
  process.exit(1);
}
process.exit(0);
