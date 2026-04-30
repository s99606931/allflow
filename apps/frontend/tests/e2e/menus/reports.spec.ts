import { expect, test } from "@playwright/test";
import { gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/reports/weekly — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/reports/weekly", /주간|보고/);
	});

	test("주차 이동 버튼 — 이전/다음", async ({ page }) => {
		await page.goto("/reports/weekly");
		for (const label of [/이전|prev|◀/, /다음|next|▶/]) {
			const btn = page.getByRole("button", { name: label }).first();
			if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
				await btn.click();
				await page.waitForTimeout(150);
			}
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/reports/weekly", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});

test.describe("menu/reports/monthly — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/reports/monthly", /월간|보고/);
	});

	test("월 이동 버튼 — 이전/다음", async ({ page }) => {
		await page.goto("/reports/monthly");
		for (const label of [/이전|prev|◀/, /다음|next|▶/]) {
			const btn = page.getByRole("button", { name: label }).first();
			if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
				await btn.click();
				await page.waitForTimeout(150);
			}
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/reports/monthly", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
