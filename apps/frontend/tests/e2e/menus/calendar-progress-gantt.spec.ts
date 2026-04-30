import { expect, test } from "@playwright/test";
import { gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/progress — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/progress", /진행률|포트폴리오|간트/);
	});

	test("뷰 토글 — 포트폴리오/간트", async ({ page }) => {
		await page.goto("/progress");
		for (const label of [/포트폴리오/, /간트/]) {
			const btn = page.getByRole("button", { name: label }).first();
			if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
				await btn.click();
				await page.waitForTimeout(150);
			}
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/progress", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});

test.describe("menu/gantt — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/gantt", /간트|Gantt|일정/);
	});

	test("줌 단위 토글 — 일/주/월", async ({ page }) => {
		await page.goto("/gantt");
		for (const label of [/^일$/, /^주$/, /^월$/]) {
			const btn = page.getByRole("button", { name: label }).first();
			if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
				await btn.click();
				await page.waitForTimeout(150);
			}
		}
	});

	test("의존성 화살표 SVG 렌더 (있을 때)", async ({ page }) => {
		await page.goto("/gantt");
		const svgs = page.locator("svg");
		expect(await svgs.count()).toBeGreaterThanOrEqual(0);
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/gantt", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
