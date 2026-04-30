# 02. pnpm Workspaces와 Catalog

> 학습 목표: pnpm workspace를 설정하고, `workspace:*` 프로토콜과 catalog로 의존성을 관리하는 방법을 설명할 수 있다.

---

## 1. 문제 정의 — 버전 드리프트란

의존성 버전 드리프트(Version Drift)는 동일 라이브러리를 여러 패키지에서 서로 다른 버전으로 사용하는 상태다.

all-flow의 실제 드리프트 사례 (2026-04-30):

```
all-flow-backend/package.json:   "zod": "^4.3.6"
all-flow-frontend/package.json:  "zod": "^4.1.0"

all-flow-backend/package.json:   "@types/node": "^22.10.0"
all-flow-frontend/package.json:  "@types/node": "^22.13.4"
```

이 상태가 위험한 이유:
- zod의 마이너 버전 간 schema 동작 차이가 발생하면 BE/FE가 서로 다르게 검증한다
- 문제가 런타임에서야 발견된다
- 어느 버전이 "정답"인지 알 수 없다

---

## 2. pnpm Workspace 기본

pnpm workspace는 하나의 `pnpm-workspace.yaml` 파일로 여러 패키지를 하나의 pnpm 관리 하에 묶는다.

```yaml
# pnpm-workspace.yaml 기본 구조
packages:
  - 'apps/*'
  - 'packages/*'
```

이 설정만으로:

```bash
# 루트에서 한 번만 실행하면 모든 패키지 의존성 설치
pnpm i

# 특정 패키지만 실행
pnpm --filter @all-flow/backend dev
pnpm --filter @all-flow/frontend build

# 전체 실행 (Turborepo 없이도 가능)
pnpm -r build
```

---

## 3. 실제 all-flow pnpm-workspace.yaml

현재 `/data/allflow/pnpm-workspace.yaml` 내용:

```yaml
# ALL-Flow monorepo workspaces
# Step 1 (2026-04-30): BE + FE only. infra has no package.json (Makefile-driven).
# Step 3+ will activate packages/* and apps/* after folder migration.
packages:
  - 'project/all-flow-backend'
  - 'project/all-flow-frontend'
  # - 'packages/*'   # Step 3+ (contracts, shared, config-*)
  # - 'apps/*'       # Step 2 (after git mv project/all-flow-* → apps/*)
```

주목할 점:
- `infra`는 `package.json`이 없으므로 workspace에 포함되지 않는다 (Makefile 기반)
- Step 2 완료 후 `apps/*` 패턴으로 교체 예정
- Step 3 완료 후 `packages/*` 패턴 활성화 예정

---

## 4. `workspace:*` 프로토콜

monorepo 내 패키지끼리 의존하려면 npm registry가 아닌 로컬 경로를 참조해야 한다.
pnpm은 이를 위해 `workspace:*` 프로토콜을 제공한다.

### Before (없는 경우의 문제)

```json
// packages/contracts 추출 전: FE에서 직접 경로 참조 (취약)
{
  "dependencies": {
    "@all-flow/contracts": "file:../../packages/contracts"  // 경로 변경 시 깨짐
  }
}
```

### After (`workspace:*` 사용)

```json
// apps/frontend/package.json
{
  "dependencies": {
    "@all-flow/contracts": "workspace:*",
    "@all-flow/shared": "workspace:*"
  }
}
```

`workspace:*`의 의미:
- `*` = 현재 workspace에 있는 어떤 버전이든 사용
- pnpm이 자동으로 로컬 패키지를 심볼릭 링크로 연결
- publish 시에는 실제 버전 번호로 교체됨

### 실제 사용 예시

```typescript
// apps/backend/src/modules/tasks/tasks.controller.ts (Phase 1 완료 후 예상)
import { TaskSchema } from '@all-flow/contracts/zod';
import { createEnvelope } from '@all-flow/shared/envelope';

// 현재는 아직 이 import가 없음 — packages/ 추출 후 적용 예정
```

---

## 5. pnpm Catalog — 버전 드리프트 해결

pnpm 10에서 정식 도입된 Catalog 기능은 공통 의존성의 버전을 루트 한 곳에서 정의한다.

### Before (드리프트 발생)

```json
// project/all-flow-backend/package.json
{ "dependencies": { "zod": "^4.3.6" } }

// project/all-flow-frontend/package.json
{ "dependencies": { "zod": "^4.1.0" } }  // 버전 다름!
```

### After (catalog 적용)

```yaml
# pnpm-workspace.yaml (Step 6 완료 후 예상)
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  # 모든 패키지가 동일 버전 사용
  zod: "^4.3.6"
  typescript: "^5.7.3"
  vitest: "^2.1.9"
  "@types/node": "^22.13.4"
```

```json
// apps/backend/package.json (catalog 적용 후)
{
  "dependencies": {
    "zod": "catalog:"   // "catalog:" 하나로 버전 참조
  }
}

// apps/frontend/package.json (동일)
{
  "dependencies": {
    "zod": "catalog:"   // 자동으로 ^4.3.6으로 해석
  }
}
```

버전 변경이 필요할 때 `pnpm-workspace.yaml` 한 줄만 수정하면 모든 패키지에 반영된다.

---

## 6. disk 절약 — content-addressable store

pnpm은 파일을 중앙 store에 한 번만 저장하고 심볼릭 링크를 사용한다.

```
~/.pnpm-store/         ← 중앙 저장소 (패키지 실제 파일)
  v3/
    files/
      ab/cd...         ← content hash 기반 저장

/data/allflow/
  node_modules/
    .pnpm/
      zod@4.3.6/       ← store의 심볼릭 링크
    zod -> .pnpm/zod@4.3.6/node_modules/zod
```

같은 버전의 패키지가 여러 workspace에 있어도 disk에는 1개만 저장된다.
npm 대비 60~80% disk 절약, 3~5배 빠른 설치 속도.

---

## 체크포인트

1. `workspace:*`와 `file:../../packages/contracts`의 차이점은 무엇인가?

   **답**: `workspace:*`는 pnpm workspace 내의 패키지를 참조하며, 폴더 이동 시에도 경로를 자동으로 추적한다. publish 시 실제 버전으로 교체된다. `file:` 경로는 절대/상대 경로에 의존하므로 폴더 구조 변경 시 깨질 수 있고 publish 처리가 별도로 필요하다.

2. pnpm catalog를 사용했을 때 `zod` 버전을 `^4.3.6`에서 `^5.0.0`으로 올리려면 몇 개 파일을 수정해야 하는가?

   **답**: `pnpm-workspace.yaml` 1개 파일만 수정한다. catalog를 사용하는 모든 패키지에서 `"zod": "catalog:"`로 참조하므로, workspace.yaml의 `catalog.zod` 값만 변경하면 전체에 반영된다.

3. all-flow에서 `all-flow-infra`가 pnpm workspace에 포함되지 않는 이유는?

   **답**: `all-flow-infra`에는 `package.json`이 없다. docker-compose와 Makefile로만 구성된 인프라 설정이기 때문에 Node.js 패키지 관리 대상이 아니다.
