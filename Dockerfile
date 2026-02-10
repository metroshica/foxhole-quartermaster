# Multi-stage Dockerfile for Foxhole Quartermaster (Next.js)
# Stage 1: Install dependencies
# Stage 2: Build the application
# Stage 3: Production runtime

# --- Stage 1: Dependencies ---
FROM node:22-alpine AS deps
WORKDIR /app

# Install bun for package management
RUN npm install -g bun

# Copy dependency files
COPY package.json bun.lock ./
COPY prisma/schema.prisma prisma/schema.prisma

# Install dependencies
RUN bun install --frozen-lockfile

# Generate Prisma client
RUN bunx prisma generate

# --- Stage 2: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install bun for build
RUN npm install -g bun

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . .

# Disable Sentry source map upload during Docker build (no auth token available)
ENV SENTRY_AUTH_TOKEN=""
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN bun run build

# --- Stage 3: Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3001

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone server output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma generated client and schema (needed at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3001

CMD ["node", "server.js"]
