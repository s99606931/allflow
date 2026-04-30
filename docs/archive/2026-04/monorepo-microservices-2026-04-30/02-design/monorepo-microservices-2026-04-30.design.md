# Design — monorepo-microservices-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source Plan**: `docs/01-plan/features/monorepo-microservices-2026-04-30.plan.md`
> **Scope**: Step 1 (root scaffolding) — 4 파일의 정확한 내용 명세

---

## 1. File Specifications

### 1.1 `/data/allflow/package.json`

```json
{
  "name": "all-flow",
  "version": "0.1.0",
  "private": true,
  "description": "ALL-Flow monorepo root — pnpm workspaces + Turborepo 2.x. Apps in project/, packages/* reserved for Step 3+.",
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=10.0.0"
  },
  "packageManager": "pnpm@10.33.0",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "test:all": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "dev": "turbo run dev --parallel",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.5.0"
  }
}
```

**검증**: `node -e "JSON.parse(require('fs').readFileSync('package.json'))"` → 0 error

### 1.2 `/data/allflow/pnpm-workspace.yaml`

```yaml
packages:
  - 'project/all-flow-backend'
  - 'project/all-flow-frontend'
  - 'project/all-flow-infra'
  # Step 3+ reserved (uncomment when extracted):
  # - 'packages/*'
  # - 'apps/*'
```

**검증**: `node -e "require('yaml').parse(require('fs').readFileSync('pnpm-workspace.yaml','utf8'))"` → object with packages array

**핵심 결정**: 폴더 이동(Step 2)을 미루기 위해 현재 경로 `project/all-flow-*`를 그대로 등록. infra는 npm package가 아니지만 Makefile/scripts 보존을 위해 등록 (`package.json` 없는 디렉토리도 pnpm은 무해 처리, 단 향후 `package.json` 추가 시 활성화).

→ infra에 `package.json` 부재 시 pnpm 워닝 발생 가능. 사전 점검: 현재 `project/all-flow-infra/package.json` 존재 여부 확인 → 없으면 워크스페이스에서 제외하거나 minimal package.json 추가. **Design 결정: infra는 워크스페이스에서 제외 (Makefile만 사용)**.

→ **수정된 packages 목록**:
```yaml
packages:
  - 'project/all-flow-backend'
  - 'project/all-flow-frontend'
```

