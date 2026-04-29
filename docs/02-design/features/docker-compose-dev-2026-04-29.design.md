# Design — docker-compose dev hot-reload + Frontend E2E (2026-04-29)

## 1. 아키텍처

```
┌─────────────────────────── docker network: allflow-net ───────────────────────────┐
│                                                                                  │
│   postgres (pgvector/pg16)        redis (7-alpine, no auth in dev)               │
│   :5432 (host)                    :6379 (host)                                   │
│      ▲                                ▲                                          │
│      │                                │                                          │
│      │ DATABASE_URL                   │ REDIS_URL                                │
│      │                                │                                          │
│   ┌──┴─── allflow-backend:dev ────────┴──┐    Next.js 16 dev server              │
│   │  Node 22 + tsx watch + Fastify 5    │    React 19, Turbopack default        │
│   │  bind-mount: ../all-flow-backend ──┼─→  bind-mount: ../all-flow-frontend   │
│   │  /app/node_modules: anon volume    │    /app/node_modules: anon volume     │
│   │  /app/.next        : anon volume    │                                       │
│   │  PORT 8080                          │    PORT 3000                          │
│   └────────────────────────────────────┘                                        │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
        ▲                                                ▲
        │ http://localhost:8080/health (wget)            │ http://localhost:3000/
        │                                                │
   Playwright E2E (host)  ── E2E_BASE_URL=http://localhost:3000
```

## 2. Dockerfile 설계 — Backend dev stage

```dockerfile
# Append to project/all-flow-backend/Dockerfile

# ---------- 4) dev (hot-reload) ----------
FROM node:${NODE_VERSION}-alpine AS dev
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=development
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
RUN apk add --no-cache wget tini
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm prisma generate
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "dev"]
```

이유:
- `deps` 스테이지의 모든 dev 포함 의존성 재사용 → 빌드시간 절약
- `prisma generate` 필요 (tsx 가 런타임에 client 사용)
- `wget` 추가 (compose healthcheck)
- bind-mount 가 `/app` 을 덮어쓰므로 `node_modules` 는 anonymous volume 으로 보존

## 3. Dockerfile 설계 — Frontend (신규)

```dockerfile
# syntax=docker/dockerfile:1.7
# project/all-flow-frontend/Dockerfile (신규)

ARG NODE_VERSION=22
ARG PNPM_VERSION=10.33.0

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
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
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# Next.js standalone output (next.config.ts: output: 'standalone')
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

이유:
- Backend 와 동일한 Node 22 + pnpm 10.33.0 매니페스트 통일
- dev 는 bind-mount 를 받으므로 source COPY 없이 deps 만 보존
- prod 는 standalone (Next 16 default 옵션) — frontend.Dockerfile fallback 과 동일 구조

## 4. docker-compose.dev.yml 보강

기존 (이미 OK):

```yaml
backend:
  build:
    context: ../all-flow-backend
    target: dev
  command: ["pnpm", "dev"]
  volumes:
    - ../all-flow-backend:/app
    - backend-node-modules:/app/node_modules
```

추가 변경:
- backend env 에 `DATABASE_URL` 명시 (Prisma 가 직접 사용)
- frontend command 는 그대로 `pnpm dev` (Next 16 은 default 0.0.0.0 binding)
- frontend env: `AUTH_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL=http://localhost:3000`, `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1`, `BACKEND_URL=http://backend:8080/api/v1`

## 5. E2E 실행 모델

```
host shell:
  cd project/all-flow-infra
  make up                        # 4 services healthy
  cd ../all-flow-frontend
  pnpm e2e:install               # 1회 (Chromium)
  E2E_BASE_URL=http://localhost:3000 pnpm e2e
```

playwright.config.ts 의 `webServer` 블록은 `E2E_BASE_URL` 이 설정되면 skip 되도록 이미 구현됨 → 외부 docker dev 서버 재사용.

global-setup.ts 는 storageState 경로(`playwright/.auth/user.json`)을 보장하므로 OK.

## 6. 검증 매트릭스

| 검증 | 명령 | 기대 |
|------|------|------|
| docker dev build | `docker build --target dev -t allflow-backend:dev project/all-flow-backend` | 0 exit |
| docker dev build | `docker build --target dev -t allflow-frontend:dev project/all-flow-frontend` | 0 exit |
| compose schema | `make check ENV=dev` | "[check] dev compose ok" |
| services up | `make up` | 4 healthy |
| backend health | `curl http://localhost:8080/health` | 200 OK JSON |
| frontend home | `curl -I http://localhost:3000/` | 200/301/302 |
| hot-reload (BE) | `echo 'console.log("x")' >> src/server.ts` | tsx watch reload 로그 |
| hot-reload (FE) | edit `src/app/page.tsx` | next 컴파일 + HMR |
| Playwright | `E2E_BASE_URL=http://localhost:3000 pnpm e2e` | 6 spec PASS |

## 7. 산출물 디렉토리

- `project/all-flow-backend/Dockerfile` (수정)
- `project/all-flow-frontend/Dockerfile` (신규)
- `project/all-flow-infra/docker-compose.dev.yml` (env 보강 — optional)
- `docs/00-pm/docker-compose-dev-2026-04-29.prd.md`
- `docs/01-plan/features/docker-compose-dev-2026-04-29.plan.md`
- `docs/02-design/features/docker-compose-dev-2026-04-29.design.md`
- `docs/04-report/docker-compose-dev-2026-04-29.report.md` (Do 후)
