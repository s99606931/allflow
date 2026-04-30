# 04. 실습 — OTel 계측 한 줄 추가하기

> 학습 목표: 기존 all-flow-backend 코드에 OTel SDK를 추가하고, Grafana Tempo에서 trace를 확인하는 전체 과정을 5단계로 완료할 수 있다.

---

## 1. 문제 정의 — 최소 변경으로 최대 관측성

OTel 계측을 "나중에 하자"고 미루는 이유는 "설정이 복잡할 것"이라는 예상 때문이다.
실제로는 3개 패키지 설치 + `instrumentation.ts` 파일 1개면 Fastify + Prisma + Redis 자동 계측이 된다.

---

## 2. 5단계 실습

### 단계 1: 의존성 설치

```bash
cd /data/allflow/project/all-flow-backend

pnpm add \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http
```

설치 확인:

```bash
# package.json에 추가됐는지 확인
grep opentelemetry package.json
```

### 단계 2: instrumentation.ts 생성

```typescript
// project/all-flow-backend/src/instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

const isEnabled = process.env.OTEL_ENABLED !== 'false';

if (isEnabled) {
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
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown().catch(() => undefined);
  });
}
```

### 단계 3: server.ts 첫 줄에 import 추가

```typescript
// project/all-flow-backend/src/server.ts — 첫 번째 줄에 추가
import './instrumentation.js';

// 기존 import들...
import Fastify from 'fastify';
// ...
```

이 한 줄이 핵심이다. 나머지 코드 변경 없이 자동 계측이 작동한다.

### 단계 4: docker-compose에 OTel Collector + Tempo 추가

```yaml
# project/all-flow-infra/docker-compose.dev.yml 에 추가
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4318:4318"   # OTLP HTTP

  tempo:
    image: grafana/tempo:latest
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./tempo-config.yaml:/etc/tempo.yaml
    ports:
      - "3200:3200"   # Tempo HTTP API

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"   # Grafana UI
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
    volumes:
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/ds.yaml
```

OTel Collector 설정:

```yaml
# project/all-flow-infra/otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: "0.0.0.0:4318"

exporters:
  otlp/tempo:
    endpoint: "http://tempo:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/tempo]
```

### 단계 5: 확인

```bash
# 서비스 시작
docker-compose -f project/all-flow-infra/docker-compose.dev.yml up

# 환경변수 설정
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# BE 시작
pnpm --filter @all-flow/backend dev

# 요청 보내기
curl -X GET http://localhost/api/v1/health -v

# Grafana에서 확인
open http://localhost:3001
# → Explore → Tempo → Search → Service Name: all-flow-backend
```

---

## 3. 자동 계측으로 확인되는 span

`getNodeAutoInstrumentations()`가 자동으로 계측하는 항목:

| 라이브러리 | 생성되는 span |
|----------|-------------|
| Fastify | `POST /api/v1/tasks`, `GET /api/v1/tasks/:id` |
| Prisma | `prisma:client:operation`, `db.sql.table` |
| ioredis | `redis-COMMAND`, `db.redis.database_index` |
| http/https | 외부 HTTP 요청 (LLM API 등) |

---

## 4. 개발 환경에서만 활성화

프로덕션과 개발 환경 분리:

```bash
# .env.development
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# .env.production
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318/v1/traces
# 프로덕션에서는 OTel Collector가 다른 주소

# 로컬 개발에서 빠르게 비활성화
OTEL_ENABLED=false
```

---

## 체크포인트

1. `import './instrumentation.js'`를 `src/server.ts`의 다른 import보다 먼저 위치시키지 않으면 어떤 문제가 발생하는가?

   **답**: OTel 자동 계측은 라이브러리 로드 시 monkey-patch를 적용한다. `import Fastify from 'fastify'`가 먼저 실행되면 Fastify 객체에 계측 패치가 적용되지 않아 Fastify 관련 span이 생성되지 않는다. Prisma, ioredis 등 다른 라이브러리도 마찬가지다.

2. `OTEL_ENABLED=false` 환경변수로 계측을 비활성화하는 것이 좋은 이유는?

   **답**: OTel SDK 초기화는 시작 시간과 메모리를 소비한다. 로컬 개발 중 Tempo 없이 작업할 때는 불필요한 연결 시도와 오류 로그가 발생한다. 환경변수로 제어하면 OTel Collector 없이도 서버가 정상 기동되고, 필요할 때만 활성화할 수 있다.

3. 이 실습 완료 후 Grafana Tempo에서 `GET /api/v1/health` trace를 조회했을 때 예상되는 span 구조는?

   **답**: 최상위 span으로 `GET /api/v1/health` (Fastify instrumentation)가 있고, 그 하위에 health 모듈이 DB 상태를 확인한다면 `prisma:client:operation` span이 있을 것이다. Redis ping을 확인한다면 `redis-PING` span도 포함된다. 총 소요 시간은 DB/Redis 응답 시간을 포함한 전체 요청 시간이다.
