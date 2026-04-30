# 04. 실습 — 요청 1개를 BE→DB까지 추적하기

> 학습 목표: OTel trace ID를 사용하여 단일 HTTP 요청의 전체 경로(Fastify → Prisma → PostgreSQL)를 추적하는 방법을 실습할 수 있다.

---

## 1. 문제 정의 — "이 요청이 왜 느린가?"

```
사용자 신고: POST /api/v1/tasks 요청이 3초 걸린다

기존 디버깅 방법:
1. 로그 파일 grep → 수백 줄 중 관련 로그 찾기
2. 어디서 3초가 소요됐는지 알 수 없음
3. 로컬에서 재현 시도 → 빠름 (환경 차이)

OTel trace 디버깅:
1. traceId로 Tempo 조회
2. 3초 중 2.8초가 db.query span에서 발생 확인
3. 해당 span의 db.statement 속성 → 문제 쿼리 식별
```

---

## 2. 실습 전제 조건

all-flow-backend에 OTel SDK가 설치되어 있다고 가정한다.
`03-observability/02-opentelemetry-101.md`의 설정을 완료한 상태.

개발 환경:
```bash
# docker-compose.dev.yml에 Tempo + Grafana가 추가된 상태 가정
docker-compose -f project/all-flow-infra/docker-compose.dev.yml up
```

---

## 3. Trace 확인 방법

### 3.1 요청 보내기

```bash
# POST /api/v1/tasks 요청
curl -X POST http://localhost/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "테스트 태스크", "projectId": "proj-001"}' \
  -v  # 응답 헤더 출력
```

응답 헤더에서 `traceparent`를 확인:

```
HTTP/1.1 201 Created
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             ↑ trace-flags
                ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ trace-id (16 bytes)
                                                  ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ span-id
```

`4bf92f3577b34da6a3ce929d0e0e4736`이 이 요청의 traceId다.

### 3.2 Grafana Tempo에서 조회

```
1. http://localhost:3000 (Grafana) 접속
2. 좌측 메뉴 → Explore → Tempo 데이터소스 선택
3. "Search" → TraceID 입력: 4bf92f3577b34da6a3ce929d0e0e4736
4. 결과에서 span 트리 확인
```

예상 결과:

```
Trace: POST /api/v1/tasks (3,100ms)
  └─ span: middleware.authenticate (12ms)
  └─ span: tasks.create (3,088ms)
      └─ span: prisma.tasks.create (3,080ms)   ← 여기!
          └─ span: db.query (3,080ms)
              db.statement: INSERT INTO tasks (title, project_id, ...) VALUES (...)
```

---

## 4. OTel trace ID로 로그 연결하기

OTel SDK는 Fastify 요청 컨텍스트에 traceId를 자동으로 주입한다.
pino 로거가 이 컨텍스트를 읽도록 설정하면 로그에 traceId가 포함된다.

```typescript
// src/server.ts — pino log correlation 설정
import { trace, context } from '@opentelemetry/api';

const fastify = Fastify({
  logger: {
    level: 'info',
    mixin() {
      // 현재 OTel 컨텍스트에서 traceId + spanId 추출
      const span = trace.getActiveSpan();
      if (!span) return {};
      const ctx = span.spanContext();
      return {
        traceId: ctx.traceId,
        spanId: ctx.spanId,
      };
    },
  },
});
```

이제 로그 출력:

```json
{
  "level": "info",
  "time": "2026-04-30T10:30:00Z",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "msg": "Task created",
  "taskId": "task-001"
}
```

### Grafana에서 로그-트레이스 연결

```
1. Loki에서 로그 조회: {app="all-flow-backend"} |= "Task created"
2. traceId 필드 클릭
3. Tempo에서 해당 trace 자동 열림
```

---

## 5. 느린 쿼리 발견 시 대응 패턴

Trace에서 `db.query` span이 느린 것을 확인했을 때:

```typescript
// span의 db.statement 속성에서 쿼리 확인
// SELECT * FROM tasks WHERE project_id = $1
// → EXPLAIN ANALYZE로 실행 계획 확인

// 문제: projectId에 인덱스 없음 → 풀 테이블 스캔
// 해결: Prisma migration으로 인덱스 추가

// prisma/schema.prisma
model Task {
  id        String @id
  projectId String
  // ...

  @@index([projectId])  // 추가
}
```

추가 후 재측정:

```
수정 전: db.query span 3,080ms
수정 후: db.query span 8ms
```

이처럼 trace → 원인 → 수정 → 재측정 사이클이 OTel의 핵심 가치다.

---

## 6. 실습 체크리스트

```
□ POST /api/v1/tasks 요청 후 응답 헤더에서 traceparent 확인
□ traceId를 Grafana Tempo에서 조회
□ 가장 오래 걸린 span 식별
□ 해당 span의 db.statement 속성 확인
□ 로그에서 동일 traceId로 연관 로그 조회
□ Loki → Tempo 연결 클릭 동작 확인
```

---

## 체크포인트

1. `traceparent` 응답 헤더에서 traceId와 spanId의 위치를 설명하라.

   **답**: `traceparent` 형식은 `{version}-{traceId}-{spanId}-{flags}`다. `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`에서 32자 hex(`4bf92f3577b34da6a3ce929d0e0e4736`)가 traceId, 16자 hex(`00f067aa0ba902b7`)가 spanId다.

2. pino의 `mixin()` 함수에서 traceId를 추출하는 이유는 무엇인가?

   **답**: pino는 기본적으로 OTel 컨텍스트를 모른다. `mixin()`은 각 로그 메시지 생성 시 호출되는 함수로, 현재 OTel active span의 traceId/spanId를 로그 필드에 자동으로 추가한다. 이를 통해 로그와 trace를 traceId로 연결할 수 있다.

3. Trace에서 특정 span이 3초 걸린다고 발견했을 때, 그것이 DB 쿼리 span이라면 다음 단계로 무엇을 확인해야 하는가?

   **답**: span의 `db.statement` 속성에서 실행된 SQL 쿼리를 확인한다. 그 쿼리를 PostgreSQL에서 `EXPLAIN ANALYZE`로 실행하여 실행 계획(인덱스 사용 여부, 풀 테이블 스캔 등)을 분석한다. 인덱스 미존재 시 Prisma migration으로 추가하고 재측정한다.
