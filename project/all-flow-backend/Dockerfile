# syntax=docker/dockerfile:1.7
# ALL-Flow Backend — multistage Dockerfile (T-504).
#
# Stages:
#   deps    : pnpm install --frozen-lockfile (cached, includes dev for build)
#   build   : prisma generate + tsup build → dist/
#   runtime : alpine + only prod deps + dist/ + prisma client (~120MB)
#
# 사용:
#   docker build -t ghcr.io/<owner>/all-flow-backend:latest .
#   docker run --rm -p 8080:8080 --env-file .env ghcr.io/<owner>/all-flow-backend:latest

ARG NODE_VERSION=20.18.1
ARG PNPM_VERSION=10.33.0

# ---------- 1) deps ----------
FROM node:${NODE_VERSION}-alpine AS deps
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- 2) build ----------
FROM node:${NODE_VERSION}-alpine AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma:generate
RUN pnpm build
# 프로덕션 의존성만 별도 디렉터리로 추출 → runtime 에 복사.
RUN pnpm prune --prod

# ---------- 3) runtime ----------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

# 비루트 유저로 실행 (보안 게이트).
RUN addgroup -S app && adduser -S -G app app

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/package.json ./package.json

USER app
EXPOSE 8080

# Health 체크는 서버의 GET /health 사용 (T-002).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1

CMD ["node", "dist/server.js"]
