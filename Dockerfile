# syntax=docker/dockerfile:1
FROM oven/bun:1-alpine AS base
WORKDIR /app

# --- deps: install once with lockfile; layer caches on bun.lock changes ---
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- check: type-check as a build gate ---
FROM base AS check
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.json ./
COPY src ./src
RUN bun x tsc --noEmit

# --- runner: minimal final image ---
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.json ./
COPY src ./src
COPY drizzle ./drizzle

USER bun
EXPOSE 3000

# Migrations run on startup so a fresh DB or pending diff catches up
# automatically. drizzle-orm uses advisory locks → safe for multi-instance.
CMD ["sh", "-c", "bun run db:migrate && bun src/index.ts"]
