# 02. OpenTelemetry 101 — Fastify/Next.js 계측

> 학습 목표: OTel SDK의 구조를 설명하고, all-flow-backend에 기본 계측을 추가하는 코드를 이해할 수 있다.

---

## 1. 문제 정의 — 왜 OTel인가

2026년 이전에는 벤더별 SDK가 따로 있었다:

```
Datadog 쓸 때  → dd-trace 설치
New Relic 쓸 때 → newrelic 설치
Jaeger로 바꾸면 → 코드 전체 교체
```

OTel(OpenTelemetry)은 벤더 중립적 표준이다.
한 번 계측하면 어느 백엔드(Jaeger, Grafana Tempo, Datadog, New Relic)로도 내보낼 수 있다.

---

## 2. OTel 구조

```mermaid
flowchart TD
    App[애플리케이션\nFastify / Next.js]
    SDK[OTel SDK\n@opentelemetry/sdk-node]
    Ex[Exporter\nOTLP / Console]
    Col[OTel Collector\n(선택 — 중간 집계)]
    Back[백엔드\nGrafana Tempo / Jaeger]

    App -->|자동 계측 또는 수동 span| SDK
    SDK -->|OTLP gRPC/HTTP| Ex
    Ex -->|OTLP| Col
    Col -->|전달| Back
```

핵심 개념:

| 개념 | 의미 |
|------|------|
| Trace | 요청 1개의 전체 여정 |
| Span | Trace 내 하나의 작업 단위 (예: DB 쿼리) |
| TraceId | 모든 span을 묶는 고유 ID |
| SpanId | 각 span의 고유 ID |
| Exporter | 수집된 데이터를 외부로 내보내는 컴포넌트 |

---

## 3. all-flow-backend에 OTel 추가 시 코드 예시

### 3.1 의존성 추가

```bash
# all-flow-backend (또는 Phase 1 완료 후 apps/backend)
pnpm add \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

### 3.2 계측 초기화 파일 (src/instrumentation.ts)

```typescript
// src/instrumentation.ts — server.ts보다 먼저 로드되어야 함
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'all-flow-backend',
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '0.1.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Fastify, Prisma, HTTP, ioredis 자동 계측 포함
      '@opentelemetry/instrumentation-fs': { enabled: false }, // fs 계측은 노이즈 많음
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().catch(console.error);
});
```

### 3.3 server.ts에서 먼저 로드

```typescript
// src/server.ts
import './instrumentation.js';  // 가장 먼저 — 다른 import보다 앞
import Fastify from 'fastify';
// ...
```

### 3.4 수동 Span 추가 (선택)

자동 계측으로 잡히지 않는 비즈니스 로직을 수동으로 계측:

```typescript
// src/modules/ai/ai-adapter.ts (예시)
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('ai-adapter');

export async function extractActions(content: string) {
  return tracer.startActiveSpan('ai.extractActions', async (span) => {
    try {
      span.setAttribute('ai.input.length', content.length);
      const result = await callLLM(content);
      span.setAttribute('ai.output.actions', result.actions.length);
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## 4. Next.js 계측

Next.js 15+는 OTel 계측을 공식 지원한다.

```typescript
// apps/frontend/instrumentation.ts (Next.js 공식 파일명)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

    const sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
      }),
    });

    sdk.start();
  }
}
```

`next.config.ts`에서 활성화:

```typescript
// apps/frontend/next.config.ts
const nextConfig = {
  experimental: {
    instrumentationHook: true,  // Next.js 15 이전은 이 옵션 필요
  },
};
```

---

## 5. 자동 계측 vs 수동 계측

| 항목 | 자동 계측 | 수동 계측 |
|------|----------|---------|
| 설정 비용 | 1번 설정 | span마다 코드 추가 |
| 적용 범위 | Fastify, Prisma, HTTP, Redis 등 표준 라이브러리 | 비즈니스 로직, LLM 호출 등 커스텀 코드 |
| 노이즈 | 있을 수 있음 (fs 계측 등) | 필요한 것만 추가 |
| 권장 방법 | 먼저 자동으로 시작 | 분석 필요 시 추가 |

all-flow Phase 1에서는 자동 계측으로 시작한다.
수동 계측은 분리 트리거 측정에 필요한 지점(WS 연결 수, LLM 호출 시간 등)에만 추가한다.

---

## 체크포인트

1. OTel SDK를 `src/server.ts`의 첫 번째 import로 로드해야 하는 이유는?

   **답**: OTel 자동 계측은 모듈이 로드될 때 패치(monkey-patch)를 적용한다. Fastify, Prisma 등 라이브러리가 먼저 로드되면 계측 패치가 적용되지 않는다. 따라서 다른 모든 import보다 먼저 `instrumentation.js`를 로드해야 한다.

2. `@opentelemetry/auto-instrumentations-node`에서 `instrumentation-fs`를 `enabled: false`로 설정하는 이유는?

   **답**: Node.js의 파일 시스템(`fs`) 작업은 빈번하게 발생하며 대부분 무관한 시스템 작업이다. 계측하면 노이즈가 많아져 실제 비즈니스 로직 추적이 어렵고, span 데이터 비용도 증가한다.

3. all-flow의 ai 모듈에서 LLM 호출 시간을 측정하려면 자동 계측으로 충분한가, 수동 계측이 필요한가? 이유를 설명하라.

   **답**: 수동 계측이 필요하다. LLM 호출은 표준 HTTP 클라이언트를 통해 이루어지므로 HTTP span은 자동으로 생성되지만, "몇 개의 액션을 추출했는가", "입력 텍스트 길이가 얼마인가" 같은 비즈니스 메타데이터는 자동 계측이 알 수 없다. 분리 트리거 측정(평균 지연 > 2초)에는 자동 계측이 충분하지만, 최적화 분석에는 수동 속성 추가가 필요하다.
