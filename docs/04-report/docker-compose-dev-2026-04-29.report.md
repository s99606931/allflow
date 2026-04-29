# Report — docker-compose dev hot-reload + Frontend E2E (2026-04-29)

## 사이클 상태 — Plan/Design 완료, Do 사용자 승인 대기

`/av pm team` 진입으로 PRD/Plan/Design 산출. 코드 변경(Dockerfile 추가)은
`av-base-stack-approval` 훅이 manifest 변경을 차단하여 **사용자 승인** 후 진행.

## 1. 산출물

| 단계 | 파일 | 상태 |
|------|------|------|
| PRD | `docs/00-pm/docker-compose-dev-2026-04-29.prd.md` | ✓ 작성 |
| Plan | `docs/01-plan/features/docker-compose-dev-2026-04-29.plan.md` | ✓ 작성 |
| Design | `docs/02-design/features/docker-compose-dev-2026-04-29.design.md` | ✓ 작성 |
| Backend Dockerfile dev stage | `project/all-flow-backend/Dockerfile` | ⏸ 승인 대기 |
| Frontend Dockerfile (신규) | `project/all-flow-frontend/Dockerfile` | ⏸ 승인 대기 |
| docker-compose.dev.yml env 보강 | `project/all-flow-infra/docker-compose.dev.yml` | ⏸ 승인 대기 (선택) |

## 2. 진단 — 현재 dev 환경 작동 불가 원인

| # | 문제 | 영향 |
|---|------|------|
| 1 | `infra/docker-compose.dev.yml` 가 `target: dev` 빌드를 참조하지만 `all-flow-backend/Dockerfile` 엔 `dev` stage가 없음 (deps/build/runtime만 존재) | `make up` 빌드 실패 |
| 2 | `all-flow-frontend/` 디렉토리에 Dockerfile 부재 | dev override 가 빌드 컨텍스트를 찾지 못함 |
| 3 | Fallback `infra/docker/{backend,frontend}.Dockerfile` 은 Node 20 + pnpm 9 (실제 BE는 Node ≥22, FE는 Next 16/React 19/Node 22 LTS — `learning_tech_stack_modernization_2026_04_29` 참고) | drift, runtime 불일치 |
| 4 | runtime stage 가 wget 미설치인데 base alpine 이미지에 wget 미포함 가능 | healthcheck 위양성 (낮은 위험) |

## 3. 적용 예정 변경 (승인 시)

### 3.1 Backend Dockerfile — dev stage 추가

`project/all-flow-backend/Dockerfile` 끝에 다음 추가 (기존 deps/build/runtime 보존):

```dockerfile
# ---------- 4) dev (hot-reload) ----------
FROM node:${NODE_VERSION}-alpine AS dev
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
RUN apk add --no-cache wget tini
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm prisma generate
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=6 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "dev"]
```

추가 보강: runtime stage 에 `RUN apk add --no-cache wget` (healthcheck 견고성).

### 3.2 Frontend Dockerfile — 신규 (`project/all-flow-frontend/Dockerfile`)

```dockerfile
# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22
ARG PNPM_VERSION=10.33.0

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
RUN apk add --no-cache wget tini libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-fe,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS dev
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "dev"]

FROM deps AS build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm build

FROM node:${NODE_VERSION}-alpine AS prod
RUN apk add --no-cache wget tini && addgroup -S app && adduser -S -G app app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

전제: `next.config.ts` 에 `output: 'standalone'` 설정. 미설정 시 prod stage 만 실패하고 dev/deps/build 는 정상.

### 3.3 docker-compose.dev.yml (선택 — 환경변수 보강만)

기존 dev override는 이미 `target: dev`, bind-mount, polling 설정 완료. 추가 권장:
- backend env: `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public`
- frontend env: `AUTH_SECRET`, `NEXTAUTH_URL=http://localhost:3000`, `BACKEND_URL=http://backend:8080/api/v1`

## 4. E2E 실행 매뉴얼 (Plan 통과 후)

```
# 1. 4개 서비스 dev 가동
cd project/all-flow-infra
cp .env.example .env.dev   # JWT_SECRET, POSTGRES_PASSWORD 등 채움
make up

# 2. backend prisma migrate
make migrate
make seed

# 3. host에서 Playwright 외부 서버 모드로 실행
cd ../all-flow-frontend
pnpm e2e:install               # 1회만
E2E_BASE_URL=http://localhost:3000 pnpm e2e
```

playwright.config.ts 의 `webServer` 블록은 `E2E_BASE_URL` 설정 시 skip. global-setup 은 storage state 자동 생성.

## 5. PDCA Gap 측정 (Plan/Design 단계까지의 self-assessment)

| 차원 | 점수 | 근거 |
|------|------|------|
| 요구사항 커버리지 | 1.00 | G1~G4 모두 Plan/Design 에 매핑 |
| 코드 변경 정확성 | 보류 | 승인 대기 — 실 적용 후 측정 |
| 위험 식별 | 0.95 | WSL2 polling, brkn fallback, OpenAPI drift 식별 |
| 문서 정합 | 1.00 | docs/00~02 산출 |

bkit:gap-detector 측정은 코드 적용 후 재실행 권장.

## 6. 학습 노트 (memory-keeper 위임 예정)

키: `learning_docker_compose_dev_hotreload_2026_04_29.md`

- av-base-stack-approval 훅이 manifest(Dockerfile, package.json, docker-compose.yml) 변경을 PreToolUse exit 2 로 차단 → subagent 컨텍스트에선 AskUserQuestion 불가하므로 PRD/Plan/Design 까지만 작성하고 사용자 승인을 분리해서 받는 패턴이 PDCA-friendly.
- docker-compose dev override 에서 bind-mount 와 anonymous volume 의 layering: source bind → /app, deps 소산 보존을 위해 node_modules/.next 는 항상 anonymous volume.
- Playwright 외부 서버 모드(E2E_BASE_URL)는 docker compose dev 사이클과 가장 잘 맞음 — webServer 자동 기동을 회피.
- infra fallback Dockerfile (Node 20 + pnpm 9) 은 5차 PDCA 이후 stack-modernization 결과(Node 22 LTS) 와 drift. 사이클 종결 후 fallback 도 Node 22 로 동기화 필요.

## 7. 다음 액션

1. **사용자 승인** (PreToolUse 훅 차단 해제 또는 `AV_STACK_APPROVAL=skip` 임시 우회)
2. Backend Dockerfile dev stage 추가 + Frontend Dockerfile 신규 작성
3. `make check ENV=dev` → `make up` → 4 healthy 확인
4. host 에서 Playwright E2E 6 spec 실행 → PASS 확보
5. bkit:gap-detector 재측정, match_rate ≥ 0.90 확인
6. memory-keeper 호출하여 학습 누적
