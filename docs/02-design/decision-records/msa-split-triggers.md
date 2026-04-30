# Decision Record — MSA Split Triggers

> **Created**: 2026-04-30 (monorepo-microservices-2026-04-30 Step 8)
> **Status**: Active — 측정 트리거 가이드. 실 분리는 본 문서의 임계치 충족 시 별도 PRD.
> **Owner**: 메인테이너 + av-do-orchestrator (PL)
> **Source**:
> - PRD `monorepo-microservices-2026-04-30.prd.md` §2.2 (Phase 2 후보 + 분리 트리거)
> - PRD §2.3 (Phase 3 풀 분해 비추천)
> - 본 사이클 Step 8 OTel collector 도입
>
> **2026 컨센서스**: "측정 없는 분리 금지" — CNCF Q1 2026 42% MSA→Modular Monolith 회귀.

---

## 1. 결정 요약

| 도메인 | 분리 신호 (Primary) | 임계치 | 측정 원천 | 보조 신호 | 분리 비용 추정 | 우선순위 |
|--------|--------------------|--------|----------|-----------|---------------|--------|
| **realtime** | WS 동시연결 + BE 재시작 단절 | ≥ 1k concurrent **OR** 주 1회 이상 redeploy 단절 사용자 통증 입증 | TraceQL: `{service.name="all-flow-backend", span.name=~"WS.*"}` count_over_time + GitHub Actions deploy log | p95 메시지 latency > 100ms | ~1주 (JWT 공유 + Redis 공유 OK) | 🥇 1순위 |
| **ai** | LLM 호출 latency + 비용 격리 | p95 > 2s **AND/OR** 월 비용 > $threshold (사용자 정의) | TraceQL: `{service.name="all-flow-backend", span.name=~"openai.*\|anthropic.*"}` p95(duration) + cost dashboard | 타임아웃 비율 > 5%, 큐 대기 시간 > 1s | ~5일 (결과 push 필요) | 🥈 2순위 |
| **search** | pgvector 부하 격리 | DB CPU 평균 > 30% (search 트래픽 집중 시간대) | postgres exporter (pg_stat_statements) + TraceQL `span.name=~"pg.query.search.*"` | 인덱싱 lock 빈도 ≥ 1회/일 | ~3일 (인덱싱 동기화 복잡) | 🥉 3순위 |

**모두 미달 시**: Modular Monolith 유지 (현 상태).

---

## 2. 메트릭 정의 (Google 4 Golden Signals + 분리 특화)

| Signal | 정의 | 분리 의사결정 활용 |
|--------|------|------------------|
| **Latency** (p95/p99) | 요청 시작 ~ 응답까지 wall-clock | p95가 임계치 초과 시 → 후보 |
| **Traffic** (concurrent / RPS) | 동시 처리 요청 수 | WS는 concurrent 연결, REST는 RPS |
| **Errors** (rate) | 5xx + 타임아웃 + 재시도 | error rate > 1% 지속 시 → 후보 |
| **Saturation** (CPU / mem / DB pool) | 자원 점유율 | DB CPU > 30% (search 도메인) |
| **Deploy frequency divergence** | 도메인별 배포 빈도 차이 | 1개 도메인이 다른 도메인의 5x 빈도로 배포되면 → 분리 신호 |

### 2.1 OTel TraceQL 측정 예시 (collector 가동 시)

```promql
# realtime p95 latency (5m window)
histogram_quantile(0.95,
  sum(rate(traces_spanmetrics_latency_bucket{service_name="all-flow-backend", span_name=~"WS.*"}[5m])) by (le)
)

# ai 모듈 p95 latency
histogram_quantile(0.95,
  sum(rate(traces_spanmetrics_latency_bucket{service_name="all-flow-backend", span_name=~"openai.*"}[5m])) by (le)
)

# search 모듈 평균 DB query 비율
sum(rate(traces_spanmetrics_calls_total{service_name="all-flow-backend", span_name=~"pg.query.search.*"}[5m]))
/ sum(rate(traces_spanmetrics_calls_total{service_name="all-flow-backend", span_name=~"pg.query.*"}[5m]))
```

> 본 사이클 Step 8 collector pipeline 은 traces only. Step 9 에서 spanmetrics processor 추가 시 위 PromQL 가용.

---

## 3. 분리 의사결정 트리

```
측정값 ≥ 임계치 (2주 평균)?
  ├─ NO ──────────────→ 유지 (Modular Monolith)
  └─ YES
      ├─ 임계치의 1.5x 이상 OR 사용자 통증 입증?
      │   ├─ NO ──────→ 추가 측정 (1개월) + 보조 신호 모니터링
      │   └─ YES
      │       ├─ 분리 비용 < 다음 분기 인프라 비용 절감 예상?
      │       │   ├─ NO ─→ 수직 확장(BE 인스턴스 +1) / Read replica / 캐시 강화 우선
      │       │   └─ YES
      │       │       ├─ 분리 PRD 발의 (`{domain}-split-{date}.prd.md`)
      │       │       └─ Phase 2 진입
```

