import { test, expect } from '@playwright/test';

/**
 * 콘솔 에러 가드 — 모든 핵심 라우트를 빠르게 훑으면서 페이지 에러가 없는지.
 */
const ROUTES = [
  '/', '/projects', '/tasks', '/issues',
  '/calendar', '/docs', '/chat',
  '/progress', '/clients',
  '/ai-auto', '/notion',
  '/reports/weekly', '/reports/monthly',
  '/org', '/users', '/admin', '/notifications',
];

test('전체 라우트 — 페이지 에러 없음', async ({ page }) => {
  // 17개 라우트를 dev 모드에서 순차 컴파일·방문하므로 기본 30초로는 빠듯.
  test.setTimeout(120_000);

  const errors: { url: string; msg: string }[] = [];
  page.on('pageerror', e => errors.push({ url: page.url(), msg: e.message }));

  for (const r of ROUTES) {
    await page.goto(r, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  }

  // hydration / chunk 관련 에러는 즉시 fail
  expect(errors, `pageerror 발생:\n${errors.map(e => `${e.url} → ${e.msg}`).join('\n')}`).toEqual([]);
});
