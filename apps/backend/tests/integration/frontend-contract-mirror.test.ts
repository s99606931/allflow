/**
 * BE-R4 — Frontend OpenAPI ↔ backend contract mirror (regression guard).
 *
 * 본 테스트는 frontend `openapi.yaml` 이 PDCA-01 에서 추가한 21개 엔드포인트를
 * 계속 노출하는지 정적으로 검증한다. 백엔드의 실제 구현 여부와 무관하게
 * 컨트랙트가 우발적으로 제거/리네임되는 것을 막는 회귀 가드.
 *
 * Phase 7에서 backend 가 각 엔드포인트를 구현하면
 * `frontend-contract.test.ts` 의 라이브 호출 케이스가 추가되어 본 가드를 졸업한다.
 *
 * Source: apps/frontend/openapi.yaml
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC = resolve(__dirname, '..', '..', '..', 'frontend', 'openapi.yaml');
const yaml = readFileSync(SPEC, 'utf8');

// 단순 토큰 매칭 — `paths:` 블록 안의 `<method>:` 행을 path 별로 수집.
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
function collectOps(text: string): Set<string> {
  const ops = new Set<string>();
  const lines = text.split('\n');
  let inPaths = false;
  let currentPath: string | null = null;
  const HTTP = new Set<Method>(['get', 'post', 'put', 'patch', 'delete']);
  for (const raw of lines) {
    if (/^paths:\s*$/.test(raw)) {
      inPaths = true;
      continue;
    }
    if (!inPaths) continue;
    if (/^[A-Za-z]/.test(raw) && !raw.startsWith('  ')) break;
    const indent = raw.length - raw.replace(/^\s+/, '').length;
    const stripped = raw.trim();
    if (!stripped || stripped.startsWith('#')) continue;
    if (indent === 2 && stripped.startsWith('/') && stripped.endsWith(':')) {
      currentPath = stripped.slice(0, -1);
      continue;
    }
    if (currentPath && indent === 4) {
      const m = stripped.match(/^([a-z]+):\s*$/);
      const method = m?.[1];
      if (method && HTTP.has(method as Method)) {
        ops.add(`${method.toUpperCase()} ${currentPath}`);
      }
    }
  }
  return ops;
}

const ops = collectOps(yaml);

// PDCA-01 에서 추가한 21개 신규 엔드포인트 (extended.ts 기준).
const PDCA_01_ENDPOINTS = [
  'POST /issues',
  'POST /issues/{id}/transition',
  'DELETE /tasks/{id}',
  'GET /approvals',
  'POST /approvals',
  'POST /approvals/{id}/decision',
  'GET /clients',
  'POST /clients',
  'GET /events',
  'POST /events',
  'GET /resources',
  'POST /resources/book',
  'GET /docs',
  'POST /docs',
  'GET /channels',
  'POST /channels/{channelId}/messages',
  'GET /org/units',
  'POST /org/invitations',
  'POST /auth/tokens/revoke',
  'POST /notifications/{id}/read',
  'POST /notifications/read-all',
  'PATCH /users/me',
];

// TEST-B3 — comments / notifications/read-all body / ai/* / reports/* 추가 가드.
// 백엔드 BE-C4/BE-C5 에서 신설된 라우트의 OpenAPI 노출이 우발적으로 회귀하지
// 않도록 별도로 검증한다.
const TEST_B3_ENDPOINTS = [
  'GET /tasks/{id}/comments',
  'POST /tasks/{id}/comments',
  'GET /issues/{id}/comments',
  'POST /issues/{id}/comments',
  'POST /notifications/read-all',
  'POST /ai/complete',
  'POST /ai/extract-actions',
  'POST /reports/weekly',
  'POST /reports/monthly',
  'POST /reports/{id}/send',
];

describe('BE-R4 contract mirror — frontend openapi.yaml exposes all PDCA-01 endpoints', () => {
  for (const ep of PDCA_01_ENDPOINTS) {
    it(`exposes ${ep}`, () => {
      expect(ops, `missing ${ep} in frontend openapi.yaml`).toContain(ep);
    });
  }

  it('contract size sanity (≥ 22 PDCA-01 + ≥ 10 base = ≥ 32 ops)', () => {
    expect(ops.size).toBeGreaterThanOrEqual(32);
  });
});

describe('TEST-B3 contract mirror — comments / notifications / ai / reports', () => {
  for (const ep of TEST_B3_ENDPOINTS) {
    it(`exposes ${ep}`, () => {
      expect(ops, `missing ${ep} in frontend openapi.yaml`).toContain(ep);
    });
  }
});

// CL-2 — `/realtime/ws` 는 WebSocket 프로토콜이라 OpenAPI 3.x 표준 표기 대상 아님.
// 의도적으로 paths 에서 제외하고 NOTE 주석으로만 등재한다는 결정의 회귀 가드.
describe('CL-2 — /realtime/ws WebSocket 의도적 OpenAPI 제외', () => {
  it('does not declare /realtime/ws as an HTTP method (intentional exclusion)', () => {
    for (const op of ops) {
      expect(op).not.toContain('/realtime/ws');
    }
  });

  it('keeps /realtime/sse (HTTP-compatible) declared', () => {
    expect(ops).toContain('GET /realtime/sse');
  });
});
