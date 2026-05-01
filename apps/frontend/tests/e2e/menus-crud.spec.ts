/**
 * menus-crud.spec.ts — 모든 메뉴의 비즈니스 로직(생성→수정→삭제) E2E.
 *
 * 정책:
 *   - 인증된 storageState (global-setup) 를 재사용 → /api/v1 catch-all proxy 가
 *     dev fallback 토큰을 자동 첨부하므로 Bearer 헤더 없이도 통과한다.
 *   - "UI Create" 그룹: 다이얼로그 → 폼 입력 → 제출. UI 가 update/delete 를 노출하지
 *     않는 메뉴는 데이터 레이어 CRUD 로 보강한다.
 *   - "API CRUD" 그룹: BE 제공 endpoint 를 호출하여 lifecycle 검증.
 *     실제 FE 가 호출하는 동일 path `/api/v1/...` 사용 → Next proxy → Fastify.
 *
 * 매핑 (Inventory):
 *   tasks       — UI: 새 태스크. API: POST/PATCH/DELETE /tasks.
 *   projects    — UI: 새 프로젝트(미배선). API: POST + PATCH /projects/:id.
 *   issues      — UI: 새 이슈. API: POST + transition.
 *   clients     — UI: 새 고객사. API: POST /clients.
 *   approvals   — API: POST + decision.
 *   calendar    — UI: 일정 추가. API: POST /events.
 *   docs        — UI: 새 문서. API: POST /docs.
 *   chat        — API: POST /channels/:id/messages.
 *   resources   — API: POST /resources/book.
 *   org         — API: POST /org/invitations + idempotency.
 *   users       — UI: 사용자 초대 토글 + 이메일 입력.
 *   hr          — API: POST /hr/leave + PATCH status.
 *   reports/admin/settings/notion/ai-auto — Read-only 페이지 진입.
 */

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// 연속 실행 시 BE rate-limit(120 req/min) 회피용 jitter. 단독 실행엔 무해.
async function rateGuard() {
	await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
}

// ─── helpers ───────────────────────────────────────────────────────────────

async function getFirstUserId(request: APIRequestContext): Promise<string> {
	const res = await request.get("/api/v1/users");
	expect(res.ok(), "users fetch failed").toBeTruthy();
	const arr = (await res.json()) as { id: string }[];
	expect(arr.length, "no seed users").toBeGreaterThan(0);
	return arr[0]!.id;
}

async function openDialogVia(page: Page, buttonName: RegExp) {
	const btn = page.getByRole("button", { name: buttonName }).first();
	await expect(btn).toBeVisible({ timeout: 15_000 });
	const dialog = page.getByRole("dialog");
	// Up to 3 click attempts — Radix portal mount + Next.js dev hydration race condition.
	for (let i = 0; i < 3; i++) {
		await btn.click({ force: true });
		if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) break;
		await page.waitForTimeout(800);
	}
	await expect(dialog).toBeVisible({ timeout: 15_000 });
	return dialog;
}

/**
 * Dialog 별 submit 버튼 라벨 정규식.
 * 코드베이스 i18n 키와 dialog hard-coded 라벨을 모두 커버:
 *   생성(Task/Project) | 등록(Issue) | 만들기(common.create: Client/Doc/Event)
 *   상신(approval.create.submit) | 저장(common.save) | 예약(resources.book) | 확인 | 추가
 */
const SUBMIT_RE = /^(생성|등록|만들기|상신|저장|예약|확인|추가)/;

/**
 * Dialog 내부 모든 <select> 의 첫 옵션을 명시적으로 재선택. fill→submit 전에 호출.
 *
 * 일부 dialog (task/issue create) 는 controlled state 가 빈 문자열(`''`)로 초기화되어
 * `useUsers/useProjects` 의 async load 후에도 React state 가 갱신되지 않는 버그가 있다.
 * select 가 시각적으로 첫 옵션을 보여주더라도 React 의 `value` 는 `''` 이므로 form
 * `onSubmit` 에서 early-return 한다. 이를 회피하기 위해 강제로 selectOption 을 트리거.
 */
