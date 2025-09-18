#!/bin/bash
# stop-inmemory-demo.sh - Stop local Node services and remove the in-memory Jaeger container
# Usage:
#   ./scripts/stop-inmemory-demo.sh

set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}$*${NC}"; }
ok()  { echo -e "${GREEN}$*${NC}"; }
warn(){ echo -e "${YELLOW}$*${NC}"; }
err() { echo -e "${RED}$*${NC}"; }

JAEGER_CONTAINER=${JAEGER_CONTAINER:-rdcp-jaeger}

log "Stopping local Node services (if running)..."
pkill -f 'src/server.js' 2>/dev/null || true
pkill -f 'upstream-service.js' 2>/dev/null || true

log "Removing Jaeger container '${JAEGER_CONTAINER}' (if exists)..."
if docker ps -a --format '{{.Names}}' | grep -q "^${JAEGER_CONTAINER}$"; then
  docker rm -f "$JAEGER_CONTAINER" >/dev/null || true
  ok "Removed ${JAEGER_CONTAINER}"
else
  warn "Container ${JAEGER_CONTAINER} not found"
fi

log "Clearing local logs..."
rm -f rdcp-demo-app-server.log rdcp-demo-upstream.log || true
ok "Cleanup complete"
