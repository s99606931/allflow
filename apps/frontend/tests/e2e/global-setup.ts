/**
 * Playwright global setup — 데모 계정으로 로그인 후 storageState 저장.
 *
 * credentials provider(email만 필요, 비밀번호 없음)로 로그인한 뒤
 * playwright/.auth/user.json 에 쿠키+localStorage 저장.
 * 이후 모든 테스트가 storageState 로 이 상태를 재사용한다.
 *
 * NEXT_PUBLIC_E2E=true 서버의 경우 auth bypass 가 활성화되어
 * 로그인 없이 바로 앱에 접근할 수 있으나, 기존 dev 서버 재사용 시
 * 이 setup 이 credentials 로그인을 수행한다.
 */

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export const STORAGE_STATE_PATH = path.join(
  __dirname,
  '../../playwright/.auth/user.json',
);

export default async function globalSetup() {
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'ko-KR' });
  const page = await context.newPage();

  await page.goto(`${baseURL}/login`);
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"]').first();
  if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await emailInput.fill('jiwoo.kim@omelet.com');
    await page.getByRole('button', { name: /^로그인$/i }).first().click();

    await page.waitForURL(
      url => !url.toString().includes('/login'),
      { timeout: 15_000 },
    ).catch(() => {});
  }

  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}
