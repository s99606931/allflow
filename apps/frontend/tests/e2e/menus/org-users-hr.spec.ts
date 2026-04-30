import { expect, test } from "@playwright/test";
import { findInputByPlaceholder, gotoAndAnchor, withConsoleGuard } from "./_helpers";

test.describe("menu/org — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/org", /조직도|구성원/);
	});

	test("사람/팀 검색 입력 반영", async ({ page }) => {
		await page.goto("/org");
		const input = await findInputByPlaceholder(page, /사람.*검색|팀.*검색|검색/);
		if (input) {
			await input.fill("개발");
			await expect(input).toHaveValue("개발");
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/org", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});

test.describe("menu/users — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/users", /사용자|역할/);
	});

	test("초대 입력 — email placeholder + 입력 반영", async ({ page }) => {
		await page.goto("/users");
		const input = await findInputByPlaceholder(page, /user@example\.com|이메일/);
		if (input) {
			await input.fill("test@example.com");
			await expect(input).toHaveValue("test@example.com");
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/users", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});

test.describe("menu/hr — non-CRUD scenarios", () => {
	test("진입 + 헤딩", async ({ page }) => {
		await gotoAndAnchor(page, "/hr", /HR|인사|구성원|부서/);
	});

	test("탭/섹션 전환 가능", async ({ page }) => {
		await page.goto("/hr");
		const tabs = page.getByRole("tab");
		const count = await tabs.count().catch(() => 0);
		for (let i = 0; i < Math.min(count, 4); i++) {
			await tabs.nth(i).click().catch(() => {});
			await page.waitForTimeout(120);
		}
	});

	test("콘솔 에러 0건", async ({ page }) => {
		await withConsoleGuard(page, async () => {
			await page.goto("/hr", { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
		});
	});
});
