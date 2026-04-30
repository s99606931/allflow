import { expect, test } from "@playwright/test";
import { gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/projects — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/projects", /프로젝트/);
	});

	test("프로젝트 카드 → 상세 라우트 진입", async ({ page }) => {
		await page.goto("/projects");
		const firstCard = page.locator('a[href^="/projects/"]').first();
		if (await firstCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
			await firstCard.click();
			await expect(page).toHaveURL(/\/projects\/[^/]+/);
			await expect(page.locator("body")).not.toBeEmpty();
		}
	});

	test("뒤로가기 — 상세 → 목록 복귀", async ({ page }) => {
		await page.goto("/projects");
		const firstCard = page.locator('a[href^="/projects/"]').first();
		if (await firstCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
			await firstCard.click();
			await expect(page).toHaveURL(/\/projects\/[^/]+/);
			await page.goBack();
			await expect(page).toHaveURL(/\/projects\/?$/);
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/projects", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