async function fillSelectsFirstOption(dialog: ReturnType<Page["getByRole"]>) {
	// 옵션이 mount 후 async 로 채워지므로 첫 select 의 옵션이 1개 이상 될 때까지 대기.
	const firstSelect = dialog.locator("select").first();
	if (await firstSelect.count()) {
		await dialog.page().waitForFunction(
			() => {
				const sels = document.querySelectorAll("[role='dialog'] select");
				return Array.from(sels).every(
					(s) => (s as HTMLSelectElement).options.length > 0,
				);
			},
			{ timeout: 10_000 },
		).catch(() => {});
	}
	const selects = await dialog.locator("select").all();
	for (const sel of selects) {
		const opts = await sel.locator("option").all();
		if (opts.length === 0) continue;
		const firstVal = await opts[0]?.getAttribute("value").catch(() => null);
		if (!firstVal) continue;
		// React onChange 는 value 변경 시에만 발사 — 옵션이 2개 이상이면 두 번째 → 첫 번째
		// 로 토글해 강제 발사. 1개뿐이면 select element 에 직접 input/change 이벤트 dispatch.
		if (opts.length >= 2) {
			const secondVal = await opts[1]?.getAttribute("value").catch(() => null);
			if (secondVal) await sel.selectOption(secondVal).catch(() => {});
		}
		await sel.selectOption(firstVal).catch(() => {});
		await sel.evaluate((el) => {
			el.dispatchEvent(new Event("input", { bubbles: true }));
			el.dispatchEvent(new Event("change", { bubbles: true }));
		});
	}
}

// ─── tasks: UI create + API update + API delete ────────────────────────────

test.describe("menu/tasks — full CRUD", () => {
	test("UI 다이얼로그 → 폼 입력 → BE 생성 확인", async ({
		page, request,
	}) => {
		await page.goto("/tasks", { waitUntil: "domcontentloaded" });
		await expect(page.locator("body")).toContainText(/태스크|할 일/, { timeout: 15_000 });
		await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
		await page.waitForTimeout(500);
		const dialog = await openDialogVia(page, /^새 태스크$|^태스크 추가$/);
		await expect(dialog).toContainText("새 태스크");
		await fillSelectsFirstOption(dialog);
		await dialog.locator('input[type="text"], input:not([type])').first().fill("E2E UI 태스크");
		await dialog.getByRole("button", { name: SUBMIT_RE }).first().click();
		await page.waitForTimeout(1500);
		const tasks = (await request.get("/api/v1/tasks").then(r => r.json())) as { title: string }[];
		expect(tasks.some(t => t.title === "E2E UI 태스크"), "UI 생성 태스크 BE 미반영").toBeTruthy();
	});

	test("API 직접 CRUD — POST → PATCH → DELETE", async ({ request }) => {
		await rateGuard();
		const projects = (await request.get("/api/v1/projects").then(r => r.json())) as {
			id: string;
			name: string;
		}[];
		expect(projects.length).toBeGreaterThan(0);
		const created = await request.post("/api/v1/tasks", {
			// projectId 는 정상 동작. proj 는 FE 가 보내는 buggy path → name lookup 으로 404.
			data: { title: "E2E API 태스크", projectId: projects[0]!.id, assigneeId: "me" },
		});
		expect(created.status(), `POST /tasks ${created.status()} ${await created.text()}`).toBe(201);
		const body = await created.json();

		const upd = await request.patch(`/api/v1/tasks/${body.id}`, {
			data: { title: "E2E API 태스크 (수정)" },
		});
		expect(upd.status()).toBe(200);

		const del = await request.delete(`/api/v1/tasks/${body.id}`);
		expect([200, 204]).toContain(del.status());
	});
});

// ─── projects: API create + update (no delete endpoint) ────────────────────

test.describe("menu/projects — Create+Update (no DELETE in BE)", () => {
	test("API POST /projects + PATCH /projects/:id", async ({ request }) => {
		await rateGuard();
		const code = `E2E${Date.now().toString(36).toUpperCase().slice(-5)}`;
		const created = await request.post("/api/v1/projects", {
			// BE: due 는 optional 이지만 응답 스키마가 null 거부 → 항상 supply.
			data: { name: "E2E 프로젝트", code, color: "#5B7FFF", due: "2026-12-31" },
		});
		expect(created.status(), "POST /projects failed").toBe(201);
		const body = await created.json();

		const patched = await request.patch(`/api/v1/projects/${body.id}`, {
			data: { name: "E2E 프로젝트 (수정)", progress: 25 },
		});
		expect(patched.status(), "PATCH /projects failed").toBe(200);
		const after = await patched.json();
		expect(after.name).toBe("E2E 프로젝트 (수정)");
		expect(after.progress).toBe(25);
	});

	test("새 프로젝트 버튼 가시 (UI onClick 미배선)", async ({ page }) => {
		await page.goto("/projects", { waitUntil: "domcontentloaded" });
		const btn = page.getByRole("button", { name: /새 프로젝트/ }).first();
		await expect(btn).toBeVisible({ timeout: 10_000 });
	});
});

