# Design — monorepo-step8-otel-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source Plan**: `docs/01-plan/features/monorepo-step8-otel-2026-04-30.plan.md`
> **Scope**: OpenTelemetry minimal SDK + observability profile + MSA split-trigger 결정문서 + cycle aggregate report 골격

---

## 1. 산출물 매트릭스

| # | 파일 | 신규/변경 | 책임 |
|---|------|:--:|------|
| 1 | `apps/backend/src/plugins/otel.ts` | 신규 | SDK init + lazy import + 안전 fallback |
| 2 | `apps/backend/src/modules/otel/otel.routes.ts` | 신규 | `/otel/health` 진단 endpoint |
| 3 | `apps/backend/src/server.ts` | 변경 (4~6 LOC) | boot 시점에 OTel SDK init (Fastify 인스턴스 생성 전) |
| 4 | `apps/backend/src/app.ts` | 변경 (1 LOC) | otelRoutes 등록 (`/api/v1` prefix 그룹) |
| 5 | `apps/backend/src/config/env.ts` | 변경 (3 키 추가) | OTEL_ENABLED / OTEL_EXPORTER_OTLP_ENDPOINT / OTEL_SERVICE_NAME |
| 6 | `apps/backend/package.json` | 변경 (3 dep) | @opentelemetry/api, sdk-node, auto-instrumentations-node |
| 7 | `apps/infra/docker-compose.dev.yml` | 변경 | observability profile (otel-collector + tempo) |
| 8 | `apps/infra/docker/otel-collector/config.yaml` | 신규 | minimal pipeline (otlp → batch → otlp/tempo) |
| 9 | `apps/infra/docker/tempo/tempo.yaml` | 신규 | local backend (filesystem) |
| 10 | `docs/02-design/decision-records/msa-split-triggers.md` | 신규 | 분리 트리거 결정 문서 |
| 11 | `docs/04-report/features/monorepo-microservices-2026-04-30.report.md` | 신규 | **사이클 통합 보고** |
| 12 | `docs/04-report/features/monorepo-step8-otel-2026-04-30.report.md` | 신규 | Step 8 단일 보고 |
| 13 | `docs/03-analysis/features/monorepo-step8-otel-2026-04-30.analysis.md` | 신규 | 게이트 결과 |

**총 합계**: 신규 8 / 변경 5. BE src 코드 변경 < 30 LOC 목표.

---

## 2. OTel Plugin 시그니처

### 2.1 `apps/backend/src/plugins/otel.ts`

```typescript
/**
 * OpenTelemetry SDK boot hook.
 *
 * 책임:
 *  - OTEL_ENABLED=true일 때만 NodeSDK 초기화 (lazy dynamic import).
 *  - sdk.start()는 Fastify 인스턴스 생성 *이전*에 호출해야 auto-instrumentations가
 *    require 시점 hook을 잡을 수 있다 → server.ts boot 진입 즉시 await initOtel().
 *  - Endpoint 미지정 시 disabled로 fallback + warn log (crash 금지).
 *  - graceful shutdown은 app.addHook('onClose')에서 호출 (별도 export).
 *
 * 본 cycle은 traces only (메트릭/로그는 별도). Sampling은 parent-based 1.0.
 */
export interface OtelInitResult {
  enabled: boolean;
  serviceName: string;
  endpoint: string | null;
  shutdown: () => Promise<void>;
}

export async function initOtel(env: {
  OTEL_ENABLED?: boolean;
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_SERVICE_NAME?: string;
  NODE_ENV?: string;
}): Promise<OtelInitResult> {
  const serviceName = env.OTEL_SERVICE_NAME ?? 'all-flow-backend';

  if (!env.OTEL_ENABLED) {
    return { enabled: false, serviceName, endpoint: null, shutdown: async () => {} };
  }
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    process.stderr.write(
      '[otel] OTEL_ENABLED=true but OTEL_EXPORTER_OTLP_ENDPOINT missing → disabled\n',
    );
    return { enabled: false, serviceName, endpoint: null, shutdown: async () => {} };
  }

  // Lazy dynamic import — disabled 경로는 sdk-node를 require조차 안 함.
  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = await import(
    '@opentelemetry/auto-instrumentations-node'
  );
  const { OTLPTraceExporter } = await import(
    '@opentelemetry/exporter-trace-otlp-http'
  );
  const { resourceFromAttributes } = await import('@opentelemetry/resources');
  const { ATTR_SERVICE_NAME } = await import(
    '@opentelemetry/semantic-conventions'
  );

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    traceExporter: new OTLPTraceExporter({
      url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/+$/, '')}/v1/traces`,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs 계측은 노이즈가 많아 비활성화
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  try {
    sdk.start();
  } catch (err) {
    process.stderr.write(`[otel] start failed: ${(err as Error).message}\n`);
    return { enabled: false, serviceName, endpoint: null, shutdown: async () => {} };
  }

  return {
    enabled: true,
    serviceName,
    endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    shutdown: async () => {
      try {
        await sdk.shutdown();
      } catch {
        /* swallow shutdown error */
      }
    },
  };
}
```

### 2.2 `apps/backend/src/modules/otel/otel.routes.ts`

```typescript
import type { FastifyPluginAsync } from 'fastify';

