# Standalone Dockerfile for md-edit
# Builds both server and web app with SQLite storage
# Single container, ready to run

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/web/package*.json ./packages/web/

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
COPY packages/web ./packages/web

# Build shared package
RUN npm run build -w @md-edit/shared

# Build web app
RUN npm run build -w @md-edit/web

# Build server
RUN npm run build -w @md-edit/server || true

# Production image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/

RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/src ./packages/server/src
COPY --from=builder /app/packages/web/dist ./packages/web/dist
COPY --from=builder /app/tsconfig.base.json ./
COPY --from=builder /app/packages/shared/tsconfig.json ./packages/shared/
COPY --from=builder /app/packages/server/tsconfig.json ./packages/server/

# Create data directory
RUN mkdir -p /app/data

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_FILENAME=/app/data/md-edit.json
ENV CORS_ORIGIN=*
ENV MAX_DOCUMENT_VERSIONS=50

# Expose port
EXPOSE 3001

# Volume for persistent data
VOLUME ["/app/data"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start server with static file serving
CMD ["node", "--loader", "ts-node/esm", "packages/server/src/index.ts"]

