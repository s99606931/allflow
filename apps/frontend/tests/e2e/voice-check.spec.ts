/**
 * voice-check.spec.ts — AI 패널 음성 입력(마이크) 버튼 동작 검증
 *
 * 검증 범위:
 * - SpeechRecognition API 브라우저 지원 여부
 * - 마이크 버튼 렌더링 (supported=true 시)
 *
 * ※ listening 상태 전환은 실제 마이크가 없는 headless 환경에서 검증 불가.
 *   webkitSpeechRecognition.start() 호출 시 onerror가 즉시 발생해 setListening(false)로 복귀됨.
 *   실 브라우저(Chrome + 마이크 허용)에서 정상 작동 확인됨 — 코드 구현 정상.
 */
import { test, expect } from '@playwright/test';

test.describe('AI 패널 음성 입력', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/대시보드|오늘|좋은/, { timeout: 15_000 });

    const aiBtn = page.getByRole('button', { name: /AI 어시스턴트/i }).first();
    await expect(aiBtn).toBeVisible({ timeout: 10_000 });
    await aiBtn.click();

    await expect(
      page.locator('textarea[placeholder*="물어보세요"]'),
      'AI Composer textarea가 보여야 함',
    ).toBeVisible({ timeout: 8_000 });
  });

  test('SpeechRecognition API — Chromium 지원 확인', async ({ page }) => {
    const supported = await page.evaluate(
      () => !!(window.SpeechRecognition ?? window.webkitSpeechRecognition),
    );
    expect(supported, 'Chromium은 webkitSpeechRecognition을 지원해야 함').toBe(true);
  });

  test('마이크 버튼 — 지원 시 렌더링', async ({ page }) => {
    const supported = await page.evaluate(
      () => !!(window.SpeechRecognition ?? window.webkitSpeechRecognition),
    );

    if (!supported) {
      test.skip();
      return;
    }

    const micBtn = page.locator('button[aria-label="음성 입력 시작"]').first();
    await expect(micBtn, '마이크 버튼이 보여야 함').toBeVisible({ timeout: 5_000 });
  });
});
