#!/bin/bash
# Foxhole Quartermaster - Startup Script
# Starts all required services: PostgreSQL, Scanner, and Next.js app
# Usage: ./start.sh [-d] [-p] [-D]
#   -d  Run in detached/background mode
#   -p  Run in production mode (builds first, then runs optimized server)
#   -D  Run web app in Docker (recommended for production)

set -e

DETACHED=false
PRODUCTION=false
DOCKER_MODE=false

while getopts "dpD" opt; do
    case $opt in
        d) DETACHED=true ;;
        p) PRODUCTION=true ;;
        D) DOCKER_MODE=true ;;
        *) echo "Usage: $0 [-d] [-p] [-D]" && exit 1 ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Foxhole Quartermaster ==="

if [ "$DOCKER_MODE" = true ]; then
    echo "Starting all services via Docker Compose..."
    docker compose up -d
    echo ""
    echo "Services started. View logs with: docker compose logs -f web"
    echo "Web app: http://localhost:3002 (or 3001 if port mapping updated)"
    exit 0
fi

# Start PostgreSQL if not running
if ! docker ps --format '{{.Names}}' | grep -q '^foxhole-quartermaster-db$'; then
    echo "Starting PostgreSQL..."
    docker start foxhole-quartermaster-db || docker run -d \
        --name foxhole-quartermaster-db \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=foxhole_quartermaster \
        -p 5433:5432 \
        --health-cmd="pg_isready -U postgres" \
        --health-interval=10s \
        --health-timeout=5s \
        --health-retries=5 \
        postgres:16-alpine
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
else
    echo "PostgreSQL already running"
fi

# Start Scanner if not running
if ! docker ps --format '{{.Names}}' | grep -q '^foxhole-stockpiles-scanner$'; then
    echo "Starting Scanner service..."
    docker start foxhole-stockpiles-scanner || docker run -d \
        --name foxhole-stockpiles-scanner \
        -p 8001:8000 \
        --health-cmd="curl -f http://localhost:8000/health || exit 1" \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=3 \
        foxhole-quartermaster-scanner
    echo "Waiting for Scanner to be ready..."
    sleep 10
else
    echo "Scanner already running"
fi

# Load environment
set -a
source .env.local
set +a

# Build for production if needed
if [ "$PRODUCTION" = true ]; then
    echo "Building for production..."
    bun run build
    echo ""
    RUN_CMD="bun run start -p 3001"
    MODE="production"
else
    RUN_CMD="bun run dev"
    MODE="development"
fi

echo "Starting Next.js app on port 3001 ($MODE mode)..."

if [ "$DETACHED" = true ]; then
    LOG_FILE="$SCRIPT_DIR/nextjs.log"
    nohup $RUN_CMD > "$LOG_FILE" 2>&1 &
    PID=$!
    echo "$PID" > "$SCRIPT_DIR/.nextjs.pid"
    echo "Next.js started in background (PID: $PID)"
    echo "Logs: $LOG_FILE"
else
    exec $RUN_CMD
fi
