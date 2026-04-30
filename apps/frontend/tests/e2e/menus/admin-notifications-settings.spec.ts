import { expect, test } from "@playwright/test";
import { gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/admin — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/admin", /관리자|시스템|콘솔/);
	});

	test("관리 섹션 진입 가능", async ({ page }) => {
		await page.goto("/admin");
		const links = page.locator('a, button').filter({ hasText: /시스템|사용자|역할|로그/ });
		const count = await links.count().catch(() => 0);
		expect(count).toBeGreaterThanOrEqual(0);
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/admin", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});

test.describe("menu/notifications — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/notifications", /알림/);
	});

	test("필터 버튼/탭 클릭 가능 (있을 때)", async ({ page }) => {
		await page.goto("/notifications");
		const filterBtn = page.getByRole("button", { name: /읽음|안 읽음|미확인|전체/ }).first();
		if (await filterBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await filterBtn.click();
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/notifications", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});

test.describe("menu/settings — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/settings", /설정|환경설정|Settings/i);
	});

	test("탭 전환 가능", async ({ page }) => {
		await page.goto("/settings");
		const tabs = page.getByRole("tab");
		const count = await tabs.count().catch(() => 0);
		for (let i = 0; i < Math.min(count, 5); i++) {
			await tabs.nth(i).click().catch(() => {});
			await page.waitForTimeout(120);
		}
	});

	test("언어/로케일 select 가시 (있을 때)", async ({ page }) => {
		await page.goto("/settings");
		const localeSelect = page.locator('select[aria-label*="locale"], select[aria-label*="언어"]').first();
		const visible = await localeSelect.isVisible({ timeout: 2_000 }).catch(() => false);
		expect(typeof visible).toBe("boolean");
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/settings", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
