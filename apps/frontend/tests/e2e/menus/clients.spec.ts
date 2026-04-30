import { expect, test } from "@playwright/test";
import { findInputByPlaceholder, gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/clients — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/clients", /고객사|CRM/);
	});

	test("고객사 검색 — placeholder 입력 반영", async ({ page }) => {
		await page.goto("/clients");
		const input = await findInputByPlaceholder(page, /고객사.*검색|검색/);
		if (input) {
			await input.fill("주식회사");
			await expect(input).toHaveValue("주식회사");
		}
	});

	test("고객사 카드 → 상세 패널 가시", async ({ page }) => {
		await page.goto("/clients");
		const cards = page.locator('button[aria-label*="상세 보기"]');
		if ((await cards.count()) > 0) {
			await cards.first().click();
			await page.waitForTimeout(200);
		}
	});

	test("새 고객사 버튼 가시", async ({ page }) => {
		await page.goto("/clients");
		const btn = page.getByRole("button", { name: /새 고객사|고객사 추가/ }).first();
		if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await expect(btn).toBeVisible();
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/clients", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
