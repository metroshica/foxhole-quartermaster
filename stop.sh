#!/bin/bash
# Foxhole Quartermaster - Stop Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.nextjs.pid"

echo "Stopping Foxhole Quartermaster..."

# Kill Next.js - try PID file first, then fallback to pkill
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" && echo "Stopped Next.js (PID: $PID)"
    else
        echo "PID $PID not running"
    fi
    rm -f "$PID_FILE"
else
    pkill -f "next dev -p 3001" 2>/dev/null && echo "Stopped Next.js" || echo "Next.js not running"
fi

# Optionally stop Docker containers (uncomment if desired)
# docker stop foxhole-stockpiles-scanner 2>/dev/null && echo "Stopped Scanner"
# docker stop foxhole-quartermaster-db 2>/dev/null && echo "Stopped PostgreSQL"

echo "Done"
