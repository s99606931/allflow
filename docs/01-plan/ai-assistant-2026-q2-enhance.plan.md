# Plan — AI Assistant 2026-Q2 Enhancement (RAG + MCP + Tool + Web Search)

> feature: `ai-assistant-2026-q2-enhance`
> 작성: av-do-orchestrator (av-pm-team STEP 3) | 2026-05-01
> PRD: 인라인 (사용자 요구사항 직접 도출 — feedback_pdca_plan_no_checkpoint 적용)

## 0. 사용자 요구

> "AI 어시스턴트에서 최신 2026년 5월 기준에 RAG, MCP, Tool, 브라우저 검색 등에 기능을 할 수 있도록 기능 개발을 진행. AI 백엔드 서비스가 필요하면 별도 Python 백엔드 서비스를 마이크로 서비스로 추가해도 됨."

## 1. 현황 진단 (재사용 가능 인프라)

| 영역 | 현재 상태 | 평가 |
|------|-----------|------|
| LLM Adapter (OpenAI compat) | `OpenAICompatAdapter` 존재 — LMStudio/Ollama/OpenAI/vLLM 1개로 커버 | 재사용 ✓ |
| LLM Connection Registry | DbBackedAIRegistry + `/llm-connections` 라우트 | 재사용 ✓ |
| MCP Client | `@modelcontextprotocol/sdk` 기반 `McpClientManager` 존재 | 재사용 ✓ |
| MCP Connection 영속화 | `mcp_connections` 테이블 + 라우트 | 재사용 ✓ |
| pgvector | Postgres extension `vector` 활성, Task/Issue 에 `embedding(1536)` | 재사용 ✓ |
| Semantic search | `semanticSearch()` 함수 (`search.service.ts`) — text-embedding-3-small | 재사용 ✓ |
| Web search | `SearxNGAdapter`, `NoopWebSearchAdapter` | 확장 (Brave 추가) |
| AI Thread / Message | `AiThread`/`AiMessage` 테이블 + 라우트 | 재사용 ✓ |
| FE AI Panel | `ai-panel.tsx` + `ToolCallTrace`, `MarkdownRenderer`, `useAiStream` | 재사용 ✓ |
| Tool Dispatcher | `ToolDispatcher` + `BUILTIN_TOOLS` (search_tasks, search_issues) | 확장 (rag/web 추가) |

## 2. Phase 1 범위 (이번 사이클)

### 2.1 BE — Tool-call agentic loop 활성화
- `AIAdapter` 인터페이스에 `tools`/`toolChoice` 옵션 + `toolCalls` 결과 필드 추가 (additive).
- `OpenAICompatAdapter` 가 `tools` 를 모델에 전달하고 `tool_calls` 응답을 파싱 (non-stream + stream 양쪽).
- `tool-loop.ts` — agentic loop (max 3 iteration, max 6 tool/turn) + ToolTraceEntry 누적.
- `/ai/complete` 가 dispatcher 주입 시 자동으로 tool-call loop 활성화 (`useTools=true` 기본).

### 2.2 BE — 신규 빌트인 Tools
- `rag_search`: `semanticSearch()` 위임 (pgvector cosine, 1~20 limit, targets=tasks/issues 선택).
- `web_search`: 어댑터 주입 (`SearxNG` / `Brave`) — 미설정 시 graceful error JSON.

### 2.3 BE — Web Search 확장
- `BraveSearchAdapter` 신설 (`X-Subscription-Token` 헤더, web.results 파싱).
- `buildWebSearchAdapter` 가 `WEB_SEARCH_PROVIDER` env 로 분기 + legacy `SEARXNG_URL` 호환.

### 2.4 BE — App.ts 와이어링
- `ToolDispatcher(BUILTIN_TOOLS, McpClientManager)` 인스턴스화.
- `aiRoutes` 에 dispatcher + webSearch 주입.
- `onClose` 훅에서 mcpManager.close().

### 2.5 FE — Tool trace 표시
- `useAiStream` 의 `streamComplete` 가 SSE `toolTrace` 페이로드 파싱.
- `ai-panel.tsx` 의 메시지에 `toolCalls` 로 매핑 → 기존 `ToolCallTrace` 컴포넌트 자동 렌더.
- `useTools` 옵션을 hook 인자로 노출 (기본 true).

