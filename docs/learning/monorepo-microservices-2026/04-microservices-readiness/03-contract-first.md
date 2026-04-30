# 03. Contract-first — OpenAPI 3.1 / gRPC / tRPC

> 학습 목표: Contract-first 설계의 필요성을 설명하고, OpenAPI 3.1 / gRPC / tRPC의 트레이드오프를 all-flow의 맥락에서 비교할 수 있다.

---

## 1. 문제 정의 — Contract 없는 API의 위험

Contract(계약) 없이 API를 개발하면:

```
BE 개발자: "Task 응답에 dueDate 타입을 string에서 Date로 바꿨어요"
FE 개발자: (2일 후) "화면에서 날짜 파싱 오류 나는데요?"
→ 런타임에서 발견. 사용자가 먼저 경험.
```

Contract-first는 API 구현 전에 계약(스펙)을 먼저 정의하고, 양쪽이 그 계약을 준수하는 방식이다.

---

## 2. Contract-first 방식 비교

| 항목 | OpenAPI 3.1 | gRPC | tRPC |
|------|------------|------|------|
| 스펙 형식 | YAML/JSON | .proto 파일 | TypeScript 코드 |
| 타입 안전 | 생성 코드 통해 | 네이티브 | 네이티브 |
| 브라우저 지원 | ✅ REST | gRPC-Web 필요 | ✅ |
| 외부 API 노출 | ✅ 적합 | 내부에 적합 | TS 프로젝트 전용 |
| 언어 중립 | ✅ | ✅ | ✅ (TS만) |
| 학습 곡선 | 중간 | 높음 | 낮음 (TS 프로젝트) |
| all-flow 적합성 | ✅ 현재 채택 | 외부 노출 없어 불필요 | 고려 가능 |

---

## 3. OpenAPI 3.1 — all-flow의 선택

all-flow는 OpenAPI 3.1을 채택했다.
현재 `project/all-flow-frontend/openapi.yaml` (1162줄)이 SOR(Single Source of Truth)으로 사용 중이다.

### 3.1 OpenAPI 3.1이 3.0과 다른 점

```yaml
# OpenAPI 3.0: nullable 표기 방식
type: string
nullable: true

# OpenAPI 3.1: JSON Schema 완전 호환
type: ["string", "null"]
# 또는
oneOf:
  - type: string
  - type: "null"
```

all-flow는 이미 OpenAPI 3.1을 사용하며, Zod 생성 코드도 3.1 nullable을 올바르게 처리한다.

### 3.2 packages/contracts 전략 (PRD §2.5)

현재 (수동 mirror 구조):

```
FE/openapi.yaml (SOR)  →  수동  →  BE Zod schemas
```

Phase 1 완료 후 목표:

```
packages/contracts/openapi.yaml (SOR)
  ↓ pnpm contracts:gen:zod
  packages/contracts/src/zod/    ← BE import
  ↓ pnpm contracts:gen:ts
  packages/contracts/src/types/  ← FE import
```

BE import 예시:

```typescript
// apps/backend/src/modules/tasks/tasks.schema.ts (Phase 1 후)
import { TaskCreateSchema, TaskSchema } from '@all-flow/contracts/zod';

// 현재는 수동으로 정의한 schema가 여기 있음
```

FE import 예시:

```typescript
// apps/frontend/src/lib/api-types.ts (Phase 1 후)
import type { Task, CreateTaskInput } from '@all-flow/contracts/types';
```

---

## 4. gRPC — 왜 all-flow에서 불필요한가

gRPC는 Protocol Buffers를 사용하는 이진(binary) RPC 프레임워크다.

```protobuf
// tasks.proto
service TaskService {
  rpc CreateTask(CreateTaskRequest) returns (Task);
  rpc ListTasks(ListTasksRequest) returns (TaskList);
}

message Task {
  string id = 1;
  string title = 2;
  google.protobuf.Timestamp created_at = 3;
}
```

