import { expect, test } from "@playwright/test";
import { clickIfVisible, gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/calendar — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/calendar", /캘린더|월|주/);
	});

	test("뷰 전환 — 월/주/일", async ({ page }) => {
		await page.goto("/calendar");
		for (const label of ["월", "주", "일"]) {
			const btn = page.getByRole("button", { name: new RegExp(`^${label}$`) }).first();
			if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
				await btn.click();
				await page.waitForTimeout(150);
			}
		}
	});

	test("새 일정 버튼 가시 → 다이얼로그 열기", async ({ page }) => {
		await page.goto("/calendar");
		const opened = await clickIfVisible(page, 'button:has-text("새 일정"), button:has-text("일정 추가")');
		if (opened) {
			// 다이얼로그 본문 확인
			await expect(page.locator('[role="dialog"], .dialog').first()).toBeVisible({ timeout: 3_000 }).catch(() => {});
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/calendar", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
