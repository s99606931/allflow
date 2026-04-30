import { expect, test } from "@playwright/test";
import { findInputByPlaceholder, gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/notion — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/notion", /Notion|노션/);
	});

	test("검색 입력 — placeholder 매칭", async ({ page }) => {
		await page.goto("/notion");
		const input = await findInputByPlaceholder(page, /검색/);
		if (input) {
			await input.fill("팀 노트");
			await expect(input).toHaveValue("팀 노트");
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/notion", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