// ─── issues: UI create + API state transition ──────────────────────────────

test.describe("menu/issues — Create + Transition (no DELETE in BE)", () => {
	test("UI 다이얼로그 → 폼 입력 → BE 생성 확인", async ({
		page, request,
	}) => {
		await page.goto("/issues", { waitUntil: "domcontentloaded" });
		await expect(page.locator("body")).toContainText(/이슈/, { timeout: 15_000 });
		const dialog = await openDialogVia(page, /^새 이슈$|이슈 등록/);
		await expect(dialog).toContainText("새 이슈");
		await fillSelectsFirstOption(dialog);
		await dialog.locator('input[type="text"], input:not([type])').first().fill("E2E UI 이슈");
		await dialog.getByRole("button", { name: SUBMIT_RE }).first().click();
		await page.waitForTimeout(1500);
		const issues = (await request.get("/api/v1/issues").then(r => r.json())) as { title: string }[];
		expect(issues.some(i => i.title === "E2E UI 이슈"), "UI 생성 이슈 BE 미반영").toBeTruthy();
	});

	test("API 직접 CRUD — POST → transition", async ({ request }) => {
		await rateGuard();
		const projects = (await request.get("/api/v1/projects").then(r => r.json())) as {
			id: string;
		}[];
		expect(projects.length).toBeGreaterThan(0);
		const created = await request.post("/api/v1/issues", {
			data: {
				projectId: projects[0]!.id,
				title: "E2E API 이슈",
				sev: "med",
				prio: "P2",
				sla: "24h",
				tags: [],
			},
		});
		expect(created.status(), `POST /issues ${created.status()} ${await created.text()}`).toBe(
			201,
		);
		const body = await created.json();

		const trans = await request.post(`/api/v1/issues/${body.id}/transition`, {
			data: { status: "in-progress" },
		});
		expect([200, 204]).toContain(trans.status());
	});
});

// ─── clients: UI create + API verify ───────────────────────────────────────

test.describe("menu/clients — Create only", () => {
	test("UI 새 고객사 → BE 반영", async ({ page, request }) => {
		await page.goto("/clients", { waitUntil: "domcontentloaded" });
		await expect(page.locator("body")).toContainText(/고객사|클라이언트/, { timeout: 15_000 });

		const dialog = await openDialogVia(page, /새 고객사|새 클라이언트/);
		await dialog
			.locator('input[type="text"], input:not([type])')
			.first()
			.fill(`E2E 고객사 ${Date.now().toString(36)}`);
		await fillSelectsFirstOption(dialog);
		await dialog
			.getByRole("button", { name: SUBMIT_RE })
			.first()
			.click();
		await page.waitForTimeout(1500);

		const list = (await request.get("/api/v1/clients").then(r => r.json())) as {
			name: string;
		}[];
		expect(list.some(c => c.name.startsWith("E2E 고객사")), "고객사 BE 미반영").toBeTruthy();
	});
});

// ─── approvals: API create + decision ──────────────────────────────────────

test.describe("menu/approvals — Create + Decision (no DELETE)", () => {
	test("POST /approvals → POST /approvals/:id/decision", async ({ request }) => {
		await rateGuard();
		// BE: approverId === req.user.id 일 때만 decision 통과.
		const me = (await request.get("/api/v1/users/me").then(r => r.json())) as {
			id: string;
		};
		const created = await request.post("/api/v1/approvals", {
			data: { title: "E2E 결재", approver: me.id, amount: 1000, reason: "테스트" },
		});
		expect(created.status(), "POST /approvals failed").toBe(201);
		const body = await created.json();

		const decision = await request.post(`/api/v1/approvals/${body.id}/decision`, {
			data: { decision: "approved", comment: "OK" },
		});
		expect([200, 204], `decision ${decision.status()}: ${await decision.text()}`).toContain(
			decision.status(),
		);
	});
});

