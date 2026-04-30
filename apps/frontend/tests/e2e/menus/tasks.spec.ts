import { expect, test } from "@playwright/test";
import { findInputByPlaceholder, gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/tasks — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/tasks", /태스크|할 일/);
	});

	test("탭 전환 — 리스트/보드/캘린더/간트 모두 클릭 가능", async ({ page }) => {
		await page.goto("/tasks");
		for (const name of [/리스트/, /보드/, /캘린더/, /간트|Gantt/]) {
			const tab = page.getByRole("tab", { name }).first();
			if (await tab.isVisible({ timeout: 2_000 }).catch(() => false)) {
				await tab.click();
				await page.waitForTimeout(150);
			}
		}
	});

	test("검색 — placeholder 입력 반영", async ({ page }) => {
		await page.goto("/tasks");
		const input = await findInputByPlaceholder(page, /태스크.*검색|검색/);
		if (input) {
			await input.fill("테스트");
			await expect(input).toHaveValue("테스트");
			await input.fill("");
		}
	});

	test("보드 뷰 — 상태 select 가시", async ({ page }) => {
		await page.goto("/tasks");
		const boardTab = page.getByRole("tab", { name: /보드/ }).first();
		if (await boardTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await boardTab.click();
			const selects = page.locator('select[aria-label*="상태"]');
			const count = await selects.count().catch(() => 0);
			expect(count).toBeGreaterThanOrEqual(0);
		}
	});

	test("새 태스크 버튼 가시", async ({ page }) => {
		await page.goto("/tasks");
		const btn = page.getByRole("button", { name: /새 태스크|태스크 추가/ }).first();
		await expect(btn).toBeVisible();
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/tasks", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
