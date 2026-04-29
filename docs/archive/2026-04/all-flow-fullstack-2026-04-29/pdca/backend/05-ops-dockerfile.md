# T-504 — Dockerfile 멀티스테이지 + GHCR 워크플로

> Phase: 5 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: docker build 성공 + GHCR 자동 push 가능
> Dependencies: [T-005]

## Plan

- 목표:
  - 3-stage 빌드(deps/build/runtime) 로 런타임 이미지 슬림화.
  - 비루트 유저 실행, HEALTHCHECK 포함 (gate 5).
  - main push 또는 tag(v*.*.*) 시 GHCR 자동 push.
- 결정/가정:
  - 멀티 아키텍처(amd64/arm64) buildx 빌드 → 다양한 클라우드 호환.
  - prisma generate 는 build 스테이지에서 실행 → 런타임은 사전 생성된 client 만 포함.
  - `pnpm prune --prod` 로 dev 의존성 제거.

## Do

- 추가 파일: `Dockerfile`, `.dockerignore`, `.github/workflows/docker-publish.yml`.
- 추가 의존성: 없음 (corepack + buildx 액션).
- 핵심:
  - HEALTHCHECK: 컨테이너 자체에서 `wget` 으로 `/health` 호출.
  - non-root user `app` 으로 실행.
  - cache-to: gha 로 후속 빌드 가속.

## Check

- 정적 검증: docker syntax 디렉티브 + 빌드 단계 분리 확인.
- 워크플로 trigger: main 브랜치 + 태그 + workflow_dispatch + paths 필터로 backend 변경만 트리거.

## Act

- 학습한 패턴: prisma 가 build 스테이지에서 client 생성 → runtime 에서 prisma CLI 미설치도 동작.
- 후속: T-505 RUNBOOK (배포/롤백/장애).