interface OtelRouteOptions {
  state: {
    enabled: boolean;
    serviceName: string;
    endpoint: string | null;
  };
}

export const otelRoutes: FastifyPluginAsync<OtelRouteOptions> = async (app, opts) => {
  app.get('/otel/health', async () => ({
    enabled: opts.state.enabled,
    serviceName: opts.state.serviceName,
    endpoint: opts.state.endpoint,
  }));
};
```

### 2.3 `server.ts` 변경 (3 LOC + try/catch)

```typescript
// boot 진입점 (loadEnv 직후)
const otelHandle = await initOtel({
  OTEL_ENABLED: env.OTEL_ENABLED,
  OTEL_EXPORTER_OTLP_ENDPOINT: env.OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_SERVICE_NAME: env.OTEL_SERVICE_NAME,
  NODE_ENV: env.NODE_ENV,
});

const app = await buildApp({ env, registerDb: true, registerRoutes: true, otelState: otelHandle });
app.log.info({ otel: otelHandle.enabled, serviceName: otelHandle.serviceName }, 'otel boot');

// shutdown 핸들러 내부에 추가:
await otelHandle.shutdown();
```

### 2.4 `app.ts` 변경

```typescript
// BuildAppOptions 에 otelState 추가 (선택):
otelState?: { enabled: boolean; serviceName: string; endpoint: string | null };

// 라우트 등록 그룹 내부:
await api.register(otelRoutes, { state: options.otelState ?? { enabled: false, serviceName: 'all-flow-backend', endpoint: null } });
```

### 2.5 `env.ts` 변경 — 3 키 추가

```typescript
OTEL_ENABLED: z.coerce.boolean().default(false),
OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
OTEL_SERVICE_NAME: z.string().min(1).default('all-flow-backend'),
```

---

## 3. Compose `observability` profile

### 3.1 `apps/infra/docker-compose.dev.yml` 추가 블록

```yaml
  otel-collector:
    profiles: ["observability"]
    image: otel/opentelemetry-collector-contrib:0.121.0
    container_name: allflow-otel-collector
    command: ["--config=/etc/otelcol/config.yaml"]
    volumes:
      - ./docker/otel-collector/config.yaml:/etc/otelcol/config.yaml:ro
    ports:
      - "${OTEL_COLLECTOR_HTTP_PORT:-4318}:4318"
      - "${OTEL_COLLECTOR_GRPC_PORT:-4317}:4317"
    networks:
      - allflow-net
    depends_on:
      - tempo

  tempo:
    profiles: ["observability"]
    image: grafana/tempo:2.7.0
    container_name: allflow-tempo
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./docker/tempo/tempo.yaml:/etc/tempo.yaml:ro
      - tempo-data:/var/tempo
    ports:
      - "${TEMPO_HTTP_PORT:-3200}:3200"
    networks:
      - allflow-net

# volumes:
#   tempo-data:
#     name: allflow-tempo-data-dev
```

### 3.2 `apps/infra/docker/otel-collector/config.yaml`

```yaml
# Minimal pipeline: OTLP receiver → batch → OTLP exporter to Tempo.
# Step 9에서 prometheus exporter / loki / sampling 추가.
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    send_batch_size: 1024
    timeout: 5s

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
```

### 3.3 `apps/infra/docker/tempo/tempo.yaml`

```yaml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318

ingester:
  trace_idle_period: 10s
  max_block_duration: 5m

storage:
  trace:
    backend: local
    local:
      path: /var/tempo/traces
    wal:
      path: /var/tempo/wal

compactor:
  compaction:
    block_retention: 24h
```

### 3.4 활성화 가이드 (README 인용용)

```bash
# Default (기본): observability 미가동
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev up -d

# Observability 가동 (OTel collector + Tempo)
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev \
  --profile observability up -d

# BE에서 export하려면:
OTEL_ENABLED=true OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
  pnpm --filter @all-flow/backend dev
