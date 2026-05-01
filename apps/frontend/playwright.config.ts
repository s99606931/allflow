import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE_PATH } from './tests/e2e/global-setup';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // 로컬 dev 모드: Next.js dev 동시 렌더링 부하 방지 (직렬). CI: 2.
  workers: process.env.CI ? 2 : 1,
  // dev 모드 warm 라우트 기준 60s (cold 시 globalSetup warmup이 선처리).
  timeout: 60_000,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    // 글로벌 setup 에서 저장한 인증 상태 재사용 (auth bypass 또는 credentials 로그인)
    storageState: STORAGE_STATE_PATH,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // CI 안정화를 위해 우선 Chromium만. 필요시 Firefox/WebKit 추가.
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_E2E: 'true',
          AUTH_SECRET: 'e2e-test-secret-not-for-production',
          NEXTAUTH_SECRET: 'e2e-test-secret-not-for-production',
        },
      },
});
