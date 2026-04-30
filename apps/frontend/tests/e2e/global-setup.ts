/**
 * Playwright global setup — 데모 계정으로 로그인 후 storageState 저장.
 * 로그인 완료 후 모든 테스트 대상 라우트를 워밍업(pre-compile)한다.
 * Next.js dev 모드에서 첫 요청 시 40s+ 소요 → 병렬 테스트 타임아웃 방지.
 */

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export const STORAGE_STATE_PATH = path.join(
  __dirname,
  '../../playwright/.auth/user.json',
);

const WARMUP_ROUTES = [
  '/', '/projects', '/tasks', '/issues', '/calendar',
  '/progress', '/gantt', '/chat', '/clients', '/docs',
  '/ai-auto', '/notion', '/reports/weekly', '/reports/monthly',
  '/org', '/users', '/hr', '/admin', '/notifications',
  '/settings', '/approvals', '/resources',
];

export default async function globalSetup() {
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'ko-KR' });
  const page = await context.newPage();

  // login
  await page.goto(`${baseURL}/login`, { timeout: 60_000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 60_000 });

  const emailInput = page.locator('input[type="email"]').first();
  if (await emailInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await emailInput.fill('jiwoo.kim@omelet.com');
    await page.getByRole('button', { name: /^로그인$/i }).first().click();

    await page.waitForURL(
      url => !url.toString().includes('/login'),
      { timeout: 30_000 },
    ).catch(() => {});
  }

  await context.storageState({ path: STORAGE_STATE_PATH });

  // warm up all routes so dev-mode compilation doesn't cause test timeouts
  console.log('[global-setup] warming up routes...');
  for (const route of WARMUP_ROUTES) {
    try {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    } catch {
      // warmup failure is non-fatal
    }
  }
  console.log('[global-setup] warmup complete');

  await browser.close();
}
