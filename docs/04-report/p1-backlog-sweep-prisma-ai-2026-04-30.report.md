# Report — P1 백로그 Sweep (Prisma AI 모델 + FE AI 패널) 2026-04-30

> feature: `p1-backlog-sweep-prisma-ai`
> 작성: av-pm-team STEP 6 | 2026-04-30
> 선행 사이클: `p1-backlog-sweep-2026-04-30` (T1~T4 ✓, T5 사용자 액션 대기)

## 1. 본 사이클 범위

이전 에이전트가 시작한 AI 모듈 작업의 정리·완성·커밋. 미완성 코드의 typecheck/test/lint 통과시키고 DCO -s 커밋으로 정리.

| 항목 | 상태 |
|------|------|
| Prisma `AiThread` / `AiMessage` / `AiAttachment` / `McpConnection` 모델 + 라우트 | DONE (이전 커밋 `e66c1fd`, `50ed228`) |
| AI thread CRUD 엔드포인트 (`/ai/threads/*`) | DONE |
| AI 첨부파일 업로드 (`/ai/attachments`) — `@fastify/multipart` 도입 | DONE |
| ToolDispatcher (`search_tasks` + `search_issues`) | DONE |
| Web search adapter (Searx/NG + Noop) | DONE |
| FE: AI 스레드 사이드바 + 마크다운 렌더러 + 음성 입력 + 파일 첨부 훅 | DONE |
| FE: users 초대 다이얼로그 + CSV 내보내기 | DONE |
| FE: hr 휴가 신청 BE wiring | DONE |
| FE: resources / dashboard BE wiring | DONE |
| FE: AI 패널 → `use-ai` 훅 추상화 | DONE |
| **본 사이클 fix**: typecheck 4건 + 신규 unit test 3건 | DONE (커밋 `814582e`) |

## 2. 본 사이클에서 직접 수정한 파일

### 2.1 BE (커밋 `814582e`)
- `apps/backend/src/modules/ai/ai-thread.routes.ts` — `req.user.sub` (존재 X) → `req.user!.id` (AuthUser 정합)
- `apps/backend/src/modules/ai/mcp-connection.routes.ts` — `config: Record<string, unknown>` → `Prisma.InputJsonValue` 캐스팅
- `apps/backend/src/modules/ai/tool-dispatcher.ts` — `prisma.doc` (모델 미존재) → `prisma.issue` 로 교체, `search_docs` → `search_issues` 리네이밍
- `apps/backend/src/modules/ai/tool-dispatcher.test.ts` — search_issues 정합 테스트 변경
- `apps/backend/src/modules/ai/web-search-adapter.ts` — `NoopWebSearchAdapter.search(query, maxResults?)` 시그니처 정합

### 2.2 FE (커밋 `4333bce`)
- `apps/frontend/src/components/screens/{users,hr,resources,dashboard}.tsx`
- `apps/frontend/src/components/shell/ai-panel.tsx`
- `apps/frontend/src/lib/hooks/{use-data,use-hr,use-ai}.ts`
- `apps/frontend/src/lib/{api,query-keys}.ts`

## 3. 검증 게이트

| Gate | 결과 |
|------|------|
| BE typecheck (`pnpm typecheck`) | PASS — 0 errors |
| BE unit + integration (`pnpm test`) | **357/357 PASS** (베이스라인 325/325 → +32 new tests) |
| BE lint (`pnpm lint` biome) | PASS — 0 errors |
| FE typecheck (`pnpm typecheck`) | PASS — 0 errors (`.next/types` 캐시 클린 후) |
| FE unit (`pnpm test`) | **71/71 PASS** |
| FE lint (`pnpm lint` eslint) | PASS — 0 errors / 7 warnings (pre-existing) |
| DCO `-s` signoff | 2 commits 모두 `Signed-off-by` 포함 |

## 4. 학습 사항 (메모리 저장 대상)

1. **req.user 타입 일관성** — AllFlow 프로젝트의 `AuthUser` 인터페이스는 `id` 필드 사용 (next-auth `sub` 클레임 ≠ runtime user 객체). 신규 라우트 작성 시 `req.user!.id` 패턴이 표준.
2. **Prisma JSON 컬럼 캐스팅** — Zod `z.record(z.string(), z.unknown())` 결과를 Prisma `Json` 컬럼에 직접 대입 시 `Type 'Record<string, unknown>' is not assignable to JsonNull | InputJsonValue` 발생. `as Prisma.InputJsonValue` 캐스팅이 정해(定解).
3. **모델 부재 검증 (in-memory store 함정)** — `Doc` 도메인은 `docs.routes.ts`에서 in-memory `Map<string, DocRow>` 로 운영됨. 새 코드가 `prisma.doc.findMany` 호출 시 typecheck 실패. 도메인이 영속 vs 인메모리인지 schema.prisma 우선 확인이 prereq.
4. **Test 작성 시 모델 정합** — tool-dispatcher 처럼 BUILTIN_TOOLS 의 의미적 변경은 test mock prisma 필드까지 동기화 필요 (`doc` → `issue`). 테스트 모킹 키 = 실제 prisma 모델 키.

## 5. 산출물 위치

- 코드: `apps/backend/src/modules/ai/*` + `apps/frontend/src/components/{screens,shell,ai}/*` + `apps/frontend/src/lib/hooks/use-ai.ts`
- 본 보고서: `docs/04-report/p1-backlog-sweep-prisma-ai-2026-04-30.report.md`
- 커밋: `814582e` (BE fix) + `4333bce` (FE wiring)

## 6. 다음 단계

- T5 (Vercel Turbo Remote Cache) 사용자 `npx turbo login` 액션 대기 — 사용자 합류 후 자동 재개.
- AI 패널 E2E 회귀 (Playwright) — 신규 use-ai 훅 streaming 경로 커버리지 확보.
- MCP 커넥션 라이브 통합 (현재는 등록/조회만, stdio/sse 실 dispatch 미구현).
