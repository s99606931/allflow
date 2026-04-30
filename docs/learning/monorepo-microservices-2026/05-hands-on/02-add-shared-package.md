# 02. 실습 — packages/shared 추가하기

> 학습 목표: 공유 패키지를 monorepo에 추가하고 여러 앱에서 `workspace:*`로 참조하는 전체 과정을 실습할 수 있다.

---

## 1. 문제 정의 — 왜 shared를 추출하는가

all-flow에서 현재 중복되는 코드:

```typescript
// all-flow-backend/src/shared/envelope.ts
export function createSuccessEnvelope<T>(data: T) {
  return { success: true, data, error: null };
}

// all-flow-frontend/src/lib/api.ts
function wrapResponse<T>(data: T) {
  return { ok: true, data };  // 유사하지만 다른 구조!
}
```

`packages/shared`로 추출하면 BE와 FE가 동일한 응답 구조를 사용한다.
API 응답 형식이 달라서 FE 파싱이 실패하는 버그를 방지한다.

---

## 2. packages/shared 패키지 생성

### 2.1 폴더 구조

```bash
mkdir -p packages/shared/src
```

### 2.2 package.json

```json
{
  "name": "@all-flow/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./envelope": {
      "types": "./dist/envelope.d.ts",
      "import": "./dist/envelope.js"
    },
    "./errors": {
      "types": "./dist/errors.d.ts",
      "import": "./dist/errors.js"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "typecheck": "tsc --noEmit",
    "dev": "tsup src/index.ts --format esm --dts --watch"
  },
  "devDependencies": {
    "tsup": "^8.3.5",
    "typescript": "^5.7.3"
  }
}
```

### 2.3 tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

---

## 3. 실제 코드 — all-flow envelope/errors 패턴 기반

### 3.1 src/envelope.ts

all-flow API 응답 표준 구조:

```typescript
// packages/shared/src/envelope.ts
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  error: null;
}

export interface ErrorEnvelope {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export function ok<T>(data: T): SuccessEnvelope<T> {
  return { success: true, data, error: null };
}

export function fail(code: string, message: string, details?: unknown): ErrorEnvelope {
  return { success: false, data: null, error: { code, message, details } };
}
```

### 3.2 src/errors.ts

```typescript
// packages/shared/src/errors.ts
export const ErrorCode = {
  // 인증
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // 리소스
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // 검증
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // 서버
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];
```

### 3.3 src/index.ts

```typescript
// packages/shared/src/index.ts
export * from './envelope.js';
export * from './errors.js';
```

---

## 4. pnpm-workspace.yaml 업데이트

```yaml
# pnpm-workspace.yaml
packages:
  - 'project/all-flow-backend'
  - 'project/all-flow-frontend'
  - 'packages/*'           # 추가!
```

---

## 5. 앱에서 shared 패키지 참조

### 5.1 BE package.json에 의존성 추가

```json
// project/all-flow-backend/package.json
{
  "dependencies": {
    "@all-flow/shared": "workspace:*"
  }
}
```

```bash
pnpm install  # workspace 링크 생성
```

### 5.2 BE에서 사용

```typescript
// project/all-flow-backend/src/modules/tasks/tasks.routes.ts
import { ok, fail, ErrorCode } from '@all-flow/shared';

fastify.post('/tasks', async (req, reply) => {
  const task = await tasksService.create(req.body);
  return reply.status(201).send(ok(task));
});

fastify.get('/tasks/:id', async (req, reply) => {
  const task = await tasksService.findById(req.params.id);
  if (!task) {
    return reply.status(404).send(fail(ErrorCode.NOT_FOUND, 'Task not found'));
  }
  return reply.send(ok(task));
});
```

### 5.3 FE에서 사용

```typescript
// project/all-flow-frontend/src/lib/api/http.ts
import type { ApiEnvelope } from '@all-flow/shared';

async function fetchTasks(): Promise<ApiEnvelope<Task[]>> {
  const res = await fetch('/api/v1/tasks');
  return res.json() as ApiEnvelope<Task[]>;
}

// 사용 시 타입 안전 분기
const result = await fetchTasks();
if (result.success) {
  console.log(result.data);  // Task[] 타입으로 추론
} else {
  console.error(result.error.code);  // ErrorCode 타입으로 추론
}
```

---

## 6. turbo.json에서 shared 빌드 순서 확인

`"dependsOn": ["^build"]` 설정으로 `packages/shared`가 먼저 빌드된다.

```bash
# 빌드 순서 확인
turbo run build --dry-run

# 출력 예시:
# @all-flow/shared#build      (먼저 실행)
# @all-flow/backend#build     (shared 완료 후)
# @all-flow/frontend#build    (shared 완료 후)
```

---

## 체크포인트

1. `packages/shared/src/envelope.ts`에서 Node.js의 `fs` 모듈을 import하면 안 되는 이유는?

   **답**: `packages/shared`는 BE(Node.js)와 FE(브라우저) 모두에서 import된다. `fs`는 Node.js 전용 모듈로 브라우저 환경에서 실행되지 않는다. FE 빌드 시 오류가 발생하거나 런타임 오류가 발생한다. shared 패키지는 반드시 브라우저 호환 코드만 포함해야 한다.

2. `exports` 필드에 `"./envelope"`, `"./errors"` 서브패스를 정의하는 이점은?

   **답**: 소비처에서 `import { ok } from '@all-flow/shared/envelope'`처럼 필요한 모듈만 선택적으로 import할 수 있다. 트리쉐이킹(Tree-shaking)이 더 잘 작동하여 번들 크기가 줄어든다. 패키지 내부 구조를 바꿔도 export 경로가 안정적으로 유지된다.

3. `pnpm install`을 root에서 실행한 후 `project/all-flow-frontend/node_modules/@all-flow/shared`를 확인하면 무엇이 보이는가?

   **답**: 실제 파일 복사가 아닌 심볼릭 링크가 생성된다. `packages/shared` 폴더를 가리키는 symlink다. 이 덕분에 `packages/shared/src`를 수정하면 BE/FE에서 즉시 반영된다 (빌드 단계 없이 TypeScript 소스를 직접 참조하는 경우). 빌드 output을 참조한다면 `pnpm build --filter @all-flow/shared`가 먼저 필요하다.