### 1.3 `/data/allflow/turbo.json`

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "globalDependencies": [
    "tsconfig.base.json",
    ".env*"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "inputs": ["src/**", "tsconfig*.json", "package.json"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**", "tests/**", "vitest.config.*", "package.json"]
    },
    "lint": {
      "outputs": [],
      "inputs": ["src/**", "biome.json", "eslint.config.*", "package.json"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": [],
      "inputs": ["src/**", "tsconfig*.json", "package.json"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

**검증**: `npx turbo@2.5.0 run --dry-run build` (선택, root install 금지 정책상 미실행. CI에서 검증).

### 1.4 `/data/allflow/tsconfig.base.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2023"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": false,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": false,
    "allowSyntheticDefaultImports": true
  }
}
```

**핵심 결정**:
- `extends`로 사용 가능한 공통 옵션만 정의 (BE Fastify는 `module: NodeNext`, FE Next.js는 `module: ESNext` 차이 → Step 5에서 `packages/config-tsconfig`로 분기). 본 파일은 **현재 미참조**, 향후 step에서 BE/FE tsconfig가 `extends: "../../tsconfig.base.json"` 추가.
- **본 Step에서는 BE/FE tsconfig 변경 0건** → tsconfig.base.json은 forward-compatible 자산으로만 존재.

---

## 2. 무엇을 변경하지 않는가 (Negative Space)

| 영역 | 변경 여부 | 이유 |
|------|:---------:|------|
| `project/all-flow-backend/package.json` | ❌ 0줄 | 회귀 0건 게이트 |
| `project/all-flow-frontend/package.json` | ❌ 0줄 | 회귀 0건 게이트 |
| `project/all-flow-backend/tsconfig.json` | ❌ 0줄 | extends 추가는 Step 2+ |
| `project/all-flow-frontend/tsconfig.json` | ❌ 0줄 | extends 추가는 Step 2+ |
| `project/all-flow-infra/docker-compose.*` | ❌ 0줄 | R1 절대 조건 |
| `project/all-flow-frontend/openapi.yaml` | ❌ 미이동 | Step 3 |
| `prisma/schema.prisma` | ❌ 0줄 | R3 절대 조건 |
| BE/FE `pnpm-lock.yaml` | ❌ 0건 | Step 2 동시 작업 |
| `.github/workflows/*` | ❌ 0줄 | Step 7 |
| Source code (`src/**`) | ❌ 0건 | 본 Step의 정의상 |

**불변 원칙**: 본 PR diff는 root에 4개 파일 추가 + 0개 파일 수정.

---

## 3. 사용자 시나리오 (Step 1 후)

### 3.1 기존 워크플로우 보존 (필수)

```bash
# BE 단독 작업 — 변경 없음
cd project/all-flow-backend && pnpm dev   # 그대로 작동
cd project/all-flow-backend && pnpm test  # 그대로 작동

# FE 단독 작업 — 변경 없음
cd project/all-flow-frontend && pnpm dev  # 그대로 작동
cd project/all-flow-frontend && pnpm test # 그대로 작동

# Infra dev 환경 — 변경 없음
cd project/all-flow-infra && make dev     # 그대로 작동, http://localhost 200 OK
```

### 3.2 신규 root 진입점 (선택)

```bash
# root에서 (사용자가 root install을 의도적으로 실행한 후에만)
cd /data/allflow
pnpm install                  # ⚠️ 본 Step에서는 실행 금지 권고. Step 2 동시 실행.
pnpm typecheck                # 모든 워크스페이스 typecheck
pnpm test                     # 모든 워크스페이스 test
pnpm dev                      # FE+BE 병렬 dev (compose 미사용)
```

→ Step 1 머지 후 **사용자 가치는 0** (root install 미실행). 본 Step의 가치는 **다음 사이클의 진입 가능성 확보**.

---

## 4. 검증 시퀀스 (Do 단계 자동화)

```bash
set -e
cd /data/allflow

# G1: 4 파일 생성 후 존재 확인
test -f package.json
test -f pnpm-workspace.yaml
test -f turbo.json
test -f tsconfig.base.json

# G2: JSON 문법
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('turbo.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('tsconfig.base.json','utf8'))"

# yaml 검증 (BE는 yaml 패키지 보유)
cd project/all-flow-backend
node -e "
const fs = require('fs');
const yaml = require('yaml');
const cfg = yaml.parse(fs.readFileSync('../../pnpm-workspace.yaml','utf8'));
if (!cfg.packages || !Array.isArray(cfg.packages)) throw new Error('packages not array');
console.log('workspaces:', cfg.packages);
"
cd ../..

# G3: BE 회귀 (skip if Postgres 미가동, 단 typecheck/unit은 무조건)
cd project/all-flow-backend
pnpm typecheck
pnpm test  # unit only (188+)
cd ../..

# G4: FE 회귀
cd project/all-flow-frontend
pnpm typecheck
pnpm test  # vitest (98+)
cd ../..

# G5: dev 환경 (수동 — sudo 필요한 환경 대비 별도 게이트)
# cd project/all-flow-infra && make dev
# curl -fsS http://localhost/health  # 200 OK

# G6: Playwright (사용자가 dev 가동 시에만)
# cd project/all-flow-frontend && pnpm e2e

# G7: 코드 변경 0줄
git diff --stat project/all-flow-backend project/all-flow-frontend project/all-flow-infra
# 출력에 변경 파일 0개여야 PASS
```

---

## 5. Mermaid — Step 1 구조

```mermaid
flowchart TD
  subgraph root[/data/allflow/ root]
    PJ[package.json<br/>turbo passthrough]
    WS[pnpm-workspace.yaml<br/>BE+FE only]
    TJ[turbo.json<br/>build/test/lint/typecheck]
    TB[tsconfig.base.json<br/>forward-compat asset]
  end

  subgraph proj[project/]
    BE[all-flow-backend<br/>변경 0]
    FE[all-flow-frontend<br/>변경 0]
    IN[all-flow-infra<br/>변경 0, ws 미등록]
  end

  WS -->|등록| BE
  WS -->|등록| FE
  PJ -->|turbo run *| TJ
  TJ -.->|미래 참조| TB

  classDef new fill:#cce5ff,stroke:#0050a0
  classDef unchanged fill:#eee,stroke:#666
  class PJ,WS,TJ,TB new
  class BE,FE,IN unchanged
```

---

## 6. Acceptance Criteria

- [ ] G1: 4 파일 신설 (root)
- [ ] G2: JSON/YAML 문법 PASS
- [ ] G3: BE typecheck + unit test PASS (회귀 0)
- [ ] G4: FE typecheck + vitest PASS (회귀 0)
- [ ] G7: `git diff project/` 변경 파일 0
- [ ] G8: 신규 av-* 컴포넌트 없음 (registry no diff)
- [ ] (수동) G5: `make dev` 후 `curl http://localhost/health` 200
- [ ] (수동) G6: Playwright ≥ 56/62

**모두 PASS 시 머지 승인 → bkit:gap-detector 측정 → match_rate ≥ 0.90 → bkit:pdca report**

---

**End of Design** — 다음 액션: Do 단계 (4 파일 작성)
