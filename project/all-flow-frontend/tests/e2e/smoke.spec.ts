/**
 * TEST-F2: 전체 라우트 스모크 — USE_MOCK=true (내장 /api/v1 stub) 모드
 *
 * 목표: 17개 핵심 라우트를 방문하여
 *   1. HTTP 응답이 200 (리다이렉트 없음)
 *   2. 페이지 JavaScript 에러 없음
 *   3. <body>가 실제 콘텐츠를 렌더링 (빈 화면 아님)
 *
 * USE_MOCK=false (real BE) 모드 검증 시:
 *   E2E_BASE_URL=http://localhost:3000 pnpm e2e tests/e2e/smoke.spec.ts
 * USE_MOCK=false 서버를 띄우려면:
 *   NEXT_PUBLIC_USE_MOCK=false NEXT_PUBLIC_E2E=true AUTH_SECRET=e2e pnpm dev
 */

import { test, expect, type Page } from '@playwright/test';

const SMOKE_ROUTES: { href: string; expectText: RegExp }[] = [
  { href: '/', expectText: /대시보드|오늘|좋은\s*아침/ },
  { href: '/projects', expectText: /프로젝트/ },
  { href: '/tasks', expectText: /태스크|할 일/ },
  { href: '/issues', expectText: /이슈/ },
  { href: '/calendar', expectText: /캘린더|월|주/ },
  { href: '/docs', expectText: /문서|위키/ },
  { href: '/chat', expectText: /채널|채팅|메시지/ },
  { href: '/progress', expectText: /진행률|포트폴리오|간트/ },
  { href: '/clients', expectText: /고객사|CRM/ },
  { href: '/ai-auto', expectText: /AI 자동|자동 등록|회의록/ },
  { href: '/notion', expectText: /Notion|노션/ },
  { href: '/reports/weekly', expectText: /주간|보고/ },
  { href: '/reports/monthly', expectText: /월간|보고/ },
  { href: '/org', expectText: /조직도|구성원/ },
  { href: '/users', expectText: /사용자|역할/ },
  { href: '/admin', expectText: /관리자|시스템|콘솔/ },
  { href: '/notifications', expectText: /알림/ },
];

async function guardConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/Failed to load resource|404|Hydration|favicon|net::ERR/i.test(text)) return;
    errors.push(`console.error: ${text}`);
  });
  await fn();
  expect(errors, `JavaScript 에러 발생:\n${errors.join('\n')}`).toEqual([]);
}

test.describe('TEST-F2: 라우트 스모크 (USE_MOCK=true)', () => {
  for (const { href, expectText } of SMOKE_ROUTES) {
    test(`${href} — 200 렌더 + 콘텐츠 확인`, async ({ page }) => {
      await guardConsoleErrors(page, async () => {
        await page.goto(href, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(new RegExp(href.replace(/\//g, '\\/') + '/?'));
        await expect(page.locator('body')).toContainText(expectText, { timeout: 15_000 });
      });
    });
  }
});

test('TEST-F2: /api/v1/* stub — 모든 핵심 엔드포인트 200 응답', async ({ page }) => {
  const API_ENDPOINTS = [
    '/api/v1/tasks',
    '/api/v1/projects',
    '/api/v1/issues',
    '/api/v1/notifications',
    '/api/v1/approvals',
    '/api/v1/clients',
    '/api/v1/events',
    '/api/v1/resources',
    '/api/v1/docs',
    '/api/v1/channels',
    '/api/v1/org/units',
    '/api/v1/users/me',
  ];

  await page.goto('/');

  for (const endpoint of API_ENDPOINTS) {
    const res = await page.request.get(endpoint);
    expect(
      res.status(),
      `${endpoint} 이 ${res.status()}를 반환함 — 200 이어야 함`,
    ).toBe(200);
  }
});

test('TEST-F2: 전체 라우트 일괄 — JavaScript 에러 0건', async ({ page }) => {
  test.setTimeout(180_000);

  const errors: { url: string; msg: string }[] = [];
  page.on('pageerror', e => errors.push({ url: page.url(), msg: e.message }));

  for (const { href } of SMOKE_ROUTES) {
    await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  }

  expect(
    errors,
    `pageerror 발생:\n${errors.map(e => `${e.url} → ${e.msg}`).join('\n')}`,
  ).toEqual([]);
});
