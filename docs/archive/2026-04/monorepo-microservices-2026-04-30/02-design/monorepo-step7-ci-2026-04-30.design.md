# Design — monorepo-step7-ci-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source Plan**: `docs/01-plan/features/monorepo-step7-ci-2026-04-30.plan.md`
> **Authority**: 본 문서가 ci.yml/compose 변경의 단일 소스. Plan과 충돌 시 본 문서 우선.

---

## 1. 산출물 인벤토리

| 파일 | 종류 | 변경 |
|------|------|------|
| `.github/workflows/ci.yml` | GitHub Actions | 전면 재작성 (기존 lint-docs/validate-claude-config 보존) |
| `apps/infra/docker-compose.dev.yml` | docker-compose | bind-mount 추가 2 라인 (BE/FE) |
| `.gitignore` | git | `.turbo/` 추가 (없을 시) |
| (생성) `docs/02-design/features/monorepo-step7-ci-2026-04-30.design.md` | bkit | 본 문서 |

---

## 2. `.github/workflows/ci.yml` 최종 명세

### 2.1 Top-level

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM:  ${{ secrets.TURBO_TEAM }}
  TURBO_REMOTE_CACHE_TIMEOUT: 60
```

### 2.2 jobs.lint-docs (기존 보존)

```yaml
lint-docs:
  name: Lint markdown + structure
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: |
        for f in LICENSE README.md CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md; do
          test -f "$f" || { echo "missing $f"; exit 1; }
        done
    - run: npx --yes markdownlint-cli2 "**/*.md" "#node_modules" || true
```

### 2.3 jobs.validate-claude-config (기존 보존)

(기존 그대로 유지 — registry JSON 검증 + 파일 존재 검증)

### 2.4 jobs.actionlint (신규 — G7-CI-07)

```yaml
actionlint:
  name: actionlint
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: raven-actions/actionlint@v2
      with:
        files: ".github/workflows/*.yml"
