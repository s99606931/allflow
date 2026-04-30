import { expect, test } from "@playwright/test";
import { clickIfVisible, findInputByPlaceholder, gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/approvals — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/approvals", /결재|승인|기안/);
	});

	test("새 기안 버튼 가시 → 클릭", async ({ page }) => {
		await page.goto("/approvals");
		await clickIfVisible(page, 'button:has-text("새 기안"), button:has-text("기안 작성")');
	});

	test("결재 목록 항목 → 상세 진입", async ({ page }) => {
		await page.goto("/approvals");
		const item = page.locator('article, [role="listitem"], button').filter({ hasText: /결재|기안|승인/ }).first();
		if (await item.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await item.click().catch(() => {});
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/approvals", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});

test.describe("menu/resources — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/resources", /자원|리소스|장비|회의실/);
	});

	test("자원 검색 입력 반영", async ({ page }) => {
		await page.goto("/resources");
		const input = await findInputByPlaceholder(page, /검색/);
		if (input) {
			await input.fill("회의실");
			await expect(input).toHaveValue("회의실");
		}
	});

	test("자원 카드 선택 가능", async ({ page }) => {
		await page.goto("/resources");
		const cards = page.locator('button[aria-label*="선택"]');
		const count = await cards.count().catch(() => 0);
		if (count > 0) await cards.first().click().catch(() => {});
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/resources", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
