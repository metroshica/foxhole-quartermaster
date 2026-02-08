#!/bin/bash
# Discord Bot - Stop Script
# Stops the Discord bot and MCP server processes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Stopping Quartermaster Discord Bot ==="

# Kill by PID file if it exists
if [ -f "$SCRIPT_DIR/.bot.pid" ]; then
    PID=$(cat "$SCRIPT_DIR/.bot.pid")
    if ps -p $PID > /dev/null 2>&1; then
        echo "Stopping bot (PID: $PID)..."
        kill $PID 2>/dev/null || true
    fi
    rm -f "$SCRIPT_DIR/.bot.pid"
fi

# Find bot processes by checking working directory contains discord-bot
BOT_PIDS=""
for pid in $(pgrep -f "bun run" 2>/dev/null || true); do
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
    fi
fi

echo "Bot stopped"
