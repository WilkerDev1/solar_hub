#!/bin/bash
# run-server.sh - Starts the MCP server on naski with correct env vars

# Locate the .env file (either in bridge or parent directory)
ENV_FILE="/home/naski/solar-hub/mcp/bridge/.env"
if [ -f "$ENV_FILE" ]; then
  # Export variables from .env
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Ensure default database URL if not set
export NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-http://archlinux:54321}

# Execute the compiled server js using Node
exec node /home/naski/solar-hub/dist/core/mcp/server.js "$@"
