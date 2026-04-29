# T-005 — GitHub Actions CI: typecheck + lint + test + build

> Phase: 0 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: PR에서 4 잡 그린
> Dependencies: [T-002]

## Plan

- 목표: PR 마다 백엔드의 4가지 품질 게이트 (`typecheck` / `lint` / `test` / `build`)를 GitHub Actions에서 자동 실행한다.
- 범위:
  - `.github/workflows/ci.yml` 1 파일 (paths-필터로 백엔드 변경 시만 트리거)
  - frontend ci.yml 패턴을 참고하되, **잡을 4개로 분리** (acceptance "PR에서 4 잡 그린" 충족).
- 결정/가정:
  - **paths 필터**로 frontend-only PR에서는 backend CI가 돌지 않게 한다.
  - **concurrency** 그룹으로 동일 ref의 이전 실행을 취소.
  - pnpm 10.x (package.json `packageManager: pnpm@10.33.0`), Node 20.
  - build 잡은 typecheck/lint/test 통과 후 실행 (`needs:`) — fail-fast 효과.
  - `dist/` 산출물은 7일 retain하여 추후 디버깅에 활용.
- 리스크:
  - 모노레포 root에 `.github/`가 없으면 frontend ci.yml과 같은 root 위치를 쓰는 것이 더 표준적. 본 단계에서는 backend 디렉토리 안에 워크플로 위치 → 상위 .git 초기화 시점에 이동하면 됨. 본 잡들의 `working-directory`는 `all-flow-backend`로 가정해 root에서도 동일 동작.

## Do

- 추가 파일:
  - `.github/workflows/ci.yml` — 4 잡 + 동시성 + paths 필터
  - `docs/pdca/00-bootstrap-ci.md`
- 수정 파일: 없음
- 추가 의존성: 없음

## Check

- 단위 테스트: 해당 없음 (워크플로 정의)
- 통합 테스트: 실제 PR 발생 시점에 GitHub에서 4 잡 그린 확인 (T-505 운영 런북 단계에서 캡처)
- 수동 검증:
  - `python3 -c 'import yaml; yaml.safe_load(open(...))'` → YAML 문법 OK.
  - 로컬에서 동일 명령 4종 그린:
    - `pnpm typecheck` → 0 error
    - `pnpm lint` → 0 error
    - `pnpm test` → 6/6 PASS
    - `pnpm build` → tsup ESM/DTS 빌드 성공
- 메트릭/로그 확인: dist/server.js 3.10 KB + dist/server.d.ts 생성 확인.

## Act

- 학습한 패턴:
  - **잡 분리 + needs**: 빠른 피드백(typecheck/lint/test 병렬) + 비싼 build는 의존 후. CI 시간 단축.
  - **paths 필터 + concurrency**: 모노레포에서 비용 폭증을 막는 두 안전장치.
  - **artifact retention** 7일은 디버깅과 비용의 균형점.
- 메모리에 저장: 모노레포 CI 표준 = (paths 필터 + concurrency cancel + 잡 분리 + needs gate + artifact upload) 5종.
- 후속 태스크에 영향:
  - T-504 (Dockerfile + GHCR push) — 이 워크플로에 release 잡을 추가하거나 별도 release.yml 분리.
  - T-503 (testcontainers) — 통합 테스트는 별도 잡으로 분리해 시간 늘어나지 않게.
- 회고: build 잡이 dist를 artifact로 올리도록 추가 → T-504 docker build 시 같은 PR의 dist를 재사용하는 후속 최적화 가능.
