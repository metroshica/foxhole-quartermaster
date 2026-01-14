#!/bin/bash
# Foxhole Quartermaster - Startup Script
# Starts all required services: PostgreSQL, Scanner, and Next.js app
# Usage: ./start.sh [-d]
#   -d  Run in detached/background mode

set -e

DETACHED=false

while getopts "d" opt; do
    case $opt in
        d) DETACHED=true ;;
        *) echo "Usage: $0 [-d]" && exit 1 ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Foxhole Quartermaster ==="

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

# Load environment and start Next.js
echo "Starting Next.js app on port 3001..."
export $(grep -v '^#' .env.local | xargs)

if [ "$DETACHED" = true ]; then
    LOG_FILE="$SCRIPT_DIR/nextjs.log"
    nohup bun run dev > "$LOG_FILE" 2>&1 &
    PID=$!
    echo "$PID" > "$SCRIPT_DIR/.nextjs.pid"
    echo "Next.js started in background (PID: $PID)"
    echo "Logs: $LOG_FILE"
else
    exec bun run dev
fi