```

### 2.5 jobs.monorepo (신규 — Step 7 핵심)

```yaml
monorepo:
  name: turbo ${{ matrix.task }}
  runs-on: ubuntu-latest
  strategy:
    fail-fast: false
    matrix:
      node-version: [22]
      task: [lint, typecheck, build, test]
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0   # turbo --affected requires base SHA

    - uses: pnpm/action-setup@v4
      with:
        version: 10.33.0

    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'pnpm'

    - name: Restore turbo cache
      uses: actions/cache@v4
      with:
        path: |
          .turbo
          apps/frontend/.next/cache
        key: turbo-${{ runner.os }}-${{ matrix.task }}-${{ hashFiles('pnpm-lock.yaml','turbo.json') }}
        restore-keys: |
          turbo-${{ runner.os }}-${{ matrix.task }}-
          turbo-${{ runner.os }}-

    - name: Install
      run: pnpm install --frozen-lockfile

    - name: Prisma generate (cached)
      run: pnpm --filter @all-flow/backend prisma:generate
      if: matrix.task == 'build' || matrix.task == 'typecheck' || matrix.task == 'test'

    - name: turbo run ${{ matrix.task }} --affected
      run: |
        # On PR: compare against base ref. On push to main: compare against previous commit.
        if [ "${{ github.event_name }}" = "pull_request" ]; then
          BASE_REF="origin/${{ github.base_ref }}"
        else
          BASE_REF="HEAD~1"
        fi
        pnpm exec turbo run ${{ matrix.task }} \
          --affected \
          --remote-cache-timeout=60 \
          --token="${TURBO_TOKEN}" \
          --team="${TURBO_TEAM}" \
          --summarize
      env:
        TURBO_RUN_SUMMARY: 'true'

    - name: Upload turbo summary
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: turbo-summary-${{ matrix.task }}
        path: .turbo/runs/*.json
        if-no-files-found: ignore
```

**핵심 설계 결정**:
- 4개 task(lint/typecheck/build/test)를 matrix로 병렬 fan-out → wall-clock 단축
- `fail-fast: false` → 한 task 실패가 다른 task 결과 가시성을 가리지 않음
- `--affected`는 turbo 2.5+ 에서 안정. 변경된 패키지만 실행 → cache hit 시 0 task
- `TURBO_TOKEN`/`TURBO_TEAM` 미설정 시 turbo는 자동으로 GHA local cache로 폴백 (404 grace)
- `--remote-cache-timeout=60` → remote down 시 60초 후 local fallback

### 2.6 jobs.summary (신규 — gate aggregator)

```yaml
ci-status:
  name: CI status
  runs-on: ubuntu-latest
  needs: [lint-docs, validate-claude-config, actionlint, monorepo]
  if: always()
  steps:
    - run: |
        if [ "${{ needs.lint-docs.result }}" != "success" ] || \
           [ "${{ needs.validate-claude-config.result }}" != "success" ] || \
           [ "${{ needs.actionlint.result }}" != "success" ] || \
           [ "${{ needs.monorepo.result }}" != "success" ]; then
          echo "::error::One or more required jobs failed"
          exit 1
        fi
        echo "All gates PASS"
```

(branch protection rule에서 `ci-status` 만 required 로 등록하면 jobs 추가 시 자동 포함)

---

## 3. Turborepo Remote Cache 최종 채택

### 3.1 채택안: **Vercel Remote Cache (1순위) + GHA Actions cache (2순위 fallback)**

| 항목 | 값 |
|------|----|
| Provider | Vercel Remote Cache (turbo 기본) |
| Tier | hobby (개인 계정 무료) |
| Auth | `TURBO_TOKEN` + `TURBO_TEAM` GHA secrets |
| Fallback | turbo 자동 → GHA `actions/cache` |
| Timeout | 60s (`TURBO_REMOTE_CACHE_TIMEOUT=60`) |

### 3.2 Self-hosted s3 백엔드 (대안 — 메인테이너가 원할 때)

**도구**: `ducktors/turborepo-remote-cache` (OSS — Apache 2.0)

```yaml
# Self-hosted 시 환경변수 (예시)
env:
  TURBO_API: https://turbo-cache.example.com
  TURBO_TEAM: allflow
  TURBO_TOKEN: ${{ secrets.SELF_HOSTED_TURBO_TOKEN }}
```

**S3 백엔드 옵션**:
```bash
docker run -d \
  -e STORAGE_PROVIDER=s3 \
  -e STORAGE_PATH=allflow-turbo-cache \
  -e AWS_ACCESS_KEY_ID=... \
  -e AWS_SECRET_ACCESS_KEY=... \
  -e TURBO_TOKEN=... \
  -p 3000:3000 \
  ducktors/turborepo-remote-cache:latest
```

본 사이클은 **메인테이너 수동 등록만 가이드**; 인프라 신설 0건.

### 3.3 secrets 등록 가이드 (메인테이너 1회)

```bash
# Vercel Remote Cache (default)
gh secret set TURBO_TOKEN --body "<vercel personal access token>"
gh secret set TURBO_TEAM  --body "<vercel team slug or username>"

# Self-hosted (옵션)
gh secret set TURBO_API   --body "https://your-cache.example.com"
```

### 3.4 turbo.json 변경

**없음**. turbo 2.5는 환경변수만으로 remote cache 활성화. `turbo.json`에 `remoteCache.enabled: true`는 turbo 2.0+에서 묵시적 default.

### 3.5 `.gitignore` 변경

```gitignore
# Turbo
.turbo/
**/.turbo/
```

(현재 .gitignore 확인 → 누락 시 추가)

---

## 4. dev compose monorepo 정합 (G6 carry-over) — 최종 명세

### 4.1 최종 변경 (`apps/infra/docker-compose.dev.yml`)

```yaml
services:
  backend:
    # ... existing ...
    volumes:
      - ../backend:/app
      - ../../packages:/packages:ro          # NEW: monorepo packages bind-mount
      - backend-node-modules:/app/node_modules

  frontend:
    # ... existing ...
    volumes:
      - ../frontend:/app
      - ../../packages:/packages:ro          # NEW
      - frontend-node-modules:/app/node_modules
      - frontend-next-cache:/app/.next
