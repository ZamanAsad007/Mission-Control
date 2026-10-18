FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo package manifests
COPY package*.json ./
COPY packages/db/package*.json ./packages/db/
COPY packages/nasa-client/package*.json ./packages/nasa-client/
COPY services/api-service/package*.json ./services/api-service/

RUN npm ci

# Copy sources
COPY tsconfig.json ./
COPY packages/db ./packages/db
COPY services/api-service ./services/api-service

# Build packages and service
RUN npm run build --workspace=@mission-control/db && \
    npm run build --workspace=@mission-control/api-service

# Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
COPY packages/db/package*.json ./packages/db/
COPY services/api-service/package*.json ./services/api-service/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/migrations ./packages/db/migrations
COPY --from=builder /app/services/api-service/dist ./services/api-service/dist

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "services/api-service/dist/index.js"]
