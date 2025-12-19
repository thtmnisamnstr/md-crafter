# Docker Deployment Guide

md-crafter can be deployed using Docker in several configurations.

## Quick Start

### Standalone (SQLite)

The simplest way to run md-crafter:

```bash
# Build and run
docker-compose up -d

# Or build manually
docker build -t md-crafter .
docker run -d -p 3001:3001 -v md-crafter-data:/app/data md-crafter
```

Access the app at `http://localhost:3001`

### With PostgreSQL

For production deployments with PostgreSQL:

```bash
docker-compose -f docker-compose.postgres.yml up -d
```

### With MySQL

For production deployments with MySQL:

```bash
docker-compose -f docker-compose.mysql.yml up -d
```

> **Note**: For production deployments, use published Docker images (see below) instead of building locally.

## Using Published Docker Images

md-crafter Docker images are published to GitHub Container Registry (`ghcr.io`).

### Standalone Image (SQLite)

```bash
docker pull ghcr.io/thtmnisamnstr/md-crafter:latest
docker run -d -p 3001:3001 \
  -v md-crafter-data:/app/data \
  ghcr.io/thtmnisamnstr/md-crafter:latest
```

### Production Image (PostgreSQL/MySQL)

```bash
docker pull ghcr.io/thtmnisamnstr/md-crafter:prod-latest
docker run -d -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  ghcr.io/thtmnisamnstr/md-crafter:prod-latest
```

### Image Tags

- `latest` - Standalone image with SQLite (built from `Dockerfile`)
- `prod-latest` - Production image for PostgreSQL/MySQL (built from `Dockerfile.prod`)
- Version tags (e.g., `v0.1.0`) - Specific version releases

### Local Build vs Published Images

- **Published images**: Use for production deployments (recommended)
- **Local build**: Use for development or custom configurations

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `production` | Environment mode |
| `DB_PATH` | `/app/data/md-crafter.db` | SQLite file path (standalone) |
| `DATABASE_URL` | - | PostgreSQL/MySQL connection string |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |
| `MAX_DOCUMENT_VERSIONS` | `50` | Max versions per document |
| `VITE_GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `VITE_GOOGLE_API_KEY` | - | Google API key |

### Database Connection Strings

**PostgreSQL:**
```
postgresql://user:password@host:5432/database
```

**MySQL:**
```
mysql://user:password@host:3306/database
```

## Docker Images

### Standalone (`Dockerfile`)

- Single container with embedded SQLite
- Best for: Personal use, small teams, development
- Data persisted in `/app/data` volume
- ~200MB image size

### Production (`Dockerfile.prod`)

- Server only, requires external database
- Best for: Production deployments, scaling
- Supports PostgreSQL and MySQL
- ~180MB image size

## Volumes

### Standalone

```yaml
volumes:
  md-crafter-data:
    driver: local
```

Data is stored in:
- `/app/data/md-crafter.db` - Database file
- `/app/data/` - Uploaded files

### PostgreSQL

```yaml
volumes:
  postgres-data:
    driver: local
```

### MySQL

```yaml
volumes:
  mysql-data:
    driver: local
```

## Health Checks

All containers include health checks:

```bash
# Check health
curl http://localhost:3001/api/health

# Response
{"status":"ok","timestamp":"2025-01-01T00:00:00.000Z","version":"0.1.0-beta-1"}
```

## Reverse Proxy (nginx)

Example nginx configuration:

```nginx
server {
    listen 80;
    server_name md-crafter.example.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## SSL with Let's Encrypt

Using Traefik:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.le.acme.httpchallenge=true"
      - "--certificatesresolvers.le.acme.email=you@example.com"
      - "--certificatesresolvers.le.acme.storage=/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./acme.json:/acme.json

  md-crafter:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.md-crafter.rule=Host(`md-crafter.example.com`)"
      - "traefik.http.routers.md-crafter.entrypoints=websecure"
      - "traefik.http.routers.md-crafter.tls.certresolver=le"
```

## Backup and Restore

### Standalone (SQLite)

```bash
# Backup
docker cp md-crafter:/app/data/md-crafter.db ./backup.db

# Restore
docker cp ./backup.db md-crafter:/app/data/md-crafter.db
docker restart md-crafter
```

### PostgreSQL

```bash
# Backup
docker exec md-crafter-postgres pg_dump -U mdcrafter mdcrafter > backup.sql

# Restore
docker exec -i md-crafter-postgres psql -U mdcrafter mdcrafter < backup.sql
```

### MySQL

```bash
# Backup
docker exec md-crafter-mysql mysqldump -u mdcrafter -pmdcrafter_password mdcrafter > backup.sql

# Restore
docker exec -i md-crafter-mysql mysql -u mdcrafter -pmdcrafter_password mdcrafter < backup.sql
```

## Upgrading

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs -f md-crafter
```

### Database connection issues

Verify connection string:
```bash
docker exec md-crafter-app env | grep DATABASE_URL
```

### WebSocket not working

Ensure your reverse proxy is configured for WebSocket:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

### Permission issues

Fix volume permissions:
```bash
docker exec md-crafter chown -R node:node /app/data
```

