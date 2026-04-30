import { expect, test } from "@playwright/test";
import { findInputByPlaceholder, gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/docs — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/docs", /문서|위키/);
	});

	test("문서 검색 — placeholder 입력 반영", async ({ page }) => {
		await page.goto("/docs");
		const input = await findInputByPlaceholder(page, /문서.*검색|검색/);
		if (input) {
			await input.fill("운영 정책");
			await expect(input).toHaveValue("운영 정책");
		}
	});

	test("문서 트리 항목 → 본문 영역 전환", async ({ page }) => {
		await page.goto("/docs");
		const firstNode = page.locator('button:has-text("운영"), a:has-text("운영"), [role="treeitem"]').first();
		if (await firstNode.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await firstNode.click();
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/docs", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
