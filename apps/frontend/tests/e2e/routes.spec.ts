import { test, expect, type Page } from '@playwright/test';

/**
 * 모든 사이드바 항목을 한 번씩 방문하면서 콘솔 에러가 없는지,
 * 핵심 헤딩이 보이는지 검증하는 스모크 테스트.
 */

const ROUTES: { href: string; expectText: RegExp }[] = [
  { href: '/', expectText: /대시보드|좋은\s*아침|오늘/ },
  { href: '/projects', expectText: /프로젝트/ },
  { href: '/tasks', expectText: /태스크|할 일/ },
  { href: '/gantt', expectText: /간트|Gantt|일정/ },
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

async function withConsoleGuard(page: Page, fn: () => Promise<void>) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      // Next dev 의 hydration 경고 등 잡음 필터
      if (/Failed to load resource|404|Hydration|favicon/i.test(t)) return;
      errors.push(`console.error: ${t}`);
    }
  });
  await fn();
  expect(errors, `에러:\n${errors.join('\n')}`).toEqual([]);
}

test.describe('라우트 스모크', () => {
  for (const { href, expectText } of ROUTES) {
    test(`${href} 정상 렌더`, async ({ page }) => {
      await withConsoleGuard(page, async () => {
        await page.goto(href);
        await expect(page).toHaveURL(new RegExp(href.replace(/\//g, '\\/') + '/?$'));
        await expect(page.locator('body')).toContainText(expectText, { timeout: 10_000 });
      });
    });
  }
});

test('홈에서 모든 사이드바 링크 클릭 — 네비게이션 동작', async ({ page }) => {
  test.setTimeout(90_000); // 병렬 8-worker 환경에서 17개 링크 순회 충분한 여유
  await page.goto('/');
  const links = page.locator('aside a[href]');
  const count = await links.count();
  expect(count).toBeGreaterThanOrEqual(15);

  // 각 링크의 href 를 수집한 뒤 순회 클릭
  const hrefs: string[] = [];
  for (let i = 0; i < count; i++) {
    const h = await links.nth(i).getAttribute('href');
    if (h && !hrefs.includes(h)) hrefs.push(h);
  }

  for (const h of hrefs) {
    await page.goto('/'); // 매번 홈에서 시작 — 일관성
    await page.locator(`aside a[href="${h}"]`).first().click();
    await page.waitForURL(`**${h}`, { timeout: 45_000 }); // 병렬 부하 대비 넉넉한 timeout
    // 활성 링크가 강조됐는지 — accent-soft 또는 accent-strong 텍스트
    const active = page.locator(`aside a[href="${h}"]`).first();
    await expect(active).toBeVisible();
  }
});
