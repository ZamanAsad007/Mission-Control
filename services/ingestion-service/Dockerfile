FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo package manifests
COPY package*.json ./
COPY packages/db/package*.json ./packages/db/
COPY packages/nasa-client/package*.json ./packages/nasa-client/
COPY services/ingestion-service/package*.json ./services/ingestion-service/

RUN npm ci

# Copy sources
COPY tsconfig.json ./
COPY packages/db ./packages/db
COPY packages/nasa-client ./packages/nasa-client
COPY services/ingestion-service ./services/ingestion-service

# Build packages and service
RUN npm run build --workspace=@mission-control/db && \
    npm run build --workspace=@mission-control/nasa-client && \
    npm run build --workspace=@mission-control/ingestion-service

# Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
COPY packages/db/package*.json ./packages/db/
COPY packages/nasa-client/package*.json ./packages/nasa-client/
COPY services/ingestion-service/package*.json ./services/ingestion-service/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/migrations ./packages/db/migrations
COPY --from=builder /app/packages/nasa-client/dist ./packages/nasa-client/dist
COPY --from=builder /app/services/ingestion-service/dist ./services/ingestion-service/dist

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "services/ingestion-service/dist/index.js"]
