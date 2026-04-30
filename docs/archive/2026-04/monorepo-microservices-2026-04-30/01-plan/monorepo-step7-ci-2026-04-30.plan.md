# Plan — monorepo-step7-ci-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source PRD**: `docs/00-pm/monorepo-microservices-2026-04-30.prd.md` (Step 7: GHA CI + turbo cache + --filter)
> **Cycle Scope**: GitHub Actions CI 매트릭스 + Turborepo 로컬·원격 캐시 + dev compose monorepo 정합 (G6 carry-over)
> **Absolute Constraints**:
> - dev compose `make down/up` 후 4 서비스 healthy + Playwright 회귀 0건 (R1 critical)
> - `curl http://localhost` 200
> - BE 295 + FE 71 + shared 45 + contracts PASS
> - Prisma 변경 0
> - CI 자체는 PR 시점에 실 실행 — 본 사이클은 lint(actionlint/yamllint) + dry-run(`act` 또는 `gh workflow run --dry-run` 대체) 검증만

---

## 1. Cycle Scope (3축)

| 축 | 산출물 | 게이트 |
|----|--------|--------|
| **A. CI matrix** | `.github/workflows/ci.yml` 신설 — pnpm setup + Node 22 matrix + `turbo run build/test/lint/typecheck --affected` + `actions/cache` | actionlint(또는 yamllint) syntactic 0 error |
| **B. Remote cache** | turbo.json `remoteCache` enable + 환경변수 문서화 (Vercel Remote Cache OR self-hosted s3 백엔드) | docs/02-design 에 채택 옵션 명문화 + secrets 키 표 |
| **C. Dev compose monorepo 정합 (G6 carry-over)** | `apps/infra/docker-compose.dev.yml`에 monorepo root bind-mount 추가 → `packages/*` 변경이 BE/FE dev hot-reload에 즉시 반영 | `make down && make up` 후 4 서비스 healthy + Playwright 회귀 0건 + curl `http://localhost` 200 |

근거: 3 축 모두 CI/dev developer-experience layer. R1(single-port localhost) 회귀를 막기 위해 compose 변경은 **추가만** 하고 기존 bind-mount는 손대지 않는다.

---

## 2. A. CI matrix 설계

### 2.1 Job topology (5 jobs)

```
on: [push:main, pull_request:main]

jobs:
  setup:        # 공통: pnpm install + turbo cache hydrate (matrix fan-out 비용 1회)
  lint:         # turbo run lint --affected
  typecheck:    # turbo run typecheck --affected
  build:        # turbo run build --affected
  test:         # turbo run test --affected
  lint-docs:    # 기존 OSS 게이트 유지 (LICENSE/README 등)
  validate-claude-config:  # 기존 registry 검증 유지
```

각 job은 `needs: setup`을 통해 pnpm store + turbo cache를 공유. matrix는 단일 `node-version: [22]` (24는 별도 사이클 — PRD §1.2).

### 2.2 캐시 전략

| 캐시 키 | 경로 | 무효화 트리거 |
|---------|------|--------------|
| pnpm store | `~/.local/share/pnpm/store` | `pnpm-lock.yaml` 해시 변경 |
| Turbo local | `.turbo/` (root + workspace별) | `turbo.json` + 입력 파일 해시 |
| Next build cache | `apps/frontend/.next/cache` | `pnpm-lock.yaml` + `next.config.ts` 해시 |
| Prisma client | `apps/backend/node_modules/.prisma` | `prisma/schema.prisma` 해시 |

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.local/share/pnpm/store
      .turbo
      apps/frontend/.next/cache
    key: ${{ runner.os }}-monorepo-${{ hashFiles('pnpm-lock.yaml', 'turbo.json') }}
    restore-keys: |
      ${{ runner.os }}-monorepo-
