FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo package manifests
COPY package*.json ./
COPY packages/db/package*.json ./packages/db/
COPY packages/nasa-client/package*.json ./packages/nasa-client/
COPY services/alert-service/package*.json ./services/alert-service/
COPY services/api-service/package*.json ./services/api-service/
COPY services/ingestion-service/package*.json ./services/ingestion-service/
COPY frontend/package*.json ./frontend/

RUN npm ci

# Copy sources
COPY tsconfig.json ./
COPY frontend ./frontend

# Build frontend production bundle
RUN npm run build --workspace=@mission-control/frontend

# Production runner with Nginx
FROM nginx:1.27-alpine AS runner

WORKDIR /usr/share/nginx/html

# Replace default Nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/frontend/dist ./

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
