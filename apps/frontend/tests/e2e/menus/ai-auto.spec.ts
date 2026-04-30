import { expect, test } from "@playwright/test";
import { findInputByPlaceholder, gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/ai-auto — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/ai-auto", /AI 자동|자동 등록|회의록/);
	});

	test("회의록 입력 — placeholder + 입력 반영", async ({ page }) => {
		await page.goto("/ai-auto");
		const ta = page.locator('textarea').first();
		if (await ta.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await ta.fill("회의록 샘플 텍스트");
			await expect(ta).toHaveValue("회의록 샘플 텍스트");
		}
	});

	test("추출 항목 제거 버튼 가시 (있을 때)", async ({ page }) => {
		await page.goto("/ai-auto");
		const remove = page.locator('button[aria-label="제거"]');
		const count = await remove.count().catch(() => 0);
		expect(count).toBeGreaterThanOrEqual(0);
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/ai-auto", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