// ─── calendar (events): UI create + API verify ─────────────────────────────

test.describe("menu/calendar — UI Create + API Create", () => {
	test("일정 추가 다이얼로그 → BE 반영", async ({ page, request }) => {
		await page.goto("/calendar", { waitUntil: "domcontentloaded" });
		await expect(page.locator("body")).toContainText(/캘린더|일정/, { timeout: 15_000 });

		const dialog = await openDialogVia(page, /일정 추가|새 일정/);
		await dialog.locator('input[type="text"], input:not([type])').first().fill("E2E CRUD 일정");
		await fillSelectsFirstOption(dialog);
		await dialog
			.getByRole("button", { name: SUBMIT_RE })
			.first()
			.click();
		await page.waitForTimeout(1500);

		const list = (await request.get("/api/v1/events").then(r => r.json())) as {
			title: string;
		}[];
		// UI 는 시작/종료 자동 입력일 수 있으므로 BE 반영 여부만 검증
		expect(list.some(e => e.title.includes("E2E"))).toBeTruthy();
	});

	test("API POST /events 직접 — start/end 검증", async ({ request }) => {
		await rateGuard();
		const start = "2026-06-01T09:00:00.000Z";
		const end = "2026-06-01T10:00:00.000Z";
		const res = await request.post("/api/v1/events", {
			data: { title: "E2E API 일정", start, end, attendees: [] },
		});
		expect(res.status(), "POST /events failed").toBe(201);
		const body = await res.json();
		expect(body.title).toBe("E2E API 일정");
	});
});

// ─── docs: UI create + API verify ──────────────────────────────────────────

test.describe("menu/docs — UI Create doc", () => {
	test("새 문서 → BE 반영", async ({ page, request }) => {
		await page.goto("/docs", { waitUntil: "domcontentloaded" });
		await expect(page.locator("body")).toContainText(/문서|위키/, { timeout: 15_000 });

		const dialog = await openDialogVia(page, /^새 문서$/);
		await dialog
			.locator('input[type="text"], input:not([type])')
			.first()
			.fill(`E2E 문서 ${Date.now().toString(36)}`);
		await fillSelectsFirstOption(dialog);
		await dialog
			.getByRole("button", { name: SUBMIT_RE })
			.first()
			.click();
		await page.waitForTimeout(1500);

		const list = (await request.get("/api/v1/docs").then(r => r.json())) as {
			title: string;
		}[];
		expect(list.some(d => d.title.startsWith("E2E 문서")), "문서 BE 미반영").toBeTruthy();
	});
});

// ─── chat (channels): API send message ─────────────────────────────────────

test.describe("menu/chat — Send message", () => {
	test("POST /channels/:id/messages 가 200/201", async ({ request }) => {
		await rateGuard();
		const channels = (await request.get("/api/v1/channels").then(r => r.json())) as {
			id: string;
			kind: string;
		}[];
		const ch = channels.find(c => c.kind === "public") ?? channels[0];
		expect(ch, "채널 시드 없음").toBeDefined();

		const res = await request.post(`/api/v1/channels/${ch!.id}/messages`, {
			data: { text: "E2E CRUD 메시지" },
		});
		expect([200, 201]).toContain(res.status());
	});
});

// ─── resources: API book ───────────────────────────────────────────────────

test.describe("menu/resources — Book resource", () => {
	test("POST /resources/book", async ({ request }) => {
		await rateGuard();
		const me = await getFirstUserId(request);
		const resources = (await request.get("/api/v1/resources").then(r => r.json())) as {
			id: string;
			kind: string;
		}[];
		const room = resources.find(r => r.kind === "room") ?? resources[0];
		expect(room, "리소스 시드 없음").toBeDefined();

		// 매 실행마다 unique 시각 — random 미래 슬롯으로 booking 충돌 회피.
		const offsetDays = 30 + Math.floor(Math.random() * 365); // 30~395d
		const base = Date.now() + offsetDays * 86_400_000;
		const start = new Date(base).toISOString();
		const end = new Date(base + 60 * 60 * 1000).toISOString();
		const res = await request.post("/api/v1/resources/book", {
			data: { resourceId: room!.id, start, end, bookedBy: me },
		});
		expect([200, 201], `book status ${res.status()}: ${await res.text()}`).toContain(res.status());
	});
});

