#!/bin/bash
# run-inmemory-demo.sh - Start Jaeger (in-memory) + local services, seed traces, and verify
# Usage:
#   ./scripts/run-inmemory-demo.sh
#
# Requirements: Docker Desktop, Node.js, curl, jq

set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

OTLP_PORT_HOST=${OTLP_PORT_HOST:-14318}
OTLP_ENDPOINT=${OTLP_ENDPOINT:-http://localhost:$OTLP_PORT_HOST}
JAEGER_CONTAINER=${JAEGER_CONTAINER:-rdcp-jaeger}
JAEGER_IMAGE=${JAEGER_IMAGE:-jaegertracing/all-in-one:1.57}

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root_dir"

log() { echo -e "${BLUE}$*${NC}"; }
ok()  { echo -e "${GREEN}$*${NC}"; }
warn(){ echo -e "${YELLOW}$*${NC}"; }
err() { echo -e "${RED}$*${NC}"; }

ensure_jaeger() {
  if ! command -v docker >/dev/null 2>&1; then
    err "Docker is required. Please install Docker Desktop."
    exit 1
  fi
  if docker ps -a --format '{{.Names}}' | grep -q "^${JAEGER_CONTAINER}$"; then
    if ! docker ps --format '{{.Names}}' | grep -q "^${JAEGER_CONTAINER}$"; then
      log "Starting existing Jaeger container '${JAEGER_CONTAINER}'..."
      docker start "$JAEGER_CONTAINER" >/dev/null
    else
      log "Jaeger container '${JAEGER_CONTAINER}' already running."
    fi
  else
    log "Launching Jaeger in-memory container '${JAEGER_CONTAINER}' on ports 16686 (UI) and ${OTLP_PORT_HOST} (OTLP)..."
    docker run -d --name "$JAEGER_CONTAINER" \
      -p 16686:16686 \
      -p ${OTLP_PORT_HOST}:4318 \
      -e COLLECTOR_OTLP_ENABLED=true \
      -e SPAN_STORAGE_TYPE=memory \
      "$JAEGER_IMAGE" >/dev/null
  fi
  ok "Jaeger ready at http://localhost:16686 (OTLP: ${OTLP_ENDPOINT})"
}

start_services() {
  log "Stopping any existing local Node services..."
  pkill -f 'src/server.js' 2>/dev/null || true
  pkill -f 'upstream-service.js' 2>/dev/null || true
  sleep 1

  log "Starting rdcp-demo-app (OTLP=${OTLP_ENDPOINT})..."
  OTEL_EXPORTER_OTLP_ENDPOINT="${OTLP_ENDPOINT}" \
  OTEL_SERVICE_NAME=rdcp-demo-app \
  nohup node --require ./src/opentelemetry.js src/server.js > rdcp-demo-app-server.log 2>&1 &
  APP_PID=$!

  log "Starting upstream-service (OTLP=${OTLP_ENDPOINT})..."
  OTEL_EXPORTER_OTLP_ENDPOINT="${OTLP_ENDPOINT}" \
  OTEL_SERVICE_NAME=upstream-service \
  DOWNSTREAM_URL=http://localhost:3000 \
  nohup node --require ./src/opentelemetry.js ./src/upstream-service.js > rdcp-demo-upstream.log 2>&1 &
  UP_PID=$!

  ok "Started rdcp-demo-app (PID=${APP_PID}), upstream-service (PID=${UP_PID})"
}

wait_ready() {
  log "Waiting for services to be ready..."
  local timeout=60 counter=0
  until curl -sf http://localhost:3000/.well-known/rdcp >/dev/null 2>&1; do
    [ $counter -ge $timeout ] && { err "Timeout waiting for rdcp-demo-app"; exit 1; }
    sleep 1; counter=$((counter+1))
  done
  counter=0
  until curl -sf http://localhost:3001/health >/dev/null 2>&1; do
    [ $counter -ge $timeout ] && { err "Timeout waiting for upstream-service"; exit 1; }
    sleep 1; counter=$((counter+1))
  done
  ok "Services are up"
}

seed_traces() {
  log "Seeding cross-service traces (20 requests)..."
  for i in $(seq 1 20); do curl -s http://localhost:3001/api/demo/multi-call-auth >/dev/null; done
  sleep 2
  ok "Seed complete"
}

verify_jaeger() {
  log "Services registered in Jaeger:"
  curl -sSf http://localhost:16686/api/services | jq -r '.data[]' || true
  echo ""
  ok "Open Jaeger UI: http://localhost:16686"
  ok "Dependencies graph: http://localhost:16686/dependencies (refresh after a few seconds)"
}

ensure_jaeger
start_services
wait_ready
seed_traces
verify_jaeger
