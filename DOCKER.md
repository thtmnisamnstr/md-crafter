# Docker Deployment Guide

md-edit can be deployed using Docker in several configurations.

## Quick Start

### Standalone (SQLite)

The simplest way to run md-edit:

```bash
# Build and run
docker-compose up -d

# Or build manually
docker build -t md-edit .
docker run -d -p 3001:3001 -v md-edit-data:/app/data md-edit
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

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `production` | Environment mode |
| `DB_FILENAME` | `/app/data/md-edit.json` | SQLite file path (standalone) |
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
  md-edit-data:
    driver: local
```

Data is stored in:
- `/app/data/md-edit.json` - Database file
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
{"status":"ok","timestamp":"2025-01-01T00:00:00.000Z","version":"0.1.0-pre"}
```

## Reverse Proxy (nginx)

Example nginx configuration:

```nginx
server {
    listen 80;
    server_name md-edit.example.com;

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

  md-edit:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.md-edit.rule=Host(`md-edit.example.com`)"
      - "traefik.http.routers.md-edit.entrypoints=websecure"
      - "traefik.http.routers.md-edit.tls.certresolver=le"
```

## Backup and Restore

### Standalone (SQLite)

```bash
# Backup
docker cp md-edit:/app/data/md-edit.json ./backup.json

# Restore
docker cp ./backup.json md-edit:/app/data/md-edit.json
docker restart md-edit
```

### PostgreSQL

```bash
# Backup
docker exec md-edit-postgres pg_dump -U mdeditor mdeditor > backup.sql

# Restore
docker exec -i md-edit-postgres psql -U mdeditor mdeditor < backup.sql
```

### MySQL

```bash
# Backup
docker exec md-edit-mysql mysqldump -u mdeditor -pmdeditor_password mdeditor > backup.sql

# Restore
docker exec -i md-edit-mysql mysql -u mdeditor -pmdeditor_password mdeditor < backup.sql
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
docker-compose logs -f md-edit
```

### Database connection issues

Verify connection string:
```bash
docker exec md-edit-app env | grep DATABASE_URL
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
docker exec md-edit chown -R node:node /app/data
```

