# PRD — docker-compose dev hot-reload + Frontend E2E (2026-04-29)

## 사용자 요구사항 (원문)

> 모든 서비스를 도커컴포즈 환경에서 개발환경으로 가동해서 코드가 수정되면 바로 적용될수 있도록
> 환경을 구축하고, 프론트엔드에 모든 기능을 테스트 진행해 PDCA로 진행

## 목표

| # | 항목 | 수락 기준 |
|---|------|----------|
| G1 | 4개 서비스 dev 가동 | `cd project/all-flow-infra && make up` 한 번으로 postgres/redis/backend/frontend 모두 healthy |
| G2 | Hot-reload | 호스트에서 `src/**` 수정 → 컨테이너 내부 dev 서버가 자동 재컴파일·재로드 (backend tsx watch / frontend next dev) |
| G3 | 프론트 E2E 전기능 | `pnpm e2e` (Playwright) 6개 spec(smoke/routes/console-errors/interactions/user-flows/collaboration) 모두 PASS |
| G4 | PDCA 사이클 | plan → design → do → check(gap-detector) → act(필요시 iterator) → report 산출물 git에 보존 |

## 비목표

- 프로덕션 컨테이너 재구성 (`docker-compose.prod.yml`은 변경 없음)
- 신규 기능 추가 (오직 dev 환경 + 기존 E2E 실행)
- CI 파이프라인 변경 (로컬 검증만)

## 제약

- bind-mount 기반(`anonymous volume for node_modules`) — Linux/WSL2 환경에서 polling 필요
- Backend는 Node 22 LTS + pnpm 10.33.0 (engines 명시)
- Frontend는 Next.js 16 + React 19 + Node 22 LTS
- pgvector/pgvector:pg16 (이미 결정), redis:7-alpine
- Playwright는 외부 dev 서버 재사용 모드 (`E2E_BASE_URL=http://localhost:3000`)

## 현재 진단 (root cause)

1. `docker-compose.dev.yml` 이 `target: dev` 빌드 스테이지를 참조하는데
   - `all-flow-backend/Dockerfile` 엔 dev stage 없음 (deps/build/runtime만)
   - `all-flow-frontend/` 엔 Dockerfile 자체가 없음
2. 그 결과 `make up` 이 빌드 단계에서 실패하거나 `infra/docker/*.Dockerfile` fallback 으로 빠지는데, fallback은 Node 20 + pnpm 9 이라 backend(>=22), frontend(react 19 + next 16) 와 맞지 않음.
3. infra의 wait-for-healthy.sh 는 backend healthcheck 가 wget 을 요구 — dev image에도 wget 필요.

## 해결 범위

| 트랙 | 결과물 |
|------|-------|
| Backend Lead | `all-flow-backend/Dockerfile` 에 `dev` stage 추가 (Node 22 + pnpm 10.33.0 + tini + wget) |
| Frontend Lead | `all-flow-frontend/Dockerfile` 신규 (Node 22 + pnpm 10 + dev/build/prod 스테이지) |
| Infra | `docker-compose.dev.yml` `command` 인자 `--host 0.0.0.0` 명시(next dev), watch 환경 보강 |
| QA | `tests/e2e/global-setup.ts` 의 storageState 경로 ENOENT 회피 + Playwright 실행 가이드 갱신 |
| Memory | 학습 키: docker dev hot-reload 패턴 / fallback Dockerfile drift / Playwright external server |

## 산출물

- 코드 변경 (Backend Dockerfile, Frontend Dockerfile, dev override)
- 문서: PRD, Plan, Design, Report
- 학습 메모: `~/.claude/projects/-data-allflow/memory/learning_docker_compose_dev_hotreload.md`

## PM 승인 대기 상태

PRD 초안. 사용자 확정 시 Plan 단계로 진입.
