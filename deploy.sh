#!/bin/bash
# Foxhole Quartermaster - Docker Deploy Script
# Builds, migrates, and deploys the web application container
#
# Usage: ./deploy.sh [options]
#   --migrate-only  Only run database migrations (no build/restart)
#   --no-migrate    Skip database migrations
#   --port PORT     Override the host port to health-check (default: reads from docker-compose)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MIGRATE=true
BUILD=true
RESTART=true
HEALTH_PORT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --migrate-only)
            BUILD=false
            RESTART=false
            shift
            ;;
        --no-migrate)
            MIGRATE=false
            shift
            ;;
        --port)
            HEALTH_PORT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--migrate-only] [--no-migrate] [--port PORT]"
            exit 1
            ;;
    esac
done

# Auto-detect host port from docker-compose if not specified
if [ -z "$HEALTH_PORT" ]; then
    HEALTH_PORT=$(grep -A 20 '^\s*web:' docker-compose.yml | grep -oP '"\K\d+(?=:\d+")' | head -1)
    if [ -z "$HEALTH_PORT" ]; then
        HEALTH_PORT=3001
    fi
fi

echo "=== Foxhole Quartermaster Deploy ==="
echo ""

# Step 1: Build
if [ "$BUILD" = true ]; then
    echo "[1/4] Building web and migrate images..."
    docker compose build web migrate
    echo ""
else
    echo "[1/4] Skipping build"
fi

# Step 2: Ensure postgres is running
echo "[2/4] Ensuring database is running..."
docker compose up -d postgres
echo "Waiting for PostgreSQL to be healthy..."
until docker compose exec postgres pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL is ready"
echo ""

# Step 3: Migrate
if [ "$MIGRATE" = true ]; then
    echo "[3/4] Running database migrations..."
    docker compose run --rm migrate bunx prisma db push
    echo ""
else
    echo "[3/4] Skipping migrations"
fi

# Step 4: Deploy
if [ "$RESTART" = true ]; then
    echo "[4/4] Deploying web container..."
    docker compose up -d web
    echo ""

    # Health check
    echo "Waiting for web app to be ready on port $HEALTH_PORT..."
    ATTEMPTS=0
    MAX_ATTEMPTS=30
    until curl -sf "http://localhost:$HEALTH_PORT/api/auth/providers" > /dev/null 2>&1; do
        ATTEMPTS=$((ATTEMPTS + 1))
        if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
            echo ""
            echo "FAILED: Web app did not become healthy after ${MAX_ATTEMPTS} attempts"
            echo "Check logs with: docker compose logs web"
            exit 1
        fi
        printf "."
        sleep 2
    done
    echo ""
    echo "Web app is healthy on http://localhost:$HEALTH_PORT"
else
    echo "[4/4] Skipping restart"
fi

echo ""
echo "=== Deploy complete ==="
