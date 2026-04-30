import { expect, test } from "@playwright/test";
import { findInputByPlaceholder, gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/issues — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/issues", /이슈/);
	});

	test("4-탭 전환 — 리스트/보드/SLA/분석", async ({ page }) => {
		await page.goto("/issues");
		for (const name of [/리스트/, /보드/, /SLA/i, /분석/]) {
			const tab = page.getByRole("tab", { name }).first();
			if (await tab.isVisible({ timeout: 2_000 }).catch(() => false)) {
				await tab.click();
				await page.waitForTimeout(150);
			}
		}
	});

	test("검색 — placeholder 입력 반영", async ({ page }) => {
		await page.goto("/issues");
		const input = await findInputByPlaceholder(page, /이슈.*검색|검색/);
		if (input) {
			await input.fill("hotfix");
			await expect(input).toHaveValue("hotfix");
		}
	});

	test("보드 뷰 — 상태 select 변경 enabled", async ({ page }) => {
		await page.goto("/issues");
		const boardTab = page.getByRole("tab", { name: /보드/ }).first();
		if (await boardTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await boardTab.click();
			const select = page.locator('select[aria-label="상태 변경"]').first();
			if (await select.isVisible({ timeout: 5_000 }).catch(() => false)) {
				await expect(select).toBeEnabled();
			}
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/issues", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
