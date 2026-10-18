FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo package manifests
COPY package*.json ./
COPY packages/db/package*.json ./packages/db/
COPY packages/nasa-client/package*.json ./packages/nasa-client/
COPY services/alert-service/package*.json ./services/alert-service/

RUN npm ci

# Copy sources
COPY tsconfig.json ./
COPY packages/db ./packages/db
COPY services/alert-service ./services/alert-service

# Build packages and service
RUN npm run build --workspace=@mission-control/db && \
    npm run build --workspace=@mission-control/alert-service

# Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
COPY packages/db/package*.json ./packages/db/
COPY services/alert-service/package*.json ./services/alert-service/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/migrations ./packages/db/migrations
COPY --from=builder /app/services/alert-service/dist ./services/alert-service/dist

USER appuser

CMD ["node", "services/alert-service/dist/index.js"]
