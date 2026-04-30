import { expect, test } from "@playwright/test";
import { clickIfVisible, gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/dashboard — non-CRUD scenarios", () => {
	test("진입 + 핵심 헤딩 가시", async ({ page }) => {
		await gotoAndAnchor(page, "/", /대시보드|좋은\s*아침|오늘/);
	});

	test("위젯 카드 5+ 개 렌더", async ({ page }) => {
		await page.goto("/");
		const cards = page.locator('[class*="rounded-lg"][class*="border"]');
		expect(await cards.count()).toBeGreaterThan(4);
	});

	test("사이드바 메뉴 진입 — projects/tasks/issues 라우트 이동", async ({ page }) => {
		await page.goto("/");
		for (const [label, expectURL] of [
			["프로젝트", /\/projects/],
			["태스크", /\/tasks/],
			["이슈", /\/issues/],
		] as const) {
			const link = page.locator(`a:has-text("${label}")`).first();
			if (await link.isVisible({ timeout: 2_000 }).catch(() => false)) {
				await link.click();
				await expect(page).toHaveURL(expectURL);
				await page.goBack();
			}
		}
	});

	test("⌘K 검색 버튼 가시", async ({ page }) => {
		await page.goto("/");
		const search = page.locator('button:has-text("검색")').first();
		await expect(search).toBeVisible();
	});

	test("AI 패널 토글", async ({ page }) => {
		await page.goto("/");
		const aiBtn = page.getByRole("button", { name: /AI 어시스턴트/i }).first();
		if (await aiBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await aiBtn.click();
			await expect(page.locator("text=AI 어시스턴트").first()).toBeVisible();
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
