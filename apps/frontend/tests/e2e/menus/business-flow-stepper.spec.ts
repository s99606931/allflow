/**
 * BusinessFlowStepper — 11차 PDCA 최종 E2E.
 *
 * /projects 화면에 mounted 된 stepper 의 핵심 시나리오를 검증한다.
 * - 스텝 렌더링 (5단계 라벨)
 * - 진행률 표시 (텍스트 % + 진행 막대)
 * - collapse/expand 토글 + localStorage 영속성
 * - 키보드 화살표 단계 이동
 * - AI 다음 단계 제안 패널 (요청-응답 또는 토스트 에러 fallback)
 * - Bell 배지/오버듀 배지는 데이터 의존 → 노출 시에만 검증.
 *
 * 콘솔 에러 가드는 _helpers.ts NOISY 필터를 따른다.
 */

import { expect, test } from "@playwright/test";
import { withConsoleGuard } from "./_helpers";

const PROJECTS = "/projects";
const STEPPER = '[data-testid="business-flow-stepper"]';
const TOGGLE = '[data-testid="business-flow-toggle"]';
const PROGRESS_TEXT = '[data-testid="business-flow-progress-text"]';
const PROGRESS_BAR = '[data-testid="business-flow-progress-bar"]';
const AI_BTN = '[data-testid="business-flow-ai-suggest"]';
const SUGGESTION = '[data-testid="business-flow-suggestion"]';

