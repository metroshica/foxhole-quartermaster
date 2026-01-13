#!/bin/bash
# Foxhole Quartermaster - Stop Script

echo "Stopping Foxhole Quartermaster..."

# Kill Next.js
pkill -f "next dev -p 3001" 2>/dev/null && echo "Stopped Next.js" || echo "Next.js not running"

# Optionally stop Docker containers (uncomment if desired)
# docker stop foxhole-stockpiles-scanner 2>/dev/null && echo "Stopped Scanner"
# docker stop foxhole-quartermaster-db 2>/dev/null && echo "Stopped PostgreSQL"

echo "Done"
