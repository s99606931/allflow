/**
 * smoke-api-wiring.spec.ts — BE API 실배선 검증 smoke (7개 시나리오)
 *
 * 목적: fixture(하드코딩) 대신 실제 BE /api/v1 에서 사용자/프로젝트를 가져오는지 확인.
 * 환경: E2E_BASE_URL=http://localhost, USE_MOCK=false
 *
 * 시나리오:
 *   S1. 로그인 — /login → credentials 제출 → /dashboard 리디렉트
 *   S2. 대시보드 — /dashboard 로드 + 콘솔 에러 없음
 *   S3. AI 패널 — AI 어시스턴트 버튼 클릭 → 패널 렌더
 *   S4. 커맨드 팔레트 — Ctrl+K → "task" 검색 → 결과 표시
 *   S5. 태스크 다이얼로그 — /tasks → 새 태스크 → 담당자 드롭다운이 BE 사용자 반환
 *   S6. 이슈 다이얼로그 — /issues → 새 이슈 → 담당자/보고자 드롭다운 확인
 *   S7. 채팅 멘션 — /chat → @ 버튼 → 멘션 팝오버 + 사용자 목록
 */

import { test, expect, type Page } from '@playwright/test';

// ---------- 헬퍼 ----------

/** 콘솔 에러를 수집하는 감시자. 반환된 함수를 호출하면 누적 에러 배열을 반환 */
function watchConsoleErrors(page: Page): () => string[] {
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(`pageerror: ${e.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // 리소스 404, favicon, hydration 경고 등 노이즈 필터
    if (/Failed to load resource|favicon|net::ERR|Hydration|hydrat/i.test(text)) return;
    errs.push(`console.error: ${text}`);
  });
  return () => errs;
}

// ---------- S1: 로그인 ----------
// 쿠키 없는 클린 컨텍스트로 실행 — 기존 storageState 가 CSRF 를 오염시키지 않도록.
test.describe('S1 (clean session)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('S1: 로그인 → /dashboard 리디렉트', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h2')).toContainText('로그인', { timeout: 10_000 });

    // React 하이드레이션 완료 대기 — 완료 전에 버튼을 클릭하면 onSubmit 핸들러가
    // 연결되지 않아 기본 GET 폼 제출이 발생한다.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

    // 이메일 입력 후 로그인 버튼 클릭 (dev 모드: 비밀번호 컬럼 없음, 이메일만으로 JWT 발급)
    await page.locator('input[type="email"]').fill('jiwoo.kim@omelet.com');

    const loginBtn = page.getByRole('button', { name: /^로그인$/ });
    await expect(loginBtn).toBeVisible();

    // /api/auth/callback/credentials 응답 완료 대기 후 세션 확인
    const [callbackResp] = await Promise.all([
      page.waitForResponse(
        r => r.url().includes('/api/auth/callback/credentials') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      loginBtn.click(),
    ]);
    expect(callbackResp.ok(), '로그인 credentials 콜백이 실패했습니다').toBe(true);

    // 세션 쿠키가 설정된 후 / 로 이동해서 인증 상태 확인
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await expect(page.locator('body')).toContainText(/대시보드|오늘|좋은/, { timeout: 15_000 });
  });
});

// ---------- S2: 대시보드 ----------

test('S2: 대시보드 — 로드 + 콘솔 에러 없음', async ({ page }) => {
  const getErrors = watchConsoleErrors(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/대시보드|오늘|좋은/, { timeout: 15_000 });

  // networkidle 로 API 요청 완료까지 대기 (최대 5s)
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

  const errs = getErrors();
  expect(
    errs,
    `대시보드 콘솔 에러:\n${errs.join('\n')}`,
  ).toEqual([]);
});

// ---------- S3: AI 패널 ----------

test('S3: AI 패널 — 버튼 클릭 → 패널 렌더', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/대시보드|오늘|좋은/, { timeout: 15_000 });

  // topbar 에 있는 AI 어시스턴트 버튼
  const aiBtn = page.getByRole('button', { name: /AI 어시스턴트/i }).first();
  await expect(aiBtn).toBeVisible({ timeout: 10_000 });
  await aiBtn.click();

  // 패널이 열리면 "AI 어시스턴트" 텍스트 또는 AI 패널 컨테이너가 보여야 함
  const panelVisible = await page
    .locator('[class*="ai-panel"], [data-testid*="ai"], text=AI 어시스턴트')
    .first()
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  // 텍스트로도 추가 확인
  const textVisible = await page.locator('text=AI 어시스턴트').first()
    .isVisible({ timeout: 3_000 })
    .catch(() => false);

  expect(
    panelVisible || textVisible,
    'AI 패널이 열린 후 "AI 어시스턴트" 헤더 또는 패널 컨테이너가 보여야 함',
  ).toBe(true);
});

// ---------- S4: 커맨드 팔레트 ----------

test('S4: 커맨드 팔레트 — Ctrl+K → "task" 입력 → 결과 표시', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/대시보드|오늘|좋은/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

  // body 포커스 후 Ctrl+K — document keydown listener 가 확실히 받도록.
  await page.locator('body').click();
  await page.keyboard.press('Control+k');

  // 팔레트 입력창이 열려야 함
  const input = page.locator('input[placeholder*="검색"]').first();
  await expect(input).toBeVisible({ timeout: 5_000 });

  // "task" 검색
  await input.fill('task');
  await page.waitForTimeout(300);

  // 결과 영역에 무언가 표시되어야 함 — 태스크 관련 항목 또는 액션
  const hasResults = await page
    .locator('[role="option"], [role="listbox"] li, [class*="hit"], [class*="result"]')
    .first()
    .isVisible({ timeout: 3_000 })
    .catch(() => false);

  const hasTaskText = await page
    .locator('text=태스크')
    .first()
    .isVisible({ timeout: 3_000 })
    .catch(() => false);

  expect(
    hasResults || hasTaskText,
    '"task" 입력 후 팔레트에 결과가 표시되어야 함',
  ).toBe(true);
});

// ---------- S5: 태스크 다이얼로그 — BE 사용자 목록 확인 ----------

test('S5: 태스크 다이얼로그 — 담당자 드롭다운에 BE 사용자 표시', async ({ page }) => {
  await page.goto('/tasks', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/태스크|할 일/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(500);

  // "새 태스크" 버튼 — Radix portal + Next dev hydration race 대비 retry 클릭.
  const newBtn = page.getByRole('button', { name: /새 태스크/ }).first();
  await expect(newBtn).toBeVisible({ timeout: 10_000 });
  const dialog = page.getByRole('dialog');
  for (let i = 0; i < 3; i++) {
    await newBtn.click({ force: true });
    if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) break;
    await page.waitForTimeout(800);
  }

  // 다이얼로그 열림 확인
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog).toContainText('새 태스크', { timeout: 5_000 });

  // 담당자 select 요소 내 <option> 확인
  // BE /api/v1/users 에서 가져온 사용자가 들어있어야 함 (fixture: u1,u2 등 하드코딩이면 FAIL)
  const assigneeSelect = dialog.locator('select').filter({ hasText: /.+/ }).first();

  // API 응답 대기: 드롭다운이 1개 이상 option을 가질 때까지
  await expect.poll(
    async () => {
      const opts = await dialog.locator('select option').allTextContents();
      return opts.filter(t => t.trim().length > 0).length;
    },
    { timeout: 10_000, message: '담당자 드롭다운에 사용자 옵션이 없음' },
  ).toBeGreaterThan(0);

  // option value 가 DB ID 형태인지 확인 (fixture는 'u1','u2' 패턴)
  const optionValues = await dialog.locator('select option').evaluateAll(
    (els: HTMLOptionElement[]) => els.map(el => el.value).filter(v => v.length > 0),
  );

  expect(optionValues.length, '담당자 옵션이 0개임').toBeGreaterThan(0);

  // fixture 여부 판단: 모든 value가 단순 'u1','u2' 패턴이면 fixture 의심
  const allAreShortFixture = optionValues.every(v => /^u\d+$/.test(v));
  expect(
    !allAreShortFixture,
    `담당자 드롭다운 값이 fixture 패턴(u1,u2...)으로만 구성됨: [${optionValues.join(', ')}]\n` +
    'BE /api/v1/users 에서 실제 데이터를 가져와야 합니다.',
  ).toBe(true);

  // 닫기
  await page.keyboard.press('Escape');
});

// ---------- S6: 이슈 다이얼로그 — 담당자/보고자 확인 ----------

test('S6: 이슈 다이얼로그 — 프로젝트/담당자 드롭다운 BE 데이터 확인', async ({ page }) => {
  await page.goto('/issues', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/이슈/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(500);

  // 이슈 생성 버튼 — Radix portal + Next dev hydration race 대비 retry 클릭.
  const newBtn = page
    .getByRole('button', { name: /새 이슈|이슈 등록|New Issue/i })
    .first();
  await expect(newBtn).toBeVisible({ timeout: 10_000 });
  const dialog = page.getByRole('dialog');
  for (let i = 0; i < 3; i++) {
    await newBtn.click({ force: true });
    if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) break;
    await page.waitForTimeout(800);
  }

  // 다이얼로그 열림 확인
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog).toContainText('새 이슈', { timeout: 5_000 });

  // 프로젝트 + 담당자 + 심각도 + 우선순위 select 4개 (reporter 필드는 BE가 세션에서 자동 설정)
  const selects = dialog.locator('select');
  await expect.poll(
    async () => selects.count(),
    { timeout: 8_000, message: 'select 엘리먼트가 없음' },
  ).toBeGreaterThanOrEqual(2);

  // 각 select 에 option이 있어야 함
  const allOptions = await dialog.locator('select option').allTextContents();
  const nonEmpty = allOptions.filter(t => t.trim().length > 0);
  expect(nonEmpty.length, '이슈 다이얼로그 select option이 비어 있음').toBeGreaterThan(0);

  // fixture 여부 판단
  const allValues = await dialog.locator('select option').evaluateAll(
    (els: HTMLOptionElement[]) => els.map(el => el.value).filter(v => v.length > 0),
  );
  const allAreShortFixture = allValues.every(v => /^u\d+$/.test(v));
  expect(
    !allAreShortFixture,
    `이슈 다이얼로그 option 값이 fixture 패턴: [${allValues.join(', ')}]`,
  ).toBe(true);

  await page.keyboard.press('Escape');
});

// ---------- S7: 채팅 멘션 팝오버 ----------

test('S7: 채팅 — 멘션 버튼(@) → 팝오버 + 사용자 목록', async ({ page }) => {
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/채널|채팅|메시지/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

  // 채널이 있으면 첫 번째 채널 클릭해 Composer 활성화
  const firstChannel = page.locator('[class*="channel"], [class*="Channel"]').first();
  if (await firstChannel.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await firstChannel.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  // Composer 의 멘션 버튼 (aria-label="멘션")
  const mentionBtn = page.getByRole('button', { name: /멘션/i }).first();
  await expect(mentionBtn).toBeVisible({ timeout: 10_000 });
  await mentionBtn.click();

  // 멘션 팝오버 열림 — role="listbox", aria-label="멘션 대상"
  const popover = page.getByRole('listbox', { name: '멘션 대상' });
  await expect(popover).toBeVisible({ timeout: 5_000 });

  // 팝오버 내 사용자 목록 버튼이 1개 이상
  await expect.poll(
    async () => popover.locator('button[role="option"]').count(),
    { timeout: 8_000, message: '멘션 팝오버에 사용자 항목이 없음' },
  ).toBeGreaterThan(0);

  // 사용자 이름이 텍스트로 존재
  const userButtons = popover.locator('button[role="option"]');
  const firstText = await userButtons.first().textContent();
  expect(firstText?.trim().length, '멘션 팝오버 첫 사용자 이름이 비어 있음').toBeGreaterThan(0);
});

// ---------- S8: nav-counts ----------

test('S8: nav-counts — GET /api/v1/nav-counts → 2xx + 숫자 맵', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const resp = await page.request.get('/api/v1/nav-counts');
  expect(resp.status(), 'nav-counts가 2xx 여야 함').toBeLessThan(300);

  const body = await resp.json();
  expect(typeof body, 'nav-counts 응답이 object 여야 함').toBe('object');
});

// ---------- S9: gantt ----------

test('S9: gantt — GET /api/v1/gantt → 2xx + tasks 배열', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const resp = await page.request.get('/api/v1/gantt');
  expect(resp.status(), 'gantt가 2xx 여야 함').toBeLessThan(300);

  const body = await resp.json();
  expect(typeof body, 'gantt 응답이 object 여야 함').toBe('object');
  expect(Array.isArray(body.tasks), 'gantt 응답에 tasks 배열이 있어야 함').toBe(true);
});

// ---------- S10: audit-log ----------

test('S10: audit-log — GET /api/v1/audit-log → 2xx + items 배열', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const resp = await page.request.get('/api/v1/audit-log');
  expect(resp.status(), 'audit-log가 2xx 여야 함').toBeLessThan(300);

  const body = await resp.json();
  expect(typeof body, 'audit-log 응답이 object 여야 함').toBe('object');
  expect(Array.isArray(body.items), 'audit-log 응답에 items 배열이 있어야 함').toBe(true);
});

// ---------- S11: notifications/read-all ----------

test('S11: notifications/read-all — POST → 2xx', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const resp = await page.request.post('/api/v1/notifications/read-all');
  expect(resp.status(), 'notifications/read-all가 2xx 여야 함').toBeLessThan(300);
});

// ---------- S12: llm-connections ----------

test('S12: llm-connections — GET /api/v1/llm-connections → 2xx + 배열', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const resp = await page.request.get('/api/v1/llm-connections');
  expect(resp.status(), 'llm-connections가 2xx 여야 함').toBeLessThan(300);

  const body = await resp.json();
  expect(Array.isArray(body), 'llm-connections 응답이 배열이어야 함').toBe(true);
});

// ---------- S13: mcp-connections ----------

test('S13: mcp-connections — GET /api/v1/ai/mcp-connections → 2xx + 배열', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const resp = await page.request.get('/api/v1/ai/mcp-connections');
  expect(resp.status(), 'mcp-connections가 2xx 여야 함').toBeLessThan(300);

  const body = await resp.json();
  expect(Array.isArray(body), 'mcp-connections 응답이 배열이어야 함').toBe(true);
});

// ---------- S14: AI complete (smoke) ----------

test('S14: AI complete — POST /api/v1/ai/complete → 2xx + text 필드', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const resp = await page.request.post('/api/v1/ai/complete', {
    data: { prompt: 'hello', stream: false },
  });
  expect(resp.status(), 'ai/complete가 2xx 여야 함').toBeLessThan(300);

  const body = await resp.json();
  expect(typeof body.text, 'ai/complete 응답에 text 필드가 있어야 함').toBe('string');
});