```

---

## 4. MSA Split-Trigger Decision Record (스켈레톤)

`docs/02-design/decision-records/msa-split-triggers.md` — 본 cycle Do 단계에서 작성.

### 4.1 표 골격

| 도메인 | 분리 신호 (primary) | 임계치 | 측정 원천 (TraceQL/Metric) | 보조 신호 | 분리 비용 추정 | 우선순위 |
|--------|--------------------|--------|---------------------------|-----------|--------------|--------|
| **realtime** | WS 동시 연결 + BE 재시작 단절 | 1k concurrent OR 주 1회 이상 redeploy 단절 | `count_over_time({service.name="all-flow-backend", span.name=~"WS.*"}[5m])` | p95 메시지 latency > 100ms | ~1 주 | 🥇 |
| **ai** | LLM 호출 latency + 비용 격리 | p95 > 2s OR 월 비용 > $threshold | `histogram_quantile(0.95, traces{service.name="all-flow-backend", span.name="llm.*"})` | 타임아웃 비율 > 5% | ~5 day | 🥈 |
| **search** | pgvector CPU 점유 | DB CPU 평균 > 30% (search 트래픽 시간대) | postgres metrics + trace `span.name="pg.query"` filter | 인덱스 빌드 lock 빈도 | ~3 day | 🥉 |

### 4.2 결정 트리

```
측정값 ≥ 임계치 (2주 평균)?
  ├─ NO → 유지 (modular monolith)
  └─ YES
      ├─ 임계치의 1.5x 이상이거나 사용자 통증 입증?
      │   ├─ NO → 추가 측정 (1개월)
      │   └─ YES
      │       ├─ 분리 비용 < 다음 분기 인프라 비용 절감?
      │       │   ├─ YES → 분리 PRD 발의
      │       │   └─ NO  → 수직 확장 / sharding 우선
```

### 4.3 반례 (분리 금지 시그널)

- 일시 spike (단일 1h 임계치 초과 → 무시)
- 측정 7일 미만
- OTel collector 미가동 시점의 추정값
- 비용 효과 < 분리 효과 (인프라 비용 +10x)

### 4.4 인용

- Google SRE handbook — "4 Golden Signals" (latency / traffic / errors / saturation)
- Sam Newman, *Building Microservices* 2nd ed. — "When NOT to split"
- CNCF 2026 Q1 — "42% MSA→consolidate"

---

## 5. Cycle Aggregate Report 골격

`docs/04-report/features/monorepo-microservices-2026-04-30.report.md` — Do 단계 작성.

### 5.1 섹션 구조

1. **Executive Summary** (PRD success criteria 9개 매핑)
2. **8 Step 매트릭스** (각 행: Step / 산출물 / 게이트 결과 / match_rate / archive 경로)
3. **누적 산출물 인벤토리** (root scaffolding / packages 4개 / catalog 6 dep / CI 5 jobs / OTel)
4. **누적 학습 인덱스** (Step 1~7 + verification + Step 8 → 학습 파일 1줄씩)
5. **회귀 baseline 측정 결과** (BE 295+ / FE 71 / shared 45 / contracts / Playwright 56-60/62)
6. **Phase 2 진입 조건** (msa-split-triggers.md 인용)
7. **Phase 3 (full split) 비추천 사유 재확인** (PRD §2.3)
8. **다음 사이클 후보**

### 5.2 PRD §5.2 success criteria 9개 매핑 표

| # | 지표 | Baseline | Target | 실측 | Step |
|--:|------|---------:|-------:|-----:|:---:|
| 1 | `pnpm i` 단일 명령 | ❌ | ✅ | ✅ | Step 1 |
| 2 | `pnpm dev` 단일 명령 | ❌ | ✅ | ✅ | Step 2/7 |
| 3 | OpenAPI 1회 변경 → 반영 | ~10min | < 2min | ~1min | Step 3 |
| 4 | turbo build cache hit (warm) | 0% | ≥ 80% | 측정 가이드 (Step 7) | Step 7 |
| 5 | dev 환경 회귀 | — | 0건 | 0건 | Step 1~7 |
| 6 | Prisma schema 분리 위험 | — | 0 | 0 (분리 안 함) | 모든 Step |
| 7 | CI 시간 (warm cache) | ~6min | ≤ 90s | turbo --affected (Step 7) | Step 7 |
| 8 | 공유 dep 버전 중복 | 4건+ | 0 | 0 (catalog 6 dep) | Step 6 |
| 9 | bkit:gap-detector match_rate | — | ≥ 0.90 | 0.95~0.99 (Step별) | All |

---

## 6. 게이트 매핑 (Plan §3 → Design 검증)

| Plan 게이트 | Design 검증 위치 |
|-------------|----------------|
| G8-A1 SDK 설치 | §1 #6 (package.json 3 dep) |
| G8-A2 default off | §2.1 (OTEL_ENABLED 미설정 시 lazy import skip) |
| G8-A3 typecheck | §1 #1~5 (모든 변경 TypeScript) |
| G8-A5 /otel/health | §2.2 |
| G8-B1~B3 compose | §3.1~3.3 |
| G8-C1~C3 결정문서 | §4 |
| G8-E1~E3 cycle report | §5 |

---

## 7. 보안/품질 체크리스트

- [x] OTel exporter 기본 endpoint = collector — 외부 SaaS 토큰 미요구
- [x] OTEL_EXPORTER_OTLP_ENDPOINT는 https 강제 안 함 (dev 편의) — prod는 별도 사이클에서 TLS
- [x] 시크릿 미하드코딩 (env로만)
- [x] Prisma schema 변경 0
- [x] BE 코드 변경 < 30 LOC
- [x] dev 환경 default 가동 무영향 (profile 분리)

---

**End of Design** — 다음 액션: Do 단계 (구현 7 파일 + 변경 5 파일).
