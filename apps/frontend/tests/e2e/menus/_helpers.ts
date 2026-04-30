/**
 * av-base-browser-e2e — 메뉴별 시나리오 공용 헬퍼.
 *
 * 콘솔 에러 가드(smoke 와 동일 필터), 안전 클릭, 안전 가시성 체크 등.
 */

import { type Page, expect } from "@playwright/test";

const NOISY = /Failed to load resource|404|Hydration|favicon|net::ERR|ResizeObserver/i;

/**
 * 페이지에서 발생한 pageerror / console.error 를 수집하고
 * fn 종료 후 0 건이어야 함을 단언.
 */
export async function withConsoleGuard(page: Page, fn: () => Promise<void>) {
	const errors: string[] = [];
	page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
	page.on("console", (msg) => {
		if (msg.type() !== "error") return;
		const text = msg.text();
		if (NOISY.test(text)) return;
		errors.push(`console.error: ${text}`);
	});
	await fn();
	expect(errors, `JavaScript 에러 발생:\n${errors.join("\n")}`).toEqual([]);
}

/**
 * 요소가 보이면 클릭, 아니면 false 반환. 필수 인터랙션이 아닌 곳에서 사용.
 */
export async function clickIfVisible(
	page: Page,
	selector: Parameters<Page["locator"]>[0],
	timeout = 2_000,
): Promise<boolean> {
	const loc = page.locator(selector).first();
	if (await loc.isVisible({ timeout }).catch(() => false)) {
		await loc.click().catch(() => {});
		return true;
	}
	return false;
}

/**
 * placeholder 텍스트로 input 을 찾고, 없으면 null 반환.
 */
export async function findInputByPlaceholder(page: Page, pattern: RegExp) {
	const inputs = await page.locator("input[placeholder]").all();
	for (const inp of inputs) {
		const ph = (await inp.getAttribute("placeholder")) ?? "";
		if (pattern.test(ph)) return inp;
	}
	return null;
}

/**
 * 라우트 진입 + 본문에 anchor 텍스트가 보일 때까지 대기.
 */
export async function gotoAndAnchor(
	page: Page,
	href: string,
	anchor: RegExp,
	timeout = 12_000,
) {
	await page.goto(href, { waitUntil: "domcontentloaded" });
	await expect(page.locator("body")).toContainText(anchor, { timeout });
}
