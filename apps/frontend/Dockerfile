# syntax=docker/dockerfile:1.7
# ALL-Flow Frontend — multistage Dockerfile (docker-compose-dev-2026-04-29).
#
# Stages:
#   base  : node 22 alpine + pnpm 10 + tini + wget
#   deps  : pnpm install --frozen-lockfile (cached)
#   dev   : hot-reload (chokidar/watchpack polling for WSL2)
#   build : next build (NODE_ENV=production)
#   prod  : next standalone runtime (next.config.ts 의 output: 'standalone' 필요)
#
# 사용 (dev):
#   docker compose -f docker-compose.yml -f docker-compose.dev.yml up frontend
#
ARG NODE_VERSION=24
ARG PNPM_VERSION=10.33.0

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
RUN apk add --no-cache wget tini libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# pnpm 10 ignored-builds 회피: --ignore-scripts (sharp/esbuild 등은 prebuilt 바이너리 사용).
RUN --mount=type=cache,id=pnpm-fe,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS dev
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=45s --retries=6 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
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
# next.config.ts 에 output: 'standalone' 필요. 미설정 시 prod stage 만 실패하고 dev/deps/build 는 정상.
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
