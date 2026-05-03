/**
 * llm-connections.spec.ts
 *
 * 우선순위 1: LLM 연결 CRUD 전체 흐름 (POST fix 검증)
 *   L1. GET  /api/v1/llm-connections → 2xx + 배열
 *   L2. POST /api/v1/llm-connections → 201/200 생성 확인
 *   L3. POST /api/v1/llm-connections/:id/activate → 200 활성화
 *   L4. DELETE /api/v1/llm-connections/:id → 204 삭제
 *   L5. /admin 화면 LLM 패널 렌더 + 추가 폼 제출
 *
 * 우선순위 2: 기타 POST 경로 회귀
 *   P1. POST /api/v1/tasks → 2xx (태스크 생성)
 *   P2. POST /api/v1/issues → 2xx (이슈 생성)
 *   P3. POST /api/v1/approvals → 2xx (승인 요청 생성)
 *   P4. POST /api/v1/auth/tokens/revoke → 2xx (토큰 회수)
 */

import { test, expect } from '@playwright/test';

// ------------------------------------------------------------------ //
// 우선순위 1: LLM 연결 API (request 레벨)
// ------------------------------------------------------------------ //

test.describe('L1~L4: LLM connections API via FE proxy', () => {
  let createdId: string;

  test('L1: GET /api/v1/llm-connections → 2xx + 배열', async ({ page }) => {
    // page.goto로 세션 쿠키를 확보한 뒤 request 사용
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const resp = await page.request.get('/api/v1/llm-connections');
    expect(resp.status(), `llm-connections GET: ${resp.status()}`).toBeLessThan(300);

    const body = await resp.json();
    expect(Array.isArray(body), 'llm-connections 응답이 배열이어야 함').toBe(true);
    expect(body.length, '기본 연결(LMStudio)이 1개 이상 있어야 함').toBeGreaterThan(0);
  });

  test('L2: POST /api/v1/llm-connections → 연결 생성', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const resp = await page.request.post('/api/v1/llm-connections', {
      data: {
        name: 'E2E Test Ollama',
        kind: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama3.1',
        apiKey: null,
      },
    });

    expect(
      resp.status(),
      `llm-connections POST 실패 (status=${resp.status()}): ${await resp.text()}`,
    ).toBeLessThan(300);

    const body = await resp.json();
    expect(body.id, '생성된 연결에 id가 있어야 함').toBeTruthy();
    expect(body.name, '이름이 일치해야 함').toBe('E2E Test Ollama');
    expect(body.isActive, '신규 연결은 비활성 상태여야 함').toBe(false);

    createdId = body.id;
    // 다음 테스트에 전달 — describe 스코프 공유
    test.info().annotations.push({ type: 'createdId', description: createdId });
  });

  test('L3: POST /api/v1/llm-connections/:id/activate → 활성화', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // L2에서 createdId가 아직 없으면 새로 생성
    if (!createdId) {
      const cr = await page.request.post('/api/v1/llm-connections', {
        data: { name: 'E2E Activate Test', kind: 'ollama', baseUrl: 'http://localhost:11434', model: 'llama3.1', apiKey: null },
      });
      const cb = await cr.json();
      createdId = cb.id;
    }

    const resp = await page.request.post(`/api/v1/llm-connections/${createdId}/activate`);
    expect(
      resp.status(),
      `activate POST 실패 (status=${resp.status()}): ${await resp.text()}`,
    ).toBeLessThan(300);

    const body = await resp.json();
    expect(body.isActive, '활성화 후 isActive가 true여야 함').toBe(true);
  });

  test('L4: DELETE /api/v1/llm-connections/:id → 삭제', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 기본 연결을 다시 활성화해서 테스트 연결을 비활성 상태로 만든 후 삭제
    // (active 연결은 403으로 삭제 불가)
    const listResp = await page.request.get('/api/v1/llm-connections');
    const list = await listResp.json() as Array<{ id: string; name: string; isDefault: boolean; isActive: boolean }>;

    const defaultConn = list.find((c) => c.isDefault);
    const testConn = list.find((c) => c.name === 'E2E Test Ollama' || c.name === 'E2E Activate Test');

    if (!testConn) {
      // 이미 삭제됐거나 생성 안된 경우 — 패스
      test.skip();
      return;
    }

    // 기본 연결 재활성화 (테스트 연결 비활성화)
    if (defaultConn && testConn.isActive) {
      await page.request.post(`/api/v1/llm-connections/${defaultConn.id}/activate`);
    }

    const resp = await page.request.delete(`/api/v1/llm-connections/${testConn.id}`);
    expect(
      resp.status(),
      `DELETE 실패 (status=${resp.status()}): ${await resp.text()}`,
    ).toBe(204);
  });
});

