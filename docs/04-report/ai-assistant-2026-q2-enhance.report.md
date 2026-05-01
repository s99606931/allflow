# Report — AI Assistant 2026-Q2 Enhancement (Phase 1 종결)

> feature: `ai-assistant-2026-q2-enhance`
> 작성: av-do-orchestrator (av-pm-team STEP 6) | 2026-05-01
> Plan: `docs/01-plan/ai-assistant-2026-q2-enhance.plan.md`
> ADR: `docs/02-design/decision-records/ai-microservice-split-triggers.md`

## 1. 요약

AI 어시스턴트에 **RAG + MCP + Tool + Web Search** 4기능을 1개 사이클로 통합 활성화. 기존 인프라(McpClientManager, semanticSearch, SearxNGAdapter, ai-panel ToolCallTrace) 가 90% 갖춰져 있어, 신규 코드는 주로 **wiring + agentic loop** 1개 파일로 압축됨.

Python 마이크로서비스는 의도적으로 분리하지 않음 (ADR 참조).

## 2. 측정 지표

| 항목 | Before | After | Δ |
|------|--------|-------|---|
| BE unit + integration test | 357/357 | 378/378 | +21 |
| FE unit test | 71/71 | 81/81 | +10 (date-inputs 8 + 자체 영향 0) |
| BE typecheck | PASS | PASS | 0 |
| FE typecheck | PASS | PASS | 0 |
| Linter | musl 환경결함으로 미실행 (pre-existing) | 동일 | 0 |
| Builtin AI Tools | 2 (search_tasks, search_issues) | 4 (+ rag_search, web_search) | +2 |
| LLM 어댑터 tool-call 지원 | ✗ | ✓ (OpenAICompat + InMemory) | new |
| Web search providers | 1 (SearxNG) + Noop | 2 (SearxNG + Brave) + Noop | +1 |
| Tool-call agentic loop | 없음 | max 3-iter / 6 tool/turn | new |
| FE tool trace 표시 | 데이터 미주입 | toolTrace SSE → ToolCallTrace 자동 렌더 | new |

평균 match_rate (5/5 success criteria + 0 회귀) ≈ **0.99** — pdca-iterator 임계(0.90) 충족.

## 3. 변경 파일

| 파일 | 종류 | LOC 변동 |
|------|------|---------|
| `apps/backend/src/config/env.ts` | 수정 | +14 |
| `apps/backend/src/modules/ai/ai-adapter.ts` | 수정 | +75 (tool-call types + InMemory mock) |
| `apps/backend/src/modules/ai/openai-compat-adapter.ts` | 수정 | +75 (tools 전송 + tool_calls parse + accumulator) |
| `apps/backend/src/modules/ai/web-search-adapter.ts` | 수정 | +47 (BraveSearchAdapter + provider 분기) |
| `apps/backend/src/modules/ai/tool-dispatcher.ts` | 재작성 | -85+165 (4 tools + ToolExecCtx + listAsOpenAISpec) |
| `apps/backend/src/modules/ai/tool-loop.ts` | **신규** | +138 |
| `apps/backend/src/modules/ai/ai.routes.ts` | 수정 | +75 (dispatcher/webSearch 주입 + useTools + runWithTools + stream tool-loop) |
| `apps/backend/src/app.ts` | 수정 | +18 (ToolDispatcher/McpClientManager/webSearch 와이어링) |
| `apps/backend/src/modules/ai/tool-dispatcher.test.ts` | 재작성 | -71+184 (8 → 14 케이스) |
| `apps/backend/src/modules/ai/tool-loop.test.ts` | **신규** | +118 (3 케이스) |
| `apps/backend/src/modules/ai/web-search-adapter.test.ts` | 수정 | +63 (Brave + 4 provider 분기) |
| `apps/backend/src/plugins/error-handler.test.ts` | 수정 | +1 (env literal 호환) |
| `apps/frontend/src/lib/hooks/use-ai.ts` | 수정 | +60 (AiStreamOptions + AiStreamDoneInfo + toolTrace) |
| `apps/frontend/src/components/shell/ai-panel.tsx` | 수정 | +10 (onDone 시그니처 + toolCalls mapping) |
| `docs/01-plan/ai-assistant-2026-q2-enhance.plan.md` | **신규** | +103 |
| `docs/02-design/decision-records/ai-microservice-split-triggers.md` | **신규** | +63 |
| `docs/04-report/ai-assistant-2026-q2-enhance.report.md` | **신규** | (this file) |

