# syntax=docker/dockerfile:1
FROM oven/bun:1-alpine AS base
WORKDIR /app

# --- deps: install backend deps once with lockfile; caches on bun.lock ---
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- check: type-check the backend as a build gate ---
FROM base AS check
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.json ./
COPY src ./src
RUN bun x tsc --noEmit

# --- web: build the Mini App SPA into /app/web/dist ---
FROM base AS web
WORKDIR /app/web
COPY web/package.json web/bun.lock ./
RUN bun install --frozen-lockfile
COPY web ./
RUN bun run build

# --- runner: minimal final image ---
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.json ./
COPY src ./src
COPY drizzle ./drizzle
COPY --from=web /app/web/dist ./web/dist

USER bun
EXPOSE 3000

# Migrations run on startup so a fresh DB or pending diff catches up
# automatically. drizzle-orm uses advisory locks → safe for multi-instance.
CMD ["sh", "-c", "bun run db:migrate && bun src/index.ts"]