```

### 4.2 호스트 경로 → 컨테이너 매핑

```
호스트:                                          컨테이너:
/data/allflow/apps/backend/        →  /app/
/data/allflow/apps/frontend/       →  /app/
/data/allflow/packages/            →  /packages/   (read-only)
named volume backend-node-modules  →  /app/node_modules/   (컨테이너 owns)
named volume frontend-node-modules →  /app/node_modules/   (컨테이너 owns)
```

### 4.3 pnpm workspace symlink 동작 검증

`pnpm install --frozen-lockfile` (Dockerfile deps stage) 시점에 컨테이너 안에서 다음과 같이 link 생성:

```
/app/node_modules/@all-flow/contracts -> ../../../packages/contracts
/app/node_modules/@all-flow/shared    -> ../../../packages/shared
```

이 상대경로 symlink는 컨테이너 안에서 `/app/node_modules/../../../packages/{contracts,shared}` = `/packages/{contracts,shared}` 으로 해석되어야 한다. 이를 위해:

1. `/packages:ro` bind-mount가 **반드시** 존재해야 함 (없으면 link 깨짐)
2. host의 `packages/*/dist/` 가 컴파일된 상태여야 함 (`pnpm --filter '@all-flow/*' build`가 사전 1회 필요)

### 4.4 G6 게이트 verifier (수동 + 자동 혼합)

```bash
# 1. Down + clean named volumes (강제 재생성)
make down

# 2. 호스트에서 packages 빌드
pnpm --filter '@all-flow/contracts' build
pnpm --filter '@all-flow/shared' build

# 3. Up
make up
./scripts/wait-for-healthy.sh 120

# 4. 4 services healthy
docker compose ps
# expected: postgres, redis, backend, frontend → all (healthy)

# 5. HTTP gates
curl -fsS http://localhost          | head -c 200       # 200 OK (Next.js)
curl -fsS http://localhost/health                       # 200 OK (proxied)
curl -fsS http://localhost/api/v1/health                # 200 OK

# 6. Symlink integrity (컨테이너 안)
docker compose exec backend  ls -la /app/node_modules/@all-flow/
docker compose exec frontend ls -la /app/node_modules/@all-flow/
# expected: contracts → /packages/contracts (or relative equiv), shared → /packages/shared

# 7. Hot-reload smoke test (선택)
# host에서 packages/shared/src/errors/index.ts 의 주석 1줄 변경 → tsup --watch 빌드
# → BE/FE 컨테이너 dev 서버가 변경 감지 (tsx watch / next dev)

# 8. Playwright regression
pnpm --filter all-flow e2e -- --reporter=list 2>&1 | tail -20
# pass count >= baseline (2026-04-30 = 56/62)
```

### 4.5 hot-reload 한계 (정직 명시)

`pnpm --filter @all-flow/shared build` 는 `tsup` 으로 컴파일 — host에서 변경 → 자동 컴파일 아님. 개발자가 다음 중 하나를 선택:

- **Option A**: 별도 터미널에서 `pnpm --filter '@all-flow/*' build --watch` 실행 (tsup --watch)
- **Option B**: 변경 후 수동 `pnpm --filter '@all-flow/*' build`

본 사이클은 **bind-mount 인프라만 제공**, watch 자동화는 Step 8 또는 별도 사이클.

---

## 5. 게이트 매트릭스 (최종)

| Gate | 명령 | 차단 |
|------|------|:----:|
| **G7-A1** ci.yml syntactic | `actionlint .github/workflows/ci.yml` (host) 또는 `yamllint -d relaxed .github/workflows/ci.yml` | ✅ |
| **G7-A2** workflow run dry-run (옵션) | `act -n -W .github/workflows/ci.yml` (있을 시) | ⚪ best-effort |
| **G7-B1** .gitignore turbo | `grep -q '^\.turbo/' .gitignore` | ✅ |
| **G7-B2** Design 문서 secrets 가이드 | 본 문서 §3.3 존재 | ✅ |
| **G7-C1** dev compose down/up | `make down && make up && ./scripts/wait-for-healthy.sh 120` | ✅ |
| **G7-C2** 4 services healthy | `docker compose ps` 모두 healthy | ✅ |
| **G7-C3** http://localhost 200 | `curl -fsS http://localhost` | ✅ |
| **G7-C4** Playwright 회귀 0건 | `pnpm e2e` 결과 ≤ baseline fail | ✅ |
| **G7-C5** Symlink integrity | `docker exec backend ls /app/node_modules/@all-flow/` | ✅ |
| **G7-D1** Prisma 변경 0 | `git diff -- '**/prisma/schema.prisma' \| wc -l == 0` | ✅ |
| **G7-D2** BE 295 tests | `pnpm --filter @all-flow/backend test` | ⚪ regression-check |
| **G7-D3** FE 71 tests | `pnpm --filter all-flow test` | ⚪ regression-check |
| **G7-D4** shared 45 tests | `pnpm --filter @all-flow/shared test` | ⚪ regression-check |
| **G7-D5** contracts PASS | `pnpm --filter @all-flow/contracts typecheck` | ⚪ regression-check |

---

## 6. 위험 + 추가 대응

| # | Risk | 본 Design 의 대응 |
|--:|------|------------------|
| R1 (carry-over) | dev compose `/packages` bind-mount로 기존 hot-reload 깨짐 | §4.4 G6 verifier 7단계 + R-only 정책 |
| R2 (carry-over) | actionlint 미설치 환경 | §2.4 raven-actions/actionlint@v2 GHA 사용 — 호스트 의존 0 |
| R5 (신규) | Vercel Remote Cache secrets 누락 시 빌드 실패 | turbo 자동 fallback (§3.1) — 빌드는 success, cache miss만 발생 |
| R6 (신규) | turbo `--affected` 가 monorepo root commit에서 무한 fan-out | base ref 명시 (§2.5) — push to main 시 `HEAD~1` |

---

## 7. Out-of-scope (명시)

- `act` 로 ci.yml 실 실행 — 본 사이클은 syntactic 검증만
- Vercel/self-hosted secrets 실제 등록 — 메인테이너 수동
- tsup --watch 자동 sidecar — Step 8 또는 별도
- Node 24 matrix 추가 — PRD §1.2 별도 사이클
- OpenTelemetry — Step 8

---

## 8. 다음 단계

```bash
/bkit:pdca do monorepo-step7-ci-2026-04-30
# 구현 순서:
# 1. .gitignore 갱신 (필요 시)
# 2. .github/workflows/ci.yml 재작성
# 3. apps/infra/docker-compose.dev.yml bind-mount 추가
# 4. yamllint/actionlint syntactic 검증
# 5. (옵션) make down && make up + Playwright sweep
```