```

### 2.3 `--affected` (turbo 2.5+)

`turbo run build --affected` 는 변경된 패키지(`git diff origin/main...HEAD`)와 그 dependents만 실행한다. 본 PR이 docs/Plan만 수정하면 0 task, contracts/openapi.yaml만 수정하면 contracts + dependents(BE/FE) 빌드.

```yaml
- run: pnpm exec turbo run build --affected
- run: pnpm exec turbo run test --affected
- run: pnpm exec turbo run lint --affected
- run: pnpm exec turbo run typecheck --affected
```

PR base 비교를 위해 `actions/checkout@v4` 의 `fetch-depth: 0` 필수.

### 2.4 게이트 매트릭스 (PR merge 차단)

| Gate | 명령 | 차단 |
|------|------|:----:|
| G7-CI-01 lint | `turbo run lint --affected` | ✅ |
| G7-CI-02 typecheck | `turbo run typecheck --affected` | ✅ |
| G7-CI-03 test | `turbo run test --affected` | ✅ |
| G7-CI-04 build | `turbo run build --affected` | ✅ |
| G7-CI-05 OSS docs lint | (기존 lint-docs 유지) | ✅ |
| G7-CI-06 registry validate | (기존 validate-claude-config 유지) | ✅ |
| G7-CI-07 actionlint syntactic | `actionlint .github/workflows/ci.yml` (job 내 self-check) | ✅ |

---

## 3. B. Remote cache 설계

### 3.1 비교축 + 선택

| 옵션 | 비용 | 셋업 | 운영 부담 |
|------|------|------|----------|
| **Vercel Remote Cache** (default) | 무료 (개인 계정 hobby) | `TURBO_TOKEN` + `TURBO_TEAM` env 1줄 | 0 |
| **Self-hosted s3** (turbo-remote-cache OSS) | 인프라 비용만 | docker run + S3 IAM | 운영 1인 |
| (참고) GitHub Actions cache only | 무료 | 기본 | branch 격리 한계 |

**채택**: **Vercel Remote Cache (1순위) + GHA Actions cache (2순위 fallback)**.
- 단일 메인테이너 규모에서 Vercel Remote Cache 무료 hobby로 충분
- `TURBO_TOKEN`/`TURBO_TEAM` 미설정 시 자동으로 GHA local cache로 grace fallback (turbo 기본 동작)
- 본 사이클은 "활성화 + 문서화"만; secrets 등록은 메인테이너 수동 액션

### 3.2 turbo.json 설정

```jsonc
{
  // 본 사이클 변경 없음 (turbo는 환경변수로 remote cache 자동 활성)
  // 단, .gitignore 에 .turbo/ 추가만 확인
}
```

### 3.3 secrets 등록 가이드

```
gh secret set TURBO_TOKEN  --body "<vercel personal token>"
gh secret set TURBO_TEAM   --body "<vercel team slug or username>"
```

(설계 문서 §4 에서 상세화)

---

## 4. C. Dev compose monorepo 정합 (G6 carry-over)

### 4.1 문제

Step 6 PRD §5.1 기준 G6 항목: "`packages/*` 변경이 dev hot-reload에 반영되어야 함." 현재 `apps/infra/docker-compose.dev.yml`은 `../backend:/app`, `../frontend:/app`만 bind-mount하므로 `packages/contracts`, `packages/shared` 변경은 컨테이너 안 stale dist를 그대로 사용한다.

### 4.2 해결안 (3 후보 — 점수 평가)

| 후보 | 변경량 | dev parity | 빌드 신선도 | 회귀 위험 |
|------|------:|:---------:|:----------:|:--------:|
| **(α) monorepo root context + 추가 bind-mount** | 중 | ✅ | tsup --watch 별도 필요 | 낮음 |
| (β) packages dist만 bind-mount | 적 | ✅ | 빌드 수동 trigger 필요 | 낮음 |
| (γ) packages 소스 bind-mount + tsup --watch sidecar | 큼 | ✅ | 실시간 | 중간 |

**채택: (α) — monorepo root context + 추가 bind-mount.**

근거:
- (β) 는 `pnpm --filter @all-flow/shared build`를 매번 수동 — UX 낮음.
- (γ) 는 sidecar 컨테이너 신설 — 본 사이클의 절대 조건(dev 회귀 0)에 비해 변경량 과다.
- (α) 는 packages를 read-only bind-mount로 노출 + BE/FE 컨테이너의 `pnpm dev` (tsx watch / next dev) 가 자동으로 변경 감지. tsup으로 컴파일된 dist만 변경하면 즉시 반영 (개발자가 `pnpm --filter @all-flow/shared build:watch`를 별도 터미널에서 실행).

### 4.3 변경 명세

```yaml
# apps/infra/docker-compose.dev.yml — backend service
volumes:
  - ../backend:/app
  - ../../packages:/packages:ro       # NEW: monorepo packages 노출
  - backend-node-modules:/app/node_modules

# apps/infra/docker-compose.dev.yml — frontend service (동일)
volumes:
  - ../frontend:/app
  - ../../packages:/packages:ro       # NEW
  - frontend-node-modules:/app/node_modules
  - frontend-next-cache:/app/.next
```

> **중요**: 이 방식은 pnpm workspace symlink가 `node_modules/@all-flow/{shared,contracts}` → `../../packages/{shared,contracts}` 형태로 컨테이너 내부에 이미 생성되어 있다는 전제. `node_modules` 볼륨이 named volume(컨테이너 첫 빌드 시 생성)이므로 호스트 패스가 아닌 컨테이너 내부 symlink 그대로 유지된다.
>
> 만약 symlink가 호스트 `../../packages` 절대경로를 가리키게 컴파일되어 있다면 추가 bind-mount가 필요 — 이 경우 `/packages` 경로 매핑이 없으면 깨짐.

### 4.4 G6 게이트

```bash
make down
make up
./scripts/wait-for-healthy.sh 120     # 4 services healthy
curl -fsS http://localhost/health      # 200
curl -fsS http://localhost/api/v1/health  # 200
pnpm --filter all-flow e2e             # Playwright 56/62 baseline 회귀 0건
```

PASS 조건: 위 4 명령 모두 0 exit + Playwright fail count ≤ baseline(2026-04-30 = 6 known-flaky).

---

## 5. 작업 단위 (PR-scoped)

| Step | 산출물 | 변경 파일 | 게이트 |
|-----:|-------|----------|-------|
| 7-A | `.github/workflows/ci.yml` 갱신 | 1 file | actionlint/yamllint PASS |
| 7-B | `.gitignore` 에 `.turbo/` 추가 (필요 시) + Design 문서에 remote cache secrets 가이드 | 0~1 file | grep `.turbo` PASS |
| 7-C | `apps/infra/docker-compose.dev.yml` 추가 bind-mount | 1 file | `make down && make up` + Playwright 회귀 0건 |
| 7-D | Plan/Design/Analysis/Report 4 docs | 4 files | bkit:gap-detector ≥ 0.90 |
| 7-E | Memory keeper 학습 보존 | 1 entry | L4 글로벌 메모리 갱신 |

---

## 6. 비차단 사항 / 명시적 out-of-scope

- `act` 로 ci.yml 실 실행 검증 — 본 사이클은 syntactic 검증만. 실제 실행은 PR open 시점.
- Vercel remote cache secrets 실제 등록 — 메인테이너 수동.
- Node 24 matrix 추가 — PRD §1.2 별도 사이클.
- OpenTelemetry — Step 8.

---

## 7. 위험 + 대응

| # | Risk | Severity | Mitigation |
|--:|------|---------:|-----------|
| R1 | dev compose `/packages` bind-mount 추가로 기존 hot-reload 깨짐 | 🔴 Critical | bind-mount는 `:ro` (read-only) + 기존 `../{backend,frontend}:/app` 변경 0. `make down && make up` 검증 게이트 강제 |
| R2 | actionlint 미설치 환경 | 🟡 Medium | yamllint fallback. CI 실 실행은 PR open 시점이므로 본 사이클 게이트는 syntactic만 |
| R3 | turbo 2.5 `--affected` 동작 차이 (2.4 vs 2.5) | 🟢 Low | root package.json `turbo: ^2.5.0` 이미 lockfile 고정. 추가 변경 없음 |
| R4 | symlink + bind-mount 상호작용 (4.3) | 🟠 High | named volume(`backend-node-modules`)이 컨테이너 내부 symlink 보존. pnpm workspace는 절대경로가 아닌 상대경로로 link 함을 검증 (`docker exec backend ls -la node_modules/@all-flow/`) |

---

## 8. 다음 단계

```bash
/bkit:pdca design monorepo-step7-ci-2026-04-30
# Design 단계에서 결정할 것:
# - ci.yml 의 실제 step 순서 + matrix 노출
# - turbo.json 의 remoteCache 명시 키 (있다면)
# - .gitignore 갱신 여부
# - dev compose 추가 bind-mount 의 read-only 정책
```
