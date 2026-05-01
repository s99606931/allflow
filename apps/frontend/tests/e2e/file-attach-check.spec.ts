/**
 * file-attach-check.spec.ts — AI 패널 파일 첨부 기능 E2E 검증
 */
import { test, expect, type Page } from '@playwright/test';

// 1×1 투명 PNG 바이너리 (실제 파일 없이 인메모리로 사용)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const TINY_TXT = Buffer.from('allflow E2E 첨부 테스트\n');

async function openAIPanel(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('body')).toContainText(/대시보드|오늘|좋은/, { timeout: 15_000 });
  const aiBtn = page.getByRole('button', { name: /AI 어시스턴트/i }).first();
  await expect(aiBtn).toBeVisible({ timeout: 10_000 });
  await aiBtn.click();
  await expect(
    page.locator('textarea[placeholder*="물어보세요"]'),
  ).toBeVisible({ timeout: 8_000 });
  // file input이 onChange 핸들러까지 완전히 hydrate될 때까지 대기
  await page.waitForFunction(() => {
    const inp = document.querySelector('input[type="file"]');
    return !!inp;
  }, undefined, { timeout: 5_000 });
  await page.waitForTimeout(200);
}

// ---------- FA1: paperclip 버튼 ----------

test('FA1: paperclip 버튼 + file input 존재 확인', async ({ page }) => {
  await openAIPanel(page);

  const paperclip = page.locator('button[aria-label="파일 첨부"]').first();
  await expect(paperclip).toBeVisible({ timeout: 5_000 });

  const fileInput = page.locator('input[type="file"]').first();
  await expect(fileInput).toBeAttached();

  const accept = await fileInput.getAttribute('accept');
  expect(accept).toContain('image/');
  expect(accept).toContain('application/pdf');
});

// ---------- FA2: 이미지 파일 첨부 ----------

test('FA2: 이미지 파일 첨부 → BE 업로드 201 + 미리보기', async ({ page }) => {
  await openAIPanel(page);

  const fileInput = page.locator('input[type="file"]').first();

  const [uploadResp] = await Promise.all([
    page.waitForResponse(
      r => r.url().includes('/api/v1/ai/attachments') && r.request().method() === 'POST',
      { timeout: 15_000 },
    ),
    fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    }),
  ]);

  expect(uploadResp.status(), '이미지 업로드 응답이 201이어야 함').toBe(201);
  const body = await uploadResp.json();
  expect(body.storageKey).toMatch(/^attach\//);
  expect(body.base64).toBeTruthy();
  expect(body.mimeType).toBe('image/png');
  expect(body.sizeBytes).toBeGreaterThan(0);

  // 이미지 미리보기 확인
  const preview = page.locator('img[alt="test-image.png"]');
  await expect(preview).toBeVisible({ timeout: 5_000 });
});

// ---------- FA3: 텍스트 파일 첨부 ----------

test('FA3: 텍스트 파일 첨부 → 파일명 표시 + 업로드 201', async ({ page }) => {
  await openAIPanel(page);

  const fileInput = page.locator('input[type="file"]').first();

  const [uploadResp] = await Promise.all([
    page.waitForResponse(
      r => r.url().includes('/api/v1/ai/attachments') && r.request().method() === 'POST',
      { timeout: 15_000 },
    ),
    fileInput.setInputFiles({
      name: 'test-doc.txt',
      mimeType: 'text/plain',
      buffer: TINY_TXT,
    }),
  ]);

  expect(uploadResp.status(), '텍스트 파일 업로드 응답이 201이어야 함').toBe(201);

  // 파일명이 미리보기 카드에 표시돼야 함
  await expect(page.locator('text=test-doc.txt')).toBeVisible({ timeout: 5_000 });
});

// ---------- FA4: 크기 초과 파일 무시 ----------

test('FA4: 10MB 초과 파일 → 업로드 요청 없음 (클라이언트 필터)', async ({ page }) => {
  await openAIPanel(page);

  // 11MB 가짜 PNG
  const bigBuf = Buffer.alloc(11 * 1024 * 1024, 0);
  bigBuf[0] = 0x89; bigBuf[1] = 0x50; bigBuf[2] = 0x4e; bigBuf[3] = 0x47;

  const fileInput = page.locator('input[type="file"]').first();
  let uploadCalled = false;
  page.on('request', r => {
    if (r.url().includes('/api/v1/ai/attachments')) uploadCalled = true;
  });

  await fileInput.setInputFiles({
    name: 'too-big.png',
    mimeType: 'image/png',
    buffer: bigBuf,
  });

  // 클라이언트 필터가 작동하면 업로드 요청이 발생하지 않아야 함
  await page.waitForTimeout(1_000);
  expect(uploadCalled, '크기 초과 파일은 업로드 요청을 하지 않아야 함').toBe(false);
});

// ---------- FA5: 허용되지 않는 타입 무시 ----------

test('FA5: 허용되지 않는 MIME 타입 → 업로드 요청 없음', async ({ page }) => {
  await openAIPanel(page);

  const fileInput = page.locator('input[type="file"]').first();
  let uploadCalled = false;
  page.on('request', r => {
    if (r.url().includes('/api/v1/ai/attachments')) uploadCalled = true;
  });

  await fileInput.setInputFiles({
    name: 'malware.exe',
    mimeType: 'application/x-msdownload',
    buffer: Buffer.from('MZ'),
  });

  await page.waitForTimeout(1_000);
  expect(uploadCalled, '허용되지 않는 타입은 업로드 요청을 하지 않아야 함').toBe(false);
});

// ---------- FA6: 파일 제거 버튼 ----------

test('FA6: 첨부 파일 제거 버튼 → 목록에서 삭제', async ({ page }) => {
  await openAIPanel(page);

  const fileInput = page.locator('input[type="file"]').first();

  await Promise.all([
    page.waitForResponse(
      r => r.url().includes('/api/v1/ai/attachments') && r.request().method() === 'POST',
      { timeout: 15_000 },
    ),
    fileInput.setInputFiles({
      name: 'remove-test.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    }),
  ]);

  // 파일이 추가됐는지 확인
  const preview = page.locator('img[alt="remove-test.png"]');
  await expect(preview).toBeVisible({ timeout: 5_000 });

  // 제거 버튼 — 뷰포트/overflow 제약을 우회해서 클릭
  const removeBtn = page.locator('button[aria-label="파일 제거"]').first();
  await expect(removeBtn).toBeAttached({ timeout: 3_000 });
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="파일 제거"]') as HTMLButtonElement | null;
    btn?.click();
  });

  // 미리보기가 사라져야 함
  await expect(preview).not.toBeAttached({ timeout: 5_000 });
});

// ---------- FA7: 직접 API 호출 ----------

test('FA7: POST /api/v1/ai/attachments → 201 + storageKey + base64', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const resp = await page.request.post('/api/v1/ai/attachments', {
    multipart: {
      file: {
        name: 'api-test.png',
        mimeType: 'image/png',
        buffer: TINY_PNG,
      },
    },
  });

  expect(resp.status(), 'API 직접 호출 시 201이어야 함').toBe(201);
  const body = await resp.json();
  expect(body.storageKey).toMatch(/^attach\//);
  expect(body.base64).toBeTruthy();
  expect(body.mimeType).toBe('image/png');
  expect(body.sizeBytes).toBeGreaterThan(0);
  expect(body.filename).toBe('api-test.png');
});
