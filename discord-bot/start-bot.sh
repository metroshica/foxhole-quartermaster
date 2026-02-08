#!/bin/bash
# Discord Bot - Startup Script
# Stops existing bot processes, and starts fresh
# Usage: ./start-bot.sh [-d] [-v]
#   -d  Run in detached/background mode
#   -v  Enable verbose/debug mode

set -e

DETACHED=false
VERBOSE=false

while getopts "dv" opt; do
    case $opt in
        d) DETACHED=true ;;
        v) VERBOSE=true ;;
        *) echo "Usage: $0 [-d] [-v]" && exit 1 ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Quartermaster Discord Bot ==="

# Stop any existing bot processes
echo "Stopping existing bot processes..."

# Find bot processes by checking working directory contains discord-bot
BOT_PIDS=""
for pid in $(pgrep -f "bun run" 2>/dev/null || true); do
    # Check if this process's cwd is in the discord-bot directory
    cwd=$(readlink -f /proc/$pid/cwd 2>/dev/null || true)
    if [[ "$cwd" == *"discord-bot"* ]]; then
        BOT_PIDS="$BOT_PIDS $pid"
    fi
done

if [ -n "$BOT_PIDS" ]; then
    echo "Killing bot PIDs:$BOT_PIDS"
    kill $BOT_PIDS 2>/dev/null || true
    sleep 2

    # Force kill if still running
    REMAINING=""
    for pid in $BOT_PIDS; do
        if ps -p $pid > /dev/null 2>&1; then
            REMAINING="$REMAINING $pid"
        fi
    done
    if [ -n "$REMAINING" ]; then
        echo "Force killing:$REMAINING"
        kill -9 $REMAINING 2>/dev/null || true
        sleep 1
    fi
fi

echo "Existing processes stopped"

# Install dependencies if needed
cd bot
if [ ! -d "node_modules" ]; then
    echo "Installing bot dependencies..."
    bun install
fi

cd ../mcp-server
if [ ! -d "node_modules" ]; then
    echo "Installing MCP server dependencies..."
    bun install
    bunx prisma generate
fi

cd ../bot

echo "Starting Discord bot..."

# Set debug environment variables if verbose mode
if [ "$VERBOSE" = true ]; then
    echo "Verbose mode enabled"
    export DEBUG=true
    export LOG_LEVEL=debug
fi

if [ "$DETACHED" = true ]; then
    LOG_FILE="$SCRIPT_DIR/bot.log"
    # Pass DEBUG and LOG_LEVEL via env for nohup
    DEBUG=$DEBUG LOG_LEVEL=$LOG_LEVEL nohup bun run dev > "$LOG_FILE" 2>&1 &
    PID=$!
    echo "$PID" > "$SCRIPT_DIR/.bot.pid"
    sleep 3

    # Check if it started successfully
    if ps -p $PID > /dev/null 2>&1; then
        echo "Bot started in background (PID: $PID)"
        echo "Logs: $LOG_FILE"
        echo ""
        tail -20 "$LOG_FILE"
    else
        echo "ERROR: Bot failed to start. Check logs:"
        tail -50 "$LOG_FILE"
        exit 1
    fi
else
    exec bun run dev
fi
