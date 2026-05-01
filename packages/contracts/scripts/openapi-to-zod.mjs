#!/usr/bin/env node
/**
 * openapi-to-zod.mjs — packages/contracts/openapi.yaml → BE zod schemas.
 *
 * 입력:  packages/contracts/openapi.yaml (SOR)
 * 출력:  apps/backend/src/shared/schemas/api.generated.ts (Step 3 보수적 codemod —
 *        consumer-side emit target은 BE 위치 유지. Step 4+에서 migrating to
 *        packages/contracts/src/zod/ 예정.)
 *
 * 변환 정책:
 *  - components.schemas.* 만 변환 (paths / endpoints는 별도 단계)
 *  - $ref → 변수명 그대로 참조 (정의 순서는 위상 정렬로 보장)
 *  - oneOf + discriminator → z.discriminatedUnion
 *  - enum / required / nullable / format(email,date,date-time) 지원
 *  - 알 수 없는 타입은 z.unknown() 으로 대체 + 콘솔 경고
 *
 * Step 3 변경 (2026-04-30):
 *  - SRC: ../all-flow-frontend/openapi.yaml → packages/contracts/openapi.yaml (이 패키지)
 *  - OUT: apps/backend/src/shared/schemas/api.generated.ts (절대 경로 기반)
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_ROOT = resolve(__dirname, '..');                          // packages/contracts
const REPO_ROOT = resolve(CONTRACTS_ROOT, '..', '..');                    // /data/allflow
const SRC = resolve(CONTRACTS_ROOT, 'openapi.yaml');
const OUT = resolve(REPO_ROOT, 'apps', 'backend', 'src', 'shared', 'schemas', 'api.generated.ts');

const raw = readFileSync(SRC, 'utf8');
const doc = YAML.parse(raw);
const schemas = doc?.components?.schemas ?? {};

function refName(ref) {
  return ref.replace('#/components/schemas/', '');
}

function fmtString(format) {
  if (format === 'email') return 'z.string().email()';
  if (format === 'date') return 'z.string()';
  if (format === 'date-time') return 'z.string()';
  return 'z.string()';
}

/**
 * Convert one OpenAPI schema node to a zod expression string.
 * @param {object} node
 * @returns {string}
 */
function toZod(node) {
  if (!node) return 'z.unknown()';
  if (node.$ref) return refName(node.$ref);

  // OpenAPI 3.1: type: [X, 'null'] → X.nullable()
  if (Array.isArray(node.type)) {
    const nonNull = node.type.filter((t) => t !== 'null');
    const isNullable = node.type.includes('null');
    const inner = nonNull.length === 1
      ? toZod({ ...node, type: nonNull[0] })
      : 'z.unknown()';
    return isNullable ? `${inner}.nullable()` : inner;
  }

  if (Array.isArray(node.oneOf)) {
    const variants = node.oneOf.map(toZod);
    if (node.discriminator?.propertyName) {
      return `z.discriminatedUnion('${node.discriminator.propertyName}', [${variants.join(', ')}])`;
    }
    return `z.union([${variants.join(', ')}])`;
  }

  switch (node.type) {
    case 'string': {
      if (Array.isArray(node.enum)) {
        return `z.enum([${node.enum.map((v) => JSON.stringify(v)).join(', ')}])`;
      }
      return fmtString(node.format);
    }
    case 'integer':
      return 'z.number().int()' + (typeof node.minimum === 'number' ? `.min(${node.minimum})` : '') + (typeof node.maximum === 'number' ? `.max(${node.maximum})` : '');
    case 'number':
      return 'z.number()' + (typeof node.minimum === 'number' ? `.min(${node.minimum})` : '') + (typeof node.maximum === 'number' ? `.max(${node.maximum})` : '');
    case 'boolean':
      return 'z.boolean()';
    case 'array':
      return `z.array(${toZod(node.items ?? {})})`;
    case 'object': {
      const required = new Set(node.required ?? []);
      const props = node.properties ?? {};
      const lines = Object.entries(props).map(([key, val]) => {
        const inner = toZod(val);
        const field = required.has(key) ? inner : `${inner}.optional()`;
        return `  ${JSON.stringify(key)}: ${field}`;
      });
      const body = lines.length ? `{\n${lines.join(',\n')}\n}` : '{}';
      return `z.object(${body})`;
    }
    default:
      if (node.properties || node.required) {
        return toZod({ ...node, type: 'object' });
      }
      console.warn(`[openapi-to-zod] unknown node, falling back to z.unknown(): ${JSON.stringify(node).slice(0, 80)}`);
      return 'z.unknown()';
  }
}

// Topological sort by $ref dependencies so referenced names come first.
function refsOf(node, acc = new Set()) {
  if (!node || typeof node !== 'object') return acc;
  if (node.$ref) acc.add(refName(node.$ref));
  for (const v of Object.values(node)) {
    if (Array.isArray(v)) v.forEach((x) => refsOf(x, acc));
    else if (typeof v === 'object') refsOf(v, acc);
  }
  return acc;
}

const names = Object.keys(schemas);
const deps = new Map(names.map((n) => [n, refsOf(schemas[n])]));
const sorted = [];
const visited = new Set();
const visiting = new Set();
function visit(n) {
  if (visited.has(n)) return;
  if (visiting.has(n)) return; // Cycle — skip; zod late-binding via z.lazy() not needed for current schema
  visiting.add(n);
  for (const d of deps.get(n) ?? []) if (names.includes(d)) visit(d);
  visiting.delete(n);
  visited.add(n);
  sorted.push(n);
}
for (const n of names) visit(n);

const banner = `// AUTO-GENERATED by packages/contracts/scripts/openapi-to-zod.mjs — DO NOT EDIT.
// Source: packages/contracts/openapi.yaml (SOR)
// Run \`pnpm --filter @all-flow/contracts gen:zod\` (or \`pnpm --filter @all-flow/backend openapi:gen\`) to regenerate.
// \`pnpm --filter @all-flow/backend openapi:check\` validates drift.
`;

const lines = [banner, "import { z } from 'zod';", ''];
for (const name of sorted) {
  lines.push(`export const ${name} = ${toZod(schemas[name])};`);
  lines.push(`export type ${name} = z.infer<typeof ${name}>;`);
  lines.push('');
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join('\n'));

const HASH_OUT = resolve(dirname(OUT), '.openapi.hash');
const hash = createHash('sha256').update(raw).digest('hex');
writeFileSync(HASH_OUT, hash + '\n');

console.log(`[ok] generated ${sorted.length} schemas → ${OUT}`);
console.log(`[ok] hash written → ${HASH_OUT} (${hash.slice(0, 12)}…)`);
