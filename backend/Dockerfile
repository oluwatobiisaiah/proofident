FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ---- Install all deps (including dev) for build ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- Production runtime ----
FROM node:20-slim AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Compiled bundles
COPY --from=builder /app/dist ./dist

# Migration SQL files — needed by dist/migrate.js at runtime
COPY --from=builder /app/src/db/migrations ./src/db/migrations

ENV NODE_ENV=test

# Default entrypoint — overridden per-role in Kamal config
CMD ["node", "dist/server.js"]
