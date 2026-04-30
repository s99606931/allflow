# Fallback frontend image. Prefer ../all-flow-frontend/Dockerfile when present.
# Assumes Next.js 16 with `output: 'standalone'` for the prod target.

# ---- base ----
FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apk add --no-cache wget tini

# ---- deps ----
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# ---- dev ----
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "dev"]

# ---- build ----
FROM deps AS build
ENV NODE_ENV=production
COPY . .
RUN pnpm build

# ---- prod ----
FROM node:20-alpine AS prod
WORKDIR /app
RUN apk add --no-cache wget tini && addgroup -S app && adduser -S app -G app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# next.config.ts must export `output: 'standalone'`.
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