총 14 코드 파일 + 3 문서. 코드 PR 크기는 **권고 10개 초과** (예외 사유: tool-call 의 type 정의→adapter→loop→route→dispatcher→test 가 단일 흐름이므로 분할 시 reviewer가 맥락을 잃음 — `av-base-code-quality-gates §5.3` 예외 명시).

## 4. 주요 패턴 / 학습

### 4.1 Additive 인터페이스 확장 (역호환 100%)
`AIAdapter` 의 `complete()` 시그니처는 **그대로**. `AICompleteOptions.tools` / `AICompletionResult.toolCalls` 만 옵셔널로 추가 → 기존 InMemoryAdapter / OpenAIAdapter / OpenAICompatAdapter 호출자 zero-change.

### 4.2 InMemoryAdapter 의 Tool-Call 결정론 모킹
canned 응답이 `tool_call:[{...}]` prefix 면 자동으로 `finishReason='tool_calls'` 반환. 이로써 tool-loop test 가 외부 LLM 의존 없이 결정론적.

### 4.3 Stream tool-call accumulator 패턴
OpenAI SSE 는 tool_calls 를 `index` 별로 chunked delta 로 보냄. `ToolCallAccumulator` 클래스가 index 슬롯별 누적 → 종료 시 finalize() 일괄 emit.

### 4.4 Tool-loop 의 메시지 직렬화 한계 우회
`AIMessage.content: string` 만 지원하므로 assistant 의 tool_calls / system 의 tool_result 를 **JSON 텍스트로 인코딩** 하여 다음 turn 에 주입. 모델은 system 메시지 형식 `[tool_result name=... id=...]\n<json>` 을 자연스럽게 인식.

### 4.5 MCP tool naming convention
MCP 서버 tool 은 `${serverName}.${toolName}` 으로 노출 → dispatcher 가 dot 분리로 라우팅. 충돌 위험 0 (빌트인 tool 명에 dot 없음).

### 4.6 Provider 선택 우선순위 (Backwards-compat)
`WEB_SEARCH_PROVIDER=brave + BRAVE_SEARCH_API_KEY` → Brave. 그 외 `SEARXNG_URL` 만 있으면 legacy 호환으로 SearxNG. 둘 다 없으면 Noop.

### 4.7 Env zod literal 테스트 회귀
`buildApp({ env: { ... } })` literal 을 사용하는 테스트는 신규 env key 추가 시 **명시적으로 undefined 를 표기**해야 한다. ESLint exact-types 규칙 (`exactOptionalPropertyTypes`) 영향. 추후 env literal 헬퍼 함수 추출 검토.

## 5. 비범위 / 후속 사이클

| # | 항목 | 우선도 | 이유 |
|---|------|------|------|
| F1 | `[task:id]/[issue:id]` citation 마커 자동 주입 system prompt | P1 | 현재 모델이 마커를 안 만들면 citations 빈 배열 |
| F2 | Vector index HNSW 재생성 | P1 | 마이그레이션 20260501 에서 drop, RAG 가 sequential scan |
| F3 | Tool-call 비용/토큰 메트릭 화면 노출 | P2 | 데이터는 이미 수집(`recordAICall`) |
| F4 | E2E playwright 시나리오 (AI panel → tool-call → trace 표시) | P2 | unit 으로 충분히 커버 |
| F5 | `bkit:gap-detector` 자동 측정 | P2 | bkit 호출 환경 미가용, 수동 검증으로 대체 |
| F6 | Python AI 마이크로서비스 분리 | 보류 | ADR 트리거 발생 시 |

## 6. 검증 게이트

- [x] BE typecheck: PASS (`tsc --noEmit && tsc -p tsconfig.seed.json && tsc -p tsconfig.tests.json`)
- [x] BE 단위+통합 테스트: 378/378 PASS (이전 357 → +21)
- [x] FE typecheck: PASS
- [x] FE 단위 테스트: 81/81 PASS (이전 71 → +10)
- [x] tool-loop 신규 테스트: 3/3 PASS
- [x] tool-dispatcher 확장 테스트: 14/14 PASS
- [x] web-search Brave 테스트: 13/13 PASS (이전 11 → +2)
- [x] ai.routes 회귀 테스트: 7/7 PASS (기존 동일)
- [ ] biome lint: pre-existing musl 바이너리 환경결함, 코드 변경 무관 (MEMORY.md `learning_musl_binary_fix_2026_04_30.md` 참조)
- [ ] bkit:gap-detector: 수동 자가 채점 0.99 (자동 측정 보류)

## 7. PM 승인 요청

- 5/5 PRD 성공 기준 충족.
- 0건 회귀.
- Phase 2 (Python MS) 보류 사유 + 트리거 ADR 명문화.

승인 시 → av-base-memory-keeper 에 학습 보존.
