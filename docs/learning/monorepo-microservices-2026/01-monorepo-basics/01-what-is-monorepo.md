# 01. Monorepo란 무엇인가

> 학습 목표: 다중 레포 방식의 구체적 불편함을 경험하고, monorepo가 그 문제를 어떻게 해결하는지 설명할 수 있다.

---

## 1. 문제 정의 — 다중 레포의 실제 불편함

"여러 패키지를 각각 별도 git 저장소로 관리"하는 방식을 다중 레포(Multi-repo / Polyrepo)라고 한다.
all-flow는 2026-04-30 이전까지 사실상 다중 레포 방식으로 운영되었다 (단일 git 저장소이지만 workspace 없음).

다중 레포에서 발생하는 구체적 문제:

```
시나리오: OpenAPI에서 Task 타입에 필드 1개를 추가한다.

1. all-flow-frontend/openapi.yaml 수정
2. all-flow-backend에서 Zod schema 수동 동기화
3. 타입 불일치로 runtime error 발생 → 디버깅 30분
4. drift 가드 스크립트 돌려서 확인
```

이것이 "두 번 일하는 패턴"이다. 단일 출처(Single Source of Truth)가 없기 때문이다.

---

## 2. Monorepo란

Monorepo(모노레포)는 **여러 패키지/앱을 하나의 git 저장소에서 관리**하는 방식이다.

오해 1: "코드를 하나의 파일에 몰아넣는 것"
→ 아니다. 폴더 구조는 그대로다. 다만 공유 도구(pnpm workspace, Turborepo)로 묶는다.

오해 2: "무조건 좋다"
→ 아니다. 저장소가 커질수록 도구 없이는 오히려 느려진다.

---

## 3. 다중 레포 vs Monorepo 비교

| 비교 항목 | 다중 레포 (Multi-repo) | Monorepo |
|----------|----------------------|----------|
| 공유 타입 변경 | 각 레포에서 수동 동기화 | 한 곳 변경 → 자동 반영 |
| 의존성 버전 | 레포마다 달라질 수 있음 | catalog로 단일 버전 강제 |
| 전체 빌드 | 각 레포 개별 실행 | `turbo build` 1회 (캐시 포함) |
| 신규 개발자 온보딩 | 레포 n개 클론 + 각각 설치 | 1개 클론 + `pnpm i` 1회 |
| 코드 리뷰 | 타입 변경 시 n개 PR | 1개 PR (cross-package 가시성) |
| 도구 설정 | ESLint/tsconfig 각각 | config 패키지로 공유 |
| 버전 충돌 디버깅 | 발견이 늦음 (각 레포 독립) | 즉시 발견 (workspace 충돌 경고) |

---

## 4. all-flow Before/After

### Before (2026-04-30 이전 실제 구조)

```
/data/allflow/
├── project/
│   ├── all-flow-backend/
│   │   ├── package.json        ← "@all-flow/backend", pnpm 독립
│   │   ├── src/modules/        ← 20개 모듈
│   │   └── openapi.yaml        ← BE 자체 스펙 (FE mirror 관리)
│   ├── all-flow-frontend/
│   │   ├── package.json        ← "all-flow" (이름 불일치!), pnpm 독립
│   │   └── openapi.yaml        ← FE의 SOR (수동 동기화 필요)
│   └── all-flow-infra/
│       └── docker-compose.dev.yml
├── (없음) package.json         ← root workspace 없음
└── (없음) pnpm-workspace.yaml  ← 없음
```

이 구조의 실제 비용:
- `pnpm i`를 backend, frontend 각각 실행해야 한다
- `zod ^4.3.6`(BE) vs `^4.1.0`(FE) — 버전 드리프트 발생 중

### After (Phase 1 목표 구조)

```
/data/allflow/
├── package.json                ← root (turbo scripts)
├── pnpm-workspace.yaml         ← workspace 정의
├── turbo.json                  ← task pipeline
├── tsconfig.base.json          ← 공통 TS 설정
├── apps/
│   ├── backend/                ← project/all-flow-backend 이동
│   └── frontend/               ← project/all-flow-frontend 이동
└── packages/
    ├── contracts/              ← OpenAPI 3.1 SOR (단일 출처)
    ├── shared/                 ← envelope, errors, ID 유틸
    ├── config-eslint/          ← ESLint flat config 공유
    └── config-tsconfig/        ← tsconfig presets 공유
```

After 구조에서 OpenAPI 변경 흐름:

```
packages/contracts/openapi.yaml 수정
  → pnpm contracts:gen (자동 실행)
  → packages/contracts/src/zod/   (BE가 사용)
  → packages/contracts/src/types/ (FE가 사용)
```

"두 번 일하는 패턴"이 사라진다.

---

## 5. 현재 all-flow의 Step 1 완료 상태

2026-04-30 현재 Step 1만 완료되었다. `pnpm-workspace.yaml`은 존재하지만
apps/ 폴더 이동(Step 2)과 packages/ 추출(Step 3~6)은 아직 진행 중이다.

실제 `/data/allflow/pnpm-workspace.yaml` 내용:

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

주석 처리된 줄들이 앞으로 완성될 구조를 보여준다.

---

## 체크포인트

1. 다중 레포 방식에서 공유 타입 변경 시 발생하는 "두 번 일하는 패턴"을 구체적으로 설명하라.

   **답**: 타입 정의를 한 레포에서 변경하면, 그 타입을 사용하는 다른 레포들에도 수동으로 동기화해야 한다. all-flow에서는 OpenAPI yaml 변경 시 FE와 BE에서 각각 반영해야 했으며, drift 가드 스크립트가 있어도 발견이 사후다.

2. Monorepo가 "코드를 하나의 파일에 몰아넣는 것"이 아닌 이유는?

   **답**: Monorepo는 폴더 구조와 패키지 분리를 그대로 유지한다. 달라지는 것은 단일 git 저장소에서 pnpm workspace + Turborepo 같은 도구로 패키지들을 연결하는 방식이다. 각 패키지는 독립적인 package.json을 가진다.

3. all-flow의 `pnpm-workspace.yaml`에서 `packages/*`와 `apps/*`가 주석 처리된 이유는?

   **답**: Step 1에서는 BE + FE workspace 등록만 완료했다. `apps/*` 폴더로의 이동(Step 2)과 `packages/*` 추출(Step 3~6)이 아직 진행 중이기 때문에 주석 처리 상태다. 점진적 마이그레이션 전략의 일환이다.
