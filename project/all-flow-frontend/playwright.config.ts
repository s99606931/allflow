import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
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
          // Exercise the real /api/v1 stub routes during E2E so the fetch
          // surface gets covered end-to-end.
          NEXT_PUBLIC_USE_MOCK: 'false',
        },
      },
});