gRPC의 장점:
- 이진 직렬화 → JSON보다 전송 효율 높음
- 강한 타입 보장
- 스트리밍 지원

**왜 all-flow에서 불필요한가**:
- 브라우저는 gRPC를 직접 지원하지 않음 (gRPC-Web 미들웨어 필요)
- 외부에 노출되는 API가 없음 (FE-BE 내부 통신만)
- 이미 OpenAPI 3.1 + TypeScript 타입 생성으로 타입 안전 확보
- 개발자 1명 기준 proto 파일 관리 오버헤드

gRPC는 "서비스 간 내부 통신"에 적합하다. all-flow가 MSA로 분리되어 서비스 간 고빈도 통신이 발생할 때 재검토.

---

## 5. tRPC — 고려 가능하지만 현재는 보류

tRPC는 TypeScript 프로젝트에서 런타임 없이 엔드투엔드 타입 안전을 제공한다.

```typescript
// apps/backend/src/router.ts (tRPC 예시)
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();
export const router = t.router({
  tasks: t.router({
    create: t.procedure
      .input(z.object({ title: z.string(), projectId: z.string() }))
      .mutation(async ({ input }) => {
        return prisma.task.create({ data: input });
      }),
  }),
});

export type AppRouter = typeof router;
```

```typescript
// apps/frontend/src/hooks/use-tasks.ts (tRPC FE)
import { trpc } from '@/lib/trpc';

export function useCreateTask() {
  return trpc.tasks.create.useMutation();  // 타입 자동 추론
}
```

**장점**: FE가 BE의 프로시저를 함수처럼 호출. 타입이 자동으로 FE에 전달.

**왜 지금은 보류인가**:
- all-flow는 이미 OpenAPI 3.1 SOR + 1162줄 yaml이 있음
- tRPC로 전환하면 OpenAPI 스펙 제거 → 외부 API 문서화 불가
- 외부 클라이언트(모바일 앱, 3rd party) 추가 시 OpenAPI가 필요
- 현재 drift 가드 + contracts 전략으로 tRPC의 이점을 상당 부분 확보 가능

---

## 체크포인트

1. OpenAPI 3.1의 nullable 표기가 3.0과 다른 이유는?

   **답**: OpenAPI 3.1은 JSON Schema 표준과 완전히 호환된다. JSON Schema에서는 `nullable: true` 대신 `type: ["string", "null"]` 형식을 사용한다. 이 변경으로 JSON Schema 도구들과의 호환성이 높아지고, Zod 생성기도 표준 방식으로 처리할 수 있다.

2. tRPC가 OpenAPI 3.1보다 FE-BE 타입 공유에서 더 편리한 이유와, 그럼에도 all-flow가 OpenAPI를 유지하는 이유를 설명하라.

   **답**: tRPC는 .proto 파일이나 yaml 스펙 없이 TypeScript 코드 자체가 계약이 되어 FE에 자동으로 타입이 전달된다. 하지만 all-flow는 외부 클라이언트(모바일 앱, 3rd party 연동) 추가 가능성이 있고, OpenAPI는 언어 중립적 문서화가 가능하다. 이미 1162줄의 OpenAPI 스펙이 있으므로 전환 비용도 크다.

3. gRPC를 "외부 노출 없는 내부 통신"에 사용하는 것이 OpenAPI REST보다 유리한 경우는?

   **답**: 서비스 간 고빈도(초당 수천 건) 통신이 발생하고 전송 효율이 중요할 때다. gRPC는 이진 직렬화(Protobuf)로 JSON보다 페이로드 크기가 작고 직렬화가 빠르다. 또한 단방향 스트리밍, 양방향 스트리밍 등 HTTP/2 기능을 활용할 수 있다. all-flow의 현재 MSA 분리 후보(realtime 서비스)가 분리된다면 이 시나리오를 검토할 수 있다.
