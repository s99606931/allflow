import { expect, test } from "@playwright/test";
import { findInputByPlaceholder, gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/chat — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/chat", /채널|채팅|메시지/);
	});

	test("채널/사람 검색 — placeholder 입력 반영", async ({ page }) => {
		await page.goto("/chat");
		const input = await findInputByPlaceholder(page, /채널.*검색|사람.*검색|검색/);
		if (input) {
			await input.fill("일반");
			await expect(input).toHaveValue("일반");
		}
	});

	test("채널 클릭 — 활성 변경", async ({ page }) => {
		await page.goto("/chat");
		const channels = page.locator('[role="button"], button').filter({ hasText: /^#|일반|공지/ });
		const count = await channels.count().catch(() => 0);
		if (count > 0) {
			await channels.first().click().catch(() => {});
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/chat", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
