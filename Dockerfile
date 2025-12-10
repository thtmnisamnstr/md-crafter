# Standalone Dockerfile for md-crafter
# Builds both server and web app with SQLite database
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

# Build all packages in order
RUN npm run build -w @md-crafter/shared
RUN npm run build -w @md-crafter/server
RUN npm run build -w @md-crafter/web

# Production image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/web/package*.json ./packages/web/

RUN npm ci --omit=dev --workspace=@md-crafter/shared --workspace=@md-crafter/server

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/web/dist ./public

# Create data directory for SQLite
RUN mkdir -p /app/data

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/md-crafter.db
ENV CORS_ORIGIN=*
ENV MAX_DOCUMENT_VERSIONS=50
ENV STATIC_DIR=/app/public

# Google API (optional - set these to enable Google Drive integration)
# ENV VITE_GOOGLE_CLIENT_ID=
# ENV VITE_GOOGLE_API_KEY=

# Expose port
EXPOSE 3001

# Volume for persistent SQLite database
VOLUME ["/app/data"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start server
CMD ["node", "packages/server/dist/index.js"]
