# Dockerfile para Producción (Multi-stage build)
FROM oven/bun:1-alpine AS base
WORKDIR /app

# 1. Dependencias
FROM base AS deps
COPY package.json bun.lock* package-lock.json* ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile || npm install

# 2. Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build || npm run build

# 3. Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

WORKDIR /app
COPY --from=builder /app ./

EXPOSE 3000

CMD ["bun", "run", "start"]