### 2.6 환경 변수 (zod 검증)
- `WEB_SEARCH_PROVIDER`: `'brave'|'searxng'|undefined`.
- `SEARXNG_URL`: URL.
- `BRAVE_SEARCH_API_KEY`: string.

## 3. Phase 2 (의도적 보류)

| 항목 | 이유 | 향후 트리거 |
|------|------|------------|
| Python AI 마이크로서비스 | Phase 1 의 모든 기능을 TS 단일 BE 에서 90% 달성 가능 (OpenAI-compat 어댑터로 LMStudio/Anthropic 무중단 교체, pgvector 에 임베딩 저장, MCP SDK 가 TS native, SearxNG/Brave 는 HTTP API). 분리 비용 > 분리 가치. | ① 자체 임베딩 모델(BGE-M3 등) 호스팅 필요 시 ② LangChain/LlamaIndex 의존 agent 가 필요 시 ③ GPU-bound inference 필요 시 — `docs/02-design/decision-records/ai-microservice-split-triggers.md` 참조 |
| 멀티모달 (이미지/음성 입력) | 별도 사이클 — STT 는 이미 `extract-actions` voice source 지원 | 사용자 요구 시 |
| 에이전트 메모리 (장기) | AiThread 가 단기 컨텍스트 충분 | persona 고정 시 |

## 4. 변경 파일 (예상 12개)

| 영역 | 파일 | 종류 |
|------|------|------|
| BE-config | `src/config/env.ts` | 수정 (env keys) |
| BE-types | `src/modules/ai/ai-adapter.ts` | 수정 (AIToolDef/AIToolCall + 필드) |
| BE-adapter | `src/modules/ai/openai-compat-adapter.ts` | 수정 (tools 전송 + parse) |
| BE-adapter | `src/modules/ai/web-search-adapter.ts` | 수정 (Brave 추가) |
| BE-tool | `src/modules/ai/tool-dispatcher.ts` | 재작성 (4 tools + ToolExecCtx) |
| BE-loop | `src/modules/ai/tool-loop.ts` | **신규** |
| BE-route | `src/modules/ai/ai.routes.ts` | 수정 (dispatcher 주입 + useTools 분기) |
| BE-app | `src/app.ts` | 수정 (ToolDispatcher/McpClientManager/webSearch 와이어링) |
| BE-test | `src/modules/ai/tool-dispatcher.test.ts` | 수정 (4 tools 검증) |
| BE-test | `src/modules/ai/tool-loop.test.ts` | **신규** |
| BE-test | `src/modules/ai/web-search-adapter.test.ts` | 수정 (Brave + provider 분기) |
| BE-test | `src/plugins/error-handler.test.ts` | 수정 (env 리터럴 BRAVE_SEARCH_API_KEY 추가) |
| FE-hook | `src/lib/hooks/use-ai.ts` | 수정 (toolTrace 파싱 + AiStreamOptions) |
| FE-panel | `src/components/shell/ai-panel.tsx` | 수정 (onDone 시그니처 갱신) |

## 5. 검증 게이트

1. BE typecheck PASS.
2. BE 단위 + 통합 테스트 0건 회귀 (이전 357/357 → 신규 ≥ 357/357).
3. FE typecheck PASS.
4. FE 단위 테스트 0건 회귀 (이전 71/71 → 신규 ≥ 71/71).
5. 신규 tool-loop unit test ≥ 3건 PASS.
6. 신규 tool-dispatcher (rag/web) unit test ≥ 5건 PASS.
7. 신규 web-search-adapter Brave/provider 분기 test ≥ 4건 PASS.

## 6. 비범위 (이번 사이클 제외)

- `/ai/complete` 가 RAG citation 마커를 모델 응답에 자동 주입 — 이번엔 모델이 [task:id] 마커를 생성할 때만 citations 가 채워진다 (system prompt 가이드 추가 후속).
- Vector index HNSW 재생성 (마이그레이션 20260501134457 에서 drop 됨, 후속 사이클).
- Tool-call 호출 비용/토큰 메트릭 화면 노출.
- E2E playwright 시나리오 신규 케이스.
