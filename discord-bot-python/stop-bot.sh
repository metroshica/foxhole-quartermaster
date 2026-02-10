#!/bin/bash
# Discord Bot (Python) - Stop Script
# Stops the Discord bot and MCP server containers

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Stopping Quartermaster Discord Bot (Python) ==="

cd "$REPO_ROOT"

# Stop the bot containers
docker compose --profile bot stop discord-bot-python mcp-server

echo "Bot stopped"
echo ""
echo "To remove containers: docker compose --profile bot down"
