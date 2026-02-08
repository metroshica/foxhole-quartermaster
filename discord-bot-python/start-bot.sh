#!/bin/bash
# Discord Bot (Python) - Startup Script
# Starts the MCP server and Discord bot using Docker Compose
# Usage: ./start-bot.sh [-d] [-v] [-b]
#   -d  Run in detached/background mode
#   -v  Enable verbose/debug mode
#   -b  Build images before starting

set -e

DETACHED=false
VERBOSE=false
BUILD=false

while getopts "dvb" opt; do
    case $opt in
        d) DETACHED=true ;;
        v) VERBOSE=true ;;
        b) BUILD=true ;;
        *) echo "Usage: $0 [-d] [-v] [-b]" && exit 1 ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Quartermaster Discord Bot (Python) ==="

# Change to repo root for docker compose
cd "$REPO_ROOT"

# Stop existing containers
echo "Stopping existing bot containers..."
docker compose --profile bot stop discord-bot-python mcp-server 2>/dev/null || true

# Set debug environment variables if verbose mode
if [ "$VERBOSE" = true ]; then
    echo "Verbose mode enabled"
    export DEBUG=true
    export LOG_LEVEL=debug
fi

# Build command
BUILD_ARG=""
if [ "$BUILD" = true ]; then
    echo "Building images..."
    BUILD_ARG="--build"
fi

echo "Starting MCP server and Discord bot..."

if [ "$DETACHED" = true ]; then
    docker compose --profile bot up $BUILD_ARG -d mcp-server discord-bot-python

    echo ""
    echo "Bot started in background"
    echo ""
    echo "View logs:     docker compose logs -f discord-bot-python"
    echo "View MCP logs: docker compose logs -f mcp-server"
    echo "Stop:          ./stop-bot.sh"
    echo ""

    # Show recent logs
    sleep 3
    echo "Recent logs:"
    docker compose logs --tail=20 discord-bot-python mcp-server
else
    exec docker compose --profile bot up $BUILD_ARG mcp-server discord-bot-python
fi
