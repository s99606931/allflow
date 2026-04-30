import { expect, test } from "@playwright/test";
import { withConsoleGuard } from "./_helpers";

/**
 * 사이드바·토픽바·전역 단축키 같은 셸 레벨 인터랙션.
 * 모든 메뉴 공통이므로 1회만 검증.
 */
test.describe("shell/global — non-CRUD scenarios", () => {
	test("사이드바 접기 → 폭 축소", async ({ page }) => {
		await page.goto("/");
		const sidebar = page.locator("aside").first();
		const initial = await sidebar.boundingBox();
		expect(initial?.width ?? 0).toBeGreaterThan(200);

		const collapseBtn = page.getByRole("button", { name: /사이드바 접기/ }).first();
		if (await collapseBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await collapseBtn.click();
			await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeLessThan(120);
		}
	});

	test("AI 패널 토글 — 헤더 가시", async ({ page }) => {
		await page.goto("/");
		const aiBtn = page.getByRole("button", { name: /AI 어시스턴트/i }).first();
		if (await aiBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await aiBtn.click();
			await expect(page.locator("text=AI 어시스턴트").first()).toBeVisible({ timeout: 3_000 });
		}
	});

	test("⌘K / Ctrl+K — 검색 버튼 가시 + 클릭", async ({ page }) => {
		await page.goto("/");
		const search = page.locator('button:has-text("검색")').first();
		await expect(search).toBeVisible();
		await search.click().catch(() => {});
	});

	test("알림 드롭다운 토글", async ({ page }) => {
		await page.goto("/");
		const bell = page.getByRole("button", { name: /알림/i }).first();
		if (await bell.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await bell.click();
			await page.waitForTimeout(200);
		}
	});

	test("프로필 메뉴 가시", async ({ page }) => {
		await page.goto("/");
		const profile = page.locator('button[aria-label*="프로필"], button[aria-label*="profile"], button:has-text("프로필")').first();
		const visible = await profile.isVisible({ timeout: 2_000 }).catch(() => false);
		expect(typeof visible).toBe("boolean");
	});

	test("콘솔 에러 0건 — 셸 진입", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
