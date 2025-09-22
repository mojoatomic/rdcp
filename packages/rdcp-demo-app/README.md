# RDCP Demo App

A comprehensive demonstration application that validates RDCP SDK + OpenTelemetry integration, mirroring the documentation claims.

What this shows:
- RDCP protocol endpoints implemented in Express
- OpenTelemetry integration via @rdcp.dev/otel-plugin
- Visual trace correlation in Jaeger
- Performance characteristics matching the docs
- Framework examples that run as-is

Quick start:
1) Install deps
   npm install

2) Start Jaeger + App via Docker
   docker compose up --build
   # Jaeger UI: http://localhost:16686
   # App:       http://localhost:3000

3) Run locally with OpenTelemetry
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \ 
   OTEL_SERVICE_NAME=rdcp-demo-app \ 
   node --require ./src/opentelemetry.js src/server.js

4) Benchmark
   node scripts/benchmark.js

5) Run framework examples
   node scripts/test-examples.js

Endpoints:
- GET /.well-known/rdcp
- GET /rdcp/v1/discovery
- POST /rdcp/v1/control
- GET /rdcp/v1/status
- GET /rdcp/v1/health
- GET /metrics (Prometheus metrics)
- Business API: /api/users, /api/reports

## Prometheus Metrics Output

The `/metrics` endpoint provides comprehensive Node.js and application metrics in Prometheus format:

```bash
curl http://localhost:3000/metrics
```

**Sample Output** (includes process, Node.js runtime, and custom RDCP metrics):
- Process metrics: CPU usage, memory consumption, start time
- Node.js runtime: Event loop lag, heap statistics, GC duration
- Active resources: TCP connections, handles, requests
- Custom counters: `rdcp_demo_requests_total`, `rdcp_demo_request_duration_seconds`
- Version info: Node.js version details with semantic versioning

This demonstrates production-ready observability integration for RDCP-enabled applications.

## Trace Propagation Mini-Service (Upstream)

Demonstrates W3C trace context propagation across services using OpenTelemetry.

Run services:
```bash
npm run dev --prefix packages/rdcp-demo-app         # main app on :3000
npm run dev:upstream --prefix packages/rdcp-demo-app # upstream on :3001
```

Verify propagation:
```bash
# Unauthenticated path: health/status may be 401 depending on auth config
curl -s http://localhost:3001/api/demo/rdcp-discovery | jq
curl -s http://localhost:3001/api/demo/multi-call | jq

# Authorized path: adds RDCP headers so all calls should be 200
RDCP_API_KEY=${RDCP_API_KEY:-dev-key-change-in-production-min-32-chars} \
  curl -s http://localhost:3001/api/demo/multi-call-auth | jq
```

View traces in Jaeger:
- http://localhost:16686
- Filter by Services: upstream-service and rdcp-demo-app
- Expectation: upstream-service spans are parents; rdcp-demo-app spans are children

Note: Requires an OTLP collector at http://localhost:4318 (Jaeger all-in-one via docker compose covers this).

## Quick Local (In-Memory) Demo

When you want the Jaeger Dependencies graph to work without any extra infra and reset on each run, use the in-memory setup:

```bash
# Start Jaeger (in-memory), run both services locally with correct OTEL settings,
# seed cross-service traces, and print Jaeger service list.
./scripts/run-inmemory-demo.sh
```

Jaeger UI: http://localhost:16686
Dependencies graph: http://localhost:16686/dependencies (refresh after a few seconds)

## Docker Distribution (Recommended)

For the complete distributable experience with Jaeger included:

### One-Command Setup
```bash
# Start everything with Docker Compose
./scripts/start-demo.sh
```

### Manual Docker Setup
```bash
# Build and start all services
docker compose up --build

# Run automated tests
./scripts/test-traces.sh
```

**Services:**
- **Jaeger UI**: http://localhost:16686 (pulls `jaegertracing/all-in-one:latest`)
- **RDCP Demo App**: http://localhost:3000
- **Upstream Service**: http://localhost:3001

**Features:**
- ✅ **Latest Jaeger** pulled from Docker Hub (no bundled code)
- ✅ **Health checks** and proper startup ordering
- ✅ **Automated testing** with status validation
- ✅ **Production-ready** configuration

See [DOCKER-SETUP.md](./DOCKER-SETUP.md) for complete Docker distribution guide.
