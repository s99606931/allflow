/**
 * PDCA-10 E2E gate — covers the three collaboration / schedule / report flows
 * shipped in the 3rd FE sweep (PDCA-04 / 05 / 07).
 */
import { test, expect } from '@playwright/test';

test('approvals — open create dialog and submit', async ({ page }) => {
  await page.goto('/approvals');
  await page.getByRole('button', { name: /새 결재/ }).first().click();
  await expect(page.getByRole('heading', { name: /결재 작성/ })).toBeVisible();
  await page.getByLabel(/제목|Title/i).fill('E2E 출장비');
  await page.getByRole('button', { name: /상신|Submit/i }).click();
  await expect(page.getByText(/상신|결재가|Submitted/i).first()).toBeVisible({ timeout: 5_000 });
});

test('docs — create new document via dialog', async ({ page }) => {
  await page.goto('/docs');
  await page.getByRole('button', { name: /새 문서/ }).first().click();
  await expect(page.getByRole('heading', { name: /새 문서/ })).toBeVisible();
  await page.getByLabel(/제목|Title/i).first().fill('E2E PRD 초안');
  await page.getByRole('button', { name: /만들기|Create/i }).click();
});

test('chat — send a message via Composer', async ({ page }) => {
  await page.goto('/chat');
  const composer = page.getByPlaceholder(/메시지|Write a message/i);
  await composer.fill('hello from playwright');
  await page.getByRole('button', { name: /Send|보내기/i }).click();
  await expect(page.getByText('hello from playwright').first()).toBeVisible();
});

test('calendar — open create dialog with conflict detection', async ({ page }) => {
  await page.goto('/calendar');
  await page.getByRole('button', { name: /일정 추가|Add Event/i }).click();
  await expect(page.getByRole('heading', { name: /새 일정|New Event/i })).toBeVisible();
});

test('resources — open booking dialog', async ({ page }) => {
  await page.goto('/resources');
  await page.getByRole('button', { name: /^예약$|^Book$/i }).first().click();
  await expect(page.getByRole('heading', { name: /리소스 예약|Book Resource/i })).toBeVisible();
});

test('clients — open detail and add activity', async ({ page }) => {
  await page.goto('/clients');
  await page.getByRole('button', { name: /CJ ENM 상세 보기|CJ ENM/ }).first().click();
  await expect(page.getByRole('heading', { name: /CJ ENM/ }).first()).toBeVisible();
});

test('reports/weekly — open recipients editor', async ({ page }) => {
  await page.goto('/reports/weekly');
  await page.getByRole('button', { name: /^발송$|^Send$/ }).first().click();
  await expect(page.getByRole('heading', { name: /수신자 편집|Edit Recipients/i })).toBeVisible();
});
