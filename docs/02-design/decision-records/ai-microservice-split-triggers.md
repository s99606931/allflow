# ADR — AI 마이크로서비스 분리 트리거 정량화

> **결정 일자**: 2026-05-01
> **상태**: Accepted
> **관련 사이클**: ai-assistant-2026-q2-enhance (Phase 1)
> **연관 ADR**: `msa-split-triggers.md` (전체 모놀리식→MSA 트리거)

## 컨텍스트

ai-assistant-2026-q2-enhance Phase 1 사이클에서 사용자가 "AI 백엔드 서비스가 필요하면 별도 Python 백엔드 서비스를 마이크로 서비스로 추가해도 된다"고 위임했다.

현재 BE 인벤토리:
- `OpenAICompatAdapter` 가 LMStudio/Ollama/OpenAI/vLLM/Together/Groq 모두 단일 코드 경로로 처리.
- `@modelcontextprotocol/sdk` (TypeScript SDK) 가 stdio + SSE transport 모두 지원.
- `pgvector` extension 으로 워크스페이스 내부 임베딩 저장 + 검색.
- `text-embedding-3-small` (OpenAI 1536-dim) 을 외부 API 호출로 사용.

## 결정

**Phase 1 에서는 Python 마이크로서비스를 분리하지 않는다.** TypeScript 단일 BE 에서 RAG/MCP/Tool/Web search 4 기능을 모두 구현한다.

분리는 다음 트리거 중 **하나 이상** 발생 시점에 재평가한다.

## 분리 트리거 매트릭스

| # | 조건 | 측정 지표 | 임계 |
|---|------|----------|------|
| T1 | 자체 호스팅 임베딩 모델 도입 | OpenAI embeddings API 사용량 또는 비용 | 월 사용 100만 vector ↑ 또는 월 $200 ↑ |
| T2 | LangChain/LlamaIndex agent loop 의존 | 자체 tool-loop 가 표현하기 어려운 패턴 등장 | TS 로 재구현 비용 > 2 dev-week |
| T3 | GPU-bound 추론 필요 | reranker/cross-encoder 또는 self-hosted LLM | latency 요구 < 500ms 이면서 외부 API miss |
| T4 | RAG retrieval 최적화 (BM25 + 임베딩 + reranker hybrid) | 재현율 / NDCG 게이트 | 단일 의미 검색 NDCG@10 < 0.6 |
| T5 | 멀티모달 (이미지/음성) AI pipeline | Whisper/CLIP/Florence 자체 호스팅 | 외부 API 의존 제거 결정 시 |
| T6 | AI 트래픽이 BE QPS 의 30% ↑ | `recordAICall` 카운터 | 1주일 평균 |

## 분리 후 아키텍처 (참고)

분리 결정 시:

```
[FE Next.js] ──→ [BE Fastify TS]
                      │
                      └─ HTTP/gRPC ──→ [AI Python service (FastAPI/LiteLLM)]
                                            ├─ pgvector (read-only access)
                                            ├─ OpenAI embeddings / 자체 호스팅
                                            ├─ MCP servers (Python SDK)
                                            └─ LangChain agent runtime
```

- BE 는 `AIAdapter` 인터페이스를 그대로 유지하고 어댑터만 `RemoteAIServiceAdapter` 로 교체 → 변경 점은 의존성 주입 1줄.
- pgvector 는 BE 와 Python 양쪽이 각각 자기 책임으로 접근 (Python 은 read 전용, BE 가 embedding 쓰기 담당).

## 비결정 (보류)

- 만약 분리 시 언어는 Python 외 Go/Rust 도 후보. LangChain/LlamaIndex 의존이 트리거면 Python 자동 결정.
- 분리 시점의 데이터 일관성 (embedding 의 source-of-truth) 은 추후 Plan 에서 결정.

## 측정 가이드

분기마다 자동 측정:

```bash
# T1 — embedding 비용
grep '"promptKey":"embedding"' apps/backend/logs/* | wc -l

# T6 — AI 트래픽 비율
grep '"route":"/ai/complete"' apps/backend/logs/* | wc -l
# / 전체 request count
```

값이 임계를 1주일 이상 초과하면 av-do-orchestrator 에 분리 Plan 작성 요청.