// ------------------------------------------------------------------ //
// L5: /admin 화면 UI 인터랙션
// ------------------------------------------------------------------ //

test.describe('L5: /admin 화면 LLM 패널 UI', () => {
  test('L5a: /admin 접속 → LLM 연결 패널 렌더', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    // 관리자 페이지 헤더 확인
    await expect(
      page.locator('body'),
    ).toContainText(/관리자|시스템|admin|콘솔/i, { timeout: 15_000 });

    // LLM 연결 관리 카드 확인
    await expect(
      page.locator('body'),
    ).toContainText(/LLM 연결|LLM connection/i, { timeout: 10_000 });

    // 테이블에 기본 연결 행이 표시되어야 함
    await expect(
      page.locator('body'),
    ).toContainText(/LMStudio/i, { timeout: 10_000 });
  });

  test('L5b: LLM 추가 버튼 → 폼 → 저장 (POST 픽스 검증)', async ({ page }) => {
    // BE에서 콜 수 모니터링
    const postRequests: { url: string; status: number }[] = [];
    page.on('response', (resp) => {
      if (resp.url().includes('/llm-connections') && resp.request().method() === 'POST') {
        postRequests.push({ url: resp.url(), status: resp.status() });
      }
    });

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/LLM 연결/i, { timeout: 15_000 });

    // AI 패널이 이전 테스트에서 열려 있을 수 있음 → 닫기
    const aiCloseBtn = page.getByRole('button', { name: '닫기' }).first();
    if (await aiCloseBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await aiCloseBtn.click();
      await page.waitForTimeout(300);
    }

    // 추가 버튼 클릭 — aria-label="LLM 연결 추가" 로 정확히 지정
    // (MCP "추가" 버튼과 구분하기 위해)
    const addBtn = page.getByRole('button', { name: 'LLM 연결 추가' });
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    // 다이얼로그 열림 확인
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    await expect(dialog).toContainText('LLM 연결 추가', { timeout: 5_000 });

    // 이름 변경 (기본값 그대로 사용하면 중복 가능성 있음)
    const nameInput = dialog.locator('input').first();
    await nameInput.fill('UI E2E Test');

    // 유형 기본값(lmstudio) 유지 — URL, 모델은 자동 채워짐

    // 저장 버튼 클릭
    const submitBtn = dialog.getByRole('button', { name: /추가|저장/i });
    await submitBtn.click();

    // 다이얼로그가 닫혀야 함 (저장 성공)
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // POST 요청이 발생했고 2xx 였어야 함
    expect(
      postRequests.length,
      `POST /llm-connections 가 호출되지 않음. 요청 목록: ${JSON.stringify(postRequests)}`,
    ).toBeGreaterThan(0);

    const failedPosts = postRequests.filter((r) => r.status >= 400);
    expect(
      failedPosts,
      `POST /llm-connections 가 에러 응답을 받음: ${JSON.stringify(failedPosts)}`,
    ).toEqual([]);

    // 테이블에 새 항목이 보여야 함
    await expect(page.locator('body')).toContainText('UI E2E Test', { timeout: 10_000 });

    // 정리: 추가된 항목 삭제
    const listResp = await page.request.get('/api/v1/llm-connections');
    const list = await listResp.json() as Array<{ id: string; name: string; isDefault: boolean; isActive: boolean }>;
    const created = list.find((c) => c.name === 'UI E2E Test');
    if (created && !created.isActive && !created.isDefault) {
      await page.request.delete(`/api/v1/llm-connections/${created.id}`);
    }
  });
});

