# Fallback backend image. The repo's Dockerfile (../all-flow-backend/Dockerfile)
# is preferred when present; this exists so infra can stand up even before the
# backend ships its own. Multi-stage: base -> deps -> dev | build -> prod.

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
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "dev"]

# ---- build ----
FROM deps AS build
ENV NODE_ENV=production
COPY . .
RUN pnpm build && pnpm prune --prod

# ---- prod ----
FROM node:20-alpine AS prod
WORKDIR /app
RUN apk add --no-cache wget tini && addgroup -S app && adduser -S app -G app
ENV NODE_ENV=production PORT=8080
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/package.json ./package.json
USER app
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
