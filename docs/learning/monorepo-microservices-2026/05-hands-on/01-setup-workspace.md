# 01. 실습 — 로컬에서 첫 monorepo 만들기 (5분)

> 학습 목표: all-flow의 Step 1을 처음부터 따라하며 pnpm workspace + Turborepo의 기본 설정을 완료할 수 있다.

---

## 1. 문제 정의 — Step 1이 하는 일

all-flow의 monorepo 전환 Step 1은 다음을 완료한다:

1. root `package.json` 생성 — turbo 스크립트 정의
2. `pnpm-workspace.yaml` 생성 — 패키지 경로 등록
3. `turbo.json` 생성 — task pipeline 정의
4. `tsconfig.base.json` 생성 — 공통 TS 설정

코드 변경 없이 설정 파일만 추가하는 단계다.

---

## 2. 실습 환경 확인

```bash
# 필요한 도구 버전 확인
node --version   # >=22.0.0
pnpm --version   # >=10.0.0
```

pnpm이 없으면:

```bash
npm install -g pnpm@10
```

---

## 3. 처음부터 만들기 — Step by Step

### 3.1 새 디렉토리 생성

```bash
mkdir my-monorepo && cd my-monorepo
git init
```

### 3.2 pnpm-workspace.yaml

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 3.3 root package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "packageManager": "pnpm@10.33.0",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "dev": "turbo run dev --parallel"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### 3.4 turbo.json

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "globalDependencies": ["tsconfig.base.json"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### 3.5 tsconfig.base.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

### 3.6 첫 패키지 추가

```bash
mkdir -p apps/backend apps/frontend

# apps/backend/package.json
cat > apps/backend/package.json << 'EOF'
{
  "name": "@my-monorepo/backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "lint": "biome check .",
    "typecheck": "tsc --noEmit"
  }
}
EOF
```

### 3.7 설치 및 확인

```bash
pnpm install

# workspace가 인식됐는지 확인
pnpm list --recursive --depth=0
# 출력: @my-monorepo/backend, @my-monorepo/frontend
```

---

## 4. all-flow에서 Step 1이 실제로 어떻게 수행됐는가

2026-04-30에 all-flow는 이미 Step 1을 완료했다.
실제 결과물 확인:

```bash
# all-flow Step 1 결과 확인
ls /data/allflow/pnpm-workspace.yaml    # 존재
ls /data/allflow/turbo.json             # 존재
ls /data/allflow/package.json           # 확인 필요

# workspace 인식 확인
cd /data/allflow && pnpm list --recursive --depth=0
```

실제 `/data/allflow/pnpm-workspace.yaml`:

```yaml
# ALL-Flow monorepo workspaces
packages:
  - 'project/all-flow-backend'
  - 'project/all-flow-frontend'
  # - 'packages/*'   # Step 3+
  # - 'apps/*'       # Step 2
```

주목: `project/all-flow-*` 경로를 사용한다. Step 2에서 `apps/*`로 이동 예정.

---

## 5. 검증 — 올바르게 설정됐는지 확인

```bash
# Turborepo task 확인 (dry-run)
turbo run build --dry-run

# 출력 예시:
# Tasks to run:
#   @all-flow/backend#build  (cache miss, outputs: dist/**)
#   @all-flow/frontend#build (cache miss, outputs: .next/**)
#
# Dependencies: @all-flow/backend#build → ... (^build 순서 확인)
```

---

## 체크포인트

1. root `package.json`에 `"private": true`를 반드시 설정해야 하는 이유는?

   **답**: root 패키지를 npm registry에 실수로 publish하는 것을 방지한다. monorepo의 root는 배포 대상이 아니라 workspace 조율 역할만 한다. `private: true` 없이 `npm publish`를 실행하면 root가 공개 패키지로 배포될 수 있다.

2. `tsconfig.base.json`에서 `"noUncheckedIndexedAccess": true`를 설정하면 어떤 효과가 있는가?

   **답**: 배열 인덱스 접근(`arr[0]`) 시 반환 타입이 `T | undefined`가 된다. `arr[0]`이 항상 존재한다고 가정하면 타입 오류를 잡아준다. 예를 들어 빈 배열에서 `arr[0].name`을 접근하면 런타임 오류가 발생하는데, 이 설정이 컴파일 타임에 경고한다.

3. all-flow가 `apps/*` 대신 `project/all-flow-*` 경로를 현재 사용하는 이유는?

   **답**: Step 2(폴더 이동 + git mv)가 아직 완료되지 않았기 때문이다. 폴더를 이동하면 git history가 새 경로로 연결되지 않을 위험이 있어 점진적으로 진행한다. 현재는 기존 경로를 그대로 workspace에 등록하고, Step 2에서 `git mv`로 history를 보존하며 이동한 뒤 `apps/*`로 전환한다.