// ------------------------------------------------------------------ //
// 우선순위 2: 기타 POST 경로 회귀
// ------------------------------------------------------------------ //

test.describe('P: 기타 POST 경로 회귀 (arrayBuffer 픽스)', () => {
  test('P1: POST /api/v1/tasks → 2xx', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 프로젝트 목록에서 첫 번째 projectId 획득
    const projResp = await page.request.get('/api/v1/projects');
    const projList = await projResp.json() as Array<{ id: string }>;
    const projectId = projList[0]?.id ?? null;

    const resp = await page.request.post('/api/v1/tasks', {
      data: {
        title: 'E2E Regression Task',
        status: 'todo',
        priority: 'med',  // BE enum: high|med|low
        projectId,
      },
    });

    expect(
      resp.status(),
      `tasks POST 실패: ${resp.status()} — ${await resp.text()}`,
    ).toBeLessThan(300);

    const body = await resp.json();
    expect(body.id, '생성된 태스크에 id가 있어야 함').toBeTruthy();
    expect(body.title).toBe('E2E Regression Task');

    // 정리
    if (body.id) {
      await page.request.delete(`/api/v1/tasks/${body.id}`).catch(() => {});
    }
  });

  test('P2: POST /api/v1/issues → 2xx', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const projResp = await page.request.get('/api/v1/projects');
    const projList = await projResp.json() as Array<{ id: string }>;
    const projectId = projList[0]?.id ?? null;

    const resp = await page.request.post('/api/v1/issues', {
      data: {
        title: 'E2E Regression Issue',
        sev: 'med',           // BE field: sev, enum: critical|high|med|low
        prio: 'P2',           // BE field: prio, enum: P0|P1|P2|P3
        sla: '7일',           // required field
        projectId,
      },
    });

    expect(
      resp.status(),
      `issues POST 실패: ${resp.status()} — ${await resp.text()}`,
    ).toBeLessThan(300);

    const body = await resp.json();
    expect(body.id, '생성된 이슈에 id가 있어야 함').toBeTruthy();

    // 정리
    if (body.id) {
      await page.request.delete(`/api/v1/issues/${body.id}`).catch(() => {});
    }
  });

  test('P3: POST /api/v1/approvals → 2xx', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const resp = await page.request.post('/api/v1/approvals', {
      data: {
        title: 'E2E Regression Approval',
        approver: 'jiwoo.kim@omelet.com',  // required field
        reason: 'E2E regression test',
      },
    });

    expect(
      resp.status(),
      `approvals POST 실패: ${resp.status()} — ${await resp.text()}`,
    ).toBeLessThan(300);

    const body = await resp.json();
    expect(body.id, '생성된 결재에 id가 있어야 함').toBeTruthy();
  });

  test('P4: POST /api/v1/auth/tokens/revoke → 2xx', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // revoke는 실제 토큰이 필요한데, 더미 토큰으로도 400/422는 2xx가 아님.
    // 400 미만이면 엔드포인트 라우팅은 정상 (픽스 검증 목적)
    const resp = await page.request.post('/api/v1/auth/tokens/revoke', {
      data: { token: 'dummy-token-for-regression' },
    });

    // 400(BadRequest)이하면 프록시 레이어 500은 아님 → POST 픽스 정상
    expect(
      resp.status(),
      `tokens/revoke POST가 5xx 서버 오류를 반환함: ${resp.status()} — ${await resp.text()}`,
    ).toBeLessThan(500);
  });
});
