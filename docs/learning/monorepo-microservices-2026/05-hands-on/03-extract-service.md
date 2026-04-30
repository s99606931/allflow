# 03. 실습 — 1개 모듈을 service로 떼기 (realtime 예시)

> 학습 목표: Modular Monolith에서 모듈 1개를 독립 서비스로 분리하는 전체 과정을 realtime 모듈 예시로 이해하고, 분리 전 체크리스트를 완료할 수 있다.

---

## 1. 문제 정의 — 분리 전에 반드시 확인할 것

분리는 "할 수 있다"가 아니라 "해야 한다"는 측정 근거가 있을 때 한다.

**realtime 분리 전 체크리스트**:

```
□ WS 동시접속 1,000 초과 측정 확인 (또는 재배포 연결 단절 불만 입증)
□ OTel trace에서 realtime이 병목임을 확인
□ 분리 비용(Redis 공유, JWT 공유, 독립 배포 파이프라인) 계산 완료
□ packages/contracts SOR 구축 완료 (서비스 간 타입 공유 준비)
□ packages/shared 추출 완료 (공통 유틸 공유 준비)
```

이 체크리스트 없이 진행하는 분리 실습은 "방법 학습"용이다.
실제 프로덕션 분리는 측정 데이터 기반이어야 한다.

---

## 2. 현재 realtime 모듈 구조 파악

```
project/all-flow-backend/src/modules/realtime/
├── realtime-bus.ts      ← 이벤트 버스 추상화
├── redis-fanout.ts      ← Redis Pub/Sub fan-out
├── realtime.routes.ts   ← SSE/WS 엔드포인트
└── index.ts
```

realtime 모듈의 의존성:
- Redis (ioredis) — 이미 독립 서비스
- JWT 검증 — auth 모듈과 공유
- RealtimeEvent 타입 — `../../shared/schemas/index.js`

의존성이 비교적 적어 분리 비용이 낮다 (1순위 이유).

---

## 3. 분리 단계별 과정

### 3.1 apps/realtime 생성 (새 서비스)

```bash
mkdir -p apps/realtime/src
```

```json
// apps/realtime/package.json
{
  "name": "@all-flow/realtime-service",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsup",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@all-flow/contracts": "workspace:*",
    "@all-flow/shared": "workspace:*",
    "fastify": "^5.8.5",
    "@fastify/websocket": "^11.2.0",
    "ioredis": "^5.10.1"
  }
}
```

### 3.2 realtime 모듈 코드 이전

```typescript
// apps/realtime/src/server.ts
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { Redis } from 'ioredis';
import { attachRedisFanout } from './redis-fanout.js';
import { RealtimeBus } from './realtime-bus.js';

// redis-fanout.ts와 realtime-bus.ts를 이 서비스로 이전
```

### 3.3 이전 모듈과의 통신 단절

```typescript
// 분리 전 — tasks 모듈이 realtime bus를 직접 import
import { realtimeBus } from '../realtime/realtime-bus.js';
realtimeBus.publish({ type: 'task.created', payload: task });

// 분리 후 — Redis Streams로 이벤트 발행
import { Redis } from 'ioredis';
const redis = new Redis(process.env.REDIS_URL!);
await redis.xadd('events:task', '*',
  'type', 'task.created',
  'taskId', task.id,
  'userId', session.userId
);
```

### 3.4 realtime-service에서 이벤트 소비

```typescript
// apps/realtime/src/event-consumer.ts
import { Redis } from 'ioredis';
import type { RealtimeBus } from './realtime-bus.js';

export async function startEventConsumer(bus: RealtimeBus, redis: Redis) {
  // Redis Streams Consumer Group 사용
  await redis.xgroup('CREATE', 'events:task', 'realtime-service', '$', 'MKSTREAM')
    .catch(() => undefined); // 이미 존재하면 무시

  while (true) {
    const messages = await redis.xreadgroup(
      'GROUP', 'realtime-service', 'consumer-1',
      'COUNT', '10', 'BLOCK', '1000',
      'STREAMS', 'events:task', '>'
    );

    if (!messages) continue;

    for (const [, entries] of messages) {
      for (const [id, fields] of entries) {
        const type = fields[fields.indexOf('type') + 1];
        const taskId = fields[fields.indexOf('taskId') + 1];

        // WS 클라이언트에 전달
        bus.deliverLocal({ type, payload: { taskId } });

        // 처리 완료 확인
        await redis.xack('events:task', 'realtime-service', id);
      }
    }
  }
}
```

---

## 4. 분리 후 docker-compose 변경

```yaml
# docker-compose.dev.yml 변경
services:
  backend:
    # realtime 관련 환경변수 제거
    environment:
      - REDIS_URL=redis://redis:6379
      # REALTIME_ENABLED 제거 (이제 별도 서비스)

  realtime:               # 신규 서비스
    build:
      context: ./apps/realtime
    ports:
      - "3001:3001"       # WS 전용 포트
    environment:
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
```

---

## 5. 분리 후 검증

```bash
# 1. 두 서비스 모두 시작
docker-compose up backend realtime

# 2. WS 연결 테스트
# browser DevTools → WebSocket 연결 → backend 포트에서 realtime 포트로 변경 확인

# 3. 회귀 테스트
pnpm --filter @all-flow/realtime-service test

# 4. Playwright E2E (realtime 기능 포함)
pnpm e2e

# 5. 트레이싱 확인
# Grafana Tempo에서 WS 이벤트가 realtime-service trace로 표시되는지 확인
```

---

## 6. 롤백 전략

분리 후 문제 발생 시:

```bash
# realtime 서비스 중단
docker-compose stop realtime

# backend의 내장 realtime 재활성화
# apps/backend/src/app.ts에서 realtime module 주석 해제
```

Turborepo + monorepo 구조이므로 단일 git revert로 이전 상태 복귀 가능.

---

## 체크포인트

1. realtime 모듈을 분리할 때 Redis Pub/Sub 대신 Redis Streams로 이벤트 전달 방식을 바꾸는 이유는?

   **답**: Redis Pub/Sub은 at-most-once — 소비자가 없을 때 이벤트가 소실된다. tasks-service가 이벤트를 발행할 때 realtime-service가 잠깐 재시작 중이라면 이벤트를 영구적으로 놓친다. Redis Streams는 이벤트를 디스크에 저장하고 Consumer Group으로 재처리를 보장한다.

2. 분리 후 tasks 모듈에서 `realtimeBus.publish()`를 직접 호출하는 것이 불가능한 이유는?

   **답**: 분리 후 tasks-service와 realtime-service는 별도 프로세스로 실행된다. JavaScript에서 다른 프로세스의 메모리에 있는 함수를 직접 호출할 수 없다. 프로세스 간 통신은 Redis, HTTP, gRPC 같은 네트워크 매개체를 사용해야 한다.

3. 분리 후 Playwright E2E 테스트에서 realtime 기능이 실패한다면 어떤 설정을 먼저 확인해야 하는가?

   **답**: docker-compose에서 realtime 서비스가 올바르게 기동됐는지, 포트가 올바르게 매핑됐는지 확인한다. E2E 테스트의 WS 연결 URL이 backend에서 realtime 서비스 포트로 변경됐는지 확인한다. Playwright의 `globalSetup`에서 realtime 서비스 헬스체크가 포함됐는지 확인한다.
