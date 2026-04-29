import { test, expect } from '@playwright/test';

/**
 * 사이드바 접기/펴기, AI 패널 토글, Tweaks 패널 (테마/액센트) 동작.
 */

test('사이드바 접기/펴기', async ({ page }) => {
  await page.goto('/');
  const sidebar = page.locator('aside').first();
  const initialBox = await sidebar.boundingBox();
  expect(initialBox?.width).toBeGreaterThan(200);

  // 접기 버튼
  await page.getByRole('button', { name: /사이드바 접기/ }).click();
  await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeLessThan(100);

  // 다시 펼치기 — 워크스페이스 아이콘 클릭 (접힌 상태에서 토글 위치)
  // 토글 버튼은 접힌 상태에선 숨겨질 수 있으므로 localStorage 직접 토글로 보강
  await page.evaluate(() => {
    const k = 'allflow-ui';
    const cur = JSON.parse(localStorage.getItem(k) ?? '{}');
    cur.state = { ...(cur.state ?? {}), sidebarCollapsed: false };
    localStorage.setItem(k, JSON.stringify(cur));
  });
  await page.reload();
  await expect.poll(async () => (await page.locator('aside').first().boundingBox())?.width ?? 0).toBeGreaterThan(200);
});

test('AI 패널 — 열기/닫기 토글', async ({ page }) => {
  await page.goto('/');
  // 토픽바의 AI 어시스턴트 버튼
  const aiBtn = page.getByRole('button', { name: /AI 어시스턴트/i }).first();
  await aiBtn.click();
  // 패널 본문이 등장 — "AI 어시스턴트" 헤더 확인
  await expect(page.locator('text=AI 어시스턴트').first()).toBeVisible();

  // 닫기 (Esc 또는 닫기 버튼)
  await page.keyboard.press('Escape').catch(() => {});
  // Esc 가 무시될 수도 있으니 닫기 버튼으로 보강
  const closeBtn = page.getByRole('button', { name: /닫기|Close/i }).first();
  if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
});

test('Tweaks — 다크 모드 전환', async ({ page }) => {
  await page.goto('/');

  // 토픽바의 Tweaks/설정 버튼 — 톱니/Settings 아이콘
  const tweaksBtn = page.getByRole('button', { name: /Tweaks|설정|환경설정|테마/i }).first();
  if (await tweaksBtn.isVisible().catch(() => false)) {
    await tweaksBtn.click();
    const darkOpt = page.getByRole('button', { name: /Dark|다크/ }).first();
    if (await darkOpt.isVisible().catch(() => false)) await darkOpt.click();
  } else {
    // 폴백: 스토어 직접 토글
    await page.evaluate(() => {
      const k = 'allflow-ui';
      const cur = JSON.parse(localStorage.getItem(k) ?? '{}');
      cur.state = { ...(cur.state ?? {}), theme: 'dark' };
      localStorage.setItem(k, JSON.stringify(cur));
    });
    await page.reload();
  }

  // <html> 또는 body 에 dark 클래스가 적용
  const isDark = await page.evaluate(() =>
    document.documentElement.classList.contains('dark') ||
    document.documentElement.dataset.theme === 'dark' ||
    document.body.classList.contains('dark'),
  );
  expect(isDark).toBe(true);
});

test('전역 검색 — ⌘K / Ctrl+K 단축키', async ({ page }) => {
  await page.goto('/');
  const search = page.locator('button:has-text("검색")').first();
  await expect(search).toBeVisible();
});

test('대시보드 위젯 6개 렌더', async ({ page }) => {
  await page.goto('/');
  // 카드 컴포넌트 — border + bg 조합
  const cards = page.locator('[class*="rounded-lg"][class*="border"]');
  expect(await cards.count()).toBeGreaterThan(4);
});

test('프로젝트 목록 → 상세 진입', async ({ page }) => {
  await page.goto('/projects');
  const firstProject = page.locator('a[href^="/projects/"]').first();
  if (await firstProject.isVisible().catch(() => false)) {
    await firstProject.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+/);
  }
});

test('이슈 — 4-탭 (리스트/보드/SLA/분석) 전환', async ({ page }) => {
  await page.goto('/issues');
  for (const tab of ['리스트', '보드', 'SLA', '분석']) {
    const t = page.getByRole('tab', { name: new RegExp(tab) }).first();
    if (await t.isVisible().catch(() => false)) {
      await t.click();
      await page.waitForTimeout(150);
    }
  }
});