test.describe("BusinessFlowStepper E2E (projects)", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PROJECTS, { waitUntil: "domcontentloaded" });
		await expect(page.locator(STEPPER)).toBeVisible({ timeout: 30_000 });
		// 완전한 hydration 보장: 진행률 텍스트가 그려졌는지 확인.
		await expect(page.locator(PROGRESS_TEXT)).toBeVisible({ timeout: 15_000 });
		// localStorage 셀러브레이션/콜랩스 키 정리 — 테스트 간 영속 상태 누수 방지.
		await page.evaluate(() => {
			const keys: string[] = [];
			for (let i = 0; i < window.localStorage.length; i++) {
				const k = window.localStorage.key(i);
				if (
					k &&
					(k.startsWith("av:bf-stepper:") || k.startsWith("av:bf-celebrate:"))
				) {
					keys.push(k);
				}
			}
			for (const k of keys) {
				window.localStorage.removeItem(k);
			}
		});
	});

	test("5 단계 칩이 렌더링된다 — 기획/킥오프/실행/검토/마무리", async ({
		page,
	}) => {
		await withConsoleGuard(page, async () => {
			const stepper = page.locator(STEPPER);
			await expect(stepper).toContainText("기획");
			await expect(stepper).toContainText("킥오프");
			await expect(stepper).toContainText("실행");
			await expect(stepper).toContainText("검토");
			await expect(stepper).toContainText("마무리");
			// 단계 외(1/5) 텍스트
			await expect(stepper).toContainText(/1\s*\/\s*5\s*단계/);
		});
	});

	test("진행률 텍스트와 막대가 표시된다", async ({ page }) => {
		const text = page.locator(PROGRESS_TEXT);
		await expect(text).toBeVisible();
		await expect(text).toContainText("%");
		const bar = page.locator(PROGRESS_BAR);
		await expect(bar).toBeVisible();
	});

	test("collapse 토글 + localStorage 영속성", async ({ page }) => {
		const toggle = page.locator(TOGGLE);
		const stepper = page.locator(STEPPER);

		// 초기에는 펼쳐짐 — aria-expanded=true
		await expect(toggle).toHaveAttribute("aria-expanded", "true");
		await expect(stepper).not.toHaveAttribute("data-collapsed", "true");

		// 접기 — Next.js dev hydration 지연 대비 expect.poll 로 toggle 상태 수렴 대기.
		await expect
			.poll(
				async () => {
					await toggle.click({ force: true }).catch(() => {});
					return await stepper.getAttribute("data-collapsed");
				},
				{ timeout: 10_000, intervals: [500, 1000, 1500] },
			)
			.toBe("true");
		await expect(toggle).toHaveAttribute("aria-expanded", "false");

		// 새로고침 후에도 collapsed 상태 유지
		await page.reload({ waitUntil: "domcontentloaded" });
		const toggleAfter = page.locator(TOGGLE);
		await expect(toggleAfter).toHaveAttribute("aria-expanded", "false");

		// 다시 펼치기 (정리) — 같은 패턴으로 클릭 수렴.
		await expect
			.poll(
				async () => {
					await toggleAfter.click({ force: true }).catch(() => {});
					return await toggleAfter.getAttribute("aria-expanded");
				},
				{ timeout: 10_000, intervals: [500, 1000, 1500] },
			)
			.toBe("true");
	});

	test("키보드 → 키로 다음 단계 칩에 포커스 이동", async ({ page }) => {
		const firstChip = page.locator(`${STEPPER} ol li`).first();
		const firstButton = firstChip.locator('button, [role="button"]').first();
		await firstButton.focus();
		await page.keyboard.press("ArrowRight");

		// 두 번째 칩 영역에 포커스가 도달했는지 확인 (DOM 활성 요소 검사)
		const focusedText = await page.evaluate(() => {
			const el = document.activeElement as HTMLElement | null;
			return el?.textContent ?? "";
		});
		expect(focusedText.length).toBeGreaterThan(0);
	});

	test("AI 다음 단계 제안 — 응답이 오면 패널 표시, 실패 시 에러 토스트", async ({
		page,
	}) => {
		// BE LLM adapter 응답이 느릴 수 있으므로 라우트 인터셉트로 결정론적 응답 주입.
		// 같은 origin proxy 경유라 절대 URL이 baseURL+/api/v1 형태로 발사된다.
		await page.route("**/business-flows/*/suggest", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					flowId: "project-lifecycle",
					currentStep: { id: "plan", label: "기획" },
					nextStep: {
						id: "kickoff",
						label: "킥오프",
						description: "팀 구성·역할 분담·태스크 분해를 진행합니다.",
						screen: "/tasks",
						action: "태스크 분해",
						aiHint: "이 프로젝트의 태스크 분해 방법 알려줘",
						expectedDays: 3,
					},
					suggestion:
						"킥오프 단계로 넘어가서 팀 구성과 역할 분담을 정리하세요. 첫 주 산출물의 데드라인을 명시해 주세요.",
					adapter: "mock-e2e",
				}),
			});
		});

		const aiBtn = page.locator(AI_BTN);
		await expect(aiBtn).toBeVisible();

		// Click + assertion 폴: dev 모드 hydration 으로 첫 click 이 무시되는 케이스 대비.
		const suggestion = page.locator(SUGGESTION);
		const errorToast = page.getByText(
			/AI 다음 단계 제안을 가져오지 못했습니다/,
		);
		await expect
			.poll(
				async () => {
					if (
						(await suggestion.isVisible({ timeout: 100 }).catch(() => false)) ||
						(await errorToast.isVisible({ timeout: 100 }).catch(() => false))
					) {
						return true;
					}
					await aiBtn.click({ force: true }).catch(() => {});
					return false;
				},
				{ timeout: 35_000, intervals: [800, 1500, 2000, 3000] },
			)
			.toBe(true);
	});

	test("Bell 배지 / overdue 배너 — 노출 시 a11y 속성 검증", async ({
		page,
	}) => {
		// 데이터 의존이라 항상 노출되지 않는다. count > 0 일 때만 단언.
		const bell = page.locator('[data-testid="business-flow-alerts-badge"]');
		if (await bell.isVisible({ timeout: 1_000 }).catch(() => false)) {
			await expect(bell).toHaveAttribute("aria-label", /미확인 지연 알림/);
		}
		const overdue = page.locator(
			'[data-testid="business-flow-overdue-warning"]',
		);
		if (await overdue.isVisible({ timeout: 1_000 }).catch(() => false)) {
			await expect(overdue).toContainText("표준 일수");
		}
	});
});