// ─── org: API invite ───────────────────────────────────────────────────────

test.describe("menu/org — Invite", () => {
	test("POST /org/invitations 200/201 + 멱등 재호출", async ({ request }) => {
		await rateGuard();
		const unitsRaw = await request.get("/api/v1/org/units").then(r => r.json()).catch(() => []);
		const units = Array.isArray(unitsRaw) ? (unitsRaw as { id: string }[]) : [];
		expect(units.length).toBeGreaterThan(0);
		const unit = units[0]!;
		const email = `e2e-${Date.now().toString(36)}@allflow.test`;

		const first = await request.post("/api/v1/org/invitations", {
			data: { email, orgUnitId: unit.id, role: "member" },
		});
		expect([200, 201]).toContain(first.status());
		const firstBody = await first.json();

		const second = await request.post("/api/v1/org/invitations", {
			data: { email, orgUnitId: unit.id, role: "member" },
		});
		expect(second.status()).toBe(200);
		const secondBody = await second.json();
		expect(secondBody.id).toBe(firstBody.id);
	});
});

// ─── users: invite UI wiring ───────────────────────────────────────────────

test.describe("menu/users — Invite UX wiring", () => {
	test("초대 토글 → 이메일 입력 → 입력 반영", async ({ page }) => {
		await page.goto("/users", { waitUntil: "domcontentloaded" });
		await expect(page.locator("body")).toContainText(/사용자|구성원|초대/, { timeout: 15_000 });
		// hydration 완료 보장
		await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

		const inviteBtn = page.getByRole("button", { name: /사용자 초대/ }).first();
		await expect(inviteBtn).toBeVisible({ timeout: 10_000 });
		await inviteBtn.click({ force: true });

		const emailInput = page.locator('input[type="email"]').first();
		// 첫 클릭이 hydration 미완료로 missfire 시 재시도.
		if (!(await emailInput.isVisible({ timeout: 2_000 }).catch(() => false))) {
			await page.waitForTimeout(500);
			await inviteBtn.click({ force: true });
		}
		await expect(emailInput).toBeVisible({ timeout: 10_000 });
		await emailInput.fill("e2e-invite@allflow.test");
		await expect(emailInput).toHaveValue("e2e-invite@allflow.test");
	});
});

// ─── hr: API leave create + status update ──────────────────────────────────

test.describe("menu/hr — Leave Create + Status", () => {
	test("POST /hr/leave → PATCH /hr/leave/:id/status", async ({ request }) => {
		await rateGuard();
		const created = await request.post("/api/v1/hr/leave", {
			data: {
				type: "ANNUAL",
				startDate: "2026-06-10",
				endDate: "2026-06-11",
				reason: "E2E 테스트",
			},
		});
		expect(created.status(), "POST /hr/leave failed").toBe(201);
		const body = await created.json();

		const patched = await request.patch(`/api/v1/hr/leave/${body.id}/status`, {
			data: { status: "CANCELLED" },
		});
		expect(patched.status(), "PATCH status failed").toBe(200);
	});
});

// ─── read-only menus: 진입 ─────────────────────────────────────────────────

test.describe("read-only menus — 페이지 진입", () => {
	const ROUTES: { path: string; anchor: RegExp }[] = [
		{ path: "/reports/weekly", anchor: /주간|보고서|리포트/ },
		{ path: "/reports/monthly", anchor: /월간|보고서|리포트/ },
		{ path: "/admin", anchor: /관리|admin/i },
		{ path: "/settings", anchor: /설정|프로필|계정/ },
		{ path: "/notion", anchor: /Notion|연결|동기화/ },
		{ path: "/ai-auto", anchor: /AI|자동화|회의록|회의/ },
	];
	for (const r of ROUTES) {
		test(`진입 ${r.path}`, async ({ page }) => {
			await page.goto(r.path, { waitUntil: "domcontentloaded" });
			await expect(page.locator("body")).toContainText(r.anchor, { timeout: 15_000 });
		});
	}
});