### 3.1 측정 기간 규칙

- **최소 측정 기간**: 14일 (1 sprint = 1주 가정 시 2 sprint)
- **신뢰성 기준**: OTel collector + Tempo retention ≥ 24h 유지된 데이터만 사용
- **외부 변수 통제**: 인프라 리사이즈 / 트래픽 큰 캠페인 직후 1주는 측정 제외

---

## 4. 반례 — 분리 금지 시그널

다음 시그널은 임계치 초과해도 **분리 금지**:

1. **일시 spike** — 단일 1h 윈도우 임계치 초과는 무시. 2주 평균만 신뢰.
2. **측정 7일 미만** — sample size 부족.
3. **OTel collector 미가동 시점의 추정값** — 추정으로 분리 결정 금지.
4. **비용 효과 < 분리 효과** — 인프라 비용 +10x로 latency -20% 개선은 ROI 부족.
5. **분산 트랜잭션 강제** — 분리 후 SAGA/Outbox 도입 필요한 경우 대안 모색 우선.
6. **단일 메인테이너 운영** — 분리는 운영 복잡도 ~3x. 메인테이너 1명일 때 비추천.

---

## 5. 도메인별 상세 분석

### 5.1 realtime (1순위)

| 항목 | 값 |
|------|---|
| **현재 위치** | `apps/backend/src/modules/realtime/` (realtime-bus, redis-fanout, realtime.ws) |
| **외부 의존** | Redis pub/sub, JWT 검증 |
| **분리 후 통신** | BE → realtime: redis pub/sub (현재 패턴 유지) |
| **JWT 공유** | Auth secret 공유 (env) — 별도 토큰 발행 불필요 |
| **분리 비용** | ~1주 (Dockerfile + service 정의 + healthcheck + WS routing 가드) |
| **단점** | redeploy 시 단절 분리 — 실용성 큼 |

### 5.2 ai (2순위)

| 항목 | 값 |
|------|---|
| **현재 위치** | `apps/backend/src/modules/ai/` (ai-adapter, ai.routes), `extract-actions` |
| **외부 의존** | OpenAI API, Anthropic API |
| **분리 후 통신** | BE → ai: HTTP REST + 결과 push (webhook or queue) |
| **비용 분리** | LLM 비용을 별도 service 단위로 측정 가능 |
| **분리 비용** | ~5일 + 결과 push 메커니즘 설계 |
| **단점** | 결과 비동기 처리 시 UX 변화 |

### 5.3 search (3순위)

| 항목 | 값 |
|------|---|
| **현재 위치** | `apps/backend/src/modules/search/search.service.ts` |
| **외부 의존** | pgvector, Postgres |
| **분리 후 통신** | BE → search: HTTP REST + 인덱싱 sync 큐 |
| **DB 격리** | Postgres replica or 별도 DB (pgvector full instance) |
| **분리 비용** | ~3일 + 인덱싱 동기화 패턴 (CDC or outbox) |
| **단점** | 인덱싱 lag 허용 가능한 도메인일 때만 |

---

## 6. Phase 3 (풀 분해) 비추천 — PRD §2.3 재확인

20개 BE 모듈 모두 service 분리 시:

- 인프라 비용 ~10x (서비스당 컨테이너 + DB 풀 + 네트워킹)
- 로컬 dev 무결성 붕괴 (현재 single-port localhost 1줄 가동 → 20+ 컨테이너 + service mesh)
- 분산 트랜잭션 복잡도 (Prisma 단일 트랜잭션 → SAGA/Outbox 강제)
- **결정**: 추천 안 함. CNCF 2026 Q1 컨센서스 위배.

---

## 7. 인용 출처

- **Google SRE Handbook** — "Monitoring Distributed Systems" Ch.6: "4 Golden Signals" (Latency / Traffic / Errors / Saturation)
- **Sam Newman**, *Building Microservices* 2nd ed. — Ch.3 "When NOT to split"
- **Martin Fowler** — "Monolith First" pattern (2015) + "Microservice Premium" (2015)
- **Amazon Prime Video** (2023) — "Scaling up the Prime Video audio/video monitoring service and reducing costs by 90%" (Modular Monolith 회귀 사례)
- **CNCF 2026 Q1 Cloud Native Trends Report** — 42% 조직이 MSA → consolidate
- **OpenTelemetry Specification** — Resource semantic conventions, span naming

---

## 8. 본 결정문서의 활용

1. **분기 1회 측정 검토** — OTel collector 가동 시 본 표 임계치 vs 실측치 비교 1회/분기
2. **분리 PRD 발의 시 본 문서 인용** — 임계치 충족 증거 + 분리 비용 추정 + 의사결정 트리 스냅샷
3. **분기 검토 결과 회의록** — `docs/learning/msa-split-trigger-review-{yyyy-q}.md` 로 누적
4. **임계치 자체 갱신** — 분리 후 ROI 검증 결과로 본 문서 임계치를 분기 1회 갱신

---

**End of Decision Record** — 분리 결정은 본 문서의 임계치 충족 시 별도 PRD 발의로만 진행한다.
